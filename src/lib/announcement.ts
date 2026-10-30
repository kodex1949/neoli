import { cache } from "react";
import { createClient as createPublicClient } from "@supabase/supabase-js";

export type Announcement = { enabled: boolean; text: string; linkLabel: string; href: string; tone: "dark" | "light" };
export const ANNOUNCEMENT_KEY = "announcement";
/** Valeurs d'origine : le bandeau reste identique tant que rien n'est enregistré dans l'admin. */
export const DEFAULT_ANNOUNCEMENT: Announcement = { enabled: true, text: "ÉDITION LIMITÉE : pour les fêtes, découvrez la nouvelle collection.", linkLabel: "Découvrir.", href: "/collections/fetes", tone: "dark" };

export const normalizeAnnouncement = (v: unknown): Announcement => {
  const o = (v && typeof v === "object" ? v : {}) as Record<string, unknown>;
  const str = (x: unknown, d: string) => (typeof x === "string" ? x : d);
  return {
    enabled: typeof o.enabled === "boolean" ? o.enabled : true,
    text: str(o.text, DEFAULT_ANNOUNCEMENT.text),
    linkLabel: str(o.linkLabel, DEFAULT_ANNOUNCEMENT.linkLabel),
    href: str(o.href, DEFAULT_ANNOUNCEMENT.href),
    tone: o.tone === "light" ? "light" : "dark",
  };
};

/** Bandeau d'annonce enregistré (client sans cookies ; valeurs d'origine en cas d'erreur). */
export const getAnnouncement = cache(async (): Promise<Announcement> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return DEFAULT_ANNOUNCEMENT;
  try {
    const db = createPublicClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await db.from("site_settings").select("value").eq("key", ANNOUNCEMENT_KEY).maybeSingle();
    return error || !data ? DEFAULT_ANNOUNCEMENT : normalizeAnnouncement(data.value);
  } catch { return DEFAULT_ANNOUNCEMENT; }
});
