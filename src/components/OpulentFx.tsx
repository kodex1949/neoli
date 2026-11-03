"use client";

import { useEffect, useRef, useState } from "react";

const clamp = (n: number, a = 0, b = 1) => Math.min(b, Math.max(a, n));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

/**
 * Moteur de scroll de la page Opulent Milano : un seul écouteur (rAF), tout passe par des variables CSS.
 * - [data-pin]       section épinglée : --pp (0→1). data-pin="hero" : --e (ouverture de l'arche) et --f (texte final).
 *                    data-pin="h" : --mx (course de la bande horizontale, en px).
 * - [data-stage-sec] data-stage 0→2 selon la progression (notes de tête, cœur, fond).
 * - [data-par]       parallaxe verticale : --py.
 * - [data-words]     texte qui s'illumine mot à mot.
 * - barre de progression + barre d'achat flottante ; léger suivi du pointeur sur le héros (écrans à souris).
 * Mouvement réduit : l'arche est ouverte d'emblée, plus de parallaxe.
 */
export function OpulentFx({ title, price }: { title: string; price?: string }) {
  const bar = useRef<HTMLDivElement>(null);
  const [floating, setFloating] = useState(false);

  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".op");
    if (!root) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const fine = window.matchMedia("(hover: hover) and (pointer: fine)").matches;
    const hero = root.querySelector<HTMLElement>(".op-hero, .kh-hero");
    const buy = root.querySelector<HTMLElement>("#le-parfum");
    const fin = root.querySelector<HTMLElement>(".op-final, .kh-final");
    const pins = [...root.querySelectorAll<HTMLElement>("[data-pin]")];
    const pars = [...root.querySelectorAll<HTMLElement>("[data-par]")];
    const wordsSecs = [...root.querySelectorAll<HTMLElement>("[data-words]")].map((s) => ({ s, w: [...s.querySelectorAll<HTMLElement>(".op-w")] }));
    const stages = [...root.querySelectorAll<HTMLElement>("[data-stage-sec]")];
    let raf = 0;
    let last = false;

    const tick = () => {
      raf = 0;
      const vh = window.innerHeight;
      const max = document.documentElement.scrollHeight - vh;
      if (bar.current) bar.current.style.transform = `scaleX(${max > 0 ? clamp(window.scrollY / max) : 0})`;

      // filet de sécurité : un bloc déjà dépassé (défilement très rapide, ancre, touche Fin) est toujours affiché
      root.querySelectorAll<HTMLElement>(".op-reveal[data-ready]:not([data-in])").forEach((el) => {
        if (el.getBoundingClientRect().top < vh * 0.92) el.setAttribute("data-in", "true");
      });

      for (const pin of pins) {
        const r = pin.getBoundingClientRect();
        const p = clamp(-r.top / Math.max(1, r.height - vh));
        pin.style.setProperty("--pp", p.toFixed(4));
        if (pin.dataset.pin === "hero") {
          pin.style.setProperty("--e", (reduce ? 1 : ease(clamp(p / 0.78))).toFixed(4));
          pin.style.setProperty("--f", (reduce ? 1 : clamp((p - 0.6) / 0.3)).toFixed(4));
        } else if (pin.dataset.pin === "h") {
          const track = pin.querySelector<HTMLElement>(".op-h__track");
          if (track) pin.style.setProperty("--mx", `${Math.max(0, track.scrollWidth - window.innerWidth)}px`);
        }
      }
      if (!reduce) {
        for (const el of pars) {
          const r = el.getBoundingClientRect();
          if (r.bottom < -240 || r.top > vh + 240) continue;
          const off = (r.top + r.height / 2 - vh / 2) / vh;
          el.style.setProperty("--py", `${(off * Number(el.dataset.par || 40)).toFixed(1)}px`);
        }
      }
      for (const { s, w } of wordsSecs) {
        const r = s.getBoundingClientRect();
        const p = reduce ? 1 : clamp((vh * 0.85 - r.top) / (vh * 0.5 + r.height * 0.6));
        const n = Math.round(p * w.length * 1.08);
        w.forEach((el, i) => { el.dataset.on = i < n ? "1" : "0"; });
      }
      for (const s of stages) {
        const r = s.getBoundingClientRect();
        const p = clamp(-r.top / Math.max(1, r.height - vh));
        s.dataset.stage = String(Math.min(2, Math.floor(p * 3)));
      }
      if (hero && buy) {
        const h = hero.getBoundingClientRect();
        const b = buy.getBoundingClientRect();
        const atEnd = !!fin && fin.getBoundingClientRect().top < vh * 0.6;
        const show = !atEnd && h.bottom < vh * 0.2 && (b.top > vh * 0.55 || b.bottom < vh * 0.3);
        if (show !== last) { last = show; setFloating(show); }
      }
    };
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };

    // suivi du pointeur : l'image du héros se déplace avec un léger retard
    let tx = 0, ty = 0, cx = 0, cy = 0, loop = 0;
    const step = () => {
      cx += (tx - cx) * 0.07; cy += (ty - cy) * 0.07;
      hero?.style.setProperty("--tx", cx.toFixed(2));
      hero?.style.setProperty("--ty", cy.toFixed(2));
      loop = Math.abs(tx - cx) > 0.05 || Math.abs(ty - cy) > 0.05 ? requestAnimationFrame(step) : 0;
    };
    const onMove = (ev: PointerEvent) => {
      tx = (ev.clientX / window.innerWidth - 0.5) * -28;
      ty = (ev.clientY / window.innerHeight - 0.5) * -18;
      if (!loop) loop = requestAnimationFrame(step);
    };

    tick();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    if (fine && !reduce) window.addEventListener("pointermove", onMove, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.removeEventListener("pointermove", onMove);
      if (raf) cancelAnimationFrame(raf);
      if (loop) cancelAnimationFrame(loop);
    };
  }, []);

  return (
    <>
      <div className="op-progress" aria-hidden="true"><div ref={bar} /></div>
      <div className="op-float" data-show={floating} aria-hidden={!floating}>
        <div className="op-float__in">
          <span className="op-float__name">{title}<small>Lattafa · Eau de parfum 100 ml</small></span>
          {price && <span className="op-float__price">{price}</span>}
          <a href="#le-parfum" className="op-btn op-btn--sm" tabIndex={floating ? 0 : -1}>Commander</a>
        </div>
      </div>
    </>
  );
}
