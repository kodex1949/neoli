"use client";

import Link from "next/link";
import { useSheetDrag } from "@/lib/sheet";
import { useEffect } from "react";
import { eur, FREE_SHIPPING_FROM, SHIPPING, useCart, useCheckout } from "@/lib/cart";

type Props = { open: boolean; onClose: () => void; pos: { top: number; right: number } };

/** Panneau panier : même verre dépoli que la recherche et le compte, ancré sous l'icône panier. */
export function CartPanel({ open, onClose, pos }: Props) {
  const { lines, count, subtotal, setQty, remove } = useCart();
  const { busy, error, checkout } = useCheckout();
  const sheet = useSheetDrag(onClose);

  const shipping = subtotal >= FREE_SHIPPING_FROM || subtotal === 0 ? 0 : SHIPPING;
  const total = subtotal + shipping;

  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { document.documentElement.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <>
      {open && <div className="search__scrim" onClick={onClose} aria-hidden="true" />}
      <div
        ref={sheet.ref}
        className="user cartp"
        data-open={open}
        role="dialog"
        aria-label="Panier"
        inert={!open}
        style={{ top: pos.top, right: pos.right }}
      >
        <div className="user__inner">
          <div className="user__grab" aria-hidden="true" {...sheet.grab} />
          <div className="user__top">
            <button type="button" className="user__close" onClick={onClose} aria-label="Fermer">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 17.5 17.5 6.5" /><path d="M6.5 6.5 17.5 17.5" /></svg>
            </button>
          </div>

          <div className="user__body">
            <h2 className="user__title">Votre panier</h2>
            <p className="user__lead">{count > 0 ? `${count} article${count > 1 ? "s" : ""}` : "Vous n'avez pas de produit dans votre panier"}</p>

            {lines.length > 0 && (
              <>
                <ul className="cartp__lines">
                  {lines.map((l) => (
                    <li key={l.id} className="cartp__line">
                      <Link href={`/produits/${l.handle}`} className="cartp__thumb" onClick={onClose}>
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        {l.image ? <img src={l.image} alt="" /> : <span />}
                      </Link>
                      <div className="cartp__info">
                        <Link href={`/produits/${l.handle}`} className="cartp__name" onClick={onClose}>{l.title}</Link>
                        <span className="cartp__unit">{eur(l.qty * l.unit)}</span>
                        {l.note && <span className="cartp__unit">Gravure : « {l.note} »</span>}
                        <div className="cartp__row">
                          <div className="cartp__qty" role="group" aria-label={`Quantité de ${l.title}`}>
                            <button type="button" onClick={() => setQty(l.id, l.qty - 1)} aria-label="Diminuer">−</button>
                            <span aria-live="polite">{l.qty}</span>
                            <button type="button" onClick={() => setQty(l.id, l.qty + 1)} aria-label="Augmenter">+</button>
                          </div>
                          <button type="button" className="cartp__remove" onClick={() => remove(l.id)}>Supprimer</button>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>

                <dl className="cartp__sum">
                  <div><dt>Sous-total</dt><dd>{eur(subtotal)}</dd></div>
                  <div><dt>Livraison</dt><dd>{shipping === 0 ? "Offerte" : eur(shipping)}</dd></div>
                  <div className="cartp__total"><dt>Total TTC</dt><dd>{eur(total)}</dd></div>
                </dl>

                <button type="button" className="user__submit" data-ready="true" onClick={checkout} disabled={busy}>
                  {busy ? "Redirection…" : "Commander"}
                </button>
                {error && <p className="user__msg" data-status="error" role="alert">{error}</p>}
              </>
            )}

            <Link href="/panier" onClick={onClose} className="user__btn cartp__view">
              {lines.length > 0 ? "Voir le panier" : "Découvrir la boutique"}
            </Link>
          </div>
        </div>
      </div>
    </>
  );
}
