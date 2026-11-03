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
import { ingredientsAccordion } from "@/lib/product-content";
import "../opulent-milano/opulent.css";
import "./amber.css";
import "./khamrah.css";

export const revalidate = 60;

const display = Cormorant_Garamond({ subsets: ["latin"], weight: ["300", "400", "500"], style: ["normal", "italic"], variable: "--font-op", display: "swap" });

/** Handle du produit dans Shopify (Produits → Khamrah Mira → Référencement → Ancre d'URL). */
const HANDLE = "khamrah-mira";
const NAME = ["Khamrah", "Mira"];
/** Visuel de l'univers : celui de la tuile d'accueil de droite. */
const SCENE = "https://skaqmzsoiyuwxblxmdgp.supabase.co/storage/v1/object/public/menu-media/home-tile-1-1793600715805.png";

const MOMENTS = [
  { k: "Le jour", t: "Une présence douce et enveloppante, qui accompagne sans jamais s'imposer.", tone: "day", pos: "50% 20%", z: 1.5 },
  { k: "Le soir", t: "Plus chaud, plus sensuel : un sillage qui s'attarde après votre passage.", tone: "night", pos: "50% 80%", z: 1.6 },
  { k: "Les fêtes", t: "Un flacon qui se remarque, un parfum qui s'offre. Emballage cadeau offert, prêt à glisser sous le sapin.", tone: "gift", pos: "50% 46%", z: 2 },
];

const PETALS = [
  { l: 6, s: 14, d: 15, t: 0 }, { l: 14, s: 10, d: 19, t: 6 }, { l: 23, s: 16, d: 17, t: 2 }, { l: 31, s: 9, d: 21, t: 9 },
  { l: 42, s: 13, d: 16, t: 4 }, { l: 53, s: 11, d: 20, t: 11 }, { l: 61, s: 15, d: 18, t: 1 }, { l: 70, s: 9, d: 22, t: 7 },
  { l: 78, s: 12, d: 15, t: 3 }, { l: 86, s: 16, d: 19, t: 10 }, { l: 93, s: 10, d: 17, t: 5 },
];

export const metadata: Metadata = {
  title: "Khamrah Mira — Lattafa — ESSNC",
  description: "Khamrah Mira de Lattafa : une fragrance envoûtante, entre douceur et sensualité. Livraison offerte dès 100 €, emballage cadeau offert.",
};

const sized = (url: string, w: number) => (url.includes("cdn.shopify.com") ? `${url}${url.includes("?") ? "&" : "?"}width=${w}` : url);

function Words({ text }: { text: string }) {
  return <>{text.split(" ").map((w, i) => <span key={i} className="op-w" data-on="0">{w} </span>)}</>;
}

function Stars({ n }: { n: number }) {
  return <span className="op-stars" aria-label={`${n} sur 5`}>{"★★★★★".slice(0, n)}<i>{"★★★★★".slice(n)}</i></span>;
}

function Crop({ src, pos = "50% 50%", z = 1, alt = "", par, lazy = true }: { src: string; pos?: string; z?: number; alt?: string; par?: number; lazy?: boolean }) {
  return (
    <div className="op-crop">
      <img src={src} alt={alt} loading={lazy ? "lazy" : undefined} data-par={par} style={{ objectPosition: pos, transformOrigin: pos, "--z": z } as CSSProperties} />
    </div>
  );
}

/** Les notes viennent de Shopify (étiquettes tete:/coeur:/fond: ou champ Ingrédients) : rien n'est inventé, la section disparaît si elles ne sont pas renseignées. */
function readNotes(p: Awaited<ReturnType<typeof getProduct>>) {
  const split = (v?: string) => (v ? v.split(/[,;·/]+/).map((s) => s.trim()).filter(Boolean).map((s) => s.charAt(0).toUpperCase() + s.slice(1)) : []);
  let top = split(p?.notes?.top), heart = split(p?.notes?.heart), base = split(p?.notes?.base);
  if (!top.length && !heart.length && !base.length && p?.ingredients) {
    const g = ingredientsAccordion(p.ingredients, p.allergens)?.groups ?? [];
    const f = (l: string) => split(g.find((x) => x.label === l)?.value);
    top = f("Notes de tête"); heart = f("Notes de cœur"); base = f("Notes de fond");
  }
  return [
    { n: "I", tier: "Tête", line: "La première impression", notes: top },
    { n: "II", tier: "Cœur", line: "Le caractère du parfum", notes: heart },
    { n: "III", tier: "Fond", line: "Le sillage qui s'installe", notes: base },
  ].filter((t) => t.notes.length);
}

export default async function KhamrahMira() {
  let product = await getProduct(HANDLE);
  if (!product) product = (await getProducts(60)).find((p) => /khamrah\s*mira/i.test(p.title)) ?? null;
  const handle = product?.handle ?? HANDLE;
  const reviews = product ? await getReviews(handle) : null;
  const more = (await getProducts(8)).filter((p) => p.handle !== handle).slice(0, 4);
  const video = product?.media?.find((m) => m.type === "video");
  const photos = (product?.media ?? []).filter((m) => m.type === "image").map((m) => sized(m.url, 1400));
  const alt1 = photos[1] ?? SCENE;
  const alt2 = photos[2] ?? photos[0] ?? SCENE;
  const hasReviews = !!reviews && reviews.count > 0;
  const buyLabel = product ? `Commander · ${product.price}` : "Découvrir le parfum";
  const tiers = readNotes(product);
  const size = product?.format ? product.format.replace(/^spray\s*/i, "") : undefined;
  const sheet: [string, string][] = [["Maison", "Lattafa"], ...(size ? [["Contenance", size] as [string, string]] : []), ["Pour", "Elle"], ["Flacon", "Verre ambré, plaque dorée"]];
  const faq = [
    { q: "Le produit est-il authentique ?", a: "Oui. Le parfum est de la marque Lattafa, vendu et expédié par ESSNC." },
    ...(tiers.length ? [{ q: "Quelles sont ses notes ?", a: tiers.map((t) => `${t.tier === "Tête" ? "En tête" : t.tier === "Cœur" ? "Au cœur" : "En fond"} : ${t.notes.join(", ").toLowerCase()}`).join(". ") + "." }] : []),
    ...(size ? [{ q: "Quelle est sa contenance ?", a: `Le flacon contient ${size}.` }] : []),
    { q: "Quand vais-je le recevoir ?", a: "Expédition sous 48 h. Livraison standard en 3 à 5 jours ouvrés, express en 24 à 48 h. Livraison offerte dès 100 € d'achat." },
    { q: "Puis-je le retourner ?", a: "Oui : retour gratuit sous 30 jours pour tout produit non ouvert. L'emballage cadeau est offert." },
  ];

  const keywords = ["Douceur", "Sensualité", "Ambre", "Lattafa", "Envoûtant", "Sillage", "Élégance"];
  return (
    <div className={`op op--amber kh ${display.variable}`}>
      <OpulentFx title="Khamrah Mira" price={product?.price} />

      {/* 1. Héros : un disque de lumière s'élargit jusqu'à couvrir l'écran */}
      <section className="kh-hero" data-pin="hero">
        <div className="kh-hero__pin">
          <div className="kh-hero__disc">
            <img src={SCENE} alt="Flacon Khamrah Mira de Lattafa mis en scène" />
            <span className="kh-hero__shade" />
          </div>
          <div className="kh-ring" aria-hidden="true">
            <svg viewBox="0 0 200 200"><defs><path id="kh-c" d="M100,100 m-88,0 a88,88 0 1,1 176,0 a88,88 0 1,1 -176,0" /></defs><text><textPath href="#kh-c">Lattafa · Khamrah Mira · Lattafa · Khamrah Mira · Lattafa · Khamrah Mira ·</textPath></text></svg>
          </div>
          <h1 className="kh-hero__title" aria-label="Khamrah Mira">
            <span className="kh-hero__l1"><span className="op-line"><span style={{ "--i": 1 } as CSSProperties}>{NAME[0]}</span></span></span>
            <span className="kh-hero__l2"><span className="op-line"><span style={{ "--i": 2 } as CSSProperties}>{NAME[1]}</span></span></span>
          </h1>
          <span className="kh-hero__sub op-in" style={{ "--i": 4 } as CSSProperties}>Défilez pour entrer dans la lumière</span>
          <div className="kh-hero__final">
            <p>Entre douceur et sensualité.</p>
            <a href="#le-parfum" className="op-btn">{buyLabel}</a>
            <ul>
              {hasReviews && <li><Stars n={Math.round(reviews!.average)} /> {reviews!.average.toFixed(1)} ({reviews!.count} avis)</li>}
              <li>Livraison offerte dès 100 €</li>
              <li>Emballage cadeau offert</li>
              <li>Retour 30 jours</li>
            </ul>
          </div>
        </div>
      </section>

      {/* 2. Manifeste */}
      <section className="kh-man" id="esprit" data-words>
        <h2><Words text="Une fragrance envoûtante, entre douceur et sensualité, qui s'installe doucement et ne s'oublie pas." /></h2>
        <Reveal delay={120}><a href={tiers.length ? "#notes" : "#le-parfum"} className="op-link">{tiers.length ? "Lire la composition" : "Découvrir le parfum"}</a></Reveal>
      </section>

      {/* 3. Bandeau */}
      <div className="kh-marq" aria-hidden="true"><div className="kh-marq__in">{[...keywords, ...keywords, ...keywords, ...keywords].map((k, i) => <span key={i}>{k}</span>)}</div></div>

      {/* 4. Chapitres épinglés */}
      <section className="kh-chap" data-stage-sec data-stage="0" data-pin="s">
        <div className="kh-chap__pin">
          <div className="kh-chap__txt">
            <span className="kh-chap__no">01 <b>/ 03</b></span>
            {MOMENTS.map((m, i) => (
              <div key={m.k} className="kh-ch" data-i={i}>
                <h3>{m.k}</h3>
                <p>{m.t}</p>
              </div>
            ))}
            <div className="kh-chap__bar" aria-hidden="true"><i /></div>
          </div>
          <div className="kh-chap__vis">
            <img src={SCENE} alt="" data-i="0" loading="lazy" />
            <img src={alt1} alt="" data-i="1" loading="lazy" />
            <img src={alt2} alt="" data-i="2" loading="lazy" />
          </div>
        </div>
      </section>

      {/* 5. Notes (seulement si Shopify les contient) */}
      {tiers.length > 0 && (
        <section className="kh-notes" id="notes">
          <Reveal as="h2">Trois temps, une signature</Reveal>
          <div className="kh-notes__grid">
            {tiers.map((t, i) => (
              <Reveal key={t.tier} delay={i * 120} className="kh-note">
                <span className="kh-note__no">{t.n}</span>
                <h3>{t.tier}</h3>
                <p>{t.line}</p>
                <ul>{t.notes.slice(0, 4).map((n) => <li key={n}>{n}</li>)}</ul>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* 6. La fiche en chiffres */}
      <dl className="kh-facts">{sheet.map(([k, v]) => <div key={k} className="kh-fact"><dt>{k}</dt><dd>{v}</dd></div>)}</dl>

      {/* 7. Galerie */}
      <section className="kh-gal">
        <Reveal as="figure" className="op-clip"><Crop src={alt1} pos="50% 45%" z={1.15} par={-26} alt="Le flacon Khamrah Mira" /><figcaption>La silhouette</figcaption></Reveal>
        <Reveal as="figure" delay={100} className="op-clip">{video ? <AutoVideo video={video} /> : <Crop src={SCENE} pos="50% 50%" z={1.25} par={22} alt="Ambiance Khamrah Mira" />}<figcaption>L'ambiance</figcaption></Reveal>
        <Reveal as="figure" delay={200} className="op-clip"><Crop src={alt2} pos="50% 50%" z={1.1} par={-30} alt="Khamrah Mira de près" /><figcaption>De près</figcaption></Reveal>
      </section>

      <section className="op-buy" id="le-parfum">
        <Reveal className="op-buy__head">
          <h2>Khamrah Mira</h2>
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

      <section className="op-faq">
        <Reveal className="op-faq__head"><h2>Avant de vous décider</h2></Reveal>
        <Reveal delay={100} className="op-faq__list">
          {faq.map((f) => (
            <details key={f.q}>
              <summary>{f.q}<i aria-hidden="true" /></summary>
              <p>{f.a}</p>
            </details>
          ))}
        </Reveal>
      </section>

      {/* 9. Final */}
      <section className="kh-final">
        <div className="kh-final__bg"><img src={SCENE} alt="" loading="lazy" /></div>
        <div>
          <h2>Khamrah<br />Mira</h2>
          <p>Laissez votre présence devenir inoubliable.</p>
          <a href="#le-parfum" className="op-btn">{buyLabel}</a>
        </div>
      </section>

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
