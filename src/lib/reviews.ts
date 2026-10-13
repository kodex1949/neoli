import { createClient as createPublicClient } from "@supabase/supabase-js";

export type Review = { id: string; author_name: string; rating: number; title: string | null; body: string; verified: boolean; created_at: string };
export type ReviewData = { items: Review[]; count: number; average: number; dist: number[] };

const EMPTY: ReviewData = { items: [], count: 0, average: 0, dist: [0, 0, 0, 0, 0] };

/** Avis approuvés d'un produit. Client sans cookies : la fiche produit reste mise en cache. */
export async function getReviews(handle: string): Promise<ReviewData> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return EMPTY;
  try {
    const db = createPublicClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await db
      .from("reviews")
      .select("id,author_name,rating,title,body,verified,created_at")
      .eq("product_handle", handle)
      .eq("status", "approved")
      .order("created_at", { ascending: false })
      .limit(100);
    if (error || !data) return EMPTY;
    const dist = [0, 0, 0, 0, 0];
    for (const r of data) dist[r.rating - 1]++;
    const sum = data.reduce((n, r) => n + r.rating, 0);
    return { items: data as Review[], count: data.length, average: data.length ? sum / data.length : 0, dist };
  } catch {
    return EMPTY;
  }
}
