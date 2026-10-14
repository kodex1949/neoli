import { NextResponse } from "next/server";
import { getProducts } from "@/lib/shopify";

// Produits correspondant aux favoris du client (liste de handles) : alimente le panneau Favoris de l'en-tête.
export async function GET(req: Request) {
  const handles = (new URL(req.url).searchParams.get("handles") ?? "").split(",").map((h) => h.trim()).filter(Boolean).slice(0, 60);
  if (!handles.length) return NextResponse.json({ products: [] });
  const all = await getProducts(100);
  const byHandle = new Map(all.map((p) => [p.handle, p]));
  const products = handles.map((h) => byHandle.get(h)).filter((p): p is NonNullable<typeof p> => !!p).map((p) => ({ id: p.id, handle: p.handle, title: p.title, price: p.price, image: p.image, variantId: p.variantId }));
  return NextResponse.json({ products });
}
