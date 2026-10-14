"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useSheetDrag } from "@/lib/sheet";
import { useCart } from "@/lib/cart";
import { useFavorites } from "@/lib/favorites";

type Props = { open: boolean; onClose: () => void; pos: { top: number; right: number } };
type Item = { id: string; handle: string; title: string; price: string; image?: { url: string }; variantId?: string };

/** Panneau Favoris : même verre dépoli que le panier et le compte, ancré sous l'icône cœur. */
export function FavoritesPanel({ open, onClose, pos }: Props) {
  const { handles, toggle, loggedIn } = useFavorites();
  const { add } = useCart();
  const sheet = useSheetDrag(onClose);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const key = handles.join(",");

  useEffect(() => {
    if (!open || !key) { if (!key) setItems([]); return; }
    let live = true;
    setLoading(true);
    fetch(`/api/favorites?handles=${encodeURIComponent(key)}`)
      .then((r) => r.json())
      .then((d) => { if (live) setItems(d.products ?? []); })
      .catch(() => { if (live) setItems([]); })
      .finally(() => { if (live) setLoading(false); });
    return () => { live = false; };
  }, [open, key]);

  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.documentElement.style.overflow = prev; window.removeEventListener("keydown", onKey); };
  }, [open, onClose]);

  const shown = items.filter((i) => handles.includes(i.handle));

  return (
    <>
      {open && <div className="search__scrim" onClick={onClose} aria-hidden="true" />}
      <div ref={sheet.ref} className="user cartp favp" data-open={open} role="dialog" aria-label="Mes favoris" inert={!open} style={{ top: pos.top, right: pos.right }}>
        <div className="user__inner">
          <div className="user__grab" aria-hidden="true" {...sheet.grab} />
          <div className="user__top">
            <button type="button" className="user__close" onClick={onClose} aria-label="Fermer">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 17.5 17.5 6.5" /><path d="M6.5 6.5 17.5 17.5" /></svg>
            </button>
          </div>

          <div className="user__body">
            <h2 className="user__title">Mes favoris</h2>
            {loggedIn === false ? (
              <>
                <p className="user__lead">Connectez-vous pour retrouver ici les produits que vous avez aimés.</p>
                <Link href="/connexion?next=/compte/favoris" onClick={onClose} className="user__submit favp__cta" data-ready="true">Se connecter</Link>
              </>
            ) : handles.length === 0 ? (
              <>
                <p className="user__lead">Touchez le cœur d'un produit pour le retrouver ici.</p>
                <Link href="/collections/parfums" onClick={onClose} className="user__btn cartp__view">Découvrir les parfums</Link>
              </>
            ) : (
              <>
                <p className="user__lead">{handles.length} produit{handles.length > 1 ? "s" : ""}</p>
                {loading && shown.length === 0 && <p className="user__lead">Chargement…</p>}
                <ul className="cartp__lines">
                  {shown.map((p) => (
                    <li key={p.id} className="cartp__line">
                      <Link href={`/produits/${p.handle}`} className="cartp__thumb" onClick={onClose}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {p.image ? <img src={p.image.url} alt="" /> : <span />}
                      </Link>
                      <div className="cartp__info">
                        <Link href={`/produits/${p.handle}`} className="cartp__name" onClick={onClose}>{p.title}</Link>
                        <span className="cartp__unit">{p.price}</span>
                        <div className="cartp__row">
                          <button type="button" className="favp__add" onClick={() => add({ id: p.id, handle: p.handle, title: p.title, price: p.price, image: p.image?.url, variantId: p.variantId })}>Ajouter au panier</button>
                          <button type="button" className="cartp__remove" onClick={() => toggle(p.handle)}>Retirer</button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
                <Link href="/compte/favoris" onClick={onClose} className="user__btn cartp__view">Voir tous mes favoris</Link>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
