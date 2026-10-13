import { NextResponse } from "next/server";
import { createCheckout } from "@/lib/shopify";

// Transforme le panier en panier Shopify et renvoie l'adresse de paiement (checkoutUrl).
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { lines?: { variantId?: string; quantity?: number; note?: string }[] } | null;
  const lines = (body?.lines ?? []).filter((l) => l.variantId && (l.quantity ?? 0) > 0) as { variantId: string; quantity: number; note?: string }[];

  if (lines.length === 0) {
    return NextResponse.json({ error: "Ces articles ne sont pas encore reliés à votre boutique Shopify." }, { status: 400 });
  }
  try {
    const url = await createCheckout(lines);
    if (!url) {
      return NextResponse.json({ error: "Le paiement sera disponible une fois la boutique Shopify connectée (clés dans .env.local)." }, { status: 503 });
    }
    return NextResponse.json({ url });
  } catch {
    return NextResponse.json({ error: "Impossible de créer le paiement. Réessayez dans un instant." }, { status: 502 });
  }
}
