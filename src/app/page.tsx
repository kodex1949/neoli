import Link from "next/link";
import { getCollection, getProducts } from "@/lib/shopify";
import { HeroStory } from "@/components/HeroStory";
import { CollectionsShowcase } from "@/components/CollectionsShowcase";
import { HOME_COLLECTIONS } from "@/lib/collections";
import { IconicsTabs } from "@/components/IconicsTabs";
import { HomeForYou } from "@/components/HomeForYou";
import { IconicsShowcase } from "@/components/IconicsShowcase";
import { ProductCard } from "@/components/ProductCard";
import { getMenuMedia } from "@/lib/menu-media";
import { getCreations } from "@/lib/creations";
import { CreationsSection } from "@/components/CreationsSection";

export const revalidate = 60;

export default async function Home() {
  const products = await getProducts(8);
  const media = await getMenuMedia();
  const creations = await getCreations();
  const hero = media["home:hero"];
  const tile = (i: 0 | 1, fallback: { caption: string; href: string; image: string }) => {
    const m = media[`home:tile:${i}`];
    return {
      caption: m?.title || fallback.caption,
      href: m?.href || fallback.href,
      cta: m?.cta,
      image: m?.url && m.kind === "image" ? m.url : m?.url ? undefined : fallback.image,
      video: m?.url && m.kind === "video" ? m.url : undefined,
    };
  };
  // Essentiels tendance : les produits de la collection dont le lien est saisi dans l'admin (/collections/nom), sinon le catalogue.
  const ess = media["home:essentials"];
  const essv = media["home:essentials:visual"];
  const essHref = ess?.href || "/collections/best-sellers";
  const essHandle = essHref.match(/^\/collections\/([^/?#]+)/)?.[1];
  const essCollection = essHandle ? await getCollection(essHandle).catch(() => null) : null;
  const essProducts = (essCollection?.products.length ? essCollection.products : [...products].reverse()).slice(0, 10);

  const sec = media["home:collections"];
  const panels = HOME_COLLECTIONS.map((c, i) => {
    const m = media[`home:coll:${i}`];
    return {
      ...c,
      label: m?.label || c.label, eyebrow: m?.eyebrow || c.eyebrow, title: m?.title || c.title, text: m?.text || c.text,
      href: m?.href || c.href, cta: m?.cta,
      image: m?.url && m.kind === "image" ? m.url : m?.url ? undefined : c.image,
      video: m?.url && m.kind === "video" ? m.url : undefined,
    };
  });

  return (
    <>
      {/* Héros animé au scroll : l'image se réduit en carte centrale, deux tuiles montent de chaque côté.
          Pour vos médias : mettez vos fichiers dans public/ puis ajoutez, par exemple,
          video="/videos/hero.mp4" poster="/videos/hero.jpg" (et image: "/tile-1.jpg" dans chaque tuile). */}
      <HeroStory
        eyebrow={hero?.eyebrow || "Nouvelle collection"}
        title={hero?.title || "Le jasmin, nouvel esprit de parfum"}
        href={hero?.href || "/collections/parfums"}
        cta={hero?.cta || "Découvrir"}
        image={hero?.url && hero.kind === "image" ? hero.url : undefined}
        video={hero?.url ? (hero.kind === "video" ? hero.url : undefined) : "/videos/hero.mp4"}
        tiles={[
          tile(0, { caption: "Un extrait de parfum intense", href: "/collections/parfums", image: "/images/tuile-gauche.jpg" }),
          tile(1, { caption: "Une eau de parfum solaire", href: "/collections/parfums", image: "/images/tuile-droite.jpg" }),
        ]}
      />

      {/* Nouveautés & coups de cœur (ex-« Les iconiques ») : carrousel de produits, sans visuel. */}
      <IconicsShowcase eyebrow="Sélection" title="Nouveautés & coups de cœur" centered>
        {products.map((p) => <ProductCard key={p.handle} product={p} />)}
      </IconicsShowcase>

      <HomeForYou />

      {/* Essentiels tendance : rangée de produits. Titre, bouton et lien se changent dans /admin/menu → « Essentiels tendance ». */}
      <IconicsTabs id="ess" plain reverse count={3} moreLabel={ess?.cta || "Voir la sélection"} eyebrow="Sélection" intro={ess?.eyebrow || "Les références du moment, choisies pour vous."} allHandle={essHandle || "best-sellers"} title={ess?.title || "Essentiels tendance"} products={essProducts} media={{
        eyebrow: essv?.eyebrow || "Sélection",
        title: essv?.title || "Les essentiels du moment",
        href: essv?.href || essHref,
        cta: essv?.cta || "Découvrir",
        image: essv?.url && essv.kind === "image" ? essv.url : essv?.url ? undefined : "/images/tuile-gauche.jpg",
        video: essv?.url && essv.kind === "video" ? essv.url : undefined,
      }} />

      {/* Créations : texte à gauche, visuel à droite. Gérées dans /admin/creations. */}
      <CreationsSection items={creations} />

      {/* La nouvelle icône couture : panneaux de collections. Visuels et textes : /admin/menu → « Icône couture » (valeurs d'origine dans HOME_COLLECTIONS, src/lib/collections.ts). */}
      <CollectionsShowcase items={panels} eyebrow={sec?.eyebrow || "Parfum"} title={sec?.title || "La nouvelle icône couture"} href={sec?.href || "/collections/parfums"} cta={sec?.cta || "Découvrir"} />
    </>
  );
}
