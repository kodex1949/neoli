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
const uuid = /^[0-9a-f-]{36}$/i;
const done = () => { revalidatePath("/", "layout"); revalidatePath("/admin/creations"); };
const clean = (v: unknown, n: number) => String(v ?? "").trim().slice(0, n) || null;
const safeHref = (v: string | null) => (v && (v.startsWith("/") || /^https:\/\//i.test(v)) && !v.startsWith("//") ? v : null);
const MEDIA = "/storage/v1/object/public/menu-media/";

export type CreationInput = { eyebrow?: string; title?: string; text?: string; cta?: string; href?: string; published?: boolean };

export async function createCreation() {
  const db = await admin();
  const { data: last } = await db.from("creations").select("position").order("position", { ascending: false }).limit(1).maybeSingle();
  const { error } = await db.from("creations").insert({ title: "Nouvelle création", eyebrow: "Création", cta: "Découvrir", published: false, position: (last?.position ?? -1) + 1 });
  if (error) throw new Error(error.message);
  done();
}

export async function saveCreation(id: string, v: CreationInput) {
  if (!uuid.test(id)) throw new Error("Identifiant invalide.");
  const title = clean(v.title, 120);
  if (!title) throw new Error("Le titre est obligatoire.");
  const href = clean(v.href, 300);
  if (href && !safeHref(href)) throw new Error("Lien invalide : commencez par / ou https://");
  const db = await admin();
  const { error } = await db.from("creations").update({ title, eyebrow: clean(v.eyebrow, 120), text: clean(v.text, 600), cta: clean(v.cta, 60), href, published: !!v.published, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  done();
}

export async function saveCreationMedia(id: string, kind: "image" | "video", url: string) {
  if (!uuid.test(id) || (kind !== "image" && kind !== "video")) throw new Error("Données invalides.");
  if (!url.startsWith(`${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""}${MEDIA}`)) throw new Error("Fichier invalide.");
  const db = await admin();
  const { error } = await db.from("creations").update({ kind, url, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  done();
}

export async function removeCreationMedia(id: string) {
  if (!uuid.test(id)) throw new Error("Identifiant invalide.");
  const db = await admin();
  const { data } = await db.from("creations").select("url").eq("id", id).maybeSingle();
  const { error } = await db.from("creations").update({ kind: null, url: null, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  const path = data?.url?.split(MEDIA)[1];
  if (path) await db.storage.from("menu-media").remove([decodeURIComponent(path)]);
  done();
}

/** Échange la position avec la création voisine. */
export async function moveCreation(id: string, dir: "up" | "down") {
  if (!uuid.test(id)) throw new Error("Identifiant invalide.");
  const db = await admin();
  const { data } = await db.from("creations").select("id").order("position").order("created_at");
  const ids = (data ?? []).map((r) => r.id as string);
  const i = ids.indexOf(id), j = dir === "up" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await Promise.all(ids.map((x, p) => db.from("creations").update({ position: p }).eq("id", x)));
  done();
}

export async function deleteCreation(id: string) {
  if (!uuid.test(id)) throw new Error("Identifiant invalide.");
  const db = await admin();
  const { data } = await db.from("creations").select("url").eq("id", id).maybeSingle();
  const { error } = await db.from("creations").delete().eq("id", id);
  if (error) throw new Error(error.message);
  const path = data?.url?.split(MEDIA)[1];
  if (path) await db.storage.from("menu-media").remove([decodeURIComponent(path)]);
  done();
}
