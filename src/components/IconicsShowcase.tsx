"use client";

import Link from "next/link";
import { Children, useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";

type Props = {
  eyebrow: string;
  title: string;
  text?: string; // phrase d'intro, affichée dans le bloc de texte (sans visuel)
  href?: string; // lien « Voir tout » du bloc de texte
  introAt?: number; // sans visuel : le bloc de texte s'insère après ce nombre de produits (0 = tout à gauche, à la place du visuel)
  media?: {
    eyebrow: string;
    title: string;
    href: string;
    image?: string; // ex. "/images/iconiques.jpg"
    video?: string; // ex. "/videos/iconiques.mp4" (prioritaire sur l'image)
    poster?: string;
  };
  centered?: boolean; // sans visuel : titre centré au-dessus du carrousel (au lieu d'un bloc de texte dans la rangée)
  children: ReactNode; // une carte produit par enfant
};

// Flèche fine de Dior (ArrowLeft 24×24) ; la droite est son miroir
const arrow = (flip?: boolean) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" style={flip ? { transform: "scaleX(-1)" } : undefined}>
    <path
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
      d="M15.129 18.131C14.8556 18.4044 14.4124 18.4044 14.139 18.131L8.50301 12.495C8.22964 12.2216 8.22964 11.7784 8.50301 11.505L14.139 5.86899C14.4124 5.59562 14.8556 5.59562 15.129 5.86899C15.4024 6.14235 15.4024 6.58557 15.129 6.85894L9.98793 12L15.129 17.1411C15.4024 17.4144 15.4024 17.8576 15.129 18.131Z"
    />
  </svg>
);

/**
 * Média (image ou vidéo) à gauche, carrousel de produits à droite.
 * Le média est la première « diapositive » de la piste : quand on fait défiler les produits
 * (flèches, glisser à la souris, trackpad, doigt), il glisse vers la gauche avec eux, et son contenu
 * bouge un peu moins vite (parallaxe) pour donner de la profondeur.
 */
export function IconicsShowcase({ eyebrow, title, text, href, introAt = 0, media, centered = false, children }: Props) {
  const root = useRef<HTMLElement>(null);
  const [seen, setSeen] = useState(false); // apparition quand la section entre à l'écran
  const track = useRef<HTMLDivElement>(null);
  const mediaEl = useRef<HTMLDivElement>(null);
  const [state, setState] = useState({ prev: false, next: true, page: 0, pages: 1 });
  const [dragging, setDragging] = useState(false);
  const drag = useRef({ active: false, x: 0, left: 0, moved: false, v: 0, raf: 0 });

  const update = useCallback(() => {
    const t = track.current;
    if (!t) return;
    // Parallaxe : p = part du média déjà sortie à gauche (0 → 1)
    const w = mediaEl.current?.offsetWidth ?? 1;
    t.style.setProperty("--p", String(Math.min(1, Math.max(0, t.scrollLeft / w))));
    const max = t.scrollWidth - t.clientWidth;
    // « pages » = nombre de largeurs visibles (8 produits → 1/3) ; la page courante suit la position
    const pages = Math.max(1, Math.ceil(t.scrollWidth / t.clientWidth));
    const page = max > 0 && pages > 1 ? Math.round((t.scrollLeft / max) * (pages - 1)) : 0;
    setState({ prev: t.scrollLeft > 4, next: t.scrollLeft < max - 4, page, pages });
  }, []);

  useEffect(() => {
    const t = track.current;
    if (!t) return;
    let raf = 0;
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(() => { raf = 0; update(); }); };
    update();
    t.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      t.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [update]);

  // Apparition : une seule fois, quand 20 % de la section sont visibles
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setSeen(true); io.disconnect(); }
    }, { threshold: 0.2 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Glissement fluide : --v = vitesse de défilement lissée (px/image). Les cartes se décalent
  // proportionnellement (plus pour les dernières) puis reviennent en place : effet de traîne.
  useEffect(() => {
    const t = track.current;
    if (!t || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let last = t.scrollLeft, vel = 0, raf = 0;
    const tick = () => {
      const dx = t.scrollLeft - last;
      last = t.scrollLeft;
      vel += (Math.max(-30, Math.min(30, dx)) - vel) * 0.18;
      const moving = Math.abs(vel) > 0.05 || dx !== 0;
      t.style.setProperty("--v", moving ? vel.toFixed(2) : "0");
      raf = moving ? requestAnimationFrame(tick) : 0;
    };
    const kick = () => { if (!raf) raf = requestAnimationFrame(tick); };
    t.addEventListener("scroll", kick, { passive: true });
    return () => {
      t.removeEventListener("scroll", kick);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  // Une flèche = une page : on répartit les pages sur toute la course du carrousel
  const step = (dir: 1 | -1) => {
    const t = track.current;
    if (!t) return;
    const max = t.scrollWidth - t.clientWidth;
    const pages = Math.max(1, Math.ceil(t.scrollWidth / t.clientWidth));
    if (pages < 2 || max <= 0) return;
    const cur = Math.round((t.scrollLeft / max) * (pages - 1));
    const target = Math.min(pages - 1, Math.max(0, cur + dir));
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    t.scrollTo({ left: (target * max) / (pages - 1), behavior: reduce ? "auto" : "smooth" });
  };

  // Glisser à la souris (le tactile et le trackpad défilent déjà nativement)
  const onPointerDown = (e: React.PointerEvent) => {
    if (e.pointerType !== "mouse" || e.button !== 0) return;
    cancelAnimationFrame(drag.current.raf); // arrête l'inertie en cours
    drag.current = { active: true, x: e.clientX, left: track.current?.scrollLeft ?? 0, moved: false, v: 0, raf: 0 };
  };
  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d.active || !track.current) return;
    const dx = e.clientX - d.x;
    if (!d.moved && Math.abs(dx) > 5) { d.moved = true; setDragging(true); }
    if (d.moved) {
      const before = track.current.scrollLeft;
      track.current.scrollLeft = d.left - dx;
      d.v = track.current.scrollLeft - before; // vitesse de la dernière image
    }
  };
  // Au relâchement, le carrousel continue sur sa lancée puis ralentit (frottement 6 % / image)
  const endDrag = () => {
    const d = drag.current;
    if (!d.active) return;
    d.active = false;
    setDragging(false);
    const t = track.current;
    if (!d.moved || !t || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    let m = d.v;
    const glide = () => {
      t.scrollLeft += m;
      m *= 0.94;
      d.raf = Math.abs(m) > 0.4 ? requestAnimationFrame(glide) : 0;
    };
    d.raf = requestAnimationFrame(glide);
  };
  // Un glisser ne doit pas ouvrir le lien sous le curseur
  const onClickCapture = (e: React.MouseEvent) => {
    if (drag.current.moved) { e.preventDefault(); e.stopPropagation(); drag.current.moved = false; }
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") { e.preventDefault(); step(1); }
    if (e.key === "ArrowLeft") { e.preventDefault(); step(-1); }
  };

  return (
    <section ref={root} className={`showcase${media ? "" : centered ? " showcase--solo" : " showcase--plain"}`} data-in={seen} aria-roledescription="carrousel" aria-label={title}>
      {(media || centered) && (
        <div className="section__head">
          <span className="eyebrow">{eyebrow}</span>
          <h2 className="display">{title}</h2>
          {centered && text && <p className="showcase__lede">{text}</p>}
        </div>
      )}

      <div className="showcase__stage">
      <div
        ref={track}
        className="showcase__track"
        data-drag={dragging}
        tabIndex={0}
        onKeyDown={onKeyDown}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerLeave={endDrag}
        onPointerCancel={endDrag}
        onClickCapture={onClickCapture}
      >
        {media && (
        <div ref={mediaEl} className="showcase__media">
          <div
            className="showcase__media-inner"
            style={!media.video && media.image ? { backgroundImage: `url(${media.image})` } : undefined}
          >
            {media.video && (
              <video className="showcase__video" src={media.video} poster={media.poster} autoPlay muted loop playsInline preload="metadata" />
            )}
          </div>
          <div className="showcase__shade" />
          <div className="showcase__caption">
            <span className="eyebrow">{media.eyebrow}</span>
            <h3 className="display">{media.title}</h3>
            <Link href={media.href} className="link" draggable={false}>Découvrir</Link>
          </div>
        </div>

        )}

        {(() => {
          const items = Children.toArray(children).map((child, i) => (
            <div key={`p-${i}`} className="showcase__item" style={{ "--i": i } as CSSProperties}>{child}</div>
          ));
          // Sans visuel : le bloc de texte s'intercale au milieu de la rangée (après `introAt` produits)
          if (!media && !centered) {
            const at = Math.min(introAt, items.length);
            items.splice(at, 0,
              <div key="intro" className="showcase__item showcase__intro" style={{ "--i": at } as CSSProperties}>
                <span className="eyebrow">{eyebrow}</span>
                <h2 className="display">{title}</h2>
                {text && <p className="showcase__lede">{text}</p>}
                {href && (
                  <Link href={href} className="showcase__cta" draggable={false}>
                    <span>Découvrir</span>
                    <svg viewBox="0 0 16 10" aria-hidden="true"><path d="M1 5h13M10 1l4 4-4 4" /></svg>
                  </Link>
                )}
              </div>,
            );
          }
          return items;
        })()}
      </div>

      {state.pages > 1 && (
        <div className="showcase__stepper">
          <button type="button" className="showcase__arrow" onClick={() => step(-1)} disabled={!state.prev} aria-label="Précédent">{arrow()}</button>
          <div className="showcase__count" aria-live="polite" aria-label={`Page ${state.page + 1} sur ${state.pages}`}>
            <span className="showcase__roller" aria-hidden="true">
              <span className="showcase__roller-col" style={{ transform: `translateY(${-state.page * 14}px)` }}>
                {Array.from({ length: state.pages }, (_, i) => <span key={i}>{i + 1}</span>)}
              </span>
            </span>
            <span aria-hidden="true">/{state.pages}</span>
          </div>
          <button type="button" className="showcase__arrow" onClick={() => step(1)} disabled={!state.next} aria-label="Suivant">{arrow(true)}</button>
        </div>
      )}
      </div>
    </section>
  );
}
