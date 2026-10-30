import { cache } from "react";
import { createClient as createPublicClient } from "@supabase/supabase-js";

export type Creation = { id: string; position: number; eyebrow: string | null; title: string; text: string | null; cta: string | null; href: string | null; kind: "image" | "video" | null; url: string | null; published: boolean };
export const CREATION_COLS = "id,position,eyebrow,title,text,cta,href,kind,url,published";

/** Créations publiées (client sans cookies, vide en cas d'erreur). */
export const getCreations = cache(async (): Promise<Creation[]> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return [];
  try {
    const db = createPublicClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await db.from("creations").select(CREATION_COLS).eq("published", true).order("position").order("created_at");
    return error || !data ? [] : (data as Creation[]);
  } catch { return []; }
});
