// Marques revendues par la boutique. Elles viennent du champ « Fournisseur » (vendor) de chaque produit dans Shopify :
// pour ajouter une marque au menu, renseignez simplement ce champ sur ses produits.
import type { Submenu } from "./menu";

export type Brand = {
  name: string;
  slug: string;
  count: number;
  image?: { url: string; alt: string; width: number; height: number };
  image2?: { url: string; alt: string; width: number; height: number }; // 2e visuel, montré au survol
};

export const brandSlug = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " et ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** Redimensionne une image du CDN Shopify (netteté sur écrans Retina sans charger l'original). */
export const sizedImage = (url: string, width: number) => (/cdn\.shopify\.com/.test(url) ? `${url}${url.includes("?") ? "&" : "?"}width=${width}` : url);

export const brandHref = (b: { slug: string }) => `/marques/${b.slug}`;

const plural = (n: number) => `${n} ${n > 1 ? "parfums" : "parfum"}`;
export const brandCount = plural;

/** Sous-menu « Les Marques » : les marques les plus fournies en vignettes, puis la liste complète de A à Z. */
export function brandsSubmenu(brands: Brand[]): Submenu {
  const byCount = [...brands].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "fr"));
  const az = [...brands].sort((a, b) => a.name.localeCompare(b.name, "fr"));
  const featured = byCount.filter((b) => b.image).slice(0, 4);
  const columns: { label: string; href: string }[][] = [];
  const size = az.length > 10 ? Math.ceil(az.length / 2) : az.length;
  for (let i = 0; i < az.length; i += size) columns.push(az.slice(i, i + size).map((b) => ({ label: b.name, href: brandHref(b) })));
  columns.push([{ label: "Toutes les marques", href: "/marques" }]);
  const lead = byCount.find((b) => b.image);
  const second = byCount.filter((b) => b.image)[1];
  return {
    title: "Les Marques",
    iconicsLabel: "Les marques à la une",
    iconics: featured.map((b) => ({ label: b.name, href: brandHref(b), image: b.image?.url && sizedImage(b.image.url, 520), contain: true })),
    groups: columns,
    cards: [
      { eyebrow: "La sélection ESSNC", title: "Toutes les marques", href: "/marques", image: lead?.image?.url },
      ...(second ? [{ eyebrow: "À découvrir", title: second.name, href: brandHref(second), image: second.image?.url }] : []),
    ],
  };
}
