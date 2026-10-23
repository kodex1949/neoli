import type { Finding } from "../types";
import type { CatalogItem } from "./product";
import type { OrderLite } from "./analytics";

const num = (p?: string) => Number((p ?? "").replace(/[^\d,]/g, "").replace(",", ".")) || 0;
const median = (a: number[]) => { const s = [...a].sort((x, y) => x - y); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };

/** Prix : cohérence interne du catalogue. Aucune marge n'est calculée (le prix d'achat n'est pas connu) ; aucun prix n'est modifié. */
export function analyzePricing(items: CatalogItem[], orders: OrderLite[] | null): Finding[] {
  const out: Finding[] = [];
  const priced = items.filter((i) => num(i.price) > 0);
  const byCat = new Map<string, CatalogItem[]>();
  for (const i of priced) byCat.set(i.category ?? "Sans type", [...(byCat.get(i.category ?? "Sans type") ?? []), i]);

  const outliers: { handle: string; title: string; price: number; median: number }[] = [];
  for (const [, list] of byCat) {
    if (list.length < 3) continue;
    const m = median(list.map((i) => num(i.price)));
    for (const i of list) { const p = num(i.price); if (p > m * 2.5 || p < m * 0.4) outliers.push({ handle: i.handle, title: i.title, price: p, median: m }); }
  }
  if (outliers.length) out.push({ key: "pricing.outliers", severity: "warning", title: `${outliers.length} prix très éloigné(s) de leur catégorie`, detail: outliers.slice(0, 6).map((o) => `${o.title} : ${o.price} € (médiane ${Math.round(o.median)} €)`).join(" · "), data: { items: outliers }, proposedAction: { type: "review_prices", params: { handles: outliers.map((o) => o.handle) } } });

  if (orders && orders.length) {
    const sold = new Set(orders.filter((o) => o.paid && !o.cancelled).flatMap((o) => o.lines.map((l) => l.title.toLowerCase())));
    const unsold = priced.filter((i) => ![...sold].some((t) => t.includes(i.title.toLowerCase())));
    if (unsold.length && sold.size) out.push({ key: "pricing.no-sales", severity: "info", title: `${unsold.length} produit(s) sans vente sur la période lue`, detail: `${unsold.slice(0, 6).map((i) => `${i.title} (${i.price})`).join(", ")}. Un prix ou une visibilité à revoir, à décider avec vous.`, data: { handles: unsold.map((i) => i.handle) } });
  }
  out.push({ key: "pricing.margin-unavailable", severity: "info", title: "Indisponible : marges et prix d'achat", detail: "Les coûts d'achat ne sont renseignés nulle part : aucune marge n'est calculée, plutôt qu'inventée.", data: { missing: ["prix d'achat", "frais de port réels", "marge"] } });
  return out;
}
