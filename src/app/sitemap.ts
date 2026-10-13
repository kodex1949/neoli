import type { MetadataRoute } from "next";
import { getProducts } from "@/lib/shopify";
import { MENU } from "@/lib/menu";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://neoli-nu.vercel.app").replace(/\/$/, "");
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const hrefs = new Set<string>();
  for (const item of MENU.items) {
    if (item.href?.startsWith("/collections/")) hrefs.add(item.href);
    for (const g of item.submenu?.groups ?? []) for (const l of g) if (l.href.startsWith("/collections/")) hrefs.add(l.href);
  }
  let products: { handle: string }[] = [];
  try { products = await getProducts(100); } catch { /* catalogue indisponible : on garde les pages statiques */ }
  const now = new Date();
  return [
    { url: BASE, lastModified: now, priority: 1 },
    ...[...hrefs].map((h) => ({ url: BASE + h, lastModified: now, priority: 0.7 })),
    ...products.map((p) => ({ url: `${BASE}/produits/${p.handle}`, lastModified: now, priority: 0.8 })),
  ];
}
