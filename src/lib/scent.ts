import type { Product } from "@/lib/shopify";

export type Scent = { families: string[]; intensity: number; budget: string };

export const FAMILIES: { key: string; label: string; hint: string; words: string[] }[] = [
  { key: "floral", label: "Floral", hint: "Rose, jasmin, pivoine", words: ["flor", "rose", "jasmin", "pivoine", "iris", "tubereuse", "poudr", "fleur", "lys", "violette"] },
  { key: "boise", label: "Boisé", hint: "Cèdre, santal, vétiver", words: ["bois", "cedre", "santal", "vetiver", "patchouli", "fume", "cuir"] },
  { key: "ambre", label: "Ambré", hint: "Ambre, vanille, épices", words: ["ambr", "vanille", "epice", "oriental", "resine", "encens", "musc", "tonka"] },
  { key: "frais", label: "Frais", hint: "Agrumes, notes marines", words: ["frais", "fraich", "agrume", "citron", "bergamote", "marin", "sel", "menthe", "the ", "aquatique"] },
  { key: "gourmand", label: "Gourmand", hint: "Amande, fruits, caramel", words: ["gourmand", "amande", "caramel", "fruit", "berries", "baie", "cerise", "miel", "cacao", "praline"] },
];

export const BUDGETS = [
  { key: "any", label: "Peu importe", max: Infinity },
  { key: "100", label: "Jusqu'à 100 €", max: 100 },
  { key: "200", label: "Jusqu'à 200 €", max: 200 },
  { key: "200+", label: "Plus de 200 €", max: Infinity, min: 200 },
];

export const INTENSITY = ["Très léger", "Léger", "Équilibré", "Intense", "Très intense"];

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const priceOf = (p: Product) => Number((p.price.match(/[\d\s]+(?:,\d+)?/)?.[0] ?? "").replace(/\s/g, "").replace(",", ".")) || 0;

export function isScent(v: unknown): v is Scent {
  return !!v && typeof v === "object" && Array.isArray((v as Scent).families);
}

/** Produits triés selon le profil olfactif, avec les raisons du choix. */
export function recommend(products: Product[], scent: Scent, limit = 4): { product: Product; why: string[] }[] {
  const budget = BUDGETS.find((b) => b.key === scent.budget);
  const scored = products.map((p) => {
    const text = norm([p.title, p.tagline, p.description, p.category].filter(Boolean).join(" ") + " ");
    const why: string[] = [];
    let score = 0;
    for (const f of FAMILIES.filter((f) => scent.families.includes(f.key))) {
      if (f.words.some((w) => text.includes(w))) { score += 3; why.push(f.label.toLowerCase()); }
    }
    if (p.intensity && scent.intensity) {
      const d = Math.abs(p.intensity - scent.intensity);
      score += Math.max(0, 2 - d);
      if (d <= 1) why.push(INTENSITY[p.intensity - 1].toLowerCase());
    }
    const price = priceOf(p);
    if (budget && budget.key !== "any" && price) {
      const ok = price <= budget.max && price >= (budget.min ?? 0);
      score += ok ? 1 : -2;
    }
    if (p.category && p.category !== "Parfums") score -= 2; // le profil porte sur les parfums
    return { product: p, why, score };
  });
  return scored.filter((s) => s.score > 0).sort((a, b) => b.score - a.score).slice(0, limit).map(({ product, why }) => ({ product, why }));
}
