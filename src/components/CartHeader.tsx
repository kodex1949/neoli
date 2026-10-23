"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

// En-tête réduit du panier : « Retour » à gauche, logo au centre (comme dior.com/cart)
export function CartHeader() {
  const router = useRouter();
  return (
    <header className="cart-header">
      <button
        type="button"
        className="cart-header__back"
        onClick={() => (window.history.length > 1 ? router.back() : router.push("/"))}
      >
        <svg viewBox="0 0 8 12" aria-hidden="true"><path d="m6.5 1-5 5 5 5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" /></svg>
        Retour
      </button>
      <Link href="/" className="logo" aria-label="Accueil">ESSNC</Link>
      <span />
    </header>
  );
}
