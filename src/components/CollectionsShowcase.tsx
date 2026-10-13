"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState, type CSSProperties } from "react";
import type { HomeCollection } from "@/lib/collections";

const DURATION = 6; // secondes par panneau

/**
 * « La nouvelle icône couture » : une rangée de panneaux verticaux. Celui qui est actif s'ouvre en grand (visuel, titre, texte, bouton),
 * les autres restent en lames avec leur nom à la verticale. Ouverture au survol / au clic / au clavier, avance automatique avec barre de progression.
 */
export function CollectionsShowcase({ items, eyebrow, title, href }: { items: HomeCollection[]; eyebrow: string; title: string; href: string }) {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const root = useRef<HTMLElement>(null);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Révélation à l'entrée dans l'écran ; l'avance automatique ne démarre qu'à ce moment-là
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) { el.dataset.in = "true"; setAuto(false); return; }
    const io = new IntersectionObserver(([e]) => { el.dataset.in = e.isIntersecting ? "true" : el.dataset.in; el.dataset.view = String(e.isIntersecting); }, { threshold: 0.3 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  const next = useCallback(() => setActive((a) => (a + 1) % items.length), [items.length]);

  const choose = (i: number) => { setActive(i); };
  const hover = (i: number, e: React.PointerEvent) => {
    if (e.pointerType !== "mouse") return;
    clearTimeout(hoverTimer.current);
    hoverTimer.current = setTimeout(() => setActive(i), 110);
  };

  return (
    <section className="coll" ref={root} data-in="false" data-view="false" aria-roledescription="carrousel" aria-label={title}>
      <header className="coll__head">
        <span className="eyebrow coll__in" style={{ "--d": "0s" } as CSSProperties}>{eyebrow}</span>
        <h2 className="display coll__in" style={{ "--d": ".12s" } as CSSProperties}>{title}</h2>
        <Link href={href} className="link coll__in" style={{ "--d": ".24s" } as CSSProperties}>Découvrir</Link>
      </header>


      <div
        className="coll__stage"
        data-auto={auto}
        onPointerLeave={() => { clearTimeout(hoverTimer.current); setAuto(true); }}
        onPointerEnter={(e) => { if (e.pointerType === "mouse") setAuto(false); }}
        onFocus={() => setAuto(false)}
      >
        {items.map((c, i) => {
          const on = i === active;
          return (
            <article
              key={c.id}
              className="coll__panel"
              data-active={on}
              style={{ "--tint": c.tint, "--i": i } as CSSProperties}
              onPointerEnter={(e) => hover(i, e)}
            >
              <div className="coll__media">
                {c.image && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt="" loading="lazy" style={{ objectPosition: c.position }} />
                )}
                <span className="coll__tint" />
                <span className="coll__shade" />
              </div>

              <button type="button" className="coll__hit" aria-expanded={on} aria-label={c.label} onClick={() => choose(i)} tabIndex={on ? -1 : 0} />

              <span className="coll__num">{String(i + 1).padStart(2, "0")}</span>
              <span className="coll__rail" aria-hidden="true">{c.label}</span>

              <div className="coll__info" inert={!on}>
                <span className="coll__eyebrow">{c.eyebrow}</span>
                <h3 className="coll__title">{c.title}</h3>
                <p className="coll__text">{c.text}</p>
                <Link href={c.href} className="coll__cta">
                  Découvrir
                  <svg viewBox="0 0 16 10" aria-hidden="true"><path d="M1 5h13M10 1l4 4-4 4" /></svg>
                </Link>
              </div>

              {on && (
                <span className="coll__bar" aria-hidden="true">
                  <i key={`${i}-${auto}`} style={{ animationDuration: `${DURATION}s` }} onAnimationEnd={() => auto && next()} />
                </span>
              )}
            </article>
          );
        })}
      </div>
    </section>
  );
}
