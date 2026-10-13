/**
 * Loader d'images : les photos Shopify sont redimensionnées par le CDN de Shopify (rapide, sans calcul sur ton PC) ;
 * les fichiers locaux (/images/...) sont servis tels quels.
 */
export default function imageLoader({ src, width }: { src: string; width: number; quality?: number }) {
  if (!src.startsWith("https://cdn.shopify.com/")) return src;
  const url = new URL(src);
  url.searchParams.set("width", String(Math.min(width, 2048)));
  return url.toString();
}
