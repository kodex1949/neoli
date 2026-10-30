"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function guard() {
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  if (!u.user) throw new Error("Connexion requise.");
  const { data: ok } = await db.rpc("is_agent_admin");
  if (ok !== true) throw new Error("Accès réservé.");
  return db;
}

const uuid = /^[0-9a-f-]{36}$/i;

/** Change le statut d'un inscrit (désinscrire / réinscrire). */
export async function setSubscriberStatus(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const to = formData.get("to") === "subscribed" ? "subscribed" : "unsubscribed";
  if (!uuid.test(id)) throw new Error("Identifiant invalide.");
  const db = await guard();
  const { error } = await db.from("newsletter_subscribers").update({ status: to, unsubscribed_at: to === "unsubscribed" ? new Date().toISOString() : null }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/newsletter");
}

/** Supprime définitivement un inscrit (droit à l'effacement). */
export async function deleteSubscriber(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  if (!uuid.test(id)) throw new Error("Identifiant invalide.");
  const db = await guard();
  const { error } = await db.from("newsletter_subscribers").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/newsletter");
}
