import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminConfigured, adminGraphQL } from "@/lib/shopify-admin";
import { AdminHead } from "@/components/AdminHead";
import { getProducts } from "@/lib/shopify";
import { Donut, Heat, Histo, Meter, Spark } from "./charts";
import { RevenueChart, type Point } from "./RevenueChart";
import { Globe } from "./Globe";
import { getGlobeData } from "@/lib/globe-data";
import "./analytics.css";

export const metadata: Metadata = { title: "Analytics — ESSNC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const PERIODS = { "7j": 7, "30j": 30 } as const;
type Period = keyof typeof PERIODS;
const FETCH_DAYS = 60; // deux périodes de 30 j : la période courante et la précédente

type Order = { at: number; status: string; fulfil: string; paid: boolean; cancelled: boolean; refunded: number; discount: number; amount: number; lines: { title: string; vendor: string; quantity: number; unit: number; vid: string }[] };
type Raw = {
  orders: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: {
    processedAt: string; displayFinancialStatus: string | null; displayFulfillmentStatus: string | null; cancelledAt: string | null;
    currentTotalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
    totalDiscountsSet: { shopMoney: { amount: string } } | null; totalRefundedSet: { shopMoney: { amount: string } } | null;
    lineItems: { nodes: { title: string; vendor: string | null; quantity: number; variant: { id: string } | null; discountedUnitPriceSet: { shopMoney: { amount: string } } | null }[] };
  }[] };
};

const PAGES = 4; // 4 × 50 = 200 commandes au plus
const COST_QUERY = `query($after:String){ productVariants(first:100, after:$after){ pageInfo{hasNextPage endCursor} nodes{ id inventoryItem{ unitCost{ amount } } } } }`;
type CostRaw = { productVariants: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: { id: string; inventoryItem: { unitCost: { amount: string } | null } | null }[] } };
const QUERY = `query($q:String!,$after:String){ orders(first:50, after:$after, query:$q, sortKey:PROCESSED_AT, reverse:true){ pageInfo{hasNextPage endCursor} nodes{
  processedAt displayFinancialStatus displayFulfillmentStatus cancelledAt
  currentTotalPriceSet{shopMoney{amount currencyCode}} totalDiscountsSet{shopMoney{amount}} totalRefundedSet{shopMoney{amount}}
  lineItems(first:5){nodes{title vendor quantity variant{id} discountedUnitPriceSet{shopMoney{amount}}}} } } }`;

const DAY = 86_400_000;
const dayKey = (t: number) => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date(t));
const WEEKDAYS = ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"];
const weekday = (t: number) => (new Date(new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Paris" }).format(new Date(t)) + "T12:00:00Z").getUTCDay() + 6) % 7;
const pct = (now: number, before: number) => (before > 0 ? Math.round(((now - before) / before) * 100) : null);

function summarize(list: Order[]) {
  const paid = list.filter((o) => o.paid && !o.cancelled);
  const revenue = paid.reduce((n, o) => n + o.amount, 0);
  return { all: list.length, paid: paid.length, revenue, basket: paid.length ? revenue / paid.length : null, refunded: list.reduce((n, o) => n + o.refunded, 0), discount: paid.reduce((n, o) => n + o.discount, 0), cancelled: list.filter((o) => o.cancelled).length, paidList: paid };
}

export default async function AnalyticsPage({ searchParams }: { searchParams: Promise<{ periode?: string; tva?: string }> }) {
  const sp = await searchParams;
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  if (!u.user) redirect("/admin/login?next=/admin/analytics");
  const { data: isAdmin } = await db.rpc("is_agent_admin");
  if (isAdmin !== true) {
    return (
      <div className="adm"><h1 className="acct__title">Analytics</h1>
        <div className="acct__empty"><h2>Accès réservé</h2><p>Ce compte n'est pas administrateur.</p></div></div>
    );
  }

  const periode: Period = sp.periode === "7j" ? "7j" : "30j";
  const days = PERIODS[periode];
  const now = Date.now();
  const since7 = new Date(now - 7 * DAY).toISOString();
  const since30 = new Date(now - 30 * DAY).toISOString();

  // --- Shopify (commandes agrégées : aucune donnée personnelle demandée) ---
  let orders: Order[] = [];
  let currency = "EUR";
  let shopState: "ok" | "not_configured" | "denied" | "error" = "ok";
  let truncated = false;
  if (!adminConfigured) shopState = "not_configured";
  else {
    try {
      const from = new Date(now - FETCH_DAYS * DAY).toISOString().slice(0, 10);
      let after: string | null = null;
      for (let page = 0; page < PAGES && shopState === "ok"; page++) {
        const r: Awaited<ReturnType<typeof adminGraphQL<Raw>>> = await adminGraphQL<Raw>(QUERY, { q: `processed_at:>=${from}`, after });
        if ((r.errors ?? []).some((e) => e.extensions?.code === "ACCESS_DENIED")) { shopState = "denied"; break; }
        if (!r.data) { shopState = "error"; break; }
        for (const n of r.data.orders.nodes) {
          currency = n.currentTotalPriceSet.shopMoney.currencyCode || currency;
          orders.push({
            at: Date.parse(n.processedAt), cancelled: !!n.cancelledAt, status: n.displayFinancialStatus ?? "", fulfil: n.displayFulfillmentStatus ?? "",
            paid: n.displayFinancialStatus === "PAID" || n.displayFinancialStatus === "PARTIALLY_REFUNDED",
            amount: Number(n.currentTotalPriceSet.shopMoney.amount) || 0,
            discount: Number(n.totalDiscountsSet?.shopMoney.amount) || 0,
            refunded: Number(n.totalRefundedSet?.shopMoney.amount) || 0,
            lines: n.lineItems.nodes.map((l) => ({ title: l.title, vendor: l.vendor || "Sans marque", quantity: l.quantity, unit: Number(l.discountedUnitPriceSet?.shopMoney.amount) || 0, vid: l.variant?.id ?? "" })),
          });
        }
        truncated = r.data.orders.pageInfo.hasNextPage;
        if (!truncated) break;
        after = r.data.orders.pageInfo.endCursor;
      }
      if (shopState !== "ok") orders = [];
    } catch { shopState = "error"; }
  }
  const eur = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: n >= 100 ? 0 : 2 }).format(n);

  // Coûts d'achat (champ « Coût par article » de Shopify) : lus tels quels, jamais estimés
  const costs = new Map<string, number>();
  let costState: "ok" | "denied" | "error" | "off" = shopState === "ok" ? "ok" : "off";
  if (shopState === "ok") {
    try {
      let after: string | null = null;
      for (let i = 0; i < 5; i++) {
        const c: Awaited<ReturnType<typeof adminGraphQL<CostRaw>>> = await adminGraphQL<CostRaw>(COST_QUERY, { after });
        if ((c.errors ?? []).some((e) => e.extensions?.code === "ACCESS_DENIED")) { costState = "denied"; break; }
        if (!c.data) { costState = "error"; break; }
        for (const v of c.data.productVariants.nodes) { const a = v.inventoryItem?.unitCost?.amount; if (a !== undefined && a !== null && Number(a) > 0) costs.set(v.id, Number(a)); }
        if (!c.data.productVariants.pageInfo.hasNextPage) break;
        after = c.data.productVariants.pageInfo.endCursor;
      }
    } catch { costState = "error"; }
  }
  const tvaRate = sp.tva === "20" ? 0.2 : 0;

  const cur = orders.filter((o) => o.at >= now - days * DAY);
  const prev = orders.filter((o) => o.at < now - days * DAY && o.at >= now - 2 * days * DAY);
  const S = summarize(cur), P = summarize(prev);
  // la période précédente n'est complète que si les commandes lues la couvrent entièrement
  const prevComplete = !truncated || orders.length === 0 ? true : Math.min(...orders.map((o) => o.at)) <= now - 2 * days * DAY;

  // --- Séries journalières (période courante et précédente alignées jour par jour) ---
  const labelOf = (k: string) => `${k.slice(8)}/${k.slice(5, 7)}`;
  const curDays = new Map<string, { rev: number; n: number }>(), prevDays: number[] = Array(days).fill(0);
  for (let i = days - 1; i >= 0; i--) curDays.set(dayKey(now - i * DAY), { rev: 0, n: 0 });
  for (const o of S.paidList) { const d = curDays.get(dayKey(o.at)); if (d) { d.rev += o.amount; d.n += 1; } }
  for (const o of P.paidList) { const j = Math.min(days - 1, Math.max(0, Math.floor((o.at - (now - 2 * days * DAY)) / DAY))); prevDays[j] += o.amount; }
  const points: Point[] = [...curDays.entries()].map(([k, v], i) => ({ label: labelOf(k), value: Math.round(v.rev * 100) / 100, orders: v.n, prev: Math.round(prevDays[i] * 100) / 100 }));
  const revSeries = points.map((p) => p.value), ordSeries = points.map((p) => p.orders);
  const basketSeries = points.map((p) => (p.orders ? p.value / p.orders : 0));

  // --- Classements ---
  const byTitle = new Map<string, number>(), byVendor = new Map<string, number>();
  for (const o of S.paidList) for (const l of o.lines) { byTitle.set(l.title, (byTitle.get(l.title) ?? 0) + l.quantity); byVendor.set(l.vendor, (byVendor.get(l.vendor) ?? 0) + l.quantity); }
  const top = [...byTitle.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6);
  const units = [...byTitle.values()].reduce((a, b) => a + b, 0);
  const brandsAll = [...byVendor.entries()].sort((a, b) => b[1] - a[1]);
  const brandParts = brandsAll.length > 4 ? [...brandsAll.slice(0, 4), ["Autres", brandsAll.slice(4).reduce((n, [, q]) => n + q, 0)] as [string, number]] : brandsAll;
  const top3Share = units ? Math.round((top.slice(0, 3).reduce((n, [, q]) => n + q, 0) / units) * 100) : 0;

  // --- Rythme : jour de semaine × tranche de 3 h ---
  const hourFmt = new Intl.DateTimeFormat("fr-FR", { timeZone: "Europe/Paris", hour: "numeric", hourCycle: "h23" });
  const grid = WEEKDAYS.map(() => Array(8).fill(0) as number[]);
  const wd = WEEKDAYS.map(() => 0);
  for (const o of S.paidList) { const h = Number.parseInt(hourFmt.format(new Date(o.at)), 10) || 0; grid[weekday(o.at)][Math.floor(h / 3)] += 1; wd[weekday(o.at)] += 1; }
  const bestWd = S.paid >= 5 ? wd.indexOf(Math.max(...wd)) : -1;
  const slotTotals = Array.from({ length: 8 }, (_, i) => grid.reduce((n, r) => n + r[i], 0));
  const bestSlot = S.paid >= 5 ? slotTotals.indexOf(Math.max(...slotTotals)) : -1;
  const SLOT = ["0–3 h", "3–6 h", "6–9 h", "9–12 h", "12–15 h", "15–18 h", "18–21 h", "21–24 h"];

  // --- Répartition des montants de commande ---
  const amounts = S.paidList.map((o) => o.amount);
  const maxAmt = Math.max(0, ...amounts);
  const step = maxAmt > 0 ? Math.max(10, Math.ceil(maxAmt / 5 / 10) * 10) : 10;
  const bins = Array.from({ length: 5 }, (_, i) => ({ label: `${i * step}–${(i + 1) * step}`, value: amounts.filter((a) => a >= i * step && (i === 4 ? true : a < (i + 1) * step)).length }));

  // --- Paiement et expédition (toutes commandes de la période) ---
  const PAY: Record<string, string> = { PAID: "Payées", PENDING: "En attente", AUTHORIZED: "Autorisées", PARTIALLY_REFUNDED: "Remb. partiel", REFUNDED: "Remboursées", VOIDED: "Annulées", PARTIALLY_PAID: "Part. payées" };
  const FUL: Record<string, string> = { FULFILLED: "Expédiées", UNFULFILLED: "À expédier", PARTIALLY_FULFILLED: "Part. expédiées", IN_PROGRESS: "En cours", ON_HOLD: "En attente", SCHEDULED: "Planifiées" };
  const count = (list: string[], dict: Record<string, string>) => { const m = new Map<string, number>(); for (const k of list) m.set(dict[k] ?? (k || "Autre"), (m.get(dict[k] ?? (k || "Autre")) ?? 0) + 1); return [...m.entries()].map(([label, value]) => ({ label, value })).sort((a, b) => b.value - a.value); };
  const payParts = count(cur.map((o) => (o.cancelled ? "VOIDED" : o.status)), PAY);
  const fulParts = count(cur.filter((o) => !o.cancelled).map((o) => o.fulfil), FUL);
  const shipped = cur.filter((o) => o.fulfil === "FULFILLED").length;

  // --- Supabase : newsletter, avis, agents ---
  const [subs, reviews, runs, products] = await Promise.all([
    db.from("newsletter_subscribers").select("created_at,status").gte("created_at", since30).limit(2000),
    db.from("reviews").select("rating,status").limit(2000),
    db.from("agent_runs").select("agent_id,status,started_at").gte("started_at", since7).limit(3000),
    getProducts(100).catch(() => []),
  ]);
  const subList = subs.data ?? [];
  const subDays = new Map<string, number>();
  for (let i = 29; i >= 0; i--) subDays.set(dayKey(now - i * DAY), 0);
  for (const x of subList) { const k = dayKey(Date.parse(x.created_at)); if (subDays.has(k)) subDays.set(k, (subDays.get(k) ?? 0) + 1); }
  const subSeries = [...subDays.values()];
  let run = 0; const subCum = subSeries.map((v) => (run += v));
  const last7 = subList.filter((x) => x.created_at >= since7).length;
  const subActive = subList.filter((x) => x.status === "subscribed").length;
  const rv = (reviews.data ?? []).filter((r) => r.status === "approved");
  const avg = rv.length ? rv.reduce((n, r) => n + r.rating, 0) / rv.length : null;
  const dist = [5, 4, 3, 2, 1].map((st) => [st, rv.filter((r) => r.rating === st).length] as const);
  const maxDist = Math.max(1, ...dist.map(([, n]) => n));
  const positive = rv.filter((r) => r.rating >= 4).length;
  const perAgent = new Map<string, { ok: number; bad: number }>();
  const perRunDay = new Map<string, number>();
  for (let i = 6; i >= 0; i--) perRunDay.set(dayKey(now - i * DAY), 0);
  for (const r of runs.data ?? []) {
    const a = perAgent.get(r.agent_id) ?? { ok: 0, bad: 0 };
    if (r.status === "ok" || r.status === "success") a.ok++; else if (r.status !== "running") a.bad++;
    perAgent.set(r.agent_id, a);
    const k = dayKey(Date.parse(r.started_at)); if (perRunDay.has(k)) perRunDay.set(k, (perRunDay.get(k) ?? 0) + 1);
  }
  const agentRows = [...perAgent.entries()].map(([id, v]) => ({ id, ...v, rate: v.ok + v.bad ? Math.round((v.ok / (v.ok + v.bad)) * 100) : 0 })).sort((a, b) => a.rate - b.rate);
  const totalOk = agentRows.reduce((n, a) => n + a.ok, 0), totalRuns = agentRows.reduce((n, a) => n + a.ok + a.bad, 0);
  const catMap = new Map<string, number>();
  for (const p of products) catMap.set(p.category || "Sans catégorie", (catMap.get(p.category || "Sans catégorie") ?? 0) + 1);
  const catAll = [...catMap.entries()].sort((a, b) => b[1] - a[1]);
  const catParts = (catAll.length > 4 ? [...catAll.slice(0, 4), ["Autres", catAll.slice(4).reduce((n, [, q]) => n + q, 0)] as [string, number]] : catAll).map(([label, value]) => ({ label, value }));
  const sold = new Set(S.paidList.flatMap((o) => o.lines.map((l) => l.title.toLowerCase())));
  const unsold = shopState === "ok" && products.length ? products.filter((p) => !sold.has(p.title.toLowerCase())) : [];

  // --- Audience mesurée (table analytics_events) ---
  const aRes = await db.rpc("analytics_summary", { p_days: days });
  type Agg = { first: string | null; sessions: number; pageviews: number; viewed: number; carted: number; checkout: number; abandoned: number; abandoned_value: number; daily: { d: string; s: number; p: number }[]; pages: { k: string; n: number }[]; sources: { k: string; n: number }[] };
  const A = (aRes.data ?? null) as Agg | null;
  type Mem = { members: number; new: number; active: number; confirmed: number; daily: { d: string; n: number }[]; logins: number; signups: number; login_sessions: number; sessions: number };
  const mRes = await db.rpc("analytics_members", { p_days: days });
  const M = (mRes.data ?? null) as Mem | null;
  const mDaily = new Map((M?.daily ?? []).map((x) => [x.d, x.n]));
  const memberPoints: Point[] = [...curDays.keys()].map((k) => ({ label: labelOf(k), value: mDaily.get(k) ?? 0, orders: 0 }));
  type Geo = { known: number; total: number; list: { c: string; s: number; l: number }[] };
  const gRes = await db.rpc("analytics_countries", { p_days: days });
  const G = (gRes.data ?? null) as Geo | null;
  let globe: ReturnType<typeof getGlobeData> | null = null;
  try { globe = getGlobeData(); } catch { globe = null; }
  const trackStart = A?.first ? Date.parse(A.first) : null;
  const windowStart = Math.max(now - days * DAY, trackStart ?? now);
  const covered = trackStart !== null && trackStart <= now - days * DAY + DAY; // mesure active sur (presque) toute la période
  const ordersInWindow = S.paidList.filter((o) => o.at >= windowStart).length;
  const sessions = A?.sessions ?? 0;
  const aDaily = new Map((A?.daily ?? []).map((x) => [x.d, x]));
  const trafficPoints: Point[] = [...curDays.keys()].map((k) => ({ label: labelOf(k), value: aDaily.get(k)?.s ?? 0, orders: aDaily.get(k)?.p ?? 0 }));
  const conv = sessions > 0 ? (ordersInWindow / sessions) * 100 : null;
  const steps = [
    { label: "Sessions", n: sessions },
    { label: "Fiche produit vue", n: A?.viewed ?? 0 },
    { label: "Ajout au panier", n: A?.carted ?? 0 },
    { label: "Paiement démarré", n: A?.checkout ?? 0 },
    { label: "Commande payée", n: ordersInWindow },
  ];
  const checkoutLost = Math.max(0, (A?.checkout ?? 0) - ordersInWindow);
  const pageLabel = (p: string) => (p === "/" ? "Accueil" : p);

  // --- Marges : (prix de vente net − coût par article) × quantité, uniquement là où le coût est renseigné ---
  let revKnown = 0, costKnown = 0, revAll = 0, linesAll = 0, linesKnown = 0;
  const marginBy = new Map<string, { m: number; r: number }>();
  for (const o of S.paidList) for (const l of o.lines) {
    const net = (l.unit / (1 + tvaRate)) * l.quantity;
    revAll += net; linesAll++;
    const c = costs.get(l.vid);
    if (c !== undefined) {
      linesKnown++; revKnown += net; costKnown += c * l.quantity;
      const e = marginBy.get(l.title) ?? { m: 0, r: 0 }; e.m += net - c * l.quantity; e.r += net; marginBy.set(l.title, e);
    }
  }
  const marginAbs = revKnown - costKnown;
  const marginPct = revKnown > 0 ? (marginAbs / revKnown) * 100 : null;
  const coverage = revAll > 0 ? Math.round((revKnown / revAll) * 100) : 0;
  const marginTop = [...marginBy.entries()].sort((a, b) => b[1].m - a[1].m).slice(0, 6);
  const noCost = new Set(S.paidList.flatMap((o) => o.lines.filter((l) => !costs.has(l.vid)).map((l) => l.title)));

  // --- Lecture automatique ---
  const insights: string[] = [];
  const g = pct(S.revenue, P.revenue);
  if (shopState === "ok" && S.paid > 0) {
    if (g !== null && prevComplete) insights.push(`Chiffre d'affaires ${g >= 0 ? "en hausse" : "en baisse"} de ${Math.abs(g)} % par rapport aux ${days} jours précédents.`);
    if (top[0]) insights.push(`Produit le plus vendu : ${top[0][0]} (${top[0][1]} unité${top[0][1] > 1 ? "s" : ""}). Les 3 premiers font ${top3Share} % des unités.`);
    if (brandsAll[0] && brandsAll.length > 1) insights.push(`Marque en tête : ${brandsAll[0][0]}, ${Math.round((brandsAll[0][1] / Math.max(1, units)) * 100)} % des unités vendues.`);
    if (bestWd >= 0 && bestSlot >= 0) insights.push(`Les commandes se concentrent le ${WEEKDAYS[bestWd].toLowerCase()} et entre ${SLOT[bestSlot].replace("–", " et ")}.`);
    if (S.refunded > 0) insights.push(`${eur(S.refunded)} remboursés sur la période.`);
    if (S.discount > 0) insights.push(`Les remises représentent ${Math.round((S.discount / (S.revenue + S.discount)) * 100)} % du montant avant remise.`);
    if (unsold.length) insights.push(`${unsold.length} produit${unsold.length > 1 ? "s" : ""} du catalogue sans vente sur la période.`);
  } else if (shopState === "ok") insights.push("Aucune commande payée sur cette période : rien à comparer pour l'instant.");
  if (sessions > 0) insights.push(`${sessions} session${sessions > 1 ? "s" : ""} et ${A?.pageviews ?? 0} pages vues sur ${days} jours${A?.sources?.[0] ? `, source principale : ${A.sources[0].k}` : ""}.`);
  if (conv !== null && covered) insights.push(`Taux de conversion ${conv.toFixed(1).replace(".", ",")} % (${ordersInWindow} commande${ordersInWindow > 1 ? "s" : ""} pour ${sessions} sessions).`);
  if ((A?.abandoned ?? 0) > 0) insights.push(`${A?.abandoned} panier${(A?.abandoned ?? 0) > 1 ? "s" : ""} abandonné${(A?.abandoned ?? 0) > 1 ? "s" : ""} avant le paiement, soit environ ${eur(A?.abandoned_value ?? 0)} de ventes non conclues.`);
  if (marginPct !== null) insights.push(`Marge brute ${marginPct.toFixed(0)} % sur les ventes dont le coût est renseigné (${coverage} % du chiffre d'affaires).`);
  if (subList.length) insights.push(`${last7} inscription${last7 > 1 ? "s" : ""} à la newsletter sur 7 jours, ${subList.length} sur 30 jours.`);
  const bad = agentRows.filter((a) => a.rate < 100);
  if (bad.length) insights.push(`${bad.length} agent${bad.length > 1 ? "s ont" : " a"} des exécutions en erreur sur 7 jours : ${bad.map((a) => a.id).join(", ")}.`);

  const shopMsg: Record<string, string> = {
    not_configured: "L'API Admin Shopify n'est pas configurée (variables SHOPIFY_ADMIN_CLIENT_ID et SHOPIFY_ADMIN_CLIENT_SECRET, ou SHOPIFY_ADMIN_TOKEN, dans Vercel).",
    denied: "Shopify refuse la lecture des commandes : ajoutez le droit read_orders à l'application, puis réinstallez-la.",
    error: "Les commandes n'ont pas pu être lues (erreur Shopify). Réessayez ; l'agent « technical-quality » contrôle aussi cette API.",
  };
  const chip = (p: number | null, invert = false) => (p === null || !prevComplete ? null : <span className="an-kpi__chip" data-dir={p === 0 ? "flat" : (p > 0) !== invert ? "good" : "bad"}>{p > 0 ? "▲" : p < 0 ? "▼" : "•"} {Math.abs(p)} %</span>);
  const kpis = [
    { label: "Chiffre d'affaires", value: eur(S.revenue), chip: chip(g), series: revSeries, note: `${eur(P.revenue)} avant` },
    { label: "Commandes payées", value: String(S.paid), chip: chip(pct(S.paid, P.paid)), series: ordSeries, note: `${S.all} au total` },
    { label: "Panier moyen", value: S.basket === null ? "—" : eur(S.basket), chip: chip(S.basket && P.basket ? pct(S.basket, P.basket) : null), series: basketSeries, note: P.basket ? `${eur(P.basket)} avant` : "sur commandes payées" },
    { label: "Remboursé", value: eur(S.refunded), chip: chip(pct(S.refunded, P.refunded), true), series: [] as number[], note: `${S.cancelled} annulée${S.cancelled > 1 ? "s" : ""}` },
  ];

  return (
    <div className="admh an">
      <AdminHead eyebrow="Pilotage" title="Analytics" lead="Ventes, audience et fiabilité, calculées uniquement à partir des données réelles de la boutique." />

      <nav className="an__tabs" aria-label="Période">
        {(Object.keys(PERIODS) as Period[]).map((p) => (
          <Link key={p} href={`/admin/analytics?periode=${p}`} data-active={p === periode} aria-current={p === periode ? "true" : undefined}>{p === "7j" ? "7 jours" : "30 jours"}</Link>
        ))}
      </nav>

      {shopState !== "ok" && <div className="an__notice" role="status"><b>Ventes indisponibles.</b> {shopMsg[shopState]}</div>}
      {shopState === "ok" && truncated && <div className="an__notice" role="status">Seules les 200 commandes les plus récentes sont lues : les totaux et la comparaison sont partiels.</div>}

      {shopState === "ok" && (
        <section className="an-kpis" aria-label="Chiffres clés">
          {kpis.map((k) => (
            <div key={k.label} className="an-kpi">
              <span className="an-kpi__label">{k.label}</span>
              <strong>{k.value}</strong>
              <div className="an-kpi__row">{k.chip}<em>{k.note}</em></div>
              {k.series.length > 0 && <Spark values={k.series} />}
            </div>
          ))}
        </section>
      )}

      {insights.length > 0 && (
        <section className="admh__panel an__panel">
          <div className="admh__panel-head"><h2>À retenir</h2></div>
          <ul className="an__insights">{insights.map((t) => <li key={t}>{t}</li>)}</ul>
        </section>
      )}

      {shopState === "ok" && (
        <section className="admh__panel an__panel">
          <div className="admh__panel-head admh__panel-head--row"><h2>Chiffre d'affaires par jour</h2><span className="an__hint">Survolez la courbe</span></div>
          <RevenueChart points={points} currency={currency} showPrev={prevComplete && P.paid > 0} />
        </section>
      )}

      {shopState === "ok" && (
        <div className="admh__cols admh__cols--even">
          <section className="admh__panel">
            <div className="admh__panel-head"><h2>Meilleures ventes · unités</h2></div>
            {top.length === 0 && <p className="admh__empty">Aucune vente sur la période.</p>}
            <ul className="admh__bars an__bars">{top.map(([n, q]) => (<li key={n}><span title={n}>{n}</span><i style={{ "--w": `${(q / top[0][1]) * 100}%` } as React.CSSProperties} aria-hidden="true" /><b>{q}</b></li>))}</ul>
          </section>
          <section className="admh__panel">
            <div className="admh__panel-head"><h2>Part des marques</h2></div>
            {brandParts.length === 0 ? <p className="admh__empty">Aucune vente sur la période.</p> : <Donut parts={brandParts.map(([label, value]) => ({ label, value }))} center={String(units)} caption="unités" />}
          </section>
        </div>
      )}

      {shopState === "ok" && (
        <section className="admh__panel an__panel">
          <div className="admh__panel-head"><h2>Quand les clients commandent</h2></div>
          <Heat grid={grid} rows={WEEKDAYS} cols={SLOT.map((s) => s.split("–")[0].trim())} />
          <p className="an__sub">Heure de Paris · tranches de 3 h, de {SLOT[0].split("–")[0]} à minuit. Plus c'est foncé, plus il y a de commandes.</p>
        </section>
      )}

      {shopState === "ok" && (
        <div className="admh__cols admh__cols--even">
          <section className="admh__panel">
            <div className="admh__panel-head"><h2>Montant des commandes</h2></div>
            {S.paid === 0 ? <p className="admh__empty">Aucune commande payée.</p> : <Histo bins={bins} />}
            <p className="an__sub">Nombre de commandes par tranche de montant ({currency}).</p>
          </section>
          <section className="admh__panel">
            <div className="admh__panel-head"><h2>Paiement</h2></div>
            {payParts.length === 0 ? <p className="admh__empty">Aucune commande.</p> : <Donut parts={payParts} center={String(S.all)} caption="commandes" />}
          </section>
        </div>
      )}

      {shopState === "ok" && (
        <div className="admh__cols admh__cols--even">
          <section className="admh__panel">
            <div className="admh__panel-head"><h2>Expédition</h2></div>
            {fulParts.length === 0 ? <p className="admh__empty">Aucune commande.</p> : <Donut parts={fulParts} center={`${S.all - S.cancelled ? Math.round((shipped / (S.all - S.cancelled)) * 100) : 0} %`} caption="expédiées" />}
          </section>
          <section className="admh__panel">
            <div className="admh__panel-head"><h2>Détail de la période</h2></div>
            <dl className="an__dl">
              <div><dt>Commandes (toutes)</dt><dd>{S.all}</dd></div>
              <div><dt>Payées</dt><dd>{S.paid}</dd></div>
              <div><dt>Annulées</dt><dd>{S.cancelled}</dd></div>
              <div><dt>Unités vendues</dt><dd>{units}</dd></div>
              <div><dt>Remises accordées</dt><dd>{eur(S.discount)}</dd></div>
              <div><dt>Remboursements</dt><dd>{eur(S.refunded)}</dd></div>
            </dl>
          </section>
        </div>
      )}

      {shopState === "ok" && unsold.length > 0 && (
        <section className="admh__panel an__panel">
          <div className="admh__panel-head"><h2>Sans vente sur la période</h2></div>
          <ul className="an__chips">{unsold.slice(0, 16).map((p) => <li key={p.id}><Link href={`/produits/${p.handle}`}>{p.title}</Link></li>)}{unsold.length > 16 && <li className="an__more">+ {unsold.length - 16}</li>}</ul>
          <p className="an__sub">Comparaison par titre de produit avec les commandes lues : un titre modifié peut apparaître ici à tort.</p>
        </section>
      )}

      <div className="admh__cols admh__cols--even">
        <section className="admh__panel">
          <div className="admh__panel-head admh__panel-head--row"><h2>Newsletter · 30 jours</h2><Link href="/admin/newsletter">Ouvrir</Link></div>
          <div className="an__stat"><strong>{subList.length}</strong><span>inscription{subList.length > 1 ? "s" : ""} · {last7} sur 7 jours</span></div>
          <Spark values={subCum} w={400} h={64} />
          <Meter value={subActive} total={subList.length} label="Toujours inscrits" />
        </section>
        <section className="admh__panel">
          <div className="admh__panel-head admh__panel-head--row"><h2>Avis clients</h2><Link href="/admin/avis">Modérer</Link></div>
          <p className="an__big">{avg === null ? "—" : avg.toFixed(1).replace(".", ",")}<small> / 5 · {rv.length} avis publié{rv.length > 1 ? "s" : ""}</small></p>
          <ul className="admh__bars an__bars">{dist.map(([st, n]) => (<li key={st}><span>{st} ★</span><i style={{ "--w": `${(n / maxDist) * 100}%` } as React.CSSProperties} aria-hidden="true" /><b>{n}</b></li>))}</ul>
          <Meter value={positive} total={rv.length} label="Avis 4 et 5 étoiles" />
        </section>
      </div>

      <div className="admh__cols admh__cols--even">
        <section className="admh__panel">
          <div className="admh__panel-head"><h2>Catalogue par catégorie</h2></div>
          {catParts.length === 0 ? <p className="admh__empty">Aucun produit lu.</p> : <Donut parts={catParts} center={String(products.length)} caption="produits" />}
        </section>
        <section className="admh__panel">
          <div className="admh__panel-head admh__panel-head--row"><h2>Fiabilité des agents · 7 jours</h2><Link href="/admin/logs">Journal</Link></div>
          {agentRows.length === 0 ? <p className="admh__empty">Aucune exécution sur 7 jours.</p> : (
            <>
              <div className="an__stat"><strong>{totalRuns ? Math.round((totalOk / totalRuns) * 100) : 0} %</strong><span>{totalRuns} exécutions</span></div>
              <Histo bins={[...perRunDay.entries()].map(([k, v]) => ({ label: labelOf(k), value: v }))} />
              <ul className="admh__bars an__bars">{agentRows.map((a) => (<li key={a.id}><span title={a.id}>{a.id}</span><i style={{ "--w": `${a.rate}%` } as React.CSSProperties} aria-hidden="true" /><b>{a.rate} %</b></li>))}</ul>
            </>
          )}
        </section>
      </div>

      <h2 className="an__sec">Audience</h2>
      {!A || sessions === 0 ? (
        <div className="an__notice" role="status"><b>Mesure activée.</b> Les premières visites apparaîtront ici dès la mise en ligne de cette version ; aucune donnée n'est estimée en attendant.</div>
      ) : (
        <>
          <section className="an-kpis" aria-label="Audience">
            <div className="an-kpi"><span className="an-kpi__label">Sessions</span><strong>{sessions}</strong><div className="an-kpi__row"><em>{A.pageviews} pages vues</em></div><Spark values={trafficPoints.map((p) => p.value)} /></div>
            <div className="an-kpi"><span className="an-kpi__label">Pages par session</span><strong>{(A.pageviews / sessions).toFixed(1).replace(".", ",")}</strong><div className="an-kpi__row"><em>profondeur de visite</em></div></div>
            <div className="an-kpi"><span className="an-kpi__label">Taux de conversion</span><strong>{conv === null ? "—" : `${conv.toFixed(1).replace(".", ",")} %`}</strong><div className="an-kpi__row"><em>{covered ? "commandes ÷ sessions" : "mesure partielle sur la période"}</em></div></div>
            <div className="an-kpi"><span className="an-kpi__label">Paniers abandonnés</span><strong>{A.abandoned}</strong><div className="an-kpi__row"><em>≈ {eur(A.abandoned_value)}</em></div></div>
          </section>
          <section className="admh__panel an__panel">
            <div className="admh__panel-head admh__panel-head--row"><h2>Sessions par jour</h2><span className="an__hint">Mesure depuis le {new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(new Date(trackStart ?? now))}</span></div>
            <RevenueChart points={trafficPoints} currency={currency} showPrev={false} kind="traffic" />
          </section>
          <div className="admh__cols admh__cols--even">
            <section className="admh__panel">
              <div className="admh__panel-head"><h2>Parcours d'achat</h2></div>
              <ul className="an-funnel">
                {steps.map((st, i) => (
                  <li key={st.label}>
                    <span>{st.label}</span>
                    <i style={{ "--w": `${sessions ? Math.min(100, (st.n / sessions) * 100) : 0}%` } as React.CSSProperties} aria-hidden="true" />
                    <b>{st.n}</b>
                    <em>{i === 0 ? "" : steps[i - 1].n ? `${Math.round((st.n / steps[i - 1].n) * 100)} %` : "—"}</em>
                  </li>
                ))}
              </ul>
              <p className="an__sub">Le pourcentage compare chaque étape à la précédente. Les commandes viennent de Shopify, les autres étapes de la mesure du site.</p>
            </section>
            <section className="admh__panel">
              <div className="admh__panel-head"><h2>Paniers abandonnés</h2></div>
              <dl className="an__dl">
                <div><dt>Sessions avec ajout au panier</dt><dd>{A.carted}</dd></div>
                <div><dt>Partis avant le paiement</dt><dd>{A.abandoned}</dd></div>
                <div><dt>Valeur de ces paniers</dt><dd>{eur(A.abandoned_value)}</dd></div>
                <div><dt>Paiements démarrés, sans commande</dt><dd>{checkoutLost}</dd></div>
                <div><dt>Taux d'abandon du panier</dt><dd>{A.carted ? `${Math.round((A.abandoned / A.carted) * 100)} %` : "—"}</dd></div>
              </dl>
              <p className="an__sub">« Sans commande » = paiements démarrés moins commandes payées sur la même fenêtre : une estimation, car le paiement se termine sur Shopify.</p>
            </section>
          </div>
          <div className="admh__cols admh__cols--even">
            <section className="admh__panel">
              <div className="admh__panel-head"><h2>Pages les plus vues</h2></div>
              <ul className="admh__bars an__bars">{A.pages.map((p) => (<li key={p.k}><span title={p.k}>{pageLabel(p.k)}</span><i style={{ "--w": `${(p.n / A.pages[0].n) * 100}%` } as React.CSSProperties} aria-hidden="true" /><b>{p.n}</b></li>))}</ul>
            </section>
            <section className="admh__panel">
              <div className="admh__panel-head"><h2>Sources de visites</h2></div>
              <Donut parts={A.sources.map((x) => ({ label: x.k, value: x.n }))} center={String(sessions)} caption="sessions" />
            </section>
          </div>
        </>
      )}

      <h2 className="an__sec">Clients et connexions</h2>
      {!M ? (
        <div className="an__notice" role="status"><b>Données clients indisponibles.</b> Erreur de lecture, réessayez.</div>
      ) : (
        <>
          <section className="an-kpis" aria-label="Clients">
            <div className="an-kpi"><span className="an-kpi__label">Comptes clients</span><strong>{M.members}</strong><div className="an-kpi__row"><em>{M.confirmed} e-mail{M.confirmed > 1 ? "s" : ""} confirmé{M.confirmed > 1 ? "s" : ""}</em></div></div>
            <div className="an-kpi"><span className="an-kpi__label">Nouveaux comptes</span><strong>{M.new}</strong><div className="an-kpi__row"><em>sur {days} jours</em></div><Spark values={memberPoints.map((p) => p.value)} /></div>
            <div className="an-kpi"><span className="an-kpi__label">Clients actifs</span><strong>{M.active}</strong><div className="an-kpi__row"><em>connectés sur {days} jours</em></div></div>
            <div className="an-kpi"><span className="an-kpi__label">Visites connectées</span><strong>{M.login_sessions}</strong><div className="an-kpi__row"><em>{M.sessions > 0 ? `${Math.round((M.login_sessions / M.sessions) * 100)} % des sessions` : "mesure à venir"}</em></div></div>
          </section>
          <section className="admh__panel">
            <div className="admh__panel-head"><h2>Connexions mesurées</h2></div>
            <dl className="an__dl">
              <div><dt>Connexions</dt><dd>{M.logins}</dd></div>
              <div><dt>Inscriptions</dt><dd>{M.signups}</dd></div>
              <div><dt>Sessions du site</dt><dd>{M.sessions}</dd></div>
            </dl>
            <p className="an__sub">Comptage anonyme : une connexion ou une inscription par session de navigation, sans e-mail ni identité. Les comptes viennent de la base clients ; « actifs » = dernière connexion dans la période. Les visiteurs qui refusent le suivi (DNT) ne sont pas comptés dans les connexions mesurées.</p>
          </section>
        </>
      )}

      <section className="admh__panel an__panel" aria-label="Origine des visiteurs">
        <div className="admh__panel-head admh__panel-head--row"><h2>D'où viennent les visiteurs</h2><span className="an__hint">{G && G.total > 0 ? `${G.known} session${G.known > 1 ? "s" : ""} localisée${G.known > 1 ? "s" : ""} sur ${G.total}` : "Sessions par pays"}</span></div>
        {globe ? <Globe data={globe} rows={G?.list ?? []} /> : <div className="an__notice" role="status"><b>Globe indisponible.</b> Installez les paquets : <code>npm i world-atlas world-countries</code>, puis relancez le site.</div>}
        <p className="an__sub">Pays déduit par l'hébergeur à la visite ; ni adresse IP ni position précise n'est conservée. Une session = un onglet ouvert, comptée une fois par pays.</p>
      </section>

      <h2 className="an__sec">Marges</h2>
      {costState === "off" ? null : costState === "denied" ? (
        <div className="an__notice" role="status"><b>Coûts illisibles.</b> Ajoutez à l'application Shopify le droit read_inventory (ou read_products), puis réinstallez-la.</div>
      ) : costState === "error" ? (
        <div className="an__notice" role="status"><b>Coûts illisibles.</b> Erreur Shopify, réessayez.</div>
      ) : costs.size === 0 ? (
        <div className="an__notice" role="status"><b>Aucun coût renseigné.</b> Dans Shopify : Produits, la variante, « Coût par article ». Dès qu'il est saisi, la marge est calculée ici ; rien n'est estimé.</div>
      ) : (
        <>
          <section className="an-kpis" aria-label="Marges">
            <div className="an-kpi"><span className="an-kpi__label">Marge brute</span><strong>{eur(marginAbs)}</strong><div className="an-kpi__row"><em>sur {eur(revKnown)} de ventes</em></div></div>
            <div className="an-kpi"><span className="an-kpi__label">Taux de marge</span><strong>{marginPct === null ? "—" : `${marginPct.toFixed(0)} %`}</strong><div className="an-kpi__row"><em>(vente − coût) ÷ vente</em></div></div>
            <div className="an-kpi"><span className="an-kpi__label">Couverture des coûts</span><strong>{coverage} %</strong><div className="an-kpi__row"><em>{linesKnown} ligne{linesKnown > 1 ? "s" : ""} sur {linesAll}</em></div></div>
            <div className="an-kpi"><span className="an-kpi__label">Produits sans coût</span><strong>{noCost.size}</strong><div className="an-kpi__row"><em>vendus sur la période</em></div></div>
          </section>
          <div className="admh__cols admh__cols--even">
            <section className="admh__panel">
              <div className="admh__panel-head"><h2>Marge par produit</h2></div>
              <ul className="admh__bars an__bars">{marginTop.map(([n, v]) => (<li key={n}><span title={n}>{n}</span><i style={{ "--w": `${(Math.max(0, v.m) / Math.max(1, marginTop[0][1].m)) * 100}%` } as React.CSSProperties} aria-hidden="true" /><b>{eur(v.m)}</b></li>))}</ul>
            </section>
            <section className="admh__panel">
              <div className="admh__panel-head"><h2>Lecture de la marge</h2></div>
              <ul className="an__missing">
                <li><b>Marge brute produit</b><small>Prix de vente moins coût par article, avant frais de port, frais de paiement et publicité.</small></li>
                <li><b>TVA</b><small>{tvaRate ? "TVA de 20 % retirée des prix de vente." : "Les prix de vente sont pris tels qu'ils sont dans Shopify."} <Link href={`/admin/analytics?periode=${periode}${tvaRate ? "" : "&tva=20"}`}>{tvaRate ? "Revenir aux prix affichés" : "Retirer 20 % de TVA"}</Link></small></li>
                <li><b>Coûts manquants</b><small>{noCost.size ? `${[...noCost].slice(0, 4).join(", ")}${noCost.size > 4 ? "…" : ""} : coût non renseigné, exclus du calcul.` : "Tous les produits vendus ont un coût."}</small></li>
              </ul>
            </section>
          </div>
        </>
      )}
    </div>
  );
}
