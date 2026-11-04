// Données du menu. Plus tard, vous pouvez les alimenter depuis Shopify (Storefront API : menu(handle: "main-menu")).

export type MenuLink = { label: string; href: string };

export type Submenu = {
  title: string;
  iconics?: { label: string; href: string; image?: string; contain?: boolean }[]; // contain = flacon entier, sans fond ni découpe // petites vignettes « Les iconiques »
  iconicsLabel?: string; // titre de la rangée de vignettes (par défaut « Nouveautés & coups de cœur »)
  groups: MenuLink[][]; // listes séparées par un trait
  cards: { eyebrow: string; title: string; href: string; image?: string }[]; // 1 à 2 grandes cartes à droite
};

export type MenuItem = { id: string; label: string; href: string; submenu?: Submenu };

const cards = (a: string, b: string) => [
  { eyebrow: "La Collection Privée", title: a, href: "/collections/parfums", image: "/images/tuile-gauche.jpg" },
  { eyebrow: "Édition limitée", title: b, href: "/collections/coffrets", image: "/images/tuile-droite.jpg" },
];

export const MENU: { items: MenuItem[]; account: { title: string; text: string }; footerLinks: MenuLink[] } = {
  items: [
    { id: "nouveautes", label: "Les Nouveautés", href: "/collections/nouveautes" },
    {
      id: "parfums",
      label: "Les Parfums",
      href: "/collections/parfums",
      submenu: {
        title: "Les Parfums",
        iconics: [
          { label: "Ambre Nuit", href: "/produits/ambre-nuit" },
          { label: "Jasmin d'Or", href: "/produits/jasmin-d-or" },
          { label: "Bois Sacré", href: "/produits/bois-sacre" },
          { label: "Fleur de Sel", href: "/produits/fleur-de-sel" },
        ],
        groups: [
          [
            { label: "Les Nouveautés", href: "/collections/nouveautes" },
            { label: "Les Best-sellers", href: "/collections/best-sellers" },
            { label: "Les Exclusifs", href: "/collections/exclusifs" },
            { label: "Les Coffrets Cadeaux", href: "/collections/coffrets" },
            { label: "Offrir et Personnaliser", href: "/collections/offrir-et-personnaliser" },
          ],
          [
            { label: "La Haute Parfumerie", href: "/collections/haute-parfumerie" },
            { label: "Parfums pour Femme", href: "/collections/parfums-pour-femme" },
            { label: "Parfums pour Homme", href: "/collections/parfums-pour-homme" },
            { label: "Parfums Mixtes", href: "/collections/parfums-mixtes" },
            { label: "Les Miniatures", href: "/collections/miniatures" },
          ],
        ],
        cards: cards("Le nouvel esprit de parfum", "La nouvelle icône couture"),
      },
    },
    {
      id: "bougies",
      label: "Bougies & Maison",
      href: "/collections/bougies-parfumes",
      submenu: {
        title: "Bougies & Maison",
        groups: [
          [
            { label: "Les Bougies parfumées", href: "/collections/bougies-parfumes" },
            { label: "Les Diffuseurs", href: "/collections/diffuseurs" },
            { label: "Les Brumes d'intérieur", href: "/collections/brumes-dinterieur" },
            { label: "Les Encens", href: "/collections/encens" },
          ],
        ],
        cards: cards("L'art de parfumer la maison", "Les bougies de saison"),
      },
    },
    {
      id: "soin",
      label: "Le Soin & le Corps",
      href: "/collections/soins",
      submenu: {
        title: "Le Soin & le Corps",
        groups: [
          [
            { label: "Les Soins du corps", href: "/collections/soins-du-corps" },
            { label: "Les Huiles & Laits", href: "/collections/huiles-et-laits" },
            { label: "Les Savons & Bains", href: "/collections/savons-et-bains" },
            { label: "Les Soins des mains", href: "/collections/soins-des-mains" },
          ],
        ],
        cards: cards("Le rituel du soir", "Les essentiels du voyage"),
      },
    },
    {
      id: "cadeaux",
      label: "Les Cadeaux",
      href: "/collections/idees-cadeaux",
      submenu: {
        title: "Les Cadeaux",
        groups: [
          [
            { label: "Les Coffrets", href: "/collections/coffrets" },
            { label: "Les Cartes cadeaux", href: "/cartes-cadeaux" },
            { label: "Personnalisation", href: "/collections/offrir-et-personnaliser" },
            { label: "Idées cadeaux par budget", href: "/collections/idees-cadeaux" },
          ],
        ],
        cards: cards("Offrir un parfum", "Les coffrets de fêtes"),
      },
    },
    { id: "engagements", label: "Nos Engagements", href: "/engagements" },
  ],
  account: {
    title: "Cercle ESSNC",
    text: "Entrez dans le cercle privilégié des membres : découvrez sans attendre avantages et invitations exclusives.",
  },
  footerLinks: [
    { label: "Contact", href: "/contact" },
    { label: "Trouver une boutique", href: "/boutiques" },
  ],
};

/** Liens frères d'une collection (mêmes entrées que le menu) : affichés en pastilles au-dessus de la grille. */
export function siblingLinks(handle: string): MenuLink[] {
  const path = `/collections/${handle}`;
  const top = MENU.items.find((i) => i.href === path && i.submenu);
  if (top?.submenu) return top.submenu.groups.flat();
  for (const item of MENU.items) {
    const group = item.submenu?.groups.find((g) => g.some((l) => l.href === path));
    if (group) return group;
  }
  return [];
}
