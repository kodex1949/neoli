import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Accordion, ReadMore } from "@/components/Accordion";
import { ProductBuy } from "@/components/ProductBuy";
import { ProductCard } from "@/components/ProductCard";
import { ProductGallery } from "@/components/ProductGallery";
import { ReviewsPanel } from "@/components/ReviewsPanel";
import { getReviews } from "@/lib/reviews";
import { ACCORDIONS, FALLBACK_TEXT, PERKS } from "@/lib/product-content";
import { getProduct, getProducts } from "@/lib/shopify";

export const revalidate = 60;

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const p = await getProduct(handle);
  return { title: p ? `${p.title} — ESSNC` : "Produit — ESSNC", description: p?.tagline };
}

export default async function ProductPage({ params }: Props) {
  const { handle } = await params;
  const product = await getProduct(handle);
  if (!product) notFound();

  const reviews = await getReviews(product.handle);
  const more = (await getProducts(8)).filter((p) => p.handle !== product.handle).slice(0, 4);

  return (
    <>
      <section className="pdp">
        <ProductGallery product={product} />
        <ProductBuy product={product} />
      </section>

      <section className="pdp__about">
        <ReadMore text={product.description ?? FALLBACK_TEXT} />
        <div className="pdp__aside">
          <Accordion items={ACCORDIONS} />
          <ReviewsPanel handle={product.handle} data={reviews} />
          <ul className="pdp__perks">
            {PERKS.map((p) => <li key={p}>{p}</li>)}
          </ul>
        </div>
      </section>

      {more.length > 0 && (
        <section className="pdp__sugg">
          <div className="pdp__sugg-head">
            <span className="eyebrow">Les suggestions</span>
            <h2 className="display">Vous aimerez aussi</h2>
          </div>
          <div className="grid">
            {more.map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}
      <div className="pdp__spacer" aria-hidden="true" />
    </>
  );
}
