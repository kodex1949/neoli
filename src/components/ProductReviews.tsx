import { Stars } from "./Stars";
import { ReviewForm } from "./ReviewForm";
import type { ReviewData } from "@/lib/reviews";

const date = (d: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(d));

export function ProductReviews({ handle, data }: { handle: string; data: ReviewData }) {
  return (
    <section className="rev" id="avis" aria-labelledby="rev-title">
      <div className="rev__head">
        <span className="eyebrow">Les avis</span>
        <h2 className="display" id="rev-title">Avis clients</h2>
      </div>
      <div className="rev__grid">
        <aside className="rev__sum">
          {data.count > 0 ? (
            <>
              <p className="rev__avg">{data.average.toFixed(1).replace(".", ",")}<span> / 5</span></p>
              <Stars value={data.average} size={20} />
              <p className="rev__count">{data.count} avis</p>
              <ul className="rev__dist">
                {[5, 4, 3, 2, 1].map((n) => (
                  <li key={n}>
                    <span>{n}</span>
                    <i><b style={{ width: `${(data.dist[n - 1] / data.count) * 100}%` }} /></i>
                    <span>{data.dist[n - 1]}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="rev__none">Aucun avis pour le moment. Soyez le premier à donner le vôtre.</p>
          )}
          <ReviewForm handle={handle} />
        </aside>
        <div className="rev__list">
          {data.items.map((r) => (
            <article key={r.id} className="rev__item">
              <div className="rev__top"><Stars value={r.rating} /><time dateTime={r.created_at}>{date(r.created_at)}</time></div>
              {r.title && <h3>{r.title}</h3>}
              <p>{r.body}</p>
              <p className="rev__by">{r.author_name}{r.verified && <span className="rev__badge">Achat vérifié</span>}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
