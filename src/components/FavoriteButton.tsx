"use client";

import { useFavorites } from "@/lib/favorites";

/** Cœur « ajouter aux favoris » (cartes produit et fiche produit). */
export function FavoriteButton({ handle, title, className = "" }: { handle: string; title: string; className?: string }) {
  const { has, toggle } = useFavorites();
  const on = has(handle);
  return (
    <button
      type="button"
      className={`fav ${className}`.trim()}
      aria-pressed={on}
      aria-label={on ? `Retirer ${title} des favoris` : `Ajouter ${title} aux favoris`}
      onClick={(e) => { e.preventDefault(); e.stopPropagation(); toggle(handle); }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19.5s-7-4.3-7-9.4A4 4 0 0 1 12 8a4 4 0 0 1 7 2.1c0 5.1-7 9.4-7 9.4Z" /></svg>
    </button>
  );
}
