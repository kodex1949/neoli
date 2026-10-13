"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

type Item = { id: string; handle: string; title: string; price: string; image?: { url: string; alt: string } };
type Props = {
  open: boolean;
  hover: boolean; // survol de la loupe : seule la barre blanche apparaît
  onOpen: () => void;
  onHoverIn: () => void;
  onHoverOut: () => void;
  onClose: () => void;
  pos: { top: number; left: number };
};

const TABS = ["Best Sellers", "Nouveautés"] as const;

export function SearchPanel({ open, hover, onOpen, onHoverIn, onHoverOut, onClose, pos }: Props) {
  const [q, setQ] = useState("");
  const [tab, setTab] = useState<(typeof TABS)[number]>("Best Sellers");
  const [items, setItems] = useState<Item[]>([]);
  const [loaded, setLoaded] = useState(false);
  const input = useRef<HTMLInputElement>(null);

  // Focus + verrouillage du scroll à l'ouverture (Dior : « no-scroll » sur le body)
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    input.current?.focus();
    return () => { document.documentElement.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Charge la sélection / les résultats (anti-rebond 200 ms)
  useEffect(() => {
    if (!open) return;
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const data = (await res.json()) as { products: Item[] };
        setItems(data.products);
        setLoaded(true);
      } catch { /* requête annulée */ }
    }, q ? 200 : 0);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [open, q]);

  const searching = q.trim().length > 0;
  const list = !searching && tab === "Nouveautés" ? [...items].reverse() : items;

  return (
    <>
      {open && <div className="search__scrim" onClick={onClose} aria-hidden="true" />}
      <div
        className="search"
        data-open={open}
        data-hover={hover && !open}
        role="dialog"
        aria-label="Recherche"
        style={{ top: pos.top, left: pos.left }}
      >
        <form
          className="search__bar"
          role="search"
          onSubmit={(e) => { e.preventDefault(); }}
          onMouseEnter={onHoverIn}
          onMouseLeave={onHoverOut}
          onClick={() => { if (!open) onOpen(); }}
        >
          <div className="search__field">
            <svg className="search__icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" strokeLinecap="round" /></svg>
            <input
              ref={input}
              className="search__input"
              type="text"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Rechercher un parfum, une bougie…"
              aria-label="Rechercher sur le site"
              autoComplete="off"
              tabIndex={open ? 0 : -1}
              readOnly={!open}
            />
          </div>
          <div className="search__actions">
            {searching && (
              <button type="button" className="search__clear" onClick={() => { setQ(""); input.current?.focus(); }}>Effacer</button>
            )}
            <button type="button" className="search__close" onPointerDown={(e) => e.preventDefault()} onClick={(e) => { e.stopPropagation(); input.current?.blur(); onClose(); }} aria-label="Fermer la recherche" tabIndex={open ? 0 : -1}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 17.5 17.5 6.5" /><path d="M6.5 6.5 17.5 17.5" /></svg>
            </button>
          </div>
        </form>

        <div className="search__dropdown" inert={!open}>
          <div className="search__tabs">
            {!searching && TABS.map((t) => (
              <button key={t} type="button" className="search__tab" aria-pressed={tab === t} onClick={() => setTab(t)}>{t}</button>
            ))}
          </div>
          <ul className="search__list">
            {list.map((p) => (
              <li key={p.id}>
                <Link href={`/produits/${p.handle}`} onClick={onClose} className="search__tile">
                  <span className="search__visual">
                    {p.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={p.image.url} alt="" />}
                  </span>
                  <span className="search__info">
                    <span className="search__name">{p.title}</span>
                    <span className="search__desc">À partir de {p.price}</span>
                  </span>
                </Link>
              </li>
            ))}
            {loaded && searching && list.length === 0 && (
              <li className="search__empty">Aucun résultat pour « {q.trim()} »</li>
            )}
          </ul>
        </div>
      </div>
    </>
  );
}
