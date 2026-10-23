"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import type { Product } from "@/lib/shopify";
import { useCart } from "@/lib/cart";

type Media = { eyebrow?: string; title: string; href: string; cta: string; image?: string; video?: string };

const COLLECTION_OF: Record<string, string> = { parfums: "parfums", maquillage: "maquillage", soins: "soin", soin: "soin", bougies: "bougies", "bougies & maison": "bougies" };
const slug = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

function Order({ product }: { product: Product }) {
  const { add } = useCart();
  const [done, setDone] = useState(false);
  const t = useRef<number | undefined>(undefined);
  return (
    <button
      type="button"
      className="icd__order"
      data-done={done}
      onClick={() => {
        add({ id: product.id, handle: product.handle, title: product.title, price: product.price, image: product.image?.url, variantId: product.variantId });
        setDone(true);
        window.clearTimeout(t.current);
        t.current = window.setTimeout(() => setDone(false), 1800);
      }}
    >
      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 8h14l-1 12H6L5 8Z" /><path d="M9 8V7a3 3 0 0 1 6 0v1" /></svg>
      <span>{done ? "Ajouté" : "Commander"}</span>
    </button>
  );
}

/**
 * « Les iconiques » à la façon de dior.com : visuel plein cadre à gauche (image ou vidéo, modifiable dans l'admin),
 * à droite le titre centré, des onglets par catégorie, quatre tuiles (nom, prix, « Commander ») et un lien vers la sélection.
 */
export function IconicsTabs({ title, products, media, reverse = false, id = "icd", allHandle = "best-sellers", plain = false, eyebrow, intro, count = 4, moreLabel }: { title: string; products: Product[]; media: Media; reverse?: boolean; id?: string; allHandle?: string; plain?: boolean; eyebrow?: string; intro?: string; count?: number; moreLabel?: string }) {
  const cats = useMemo(() => [...new Set(products.map((p) => p.category).filter((c): c is string => !!c))], [products]);
  const tabs = useMemo(() => (!plain && cats.length > 1 ? ["Tout", ...cats] : ["Tout"]), [cats]);
  const [tab, setTab] = useState(0);
  const vid = useRef<HTMLVideoElement>(null);
  const root = useRef<HTMLElement>(null);
  const pin = useRef<HTMLDivElement>(null);

  // Animation du héros de dior.com : le visuel part d'un grand cadre centré puis, au défilement, se range dans sa colonne
  // pendant que le texte apparaît (variable --q : 1 = cadre, 0 = colonne). Pilotée par le défilement, sans saccade.
  useEffect(() => {
    const el = root.current;
    const box = pin.current;
    if (!el || !box || !plain) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) { el.style.setProperty("--q", "0"); return; }
    let raf = 0;
    const tick = () => {
      raf = 0;
      // La section reste collée à l'écran pendant que l'on défile dans `box` : 0 = premier visuel (cadre), 1 = produits affichés
      const r = box.getBoundingClientRect();
      const run = Math.max(1, r.height - window.innerHeight);
      const t = Math.min(1, Math.max(0, -r.top / run));
      const e = t * t * (3 - 2 * t); // smoothstep
      el.style.setProperty("--q", (1 - e).toFixed(4));
    };
    const on = () => { if (!raf) raf = requestAnimationFrame(tick); };
    tick();
    window.addEventListener("scroll", on, { passive: true });
    window.addEventListener("resize", on);
    return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); if (raf) cancelAnimationFrame(raf); };
  }, [plain]);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const label = tabs[tab] ?? "Tout";
  const shown = (label === "Tout" ? products : products.filter((p) => p.category === label)).slice(0, count);
  const handle = label === "Tout" ? allHandle : COLLECTION_OF[slug(label)] ?? allHandle;

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
    e.preventDefault();
    const n = (tab + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    setTab(n);
    (e.currentTarget.querySelectorAll("[role=tab]")[n] as HTMLElement | undefined)?.focus();
  };

  if (!products.length) return null;
  const body = (
    <section ref={root} className={`icd${plain ? " icd--plain" : ""}`} data-reverse={reverse} aria-label={title}>
      <div className="icd__media">
        <div className="icd__bleed">
          {media.video ? (
            <video ref={vid} src={media.video} autoPlay muted loop playsInline preload="metadata" onPlay={() => setPlaying(true)} onPause={() => setPlaying(false)} />
          ) : media.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={media.image} alt="" loading="lazy" />
          ) : null}
          <span className="icd__shade" />
          <div className="icd__cap">
            {media.eyebrow && <span>{media.eyebrow}</span>}
            {media.title && <h3>{media.title}</h3>}
            <Link href={media.href}>{media.cta}</Link>
          </div>
          {media.video && (
            <div className="icd__ctl">
              <button type="button" aria-label={muted ? "Activer le son" : "Couper le son"} onClick={() => { const v = vid.current; if (!v) return; v.muted = !v.muted; setMuted(v.muted); }}>
                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9.5h3.5L12 6v12l-4.5-3.5H4z" />{muted ? <path d="m16 9.5 4 5m0-5-4 5" /> : <path d="M15.5 9a4 4 0 0 1 0 6M17.8 6.8a7 7 0 0 1 0 10.4" />}</svg>
              </button>
              <button type="button" aria-label={playing ? "Mettre en pause" : "Lire"} onClick={() => { const v = vid.current; if (!v) return; if (v.paused) void v.play(); else v.pause(); }}>
                <svg viewBox="0 0 24 24" aria-hidden="true">{playing ? <path d="M9 7v10M15 7v10" /> : <path d="m9 7 8 5-8 5z" />}</svg>
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="icd__panel">
        {eyebrow && <p className="icd__eyebrow">{eyebrow}</p>}
        <h2 className="icd__title">{title}</h2>
        {intro && <p className="icd__intro">{intro}</p>}
        {tabs.length > 1 && (
          <div className="icd__tabs" role="tablist" aria-label="Catégories" onKeyDown={onKey} style={{ "--d": 1 } as React.CSSProperties}>
            {tabs.map((t, i) => (
              <button key={t} type="button" role="tab" id={`${id}-tab-${i}`} aria-selected={i === tab} aria-controls={`${id}-panel`} tabIndex={i === tab ? 0 : -1} onClick={() => setTab(i)}>{t}</button>
            ))}
          </div>
        )}
        <ul className="icd__grid" id={`${id}-panel`} role={tabs.length > 1 ? "tabpanel" : undefined} aria-labelledby={tabs.length > 1 ? `${id}-tab-${tab}` : undefined} key={label}>
          {shown.map((p, i) => {
            const amb = !plain && p.images && p.images.length > 1 ? p.images[1] : undefined;
            const img = amb ?? p.image;
            return (
              <li key={p.id} className="icd__tile" style={{ "--i": i } as React.CSSProperties}>
                <Link href={`/produits/${p.handle}`} className="icd__img" data-pack={!amb} aria-label={p.title} tabIndex={-1}>
                  {img && <Image src={img.url} alt="" width={img.width} height={img.height} sizes="(max-width: 900px) 46vw, 15vw" />}
                </Link>
                <Link href={`/produits/${p.handle}`} className="icd__name">{p.title}</Link>
                <span className="icd__price">{p.variants && p.variants.length > 1 ? `Dès ${p.price}` : p.price}</span>
                <Order product={p} />
              </li>
            );
          })}
        </ul>
        <Link href={`/collections/${handle}`} className="icd__more">
          {plain ? (moreLabel || "Découvrir la sélection") : "Découvrir la sélection"}{!plain && (label === "Tout" ? "" : ` ${label.toLowerCase()}`)}
        </Link>
      </div>
    </section>
  );
  return plain ? <div ref={pin} className="icd-pin">{body}</div> : body;
}
