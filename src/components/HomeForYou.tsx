"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { FavoriteButton } from "@/components/FavoriteButton";
import type { Product } from "@/lib/shopify";

type Pick = { product: Product; why: string[] };
const SEEN_KEY = "maison_stories_seen";
const DURATION = 5500;

/** « Pour vous » façon stories : pastilles sur l'accueil, puis lecteur plein écran (touchez à gauche / à droite, maintenez pour mettre en pause). */
export function HomeForYou() {
  const [picks, setPicks] = useState<Pick[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [seen, setSeen] = useState<string[]>([]);

  useEffect(() => {
    let live = true;
    fetch("/api/for-you", { cache: "no-store" })
      .then((r) => r.json())
      .then((d) => { if (live && Array.isArray(d.picks)) setPicks(d.picks); })
      .catch(() => {});
    try { setSeen(JSON.parse(localStorage.getItem(SEEN_KEY) ?? "[]")); } catch {}
    return () => { live = false; };
  }, []);

  const markSeen = useCallback((id: string) => {
    setSeen((s) => {
      if (s.includes(id)) return s;
      const n = [...s, id];
      try { localStorage.setItem(SEEN_KEY, JSON.stringify(n)); } catch {}
      return n;
    });
  }, []);

  if (!picks.length) return null;
  return (
    <section className="foru" aria-label="Pour vous">
      <header className="foru__head">
        <div>
          <p className="foru__eyebrow">Pour vous</p>
          <h2 className="foru__title">Sélectionnés selon votre profil olfactif</h2>
        </div>
        <Link href="/compte/profil-olfactif" className="foru__link">Modifier mon profil</Link>
      </header>
      <ul className="stories">
        {picks.map(({ product, why }, i) => (
          <li key={product.id}>
            <button type="button" className="stories__card" data-seen={seen.includes(product.id)} onClick={() => setOpen(i)} aria-label={`Voir ${product.title}`}>
              <span className="stories__bars" aria-hidden="true">{picks.map((_, k) => <i key={k} data-on={k === i} />)}</span>
              <span className="stories__img">
                {product.featuredVideo?.url ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img className="stories__vid" src={product.featuredVideo.url} alt="" />
                ) : product.image ? (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img src={product.image.url} alt="" />
                ) : null}
              </span>
              {product.featuredVideo && <span className="stories__play" aria-hidden="true"><svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M8 5.5v13l11-6.5z" /></svg></span>}
              <span className="stories__meta">
                {why.length > 0 && <em>{why.slice(0, 2).join(" · ")}</em>}
                <strong>{product.title}</strong>
                <span>{product.price}</span>
              </span>
              <span className="stories__go" aria-hidden="true">Voir la story</span>
            </button>
          </li>
        ))}
      </ul>
      {open !== null && <StoryViewer picks={picks} start={open} onSeen={markSeen} onClose={() => setOpen(null)} />}
    </section>
  );
}

function StoryViewer({ picks, start, onSeen, onClose }: { picks: Pick[]; start: number; onSeen: (id: string) => void; onClose: () => void }) {
  const [i, setI] = useState(start);
  const [p, setP] = useState(0);
  const [paused, setPaused] = useState(false);
  const holdT = useRef<ReturnType<typeof setTimeout> | null>(null);
  const held = useRef(false);
  const cur = picks[i];
  const video = cur.product.featuredVideo;
  const src = video?.sources?.[0]?.url;

  const next = useCallback(() => { setP(0); setI((n) => { if (n >= picks.length - 1) { onClose(); return n; } return n + 1; }); }, [picks.length, onClose]);
  const prev = useCallback(() => { setP(0); setI((n) => Math.max(0, n - 1)); }, []);

  useEffect(() => { onSeen(cur.product.id); }, [cur.product.id, onSeen]);

  useEffect(() => {
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); else if (e.key === "ArrowRight") next(); else if (e.key === "ArrowLeft") prev(); };
    window.addEventListener("keydown", key);
    return () => { document.body.style.overflow = prevOverflow; window.removeEventListener("keydown", key); };
  }, [next, prev, onClose]);

  // Défilement de la barre (les vidéos pilotent la leur)
  useEffect(() => {
    if (paused || src) return;
    const t = setInterval(() => setP((v) => { const n = v + 50 / DURATION; if (n >= 1) { queueMicrotask(next); return 1; } return n; }), 50);
    return () => clearInterval(t);
  }, [paused, src, next, i]);

  const down = () => { held.current = false; holdT.current = setTimeout(() => { held.current = true; setPaused(true); }, 180); };
  const up = (side: "l" | "r") => {
    if (holdT.current) clearTimeout(holdT.current);
    if (held.current) { setPaused(false); return; }
    side === "l" ? prev() : next();
  };

  return (
    <div className="pvw" role="dialog" aria-modal="true" aria-label="Pour vous" onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="pvw__card" data-video={src ? "true" : "false"}>
        <div className="pvw__bars" aria-hidden="true">
          {picks.map((_, k) => <span key={k}><i style={{ width: `${k < i ? 100 : k === i ? p * 100 : 0}%` }} /></span>)}
        </div>
        <div className="pvw__top">
          <span className="pvw__who"><b>M</b>Pour vous{cur.why.length > 0 && <em> · {cur.why.slice(0, 2).join(" · ")}</em>}</span>
          <button type="button" className="pvw__close" onClick={onClose} aria-label="Fermer">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
          </button>
        </div>

        <div className="pvw__media" key={cur.product.id}>
          {src ? (
            <video src={src} poster={video?.url} autoPlay muted playsInline onEnded={next} onTimeUpdate={(e) => { const v = e.currentTarget; if (v.duration) setP(v.currentTime / v.duration); }} />
          ) : cur.product.image ? (
            /* eslint-disable-next-line @next/next/no-img-element */
            <img src={cur.product.image.url} alt={cur.product.image.alt} />
          ) : null}
        </div>

        <div className="pvw__tap" aria-hidden="true">
          <button type="button" tabIndex={-1} onPointerDown={down} onPointerUp={() => up("l")} onPointerLeave={() => { if (holdT.current) clearTimeout(holdT.current); if (held.current) setPaused(false); }} />
          <button type="button" tabIndex={-1} onPointerDown={down} onPointerUp={() => up("r")} onPointerLeave={() => { if (holdT.current) clearTimeout(holdT.current); if (held.current) setPaused(false); }} />
        </div>

        <div className="pvw__info">
          <div className="pvw__text">
            <h3>{cur.product.title}</h3>
            <p>{cur.product.price}</p>
          </div>
          <FavoriteButton handle={cur.product.handle} title={cur.product.title} className="fav--pvw" />
          <Link href={`/produits/${cur.product.handle}`} className="pvw__cta" onClick={onClose}>Découvrir</Link>
        </div>
        <button type="button" className="pvw__nav pvw__nav--l" onClick={prev} aria-label="Précédent" disabled={i === 0}>‹</button>
        <button type="button" className="pvw__nav pvw__nav--r" onClick={next} aria-label="Suivant">›</button>
      </div>
    </div>
  );
}
