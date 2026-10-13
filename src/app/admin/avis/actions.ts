"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function admin() {
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  const { data: ok } = await db.rpc("is_agent_admin");
  if (!u.user || ok !== true) throw new Error("Accès réservé aux administrateurs.");
  return db;
}

export async function decideReview(id: string, handle: string, decision: "approved" | "rejected") {
  const db = await admin();
  await db.from("reviews").update({ status: decision, decided_at: new Date().toISOString() }).eq("id", id);
  revalidatePath("/admin/avis");
  revalidatePath(`/produits/${handle}`);
}

export async function deleteReview(id: string, handle: string) {
  const db = await admin();
  await db.from("reviews").delete().eq("id", id);
  revalidatePath("/admin/avis");
  revalidatePath(`/produits/${handle}`);
}
