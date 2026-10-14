"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/shopify";
import { unitPriceOf } from "@/lib/unit-price";

/** Barre d'achat flottante en bas de l'écran : produit, déclinaisons, gravure, ajout au panier, paiement express, boutique. */
export function ProductBuy({ product }: { product: Product }) {
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
  const root = useRef<HTMLDivElement>(null);
  const v = variants[sel];
  const price = v?.price ?? product.price;
  const unit = v ? unitPriceOf(v.label, price) : product.format ? unitPriceOf(product.format, price) : null;

  useEffect(() => () => window.clearTimeout(timer.current), []);

  // Au scroll vers le bas, la barre se range sur mobile : seule la ligne d'achat reste visible ; elle se redéploie dès qu'on remonte
  const [compact, setCompact] = useState(false);
  const engraveOpen = useRef(false);
  engraveOpen.current = engrave;
  useEffect(() => {
    let last = window.scrollY;
    let raf = 0;
    const onScroll = () => {
      if (raf) return;
      raf = window.requestAnimationFrame(() => {
        raf = 0;
        const y = window.scrollY;
        const dy = y - last;
        const atEnd = window.innerHeight + y >= document.documentElement.scrollHeight - 60;
        if (Math.abs(dy) > 6) {
          setCompact(y > 160 && dy > 0 && !atEnd && !engraveOpen.current);
          last = y;
        } else if (y < 80 || atEnd) setCompact(false);
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => { window.removeEventListener("scroll", onScroll); if (raf) window.cancelAnimationFrame(raf); };
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

  return (
    <div className="pdp__bar" data-compact={compact} ref={root} role="region" aria-label="Acheter ce produit">
      {product.engraving && (
        <div className="pdp__pop" data-open={engrave} inert={!engrave}>
          <label>
            <span>Votre gravure (12 caractères max.)</span>
            <input value={note} maxLength={12} onChange={(e) => setNote(e.target.value)} placeholder="Ex. : Léa" />
          </label>
          <small>{note.length}/12</small>
        </div>
      )}

      <div className="pdp__bar-row">
        <div className="pdp__bar-info">
          <div className="pdp__meta">
            {product.category && <p className="pdp__cat">{product.category}</p>}
            {product.intensity ? (
              <p className="pdp__intensity" aria-label={`Intensité ${product.intensity} sur 5`}>
            Intensité
            <span aria-hidden="true">{[1, 2, 3, 4, 5].map((n) => <i key={n} data-on={n <= product.intensity!} />)}</span>
          </p>
        ) : null}
          </div>
          <h1 className="pdp__title">{product.title}</h1>
          {product.tagline && <p className="pdp__tagline">{product.tagline}</p>}
        </div>

        {(variants.length > 1 || product.format) && (
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
        )}

        {unit && <p className="pdp__unit">{unit}</p>}

        {product.engraving && (
          <button type="button" className="pdp__engrave-btn" aria-expanded={engrave} aria-label={note ? `Gravure : ${note}` : "Gravure"} data-set={note ? "true" : "false"} onClick={() => setEngrave((o) => !o)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14" /></svg>
            {note ? `Gravure : ${note}` : "Gravure"}
          </button>
        )}

        <div className="pdp__bar-actions">
          <button type="button" className="pdp__cta" data-done={done} onClick={addToCart}>
            <span>{done ? "Ajouté au panier" : "Ajouter au panier"}</span>
            <span>{price}</span>
          </button>
          <button type="button" className="pdp__express" onClick={express} disabled={busy}>
            <span>{busy ? "Redirection…" : "Paiement express"}</span>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 11V8a5 5 0 0 1 10 0v3" /><rect x="5" y="11" width="14" height="9" rx="2" /></svg>
          </button>
        </div>
      </div>

      <p className="pdp__bar-foot">
        {error ? <span role="alert">{error}</span> : <span>Paiement sécurisé par Shopify. Taxes incluses.</span>}
        <a href={`mailto:contact@maison.example?subject=${encodeURIComponent(`Disponibilité en boutique : ${product.title}`)}`}>Vérifier la disponibilité en boutique</a>
      </p>
    </div>
  );
}
