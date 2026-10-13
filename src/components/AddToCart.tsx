"use client";

import { useEffect, useRef, useState } from "react";
import { useCart } from "@/lib/cart";
import type { Product } from "@/lib/shopify";

export function AddToCart({ product }: { product: Product }) {
  const { add } = useCart();
  const [done, setDone] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  return (
    <button
      type="button"
      className="card__add"
      aria-label="Ajouter au panier"
      data-done={done}
      onClick={() => {
        add({ id: product.id, handle: product.handle, title: product.title, price: product.price, image: product.image?.url, variantId: product.variantId });
        setDone(true);
        window.clearTimeout(timer.current);
        timer.current = window.setTimeout(() => setDone(false), 1800);
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V7a3 3 0 0 1 6 0v1" /></svg>
      <span className="card__add-label">{done ? "Ajouté au panier" : "Ajouter au panier"}</span>
    </button>
  );
}
