"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getOrdersByEmail } from "@/lib/shopify-admin";

export type ReviewInput = { handle: string; rating: number; title: string; body: string; name: string };
export type ReviewResult = { ok: true } | { ok: false; error: string };

export async function submitReview(input: ReviewInput): Promise<ReviewResult> {
  const rating = Math.round(Number(input.rating));
  const body = (input.body ?? "").trim();
  const title = (input.title ?? "").trim().slice(0, 100);
  const name = (input.name ?? "").trim().slice(0, 40);
  if (!input.handle) return { ok: false, error: "Produit introuvable." };
  if (!(rating >= 1 && rating <= 5)) return { ok: false, error: "Choisissez une note de 1 à 5 étoiles." };
  if (body.length < 10) return { ok: false, error: "Votre avis doit contenir au moins 10 caractères." };
  if (body.length > 2000) return { ok: false, error: "Votre avis est trop long (2000 caractères maximum)." };
  if (!name) return { ok: false, error: "Indiquez le prénom à afficher." };

  const db = await createClient();
  const { data } = await db.auth.getUser();
  const user = data.user;
  if (!user) return { ok: false, error: "Connectez-vous pour laisser un avis." };

  // « Achat vérifié » : le produit figure dans une commande de ce compte (si l'API Admin est configurée)
  let verified = false;
  if (user.email && user.email_confirmed_at) {
    const { orders } = await getOrdersByEmail(user.email);
    verified = orders.some((o) => o.lines.some((l) => l.handle === input.handle));
  }

  const { error } = await db.from("reviews").insert({ product_handle: input.handle, author_name: name, rating, title: title || null, body, verified });
  if (error) {
    if (error.code === "23505") return { ok: false, error: "Vous avez déjà donné votre avis sur ce produit." };
    return { ok: false, error: "Impossible d'envoyer votre avis pour le moment. Réessayez dans un instant." };
  }
  revalidatePath("/admin/avis");
  return { ok: true };
}
