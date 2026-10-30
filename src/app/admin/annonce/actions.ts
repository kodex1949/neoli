"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { ANNOUNCEMENT_KEY, type Announcement } from "@/lib/announcement";

export async function saveAnnouncement(v: Announcement) {
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  const { data: ok } = await db.rpc("is_agent_admin");
  if (!u.user || ok !== true) throw new Error("Accès réservé aux administrateurs.");
  const href = String(v.href ?? "").trim().slice(0, 300);
  if (href && !(href.startsWith("/") && !href.startsWith("//")) && !/^https:\/\//i.test(href)) throw new Error("Lien invalide : commencez par / ou https://");
  const value: Announcement = {
    enabled: !!v.enabled,
    text: String(v.text ?? "").trim().slice(0, 200),
    linkLabel: String(v.linkLabel ?? "").trim().slice(0, 40),
    href,
    tone: v.tone === "light" ? "light" : "dark",
  };
  if (value.enabled && !value.text) throw new Error("Saisissez le texte du bandeau, ou désactivez-le.");
  const { error } = await db.from("site_settings").upsert({ key: ANNOUNCEMENT_KEY, value, updated_at: new Date().toISOString() });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
  revalidatePath("/admin/annonce");
}
