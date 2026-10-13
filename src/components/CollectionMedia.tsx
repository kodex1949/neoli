import Link from "next/link";
import type { Media } from "@/lib/collections";

/** Visuel (image ou vidéo) avec texte par-dessus. Sans fichier, un fond dégradé sert de repère. */
export function CollectionMedia({ media, className = "", style }: { media: Media; className?: string; style?: React.CSSProperties }) {
  return (
    <div className={`cmedia ${className}`} data-tone={media.tone ?? "light"} style={style}>
      {media.video ? (
        <video className="cmedia__asset" src={media.video} autoPlay muted loop playsInline preload="metadata" aria-hidden="true" />
      ) : media.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="cmedia__asset" src={media.image} alt="" loading="lazy" />
      ) : (
        <div className="cmedia__asset cmedia__asset--empty" />
      )}
      <div className="cmedia__shade" />
      {(media.title || media.text || media.cta) && (
        <div className="cmedia__body">
          {media.eyebrow && <span className="cmedia__eyebrow">{media.eyebrow}</span>}
          {media.title && <h2 className="cmedia__title">{media.title}</h2>}
          {media.text && <p className="cmedia__text">{media.text}</p>}
          {media.cta && <Link href={media.cta.href} className="cmedia__cta">{media.cta.label}</Link>}
        </div>
      )}
    </div>
  );
}
