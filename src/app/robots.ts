import type { MetadataRoute } from "next";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL || "https://neoli-nu.vercel.app").replace(/\/$/, "");

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/compte", "/admin", "/api", "/auth", "/connexion", "/panier"] }],
    sitemap: `${BASE}/sitemap.xml`,
  };
}
