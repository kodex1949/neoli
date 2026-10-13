"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

/**
 * Révélation au scroll : tout élément portant data-reveal (up | fade | line) apparaît quand il entre dans l'écran.
 * Délai d'échelonnage : style={{ "--d": n }} (n × 80 ms). Les éléments déjà visibles au chargement s'affichent
 * tout de suite ; sans JavaScript ou avec « réduire les animations », rien n'est masqué.
 */
export function RevealOnScroll() {
  const path = usePathname();

  useEffect(() => {
    const root = document.documentElement;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed])"));
    const vh = window.innerHeight;

    // déjà dans l'écran à l'arrivée : visibles immédiatement (pas de flash masqué)
    const rest = els.filter((el) => {
      const r = el.getBoundingClientRect();
      if (r.top < vh * 0.92 && r.bottom > 0) { el.dataset.revealed = "true"; return false; }
      return true;
    });
    root.classList.add("reveal-on");

    const io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        (e.target as HTMLElement).dataset.revealed = "true";
        io.unobserve(e.target);
      }
    }, { threshold: 0.1 });
    rest.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [path]);

  return null;
}
