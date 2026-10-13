import type { Product } from "./shopify";

const num = (s: string) => Number(s.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
const eur = (n: number) => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false }).format(n);

/** Volume en ml lu dans un libellé (« 50 ml », « Spray 100 ml », « 1,5 l »). */
function volumeMl(label: string): number | null {
  const ml = /(\d+(?:[.,]\d+)?)\s*ml/i.exec(label);
  if (ml) return Number(ml[1].replace(",", "."));
  const l = /(\d+(?:[.,]\d+)?)\s*l\b/i.exec(label);
  return l ? Number(l[1].replace(",", ".")) * 1000 : null;
}

/**
 * Prix au litre d'un produit, ex. « 60 ml (1 331,67 € / l) ». On prend la déclinaison en millilitres qui correspond au prix affiché
 * sur la carte (sinon la première) ; à défaut, le format du produit (« Spray 50 ml »). Renvoie null si aucun volume n'est connu.
 */
export function unitPrice(p: Product): string | null {
  const sized = (p.variants ?? []).map((v) => ({ ml: volumeMl(v.label), price: v.price ?? p.price })).filter((v): v is { ml: number; price: string } => v.ml !== null);
  const pick = sized.find((v) => v.price === p.price) ?? sized[0] ?? (p.format && volumeMl(p.format) ? { ml: volumeMl(p.format)!, price: p.price } : null);
  if (!pick || !pick.ml) return null;
  const perLitre = (num(pick.price) / pick.ml) * 1000;
  if (!Number.isFinite(perLitre)) return null;
  const ml = Number.isInteger(pick.ml) ? String(pick.ml) : String(pick.ml).replace(".", ",");
  return `${ml} ml (${eur(perLitre)} € / l)`;
}
