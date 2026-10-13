"use client";

import { useMemo, useState } from "react";
import type { Product } from "@/lib/shopify";
import type { CollectionBlock } from "@/lib/collections";
import { CollectionMedia } from "./CollectionMedia";
import { CollectionStory } from "./CollectionStory";
import { ProductCard } from "./ProductCard";
import { SortMenu } from "./SortMenu";

type Sort = "pertinence" | "prix-asc" | "prix-desc";

const value = (p: Product) => {
  const n = parseFloat(p.price.replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Barre de filtres (catégories + tri) puis grille de produits. */
export function CollectionView({ products, blocks = [] }: { products: Product[]; blocks?: CollectionBlock[] }) {
  const [category, setCategory] = useState<string>("Tous");
  const [sort, setSort] = useState<Sort>("pertinence");

  const categories = useMemo(() => ["Tous", ...Array.from(new Set(products.map((p) => p.category).filter(Boolean) as string[]))], [products]);

  const shown = useMemo(() => {
    const list = category === "Tous" ? products : products.filter((p) => p.category === category);
    if (sort === "prix-asc") return [...list].sort((a, b) => value(a) - value(b));
    if (sort === "prix-desc") return [...list].sort((a, b) => value(b) - value(a));
    return list;
  }, [products, category, sort]);

  // Les blocs image / vidéo ne s'affichent que sans filtre, pour ne pas fausser la sélection
  const cells = useMemo(() => {
    const out: ({ kind: "product"; product: Product } | { kind: "block"; block: CollectionBlock; index: number })[] = [];
    const active = category === "Tous" ? blocks : [];
    shown.forEach((p, i) => {
      active.forEach((b, index) => { if (b.at === i) out.push({ kind: "block", block: b, index }); });
      out.push({ kind: "product", product: p });
    });
    active.forEach((b, index) => { if (b.at >= shown.length) out.push({ kind: "block", block: b, index }); });
    return out;
  }, [shown, blocks, category]);

  return (
    <section className="collection">
      <div className="collection__bar">
        <div className="collection__chips" role="group" aria-label="Catégories">
          {categories.length > 2 &&
            categories.map((c) => (
              <button key={c} type="button" className="collection__chip" aria-pressed={category === c} onClick={() => setCategory(c)}>
                {c}
              </button>
            ))}
        </div>
        <div className="collection__tools">
          <span className="collection__count" aria-live="polite">{shown.length} produit{shown.length > 1 ? "s" : ""}</span>
          <SortMenu
            value={sort}
            onChange={setSort}
            options={[
              { value: "pertinence", label: "Pertinence" },
              { value: "prix-asc", label: "Prix croissant" },
              { value: "prix-desc", label: "Prix décroissant" },
            ]}
          />
        </div>
      </div>

      {shown.length > 0 ? (
        <div className="grid collection__grid" key={`${category}-${sort}`}>
          {cells.map((c) =>
            c.kind === "product" ? (
              <ProductCard key={c.product.id} product={c.product} />
            ) : c.block.slides?.length ? (
              <CollectionStory
                key={`block-${c.index}`}
                slides={c.block.slides}
                duration={c.block.duration}
                style={{ gridColumn: c.block.right ? `span ${c.block.span ?? 1} / -1` : `span ${c.block.span ?? 1}`, gridRow: `span ${c.block.rows ?? 1}` }}
              />
            ) : (
              <CollectionMedia
                key={`block-${c.index}`}
                media={c.block}
                className="cmedia--block"
                style={{ gridColumn: c.block.right ? `span ${c.block.span ?? 1} / -1` : `span ${c.block.span ?? 1}`, gridRow: `span ${c.block.rows ?? 1}` }}
              />
            ),
          )}
        </div>
      ) : (
        <p className="collection__empty">Aucun produit dans cette sélection pour le moment.</p>
      )}
    </section>
  );
}
