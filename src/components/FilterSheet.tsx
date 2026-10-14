"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useSheetDrag } from "@/lib/sheet";

export type PriceRange = "all" | "lt30" | "30-60" | "60-100" | "gt100";
export const PRICE_RANGES: { value: PriceRange; label: string; test: (n: number) => boolean }[] = [
  { value: "all", label: "Tous les prix", test: () => true },
  { value: "lt30", label: "Moins de 30 €", test: (n) => n < 30 },
  { value: "30-60", label: "30 € à 60 €", test: (n) => n >= 30 && n < 60 },
  { value: "60-100", label: "60 € à 100 €", test: (n) => n >= 60 && n < 100 },
  { value: "gt100", label: "Plus de 100 €", test: (n) => n >= 100 },
];

export type Filters = { cats: string[]; price: PriceRange; badges: string[] };
export const NO_FILTERS: Filters = { cats: [], price: "all", badges: [] };
export const countFilters = (f: Filters) => f.cats.length + (f.price !== "all" ? 1 : 0) + f.badges.length;

type Props = {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onChange: (f: Filters) => void;
  categories: string[];
  badges: string[];
  resultCount: number;
};

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** Panneau « Filtrer » : même ouverture que le menu (révélé d'un côté, flou du fond). */
export function FilterSheet({ open, onClose, filters, onChange, categories, badges, resultCount }: Props) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  const sheet = useSheetDrag(onClose);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.documentElement.style.overflow = prev; };
  }, [open, onClose]);

  if (!mounted) return null;
  const n = countFilters(filters);

  return createPortal(
    <>
      <div className="sheet__scrim sheet__scrim--menu" data-open={open} onClick={onClose} aria-hidden="true" />
      <aside className="sheet sheet--menu filt" ref={sheet.ref} data-open={open} role="dialog" aria-label="Filtrer" inert={!open}>
        <div className="sheet__grab" {...sheet.grab} />
        <div className="sheet__top">
          <button type="button" className="user__close" onClick={onClose} aria-label="Fermer">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 17.5 17.5 6.5" /><path d="M6.5 6.5 17.5 17.5" /></svg>
          </button>
        </div>
        <div className="sheet__tabs"><span className="sheet__tab" aria-selected="true">Filtrer</span></div>
        <div className="sheet__body">
          {categories.length > 0 && (
            <fieldset className="filt__group">
              <legend>Catégorie</legend>
              {categories.map((c) => (
                <label key={c} className="filt__opt">
                  <input type="checkbox" checked={filters.cats.includes(c)} onChange={() => onChange({ ...filters, cats: toggle(filters.cats, c) })} />
                  <span>{c}</span>
                </label>
              ))}
            </fieldset>
          )}
          <fieldset className="filt__group">
            <legend>Prix</legend>
            {PRICE_RANGES.map((r) => (
              <label key={r.value} className="filt__opt">
                <input type="radio" name="price" checked={filters.price === r.value} onChange={() => onChange({ ...filters, price: r.value })} />
                <span>{r.label}</span>
              </label>
            ))}
          </fieldset>
          {badges.length > 0 && (
            <fieldset className="filt__group">
              <legend>Sélection</legend>
              {badges.map((b) => (
                <label key={b} className="filt__opt">
                  <input type="checkbox" checked={filters.badges.includes(b)} onChange={() => onChange({ ...filters, badges: toggle(filters.badges, b) })} />
                  <span>{b}</span>
                </label>
              ))}
            </fieldset>
          )}
        </div>
        <div className="filt__foot">
          <button type="button" className="filt__reset" onClick={() => onChange(NO_FILTERS)} disabled={n === 0}>Réinitialiser</button>
          <button type="button" className="filt__apply" onClick={onClose}>Voir {resultCount} produit{resultCount > 1 ? "s" : ""}</button>
        </div>
      </aside>
    </>,
    document.body,
  );
}
