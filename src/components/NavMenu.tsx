"use client";

import Link from "next/link";
import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { MENU, type Submenu } from "@/lib/menu";
import { slotId, type MenuMedia, type MenuMediaItem } from "@/lib/menu-media";

type Props = { open: boolean; onClose: () => void; media?: MenuMedia };

const idx = (i: number) => ({ "--i": i }) as CSSProperties;

const Chevron = ({ dir = "right" }: { dir?: "right" | "left" }) => (
  <svg className="nav__chevron" viewBox="0 0 8 12" aria-hidden="true" style={dir === "left" ? { transform: "scaleX(-1)" } : undefined}>
    <path d="m1.5 1 5 5-5 5" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

type CardData = Submenu["cards"][number];

/** Grande image éditoriale du menu mobile (masquée sur ordinateur, où les cartes sont dans la colonne de droite). */
/** Vidéo de fond d'une carte / vignette : lecture auto, muette, en boucle. */
const Clip = ({ src }: { src: string }) => <video className="nav__tile-media" src={src} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />;

/** Visuel géré dans Supabase s'il existe, sinon visuel d'origine du code. */
const visual = (m: MenuMediaItem | undefined, image?: string): { bg?: CSSProperties; video?: string } =>
  m?.url && m.kind === "video" ? { video: m.url } : { bg: m?.url ?? image ? { backgroundImage: `url(${m?.url ?? image})` } : undefined };

function Card({ c, i, onGo, m }: { c: CardData; i: number; onGo: () => void; m?: MenuMediaItem }) {
  const v = visual(m, c.image);
  return (
    <Link href={m?.href || c.href} onClick={onGo} className="nav__tile nav__feature nav__anim" style={{ ...idx(i), ...v.bg }}>
      {v.video && <Clip src={v.video} />}
      <span className="caption">{m?.eyebrow || c.eyebrow}</span>
      <span className="nav__tile-link">{m?.title || c.title}</span>
    </Link>
  );
}

export function NavMenu({ open, onClose, media = {} }: Props) {
  const [view, setView] = useState<string | null>(null); // id du sous-menu affiché (null = niveau 1)
  const closeRef = useRef<HTMLButtonElement>(null);
  const lastSub = useRef<Submenu | null>(null);

  const sub = MENU.items.find((i) => i.id === view)?.submenu ?? null;
  if (sub) lastSub.current = sub;
  const asideSub = sub ?? lastSub.current; // garde le contenu pendant la fermeture de la colonne

  // Le menu se cale sous l'en-tête où qu'il soit : sous la barre d'annonce en haut de page, tout en haut une fois la page défilée
  const root = useRef<HTMLDivElement>(null);
  useLayoutEffect(() => {
    if (!open) return;
    const h = document.querySelector(".header")?.getBoundingClientRect();
    root.current?.style.setProperty("--nav-top", `${Math.max(0, h?.top ?? 0) + 16}px`);
  }, [open]);

  // Verrouille le scroll de la page et place le focus à l'ouverture
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    closeRef.current?.focus();
    return () => { document.documentElement.style.overflow = prev; };
  }, [open]);

  // Échap : revient au niveau 1, puis ferme
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (view) setView(null);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, view, onClose]);

  // Réinitialise le niveau après la fermeture (0,45 s, comme la transition)
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => setView(null), 450);
    return () => clearTimeout(t);
  }, [open]);

  const go = () => onClose();

  return (
    <div
      id="site-nav"
      ref={root}
      className="nav"
      data-open={open}
      data-sub={sub ? "true" : "false"}
      inert={!open}
      role="dialog"
      aria-modal="true"
      aria-label="Menu principal"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="nav__panel">
        <div className="nav__col">
          <div className="nav__top">
            <button ref={closeRef} className="nav__close" onClick={onClose} aria-label="Fermer le menu">
              <svg className="nav__x" viewBox="0 0 24 24" aria-hidden="true"><path className="nav__x-a" d="M6.5 17.5 17.5 6.5" /><path className="nav__x-b" d="M6.5 6.5 17.5 17.5" /></svg>
            </button>
          </div>

          {/* key = on remonte le contenu à chaque changement de niveau pour rejouer l'animation */}
          <div className="nav__scroll" key={view ?? "root"}>
            {sub ? (
              <>
                <button className="nav__back nav__anim" style={idx(1)} onClick={() => setView(null)}>
                  <Chevron dir="left" /> {sub.title}
                </button>

                {sub.iconics && (
                  <div className="nav__section nav__anim" style={idx(2)}>
                    <p className="nav__label">Les iconiques</p>
                    <div className="nav__iconics">
                      {sub.iconics.map((p, k) => {
                        const m = media[slotId(view ?? "", "iconic", k)];
                        const v = visual(m, p.image);
                        return (
                        <Link key={p.label} href={m?.href || p.href} onClick={go} className="nav__iconic">
                          <span className="nav__iconic-img" style={v.bg}>{v.video && <Clip src={v.video} />}</span>
                          <span>{m?.title || p.label}</span>
                        </Link>
                        );
                      })}
                    </div>
                  </div>
                )}

                {sub.groups.map((group, g) => (
                  <ul key={g} className="nav__list nav__section nav__section--indent">
                    {group.map((l, i) => (
                      <li key={l.label} className="nav__anim" style={idx(3 + g * 5 + i)}>
                        <Link href={l.href} onClick={go} className="nav__link">{l.label}</Link>
                      </li>
                    ))}
                  </ul>
                ))}

                {/* sur mobile : les images éditoriales en grand, empilées en bas du menu */}
                {sub.cards.map((c, k) => <Card key={c.title} c={c} i={8 + k} onGo={go} m={media[slotId(view ?? "", "card", k)]} />)}
              </>
            ) : (
              <>
                <ul className="nav__list">
                  {MENU.items.map((it, i) => (
                    <li key={it.id} className="nav__anim" style={idx(i + 1)}>
                      {it.submenu ? (
                        <button className="nav__link" onClick={() => setView(it.id)}>
                          {it.label}
                          <Chevron />
                        </button>
                      ) : (
                        <Link href={it.href} onClick={go} className="nav__link">{it.label}</Link>
                      )}
                    </li>
                  ))}
                </ul>

                <div className="nav__section nav__anim" style={idx(MENU.items.length + 1)}>
                  <p className="nav__label">Mon compte</p>
                  <Link href="/compte" onClick={go} className="nav__card">
                    <strong>
                      <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m12 3 2.6 5.6 6 .7-4.4 4.2 1.1 6L12 16.6 6.7 19.5l1.1-6L3.4 9.3l6-.7L12 3Z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></svg>
                      {MENU.account.title}
                    </strong>
                    <span>{MENU.account.text}</span>
                  </Link>
                </div>

                <div className="nav__section nav__anim" style={idx(MENU.items.length + 2)}>
                  <p className="nav__label">Services</p>
                  <Link href="/conseil-olfactif" onClick={go} className="nav__cta">Conseil olfactif</Link>
                </div>

                <ul className="nav__list nav__list--small nav__section nav__anim" style={idx(MENU.items.length + 3)}>
                  {MENU.footerLinks.map((l) => (
                    <li key={l.label}><Link href={l.href} onClick={go} className="nav__link">{l.label}</Link></li>
                  ))}
                </ul>
              </>
            )}
          </div>
        </div>

        {/* Colonne 3 : deux grandes cartes éditoriales, s'ouvre en largeur (0,45 s) */}
        <aside className="nav__aside" aria-hidden={!sub}>
          {asideSub && (
            <div className="nav__aside-inner" key={asideSub.title}>
              {asideSub.cards.map((c, i) => {
                const m = media[slotId(MENU.items.find((it) => it.submenu === asideSub)?.id ?? "", "card", i)];
                const v = visual(m, c.image);
                return (
                <Link
                  key={c.title}
                  href={m?.href || c.href}
                  onClick={go}
                  className="nav__tile nav__anim"
                  style={{ ...idx(i + 3), ...v.bg }}
                  tabIndex={sub ? 0 : -1}
                >
                  {v.video && <Clip src={v.video} />}
                  <span className="caption">{m?.eyebrow || c.eyebrow}</span>
                  <span className="nav__tile-link">{m?.title || c.title}</span>
                </Link>
                );
              })}
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}
