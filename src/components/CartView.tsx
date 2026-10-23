"use client";

import Link from "next/link";
import { eur, FREE_SHIPPING_FROM, SHIPPING, useCart, useCheckout } from "@/lib/cart";
import type { Product } from "@/lib/shopify";
import { ProductCard } from "./ProductCard";

const Bag = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V7a3 3 0 0 1 6 0v1" /></svg>
);

export function CartView({ suggestions }: { suggestions: Product[] }) {
  const { lines, count, subtotal, ready, setQty, remove } = useCart();
  const { busy, error, checkout } = useCheckout();

  const shipping = subtotal >= FREE_SHIPPING_FROM || subtotal === 0 ? 0 : SHIPPING;
  const total = subtotal + shipping;
  const empty = ready && lines.length === 0;

  return (
    <div className="cart">
      <div className="cart__head">
        <h1 className="cart__title">Votre panier</h1>
        <span className="cart__count">{ready ? `${count} article${count > 1 ? "s" : ""}` : ""}</span>
      </div>

      <Link href="/compte" className="cart__banner">
        Connectez-vous pour profiter des avantages du Cercle ESSNC
      </Link>
      <p className="cart__banner-sub">Bénéficiez de la livraison offerte et d&apos;autres privilèges exclusifs avec votre compte.</p>

      {empty && (
        <div className="cart__empty">
          <Bag />
          <p>Vous n&apos;avez pas de produit dans votre panier</p>
          <Link href="/" className="cart__ghost">Retour à la boutique</Link>
        </div>
      )}

      {ready && lines.length > 0 && (
        <div className="cart__layout">
          <ul className="cart__lines">
            {lines.map((l) => (
              <li key={l.id} className="cart__line">
                <Link href={`/produits/${l.handle}`} className="cart__thumb">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  {l.image ? <img src={l.image} alt="" /> : <span />}
                </Link>
                <div className="cart__info">
                  <Link href={`/produits/${l.handle}`} className="cart__name">{l.title}</Link>
                  <span className="cart__unit">{l.price}</span>
                  {l.note && <span className="cart__unit">Gravure : « {l.note} »</span>}
                  <div className="cart__qty" role="group" aria-label={`Quantité de ${l.title}`}>
                    <button type="button" onClick={() => setQty(l.id, l.qty - 1)} aria-label="Diminuer">−</button>
                    <span aria-live="polite">{l.qty}</span>
                    <button type="button" onClick={() => setQty(l.id, l.qty + 1)} aria-label="Augmenter">+</button>
                  </div>
                </div>
                <div className="cart__side">
                  <span className="cart__sum">{eur(l.qty * l.unit)}</span>
                  <button type="button" className="cart__remove" onClick={() => remove(l.id)}>Supprimer</button>
                </div>
              </li>
            ))}
          </ul>

          <aside className="cart__summary" aria-label="Récapitulatif">
            <h2 className="cart__summary-title">Récapitulatif</h2>
            <dl>
              <div><dt>Sous-total</dt><dd>{eur(subtotal)}</dd></div>
              <div><dt>Livraison</dt><dd>{shipping === 0 ? "Offerte" : eur(shipping)}</dd></div>
              <div className="cart__total"><dt>Total TTC</dt><dd>{eur(total)}</dd></div>
            </dl>
            {shipping > 0 && <p className="cart__note">Plus que {eur(FREE_SHIPPING_FROM - subtotal)} pour la livraison offerte.</p>}
            <button type="button" className="cart__checkout" onClick={checkout} disabled={busy}>
              {busy ? "Redirection…" : "Commander"}
            </button>
            {error && <p className="cart__error" role="alert">{error}</p>}
            <p className="cart__note">Paiement sécurisé. Taxes incluses.</p>
          </aside>
        </div>
      )}

      {suggestions.length > 0 && (
        <section className="cart__more">
          <h2 className="cart__more-title">Vous aimerez aussi</h2>
          <div className="cart__more-grid">
            {suggestions.slice(0, 4).map((p) => <ProductCard key={p.id} product={p} />)}
          </div>
        </section>
      )}

      <div className="cart__contact">
        <div>
          <strong>Nous contacter</strong>
          <span>Un ambassadeur est à votre écoute par message ou par téléphone.</span>
        </div>
        <a href="mailto:contact@essnc.example" aria-label="Écrire chez ESSNC">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16v10H9l-5 4V6Z" /></svg>
        </a>
      </div>
    </div>
  );
}
