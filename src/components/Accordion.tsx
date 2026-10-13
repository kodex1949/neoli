"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useSheetDrag } from "@/lib/sheet";

export type PanelItem = { title: string; text: string; points?: string[] };

/** Rangées façon dior.com : titre + chevron ; un clic ouvre un panneau en verre dépoli qui glisse depuis la droite. */
export function Accordion({ items }: { items: PanelItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  const [tab, setTab] = useState(0);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const close = () => setOpen(null);
  const sheet = useSheetDrag(close);
  const tabsRef = useRef<HTMLDivElement>(null);

  // sur mobile les onglets défilent : l'onglet actif reste visible
  useEffect(() => {
    tabsRef.current?.querySelector<HTMLElement>('[aria-selected="true"]')?.scrollIntoView({ inline: "center", block: "nearest", behavior: "smooth" });
  }, [tab, open]);

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(null); };
    window.addEventListener("keydown", onKey);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.documentElement.style.overflow = prev; };
  }, [open]);


  return (
    <div className="acc">
      {items.map((row, k) => (
        <div key={row.title} className="acc__item">
          <button type="button" className="acc__head" aria-haspopup="dialog" aria-expanded={open === k} onClick={() => { setTab(k); setOpen(k); }}>
            {row.title}
            <svg viewBox="0 0 8 12" aria-hidden="true"><path d="m1.5 1 5 5-5 5" /></svg>
          </button>
        </div>
      ))}

      {mounted && createPortal(
        <>
          <div className="sheet__scrim" data-open={open !== null} onClick={close} aria-hidden="true" />
          <aside className="sheet" ref={sheet.ref} data-open={open !== null} role="dialog" aria-label="Détails du produit" inert={open === null}>
            <div className="sheet__grab" {...sheet.grab} />
            <div className="sheet__top">
              <button type="button" className="user__close" onClick={close} aria-label="Fermer">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 17.5 17.5 6.5" /><path d="M6.5 6.5 17.5 17.5" /></svg>
              </button>
            </div>
            <div className="sheet__tabs" ref={tabsRef} role="tablist" aria-label="Détails du produit">
              {items.map((x, k) => (
                <button key={x.title} type="button" role="tab" id={`tab-${k}`} aria-selected={tab === k} aria-controls="sheet-panel" className="sheet__tab" onClick={() => setTab(k)}>
                  {x.title}
                </button>
              ))}
            </div>
            <div className="sheet__body" id="sheet-panel" role="tabpanel" aria-labelledby={`tab-${tab}`}>
              <section key={tab} className="sheet__sec">
                <h2 className="sheet__title">{items[tab].title}</h2>
                <p className="sheet__text">{items[tab].text}</p>
                {items[tab].points && (
                  <ul className="sheet__points">
                    {items[tab].points!.map((y) => <li key={y}>{y}</li>)}
                  </ul>
                )}
              </section>
            </div>
          </aside>
        </>,
        document.body,
      )}
    </div>
  );
}

/** Texte long replié sur quelques lignes avec « Voir plus ». Les mots s'allument un à un au fil du scroll. */
export function ReadMore({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const root = useRef<HTMLDivElement>(null);
  const words = text.split(/\s+/).filter(Boolean);

  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const total = words.length;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { el.style.setProperty("--n", String(total)); return; }
    el.dataset.js = "true";
    let raf = 0;
    const update = () => {
      raf = 0;
      const r = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 0 quand le texte entre par le bas de l'écran, 1 quand il atteint environ la moitié haute
      const t = Math.min(1, Math.max(0, (vh * 0.92 - r.top) / (vh * 0.5)));
      el.style.setProperty("--n", (t * (total + 3)).toFixed(2));
    };
    const onScroll = () => { if (!raf) raf = window.requestAnimationFrame(update); };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => { window.removeEventListener("scroll", onScroll); window.removeEventListener("resize", onScroll); if (raf) window.cancelAnimationFrame(raf); };
  }, [words.length]);

  return (
    <div className="readmore" data-open={open} ref={root} style={{ "--n": words.length } as React.CSSProperties}>
      <p aria-label={text}>
        {words.map((w, i) => (
          <span key={i} className="readmore__w" aria-hidden="true" style={{ "--i": i } as React.CSSProperties}>{w}{" "}</span>
        ))}
      </p>
      {text.length > 240 && (
        <button type="button" className="readmore__btn" onClick={() => setOpen((o) => !o)}>{open ? "Voir moins" : "Voir plus"}</button>
      )}
    </div>
  );
}
