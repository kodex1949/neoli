import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CollectionView } from "@/components/CollectionView";
import { getBrands, getBrandProducts } from "@/lib/shopify";
import { brandHref } from "@/lib/brands";
import { directoryFor } from "@/lib/brand-directory";
import "../marques.css";

export const revalidate = 300;
type Props = { params: Promise<{ slug: string }> };

async function find(slug: string) {
  const brands = await getBrands().catch(() => []);
  return { brands, brand: brands.find((b) => b.slug === slug) };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const { brand } = await find(slug);
  return { title: brand ? `${brand.name} — ESSNC` : "Marque — ESSNC" };
}

export default async function BrandPage({ params }: Props) {
  const { slug } = await params;
  const { brands, brand } = await find(slug);
  if (!brand) notFound();
  const products = await getBrandProducts(brand.name);
  const info = directoryFor(brand.slug);

  return (
    <>
      <header className="collection__head">
        <nav className="collection__crumbs" aria-label="Fil d'Ariane">
          <Link href="/">Accueil</Link>
          <span aria-hidden="true">/</span>
          <Link href="/marques">Les Marques</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{brand.name}</span>
        </nav>
        <div className="collection__intro">
          <span className="eyebrow">{info?.origin ? `Marque · ${info.origin}` : "Marque"}</span>
          <h1 className="display">{brand.name}</h1>
          <p className="collection__text">{info?.text ?? `Une sélection de la maison ${brand.name}.`}</p>
          <p className="brands__stats"><span><b>{products.length || brand.count}</b> {(products.length || brand.count) > 1 ? "parfums" : "parfum"} en boutique</span></p>
        </div>
      </header>
      <CollectionView
        products={products}
        links={brands.map((b) => ({ label: b.name, href: brandHref(b) }))}
        current={brandHref(brand)}
      />
    </>
  );
}
