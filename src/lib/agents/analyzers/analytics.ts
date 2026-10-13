import type { Finding } from "../types";

export type OrderLite = { processedAt: string; paid: boolean; cancelled: boolean; amount: number; currency: string; lines: { title: string; quantity: number }[] };

export type SalesStats = {
  orders: number; paidOrders: number; revenue: number; averageBasket: number | null; currency: string | null;
  bestSellers: { title: string; quantity: number }[]; windowDays: number | null;
};

/** Statistiques calculées uniquement à partir des commandes lues. Rien n'est estimé. */
export function computeStats(orders: OrderLite[]): SalesStats {
  const paid = orders.filter((o) => o.paid && !o.cancelled);
  const revenue = paid.reduce((n, o) => n + o.amount, 0);
  const qty = new Map<string, number>();
  for (const o of paid) for (const l of o.lines) qty.set(l.title, (qty.get(l.title) ?? 0) + l.quantity);
  const dates = orders.map((o) => Date.parse(o.processedAt)).filter(Number.isFinite);
  return {
    orders: orders.length,
    paidOrders: paid.length,
    revenue: Math.round(revenue * 100) / 100,
    averageBasket: paid.length ? Math.round((revenue / paid.length) * 100) / 100 : null,
    currency: orders[0]?.currency ?? null,
    bestSellers: [...qty.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([title, quantity]) => ({ title, quantity })),
    windowDays: dates.length ? Math.max(1, Math.ceil((Date.now() - Math.min(...dates)) / 86_400_000)) : null,
  };
}

export function analyzeSales(stats: SalesStats): Finding[] {
  const out: Finding[] = [];
  if (stats.orders === 0) {
    out.push({ key: "analytics.no-orders", severity: "info", title: "Aucune commande lue", detail: "Pas de commande dans la fenêtre accessible : aucune tendance ne peut être calculée.", data: { ...stats } });
  } else {
    out.push({ key: "analytics.summary", severity: "info", title: `${stats.paidOrders} commande(s) payée(s) · ${stats.revenue} ${stats.currency ?? ""} · panier moyen ${stats.averageBasket ?? "—"}`, detail: stats.bestSellers.length ? `Meilleures ventes : ${stats.bestSellers.map((b) => `${b.title} (${b.quantity})`).join(", ")}.` : "Aucune vente payée.", data: { ...stats } });
  }
  out.push({ key: "analytics.unavailable", severity: "info", title: "Indisponible : taux de conversion et trafic", detail: "Aucune source de trafic (analytics web) n'est branchée. Ces indicateurs ne sont donc pas calculés, plutôt qu'inventés.", data: { missing: ["trafic", "taux de conversion", "paniers abandonnés"] } });
  return out;
}
