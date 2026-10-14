"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import type { Product } from "@/lib/shopify";

type Props = { title: string; intro?: string; cta: string; href: string; products: Product[] };

/**
 * Carrousel façon Dior : titre et courte phrase à gauche, grandes cartes verticales qui dépassent à droite
 * (nom + « Découvrir » soulignés au bas de chaque carte), pagination « ‹ 1/2 › » en bas à droite.
 */
export function EssentialsRail({ title, intro, cta, href, products }: Props) {
  const track = useRef<HTMLUListElement>(null);
  const [page, setPage] = useState(0);
  const [pages, setPages] = useState(1);

  const measure = useCallback(() => {
    const el = track.current;
    if (!el) return;
    const max = el.scrollWidth - el.clientWidth;
    const n = Math.max(1, Math.ceil(el.scrollWidth / Math.max(el.clientWidth, 1) - 0.05));
    setPages(n);
    setPage(max <= 0 ? 0 : Math.min(n - 1, Math.round((el.scrollLeft / max) * (n - 1))));
  }, []);

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    el.addEventListener("scroll", measure, { passive: true });
    return () => { ro.disconnect(); el.removeEventListener("scroll", measure); };
  }, [measure]);

  const go = (dir: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollBy({ left: dir * el.clientWidth * 0.9, behavior: reduce ? "auto" : "smooth" });
  };

  if (products.length === 0) return null;
  return (
    <section className="ess" aria-roledescription="carrousel" aria-label={title}>
      <div className="ess__intro" data-reveal="up">
        <h2 className="ess__title">{title}</h2>
        {intro && <p className="ess__text">{intro}</p>}
        <Link href={href} className="ess__more">{cta}</Link>
      </div>

      <div className="ess__stage" data-reveal="up" style={{ ["--d" as string]: 1 }}>
        <ul className="ess__track" ref={track} tabIndex={0} aria-label={`${title} : ${products.length} produits`}>
          {products.map((p) => (
            <li key={p.id} className="ess__card">
              <Link href={`/produits/${p.handle}`} className="ess__card-link">
                <span className="ess__card-media">
                  {p.image ? (
                    <Image src={p.image.url} alt={p.image.alt || p.title} width={p.image.width} height={p.image.height} sizes="(max-width: 768px) 60vw, 280px" />
                  ) : (
                    <span className="ess__card-ph" aria-hidden="true" />
                  )}
                </span>
                <span className="ess__card-label">
                  <strong>{p.title}</strong>
                  <em>{p.price}</em>
                  <u>Découvrir</u>
                </span>
              </Link>
            </li>
          ))}
        </ul>

        {pages > 1 && (
          <div className="ess__pager" aria-label="Pagination du carrousel">
            <button type="button" onClick={() => go(-1)} disabled={page === 0} aria-label="Précédent">
              <svg viewBox="0 0 8 12" aria-hidden="true"><path d="M6.5 1 1.5 6l5 5" /></svg>
            </button>
            <span aria-live="polite">{page + 1}/{pages}</span>
            <button type="button" onClick={() => go(1)} disabled={page >= pages - 1} aria-label="Suivant">
              <svg viewBox="0 0 8 12" aria-hidden="true"><path d="m1.5 1 5 5-5 5" /></svg>
            </button>
          </div>
        )}
      </div>
    </section>
  );
}
