import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminConfigured, adminGraphQL } from "@/lib/shopify-admin";
import { AdminHead } from "@/components/AdminHead";
import "./stocks.css";

export const metadata: Metadata = { title: "Stocks — ESSNC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STORE_ADMIN = "https://admin.shopify.com/store/3rhvh0-9q";
const LOW_UNITS = 5;       // stock bas : 5 unités ou moins
const LOW_DAYS = 14;       // ou moins de 14 jours de couverture
const OVER_DAYS = 120;     // surstock : plus de 120 jours de couverture
const TARGET_DAYS = 45;    // couverture visée pour la quantité de réassort indicative
const MIN_SAMPLE = 5;      // ventes minimum sur 30 j pour estimer un rythme

const FILTERS = {
  tous: "Tous", ruptures: "Ruptures", bas: "Stock bas", surstock: "Surstock", "non-suivis": "Non suivis",
} as const;
type Filter = keyof typeof FILTERS;

type PNode = {
  legacyResourceId: string; handle: string; title: string; status: string; tracksInventory: boolean; totalInventory: number | null;
  variants: { nodes: { id: string; inventoryQuantity: number | null; inventoryItem: { tracked: boolean; unitCost: { amount: string } | null } | null }[] };
};
type PData = { products: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: PNode[] } };
const PQUERY = `query($after:String){ products(first:25, after:$after, query:"status:active"){ pageInfo{hasNextPage endCursor} nodes{
  legacyResourceId handle title status tracksInventory totalInventory
  variants(first:10){nodes{id inventoryQuantity inventoryItem{tracked unitCost{amount}}}} } } }`;
type OData = { orders: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: { cancelledAt: string | null; displayFinancialStatus: string | null; lineItems: { nodes: { quantity: number; variant: { id: string } | null }[] } }[] } };
const OQUERY = `query($q:String!,$after:String){ orders(first:50, after:$after, query:$q){ pageInfo{hasNextPage endCursor} nodes{ cancelledAt displayFinancialStatus lineItems(first:10){nodes{quantity variant{id}}} } } }`;

type Row = { id: string; handle: string; title: string; tracked: boolean; stock: number | null; sold30: number; perDay: number; days: number | null; sample: boolean; value: number | null; costKnown: boolean; state: "rupture" | "bas" | "ok" | "surstock" | "non-suivi"; suggest: number };

export default async function StocksAdmin({ searchParams }: { searchParams: Promise<{ filtre?: string; q?: string }> }) {
  const sp = await searchParams;
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  if (!u.user) redirect("/admin/login?next=/admin/stocks");
  const { data: isAdmin } = await db.rpc("is_agent_admin");
  if (isAdmin !== true) {
    return (
      <div className="adm"><h1 className="acct__title">Stocks</h1>
        <div className="acct__empty"><h2>Accès réservé</h2><p>Ce compte n'est pas administrateur.</p></div></div>
    );
  }

  const filtre: Filter = sp.filtre && sp.filtre in FILTERS ? (sp.filtre as Filter) : "tous";
  const q = (sp.q ?? "").replace(/[^\p{L}\p{N} '’-]/gu, " ").trim().slice(0, 60).toLowerCase();

  let state: "ok" | "not_configured" | "denied" | "error" = adminConfigured ? "ok" : "not_configured";
  let detail = "";
  const products: PNode[] = [];
  let truncated = false;
  const sold = new Map<string, number>();
  let salesOk = false;

  if (state === "ok") {
    try {
      let after: string | null = null;
      for (let i = 0; i < 6; i++) {
        const r: Awaited<ReturnType<typeof adminGraphQL<PData>>> = await adminGraphQL<PData>(PQUERY, { after });
        if ((r.errors ?? []).some((e) => e.extensions?.code === "ACCESS_DENIED")) { state = "denied"; break; }
        if (!r.data) { state = "error"; detail = r.errors?.[0]?.message ?? ""; break; }
        products.push(...r.data.products.nodes);
        truncated = r.data.products.pageInfo.hasNextPage;
        if (!truncated) break;
        after = r.data.products.pageInfo.endCursor;
      }
      if (state === "ok") {
        // Rythme de vente : unités payées sur 30 jours (facultatif : sans droit « commandes », les stocks restent affichés)
        const since = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
        let oa: string | null = null;
        salesOk = true;
        for (let i = 0; i < 6; i++) {
          const r: Awaited<ReturnType<typeof adminGraphQL<OData>>> = await adminGraphQL<OData>(OQUERY, { q: `created_at:>=${since}`, after: oa }).catch(() => ({ data: undefined, errors: [{ message: "x" }] }));
          if (!r.data) { salesOk = i > 0 && sold.size > 0; break; }
          for (const o of r.data.orders.nodes) {
            if (o.cancelledAt || !(o.displayFinancialStatus === "PAID" || o.displayFinancialStatus === "PARTIALLY_REFUNDED")) continue;
            for (const l of o.lineItems.nodes) if (l.variant?.id) sold.set(l.variant.id, (sold.get(l.variant.id) ?? 0) + l.quantity);
          }
          if (!r.data.orders.pageInfo.hasNextPage) break;
          oa = r.data.orders.pageInfo.endCursor;
        }
      }
    } catch (e) { state = "error"; detail = e instanceof Error ? e.message : String(e); }
  }

  const rows: Row[] = products.map((p) => {
    const vs = p.variants.nodes;
    const tracked = p.tracksInventory || vs.some((v) => v.inventoryItem?.tracked);
    const stock = tracked ? (p.totalInventory ?? vs.reduce((n, v) => n + (v.inventoryQuantity ?? 0), 0)) : null;
    const sold30 = vs.reduce((n, v) => n + (sold.get(v.id) ?? 0), 0);
    const perDay = sold30 / 30;
    const sample = sold30 >= MIN_SAMPLE;
    const days = stock !== null && sample && perDay > 0 ? Math.round(stock / perDay) : null;
    let value: number | null = null; let costKnown = false;
    if (stock !== null) { const withCost = vs.filter((v) => Number(v.inventoryItem?.unitCost?.amount) > 0); if (withCost.length && withCost.length === vs.length) { costKnown = true; value = vs.reduce((n, v) => n + Math.max(0, v.inventoryQuantity ?? 0) * Number(v.inventoryItem?.unitCost?.amount), 0); } }
    let st: Row["state"] = "ok";
    if (!tracked) st = "non-suivi";
    else if ((stock ?? 0) <= 0) st = "rupture";
    else if ((stock ?? 0) <= LOW_UNITS || (days !== null && days < LOW_DAYS)) st = "bas";
    else if (days !== null && days > OVER_DAYS) st = "surstock";
    const suggest = tracked && sample && perDay > 0 && (st === "rupture" || st === "bas") ? Math.max(0, Math.ceil(perDay * TARGET_DAYS - (stock ?? 0))) : 0;
    return { id: p.legacyResourceId, handle: p.handle, title: p.title, tracked, stock, sold30, perDay, days, sample, value, costKnown, state: st, suggest };
  });

  const order: Record<Row["state"], number> = { rupture: 0, bas: 1, surstock: 2, ok: 3, "non-suivi": 4 };
  const shown = rows
    .filter((r) => (filtre === "tous" ? true : filtre === "ruptures" ? r.state === "rupture" : filtre === "bas" ? r.state === "bas" : filtre === "surstock" ? r.state === "surstock" : r.state === "non-suivi"))
    .filter((r) => !q || r.title.toLowerCase().includes(q))
    .sort((a, b) => order[a.state] - order[b.state] || (a.days ?? 9999) - (b.days ?? 9999) || a.title.localeCompare(b.title, "fr"));
  const n = (s: Row["state"]) => rows.filter((r) => r.state === s).length;
  const unitsTotal = rows.reduce((t, r) => t + (r.stock ?? 0), 0);
  const valueKnown = rows.reduce((t, r) => t + (r.value ?? 0), 0);
  const withValue = rows.filter((r) => r.costKnown).length;
  const eur = new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR", maximumFractionDigits: 0 });
  const href = (p: Record<string, string | null | undefined>) => { const s = new URLSearchParams(); for (const [k, v] of Object.entries(p)) if (v) s.set(k, v); const t = s.toString(); return `/admin/stocks${t ? `?${t}` : ""}`; };
  const LABEL: Record<Row["state"], string> = { rupture: "Rupture", bas: "Stock bas", ok: "Correct", surstock: "Surstock", "non-suivi": "Non suivi" };
  const msg: Record<string, string> = {
    not_configured: "L'API Admin Shopify n'est pas configurée (SHOPIFY_ADMIN_CLIENT_ID et SHOPIFY_ADMIN_CLIENT_SECRET, ou SHOPIFY_ADMIN_TOKEN, dans Vercel).",
    denied: "Shopify refuse la lecture des stocks : ajoutez les droits read_products et read_inventory à l'application, puis réinstallez-la.",
    error: "Les stocks n'ont pas pu être lus (erreur Shopify).",
  };

  return (
    <div className="admh stk">
      <AdminHead eyebrow="Pilotage" title="Stocks" lead="Ruptures, stocks bas et surstocks, avec la couverture en jours calculée sur les ventes réelles des 30 derniers jours. Lecture seule : aucune commande fournisseur n'est passée d'ici." />

      {state !== "ok" ? (
        <div className="stk__notice" role="status"><b>Stocks indisponibles.</b> {msg[state]}{detail && <code className="stk__code">Détail : {detail.slice(0, 220)}</code>}</div>
      ) : (
        <>
          {!salesOk && <div className="stk__notice" role="status">Le rythme de vente n'est pas lisible (droit de lecture des commandes manquant ou erreur) : les stocks sont affichés, mais pas la couverture en jours ni les quantités de réassort.</div>}
          {truncated && <div className="stk__notice" role="status">Seuls les 150 premiers produits actifs sont lus.</div>}

          <section className="stk__kpis" aria-label="Chiffres clés">
            <div className="stk__kpi" data-hot={n("rupture") > 0 ? "true" : undefined}><span>Ruptures</span><strong>{n("rupture")}</strong><em>produits à 0 unité</em></div>
            <div className="stk__kpi" data-warn={n("bas") > 0 ? "true" : undefined}><span>Stock bas</span><strong>{n("bas")}</strong><em>≤ {LOW_UNITS} unités ou &lt; {LOW_DAYS} jours</em></div>
            <div className="stk__kpi"><span>Unités en stock</span><strong>{unitsTotal}</strong><em>{rows.length} produits actifs · {n("surstock")} en surstock</em></div>
            <div className="stk__kpi"><span>Valeur au coût</span><strong>{withValue ? eur.format(valueKnown) : "—"}</strong><em>{withValue ? `${withValue} produit${withValue > 1 ? "s" : ""} avec coût renseigné` : "coût par article non renseigné"}</em></div>
          </section>

          <div className="stk__bar">
            <nav className="stk__tabs" aria-label="Filtres">
              {(Object.keys(FILTERS) as Filter[]).map((f) => <Link key={f} href={href({ filtre: f === "tous" ? null : f, q })} data-active={f === filtre}>{FILTERS[f]}</Link>)}
            </nav>
            <form action="/admin/stocks" className="stk__search" role="search">
              {filtre !== "tous" && <input type="hidden" name="filtre" value={filtre} />}
              <input name="q" placeholder="Produit" defaultValue={q} aria-label="Rechercher un produit" maxLength={60} />
              <button type="submit">Chercher</button>
            </form>
          </div>

          {shown.length === 0 ? <p className="stk__empty">Aucun produit pour ce filtre.</p> : (
            <div className="stk__list" role="table" aria-label="Stocks">
              <div className="stk__row stk__row--head" role="row">
                <span role="columnheader">Produit</span><span role="columnheader">État</span><span role="columnheader" className="stk__r">Stock</span><span role="columnheader" className="stk__r">Vendus 30 j</span><span role="columnheader" className="stk__r">Couverture</span><span role="columnheader" className="stk__r">Réassort indicatif</span>
              </div>
              {shown.map((r) => (
                <div key={r.id} className="stk__row" role="row" data-st={r.state}>
                  <span role="cell" className="stk__name" data-label="Produit"><a href={`${STORE_ADMIN}/products/${r.id}`} target="_blank" rel="noreferrer">{r.title}</a><Link href={`/produits/${r.handle}`}>Voir sur le site</Link></span>
                  <span role="cell" data-label="État"><i className="stk__chip" data-st={r.state}>{LABEL[r.state]}</i></span>
                  <span role="cell" className="stk__r stk__num" data-label="Stock">{r.stock === null ? "—" : r.stock}</span>
                  <span role="cell" className="stk__r stk__num" data-label="Vendus 30 j">{salesOk ? r.sold30 : "—"}</span>
                  <span role="cell" className="stk__r stk__num" data-label="Couverture">{r.days !== null ? `${r.days} j` : salesOk && r.tracked ? <small>{r.sold30 === 0 ? "aucune vente" : "historique insuffisant"}</small> : "—"}</span>
                  <span role="cell" className="stk__r stk__num" data-label="Réassort indicatif">{r.suggest > 0 ? <>+ {r.suggest}<small>pour {TARGET_DAYS} j</small></> : "—"}</span>
                </div>
              ))}
            </div>
          )}
          <p className="stk__foot">Couverture = stock ÷ ventes moyennes par jour sur 30 jours, calculée seulement à partir de {MIN_SAMPLE} ventes ou plus. Le réassort indicatif vise {TARGET_DAYS} jours de couverture : c'est un repère, pas une commande. Les produits en brouillon ou archivés sont exclus.</p>
        </>
      )}
    </div>
  );
}
