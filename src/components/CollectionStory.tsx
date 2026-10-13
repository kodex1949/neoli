"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import type { Media } from "@/lib/collections";

/**
 * Bloc « story » (9:16) : plusieurs visuels qui s'enchaînent avec barres de progression en haut.
 * Toucher / cliquer à gauche = précédent, à droite = suivant ; maintenir appuyé = pause.
 */
export function CollectionStory({ slides, duration = 6, className = "", style }: { slides: Media[]; duration?: number; className?: string; style?: React.CSSProperties }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduced, setReduced] = useState(false);
  const holdTimer = useRef<number | undefined>(undefined);
  const held = useRef(false);
  const n = slides.length;

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // pause quand l'onglet est caché
  useEffect(() => {
    const onVis = () => setPaused(document.hidden);
    document.addEventListener("visibilitychange", onVis);
    return () => document.removeEventListener("visibilitychange", onVis);
  }, []);

  const go = (d: number) => setI((cur) => (cur + d + n) % n);

  const down = () => {
    held.current = false;
    window.clearTimeout(holdTimer.current);
    holdTimer.current = window.setTimeout(() => { held.current = true; setPaused(true); }, 180);
  };
  const up = () => {
    window.clearTimeout(holdTimer.current);
    if (held.current) setPaused(false);
  };
  const tap = (d: number) => () => { if (!held.current) go(d); held.current = false; };

  const s = slides[i];
  return (
    <div
      className={`cmedia cmedia--story ${className}`}
      data-tone="light"
      style={style}
      role="group"
      aria-roledescription="carrousel"
      aria-label="Story"
      onPointerDown={down}
      onPointerUp={up}
      onPointerLeave={up}
      onPointerCancel={up}
    >
      {slides.map((m, k) => (
        <div key={k} className="story__slide" data-active={k === i}>
          {m.video && k === i ? (
            <video className="cmedia__asset" src={m.video} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
          ) : m.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img className="cmedia__asset" src={m.image} alt="" loading="lazy" draggable={false} />
          ) : (
            <div className="cmedia__asset cmedia__asset--empty" />
          )}
        </div>
      ))}
      <div className="cmedia__shade" />

      <div className="story__bars" aria-hidden="true">
        {slides.map((_, k) => (
          <span key={k} className="story__bar">
            <span
              key={k === i ? `on-${i}` : `off-${k}`}
              className="story__fill"
              data-state={k < i ? "done" : k === i ? "on" : "off"}
              style={{ animationDuration: `${duration}s`, animationPlayState: paused || reduced ? "paused" : "running" }}
              onAnimationEnd={() => { if (k === i) go(1); }}
            />
          </span>
        ))}
      </div>

      {/* zones de toucher : gauche = précédent, droite = suivant */}
      <button type="button" className="story__zone story__zone--prev" aria-label="Diapositive précédente" onClick={tap(-1)} />
      <button type="button" className="story__zone story__zone--next" aria-label="Diapositive suivante" onClick={tap(1)} />

      <div className="cmedia__body story__body" key={`t-${i}`}>
        {s.eyebrow && <span className="cmedia__eyebrow">{s.eyebrow}</span>}
        {s.title && <h2 className="cmedia__title">{s.title}</h2>}
        {s.text && <p className="cmedia__text">{s.text}</p>}
        {s.cta && <Link href={s.cta.href} className="cmedia__cta">{s.cta.label}</Link>}
      </div>
    </div>
  );
}
