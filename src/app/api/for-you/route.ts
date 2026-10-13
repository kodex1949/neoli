import { NextResponse } from "next/server";
import { isScent, recommend } from "@/lib/scent";
import { getProducts } from "@/lib/shopify";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

// Sélection personnalisée pour le membre connecté (selon son profil olfactif). Vide pour les visiteurs.
export async function GET() {
  try {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    const scent = data.user?.user_metadata?.scent;
    if (!data.user || !isScent(scent)) return NextResponse.json({ picks: [] });
    const picks = recommend(await getProducts(40), scent, 4);
    return NextResponse.json({ picks });
  } catch {
    return NextResponse.json({ picks: [] });
  }
}
