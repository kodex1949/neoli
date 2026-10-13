import { NextResponse } from "next/server";
import { getProducts } from "@/lib/shopify";

export async function GET(req: Request) {
  const q = (new URL(req.url).searchParams.get("q") ?? "").trim().toLowerCase();
  try {
    const all = await getProducts(50);
    const products = q ? all.filter((p) => p.title.toLowerCase().includes(q)) : all;
    return NextResponse.json({ products: products.slice(0, 8) });
  } catch (e) {
    return NextResponse.json({ error: String((e as Error).stack ?? e).slice(0, 1500) }, { status: 500 });
  }
}
