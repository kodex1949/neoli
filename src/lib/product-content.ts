import type { Media } from "./collections";

// Contenus de la fiche produit. Les textes viennent de Shopify (description du produit) ; ce qui est ici sert de repli
// et pour les sections éditoriales. Pour changer un visuel : déposez le fichier dans public/images ou public/videos.

export const ACCORDIONS: { title: string; text: string; points?: string[] }[] = [
  {
    title: "Livraison & retours",
    text: "Livraison offerte dès 100 € d'achat, expédition sous 48 h. Retour gratuit sous 30 jours pour tout produit non ouvert.",
    points: ["Standard : 3 à 5 jours ouvrés", "Express : 24 à 48 h", "Retrait en boutique gratuit", "Emballage cadeau offert"],
  },
];

/** Onglet « Ingrédients » : affiché seulement si la liste est renseignée dans Shopify (champ personnalisé custom.ingredients, et custom.allergens en option). */
export function ingredientsAccordion(ingredients?: string, allergens?: string): { title: string; text: string; points?: string[]; groups?: { label: string; value: string }[] } | null {
  if (!ingredients) return null;
  const points = allergens ? [`Allergènes : ${allergens}`] : undefined;
  // Structure « NOTES DE TÊTE … NOTES DE CŒUR … NOTES DE FOND … » (une ligne ou plusieurs) : on la découpe en trois blocs lisibles.
  const re = /notes?\s+de\s+(t[êe]te|c[œo]e?ur|fond)\s*:?/gi;
  const found = [...ingredients.matchAll(re)];
  if (found.length) {
    const label = (k: string) => (/^t/i.test(k) ? "Notes de tête" : /^f/i.test(k) ? "Notes de fond" : "Notes de cœur");
    const clean = (v: string) => v.replace(/\s+/g, " ").replace(/[\s,;.]+$/, "").trim();
    const groups = found
      .map((m, i) => ({ label: label(m[1]), value: clean(ingredients.slice(m.index! + m[0].length, found[i + 1]?.index ?? undefined)) }))
      .filter((g) => g.value);
    const intro = clean(ingredients.slice(0, found[0].index));
    return { title: "Ingrédients", text: intro, points, groups };
  }
  return { title: "Ingrédients", text: ingredients, points };
}

export type ScentNotes = { top?: string; heart?: string; base?: string };

/** Onglet « Notes olfactives » : affiché seulement si les notes sont renseignées dans Shopify (étiquettes tete:, coeur:, fond:). */
export function scentAccordion(n?: ScentNotes): { title: string; text: string; groups: { label: string; value: string }[] } | null {
  if (!n || (!n.top && !n.heart && !n.base)) return null;
  const groups = [n.top && { label: "Notes de tête", value: n.top }, n.heart && { label: "Notes de cœur", value: n.heart }, n.base && { label: "Notes de fond", value: n.base }].filter((x): x is { label: string; value: string } => !!x);
  return { title: "Notes olfactives", text: "Les notes se dévoilent dans le temps, de la première vaporisation jusqu'au sillage.", groups };
}

export const PERKS = ["Service d'essai : un échantillon offert", "Emballage cadeau offert", "Livraison offerte dès 100 €"];

export const FALLBACK_TEXT =
  "Un parfum pensé pour durer. Ses notes se dévoilent par touches successives, de la première vaporisation jusqu'au sillage. Pièce favorite qui s'assortit d'un rien et s'assemble avec tout, elle révèle l'évidence d'une signature sans artifice, presque dépouillée : l'incarnation pure d'une élégance universelle.";

export function editorial(title: string, tagline?: string): { wide: Media; split: Media } {
  return {
    wide: { image: "/images/tuile-gauche.jpg", eyebrow: "L'atelier", title: `La silhouette de ${title}`, tone: "light" },
    split: { image: "/images/tuile-droite.jpg", eyebrow: "Le parfum", title: `Une signature : ${title}`, text: tagline ?? "Une composition singulière." },
  };
}
