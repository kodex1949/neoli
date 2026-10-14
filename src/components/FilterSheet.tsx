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

export type Filters = { cats: string[]; price: PriceRange; badges: string[]; intens: string[]; formats: string[]; sizes: string[]; engrave: boolean };
export const NO_FILTERS: Filters = { cats: [], price: "all", badges: [], intens: [], formats: [], sizes: [], engrave: false };
export const countFilters = (f: Filters) => f.cats.length + (f.price !== "all" ? 1 : 0) + f.badges.length + f.intens.length + f.formats.length + f.sizes.length + (f.engrave ? 1 : 0);

/** Valeurs proposées, calculées depuis les produits de la collection. */
export type FilterFacets = { categories: string[]; badges: string[]; intens: string[]; formats: string[]; sizes: string[]; engraving: boolean };
export const INTENSITY_LABELS: Record<string, string> = { "1": "1 · Très léger", "2": "2 · Léger", "3": "3 · Modéré", "4": "4 · Intense", "5": "5 · Très intense" };

type SortOption = { value: string; label: string };

type Props = {
  open: boolean;
  onClose: () => void;
  filters: Filters;
  onChange: (f: Filters) => void;
  facets: FilterFacets;
  resultCount: number;
  sort: string;
  sortOptions: SortOption[];
  onSort: (v: string) => void;
};

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

/** Panneau « Filtrer & Trier » façon Dior : liste de rubriques, chaque rubrique s'ouvre dans une vue avec retour. */
export function FilterSheet({ open, onClose, filters, onChange, facets, resultCount, sort, sortOptions, onSort }: Props) {
  const [mounted, setMounted] = useState(false);
  const [view, setView] = useState<string | null>(null);
  useEffect(() => setMounted(true), []);
  const sheet = useSheetDrag(onClose);

  useEffect(() => {
    if (!open) { setView(null); return; }
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.documentElement.style.overflow = prev; };
  }, [open, onClose]);

  if (!mounted) return null;
  const { categories, badges } = facets;
  const n = countFilters(filters);
  const priceLabel = PRICE_RANGES.find((r) => r.value === filters.price)?.label ?? "";
  const sortLabel = sortOptions.find((o) => o.value === sort)?.label ?? "";

  const opt = (type: "checkbox" | "radio", checked: boolean, label: string, onToggle: () => void) => (
    <label key={label} className="filt__opt" data-on={checked}>
      <span>{label}</span>
      <input type={type} name={type === "radio" ? `r-${view}` : undefined} checked={checked} onChange={onToggle} />
      <b aria-hidden="true" data-type={type}><svg viewBox="0 0 12 12"><path d="m2.5 6.2 2.4 2.4 4.6-5" /></svg></b>
    </label>
  );

  type Group = { id: string; title: string; summary: string; body: React.ReactNode };
  const groups: Group[] = [
    { id: "tri", title: "Trier par", summary: sortLabel, body: sortOptions.map((o) => opt("radio", sort === o.value, o.label, () => onSort(o.value))) },
  ];
  const multi = (id: string, title: string, values: string[], selected: string[], key: "cats" | "badges" | "intens" | "formats" | "sizes", label: (v: string) => string = (v) => v) => {
    if (values.length === 0) return;
    groups.push({ id, title, summary: selected.map(label).join(", "), body: values.map((v) => opt("checkbox", selected.includes(v), label(v), () => onChange({ ...filters, [key]: toggle(selected, v) }))) });
  };
  multi("cat", "Catégorie", categories, filters.cats, "cats");
  groups.push({ id: "prix", title: "Prix", summary: filters.price !== "all" ? priceLabel : "", body: PRICE_RANGES.map((r) => opt("radio", filters.price === r.value, r.label, () => onChange({ ...filters, price: r.value }))) });
  multi("int", "Intensité", facets.intens, filters.intens, "intens", (v) => INTENSITY_LABELS[v] ?? v);
  multi("fmt", "Format", facets.formats, filters.formats, "formats");
  multi("size", "Contenance & déclinaison", facets.sizes, filters.sizes, "sizes");
  multi("sel", "Sélection", badges, filters.badges, "badges");

  const current = groups.find((g) => g.id === view) ?? null;
  const counts: Record<string, number> = { tri: 0, cat: filters.cats.length, prix: filters.price !== "all" ? 1 : 0, sel: filters.badges.length, int: filters.intens.length, fmt: filters.formats.length, size: filters.sizes.length };

  return createPortal(
    <>
      <div className="sheet__scrim sheet__scrim--menu" data-open={open} onClick={onClose} aria-hidden="true" />
      <aside className="sheet sheet--menu filt" ref={sheet.ref} data-open={open} role="dialog" aria-label="Filtrer et trier" inert={!open}>
        <div className="sheet__grab" {...sheet.grab} />
        <div className="filt__bar">
          {current ? (
            <button type="button" className="filt__icon" onClick={() => setView(null)} aria-label="Retour">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m14.5 6-6 6 6 6" /></svg>
            </button>
          ) : <span className="filt__icon" aria-hidden="true" />}
          <h2>{current ? current.title : "Filtrer & Trier"}</h2>
          <button type="button" className="filt__icon" onClick={onClose} aria-label="Fermer">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 17.5 17.5 6.5" /><path d="M6.5 6.5 17.5 17.5" /></svg>
          </button>
        </div>

        <div className="sheet__body filt__body" key={view ?? "root"}>
          {current ? (
            <div className="filt__list">{current.body}</div>
          ) : (
            <>
            {facets.engraving && (
              <label className="filt__quick" data-on={filters.engrave}>
                <input type="checkbox" checked={filters.engrave} onChange={() => onChange({ ...filters, engrave: !filters.engrave })} />
                <b aria-hidden="true" data-type="checkbox"><svg viewBox="0 0 12 12"><path d="m2.5 6.2 2.4 2.4 4.6-5" /></svg></b>
                <span>Personnalisable (gravure)</span>
              </label>
            )}
            <ul className="filt__rows">
              {groups.map((g) => (
                <li key={g.id}>
                  <button type="button" className="filt__row" onClick={() => setView(g.id)}>
                    <span className="filt__label" data-on={counts[g.id] > 0 || g.id === "tri"}>
                      {g.title}{counts[g.id] > 0 && <em>({counts[g.id]})</em>}
                    </span>
                    {g.summary && <span className="filt__sum">{g.summary}</span>}
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6" /></svg>
                  </button>
                </li>
              ))}
            </ul>
            </>
          )}
        </div>

        <div className="filt__foot">
          <button type="button" className="filt__reset" onClick={() => onChange(NO_FILTERS)} disabled={n === 0}>Effacer tous les filtres</button>
          <button type="button" className="filt__apply" onClick={onClose}>Voir les {resultCount} produit{resultCount > 1 ? "s" : ""}</button>
        </div>
      </aside>
    </>,
    document.body,
  );
}
