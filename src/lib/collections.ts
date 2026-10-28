import { MENU } from "./menu";

// Nom et texte d'introduction des collections. Le nom vient du menu ; avec Shopify, c'est le titre de la collection qui prime.
const TEXTS: Record<string, { eyebrow: string; text: string }> = {
  nouveautes: { eyebrow: "Collection", text: "Les dernières créations de Néoli : parfums, maquillage et soins à découvrir en avant-première." },
  "best-sellers": { eyebrow: "Coups de cœur", text: "Les produits préférés de nos clients, ceux que l'on offre et que l'on rachète." },
  exclusifs: { eyebrow: "Exclusivités", text: "Des créations rares, disponibles uniquement chez Néoli et en ligne." },
  parfums: { eyebrow: "Parfumerie", text: "Eaux de parfum, extraits et eaux de toilette : des sillages pensés comme des signatures." },
  "haute-parfumerie": { eyebrow: "La Collection Privée", text: "Des matières précieuses et des accords audacieux, composés en petites séries." },
  maquillage: { eyebrow: "Maquillage", text: "Des textures confortables et des couleurs intenses pour sublimer chaque regard." },
  soin: { eyebrow: "Soins", text: "Des rituels doux pour une peau nourrie, apaisée et lumineuse." },
  bougies: { eyebrow: "Bougies & Maison", text: "Des bougies parfumées pour installer une atmosphère chaleureuse chez soi." },
  cadeaux: { eyebrow: "Cadeaux", text: "Des idées à offrir, joliment emballées et personnalisables." },
};

export function collectionMeta(handle: string): { title: string; eyebrow: string; text: string } | null {
  const href = `/collections/${handle}`;
  let label: string | undefined;
  for (const item of MENU.items) {
    if (item.href === href) label = item.label;
    for (const g of item.submenu?.groups ?? []) for (const l of g) if (l.href === href) label ??= l.label;
  }
  if (!label) return null;
  const t = TEXTS[handle];
  return { title: label, eyebrow: t?.eyebrow ?? "Collection", text: t?.text ?? "Une sélection de Néoli, à découvrir." };
}

// ---------------------------------------------------------------------------------------------
// Contenus éditoriaux d'une collection : des blocs image / vidéo + texte
// glissés dans la grille de produits. Pour changer un visuel : déposez le fichier dans public/images
// (ou public/videos) et mettez son chemin ci-dessous. Une collection absente de cette liste n'affiche que ses produits.
// ---------------------------------------------------------------------------------------------
export type Media = {
  image?: string; // ex. "/images/collections/nouveautes.jpg"
  video?: string; // ex. "/videos/collections/nouveautes.mp4" (lecture auto, muette, en boucle)
  eyebrow?: string;
  title?: string;
  text?: string;
  cta?: { label: string; href: string };
  tone?: "light" | "dark"; // couleur du texte : « light » = texte blanc (sur image sombre)
};

export type CollectionBlock = Media & {
  at: number; // inséré après N produits
  span?: 1 | 2 | 3 | 4; // largeur en colonnes (4 = pleine largeur)
  rows?: 1 | 2; // hauteur en lignes de produits
  right?: boolean; // colle le bloc au bord droit de la grille (sinon il suit les produits)
  slides?: Media[]; // si présent : bloc « story » vertical (9:16) qui enchaîne ces visuels, comme une story Instagram
  duration?: number; // secondes par diapositive (6 par défaut)
};

export const COLLECTION_CONTENT: Record<string, { blocks?: CollectionBlock[] }> = {
  nouveautes: {
    blocks: [
      {
        at: 2,
        span: 1,
        right: true,
        duration: 6,
        slides: [
          { image: "/images/tuile-droite.jpg", eyebrow: "Parfum", title: "L’esprit de Néoli", text: "Une signature florale et solaire.", cta: { label: "Découvrir", href: "/collections/parfums" } },
          { image: "/images/tuile-gauche.jpg", eyebrow: "Nouveauté", title: "Le jasmin, nouvel esprit", cta: { label: "Voir la collection", href: "/collections/nouveautes" } },
          { video: "/videos/hero.mp4", eyebrow: "Coulisses", title: "Un geste, une matière", text: "Dans l'atelier de Néoli.", cta: { label: "Explorer", href: "/collections/parfums" } },
        ],
      },
    ],
  },
  parfums: {
    blocks: [
      { at: 4, span: 2, image: "/images/tuile-gauche.jpg", eyebrow: "La Collection Privée", title: "Haute parfumerie", cta: { label: "Explorer", href: "/collections/haute-parfumerie" }, tone: "light" },
    ],
  },
};

// ---------------------------------------------------------------------------------------------
// Accueil : « La nouvelle icône couture » — panneaux qui s'ouvrent un à un. Pour changer un visuel :
// déposez le fichier dans public/images et mettez son chemin dans `image` (`position` cadre l'image, `tint` colore le fond).
// ---------------------------------------------------------------------------------------------
export type HomeCollection = {
  id: string;
  label: string; // titre vertical du panneau replié
  eyebrow: string;
  title: string;
  text: string;
  href: string;
  image?: string;
  position?: string; // object-position, ex. "30% 40%"
  tint: string; // couleur de repère (et de teinte du visuel)
};

export const HOME_COLLECTIONS: HomeCollection[] = [
  { id: "haute", label: "Haute parfumerie", eyebrow: "La Collection Privée", title: "Haute parfumerie", text: "Des accords rares et des matières précieuses, composés en petites séries.", href: "/collections/haute-parfumerie", image: "/images/tuile-gauche.jpg", position: "50% 40%", tint: "#3a2a2c" },
  { id: "maquillage", label: "Maquillage", eyebrow: "Nouveauté", title: "Couleur & confort", text: "Des rouges à lèvres mats sans transfert, des teintes intenses qui tiennent 24 h.", href: "/collections/maquillage", image: "/images/tuile-droite.jpg", position: "20% 50%", tint: "#8c4a46" },
  { id: "soin", label: "Soins", eyebrow: "Rituels", title: "Une peau lumineuse", text: "Sérums, crèmes et huiles pour une peau nourrie, apaisée et repulpée.", href: "/collections/soin", image: "/images/tuile-droite.jpg", position: "85% 60%", tint: "#b79c82" },
  { id: "bougies", label: "Bougies & Maison", eyebrow: "Maison", title: "L'atmosphère de Néoli", text: "Des bougies parfumées pour installer une présence chaleureuse chez soi.", href: "/collections/bougies", image: "/images/tuile-gauche.jpg", position: "90% 70%", tint: "#5e4a36" },
  { id: "cadeaux", label: "Cadeaux", eyebrow: "À offrir", title: "Offrir et personnaliser", text: "Coffrets, gravure et emballage couture : des idées à offrir, joliment signées.", href: "/collections/cadeaux", image: "/images/tuile-droite.jpg", position: "55% 20%", tint: "#2f3b3a" },
];
