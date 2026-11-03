import type { Metadata } from "next";
import type { CSSProperties } from "react";
import Link from "next/link";
import { Cormorant_Garamond } from "next/font/google";
import { AutoVideo } from "@/components/AutoVideo";
import { ProductBuy } from "@/components/ProductBuy";
import { ProductCard } from "@/components/ProductCard";
import { ProductGallery } from "@/components/ProductGallery";
import { Reveal } from "@/components/OpulentReveal";
import { OpulentFx } from "@/components/OpulentFx";
import { getReviews } from "@/lib/reviews";
import { getProduct, getProducts } from "@/lib/shopify";
import "./opulent.css";

export const revalidate = 60;

/** Police d'édition de la page (titres, citations, chiffres). Le texte courant reste dans la police du site. */
const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400", "500"], style: ["normal", "italic"], variable: "--font-op", display: "swap" });

/** Handle du produit dans Shopify (Produits → Opulent Milano → Référencement → Ancre d'URL). */
const HANDLE = "opulent-milano";
/** Visuel de l'univers : celui de la tuile d'accueil. À remplacer par un fichier de public/images pour ne plus dépendre de Supabase. */
const SCENE = "https://skaqmzsoiyuwxblxmdgp.supabase.co/storage/v1/object/public/menu-media/home-tile-0-1793601254383.png";

const NOTES = [
  { n: "I", tier: "Tête", line: "L'ouverture, fraîche et lumineuse", notes: ["Bergamote", "Poivre rose", "Timur"] },
  { n: "II", tier: "Cœur", line: "Le bouquet, floral et fruité", notes: ["Rose", "Cassis", "Géranium"] },
  { n: "III", tier: "Fond", line: "Le sillage, boisé et profond", notes: ["Vétiver", "Bois d'ambre", "Cèdre"] },
];

const SHEET: [string, string][] = [
  ["Maison", "Lattafa"],
  ["Concentration", "Eau de parfum"],
  ["Contenance", "100 ml"],
  ["Pour", "Elle, lui, les deux"],
  ["Famille", "Aromatique, florale, boisée"],
  ["Flacon", "Émeraude et or"],
];

const MOMENTS = [
  { k: "Le jour", t: "Bergamote et poivre rose : une signature nette et lumineuse, qui se remarque sans s'imposer.", tone: "day", pos: "50% 18%", z: 1.5 },
  { k: "Le soir", t: "La rose et le cassis s'installent sur un fond de vétiver et de bois d'ambre : plus chaud, plus profond.", tone: "night", pos: "50% 92%", z: 1.6 },
  { k: "Les fêtes", t: "Un flacon émeraude et or, un parfum qui s'offre. Emballage cadeau offert, prêt à glisser sous le sapin.", tone: "gift", pos: "50% 44%", z: 2 },
];

const FAQ = [
  { q: "Opulent Milano est-il un parfum pour femme ou pour homme ?", a: "Les deux : c'est un parfum unisexe, aromatique, floral et boisé. Il se porte aussi bien au féminin qu'au masculin." },
  { q: "Quelles sont ses notes ?", a: "En tête : bergamote, poivre rose et timur. Au cœur : rose, cassis et géranium. En fond : vétiver, bois d'ambre et cèdre." },
  { q: "Quelle est sa concentration et sa contenance ?", a: "C'est une eau de parfum, présentée en flacon de 100 ml." },
  { q: "Le produit est-il authentique ?", a: "Oui. Le parfum est de la marque Lattafa, vendu et expédié par ESSNC." },
  { q: "Quand vais-je le recevoir ?", a: "Expédition sous 48 h. Livraison standard en 3 à 5 jours ouvrés, express en 24 à 48 h. Livraison offerte dès 100 € d'achat." },
  { q: "Puis-je le retourner ?", a: "Oui : retour gratuit sous 30 jours pour tout produit non ouvert. L'emballage cadeau est offert." },
];

const PETALS = [
  { l: 6, s: 14, d: 15, t: 0 }, { l: 14, s: 10, d: 19, t: 6 }, { l: 23, s: 16, d: 17, t: 2 }, { l: 31, s: 9, d: 21, t: 9 },
  { l: 42, s: 13, d: 16, t: 4 }, { l: 53, s: 11, d: 20, t: 11 }, { l: 61, s: 15, d: 18, t: 1 }, { l: 70, s: 9, d: 22, t: 7 },
  { l: 78, s: 12, d: 15, t: 3 }, { l: 86, s: 16, d: 19, t: 10 }, { l: 93, s: 10, d: 17, t: 5 },
];

export const metadata: Metadata = {
  title: "Opulent Milano — Lattafa — ESSNC",
  description: "Opulent Milano de Lattafa : un parfum unisexe aromatique, floral et boisé. Bergamote, rose, cassis et vétiver dans un flacon émeraude et or. Livraison offerte dès 100 €.",
};

/** Largeur demandée au CDN Shopify (les autres URL restent telles quelles). */
const sized = (url: string, w: number) => (url.includes("cdn.shopify.com") ? `${url}${url.includes("?") ? "&" : "?"}width=${w}` : url);

function Words({ text }: { text: string }) {
  return <>{text.split(" ").map((w, i) => <span key={i} className="op-w" data-on="0">{w} </span>)}</>;
}

function Stars({ n }: { n: number }) {
  return <span className="op-stars" aria-label={`${n} sur 5`}>{"★★★★★".slice(0, n)}<i>{"★★★★★".slice(n)}</i></span>;
}

/** Recadrage d'une photo : même image, autre détail (position + zoom). */
function Crop({ src, pos = "50% 50%", z = 1, alt = "", par, lazy = true }: { src: string; pos?: string; z?: number; alt?: string; par?: number; lazy?: boolean }) {
  return (
    <div className="op-crop">
      <img src={src} alt={alt} loading={lazy ? "lazy" : undefined} data-par={par} style={{ objectPosition: pos, transformOrigin: pos, "--z": z } as CSSProperties} />
    </div>
  );
}

export default async function OpulentMilano() {
  const product = await getProduct(HANDLE);
  const reviews = product ? await getReviews(product.handle) : null;
  const more = (await getProducts(8)).filter((p) => p.handle !== HANDLE).slice(0, 4);
  const video = product?.media?.find((m) => m.type === "video");
  const photos = (product?.media ?? []).filter((m) => m.type === "image").map((m) => sized(m.url, 1400));
  const fruit = photos[1] ?? SCENE;
  const hasReviews = !!reviews && reviews.count > 0;
  const buyLabel = product ? `Commander · ${product.price}` : "Découvrir le parfum";

  return (
    <div className={`op ${display.variable}`}>
      <OpulentFx title="Opulent Milano" price={product?.price} />

      {/* 1. Ouverture : une fenêtre en arche sur le jardin ; en défilant, elle s'ouvre et on entre dans la scène */}
      <section className="op-hero" data-pin="hero">
        <div className="op-hero__pin">
          <h1 className="op-hero__title" aria-label="Opulent Milano">
            <span className="op-hero__l1"><span className="op-line"><span style={{ "--i": 1 } as CSSProperties}>Opulent</span></span></span>
            <span className="op-hero__l2"><span className="op-line"><span style={{ "--i": 2 } as CSSProperties}>Milano</span></span></span>
          </h1>
          <div className="op-hero__win">
            <img className="op-hero__img" src={SCENE} alt="Flacon vert et or Opulent Milano posé sur un socle de pierre, dans un jardin à arches au crépuscule" />
            <span className="op-hero__shade" />
          </div>
          <div className="op-petals" aria-hidden="true">
            {PETALS.map((p, i) => <i key={i} style={{ left: `${p.l}%`, width: p.s, height: p.s * 1.5, animationDuration: `${p.d}s`, animationDelay: `-${p.t}s` }} />)}
          </div>
          <p className="op-hero__lede op-in" style={{ "--i": 4 } as CSSProperties}>Un jardin d'émeraude au crépuscule. Bergamote, rose et cassis s'ouvrent sur un fond de vétiver et de bois.</p>
          <div className="op-hero__buy op-in" style={{ "--i": 5 } as CSSProperties}>
            <span className="op-hero__sub">Lattafa, eau de parfum 100 ml</span>
            <a href="#le-parfum" className="op-btn">{buyLabel}</a>
          </div>
          <div className="op-hero__final">
            <p>Lattafa, eau de parfum 100 ml, unisexe.</p>
            <a href="#le-parfum" className="op-btn">{buyLabel}</a>
            <ul>
              {hasReviews && <li><Stars n={Math.round(reviews!.average)} /> {reviews!.average.toFixed(1)} ({reviews!.count} avis)</li>}
              <li>Livraison offerte dès 100 €</li>
              <li>Emballage cadeau offert</li>
              <li>Retour 30 jours</li>
            </ul>
          </div>
          <a href="#esprit" className="op-scrollcue" aria-label="Défiler"><span /></a>
        </div>
      </section>

      {/* 2. Manifeste : le texte s'illumine, un détail du jardin à côté */}
      <section className="op-manifest" id="esprit" data-words>
        <div className="op-manifest__text">
          <h2><Words text="Le contraste de la fraîcheur et de la chaleur, du fruit et du bois : un parfum qui s'invite avec éclat, puis s'installe avec élégance." /></h2>
          <Reveal delay={120}><a href="#notes" className="op-link op-link--dark">Lire la composition</a></Reveal>
        </div>
        <Reveal as="figure" className="op-manifest__fig op-clip">
          <Crop src={SCENE} pos="92% 74%" z={1.7} par={-28} alt="Fleurs blanches au pied de l'arche" />
          <figcaption>Fleurs blanches, pierre claire.</figcaption>
        </Reveal>
      </section>

      {/* 3. Les trois temps : section épinglée, le jardin change avec chaque temps */}
      <section className="op-stage" id="notes" data-stage-sec data-stage="0" data-pin="s">
        <div className="op-stage__pin">
          <div className="op-stage__text">
            <h2>Trois temps, une signature</h2>
            <div className="op-stage__tiers">
              {NOTES.map((t, i) => (
                <div key={t.tier} className="op-st" data-i={i}>
                  <span className="op-st__no">{t.n}</span>
                  <h3>{t.tier}</h3>
                  <p>{t.line}</p>
                  <ul>{t.notes.map((n) => <li key={n}>{n}</li>)}</ul>
                </div>
              ))}
            </div>
            <div className="op-stage__dots" aria-hidden="true">{NOTES.map((t, i) => <span key={t.tier} data-i={i} />)}</div>
          </div>
          <div className="op-stage__visual">
            <div className="op-stage__arch">
              <img src={SCENE} alt="" data-i="0" loading="lazy" style={{ objectPosition: "50% 30%" }} />
              <img src={fruit} alt="" data-i="1" loading="lazy" />
              <img src={SCENE} alt="" data-i="2" loading="lazy" style={{ objectPosition: "50% 96%" }} />
              <span className="op-stage__tint" />
            </div>
          </div>
        </div>
      </section>

      {/* 4. La fiche */}
      <section className="op-sheet">
        <Reveal className="op-sheet__head">
          <h2>La fiche</h2>
          <p>Ce qu'il faut savoir avant de le choisir.</p>
        </Reveal>
        <Reveal as="div" delay={100} className="op-sheet__list">
          <dl>
            {SHEET.map(([k, v]) => (
              <div key={k}><dt>{k}</dt><dd>{v}</dd></div>
            ))}
          </dl>
        </Reveal>
      </section>

      {/* 5. L'univers : collage éditorial, vidéo du produit s'il en a une */}
      <section className="op-world">
        <div className="op-world__grid">
          <Reveal as="figure" className="op-w1 op-clip"><Crop src={SCENE} pos="50% 24%" z={1.9} par={-40} alt="Le bouchon doré du flacon" /><figcaption>Le bouchon, ciselé à l'or.</figcaption></Reveal>
          <Reveal as="blockquote" delay={120} className="op-quote"><p>Un parfum pensé comme une scène.</p><span>Pierre claire, feuillage dense, ciel rose : l'ambiance d'un jardin de palais où le vert profond répond à l'or.</span></Reveal>
          <Reveal as="figure" delay={80} className="op-w2 op-clip"><Crop src={fruit} pos="50% 40%" z={1.05} par={30} alt="Bergamote, cassis, rose et rhubarbe autour du flacon" /><figcaption>Le fruit et la fleur.</figcaption></Reveal>
          <Reveal as="figure" delay={160} className="op-w3 op-clip">
            {video ? <AutoVideo video={video} /> : <Crop src={SCENE} pos="50% 97%" z={1.5} par={-24} alt="Reflet du flacon dans l'eau" />}
            <figcaption>Le reflet dans l'eau.</figcaption>
          </Reveal>
        </div>
      </section>

      {/* 6. Détails : bande horizontale pilotée par le scroll vertical */}
      <section className="op-h" data-pin="h">
        <div className="op-h__pin">
          <Reveal className="op-h__head"><h2>Le flacon, de près</h2></Reveal>
          <div className="op-h__track">
            <figure className="op-h__it"><Crop src={SCENE} pos="50% 40%" z={1.05} lazy={false} alt="Le flacon Opulent Milano" /><figcaption>L'ensemble</figcaption></figure>
            <figure className="op-h__it op-h__it--w"><Crop src={SCENE} pos="50% 26%" z={2.1} alt="Bouchon doré" /><figcaption>Le bouchon doré</figcaption></figure>
            <figure className="op-h__it"><Crop src={SCENE} pos="50% 47%" z={2.3} alt="Médaillon or sur verre émeraude" /><figcaption>Le médaillon</figcaption></figure>
            <figure className="op-h__it op-h__it--w"><Crop src={SCENE} pos="88% 10%" z={1.8} alt="Arche couverte de lierre" /><figcaption>L'arche</figcaption></figure>
            <figure className="op-h__it"><Crop src={fruit} pos="50% 50%" z={1.05} alt="Ingrédients autour du flacon" /><figcaption>Les ingrédients</figcaption></figure>
            <figure className="op-h__it op-h__it--w"><Crop src={SCENE} pos="50% 96%" z={1.6} alt="Reflet dans l'eau" /><figcaption>Le reflet</figcaption></figure>
          </div>
        </div>
      </section>

      {/* 7. Instants */}
      <section className="op-moments">
        <Reveal className="op-moments__head"><h2>Un parfum, trois façons de le porter</h2></Reveal>
        <div className="op-moments__grid">
          {MOMENTS.map((m, i) => (
            <Reveal key={m.k} delay={i * 110} className={`op-moment op-moment--${m.tone}`}>
              <Crop src={SCENE} pos={m.pos} z={m.z} />
              <div className="op-moment__txt"><h3>{m.k}</h3><p>{m.t}</p></div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* 8. Le produit */}
      <section className="op-buy" id="le-parfum">
        <Reveal className="op-buy__head">
          <h2>Opulent Milano</h2>
          <ul className="op-assure">
            <li>Produit authentique</li>
            <li>Livraison offerte dès 100 €</li>
            <li>Expédition sous 48 h</li>
            <li>Retour gratuit sous 30 jours</li>
            <li>Emballage cadeau offert</li>
          </ul>
        </Reveal>
        {product ? (
          <div className="pdp op-pdp">
            <ProductGallery product={product} />
            <ProductBuy product={product} rating={reviews ? { average: reviews.average, count: reviews.count } : undefined} />
          </div>
        ) : (
          <div className="op-soon">
            <p>Bientôt disponible.</p>
            <Link href="/collections/parfums" className="op-link op-link--dark">Voir tous les parfums</Link>
          </div>
        )}
      </section>

      {/* 9. Avis : uniquement les vrais avis approuvés */}
      {hasReviews && (
        <section className="op-reviews">
          <Reveal className="op-reviews__head">
            <h2>{reviews!.average.toFixed(1)} <Stars n={Math.round(reviews!.average)} /></h2>
            <p>{reviews!.count} avis clients</p>
          </Reveal>
          <div className="op-reviews__grid">
            {reviews!.items.slice(0, 3).map((r, i) => (
              <Reveal key={r.id} delay={i * 120} className="op-review">
                <Stars n={r.rating} />
                {r.title && <h3>{r.title}</h3>}
                <p>{r.body}</p>
                <span>{r.author_name}{r.verified ? ", achat vérifié" : ""}</span>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* 10. Questions */}
      <section className="op-faq">
        <Reveal className="op-faq__head"><h2>Avant de vous décider</h2></Reveal>
        <Reveal delay={100} className="op-faq__list">
          {FAQ.map((f) => (
            <details key={f.q}>
              <summary>{f.q}<i aria-hidden="true" /></summary>
              <p>{f.a}</p>
            </details>
          ))}
        </Reveal>
      </section>

      {/* 11. Final : l'arche se referme sur l'appel à l'achat */}
      <section className="op-final">
        <h2 className="op-final__title" aria-label="Opulent Milano"><span>Opulent</span><span>Milano</span></h2>
        <Reveal className="op-final__arch op-clip">
          <Crop src={SCENE} pos="50% 42%" z={1} par={-30} alt="" />
        </Reveal>
        <Reveal className="op-final__in" delay={150}>
          <p>Laissez votre présence devenir inoubliable. Emballage cadeau offert.</p>
          <a href="#le-parfum" className="op-btn">{buyLabel}</a>
        </Reveal>
      </section>

      {/* 12. Suggestions */}
      {more.length > 0 && (
        <section className="pdp__sugg op-sugg">
          <div className="pdp__sugg-head">
            <span className="eyebrow">Complétez votre collection</span>
            <h2 className="display">Vous aimerez aussi</h2>
          </div>
          <div className="grid">{more.map((p) => <ProductCard key={p.id} product={p} />)}</div>
        </section>
      )}
    </div>
  );
}
