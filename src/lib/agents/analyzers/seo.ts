import type { Finding } from "../types";

export type PageProbe = { path: string; status: number; html?: string };

const meta = (html: string, name: string) => html.match(new RegExp(`<meta[^>]+(?:name|property)=["']${name}["'][^>]*content=["']([^"']*)["']`, "i"))?.[1]
  ?? html.match(new RegExp(`<meta[^>]+content=["']([^"']*)["'][^>]*(?:name|property)=["']${name}["']`, "i"))?.[1];

/** Éléments SEO d'une page HTML réellement servie par le site. */
export function inspectHtml(html: string) {
  return {
    title: html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() ?? "",
    description: meta(html, "description") ?? "",
    canonical: html.match(/<link[^>]+rel=["']canonical["'][^>]*href=["']([^"']+)["']/i)?.[1] ?? "",
    ogTitle: meta(html, "og:title") ?? "",
    h1: (html.match(/<h1[\s>]/gi) ?? []).length,
    jsonLd: /<script[^>]+type=["']application\/ld\+json["']/i.test(html),
  };
}

export function analyzeSeo(pages: PageProbe[], robots: PageProbe, sitemap: PageProbe): Finding[] {
  const out: Finding[] = [];
  if (robots.status !== 200) out.push({ key: "seo.robots.missing", severity: "warning", title: "robots.txt absent", detail: `GET /robots.txt renvoie ${robots.status}. Les moteurs n'y trouvent aucune consigne ni lien vers le sitemap.`, proposedAction: { type: "code_change", params: { file: "src/app/robots.ts" } } });
  if (sitemap.status !== 200) out.push({ key: "seo.sitemap.missing", severity: "warning", title: "sitemap.xml absent", detail: `GET /sitemap.xml renvoie ${sitemap.status}. Les produits et collections ne sont pas listés pour les moteurs.`, proposedAction: { type: "code_change", params: { file: "src/app/sitemap.ts" } } });

  for (const p of pages) {
    if (p.status !== 200 || !p.html) { out.push({ key: `seo.page.unreachable:${p.path}`, severity: "critical", title: `Page injoignable : ${p.path}`, detail: `Statut ${p.status}.` }); continue; }
    const s = inspectHtml(p.html);
    const flags: string[] = [];
    if (!s.title) flags.push("titre manquant"); else if (s.title.length > 65) flags.push(`titre long (${s.title.length} car.)`);
    if (!s.description) flags.push("meta description manquante"); else if (s.description.length > 160) flags.push(`meta description longue (${s.description.length} car.)`);
    if (!s.canonical) flags.push("URL canonique manquante");
    if (!s.ogTitle) flags.push("balises Open Graph manquantes");
    if (s.h1 !== 1) flags.push(`${s.h1} balise(s) h1 (1 attendue)`);
    if (p.path.startsWith("/produits/") && !s.jsonLd) flags.push("données structurées Product (JSON-LD) manquantes");
    if (flags.length) out.push({ key: `seo.page:${p.path}`, severity: flags.some((f) => f.includes("manquant") && /titre|description/.test(f)) ? "warning" : "info", title: `${p.path} : ${flags.length} point(s) à améliorer`, detail: flags.join(" · "), data: { path: p.path, ...s } });
  }
  return out;
}
