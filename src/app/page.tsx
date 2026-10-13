import Link from "next/link";
import { getCollection, getProducts } from "@/lib/shopify";
import { ProductCard } from "@/components/ProductCard";
import { HeroStory } from "@/components/HeroStory";
import { CollectionsShowcase } from "@/components/CollectionsShowcase";
import { HOME_COLLECTIONS } from "@/lib/collections";
import { LookSection } from "@/components/LookSection";
import { HomeForYou } from "@/components/HomeForYou";
import { IconicsShowcase } from "@/components/IconicsShowcase";

export const revalidate = 60;

export default async function Home() {
  const products = await getProducts(8);
  const lips = ((await getCollection("maquillage"))?.products ?? products.filter((p) => p.category === "Maquillage")).slice(0, 2);

  return (
    <>
      {/* Héros animé au scroll : l'image se réduit en carte centrale, deux tuiles montent de chaque côté.
          Pour vos médias : mettez vos fichiers dans public/ puis ajoutez, par exemple,
          video="/videos/hero.mp4" poster="/videos/hero.jpg" (et image: "/tile-1.jpg" dans chaque tuile). */}
      <HeroStory
        eyebrow="Nouvelle collection"
        title="Le jasmin, nouvel esprit de parfum"
        href="/collections/parfums"
        video="/videos/hero.mp4"
        tiles={[
          { caption: "Un extrait de parfum intense", href: "/collections/parfums", image: "/images/tuile-gauche.jpg" },
          { caption: "Une eau de parfum solaire", href: "/collections/parfums", image: "/images/tuile-droite.jpg" },
        ]}
      />

      {/* Les iconiques : média à gauche, carrousel à droite. Le média glisse à gauche quand on fait défiler.
          Pour une vidéo : media={{ ..., video: "/videos/iconiques.mp4" }} ; pour une image : image: "/images/iconiques.jpg". */}
      <IconicsShowcase
        eyebrow="Les iconiques"
        title="Les incontournables de Néoli"
        text="Les créations préférées de nos clients : celles que l'on offre, que l'on rachète et que l'on garde."
        href="/collections/best-sellers"
      >
        {products.map((p) => <ProductCard key={p.id} product={p} />)}
      </IconicsShowcase>

      <HomeForYou />

      {/* Nouveauté : visuel à gauche, texte + deux produits à droite. Visuel : déposez /public/images/nouveaute.jpg (ou video="/videos/nouveaute.mp4"). */}
      <LookSection
        eyebrow="Nouveauté"
        title="Des rouges à lèvres mats sans transfert, 24 h"
        href="/collections/maquillage"
        image="/images/tuile-droite.jpg"
        chips={["Sans transfert", "Tenue 24 h", "Confort velours"]}
        products={lips}
      />

      {/* La nouvelle icône couture : panneaux de collections. Les visuels et textes se changent dans HOME_COLLECTIONS (src/lib/collections.ts). */}
      <CollectionsShowcase items={HOME_COLLECTIONS} eyebrow="Parfum" title="La nouvelle icône couture" href="/collections/parfums" />
    </>
  );
}
