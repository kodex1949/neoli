import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CollectionView } from "@/components/CollectionView";
import { COLLECTION_CONTENT, collectionMeta } from "@/lib/collections";
import { getCollection } from "@/lib/shopify";
import { siblingLinks } from "@/lib/menu";

type Props = { params: Promise<{ handle: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { handle } = await params;
  const meta = collectionMeta(handle);
  return { title: meta ? `${meta.title} — ESSNC` : "Collection — ESSNC" };
}

export default async function CollectionPage({ params }: Props) {
  const { handle } = await params;
  const meta = collectionMeta(handle);
  const collection = await getCollection(handle, meta?.title);
  if (!collection || (!meta && !process.env.SHOPIFY_STORE_DOMAIN)) notFound();

  const title = collection.title || meta?.title || handle;
  const content = COLLECTION_CONTENT[handle];
  return (
    <>
      <header className="collection__head">
        {/* Fil d'Ariane à gauche, présentation centrée */}
        <nav className="collection__crumbs" aria-label="Fil d'Ariane">
          <Link href="/">Accueil</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{title}</span>
        </nav>
        <div className="collection__intro">
          <span className="eyebrow">{meta?.eyebrow ?? "Collection"}</span>
          <h1 className="display">{title}</h1>
          <p className="collection__text">{collection.description ?? meta?.text}</p>
        </div>
      </header>
      <CollectionView
        products={collection.products}
        blocks={(content?.blocks ?? []).map((b) => ({ ...b }))}
        links={siblingLinks(handle)}
        current={`/collections/${handle}`}
      />
    </>
  );
}
