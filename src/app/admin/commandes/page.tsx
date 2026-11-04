import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminConfigured, adminGraphQL } from "@/lib/shopify-admin";
import { AdminHead } from "@/components/AdminHead";
import "./commandes.css";

export const metadata: Metadata = { title: "Commandes — ESSNC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const STORE_ADMIN = "https://admin.shopify.com/store/3rhvh0-9q";
const PAGE = 25;
const LATE_HOURS = 48;

const FILTERS = {
  toutes: { label: "Toutes", q: "" },
  "a-expedier": { label: "À expédier", q: "fulfillment_status:unshipped status:open" },
  expediees: { label: "Expédiées", q: "fulfillment_status:shipped" },
  remboursees: { label: "Remboursées", q: "financial_status:refunded OR financial_status:partially_refunded" },
  annulees: { label: "Annulées", q: "status:cancelled" },
} as const;
type Filter = keyof typeof FILTERS;

const PAY: Record<string, string> = { PAID: "Payée", PENDING: "En attente", AUTHORIZED: "Autorisée", PARTIALLY_PAID: "Part. payée", PARTIALLY_REFUNDED: "Remb. partiel", REFUNDED: "Remboursée", VOIDED: "Annulée", EXPIRED: "Expirée" };
const FUL: Record<string, string> = { FULFILLED: "Expédiée", UNFULFILLED: "À expédier", PARTIALLY_FULFILLED: "Part. expédiée", IN_PROGRESS: "En préparation", ON_HOLD: "En attente", SCHEDULED: "Planifiée", OPEN: "Ouverte", REQUEST_DECLINED: "Refusée", RESTOCKED: "Remise en stock" };
const DELIVERY: Record<string, string> = { DELIVERED: "Livrée", IN_TRANSIT: "En transit", OUT_FOR_DELIVERY: "En livraison", READY_FOR_PICKUP: "Prête au retrait", ATTEMPTED_DELIVERY: "Tentative échouée", FAILURE: "Échec de livraison", CONFIRMED: "Confirmée", LABEL_PRINTED: "Étiquette créée", LABEL_PURCHASED: "Étiquette achetée", PICKED_UP: "Retirée", NOT_DELIVERED: "Non livrée" };
const RETURN: Record<string, string> = { RETURN_REQUESTED: "Retour demandé", IN_PROGRESS: "Retour en cours", RETURNED: "Retournée", INSPECTION_COMPLETE: "Retour contrôlé" };

type Node = {
  legacyResourceId: string; name: string; createdAt: string; displayFinancialStatus: string | null; displayFulfillmentStatus: string | null; cancelledAt: string | null; returnStatus?: string | null;
  currentTotalPriceSet: { shopMoney: { amount: string; currencyCode: string } }; totalRefundedSet: { shopMoney: { amount: string } } | null;
  subtotalLineItemsQuantity: number; lineItems: { nodes: { title: string; quantity: number }[] };
  shippingAddress?: { countryCodeV2: string | null } | null;
  fulfillments?: { createdAt: string; displayStatus: string | null; trackingInfo: { company: string | null; number: string | null; url: string | null }[] }[];
};
type Data = { orders: { pageInfo: { hasNextPage: boolean; endCursor: string | null }; nodes: Node[] } };

// Aucune donnée personnelle demandée : ni nom, ni e-mail, ni adresse (seulement le pays de livraison).
const listQuery = (full: boolean) => `query($q:String,$after:String){ orders(first:${PAGE}, after:$after, query:$q, sortKey:CREATED_AT, reverse:true){ pageInfo{hasNextPage endCursor} nodes{
  legacyResourceId name createdAt displayFinancialStatus displayFulfillmentStatus cancelledAt
  currentTotalPriceSet{shopMoney{amount currencyCode}} totalRefundedSet{shopMoney{amount}}
  subtotalLineItemsQuantity lineItems(first:3){nodes{title quantity}}${full ? `
  returnStatus shippingAddress{countryCodeV2}
  fulfillments(first:3){createdAt displayStatus trackingInfo{company number url}}` : ""} } } }`;
const COUNTS = `query($late:String!){
  todo: ordersCount(query:"fulfillment_status:unshipped status:open", limit:1000){count}
  late: ordersCount(query:$late, limit:1000){count}
  shipped: ordersCount(query:"fulfillment_status:shipped created_at:>=", limit:1000){count}
  refunded: ordersCount(query:"financial_status:refunded OR financial_status:partially_refunded", limit:1000){count}
  cancelled: ordersCount(query:"status:cancelled", limit:1000){count}
}`;
type Counts = Record<"todo" | "late" | "shipped" | "refunded" | "cancelled", { count: number } | null>;

const when = (d: string) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
const age = (d: string) => { const h = Math.floor((Date.now() - new Date(d).getTime()) / 3_600_000); return h < 1 ? "< 1 h" : h < 48 ? `${h} h` : `${Math.floor(h / 24)} j`; };

export default async function OrdersAdmin({ searchParams }: { searchParams: Promise<{ filtre?: string; q?: string; apres?: string }> }) {
  const sp = await searchParams;
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  if (!u.user) redirect("/admin/login?next=/admin/commandes");
  const { data: isAdmin } = await db.rpc("is_agent_admin");
  if (isAdmin !== true) {
    return (
      <div className="adm"><h1 className="acct__title">Commandes</h1>
        <div className="acct__empty"><h2>Accès réservé</h2><p>Ce compte n'est pas administrateur.</p></div></div>
    );
  }

  const filtre: Filter = sp.filtre && sp.filtre in FILTERS ? (sp.filtre as Filter) : "toutes";
  const num = (sp.q ?? "").replace(/\D/g, "").slice(0, 8);
  const after = sp.apres && /^[A-Za-z0-9+/=_-]{1,300}$/.test(sp.apres) ? sp.apres : null;
  const search = num ? `name:#${num}` : FILTERS[filtre].q;

  let detail = "";
  let state: "ok" | "not_configured" | "denied" | "error" = adminConfigured ? "ok" : "not_configured";
  let nodes: Node[] = [];
  let next: string | null = null;
  let counts: Counts | null = null;
  if (state === "ok") {
    try {
      const lateSince = new Date(Date.now() - LATE_HOURS * 3_600_000).toISOString().slice(0, 19) + "Z";
      const since30 = new Date(Date.now() - 30 * 86_400_000).toISOString().slice(0, 10);
      const countsP = adminGraphQL<Counts>(COUNTS.replace('created_at:>=', `created_at:>=${since30}`), { late: `fulfillment_status:unshipped status:open created_at:<${lateSince}` }).catch(() => ({ data: undefined }));
      let list = await adminGraphQL<Data>(listQuery(true), { q: search || null, after });
      if (!list.data && !(list.errors ?? []).some((e) => e.extensions?.code === "ACCESS_DENIED")) {
        // Repli : requête plus simple (sans suivi, retours ni pays) si un champ est refusé par cette version de l'API
        detail = list.errors?.[0]?.message ?? "";
        list = await adminGraphQL<Data>(listQuery(false), { q: search || null, after });
      }
      const cnt = await countsP;
      if ((list.errors ?? []).some((e) => e.extensions?.code === "ACCESS_DENIED")) state = "denied";
      else if (!list.data) { state = "error"; detail = list.errors?.[0]?.message ?? detail; }
      else {
        nodes = list.data.orders.nodes;
        next = list.data.orders.pageInfo.hasNextPage ? list.data.orders.pageInfo.endCursor : null;
        counts = (cnt as { data?: Counts }).data ?? null;
      }
    } catch (e) { state = "error"; detail = e instanceof Error ? e.message : String(e); }
  }

  const eur = (a: string, c: string) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: c }).format(Number(a) || 0);
  const href = (p: Record<string, string | null | undefined>) => {
    const u2 = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (v) u2.set(k, v);
    const s = u2.toString();
    return `/admin/commandes${s ? `?${s}` : ""}`;
  };
  const msg: Record<string, string> = {
    not_configured: "L'API Admin Shopify n'est pas configurée (SHOPIFY_ADMIN_CLIENT_ID et SHOPIFY_ADMIN_CLIENT_SECRET, ou SHOPIFY_ADMIN_TOKEN, dans Vercel).",
    denied: "Shopify refuse la lecture des commandes : ajoutez le droit read_orders à l'application, puis réinstallez-la.",
    error: "Les commandes n'ont pas pu être lues (erreur Shopify).",
  };

  return (
    <div className="admh cmd">
      <AdminHead eyebrow="Pilotage" title="Commandes" lead="Suivi des paiements, des expéditions et des retours. Lecture seule : aucune donnée personnelle n'est affichée ; pour agir, ouvrez la commande dans Shopify." />

      {state !== "ok" ? (
        <div className="cmd__notice" role="status"><b>Commandes indisponibles.</b> {msg[state]}{detail && <> <code className="cmd__code">Détail : {detail.slice(0, 220)}</code></>}</div>
      ) : (
        <>
          {counts && (
            <section className="cmd__kpis" aria-label="Chiffres clés">
              <Link href={href({ filtre: "a-expedier" })} className="cmd__kpi" data-hot={(counts.todo?.count ?? 0) > 0 ? "true" : undefined}><span>À expédier</span><strong>{counts.todo?.count ?? "—"}</strong><em>commandes ouvertes</em></Link>
              <Link href={href({ filtre: "a-expedier" })} className="cmd__kpi" data-hot={(counts.late?.count ?? 0) > 0 ? "true" : undefined}><span>En retard</span><strong>{counts.late?.count ?? "—"}</strong><em>non expédiées après {LATE_HOURS} h</em></Link>
              <Link href={href({ filtre: "expediees" })} className="cmd__kpi"><span>Expédiées · 30 j</span><strong>{counts.shipped?.count ?? "—"}</strong><em>avec ou sans suivi</em></Link>
              <Link href={href({ filtre: "remboursees" })} className="cmd__kpi"><span>Remboursées</span><strong>{counts.refunded?.count ?? "—"}</strong><em>{counts.cancelled?.count ?? 0} annulée{(counts.cancelled?.count ?? 0) > 1 ? "s" : ""}</em></Link>
            </section>
          )}

          <div className="cmd__bar">
            <nav className="cmd__tabs" aria-label="Filtres">
              {(Object.keys(FILTERS) as Filter[]).map((f) => (
                <Link key={f} href={href({ filtre: f === "toutes" ? null : f })} data-active={!num && f === filtre} aria-current={!num && f === filtre ? "true" : undefined}>{FILTERS[f].label}</Link>
              ))}
            </nav>
            <form action="/admin/commandes" className="cmd__search" role="search">
              <input name="q" inputMode="numeric" placeholder="N° de commande" defaultValue={num} aria-label="Numéro de commande" maxLength={8} />
              <button type="submit">Chercher</button>
            </form>
          </div>

          {nodes.length === 0 ? (
            <p className="cmd__empty">Aucune commande pour ce filtre.</p>
          ) : (
            <div className="cmd__list" role="table" aria-label="Commandes">
              <div className="cmd__row cmd__row--head" role="row">
                <span role="columnheader">Commande</span><span role="columnheader">Articles</span><span role="columnheader">Paiement</span><span role="columnheader">Expédition</span><span role="columnheader">Suivi</span><span role="columnheader" className="cmd__r">Total</span>
              </div>
              {nodes.map((o) => {
                const cancelled = !!o.cancelledAt;
                const unfulfilled = !cancelled && (o.displayFulfillmentStatus === "UNFULFILLED" || o.displayFulfillmentStatus === "PARTIALLY_FULFILLED");
                const late = unfulfilled && Date.now() - new Date(o.createdAt).getTime() > LATE_HOURS * 3_600_000;
                const tracks = (o.fulfillments ?? []).flatMap((f) => f.trackingInfo.filter((t) => t.number));
                const delivery = (o.fulfillments ?? []).map((f) => f.displayStatus).find((s) => s && DELIVERY[s]);
                const refunded = Number(o.totalRefundedSet?.shopMoney.amount) || 0;
                const total = o.currentTotalPriceSet.shopMoney;
                const more = o.subtotalLineItemsQuantity - o.lineItems.nodes.reduce((n, l) => n + l.quantity, 0);
                return (
                  <div key={o.legacyResourceId} className="cmd__row" role="row" data-late={late ? "true" : undefined}>
                    <span role="cell" className="cmd__id" data-label="Commande">
                      <a href={`${STORE_ADMIN}/orders/${o.legacyResourceId}`} target="_blank" rel="noreferrer">{o.name}</a>
                      <small>{when(o.createdAt)}{o.shippingAddress?.countryCodeV2 ? ` · ${o.shippingAddress.countryCodeV2}` : ""}</small>
                    </span>
                    <span role="cell" className="cmd__items" data-label="Articles">
                      {o.lineItems.nodes.map((l, i) => <small key={i} title={l.title}>{l.quantity} × {l.title}</small>)}
                      {more > 0 && <small>+ {more} autre{more > 1 ? "s" : ""}</small>}
                    </span>
                    <span role="cell" data-label="Paiement"><i className="cmd__chip" data-t={cancelled ? "bad" : o.displayFinancialStatus === "PAID" ? "ok" : o.displayFinancialStatus === "PENDING" || o.displayFinancialStatus === "AUTHORIZED" ? "warn" : "mute"}>{cancelled ? "Annulée" : PAY[o.displayFinancialStatus ?? ""] ?? o.displayFinancialStatus ?? "—"}</i>{refunded > 0 && <small>− {eur(String(refunded), total.currencyCode)}</small>}</span>
                    <span role="cell" data-label="Expédition">
                      <i className="cmd__chip" data-t={cancelled ? "mute" : late ? "bad" : o.displayFulfillmentStatus === "FULFILLED" ? "ok" : unfulfilled ? "warn" : "mute"}>{cancelled ? "—" : late ? `En retard · ${age(o.createdAt)}` : FUL[o.displayFulfillmentStatus ?? ""] ?? o.displayFulfillmentStatus ?? "—"}</i>
                      {delivery && <small>{DELIVERY[delivery]}</small>}
                      {o.returnStatus && o.returnStatus !== "NO_RETURN" && <small>{RETURN[o.returnStatus] ?? o.returnStatus}</small>}
                    </span>
                    <span role="cell" className="cmd__track" data-label="Suivi">
                      {tracks.length === 0 ? <small>{o.displayFulfillmentStatus === "FULFILLED" ? "Sans numéro" : "—"}</small> : tracks.slice(0, 2).map((t, i) => t.url ? <a key={i} href={t.url} target="_blank" rel="noreferrer noopener">{t.company ? `${t.company} · ` : ""}{t.number}</a> : <small key={i}>{t.company ? `${t.company} · ` : ""}{t.number}</small>)}
                    </span>
                    <span role="cell" className="cmd__r cmd__total" data-label="Total">{eur(total.amount, total.currencyCode)}</span>
                  </div>
                );
              })}
            </div>
          )}

          <div className="cmd__pager">
            {after && <Link href={href({ filtre: filtre === "toutes" ? null : filtre })}>← Retour au début</Link>}
            {next && !num && <Link href={href({ filtre: filtre === "toutes" ? null : filtre, apres: next })}>Commandes plus anciennes →</Link>}
          </div>
          <p className="cmd__foot">Les liens de suivi viennent des transporteurs saisis dans Shopify. Les actions (expédier, rembourser, annuler) se font dans Shopify, jamais ici.</p>
        </>
      )}
    </div>
  );
}
