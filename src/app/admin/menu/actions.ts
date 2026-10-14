"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { menuSlots } from "@/lib/menu-media";

async function admin() {
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  const { data: ok } = await db.rpc("is_agent_admin");
  if (!u.user || ok !== true) throw new Error("Accès réservé aux administrateurs.");
  return db;
}

const known = (slot: string) => menuSlots().some((s) => s.slot === slot);

/** Enregistre le visuel d'un emplacement du menu (le fichier est déjà dans le bucket « menu-media »). */
export async function saveMenuMedia(slot: string, kind: "image" | "video", url: string) {
  if (!known(slot) || (kind !== "image" && kind !== "video")) throw new Error("Emplacement inconnu.");
  const db = await admin();
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  if (!url.startsWith(`${base}/storage/v1/object/public/menu-media/`)) throw new Error("Fichier invalide.");
  const { error } = await db.from("menu_media").upsert({ slot, kind, url, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  revalidatePath("/admin/menu");
}

/** Retire le visuel Supabase d'un emplacement : le menu retrouve son visuel d'origine (les textes personnalisés sont conservés). */
export async function resetMenuMedia(slot: string) {
  if (!known(slot)) throw new Error("Emplacement inconnu.");
  const db = await admin();
  const { data } = await db.from("menu_media").select("url,title,eyebrow,cta,href,text,label").eq("slot", slot).maybeSingle();
  if (data && (data.title || data.eyebrow || data.cta || data.href || data.text || data.label)) await db.from("menu_media").update({ kind: null, url: null, updated_at: new Date().toISOString() }).eq("slot", slot);
  else await db.from("menu_media").delete().eq("slot", slot);
  const path = data?.url?.split("/storage/v1/object/public/menu-media/")[1];
  if (path) await db.storage.from("menu-media").remove([decodeURIComponent(path)]);
  revalidatePath("/", "layout");
  revalidatePath("/admin/menu");
}

const clean = (s: string | undefined, max: number) => {
  const v = (s ?? "").trim().slice(0, max);
  return v === "" ? null : v;
};

/** Enregistre titre, sous-titre, bouton (CTA) et lien d'un emplacement. Un champ vide retrouve le texte d'origine. */
export async function saveMenuText(slot: string, fields: { title?: string; eyebrow?: string; cta?: string; href?: string; text?: string; label?: string }) {
  if (!known(slot)) throw new Error("Emplacement inconnu.");
  const href = clean(fields.href, 300);
  if (href && !/^(\/|https:\/\/)/.test(href)) throw new Error("Le lien doit commencer par « / » (page du site) ou « https:// ».");
  const db = await admin();
  const { data } = await db.from("menu_media").select("url").eq("slot", slot).maybeSingle();
  const row = { title: clean(fields.title, 120), eyebrow: clean(fields.eyebrow, 120), cta: clean(fields.cta, 60), href, text: clean(fields.text, 400), label: clean(fields.label, 40) };
  const empty = !row.title && !row.eyebrow && !row.cta && !row.href && !row.text && !row.label;
  if (empty && !data?.url) await db.from("menu_media").delete().eq("slot", slot);
  else {
    const { error } = await db.from("menu_media").upsert({ slot, ...row, updated_at: new Date().toISOString() });
    if (error) throw new Error(error.message);
  }
  revalidatePath("/", "layout");
  revalidatePath("/admin/menu");
}
