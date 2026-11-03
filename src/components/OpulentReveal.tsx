"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

/** Apparition douce au scroll : le contenu reste visible si JavaScript est absent ou si l'animation est réduite. */
export function Reveal({ children, delay = 0, className = "", as: Tag = "div" }: { children: ReactNode; delay?: number; className?: string; as?: "div" | "section" | "li" | "p" | "h2" | "figure" | "blockquote" }) {
  const ref = useRef<HTMLElement | null>(null);
  const [ready, setReady] = useState(false);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { setShown(true); return; }
    setReady(true);
    const show = () => { setShown(true); io.disconnect(); window.removeEventListener("scroll", check); };
    // déjà dépassé (ancre, défilement très rapide, touche Fin) : on l'affiche aussi
    const check = () => { if (el.getBoundingClientRect().top < window.innerHeight * 0.92) show(); };
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting || e.boundingClientRect.top < 0) show(); }, { threshold: 0.18, rootMargin: "0px 0px -6% 0px" });
    io.observe(el);
    window.addEventListener("scroll", check, { passive: true });
    return () => { io.disconnect(); window.removeEventListener("scroll", check); };
  }, []);
  const Any = Tag as "div";
  return (
    <Any ref={ref as React.RefObject<HTMLDivElement>} className={`op-reveal ${className}`} data-ready={ready || undefined} data-in={shown || undefined} style={{ "--d": `${delay}ms` } as CSSProperties}>
      {children}
    </Any>
  );
}
