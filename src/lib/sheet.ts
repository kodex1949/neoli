"use client";

import { useRef } from "react";

/**
 * Feuille du bas sur mobile : on tire la poignée vers le bas pour fermer le panneau (au-delà de 90 px ou d'un geste rapide),
 * sinon il revient en place. Sur ordinateur la poignée est masquée : rien ne se passe.
 */
export function useSheetDrag(onClose: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  const drag = useRef({ y: 0, t: 0, dy: 0, on: false });

  const reset = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transition = "";
    el.style.transform = "";
  };

  const grab = {
    onPointerDown: (e: React.PointerEvent) => {
      drag.current = { y: e.clientY, t: performance.now(), dy: 0, on: true };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    onPointerMove: (e: React.PointerEvent) => {
      const d = drag.current;
      if (!d.on || !ref.current) return;
      d.dy = Math.max(0, e.clientY - d.y);
      ref.current.style.transition = "none";
      ref.current.style.transform = `translateY(${d.dy}px)`;
    },
    onPointerUp: () => {
      const d = drag.current;
      if (!d.on) return;
      d.on = false;
      const fast = d.dy / Math.max(1, performance.now() - d.t) > 0.5; // px / ms
      const close = d.dy > 90 || (fast && d.dy > 30);
      reset();
      if (close) onClose();
    },
    onPointerCancel: () => { drag.current.on = false; reset(); },
  };

  return { ref, grab };
}
