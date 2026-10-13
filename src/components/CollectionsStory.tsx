"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import type { HomeCollection } from "@/lib/collections";

const DURATION = 6;

/**
 * Version « Instagram » : une rangée de cercles (à la une) et des stories 9:16 côte à côte.
 * La story du centre se lit toute seule (barres de progression en haut, une par collection) ; les voisines sont en retrait.
 * Toucher à gauche / à droite = précédente / suivante, maintenir = pause, cliquer un cercle ou une voisine = y aller.
 */
export function CollectionsStory({ items, brand = "maison" }: { items: HomeCollection[]; brand?: string }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [seen, setSeen] = useState<Set<number>>(new Set());
  const [liked, setLiked] = useState<Set<number>>(new Set());
  const [inView, setInView] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const holdTimer = useRef<number | undefined>(undefined);
  const held = useRef(false);
  const n = items.length;

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", onVis); };
  }, []);

  useEffect(() => { setSeen((s) => (s.has(i) ? s : new Set(s).add(i))); }, [i]);

  const go = (d: number) => setI((c) => (c + d + n) % n);
  const reduced = typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const running = inView && !paused && !reduced;

  const down = () => { held.current = false; window.clearTimeout(holdTimer.current); holdTimer.current = window.setTimeout(() => { held.current = true; setPaused(true); }, 180); };
  const up = () => { window.clearTimeout(holdTimer.current); if (held.current) setPaused(false); };
  const tap = (d: number) => () => { if (!held.current) go(d); held.current = false; };
  const toggleLike = (k: number) => setLiked((s) => { const x = new Set(s); if (x.has(k)) x.delete(k); else x.add(k); return x; });

  // décalage circulaire le plus court entre une story et la story active
  const offset = (k: number) => { let d = k - i; if (d > n / 2) d -= n; if (d < -n / 2) d += n; return d; };

  return (
    <div className="cst" ref={root}>
      <ul className="cst__rings" aria-label="À la une">
        {items.map((c, k) => (
          <li key={c.id}>
            <button type="button" className="cst__ring" data-active={k === i} data-seen={seen.has(k) && k !== i} onClick={() => setI(k)} aria-label={c.label}>
              <span className="cst__ring-border">
                <span className="cst__ring-img" style={{ background: c.tint }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {c.image && <img src={c.image} alt="" loading="lazy" style={{ objectPosition: c.position }} draggable={false} />}
                </span>
              </span>
              <span className="cst__ring-label">{c.label}</span>
            </button>
          </li>
        ))}
      </ul>

      <div className="cst__stage" role="group" aria-roledescription="carrousel" aria-label="Stories">
        {items.map((c, k) => {
          const d = offset(k);
          const on = d === 0;
          return (
            <article
              key={c.id}
              className="cst__card"
              data-on={on}
              data-hidden={Math.abs(d) > 1}
              style={{ "--d": d, "--tint": c.tint } as CSSProperties}
              onPointerDown={on ? down : undefined}
              onPointerUp={on ? up : undefined}
              onPointerLeave={on ? up : undefined}
              onPointerCancel={on ? up : undefined}
            >
              <div className="cst__media">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {c.image && <img src={c.image} alt="" loading="lazy" style={{ objectPosition: c.position }} draggable={false} />}
                <span className="cst__tint" />
                <span className="cst__shade" />
              </div>

              {on ? (
                <>
                  <div className="cst__bars" aria-hidden="true">
                    {items.map((_, b) => (
                      <span key={b} className="cst__bar">
                        <i
                          key={b === i ? `on-${i}` : `off-${b}`}
                          data-state={b < i ? "done" : b === i ? "on" : "off"}
                          style={{ animationDuration: `${DURATION}s`, animationPlayState: running ? "running" : "paused" }}
                          onAnimationEnd={() => { if (b === i) go(1); }}
                        />
                      </span>
                    ))}
                  </div>

                  <div className="cst__user">
                    <span className="cst__avatar">M</span>
                    <span className="cst__name">{brand}</span>
                    <span className="cst__time">{c.eyebrow}</span>
                    <button type="button" className="cst__pause" aria-label={paused ? "Lecture" : "Pause"} onClick={() => setPaused((p) => !p)}>
                      {paused ? <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9l7.5-4.5z" /></svg> : <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 1.5v9M9 1.5v9" /></svg>}
                    </button>
                  </div>

                  <button type="button" className="cst__zone cst__zone--prev" aria-label="Story précédente" onClick={tap(-1)} />
                  <button type="button" className="cst__zone cst__zone--next" aria-label="Story suivante" onClick={tap(1)} />

                  <div className="cst__body" key={`b-${i}`}>
                    <h3 className="cst__title">{c.title}</h3>
                    <p className="cst__text">{c.text}</p>
                    <div className="cst__actions">
                      <Link href={c.href} className="cst__cta">
                        Découvrir
                        <svg viewBox="0 0 16 10" aria-hidden="true"><path d="M1 5h13M10 1l4 4-4 4" /></svg>
                      </Link>
                      <button type="button" className="cst__like" data-on={liked.has(k)} aria-pressed={liked.has(k)} aria-label="J'aime" onClick={() => toggleLike(k)}>
                        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20.5s-7.5-4.6-7.5-10.2A4.3 4.3 0 0 1 12 7.6a4.3 4.3 0 0 1 7.5 2.7c0 5.600-7.500 10.200-7.500 10.200Z" /></svg>
                      </button>
                    </div>
                  </div>
                </>
              ) : (
                <button type="button" className="cst__peek" aria-label={c.label} onClick={() => setI(k)} tabIndex={Math.abs(d) > 1 ? -1 : 0}>
                  <span className="cst__peek-label">{c.label}</span>
                </button>
              )}
            </article>
          );
        })}
      </div>
    </div>
  );
}
