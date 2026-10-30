import Link from "next/link";
import type { Creation } from "@/lib/creations";

/** Créations éditoriales : texte à gauche, visuel (image ou vidéo) plein cadre à droite. Gérées dans /admin/creations. */
export function CreationsSection({ items }: { items: Creation[] }) {
  if (!items.length) return null;
  return (
    <section className="cre" aria-label="Créations">
      {items.map((c, i) => (
        <article className="cre__row" key={c.id}>
          <div className="cre__text">
            {c.eyebrow && <p className="cre__eyebrow">{c.eyebrow}</p>}
            {i === 0 ? <h2 className="cre__title">{c.title}</h2> : <h3 className="cre__title">{c.title}</h3>}
            {c.text && <p className="cre__lead">{c.text}</p>}
            {c.href && <Link href={c.href} className="cre__cta">{c.cta || "Découvrir"}</Link>}
          </div>
          <div className="cre__media">
            {c.url && (c.kind === "video"
              ? <video src={c.url} autoPlay muted loop playsInline preload="metadata" />
              // eslint-disable-next-line @next/next/no-img-element
              : <img src={c.url} alt={c.title} loading={i === 0 ? "eager" : "lazy"} />)}
          </div>
        </article>
      ))}
    </section>
  );
}
