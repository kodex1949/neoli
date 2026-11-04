import { brandSlug, type Brand } from "./brands";

// Client Storefront API (GraphQL). Sans variables d'environnement, on renvoie des produits de démonstration.

/** Élément de la galerie : image, vidéo hébergée par Shopify (sources mp4) ou vidéo externe (YouTube / Vimeo). `url` = image fixe (ou affiche de la vidéo). */
export type MediaItem = {
  type: "image" | "video" | "embed";
  url: string;
  alt: string;
  width: number;
  height: number;
  sources?: { url: string; mimeType: string }[];
  embedUrl?: string;
};

export type Product = {
  id: string;
  handle: string;
  title: string;
  price: string; // déjà formaté, ex. « 48,00 € »
  image?: { url: string; alt: string; width: number; height: number };
  variantId?: string; // première variante, utilisée pour le panier / le paiement
  tagline?: string; // courte description sous le nom
  badges?: string[]; // ex. « Nouveauté », « Exclusivité », « Service d'essai »
  intensity?: number; // 1 à 5, parfums uniquement
  format?: string; // ex. « Spray 50 ml »
  brand?: string; // marque (champ « Fournisseur » de Shopify)
  category?: string; // Parfums, Maquillage, Soins… (productType Shopify) : sert au filtre des collections
  engraving?: boolean; // gravure proposée (étiquette « gravure » dans Shopify)
  notes?: { top?: string; heart?: string; base?: string }; // pyramide olfactive, depuis les étiquettes tete:/coeur:/fond:
  ingredients?: string; // liste INCI, depuis le champ personnalisé Shopify custom.ingredients (fiche produit)
  allergens?: string; // depuis custom.allergens
  description?: string; // texte complet (fiche produit)
  images?: { url: string; alt: string; width: number; height: number }[]; // galerie (fiche produit)
  media?: MediaItem[]; // galerie complète : images + vidéos, dans l'ordre Shopify (fiche produit)
  featuredVideo?: MediaItem; // si le média principal du produit est une vidéo : affichée sur les cartes
  variants?: { label: string; color?: string; id?: string; price?: string; measure?: string }[]; // déclinaisons affichées sur la carte (teintes ou contenances)
};

const domain = process.env.SHOPIFY_STORE_DOMAIN;
const token = process.env.SHOPIFY_STOREFRONT_TOKEN;
const version = process.env.SHOPIFY_API_VERSION ?? "2025-07";

async function storefront<T>(query: string, variables: Record<string, unknown> = {}, noStore = false): Promise<T> {
  const res = await fetch(`https://${domain}/api/${version}/graphql.json`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Shopify-Storefront-Access-Token": token!,
    },
    body: JSON.stringify({ query, variables }),
    ...(noStore ? { cache: "no-store" as const } : { next: { revalidate: 60, tags: ["products"] } }),
  });
  if (!res.ok) throw new Error(`Shopify ${res.status}`);
  const json = await res.json();
  if (json.errors) throw new Error(JSON.stringify(json.errors));
  return json.data as T;
}

// Pendant la construction du site uniquement : si Shopify refuse la requête (clé absente ou erronée sur l'hébergeur), on ne bloque pas toute la mise en ligne.
// En fonctionnement normal l'erreur reste visible. Les pages se régénèrent d'elles-mêmes (revalidate) dès que Shopify répond.
async function safe<T>(fn: () => Promise<T>, fallback: T): Promise<T> {
  try { return await fn(); } catch (e) {
    if (process.env.NEXT_PHASE === "phase-production-build") { console.warn("Shopify indisponible pendant la construction :", e instanceof Error ? e.message : e); return fallback; }
    throw e;
  }
}

const MEDIA_FIELDS = /* GraphQL */ `
  mediaContentType
  alt
  previewImage { url altText width height }
  ... on MediaImage { image { url altText width height } }
  ... on Video { sources { url mimeType width height } }
  ... on ExternalVideo { embedUrl }
`;

const NODE_FIELDS = /* GraphQL */ `
  id
  handle
  title
  description
  tags
  productType
  vendor
  featuredImage { url altText width height }
  gallery: images(first: 3) { nodes { url altText width height } }
  firstMedia: media(first: 1) { nodes { ${MEDIA_FIELDS} } }
  priceRange { minVariantPrice { amount currencyCode } }
  variants(first: 6) { nodes { id title price { amount currencyCode } weight weightUnit } }
`;

const PRODUCTS_QUERY = /* GraphQL */ `
  query Products($first: Int!, $country: CountryCode!, $language: LanguageCode!)
  @inContext(country: $country, language: $language) {
    products(first: $first, sortKey: BEST_SELLING) {
      nodes { ${NODE_FIELDS} }
    }
  }
`;

const COLLECTION_QUERY = /* GraphQL */ `
  query Collection($handle: String!, $first: Int!, $country: CountryCode!, $language: LanguageCode!)
  @inContext(country: $country, language: $language) {
    collection(handle: $handle) {
      title
      description
      products(first: $first) { nodes { ${NODE_FIELDS} } }
    }
  }
`;

const money = (amount: string, currency: string) =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(Number(amount));

type Node = {
  id: string; handle: string; title: string; description: string; tags: string[]; productType: string; vendor?: string;
  featuredImage: { url: string; altText: string | null; width: number; height: number } | null;
  priceRange: { minVariantPrice: { amount: string; currencyCode: string } };
  variants: { nodes: { id: string; title: string; price: { amount: string; currencyCode: string }; weight?: number | null; weightUnit?: string | null }[] };
  images?: { nodes: { url: string; altText: string | null; width: number; height: number }[] };
  gallery?: { nodes: { url: string; altText: string | null; width: number; height: number }[] };
  firstMedia?: { nodes: MediaNode[] };
  media?: { nodes: MediaNode[] };
  ingredientsField?: { value: string } | null;
  allergensField?: { value: string } | null;
};

type Img = { url: string; altText: string | null; width: number; height: number };
type MediaNode = {
  mediaContentType: "IMAGE" | "VIDEO" | "EXTERNAL_VIDEO" | "MODEL_3D";
  alt: string | null;
  previewImage: Img | null;
  image?: Img;
  sources?: { url: string; mimeType: string; width: number; height: number }[];
  embedUrl?: string;
};

function mapMedia(m: MediaNode, title: string): MediaItem | null {
  const alt = m.alt ?? m.previewImage?.altText ?? title;
  if (m.mediaContentType === "IMAGE" && m.image) return { type: "image", url: m.image.url, alt: m.image.altText ?? alt, width: m.image.width, height: m.image.height };
  const poster = m.previewImage;
  if (m.mediaContentType === "VIDEO" && m.sources?.length) {
    const mp4 = m.sources.filter((x) => x.mimeType === "video/mp4").sort((a, b) => b.height - a.height);
    const ok = mp4.filter((x) => x.height <= 1080);
    const best = (ok.length ? ok : mp4).slice(0, 1);
    const rest = m.sources.filter((x) => !best.includes(x) && x.mimeType !== "application/x-mpegURL");
    const sources = [...best, ...rest].map((x) => ({ url: x.url, mimeType: x.mimeType }));
    return { type: "video", url: poster?.url ?? "", alt, width: poster?.width ?? 1080, height: poster?.height ?? 1620, sources };
  }
  if (m.mediaContentType === "EXTERNAL_VIDEO" && m.embedUrl) return { type: "embed", url: poster?.url ?? "", alt, width: poster?.width ?? 1080, height: poster?.height ?? 1620, embedUrl: m.embedUrl };
  return null; // modèles 3D : non gérés
}

/** Poids de la variante (champ « Poids » de Shopify) sous forme « 200 g » / « 1,2 kg » ; vide si absent ou en unité non métrique. */
const weightOf = (v?: { weight?: number | null; weightUnit?: string | null }): string | undefined => {
  if (!v?.weight || v.weight <= 0) return undefined;
  if (v.weightUnit === "GRAMS") return `${String(v.weight).replace(".", ",")} g`;
  if (v.weightUnit === "KILOGRAMS") return `${String(v.weight).replace(".", ",")} kg`;
  return undefined;
};
const sizeText = (title: string) => (/default title/i.test(title) ? undefined : title);

/** Courte phrase pour sous le nom : coupée à un mot entier, sans virgule ni point final orphelin. */
function shortLine(s: string, max = 90) {
  const one = s.trim();
  if (one.length <= max) return one;
  const cut = one.slice(0, max).replace(/\s+\S*$/, "").replace(/[\s,;:–-]+$/, "");
  return `${cut}…`;
}

const mapNode = (p: Node): Product => ({
  id: p.id,
  handle: p.handle,
  title: p.title,
  price: money(p.priceRange.minVariantPrice.amount, p.priceRange.minVariantPrice.currencyCode),
  image: p.featuredImage
    ? { url: p.featuredImage.url, alt: p.featuredImage.altText ?? p.title, width: p.featuredImage.width, height: p.featuredImage.height }
    : undefined,
  variantId: p.variants.nodes[0]?.id,
  category: p.productType || undefined,
  brand: p.vendor?.trim() || undefined,
  engraving: p.tags.includes("gravure") || undefined,
  // Dans Shopify : description = texte court ; étiquettes « Nouveauté », « Exclusivité », « Service d'essai », « intensite-3 », « format:Spray 50 ml »
  tagline: p.description ? shortLine(p.description.split("\n")[0]) : undefined,
  badges: p.tags.filter((t) => ["Nouveauté", "Exclusivité", "Service d'essai"].includes(t)),
  intensity: Number(p.tags.find((t) => /^intensite-[1-5]$/.test(t))?.slice(-1)) || undefined,
  notes: (() => { const t = (k: string) => p.tags.find((x) => x.toLowerCase().startsWith(k + ":"))?.slice(k.length + 1).trim() || undefined; const n = { top: t("tete"), heart: t("coeur"), base: t("fond") }; return n.top || n.heart || n.base ? n : undefined; })(),
  ingredients: p.ingredientsField?.value?.trim() || undefined,
  allergens: p.allergensField?.value?.trim() || undefined,
  description: p.description || undefined,
  images: (p.images ?? p.gallery)?.nodes.map((i) => ({ url: i.url, alt: i.altText ?? p.title, width: i.width, height: i.height })),
  media: p.media?.nodes.map((m) => mapMedia(m, p.title)).filter((m): m is MediaItem => !!m),
  featuredVideo: (() => { const fm = p.firstMedia?.nodes[0]; const f = fm ? mapMedia(fm, p.title) : null; return f?.type === "video" ? f : undefined; })(),
  variants: p.variants.nodes.length > 1 ? p.variants.nodes.map((v) => ({ label: v.title, id: v.id, price: money(v.price.amount, v.price.currencyCode), measure: weightOf(v) })) : undefined,
  format: p.tags.find((t) => t.startsWith("format:"))?.slice(7) ?? (p.variants.nodes.length === 1 ? sizeText(p.variants.nodes[0].title) ?? weightOf(p.variants.nodes[0]) : undefined),
});

export async function getProducts(first = 8): Promise<Product[]> {
  if (!domain || !token) return DEMO.slice(0, first);
  return safe(async () => {
    const data = await storefront<{ products: { nodes: Node[] } }>(PRODUCTS_QUERY, { first, country: "FR", language: "FR" });
    return data.products.nodes.map(mapNode);
  }, []);
}

const PRODUCT_QUERY = /* GraphQL */ `
  query Product($handle: String!, $country: CountryCode!, $language: LanguageCode!)
  @inContext(country: $country, language: $language) {
    product(handle: $handle) {
      ${NODE_FIELDS}
      ingredientsField: metafield(namespace: "custom", key: "ingredients") { value }
      allergensField: metafield(namespace: "custom", key: "allergens") { value }
      images(first: 6) { nodes { url altText width height } }
      media(first: 12) { nodes { ${MEDIA_FIELDS} } }
    }
  }
`;

export async function getProduct(handle: string): Promise<Product | null> {
  if (!domain || !token) return DEMO.find((p) => p.handle === handle) ?? null;
  return safe(async () => {
    const data = await storefront<{ product: Node | null }>(PRODUCT_QUERY, { handle, country: "FR", language: "FR" });
    return data.product ? mapNode(data.product) : null;
  }, null);
}

// ---------- Marques ----------
const BRANDS_QUERY = /* GraphQL */ `
  query Brands($country: CountryCode!, $language: LanguageCode!)
  @inContext(country: $country, language: $language) {
    products(first: 250, sortKey: BEST_SELLING) {
      nodes { vendor featuredImage { url altText width height } }
    }
  }
`;

const BRAND_PRODUCTS_QUERY = /* GraphQL */ `
  query BrandProducts($q: String!, $first: Int!, $country: CountryCode!, $language: LanguageCode!)
  @inContext(country: $country, language: $language) {
    products(first: $first, query: $q, sortKey: BEST_SELLING) {
      nodes { ${NODE_FIELDS} }
    }
  }
`;

/** Marques de la boutique, regroupées depuis le champ « Fournisseur » des produits. Sans Shopify : liste vide. */
export async function getBrands(): Promise<Brand[]> {
  if (!domain || !token) return [];
  const data = await storefront<{ products: { nodes: { vendor: string; featuredImage: Img | null }[] } }>(BRANDS_QUERY, { country: "FR", language: "FR" });
  const map = new Map<string, Brand>();
  for (const p of data.products.nodes) {
    const name = p.vendor?.trim();
    if (!name) continue;
    const slug = brandSlug(name);
    if (!slug) continue;
    const b = map.get(slug) ?? { name, slug, count: 0 };
    b.count += 1;
    if (p.featuredImage) {
      const img = { url: p.featuredImage.url, alt: p.featuredImage.altText ?? name, width: p.featuredImage.width, height: p.featuredImage.height };
      if (!b.image) b.image = img;
      else if (!b.image2 && img.url !== b.image.url) b.image2 = img;
    }
    map.set(slug, b);
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "fr"));
}

/** Produits d'une marque (nom exact tel qu'écrit dans Shopify). */
export async function getBrandProducts(name: string): Promise<Product[]> {
  if (!domain || !token) return [];
  const q = `vendor:'${name.replace(/'/g, "\\'")}'`;
  return safe(async () => {
    const data = await storefront<{ products: { nodes: Node[] } }>(BRAND_PRODUCTS_QUERY, { q, first: 48, country: "FR", language: "FR" });
    return data.products.nodes.map(mapNode).filter((p) => !p.brand || brandSlug(p.brand) === brandSlug(name));
  }, []);
}

export type Collection = { title: string; description?: string; products: Product[] };

// Sans Shopify : sélection de démonstration selon le nom de la collection. Avec Shopify : collection du même handle (null si absente).
const DEMO_FILTERS: Record<string, (p: Product) => boolean> = {
  nouveautes: (p) => !!p.badges?.includes("Nouveauté"),
  exclusifs: (p) => !!p.badges?.includes("Exclusivité"),
  parfums: (p) => p.category === "Parfums",
  "haute-parfumerie": (p) => p.category === "Parfums",
  mixtes: (p) => p.category === "Parfums",
  maquillage: (p) => p.category === "Maquillage",
  soin: (p) => p.category === "Soins",
  corps: (p) => p.category === "Soins",
};

export async function getCollection(handle: string, fallbackTitle?: string): Promise<Collection | null> {
  if (!domain || !token) {
    const filter = DEMO_FILTERS[handle];
    const list = filter ? DEMO.filter(filter) : DEMO;
    return { title: fallbackTitle ?? handle, products: list.length ? list : DEMO };
  }
  return safe(async () => {
    const data = await storefront<{ collection: { title: string; description: string; products: { nodes: Node[] } } | null }>(
      COLLECTION_QUERY,
      { handle, first: 48, country: "FR", language: "FR" },
    );
    if (!data.collection) return null;
    return { title: data.collection.title, description: data.collection.description || undefined, products: data.collection.products.nodes.map(mapNode) } as Collection;
  }, null);
}

// Crée un panier Shopify et renvoie l'adresse de paiement (null si Shopify n'est pas configuré)
export async function createCheckout(lines: { variantId: string; quantity: number; note?: string }[]): Promise<string | null> {
  if (!domain || !token) return null;
  type R = { cartCreate: { cart: { checkoutUrl: string } | null; userErrors: { message: string }[] } };
  const data = await storefront<R>(
    /* GraphQL */ `
      mutation CartCreate($lines: [CartLineInput!]!) {
        cartCreate(input: { lines: $lines }) {
          cart { checkoutUrl }
          userErrors { message }
        }
      }
    `,
    { lines: lines.map((l) => ({ merchandiseId: l.variantId, quantity: l.quantity, ...(l.note ? { attributes: [{ key: "Gravure", value: l.note }] } : {}) })) },
    true,
  );
  return data.cartCreate.cart?.checkoutUrl ?? null;
}

const DEMO: Product[] = [
  { id: "1", handle: "rouge-scene", category: "Maquillage", title: "Rouge à lèvres mat", price: "48,00 €", tagline: "Couleur intense, fini velours et confort longue durée", badges: ["Nouveauté"], variants: [{ label: "Rose nu", color: "#c98f86" }, { label: "Rouge", color: "#a5232c" }, { label: "Prune", color: "#6d2b3d" }] },
  { id: "2", handle: "encre-scene", category: "Maquillage", title: "Encre à lèvres liquide", price: "48,00 €", tagline: "Texture légère comme une seconde peau, tenue 24 h", variants: [{ label: "Corail", color: "#d9705d" }, { label: "Framboise", color: "#b03a62" }, { label: "Cassis", color: "#5b2340" }] },
  { id: "3", handle: "eau-de-parfum", category: "Parfums", engraving: true, title: "Rose Poudrée", price: "135,00 €", tagline: "Eau de parfum mixte, notes florales et poudrées", badges: ["Service d'essai"], intensity: 3, variants: [{ label: "30 ml", price: "95,00 €" }, { label: "50 ml", price: "135,00 €" }, { label: "100 ml", price: "190,00 €" }] },
  { id: "4", handle: "soin-serum", category: "Soins", title: "Sérum Éclat", price: "112,00 €", tagline: "Hydratation intense pour une peau repulpée et lumineuse", badges: ["Nouveauté"], variants: [{ label: "30 ml" }, { label: "50 ml" }] },
  { id: "5", handle: "jasmin-d-or", category: "Parfums", engraving: true, title: "Jasmin d'Or", price: "165,00 €", tagline: "Eau de parfum mixte, notes de jasmin et d'ambre", badges: ["Exclusivité", "Service d'essai"], intensity: 4, variants: [{ label: "50 ml", price: "165,00 €" }, { label: "125 ml", price: "260,00 €" }] },
  { id: "6", handle: "ambre-nuit", category: "Parfums", engraving: true, title: "Ambre Nuit", price: "210,00 €", tagline: "Extrait de parfum, notes ambrées et boisées", badges: ["Exclusivité"], intensity: 5, variants: [{ label: "50 ml", price: "210,00 €" }, { label: "125 ml", price: "320,00 €" }] },
  { id: "7", handle: "bois-sacre", category: "Parfums", engraving: true, title: "Bois Sacré", price: "165,00 €", tagline: "Eau de parfum mixte, notes boisées et épicées", badges: ["Service d'essai"], intensity: 4, variants: [{ label: "50 ml", price: "165,00 €" }, { label: "125 ml", price: "255,00 €" }] },
  { id: "8", handle: "fleur-de-sel", category: "Parfums", engraving: true, title: "Fleur de Sel", price: "120,00 €", tagline: "Eau de toilette, notes marines et musquées", badges: ["Nouveauté"], intensity: 2, variants: [{ label: "50 ml", price: "95,00 €" }, { label: "100 ml", price: "120,00 €" }] },
];
