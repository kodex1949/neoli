"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

// Dior bascule l'état « actif » vers 50–60 px de scroll, dans les deux sens.
const ACTIVATE_AT = 56;

type Tile = { caption: string; href: string; image?: string; video?: string; cta?: string };

type Props = {
  eyebrow: string;
  title: string;
  href: string;
  image?: string; // visuel principal fixe (sinon dégradé de démonstration)
  video?: string; // vidéo d'arrière-plan, ex. "/videos/hero.mp4" (fichier dans public/videos/)
  poster?: string; // image affichée avant le chargement de la vidéo
  tiles: [Tile, Tile];
  cta?: string; // texte du bouton du héros (« Découvrir » par défaut)
};

export function HeroStory({ eyebrow, title, href, image, video, poster, tiles, cta = "Découvrir" }: Props) {
  const ref = useRef<HTMLElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let raf = 0;
    let active = false;

    const update = () => {
      raf = 0;
      const next = window.scrollY > ACTIVATE_AT;
      if (next !== active) {
        active = next;
        el.dataset.active = String(next);
      }
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(update);
    };

    update(); // état correct si la page est rechargée en cours de scroll
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => {
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Respecte « réduire les animations » : la vidéo démarre en pause
  useEffect(() => {
    if (!video) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      videoRef.current?.pause();
      setPaused(true);
    }
  }, [video]);

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      void v.play();
      setPaused(false);
    } else {
      v.pause();
      setPaused(true);
    }
  };

  const bg = (url?: string) => (url ? { backgroundImage: `url(${url})` } : undefined);

  return (
    <section ref={ref} className="story" data-active="false">
      <div className="story__pin">
        <Link href={tiles[0].href} className="story__tile story__tile--start" style={bg(tiles[0].image)}>
          {tiles[0].video && <video className="story__tile-video" src={tiles[0].video} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />}
          <span className="story__caption">{tiles[0].caption}</span>
          <span className="link">{tiles[0].cta || "Découvrir"}</span>
        </Link>

        <div className="story__visual" style={bg(image ?? poster)}>
          {video && (
            <>
              <video
                ref={videoRef}
                className="story__video"
                src={video}
                poster={poster}
                autoPlay
                muted
                loop
                playsInline
                preload="metadata"
              />
              <div className="story__shade" />
            </>
          )}

          <div className="story__overlay">
            <span className="eyebrow">{eyebrow}</span>
            <h1 className="display">{title}</h1>
            <Link href={href} className="link">{cta}</Link>
          </div>

          {video && (
            <button
              type="button"
              className="story__pause"
              onClick={togglePlay}
              aria-label={paused ? "Lancer la vidéo" : "Mettre la vidéo en pause"}
            >
              <svg viewBox="0 0 14 14" aria-hidden="true">
                {paused ? <path d="M3 1.5v11l9-5.5-9-5.5Z" /> : <path d="M3 1.5h3v11H3zM8 1.5h3v11H8z" />}
              </svg>
            </button>
          )}
        </div>

        <Link href={tiles[1].href} className="story__tile story__tile--end" style={bg(tiles[1].image)}>
          {tiles[1].video && <video className="story__tile-video" src={tiles[1].video} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />}
          <span className="story__caption">{tiles[1].caption}</span>
          <span className="link">{tiles[1].cta || "Découvrir"}</span>
        </Link>
      </div>

      {/* Trait « scroll » animé, masqué dès que le héros est actif */}
      <span className="story__scroller" aria-hidden="true" />
    </section>
  );
}
