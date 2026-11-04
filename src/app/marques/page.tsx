import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getBrands } from "@/lib/shopify";
import { brandCount, brandHref } from "@/lib/brands";
import { groupBrands } from "@/lib/brand-directory";
import "./marques.css";

export const metadata: Metadata = {
  title: "Les Marques — ESSNC",
  description: "Les maisons de parfumerie sélectionnées par ESSNC : choisissez une marque pour découvrir tous ses parfums.",
};
export const revalidate = 300;

export default async function BrandsPage() {
  const brands = await getBrands().catch(() => []);
  const groups = groupBrands(brands);
  const total = brands.reduce((n, b) => n + b.count, 0);
  return (
    <>
      <header className="brands__hero">
        <nav className="collection__crumbs" aria-label="Fil d'Ariane">
          <Link href="/">Accueil</Link>
          <span aria-hidden="true">/</span>
          <span aria-current="page">Les Marques</span>
        </nav>
        <div className="brands__hero-grid">
          <div>
            <span className="eyebrow">Parfumerie</span>
            <h1 className="display">Les Marques</h1>
          </div>
          <div className="brands__hero-side">
            <p>Les maisons de parfumerie orientale que nous avons sélectionnées. Choisissez-en une pour découvrir tous ses parfums.</p>
            {brands.length > 0 && (
              <p className="brands__stats">
                <span><b>{brands.length}</b> {brands.length > 1 ? "maisons en boutique" : "maison en boutique"}</span>
                <i aria-hidden="true" />
                <span><b>{total}</b> {total > 1 ? "parfums" : "parfum"}</span>
              </p>
            )}
          </div>
        </div>
        <nav className="brands__jump" aria-label="Familles de maisons">
          {groups.map((g) => (
            <a key={g.id} href={`#b-${g.id}`}>{g.short}<span>{g.available.length + g.soon.length}</span></a>
          ))}
        </nav>
      </header>

      {groups.map((g, gi) => (
        <section key={g.id} className="brands__section" aria-labelledby={`b-${g.id}`}>
          <div className="brands__sechead">
            <h2 id={`b-${g.id}`}>{g.title}</h2>
            <p>{g.intro}</p>
            <span className="brands__seccount">{g.available.length + g.soon.length} {g.available.length + g.soon.length > 1 ? "maisons" : "maison"}</span>
          </div>

          {g.available.length + g.soon.length > 0 && (
            <ul className="brands__grid" aria-label={g.title}>
              {g.available.map((b, i) => (
                <li key={b.slug}>
                  <Link href={brandHref(b)} className="brands__card">
                    <span className="brands__media">
                      {b.image ? (
                        <Image className="brands__img" src={b.image.url} alt={b.image.alt} width={b.image.width} height={b.image.height} sizes="(max-width: 700px) 50vw, (max-width: 1100px) 33vw, 25vw" priority={gi === 0 && i < 4} />
                      ) : (
                        <span className="brands__initial" aria-hidden="true">{b.name.charAt(0)}</span>
                      )}
                      {b.image2 && <Image className="brands__img brands__img--alt" src={b.image2.url} alt="" width={b.image2.width} height={b.image2.height} sizes="(max-width: 700px) 50vw, (max-width: 1100px) 33vw, 25vw" />}
                      <span className="brands__cta">Découvrir</span>
                    </span>
                    <span className="brands__meta">
                      <span className="brands__name">{b.name}</span>
                      <span className="brands__count">{[b.origin, brandCount(b.count)].filter(Boolean).join(" · ")}</span>
                    </span>
                    {b.text && <span className="brands__text">{b.text}</span>}
                  </Link>
                </li>
              ))}
              {g.soon.map((d) => (
                <li key={d.name}>
                  <div className="brands__card brands__card--soon">
                    <span className="brands__media">
                      <span className="brands__initial" aria-hidden="true">{d.name.charAt(0)}</span>
                      <span className="brands__cta">Bientôt chez ESSNC</span>
                    </span>
                    <span className="brands__meta">
                      <span className="brands__name">{d.name}</span>
                      <span className="brands__count">{d.origin} · Bientôt en boutique</span>
                    </span>
                    <span className="brands__text">{d.text}</span>
                  </div>
                </li>
              ))}
            </ul>
          )}

        </section>
      ))}

      <section className="brands__help" aria-label="Conseil">
        <p>Vous hésitez entre plusieurs maisons ?</p>
        <Link href="/conseil-olfactif" className="brands__link">Demander un conseil olfactif</Link>
      </section>
    </>
  );
}
