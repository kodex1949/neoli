"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/shopify";
import { unitParts } from "@/lib/unit-price";

/** Panneau d'achat à droite du visuel (façon dior.com) : produit, déclinaisons, gravure, ajout au panier, paiement express, boutique. */
/** Ajoute n jours ouvrés (lun.-ven.) à une date. */
function addBusinessDays(from: Date, n: number) {
  const d = new Date(from);
  while (n > 0) { d.setDate(d.getDate() + 1); if (d.getDay() !== 0 && d.getDay() !== 6) n--; }
  return d;
}
/** Fenêtre de livraison standard : 3 à 5 jours ouvrés (cf. « Livraison & retours »). */
function deliveryRange(now = new Date()) {
  const f = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric", month: "long" });
  const short = new Intl.DateTimeFormat("fr-FR", { weekday: "short", day: "numeric" });
  const a = addBusinessDays(now, 3), b = addBusinessDays(now, 5);
  return a.getMonth() === b.getMonth() ? `${short.format(a)} – ${f.format(b)}` : `${f.format(a)} – ${f.format(b)}`;
}

export function ProductBuy({ product, rating }: { product: Product; rating?: { average: number; count: number } }) {
  const { add } = useCart();
  const variants = product.variants ?? [];
  const start = Math.max(0, variants.findIndex((v) => v.price === product.price));
  const [sel, setSel] = useState(start);
  const [done, setDone] = useState(false);
  const [engrave, setEngrave] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const timer = useRef<number | undefined>(undefined);
  const root = useRef<HTMLElement>(null);
  const v = variants[sel];
  const price = v?.price ?? product.price;
  const unit = v ? unitParts(v.label, price) ?? (v.measure ? unitParts(v.measure, price) : null) : product.format ? unitParts(product.format, price) : null;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Barre « Commander » flottante : elle monte du bas dès que le bouton principal sort de l'écran (comme dior.com)
  const main = useRef<HTMLButtonElement>(null);
  const [floating, setFloating] = useState(false);
  const [delivery, setDelivery] = useState("");
  useEffect(() => setDelivery(deliveryRange()), []);
  useEffect(() => {
    const el = main.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setFloating(!e.isIntersecting), { threshold: 0 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // la fenêtre de gravure se ferme avec Échap ou un clic à côté
  useEffect(() => {
    if (!engrave) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setEngrave(false); };
    const onDown = (e: MouseEvent) => { if (!root.current?.contains(e.target as Node)) setEngrave(false); };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => { window.removeEventListener("keydown", onKey); document.removeEventListener("mousedown", onDown); };
  }, [engrave]);

  const addToCart = () => {
    add({
      id: `${v ? `${product.id}:${v.id ?? v.label}` : product.id}${note.trim() ? `|${note.trim()}` : ""}`,
      note: note.trim() || undefined,
      handle: product.handle,
      title: v ? `${product.title} · ${v.label}` : product.title,
      price,
      image: product.image?.url ?? product.images?.[0]?.url,
      variantId: v?.id ?? product.variantId,
    });
    setDone(true);
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setDone(false), 1800);
  };

  // Paiement express : commande directe de cet article, sans passer par le panier
  const express = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: [{ variantId: v?.id ?? product.variantId, quantity: 1, note: note.trim() || undefined }] }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      if (data.url) { window.location.href = data.url; return; }
      setError(data.error ?? "Le paiement n'est pas disponible pour le moment.");
    } catch {
      setError("Le paiement n'est pas disponible pour le moment.");
    } finally {
      setBusy(false);
    }
  };

  const sizes = (variants.length > 1 || product.format) && (
    <div className="pdp__variants" role="radiogroup" aria-label="Déclinaison">
      {variants.length > 1 ? (
        variants.map((o, k) =>
          o.color ? (
            <button key={o.label} type="button" role="radio" aria-checked={k === sel} aria-label={o.label} title={o.label} className="pdp__swatch" style={{ background: o.color }} onClick={() => setSel(k)} />
          ) : (
            <button key={o.label} type="button" role="radio" aria-checked={k === sel} className="pdp__size" onClick={() => setSel(k)}>{o.label}</button>
          ),
        )
      ) : (
        <span className="pdp__size" data-solo="true">{product.format}</span>
      )}
    </div>
  );

  return (
    <>
      <aside className="pdpb" ref={root} aria-label="Acheter ce produit">
        <div className="pdpb__in">
          {product.category && <p className="pdp__cat">{product.category}</p>}
          <h1 className="pdp__title">{product.title}</h1>
          {product.tagline && <p className="pdp__tagline">{product.tagline}</p>}
          <div className="pdpb__meta">
            <button type="button" className="pdpb__rating" data-empty={!rating || rating.count === 0} onClick={() => document.querySelector<HTMLButtonElement>("#avis .rev__row")?.click()}>
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3.5 2.6 5.3 5.9.9-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.9L12 3.5Z" /></svg>
              {rating && rating.count > 0
                ? <span>{rating.average.toFixed(1).replace(".", ",")} <i>({rating.count} avis)</i></span>
                : <span>Donner mon avis</span>}
            </button>
            {product.intensity ? (
              <p className="pdp__intensity" aria-label={`Intensité ${product.intensity} sur 5`}>
                Intensité
                <span aria-hidden="true">{[1, 2, 3, 4, 5].map((n) => <i key={n} data-on={n <= product.intensity!} />)}</span>
              </p>
            ) : null}
          </div>

          {sizes}
          {unit && (
            <p className="pdpb__unit" key={`${unit.qty}-${unit.value}`}>
              <span>{unit.label}</span><strong>{unit.value}</strong><span className="pdpb__unit-qty">· {unit.qty}</span>
            </p>
          )}

          {product.engraving && (
            <div className="pdp__engrave" data-open={engrave}>
              <button type="button" className="pdp__engrave-head" aria-expanded={engrave} onClick={() => setEngrave((o) => !o)}>
                <span><strong>{note ? `Gravure : ${note}` : "Ajouter une touche personnelle"}</strong><small>Service de gravure</small></span>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
              </button>
              <div className="pdp__engrave-body" inert={!engrave}>
                <div>
                  <label>
                    <span>Votre gravure (12 caractères max.)</span>
                    <input value={note} maxLength={12} onChange={(e) => setNote(e.target.value)} placeholder="Ex. : Léa" />
                  </label>
                  <small>{note.length}/12</small>
                </div>
              </div>
            </div>
          )}

          <button ref={main} type="button" className="pdp__cta" data-done={done} onClick={addToCart}>
            <span>{done ? "Ajouté au panier" : "Commander"}</span>
            <span>{price}</span>
          </button>
          <div className="pdpb__pay" role="group" aria-label="Paiement express">
            <p className="pdpb__pay-label"><span>Paiement express</span></p>
            <div className="pdpb__wallets">
              <button type="button" className="pdpb__wallet" onClick={express} disabled={busy} aria-label="Payer avec Apple Pay">{busy ? "…" : "Apple Pay"}</button>
              <button type="button" className="pdpb__wallet" onClick={express} disabled={busy} aria-label="Payer avec Google Pay">{busy ? "…" : "Google Pay"}</button>
            </div>
          </div>
          {error
            ? <p className="pdpb__note" role="alert" data-error="true">{error}</p>
            : <p className="pdpb__note">Un échantillon offert avec chaque commande.</p>}
          <ul className="pdpb__info" data-ready={!!delivery}>
            <li>
              <span className="pdpb__ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h11v9H3z" /><path d="M14 10h4l3 3v3h-7z" /><circle cx="7.5" cy="17.5" r="1.5" /><circle cx="17.5" cy="17.5" r="1.5" /></svg></span>
              <span className="pdpb__txt">
                <b>Livraison estimée</b>
                <em>{delivery || "3 à 5 jours ouvrés"}</em>
                <small>Offerte dès 100 € d'achat</small>
              </span>
            </li>
            <li>
              <span className="pdpb__ico"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 5 6v5c0 4.5 3 8 7 10 4-2 7-5.5 7-10V6z" /><path d="m9 12 2 2 4-4" /></svg></span>
              <span className="pdpb__txt">
                <b>Produit authentique</b>
                <small>De la marque, vendu et expédié par ESSNC</small>
              </span>
            </li>
          </ul>
        </div>
      </aside>

      {/* Barre flottante : monte du bas de l'écran quand le bouton principal n'est plus visible */}
      <div className="pdpf" data-show={floating} aria-hidden={!floating}>
        <button type="button" className="pdpf__btn" tabIndex={floating ? 0 : -1} onClick={addToCart}>
          <span>{done ? "Ajouté au panier" : "Commander"}</span>
          <span>{price}</span>
        </button>
      </div>
    </>
  );
}
