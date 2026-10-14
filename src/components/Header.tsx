"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { NavMenu } from "./NavMenu";
import { SearchPanel } from "./SearchPanel";
import { UserPanel } from "./UserPanel";
import { CartPanel } from "./CartPanel";
import { FavoritesPanel } from "./FavoritesPanel";
import { useCart } from "@/lib/cart";
import { useFavorites } from "@/lib/favorites";

const stroke = { strokeLinecap: "round", strokeLinejoin: "round" } as const;

export function Header() {
  const { count: favCount } = useFavorites();
  const { count, panelOpen, openPanel, closePanel } = useCart();
  const pathname = usePathname();
  const [atTop, setAtTop] = useState(true);
  useEffect(() => {
    const onScroll = () => setAtTop(window.scrollY < 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);
  // Sur une fiche produit, l'en-tête est transparent tout en haut : le visuel passe dessous (comme dior.com)
  const clear = pathname.startsWith("/produits/") && atTop;

  const [open, setOpen] = useState(false);
  const burger = useRef<HTMLButtonElement>(null);

  const close = useCallback(() => {
    setOpen(false);
    burger.current?.focus(); // rend le focus au bouton à la fermeture
  }, []);

  // Panneau de recherche : posé sur l'icône loupe (Dior : 16 px à gauche, 12 px sous le haut de l'en-tête)
  const [searchOpen, setSearchOpen] = useState(false);
  const [pos, setPos] = useState({ top: 12, left: 20 });
  const searchBtn = useRef<HTMLButtonElement>(null);

  const [hover, setHover] = useState(false); // survol : la barre blanche apparaît (le panneau s'ouvre au clic)
  const leaveTimer = useRef<number | undefined>(undefined);

  const measure = () => {
    const r = searchBtn.current?.getBoundingClientRect();
    const h = document.querySelector(".header")?.getBoundingClientRect();
    if (r && h) setPos({ top: h.top + 12, left: r.left - 16 });
  };
  const hoverIn = () => {
    // pas d'état « survol » sur mobile / écran tactile : la barre blanche ne doit jamais clignoter à l'ouverture ou à la fermeture
    if (window.matchMedia("(max-width: 640px), (hover: none)").matches) return;
    window.clearTimeout(leaveTimer.current);
    measure();
    setHover(true);
  };
  // petit délai : la souris passe de la loupe à la barre qui la recouvre sans que la barre ne clignote
  const hoverOut = () => {
    leaveTimer.current = window.setTimeout(() => setHover(false), 120);
  };
  const openSearch = () => {
    measure();
    setUserOpen(false);
    closePanel();
    setFavOpen(false);
    setSearchOpen(true);
  };
  // Panneau compte : ancré à droite, sur l'icône compte
  const [userOpen, setUserOpen] = useState(false);
  const [userPos, setUserPos] = useState({ top: 12, right: 20 });
  const userBtn = useRef<HTMLButtonElement>(null);

  const openUser = () => {
    const r = userBtn.current?.getBoundingClientRect();
    const h = document.querySelector(".header")?.getBoundingClientRect();
    if (r && h) setUserPos({ top: h.top + 12, right: document.documentElement.clientWidth - r.right - 16 });
    setSearchOpen(false);
    setHover(false);
    closePanel();
    setFavOpen(false);
    setUserOpen(true);
  };
  const closeUser = useCallback(() => {
    setUserOpen(false);
    userBtn.current?.focus();
  }, []);

  // Panneau favoris : ancré à droite, sur l'icône cœur
  const [favOpen, setFavOpen] = useState(false);
  const [favPos, setFavPos] = useState({ top: 12, right: 20 });
  const favBtn = useRef<HTMLButtonElement>(null);
  const openFav = () => {
    const r = favBtn.current?.getBoundingClientRect();
    const h = document.querySelector(".header")?.getBoundingClientRect();
    if (r && h) setFavPos({ top: h.top + 12, right: document.documentElement.clientWidth - r.right - 16 });
    setSearchOpen(false);
    setHover(false);
    setUserOpen(false);
    closePanel();
    setFavOpen(true);
  };
  const closeFav = useCallback(() => {
    setFavOpen(false);
    favBtn.current?.focus();
  }, []);

  // Panneau panier : ancré à droite, sur l'icône panier (s'ouvre aussi à l'ajout d'un produit)
  const [cartPos, setCartPos] = useState({ top: 12, right: 20 });
  const cartBtn = useRef<HTMLButtonElement>(null);

  useLayoutEffect(() => {
    if (!panelOpen) return;
    const place = () => {
      const r = cartBtn.current?.getBoundingClientRect();
      const h = document.querySelector(".header")?.getBoundingClientRect();
      if (r && h) setCartPos({ top: h.top + 12, right: document.documentElement.clientWidth - r.right - 16 });
    };
    place();
    setSearchOpen(false);
    setHover(false);
    setUserOpen(false);
    setFavOpen(false);
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [panelOpen]);

  const closeCart = useCallback(() => {
    closePanel();
    cartBtn.current?.focus();
  }, [closePanel]);

  const closeSearch = useCallback(() => {
    setSearchOpen(false);
    setHover(false);
    searchBtn.current?.focus();
  }, []);

  return (
    <>
      <header className="header" data-clear={clear}>
        <div className="header__inner">
          <div className="header__side">
            <button
              ref={burger}
              className="icon-btn"
              aria-label="Menu"
              aria-expanded={open}
              aria-controls="site-nav"
              onClick={() => setOpen(true)}
            >
              <svg className="burger" viewBox="0 0 24 24"><path className="burger__a" d="M5.7 8.7h12.6" {...stroke} /><path className="burger__b" d="M5.7 15.3h12.6" {...stroke} /></svg>
            </button>
            <button
              ref={searchBtn}
              className="icon-btn"
              aria-label="Rechercher"
              aria-expanded={searchOpen}
              onClick={openSearch}
              onMouseEnter={hoverIn}
              onMouseLeave={hoverOut}
            >
              <svg viewBox="0 0 24 24"><circle cx="11" cy="11" r="6.5" /><path d="m16 16 4 4" {...stroke} /></svg>
            </button>
          </div>

          <Link href="/" className="logo" aria-label="Accueil">Néoli</Link>

          <div className="header__side header__side--right">
            <button
              ref={userBtn}
              className="icon-btn"
              aria-label="Mon compte"
              aria-expanded={userOpen}
              onClick={openUser}
            >
              <svg viewBox="0 0 24 24"><circle cx="12" cy="8.5" r="3.5" /><path d="M5 20c.8-3.6 3.6-5.5 7-5.5s6.2 1.9 7 5.5" {...stroke} /></svg>
              <span className="badge" />
            </button>
            <button
              ref={favBtn}
              type="button"
              className="icon-btn"
              aria-label={favCount > 0 ? `Mes favoris, ${favCount} produit${favCount > 1 ? "s" : ""}` : "Mes favoris"}
              aria-expanded={favOpen}
              onClick={() => (favOpen ? closeFav() : openFav())}
            >
              <svg viewBox="0 0 24 24"><path d="M12 19.5s-7-4.3-7-9.4A4 4 0 0 1 12 8a4 4 0 0 1 7 2.1c0 5.1-7 9.4-7 9.4Z" {...stroke} /></svg>
              {favCount > 0 && <span className="cart-count">{favCount > 9 ? "9+" : favCount}</span>}
            </button>
            <button
              ref={cartBtn}
              type="button"
              className="icon-btn"
              aria-label={count > 0 ? `Panier, ${count} article${count > 1 ? "s" : ""}` : "Panier"}
              aria-expanded={panelOpen}
              onClick={() => (panelOpen ? closeCart() : openPanel())}
            >
              <svg viewBox="0 0 24 24"><path d="M5 8h14l-1 12H6L5 8Z" {...stroke} /><path d="M9 8V7a3 3 0 0 1 6 0v1" {...stroke} /></svg>
              {count > 0 && <span className="cart-count">{count > 9 ? "9+" : count}</span>}
            </button>
          </div>
        </div>
      </header>

      {/* Hors du <header> : son backdrop-filter piégerait le position: fixed du menu */}
      <NavMenu open={open} onClose={close} />
      <UserPanel open={userOpen} onClose={closeUser} pos={userPos} />
      <FavoritesPanel open={favOpen} onClose={closeFav} pos={favPos} />
      <CartPanel open={panelOpen} onClose={closeCart} pos={cartPos} />
      <SearchPanel
        open={searchOpen}
        hover={hover}
        onOpen={openSearch}
        onHoverIn={hoverIn}
        onHoverOut={hoverOut}
        onClose={closeSearch}
        pos={pos}
      />
    </>
  );
}
