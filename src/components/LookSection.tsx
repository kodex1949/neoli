"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { Product } from "@/lib/shopify";

type Props = {
  eyebrow: string;
  title: string;
  href: string;
  cta?: string;
  image?: string; // visuel à gauche ; sans fichier, un fond dégradé sert de repère
  video?: string;
  chips?: string[]; // petites pastilles posées sur le visuel
  products: Product[];
};

/**
 * Section « Nouveauté » : grand visuel à gauche (parallaxe, révélation, pastilles), à droite un texte, deux produits dont on peut
 * choisir la teinte (la teinte choisie colore la tuile et teinte toute la colonne), et un bouton.
 */
export function LookSection({ eyebrow, title, href, cta = "Découvrir", image, video, chips = [], products }: Props) {
  const root = useRef<HTMLElement>(null);
  const items = products.slice(0, 2);
  const [pick, setPick] = useState<number[]>(() => items.map(() => 0)); // teinte choisie par produit
  const [last, setLast] = useState(0); // dernier produit touché : donne la couleur d'ambiance

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { el.dataset.in = "true"; return; }
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) { el.dataset.in = "true"; io.disconnect(); } }, { threshold: 0.25 });
    io.observe(el);

    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const p = Math.max(-1, Math.min(1, (r.top + r.height / 2 - innerHeight / 2) / innerHeight));
      el.style.setProperty("--p", p.toFixed(3));
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(update); };
    update();
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", onScroll);
    return () => { io.disconnect(); removeEventListener("scroll", onScroll); removeEventListener("resize", onScroll); if (raf) cancelAnimationFrame(raf); };
  }, []);

  const colorOf = (p: Product | undefined, k: number) => {
    const cols = p?.variants?.filter((v) => v.color) ?? [];
    return cols.length ? cols[Math.min(k, cols.length - 1)] : undefined;
  };
  const wash = colorOf(items[last], pick[last] ?? 0)?.color ?? "#8c4a46";
  const d = (s: number) => ({ "--d": `${s}s` }) as CSSProperties;

  return (
    <section className="look" ref={root} data-in="false" style={{ "--wash": wash } as CSSProperties}>
      <div className="look__media">
        {video ? (
          <video src={video} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
        ) : image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={image} alt="" loading="lazy" />
        ) : null}
        <span className="look__shade" />
        {chips.length > 0 && (
          <ul className="look__chips">
            {chips.map((c, i) => <li key={c} style={{ "--d": `${0.9 + i * 0.12}s` } as CSSProperties}>{c}</li>)}
          </ul>
        )}
      </div>

      <div className="look__body">
        <span className="look__wash" aria-hidden="true" />
        <span className="look__ghost" aria-hidden="true">24 h</span>

        <p className="look__eyebrow look__in" style={d(0.15)}>{eyebrow}</p>
        <h2 className="look__title look__in" style={d(0.3)}>{title}</h2>

        <div className="look__tiles">
          {items.map((p, i) => {
            const cols = p.variants?.filter((v) => v.color) ?? [];
            const sel = cols[pick[i] ?? 0];
            return (
              <div key={p.id} className="look__tile look__in" style={d(0.5 + i * 0.12)} onPointerEnter={() => setLast(i)}>
                <Link href={`/produits/${p.handle}`} className="look__tile-link">
                  <span className="look__tile-media">
                    {p.image ? (
                      <Image src={p.image.url} alt={p.image.alt} width={p.image.width} height={p.image.height} sizes="180px" />
                    ) : (
                      <span className="look__ph" style={{ background: sel?.color }} />
                    )}
                    {p.badges?.[0] && <span className="look__badge">{p.badges[0]}</span>}
                  </span>
                  <span className="look__tile-name">{p.title}</span>
                  <span className="look__tile-price">{p.price}</span>
                </Link>
                {cols.length > 0 && (
                  <div className="look__dots" role="radiogroup" aria-label={`Teinte de ${p.title}`}>
                    {cols.map((c, k) => (
                      <button
                        key={c.label}
                        type="button"
                        role="radio"
                        aria-checked={k === (pick[i] ?? 0)}
                        aria-label={c.label}
                        title={c.label}
                        style={{ background: c.color }}
                        onClick={() => { setPick((a) => a.map((v, x) => (x === i ? k : v))); setLast(i); }}
                      />
                    ))}
                  </div>
                )}
                <span className="look__shade-name" aria-live="polite">{sel?.label ?? " "}</span>
              </div>
            );
          })}
        </div>

        <Link href={href} className="look__cta look__in" style={d(0.8)}>
          <span>{cta}</span>
          <svg viewBox="0 0 16 10" aria-hidden="true"><path d="M1 5h13M10 1l4 4-4 4" /></svg>
        </Link>
      </div>
    </section>
  );
}
