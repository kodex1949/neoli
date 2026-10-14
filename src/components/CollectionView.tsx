"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { Product } from "@/lib/shopify";
import type { CollectionBlock } from "@/lib/collections";
import { CollectionMedia } from "./CollectionMedia";
import { CollectionStory } from "./CollectionStory";
import { ProductCard } from "./ProductCard";
import { SortMenu } from "./SortMenu";
import { FilterSheet, NO_FILTERS, PRICE_RANGES, countFilters, type Filters } from "./FilterSheet";

type Sort = "pertinence" | "prix-asc" | "prix-desc";

const SORT_OPTIONS: { value: Sort; label: string }[] = [
  { value: "pertinence", label: "Pertinence" },
  { value: "prix-asc", label: "Prix croissant" },
  { value: "prix-desc", label: "Prix décroissant" },
];

const value = (p: Product) => {
  const n = parseFloat(p.price.replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

/** Barre de filtres (catégories + tri) puis grille de produits. */
export function CollectionView({ products, blocks = [], links = [], current }: { products: Product[]; blocks?: CollectionBlock[]; links?: { label: string; href: string }[]; current?: string }) {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [sort, setSort] = useState<Sort>("pertinence");
  const [filterOpen, setFilterOpen] = useState(false);

  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.category).filter(Boolean) as string[])), [products]);
  const badges = useMemo(() => Array.from(new Set(products.flatMap((p) => p.badges ?? []))), [products]);
  const active = countFilters(filters);
  const priceTest = PRICE_RANGES.find((r) => r.value === filters.price)?.test ?? (() => true);

  const shown = useMemo(() => {
    const list = products.filter(
      (p) =>
        (filters.cats.length === 0 || (p.category && filters.cats.includes(p.category))) &&
        priceTest(value(p)) &&
        (filters.badges.length === 0 || (p.badges ?? []).some((b) => filters.badges.includes(b))),
    );
    if (sort === "prix-asc") return [...list].sort((a, b) => value(a) - value(b));
    if (sort === "prix-desc") return [...list].sort((a, b) => value(b) - value(a));
    return list;
  }, [products, filters, sort, priceTest]);

  // Les blocs image / vidéo ne s'affichent que sans filtre, pour ne pas fausser la sélection
  const cells = useMemo(() => {
    const out: ({ kind: "product"; product: Product } | { kind: "block"; block: CollectionBlock; index: number })[] = [];
    const activeBlocks = active === 0 ? blocks : [];
    shown.forEach((p, i) => {
      activeBlocks.forEach((b, index) => { if (b.at === i) out.push({ kind: "block", block: b, index }); });
      out.push({ kind: "product", product: p });
    });
    activeBlocks.forEach((b, index) => { if (b.at >= shown.length) out.push({ kind: "block", block: b, index }); });
    return out;
  }, [shown, blocks, active]);

  return (
    <section className="collection">
      <div className="collection__bar">
        <div className="collection__chips" role="group" aria-label="Catégories">
          {links.length > 1 && links.map((l) => (
            <Link key={l.href} href={l.href} className="collection__chip" aria-pressed={l.href === current} aria-current={l.href === current ? "page" : undefined}>{l.label}</Link>
          ))}
          {links.length <= 1 && categories.length > 0 && (
            <>
              <button type="button" className="collection__chip" aria-pressed={filters.cats.length === 0} onClick={() => setFilters({ ...filters, cats: [] })}>Tous</button>
              {categories.map((c) => (
                <button key={c} type="button" className="collection__chip" aria-pressed={filters.cats.length === 1 && filters.cats[0] === c} onClick={() => setFilters({ ...filters, cats: [c] })}>
                  {c}
                </button>
              ))}
            </>
          )}
        </div>
        <div className="collection__tools">
          <span className="collection__count" aria-live="polite">{shown.length} produit{shown.length > 1 ? "s" : ""}</span>
          <SortMenu value={sort} onChange={setSort} options={SORT_OPTIONS} />
          <button type="button" className="collection__filter" onClick={() => setFilterOpen(true)} aria-haspopup="dialog">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h10M18 7h2M4 17h2M10 17h10" /><circle cx="16" cy="7" r="2" /><circle cx="8" cy="17" r="2" /></svg>
            Filtrer{active > 0 && <span className="collection__fcount">{active}</span>}
          </button>
        </div>
      </div>

      {shown.length > 0 ? (
        <div className="grid collection__grid" key={`${JSON.stringify(filters)}-${sort}`}>
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

      <FilterSheet open={filterOpen} onClose={() => setFilterOpen(false)} filters={filters} onChange={setFilters} categories={categories} badges={badges} resultCount={shown.length} sort={sort} onSort={(v) => setSort(v as Sort)} sortOptions={SORT_OPTIONS} />
    </section>
  );
}
