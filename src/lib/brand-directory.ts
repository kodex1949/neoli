// Annuaire des maisons de parfumerie : description, origine et famille.
// Une maison s'affiche avec ses parfums dès qu'un produit Shopify a son nom dans le champ « Fournisseur ».
// Tant qu'elle n'a pas de produit, elle figure dans « Bientôt chez ESSNC ». Pour ajouter une maison, ajoutez une ligne ci-dessous.
import { brandSlug, type Brand } from "./brands";

export type BrandGroupId = "dubai" | "inspirees" | "golfe" | "autres";
export type DirEntry = { name: string; group: Exclude<BrandGroupId, "autres">; origin: string; text: string };

export const GROUPS: { id: BrandGroupId; title: string; short: string; intro: string }[] = [
  { id: "dubai", title: "Les grandes maisons de Dubaï", short: "Dubaï", intro: "Les références de la parfumerie orientale : ambre, oud, musc et sillages généreux." },
  { id: "inspirees", title: "Les maisons inspirées", short: "Inspirées", intro: "Des interprétations orientales de grands succès de la parfumerie, à prix accessible." },
  { id: "golfe", title: "Les maisons du Golfe", short: "Golfe", intro: "Les grandes signatures du Golfe, entre tradition de l'oud et haute parfumerie." },
  { id: "autres", title: "Aussi dans la boutique", short: "Autres", intro: "D'autres maisons de notre sélection." },
];

export const DIRECTORY: DirEntry[] = [
  // Grandes maisons de Dubaï
  { name: "Lattafa", group: "dubai", origin: "Dubaï", text: "Maison émiratie devenue une référence des parfums orientaux accessibles : accords gourmands, ambrés et boisés, flacons soignés et belle tenue." },
  { name: "Maison Alhambra", group: "dubai", origin: "Dubaï", text: "Gamme du groupe Lattafa, aux compositions inspirées de grands succès de la parfumerie, à prix doux." },
  { name: "Asrar", group: "dubai", origin: "Dubaï", text: "Une ligne orientale proche de l'univers Lattafa, tournée vers les accords chauds, ambrés et boisés." },
  { name: "Maison El Nabil", group: "dubai", origin: "Dubaï", text: "Maison de parfumerie orientale au style élégant : des sillages floraux, ambrés et boisés, dans des flacons de belle allure." },
  { name: "Armaf", group: "dubai", origin: "Dubaï", text: "Maison de Dubaï (Sterling Parfums), connue pour Club de Nuit, ses parfums frais et boisés et son excellent rapport qualité-prix." },
  { name: "Afnan", group: "dubai", origin: "Dubaï", text: "Maison de Dubaï aux gammes variées, de Supremacy à 9PM, avec la ligne Zimaya : des sillages modernes et orientaux." },
  { name: "Rasasi", group: "dubai", origin: "Dubaï", text: "L'une des maisons les plus anciennes de Dubaï : oud, ambre et musc, entre tradition arabe et créations modernes." },
  { name: "Ajmal", group: "dubai", origin: "Dubaï", text: "Maison ancienne d'origine indienne installée à Dubaï, réputée pour ses attars, ses oud et ses sillages ambrés." },
  { name: "Swiss Arabian", group: "dubai", origin: "Dubaï", text: "Spécialiste de l'oud, du musc et des bakhoors, entre tradition du Golfe et parfumerie de luxe." },
  { name: "Al Haramain", group: "dubai", origin: "Dubaï", text: "Maison connue pour ses parfums à l'huile et ses eaux de parfum aux accents d'oud, d'ambre et de rose." },
  { name: "Nabeel", group: "dubai", origin: "Dubaï", text: "Maison de Dubaï proposant des eaux de parfum et des coffrets aux sillages orientaux et fruités." },
  { name: "Ard Al Zaafaran", group: "dubai", origin: "Dubaï", text: "Maison de Dubaï aux parfums orientaux accessibles : ambre, vanille et bois." },
  // Maisons inspirées
  { name: "Fragrance World", group: "inspirees", origin: "Dubaï", text: "Maison de Dubaï réputée pour ses parfums inspirés de grandes créations, à petit prix. Sa ligne French Avenue en est la plus connue." },
  { name: "Paris Corner", group: "inspirees", origin: "Dubaï", text: "Maison de Dubaï (Emir, Pendora Scent) : des interprétations orientales de succès de la parfumerie, à prix accessible." },
  { name: "Gulf Orchid", group: "inspirees", origin: "Dubaï", text: "Maison de Dubaï proposant des parfums inspirés de grands classiques, à prix accessible." },
  { name: "My Perfumes", group: "inspirees", origin: "Dubaï", text: "Maison de Dubaï (ligne Otoori) : des parfums inspirés, souvent gourmands ou fruités, à prix accessible." },
  // Maisons du Golfe
  { name: "Arabian Oud", group: "golfe", origin: "Arabie saoudite", text: "Maison saoudienne de référence : oud, bois précieux et ambre, dans la grande tradition de la parfumerie du Golfe." },
  { name: "Amouage", group: "golfe", origin: "Oman", text: "L'ultra-luxe du Golfe : encens, rose et oud, en petites séries et dans des flacons d'exception." },
  { name: "Asgharali", group: "golfe", origin: "Koweït", text: "Maison koweïtienne spécialisée dans l'oud et les essences rares, entre tradition et luxe." },
];

const bySlug = new Map(DIRECTORY.map((d) => [brandSlug(d.name), d]));
export const directoryFor = (slug: string) => bySlug.get(slug);

export type ShownBrand = Brand & { origin?: string; text?: string };
export type GroupView = { id: BrandGroupId; title: string; intro: string; available: ShownBrand[]; soon: DirEntry[] };

/** Regroupe les marques Shopify (avec produits) et les maisons de l'annuaire (sans produit pour l'instant). */
export function groupBrands(shopify: Brand[]): GroupView[] {
  const have = new Map(shopify.map((b) => [b.slug, b]));
  return GROUPS.map((g) => {
    const dir = DIRECTORY.filter((d) => d.group === g.id);
    const available: ShownBrand[] = g.id === "autres"
      ? shopify.filter((b) => !bySlug.has(b.slug))
      : dir.map((d) => have.get(brandSlug(d.name))).filter((b): b is Brand => !!b).map((b) => ({ ...b, origin: directoryFor(b.slug)?.origin, text: directoryFor(b.slug)?.text }));
    const soon = g.id === "autres" ? [] : dir.filter((d) => !have.has(brandSlug(d.name)));
    return { ...g, available, soon };
  }).filter((g) => g.available.length + g.soon.length > 0);
}
