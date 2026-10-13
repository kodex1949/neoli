"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { FavoriteButton } from "./FavoriteButton";
import type { MediaItem, Product } from "@/lib/shopify";

/** Vidéo de la galerie : lecture automatique (à la fin : image suivante, ou boucle s'il n'y a que la vidéo), sans contrôleur natif (pause et son sont des boutons de la galerie). */
function SlideVideo({ item, active, muted, onState, onEnd, reg }: { item: MediaItem; active: boolean; muted: boolean; onState: (paused: boolean) => void; onEnd?: () => void; reg: (el: HTMLVideoElement | null) => void }) {
  const ref = useRef<HTMLVideoElement | null>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    if (active) { v.currentTime = 0; v.play().catch(() => onState(true)); } else v.pause();
  }, [active]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (ref.current) ref.current.muted = muted; }, [muted]);
  return (
    <video
      ref={(el) => { ref.current = el; reg(el); if (el) el.muted = muted; }}
      muted
      loop={!onEnd}
      onEnded={() => active && onEnd?.()}
      playsInline
      preload={active ? "auto" : "metadata"}
      poster={item.url || undefined}
      aria-label={item.alt}
      onPlay={() => active && onState(false)}
      onPause={() => active && onState(true)}
    >
      {item.sources?.map((s) => <source key={s.url} src={s.url} type={s.mimeType} />)}
    </video>
  );
}

/** Galerie : vignettes verticales à gauche, grand visuel au centre, pastilles de position en bas. */
export function ProductGallery({ product }: { product: Product }) {
  const images: MediaItem[] = product.media?.length
    ? product.media
    : (product.images?.length ? product.images : product.image ? [product.image] : []).map((m) => ({ ...m, type: "image" as const }));
  const count = Math.max(images.length, 1);
  const [i, setI] = useState(0);
  const [muted, setMuted] = useState(true);
  const [paused, setPaused] = useState(false);
  const vids = useRef<Record<number, HTMLVideoElement | null>>({});
  const togglePlay = () => { const v = vids.current[i]; if (!v) return; if (v.paused) v.play().catch(() => {}); else v.pause(); };

  const [zoom, setZoom] = useState(false);
  // Balayage tactile (mobile) : l'image suivante suit le doigt par-dessus l'actuelle ; vers la droite, l'actuelle repart et dévoile la précédente
  const [drag, setDrag] = useState(0);
  const start = useRef<{ x: number; y: number; id: number; lock: boolean } | null>(null);
  const onDown = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" || images.length < 2) return;
    if ((e.target as HTMLElement).closest("iframe, button")) return;
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId, lock: false };
  };
  const onMove = (e: React.PointerEvent) => {
    const s = start.current;
    if (!s || s.id !== e.pointerId) return;
    const dx = e.clientX - s.x;
    if (!s.lock) {
      if (Math.abs(dx) < 8) return;
      if (Math.abs(e.clientY - s.y) > Math.abs(dx)) { start.current = null; return; } // geste vertical : on laisse défiler la page
      s.lock = true;
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    }
    if ((dx < 0 && i >= images.length - 1) || (dx > 0 && i === 0)) { setDrag(0); return; } // pas de bouclage au balayage
    setDrag(dx);
  };
  const onUp = (e: React.PointerEvent) => {
    const s = start.current;
    start.current = null;
    if (!s || !s.lock) return;
    const w = (e.currentTarget as HTMLElement).offsetWidth;
    if (drag < -w * 0.2) setI(i + 1);
    else if (drag > w * 0.2) setI(i - 1);
    setDrag(0);
  };
  const nextIndex = images.length > 1 ? (i + 1) % images.length : 0;

  useEffect(() => {
    if (!zoom) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setZoom(false); };
    window.addEventListener("keydown", onKey);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { window.removeEventListener("keydown", onKey); document.documentElement.style.overflow = prev; };
  }, [zoom]);

  // pendant le geste : pas de transition, la slide suit le doigt
  const nextK = i + 1;
  const slideDrag = (k: number): React.CSSProperties => {
    if (drag < 0 && k === nextK) return { transform: `translateX(calc(100% + ${drag}px))`, transition: "none" };
    if (drag > 0 && k === i) return { transform: `translateX(${drag}px)`, transition: "none" };
    if (drag > 0 && k === i - 1) return { zIndex: k + 1 };
    return {};
  };

  return (
    <>
      {/* Colonne de gauche : aperçu de la vue suivante (185 × 278 comme sur dior.com) */}
      <div className="pdp__side">
        <button type="button" className="pdp__preview" aria-label={count > 1 ? "Vue suivante" : "Aperçu"} disabled={count < 2} onClick={() => setI((i + 1) % count)}>
          {images.length > 0 ? (
                        images.map((im, k) => (
              <span key={k} className="pdp__pv" data-after={k > nextIndex} style={{ zIndex: k + 1 }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                {im.url && <img src={im.url} alt="" />}
                {im.type !== "image" && <i className="pdp__play" aria-hidden="true" />}
              </span>
            ))
          ) : (
            <div className="pdp__placeholder pdp__placeholder--sm" />
          )}
        </button>
      </div>

      <div className="pdp__stage">
        <div className="pdp__main" data-drag={drag !== 0} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
          {images.length > 0 ? (
            images.map((im, k) => (
              <div key={k} className="pdp__slide" data-active={k === i} data-after={k > i} style={{ zIndex: k + 1, ...slideDrag(k) }}>
                {im.type === "video" ? (
                  <SlideVideo item={im} active={k === i} muted={muted} onState={setPaused} onEnd={images.length > 1 ? () => setI((i + 1) % images.length) : undefined} reg={(el) => { vids.current[k] = el; }} />
                ) : im.type === "embed" ? (
                  k === i ? <iframe src={im.embedUrl} title={im.alt || product.title} allow="autoplay; fullscreen; picture-in-picture" allowFullScreen /> : null
                ) : (
                  <Image src={im.url} alt={im.alt || product.title} width={im.width} height={im.height} sizes="(max-width: 900px) 100vw, 484px" priority={k === 0} />
                )}
              </div>
            ))
          ) : (
            <div className="pdp__slide" data-active="true"><div className="pdp__placeholder" /></div>
          )}

          {product.badges && product.badges.length > 0 && (
            <ul className="pdp__badges">
              {product.badges.map((b) => <li key={b}>{b}</li>)}
            </ul>
          )}

          <FavoriteButton handle={product.handle} title={product.title} className="fav--pdp" />

          <button type="button" className="pdp__zoom" aria-label="Agrandir" onClick={() => setZoom(true)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5h5v5M10 19H5v-5M19 5l-5.5 5.5M5 19l5.5-5.5" /></svg>
          </button>

          {images[i]?.type === "video" && (
            <div className="pdp__vctl">
              <button type="button" aria-label={paused ? "Lire la vidéo" : "Mettre la vidéo en pause"} onClick={togglePlay}>
                {paused ? (
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6.5v11l9-5.5-9-5.5Z" /></svg>
                ) : (
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6.5v11M15 6.5v11" /></svg>
                )}
              </button>
              <button type="button" aria-label={muted ? "Activer le son" : "Couper le son"} onClick={() => setMuted((m) => !m)}>
                <svg viewBox="0 0 24 24" aria-hidden="true">
                  <path d="M4.5 9.5h3l4-3.5v12l-4-3.5h-3v-5Z" />
                  {muted ? <path d="m16 9.5 4 5M20 9.5l-4 5" /> : <path d="M15.5 9a4 4 0 0 1 0 6M18 6.8a7.5 7.5 0 0 1 0 10.4" />}
                </svg>
              </button>
            </div>
          )}

          <div className="pdp__dots">
            {Array.from({ length: Math.max(count, 3) }).map((_, k) =>
              k < images.length ? (
                <button key={k} type="button" className="pdp__dot" aria-label={`Image ${k + 1} sur ${count}`} aria-current={k === i} onClick={() => setI(k)}>
                  <i data-on={k === i} />
                </button>
              ) : (
                <i key={k} data-on={false} />
              ),
            )}
          </div>
        </div>
      </div>

      {zoom && (
        <div className="pdp__lightbox" role="dialog" aria-modal="true" aria-label="Visuel agrandi" onClick={() => setZoom(false)}>
          <button type="button" className="pdp__lightbox-close" aria-label="Fermer" onClick={() => setZoom(false)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 17.5 17.5 6.5" /><path d="M6.5 6.5 17.5 17.5" /></svg>
          </button>
          {images[i]?.type === "video" ? (
            <video autoPlay muted loop playsInline poster={images[i].url || undefined} onClick={(e) => e.stopPropagation()}>
              {images[i].sources?.map((s) => <source key={s.url} src={s.url} type={s.mimeType} />)}
            </video>
          ) : images[i]?.type === "embed" ? (
            <iframe src={images[i].embedUrl} title={images[i].alt || product.title} allow="autoplay; fullscreen" allowFullScreen onClick={(e) => e.stopPropagation()} />
          ) : images[i] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={images[i].url} alt={images[i].alt || product.title} onClick={(e) => e.stopPropagation()} />
          ) : (
            <div className="pdp__placeholder pdp__placeholder--zoom" onClick={(e) => e.stopPropagation()} />
          )}
        </div>
      )}
    </>
  );
}
