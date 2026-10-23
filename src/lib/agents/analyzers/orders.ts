import type { Finding } from "../types";

export type OrderStatus = { name: string; createdAt: string; payment: string; fulfillment: string; cancelled: boolean };
const H = 3_600_000;

/** Commandes : retards de préparation et paiements en attente. Aucune donnée personnelle ; aucune commande n'est modifiée. */
export function analyzeOrders(orders: OrderStatus[], denied: boolean): Finding[] {
  if (denied) return [{ key: "orders.denied", severity: "warning", title: "Commandes illisibles : accès Shopify refusé", detail: "Activez la portée read_orders de l'application Shopify pour que cet agent suive les commandes." }];
  const now = Date.now();
  const age = (o: OrderStatus) => (now - Date.parse(o.createdAt)) / H;
  const live = orders.filter((o) => !o.cancelled);
  const out: Finding[] = [];

  const late = live.filter((o) => o.payment === "PAID" && o.fulfillment !== "FULFILLED" && o.fulfillment !== "RESTOCKED" && age(o) > 48);
  const veryLate = late.filter((o) => age(o) > 120);
  if (late.length) out.push({ key: "orders.late", severity: veryLate.length ? "critical" : "warning", title: `${late.length} commande(s) payée(s) non expédiée(s) depuis plus de 48 h`, detail: `${late.slice(0, 8).map((o) => o.name).join(", ")}${veryLate.length ? ` · dont ${veryLate.length} depuis plus de 5 jours` : ""}.`, data: { orders: late.map((o) => o.name) } });

  const pending = live.filter((o) => (o.payment === "PENDING" || o.payment === "AUTHORIZED") && age(o) > 24);
  if (pending.length) out.push({ key: "orders.payment-pending", severity: "warning", title: `${pending.length} paiement(s) en attente depuis plus de 24 h`, detail: pending.slice(0, 8).map((o) => o.name).join(", ") + ".", data: { orders: pending.map((o) => o.name) } });

  const cancelled = orders.length - live.length;
  if (orders.length >= 10 && cancelled / orders.length > 0.15) out.push({ key: "orders.cancel-rate", severity: "warning", title: `${Math.round((cancelled / orders.length) * 100)} % de commandes annulées`, detail: `${cancelled} annulation(s) sur les ${orders.length} dernières commandes.` });

  const refunded = live.filter((o) => o.payment === "REFUNDED" || o.payment === "PARTIALLY_REFUNDED").length;
  if (refunded) out.push({ key: "orders.refunds", severity: "info", title: `${refunded} commande(s) remboursée(s) (totalement ou en partie)`, detail: "À rapprocher des retours et des avis." });

  if (!out.length) out.push({ key: "orders.ok", severity: "info", title: orders.length ? `Commandes à jour (${live.length} suivie(s))` : "Aucune commande lue", detail: orders.length ? "Aucun retard d'expédition ni paiement en attente." : "Rien à traiter pour l'instant." });
  return out;
}
