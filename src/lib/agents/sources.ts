// Collecte des données (lecture seule). Chaque source vérifie d'abord la permission de l'agent.
import { adminConfigured, adminGraphQL } from "../shopify-admin";
import type { SupabaseClient } from "@supabase/supabase-js";
import { getCollection, getProduct, getProducts } from "../shopify";
import { HOME_COLLECTIONS } from "../collections";
import { clean, ensure } from "./guard";
import type { AgentDef, Mode } from "./types";
import type { CatalogItem } from "./analyzers/product";
import type { OrderLite } from "./analyzers/analytics";
import type { Check } from "./analyzers/technical";
import type { PageProbe } from "./analyzers/seo";
import type { StockItem } from "./analyzers/inventory";
import type { OrderStatus } from "./analyzers/orders";
import type { ReviewLite } from "./analyzers/support";
import type { CollectionHealth } from "./analyzers/marketing";

export type Ctx = { def: AgentDef; mode: Mode; origin: string; used: Set<string> };

const timed = async <T,>(fn: () => Promise<T>): Promise<[T | undefined, number, string | undefined]> => {
  const t = Date.now();
  try { return [await fn(), Date.now() - t, undefined]; } catch (e) { return [undefined, Date.now() - t, e instanceof Error ? e.message : String(e)]; }
};

export async function fetchCatalog(ctx: Ctx, detail = 20): Promise<CatalogItem[]> {
  ensure(ctx.def, ctx.mode, "shopify.storefront.read"); ctx.used.add("shopify.storefront");
  const list = await getProducts(50);
  const media = new Map<string, number>();
  await Promise.all(list.slice(0, detail).map(async (p) => { const full = await getProduct(p.handle).catch(() => null); if (full) media.set(p.handle, full.media?.length ?? full.images?.length ?? 0); }));
  return list.map((p) => ({
    handle: p.handle, title: clean(p.title), description: clean(p.description, 2000), tagline: clean(p.tagline),
    hasImage: !!p.image, mediaCount: media.get(p.handle), category: p.category, price: p.price, variantCount: p.variants?.length ?? 1,
  }));
}

type OrdersData = { orders: { nodes: { processedAt: string; displayFinancialStatus: string | null; cancelledAt: string | null; currentTotalPriceSet: { shopMoney: { amount: string; currencyCode: string } }; lineItems: { nodes: { title: string; quantity: number }[] } }[] } };

/** Commandes agrégées : aucune donnée personnelle (ni nom, ni e-mail, ni adresse) n'est demandée. */
export async function fetchOrders(ctx: Ctx): Promise<{ orders: OrderLite[]; denied: boolean }> {
  ensure(ctx.def, ctx.mode, "shopify.admin.orders.read"); ctx.used.add("shopify.admin.orders");
  const r = await adminGraphQL<OrdersData>(`query { orders(first: 100, sortKey: PROCESSED_AT, reverse: true) { nodes { processedAt displayFinancialStatus cancelledAt currentTotalPriceSet { shopMoney { amount currencyCode } } lineItems(first: 20) { nodes { title quantity } } } } }`);
  const denied = (r.errors ?? []).some((e) => e.extensions?.code === "ACCESS_DENIED");
  const nodes = r.data?.orders.nodes ?? [];
  if (!r.data && !denied) throw new Error(clean(r.errors?.[0]?.message ?? "pas de données"));
  return {
    denied,
    orders: nodes.map((n) => ({
      processedAt: n.processedAt, paid: n.displayFinancialStatus === "PAID" || n.displayFinancialStatus === "PARTIALLY_REFUNDED", cancelled: !!n.cancelledAt,
      amount: Number(n.currentTotalPriceSet.shopMoney.amount) || 0, currency: n.currentTotalPriceSet.shopMoney.currencyCode,
      lines: n.lineItems.nodes.map((l) => ({ title: clean(l.title, 120), quantity: l.quantity })),
    })),
  };
}

type StockData = { products: { nodes: { handle: string; title: string; status: string; tracksInventory: boolean; totalInventory: number | null }[] } };

/** Stocks par produit (API Admin, lecture seule). */
export async function fetchStock(ctx: Ctx): Promise<{ items: StockItem[]; denied: boolean }> {
  ensure(ctx.def, ctx.mode, "shopify.admin.inventory.read"); ctx.used.add("shopify.admin.inventory");
  const r = await adminGraphQL<StockData>(`query { products(first: 100) { nodes { handle title status tracksInventory totalInventory } } }`);
  const denied = (r.errors ?? []).some((e) => e.extensions?.code === "ACCESS_DENIED");
  if (!r.data && !denied) throw new Error(clean(r.errors?.[0]?.message ?? "pas de données"));
  return { denied, items: (r.data?.products.nodes ?? []).map((n) => ({ handle: n.handle, title: clean(n.title, 120), status: n.status, tracked: n.tracksInventory, quantity: n.totalInventory })) };
}

type OrderStatusData = { orders: { nodes: { name: string; createdAt: string; displayFinancialStatus: string | null; displayFulfillmentStatus: string | null; cancelledAt: string | null }[] } };

/** Statuts de paiement et d'expédition : ni nom, ni e-mail, ni adresse. */
export async function fetchOrderStatuses(ctx: Ctx): Promise<{ orders: OrderStatus[]; denied: boolean }> {
  ensure(ctx.def, ctx.mode, "shopify.admin.orders.read"); ctx.used.add("shopify.admin.orders");
  const r = await adminGraphQL<OrderStatusData>(`query { orders(first: 100, sortKey: CREATED_AT, reverse: true) { nodes { name createdAt displayFinancialStatus displayFulfillmentStatus cancelledAt } } }`);
  const denied = (r.errors ?? []).some((e) => e.extensions?.code === "ACCESS_DENIED");
  if (!r.data && !denied) throw new Error(clean(r.errors?.[0]?.message ?? "pas de données"));
  return { denied, orders: (r.data?.orders.nodes ?? []).map((n) => ({ name: clean(n.name, 20), createdAt: n.createdAt, payment: n.displayFinancialStatus ?? "", fulfillment: n.displayFulfillmentStatus ?? "", cancelled: !!n.cancelledAt })) };
}

/** Avis clients (statut, note, date) : le texte et le nom des auteurs ne sont pas lus. */
export async function fetchReviews(ctx: Ctx, db: SupabaseClient): Promise<ReviewLite[]> {
  ensure(ctx.def, ctx.mode, "supabase.read"); ctx.used.add("supabase.reviews");
  const { data, error } = await db.from("reviews").select("id,rating,status,created_at,product_handle").order("created_at", { ascending: false }).limit(200);
  if (error) throw new Error(clean(error.message));
  return (data ?? []) as ReviewLite[];
}

/** Collections mises en avant sur le site : existent-elles et contiennent-elles des produits ? */
export async function fetchCollectionsHealth(ctx: Ctx): Promise<CollectionHealth[]> {
  ensure(ctx.def, ctx.mode, "shopify.storefront.read"); ctx.used.add("shopify.storefront");
  const handles = [...new Set(["parfums", "best-sellers", ...HOME_COLLECTIONS.map((c) => c.href.match(/^\/collections\/([^/?#]+)/)?.[1]).filter((h): h is string => !!h)])];
  return Promise.all(handles.map(async (handle) => {
    const c = await getCollection(handle).catch(() => null);
    return { handle, exists: !!c, count: c?.products.length ?? 0 };
  }));
}

export async function probePage(ctx: Ctx, path: string, withHtml = true): Promise<PageProbe & { ms: number }> {
  ensure(ctx.def, ctx.mode, "site.http.read"); ctx.used.add("site.http");
  const [res, ms] = await timed(() => fetch(new URL(path, ctx.origin), { cache: "no-store", redirect: "manual", headers: { "user-agent": "maison-agents/1.0" } }));
  if (!res) return { path, status: 0, ms };
  const html = withHtml && res.status === 200 && (res.headers.get("content-type") ?? "").includes("html") ? await res.text() : undefined;
  return { path, status: res.status, html, ms };
}

export async function runSiteChecks(ctx: Ctx, paths: string[]): Promise<Check[]> {
  const out: Check[] = [];
  for (const p of paths) { const r = await probePage(ctx, p, false); out.push({ name: `Page ${p}`, ok: r.status === 200, status: r.status, ms: r.ms }); }
  return out;
}

export async function runIntegrationChecks(ctx: Ctx): Promise<Check[]> {
  ensure(ctx.def, ctx.mode, "shopify.storefront.read"); ensure(ctx.def, ctx.mode, "shopify.admin.orders.read"); ensure(ctx.def, ctx.mode, "supabase.read");
  ctx.used.add("shopify.storefront"); ctx.used.add("shopify.admin"); ctx.used.add("supabase.health");
  const out: Check[] = [];
  const [sf, sfMs, sfErr] = await timed(() => getProducts(1));
  out.push({ name: "API Storefront Shopify", ok: !!sf && sf.length > 0, ms: sfMs, note: sfErr ?? (sf?.length ? undefined : "aucun produit renvoyé") });
  if (adminConfigured) {
    const [r, ms, err] = await timed(() => adminGraphQL<{ shop: { name: string } }>(`query { shop { name } }`));
    out.push({ name: "API Admin Shopify", ok: !!r?.data?.shop, ms, note: err ?? (r?.data?.shop ? undefined : clean(r?.errors?.[0]?.message ?? "réponse vide")) });
  } else out.push({ name: "API Admin Shopify", ok: false, note: "non configurée (variables SHOPIFY_ADMIN_* absentes)" });
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL, key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (url && key) {
    const [res, ms, err] = await timed(() => fetch(`${url}/auth/v1/health`, { headers: { apikey: key }, cache: "no-store" }));
    out.push({ name: "Supabase (authentification)", ok: !!res && res.ok, status: res?.status, ms, note: err });
  } else out.push({ name: "Supabase (authentification)", ok: false, note: "non configuré" });
  return out;
}

export const envReport = () => ({
  SHOPIFY_STORE_DOMAIN: !!process.env.SHOPIFY_STORE_DOMAIN,
  SHOPIFY_STOREFRONT_TOKEN: !!process.env.SHOPIFY_STOREFRONT_TOKEN,
  SHOPIFY_ADMIN_CLIENT_ID: !!(process.env.SHOPIFY_ADMIN_CLIENT_ID || process.env.SHOPIFY_ADMIN_TOKEN),
  SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
  ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY,
  CRON_SECRET: !!process.env.CRON_SECRET,
});
