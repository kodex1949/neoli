"use client";

import { usePathname } from "next/navigation";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useCart, type Added } from "@/lib/cart";

const DURATION = 4500;

/** Notification douce en haut de page à chaque ajout au panier. */
export function CartToast() {
  const { lastAdded, openPanel } = useCart();
  const pathname = usePathname();
  const [shown, setShown] = useState<Added | null>(null); // contenu gardé pendant le fondu de sortie
  const [open, setOpen] = useState(false);
  const [top, setTop] = useState(96);
  const hovered = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const left = useRef(DURATION);
  const startedAt = useRef(0);

  const arm = (ms: number) => {
    window.clearTimeout(timer.current);
    startedAt.current = Date.now();
    left.current = ms;
    timer.current = window.setTimeout(() => setOpen(false), ms);
  };

  useLayoutEffect(() => {
    if (!lastAdded) return;
    const h = document.querySelector(".header, .cart-header")?.getBoundingClientRect();
    setTop(Math.max(12, (h?.bottom ?? 0) + 12));
    setShown(lastAdded);
    setOpen(true);
    arm(DURATION);
  }, [lastAdded]);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // survol : la notification reste, la jauge se met en pause
  const pause = () => {
    hovered.current = true;
    window.clearTimeout(timer.current);
    left.current = Math.max(800, left.current - (Date.now() - startedAt.current));
  };
  const resume = () => {
    hovered.current = false;
    arm(left.current);
  };

  const onCart = pathname === "/panier";

  return (
    <div
      className="toast"
      data-open={open}
      role="status"
      aria-live="polite"
      style={{ top }}
      onMouseEnter={pause}
      onMouseLeave={resume}
    >
      {shown && (
        <div className="toast__card" key={shown.n}>
          <div className="toast__thumb">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {shown.image ? <img src={shown.image} alt="" /> : null}
          </div>
          <div className="toast__text">
            <span className="toast__kicker">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5.5 12.5 4.2 4.2L18.5 7.8" /></svg>
              Ajouté au panier
            </span>
            <span className="toast__title">{shown.title}</span>
          </div>
          {!onCart && (
            <button type="button" className="toast__action" onClick={() => { setOpen(false); openPanel(); }}>
              Voir le panier
            </button>
          )}
          <button type="button" className="toast__close" aria-label="Fermer" onClick={() => setOpen(false)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 17.5 17.5 6.5" /><path d="M6.5 6.5 17.5 17.5" /></svg>
          </button>
          <span className="toast__bar" style={{ animationPlayState: open && !hovered.current ? "running" : "paused" }} />
        </div>
      )}
    </div>
  );
}
