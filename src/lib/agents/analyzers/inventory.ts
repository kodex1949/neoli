import type { Finding } from "../types";

export type StockItem = { handle: string; title: string; status: string; tracked: boolean; quantity: number | null };
const LOW = 5;

/** Stocks : uniquement les quantités renvoyées par Shopify. Aucune commande fournisseur n'est passée (validation humaine). */
export function analyzeStock(items: StockItem[], denied: boolean): Finding[] {
  if (denied) return [{ key: "inventory.denied", severity: "warning", title: "Stocks illisibles : accès Shopify refusé", detail: "L'application Shopify n'a pas le droit de lire les produits et les stocks (portées read_products et read_inventory). Activez-les pour que cet agent travaille." }];
  const active = items.filter((i) => i.status === "ACTIVE");
  if (!active.length) return [{ key: "inventory.empty", severity: "info", title: "Aucun produit actif lu", detail: "Rien à surveiller pour l'instant." }];
  const out: Finding[] = [];
  const tracked = active.filter((i) => i.tracked && i.quantity !== null);
  const sold = tracked.filter((i) => (i.quantity ?? 0) <= 0);
  const low = tracked.filter((i) => (i.quantity ?? 0) > 0 && (i.quantity ?? 0) <= LOW);
  const untracked = active.filter((i) => !i.tracked);
  if (sold.length) out.push({ key: "inventory.out", severity: "critical", title: `${sold.length} produit(s) en rupture de stock`, detail: sold.map((i) => i.title).slice(0, 8).join(", "), data: { handles: sold.map((i) => i.handle) }, proposedAction: { type: "restock_review", params: { handles: sold.map((i) => i.handle) } } });
  if (low.length) out.push({ key: "inventory.low", severity: "warning", title: `${low.length} produit(s) bientôt en rupture (${LOW} unités ou moins)`, detail: low.map((i) => `${i.title} (${i.quantity})`).slice(0, 8).join(", "), data: { items: low.map((i) => ({ handle: i.handle, quantity: i.quantity })) }, proposedAction: { type: "restock_review", params: { handles: low.map((i) => i.handle) } } });
  if (untracked.length) out.push({ key: "inventory.untracked", severity: "info", title: `${untracked.length} produit(s) sans suivi de stock`, detail: "Shopify ne compte pas leur stock : une rupture ne serait pas détectée.", data: { handles: untracked.map((i) => i.handle) } });
  if (!out.length) out.push({ key: "inventory.ok", severity: "info", title: `Stocks corrects sur ${tracked.length} produit(s) suivis`, detail: `Aucun produit à ${LOW} unités ou moins.` });
  return out;
}
