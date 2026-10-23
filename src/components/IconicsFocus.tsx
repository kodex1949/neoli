"use client";

import Image from "next/image";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { Product } from "@/lib/shopify";
import { ProductCard } from "./ProductCard";

// Flèche fine de Dior (24×24) ; la droite est son miroir
const arrow = (flip?: boolean) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" style={flip ? { transform: "scaleX(-1)" } : undefined}>
    <path fill="currentColor" fillRule="evenodd" clipRule="evenodd" d="M15.129 18.131C14.8556 18.4044 14.4124 18.4044 14.139 18.131L8.50301 12.495C8.22964 12.2216 8.22964 11.7784 8.50301 11.505L14.139 5.86899C14.4124 5.59562 14.8556 5.59562 15.129 5.86899C15.4024 6.14235 15.4024 6.58557 15.129 6.85894L9.98793 12L15.129 17.1411C15.4024 17.4144 15.4024 17.8576 15.129 18.131Z" />
  </svg>
);

const pad = (n: number) => String(n).padStart(2, "0");

/**
 * « Les iconiques » : à gauche, un grand visuel qui suit le produit actif (image d'ambiance, titre, prix, lien) ;
 * à droite, la rangée des produits. Le produit actif = celui survolé à la souris, sinon celui qui ouvre la rangée (doigt, flèches, trackpad).
 */
export function IconicsFocus({ eyebrow, title, text, href, products }: { eyebrow: string; title: string; text?: string; href: string; products: Product[] }) {
  const root = useRef<HTMLElement>(null);
  const track = useRef<HTMLUListElement>(null);
  const [active, setActive] = useState(0);
  const [edge, setEdge] = useState({ start: true, end: false });

  // Défilement : le produit actif est celui qui ouvre la rangée
  const sync = useCallback(() => {
    const t = track.current;
    if (!t) return;
    const max = t.scrollWidth - t.clientWidth;
    setActive(max > 4 ? Math.round((t.scrollLeft / max) * (products.length - 1)) : 0);
    setEdge({ start: t.scrollLeft < 4, end: t.scrollLeft > t.scrollWidth - t.clientWidth - 4 });
  }, [products.length]);

  useEffect(() => {
    const t = track.current;
    if (!t) return;
    let raf = 0;
    const on = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; sync(); }); };
    sync();
    t.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { t.removeEventListener("scroll", on); window.removeEventListener("resize", on); if (raf) cancelAnimationFrame(raf); };
  }, [sync]);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.dataset.in = "true"; return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.dataset.in = "true"; io.disconnect(); } }, { threshold: 0.15 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const step = (dir: 1 | -1) => {
    const t = track.current;
    if (!t) return;
    const w = (t.querySelector("li")?.getBoundingClientRect().width ?? 300) + 20;
    t.scrollBy({ left: dir * w * 2, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  // Un segment = un produit : la rangée s'aligne dessus et le visuel suit
  const go = (i: number) => {
    const t = track.current;
    const li = t?.querySelectorAll("li")[i] as HTMLElement | undefined;
    if (!t || !li) return;
    setActive(i);
    t.scrollTo({ left: Math.min(li.offsetLeft - t.offsetLeft, t.scrollWidth - t.clientWidth), behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  if (!products.length) return null;
  const cur = products[active] ?? products[0];

  return (
    <section ref={root} className="icx" data-in="false" aria-roledescription="carrousel" aria-label={title}>
      <header className="icx__head">
        <div>
          <span className="eyebrow">{eyebrow}</span>
          <h2 className="display">{title}</h2>
          {text && <p className="icx__lede">{text}</p>}
        </div>
        <Link href={href} className="link">Voir tout</Link>
      </header>

      <div className="icx__body">
        <aside className="icx__stage" data-pack={!(cur.images && cur.images.length > 1)} aria-live="polite">
          <div className="icx__frames">
            {products.map((p, i) => {
              const ambiance = p.images && p.images.length > 1 ? p.images[1] : undefined;
              const img = ambiance ?? p.image;
              return (
                <div key={p.id} className="icx__frame" data-on={i === active} data-pack={!ambiance}>
                  {img && <Image src={img.url} alt="" width={img.width} height={img.height} sizes="(max-width: 900px) 100vw, 40vw" priority={i === 0} />}
                </div>
              );
            })}
          </div>
          <div className="icx__shade" />
          <Link href={`/produits/${cur.handle}`} className="icx__hit" aria-label={`Voir ${cur.title}`} tabIndex={-1} />
          <ol className="icx__segs" aria-label="Produits">
            {products.map((p, i) => (
              <li key={p.id}><button type="button" data-on={i === active} data-past={i < active} aria-label={`Produit ${i + 1} : ${p.title}`} aria-current={i === active} onClick={() => go(i)}><i /></button></li>
            ))}
          </ol>
          <div className="icx__info" key={cur.id}>
            <span className="icx__n">{pad(active + 1)} / {pad(products.length)}</span>
            <strong className="icx__name">{cur.title}</strong>
            {cur.tagline && <span className="icx__notes">{cur.tagline}</span>}
            <span className="icx__buy"><em>{cur.price}</em><Link href={`/produits/${cur.handle}`}>Découvrir</Link></span>
          </div>
        </aside>

        <div className="icx__rail">
          <ul ref={track} className="icx__track" tabIndex={0} onKeyDown={(e) => { if (e.key === "ArrowRight") { e.preventDefault(); step(1); } if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); } }}>
            {products.map((p, i) => (
              <li key={p.id} className="icx__item" data-on={i === active} style={{ "--i": i } as CSSProperties} onPointerEnter={(e) => { if (e.pointerType === "mouse") setActive(i); }} onFocus={() => setActive(i)}>
                <span className="icx__num">{pad(i + 1)}</span>
                <ProductCard product={p} />
              </li>
            ))}
          </ul>
          <div className="icx__stepper">
            <button type="button" className="showcase__arrow" onClick={() => step(-1)} disabled={edge.start} aria-label="Précédent">{arrow()}</button>
            <button type="button" className="showcase__arrow" onClick={() => step(1)} disabled={edge.end} aria-label="Suivant">{arrow(true)}</button>
          </div>
        </div>
      </div>
    </section>
  );
}
