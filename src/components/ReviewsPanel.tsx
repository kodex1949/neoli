"use client";

import { useEffect, useState, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { useSheetDrag } from "@/lib/sheet";
import { Stars } from "./Stars";
import { ReviewForm } from "./ReviewForm";
import type { ReviewData } from "@/lib/reviews";

const idx = (i: number) => ({ "--i": i }) as CSSProperties;
const date = (d: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(d));

/** Rangée « Avis clients » (note + nombre) qui ouvre le même panneau latéral que Ingrédients / Livraison. */
export function ReviewsPanel({ handle, data }: { handle: string; data: ReviewData }) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const close = () => setOpen(false);
  const sheet = useSheetDrag(close);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", onKey);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.documentElement.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (typeof window !== "undefined" && window.location.hash === "#avis") setOpen(true);
  }, []);

  return (
    <div className="acc" id="avis">
      <div className="acc__item">
        <button type="button" className="acc__head rev__row" aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
          <span>Avis clients</span>
          <span className="rev__rowinfo">
            {data.count > 0 ? <><Stars value={data.average} size={13} /><em>{data.average.toFixed(1).replace(".", ",")} ({data.count})</em></> : <em>Aucun avis</em>}
          </span>
          <svg viewBox="0 0 8 12" aria-hidden="true"><path d="m1.5 1 5 5-5 5" /></svg>
        </button>
      </div>

      {mounted && createPortal(
        <>
          <div className="sheet__scrim sheet__scrim--menu" data-open={open} onClick={close} aria-hidden="true" />
          <aside className="sheet sheet--menu" ref={sheet.ref} data-open={open} role="dialog" aria-label="Avis clients" inert={!open}>
            <div className="sheet__grab" {...sheet.grab} />
            <div className="sheet__top">
              <button type="button" className="user__close" onClick={close} aria-label="Fermer">
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 17.5 17.5 6.5" /><path d="M6.5 6.5 17.5 17.5" /></svg>
              </button>
            </div>
            <div className="sheet__tabs sheet__anim" style={idx(0)}><span className="sheet__tab" aria-selected="true">Avis clients</span></div>
            <div className="sheet__body">
              <section className="sheet__sec rev">
                {data.count > 0 ? (
                  <div className="rev__sum sheet__anim" style={idx(1)}>
                    <p className="rev__avg">{data.average.toFixed(1).replace(".", ",")}<span> / 5</span></p>
                    <div>
                      <Stars value={data.average} size={18} />
                      <p className="rev__count">{data.count} avis</p>
                    </div>
                    <ul className="rev__dist">
                      {[5, 4, 3, 2, 1].map((n) => (
                        <li key={n}><span>{n}</span><i><b style={{ width: `${(data.dist[n - 1] / data.count) * 100}%` }} /></i><span>{data.dist[n - 1]}</span></li>
                      ))}
                    </ul>
                  </div>
                ) : (
                  <p className="rev__none sheet__anim" style={idx(1)}>Aucun avis pour le moment. Soyez le premier à donner le vôtre.</p>
                )}
                <div className="sheet__anim" style={idx(2)}><ReviewForm handle={handle} /></div>
                <div className="rev__list">
                  {data.items.map((r, k) => (
                    <article key={r.id} className="rev__item sheet__anim" style={idx(3 + k)}>
                      <div className="rev__top"><Stars value={r.rating} /><time dateTime={r.created_at}>{date(r.created_at)}</time></div>
                      {r.title && <h3>{r.title}</h3>}
                      <p>{r.body}</p>
                      <p className="rev__by">{r.author_name}{r.verified && <span className="rev__badge">Achat vérifié</span>}</p>
                    </article>
                  ))}
                </div>
              </section>
            </div>
          </aside>
        </>,
        document.body,
      )}
    </div>
  );
}
