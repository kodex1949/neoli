import type { Finding } from "../types";

export type CollectionHealth = { handle: string; exists: boolean; count: number };
export type MarketingInput = { collections: CollectionHealth[]; bestSellers: { title: string; quantity: number }[]; productsWithoutReviews: string[]; productCount: number };

/** Marketing : constats sur la visibilité des produits. Aucun e-mail, aucune promotion, aucune dépense publicitaire n'est lancé. */
export function analyzeMarketing(i: MarketingInput): Finding[] {
  const out: Finding[] = [];
  const empty = i.collections.filter((c) => !c.exists || c.count === 0);
  if (empty.length) out.push({ key: "marketing.empty-collections", severity: "warning", title: `${empty.length} collection(s) vide(s) mise(s) en avant sur le site`, detail: `${empty.map((c) => `/collections/${c.handle}`).join(", ")} : liées depuis l'accueil ou le menu mais sans produit. Ajoutez des produits ou retirez la mise en avant.`, data: { handles: empty.map((c) => c.handle) } });
  if (i.bestSellers.length) out.push({ key: "marketing.best-sellers", severity: "info", title: `Meilleures ventes à mettre en avant : ${i.bestSellers.slice(0, 3).map((b) => b.title).join(", ")}`, detail: "Ces produits se vendent le mieux sur la période lue : bon candidats pour l'accueil, la newsletter ou une campagne (à valider).", data: { bestSellers: i.bestSellers }, proposedAction: { type: "propose_campaign", params: { products: i.bestSellers.slice(0, 3).map((b) => b.title) } } });
  if (i.productsWithoutReviews.length && i.productCount) out.push({ key: "marketing.no-reviews", severity: "info", title: `${i.productsWithoutReviews.length} produit(s) sur ${i.productCount} sans avis client`, detail: "Les avis rassurent les acheteurs : un e-mail de demande d'avis après livraison serait utile (envoi soumis à validation).", data: { handles: i.productsWithoutReviews } });
  out.push({ key: "marketing.unavailable", severity: "info", title: "Indisponible : audience, campagnes et publicité", detail: "Aucun outil d'e-mailing ni compte publicitaire n'est branché : l'agent propose, il ne diffuse rien.", data: { missing: ["newsletter", "campagnes", "dépenses publicitaires"] } });
  return out;
}
