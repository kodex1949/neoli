import type { Product } from "./shopify";

const num = (s: string) => Number(s.replace(/[^\d,.-]/g, "").replace(/\./g, "").replace(",", "."));
const eur = (n: number) => new Intl.NumberFormat("fr-FR", { minimumFractionDigits: 2, maximumFractionDigits: 2, useGrouping: false }).format(n);
const fr = (n: number) => String(n).replace(".", ",");

type Measure = { kind: "l" | "kg"; base: number }; // base : quantité exprimée en ml (liquides) ou en g (solides)

/** Quantité lue dans un libellé : « 50 ml », « Spray 100 ml », « 1,5 l », « 3 cl », « 200 g », « 1,2 kg ». */
function measure(label: string): Measure | null {
  const n = "(\\d+(?:[.,]\\d+)?)";
  const read = (re: RegExp) => { const m = re.exec(label); return m ? Number(m[1].replace(",", ".")) : null; };
  let v: number | null;
  if ((v = read(new RegExp(n + "\\s*ml\\b", "i"))) !== null) return { kind: "l", base: v };
  if ((v = read(new RegExp(n + "\\s*cl\\b", "i"))) !== null) return { kind: "l", base: v * 10 };
  if ((v = read(new RegExp(n + "\\s*l\\b", "i"))) !== null) return { kind: "l", base: v * 1000 };
  if ((v = read(new RegExp(n + "\\s*kg\\b", "i"))) !== null) return { kind: "kg", base: v * 1000 };
  if ((v = read(new RegExp(n + "\\s*(?:g|gr|grammes?)\\b", "i"))) !== null) return { kind: "kg", base: v };
  return null;
}

/** « 200 g (179,50 € / kg) » ou « 60 ml (1 331,67 € / l) » pour un libellé de contenance et le prix correspondant. */
export function unitPriceOf(label: string, price: string): string | null {
  const m = measure(label);
  if (!m || !m.base) return null;
  const total = num(price);
  const per = (total / m.base) * 1000;
  if (!Number.isFinite(per)) return null;
  const qty = m.kind === "l" ? `${fr(m.base)} ml` : m.base >= 1000 ? `${fr(m.base / 1000)} kg` : `${fr(m.base)} g`;
  return `${qty} · ${eur(per)} € / ${m.kind}`;
}

/** Prix à l'unité en deux morceaux pour l'affichage détaillé : { label: « Prix au litre », value: « 699,00 € », qty: « 100 ml » }. */
export function unitParts(label: string, price: string): { label: string; value: string; qty: string; unit: "l" | "kg" } | null {
  const m = measure(label);
  if (!m || !m.base) return null;
  const per = (num(price) / m.base) * 1000;
  if (!Number.isFinite(per)) return null;
  const qty = m.kind === "l" ? `${fr(m.base)} ml` : m.base >= 1000 ? `${fr(m.base / 1000)} kg` : `${fr(m.base)} g`;
  return { label: m.kind === "l" ? "Prix au litre" : "Prix au kilo", value: `${eur(per)} €`, qty, unit: m.kind };
}

/**
 * Prix à l'unité d'un produit (au litre pour les ml / cl / l, au kilo pour les g / kg). On prend la déclinaison dont le prix correspond
 * à celui de la carte (sinon la première) ; à défaut, le format du produit (« Spray 50 ml », « Bougie 200 g »). Renvoie null si aucune quantité n'est connue.
 */
export function unitPrice(p: Product): string | null {
  const sized = (p.variants ?? []).filter((v) => measure(v.label) || (v.measure && measure(v.measure)));
  const pick = sized.find((v) => (v.price ?? p.price) === p.price) ?? sized[0];
  if (pick) return unitPriceOf(measure(pick.label) ? pick.label : pick.measure!, pick.price ?? p.price);
  return p.format ? unitPriceOf(p.format, p.price) : null;
}
