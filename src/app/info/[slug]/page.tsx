import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { LEGAL } from "@/lib/legal";

export function generateStaticParams() {
  return Object.keys(LEGAL).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const page = LEGAL[slug];
  return { title: page ? `${page.title} — ESSNC` : "ESSNC" };
}

export default async function InfoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = LEGAL[slug];
  if (!page) notFound();
  return (
    <>
      <header className="info__hero">
        <p className="info__eyebrow">Service client</p>
        <h1 className="info__title">{page.title}</h1>
        <p className="info__lead">{page.lead}</p>
      </header>
      <div className="info__grid">
        <nav className="info__nav" aria-label="Informations">
          <h2>Informations</h2>
          {Object.entries(LEGAL).map(([s, p]) => (
            <Link key={s} href={`/info/${s}`} scroll={false} aria-current={s === slug ? "page" : undefined}>{p.title}</Link>
          ))}
        </nav>
        <div className="info__body" key={slug}>
          {page.sections.map((s, i) => (
            <section key={s.h} className="info__sec">
              <span className="info__num">{String(i + 1).padStart(2, "0")}</span>
              <div>
                <h2>{s.h}</h2>
                {s.p.map((t, j) => <p key={j}>{t}</p>)}
              </div>
            </section>
          ))}
          <aside className="info__contact">
            <h3>Une question ?</h3>
            <p>Notre équipe vous répond sous 48 h ouvrées.</p>
            <a href="mailto:contact@essnc.example">Nous écrire</a>
          </aside>
        </div>
      </div>
    </>
  );
}
