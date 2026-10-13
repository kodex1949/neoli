import type { Media } from "./collections";

// Contenus de la fiche produit. Les textes viennent de Shopify (description du produit) ; ce qui est ici sert de repli
// et pour les sections éditoriales. Pour changer un visuel : déposez le fichier dans public/images ou public/videos.

export const ACCORDIONS: { title: string; text: string; points?: string[] }[] = [
  {
    title: "Ingrédients",
    text: "Alcool, parfum, eau, extraits naturels de fleurs et de bois. La liste complète figure sur l'emballage et sur l'étiquette du flacon.",
    points: ["Formule vegan, sans paraben", "Flacon rechargeable en boutique", "Allergènes : linalol, limonène, géraniol"],
  },
  {
    title: "Livraison & retours",
    text: "Livraison offerte dès 100 € d'achat, expédition sous 48 h. Retour gratuit sous 30 jours pour tout produit non ouvert.",
    points: ["Standard : 3 à 5 jours ouvrés", "Express : 24 à 48 h", "Retrait en boutique gratuit", "Emballage cadeau offert"],
  },
  {
    title: "Le mot du parfumeur",
    text: "Une composition pensée comme une silhouette : des matières nobles, un sillage reconnaissable, une élégance qui reste.",
    points: ["Tête : agrumes et fleurs blanches", "Cœur : rose, jasmin", "Fond : ambre, bois et musc"],
  },
];

export const PERKS = ["Service d'essai : un échantillon offert", "Emballage cadeau offert", "Livraison offerte dès 100 €"];

export const FALLBACK_TEXT =
  "Une création de Néoli, pensée pour durer. Ses notes se dévoilent par touches successives, de la première vaporisation jusqu'au sillage. Pièce favorite qui s'assortit d'un rien et s'assemble avec tout, elle révèle l'évidence d'une signature sans artifice, presque dépouillée : l'incarnation pure d'une élégance universelle.";

export function editorial(title: string, tagline?: string): { wide: Media; split: Media } {
  return {
    wide: { image: "/images/tuile-gauche.jpg", eyebrow: "L'atelier", title: `La silhouette de ${title}`, tone: "light" },
    split: { image: "/images/tuile-droite.jpg", eyebrow: "Le parfum", title: `Une signature : ${title}`, text: tagline ?? "Une composition singulière, signée de Néoli." },
  };
}
