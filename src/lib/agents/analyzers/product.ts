import type { Finding } from "../types";

export type CatalogItem = { handle: string; title: string; description?: string; tagline?: string; hasImage: boolean; mediaCount?: number; category?: string; price?: string; variantCount: number };

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const priceNum = (p?: string) => Number((p ?? "").replace(/[^\d,]/g, "").replace(",", ".")) || 0;

/** Qualité du catalogue : uniquement à partir des champs réellement présents dans Shopify. */
export function analyzeCatalog(items: CatalogItem[]): Finding[] {
  const out: Finding[] = [];
  if (items.length === 0) return [{ key: "catalog.empty", severity: "critical", title: "Catalogue vide ou illisible", detail: "Aucun produit n'a été renvoyé par la boutique." }];

  const short = items.filter((p) => (p.description ?? "").length < 120);
  if (short.length) out.push({
    key: "catalog.short-description", severity: "warning",
    title: `${short.length} produit(s) avec une description trop courte`,
    detail: "Moins de 120 caractères : peu utile pour les clients et pour le référencement.",
    data: { products: short.map((p) => ({ handle: p.handle, length: (p.description ?? "").length })) },
    proposedAction: { type: "rewrite_descriptions", params: { handles: short.map((p) => p.handle) } },
  });

  const noImage = items.filter((p) => !p.hasImage);
  if (noImage.length) out.push({ key: "catalog.no-image", severity: "critical", title: `${noImage.length} produit(s) sans image`, detail: "Un produit sans visuel se vend très mal.", data: { handles: noImage.map((p) => p.handle) } });

  const oneImage = items.filter((p) => p.hasImage && p.mediaCount === 1);
  if (oneImage.length) out.push({ key: "catalog.single-media", severity: "info", title: `${oneImage.length} produit(s) avec un seul visuel`, detail: "Ajouter des vues (flacon, ambiance, vidéo) enrichit la galerie.", data: { handles: oneImage.map((p) => p.handle) } });

  const noCat = items.filter((p) => !p.category);
  if (noCat.length) out.push({ key: "catalog.no-category", severity: "warning", title: `${noCat.length} produit(s) sans type de produit`, detail: "Le type (Parfums, Maquillage…) alimente les filtres et les collections.", data: { handles: noCat.map((p) => p.handle) } });

  const seen = new Map<string, string[]>();
  for (const p of items) { const k = norm(p.title); seen.set(k, [...(seen.get(k) ?? []), p.handle]); }
  const dups = [...seen.values()].filter((h) => h.length > 1);
  if (dups.length) out.push({ key: "catalog.duplicates", severity: "warning", title: `${dups.length} titre(s) en doublon`, detail: "Deux produits portent le même nom.", data: { groups: dups } });

  const noPrice = items.filter((p) => priceNum(p.price) <= 0);
  if (noPrice.length) out.push({ key: "catalog.zero-price", severity: "critical", title: `${noPrice.length} produit(s) à prix nul`, detail: "Erreur de tarification probable.", data: { handles: noPrice.map((p) => p.handle) } });

  return out;
}
