"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { track } from "@/lib/track";

// Panier côté navigateur (localStorage). Le paiement passe ensuite par Shopify (voir /api/checkout).
export type CartLine = {
  id: string;
  handle: string;
  title: string;
  price: string; // déjà formaté, ex. « 48,00 € »
  unit: number; // prix unitaire en nombre
  image?: string;
  variantId?: string; // variante Shopify, nécessaire pour payer
  note?: string; // personnalisation (gravure), transmise à Shopify comme attribut de ligne
  qty: number;
};

type NewLine = Omit<CartLine, "qty" | "unit">;

export type Added = { n: number; title: string; image?: string; price: string };

type Ctx = {
  lines: CartLine[];
  lastAdded: Added | null; // dernier produit ajouté (alimente la notification)
  count: number;
  subtotal: number;
  ready: boolean;
  panelOpen: boolean; // panneau du panier ouvert (sous l'icône panier)
  openPanel: () => void;
  closePanel: () => void;
  add: (line: NewLine, qty?: number) => void;
  setQty: (id: string, qty: number) => void;
  remove: (id: string) => void;
  clear: () => void;
};

const KEY = "maison-cart-v1";
const CartContext = createContext<Ctx | null>(null);

export const eur = (n: number) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: "EUR" }).format(n);

const toNumber = (price: string) => {
  const n = parseFloat(price.replace(/[^\d,.-]/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export function CartProvider({ children }: { children: ReactNode }) {
  const [lines, setLines] = useState<CartLine[]>([]);
  const [ready, setReady] = useState(false);
  const [panelOpen, setPanelOpen] = useState(false);
  const [lastAdded, setLastAdded] = useState<Added | null>(null);
  const linesRef = useRef<CartLine[]>([]);
  linesRef.current = lines;
  const openPanel = useCallback(() => setPanelOpen(true), []);
  const closePanel = useCallback(() => setPanelOpen(false), []);

  // Lecture au montage (évite l'écart d'hydratation) + synchronisation entre onglets
  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem(KEY);
        setLines(raw ? (JSON.parse(raw) as CartLine[]) : []);
      } catch {
        setLines([]);
      }
    };
    read();
    setReady(true);
    const onStorage = (e: StorageEvent) => { if (e.key === KEY) read(); };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  useEffect(() => {
    if (!ready) return;
    try { localStorage.setItem(KEY, JSON.stringify(lines)); } catch { /* stockage indisponible */ }
  }, [lines, ready]);

  const add = useCallback((line: NewLine, qty = 1) => {
    setLastAdded({ n: Date.now(), title: line.title, image: line.image, price: line.price });
    track("add_to_cart", { handle: line.handle, v: Math.round((linesRef.current.reduce((n, l) => n + l.qty * l.unit, 0) + toNumber(line.price) * qty) * 100) / 100 });
    setLines((prev) => {
      const found = prev.find((l) => l.id === line.id);
      if (found) return prev.map((l) => (l.id === line.id ? { ...l, qty: Math.min(99, l.qty + qty) } : l));
      return [...prev, { ...line, unit: toNumber(line.price), qty }];
    });
  }, []);

  const setQty = useCallback((id: string, qty: number) => {
    setLines((prev) => prev.flatMap((l) => (l.id !== id ? [l] : qty <= 0 ? [] : [{ ...l, qty: Math.min(99, qty) }])));
  }, []);

  const remove = useCallback((id: string) => setLines((prev) => prev.filter((l) => l.id !== id)), []);
  const clear = useCallback(() => setLines([]), []);

  const value = useMemo<Ctx>(() => {
    const count = lines.reduce((n, l) => n + l.qty, 0);
    const subtotal = lines.reduce((n, l) => n + l.qty * l.unit, 0);
    return { lines, lastAdded, count, subtotal, ready, panelOpen, openPanel, closePanel, add, setQty, remove, clear };
  }, [lines, lastAdded, ready, panelOpen, openPanel, closePanel, add, setQty, remove, clear]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart doit être utilisé dans <CartProvider>");
  return ctx;
}

export const FREE_SHIPPING_FROM = 100; // livraison offerte dès 100 €
export const SHIPPING = 5.9;

/** Transforme le panier en paiement Shopify (via /api/checkout) et redirige vers la page de paiement. */
export function useCheckout() {
  const { lines } = useCart();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const checkout = async () => {
    setBusy(true);
    setError("");
    track("begin_checkout", { v: Math.round(lines.reduce((n, l) => n + l.qty * l.unit, 0) * 100) / 100 });
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: lines.map((l) => ({ variantId: l.variantId, quantity: l.qty, note: l.note })) }),
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
  return { busy, error, checkout };
}
