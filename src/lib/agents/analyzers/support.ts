import type { Finding } from "../types";

export type ReviewLite = { id: string; rating: number; status: string; created_at: string; product_handle: string };
const D = 86_400_000;

/** Service client : avis en attente de modération et avis négatifs. Aucune réponse n'est envoyée (validation humaine). */
export function analyzeSupport(reviews: ReviewLite[]): Finding[] {
  const out: Finding[] = [];
  const now = Date.now();
  const pending = reviews.filter((r) => r.status === "pending");
  const stale = pending.filter((r) => now - Date.parse(r.created_at) > 2 * D);
  if (pending.length) out.push({ key: "support.pending", severity: stale.length ? "warning" : "info", title: `${pending.length} avis en attente de modération`, detail: stale.length ? `${stale.length} attendent depuis plus de 48 h. Rendez-vous dans Admin → Avis clients.` : "Rendez-vous dans Admin → Avis clients pour les publier ou les refuser.", data: { ids: pending.map((r) => r.id) } });
  const negative = reviews.filter((r) => r.rating <= 2 && r.status !== "rejected" && now - Date.parse(r.created_at) < 14 * D);
  if (negative.length) out.push({ key: "support.negative", severity: "warning", title: `${negative.length} avis négatif(s) (1-2 étoiles) sur 14 jours`, detail: "Un client mécontent mérite une réponse rapide ; le brouillon de réponse reste à valider avant envoi.", data: { products: [...new Set(negative.map((r) => r.product_handle))] }, proposedAction: { type: "draft_support_reply", params: { reviewIds: negative.map((r) => r.id) } } });
  if (!out.length) out.push({ key: "support.ok", severity: "info", title: reviews.length ? "Aucun avis à traiter" : "Aucun avis reçu", detail: reviews.length ? "Tous les avis sont modérés et aucun avis négatif récent." : "Dès qu'un client laisse un avis, il apparaît ici." });
  out.push({ key: "support.unavailable", severity: "info", title: "Indisponible : messages clients", detail: "Aucune boîte de messages ou formulaire de contact n'est branché à la base : seuls les avis sont suivis.", data: { missing: ["e-mails de contact", "tickets"] } });
  return out;
}
