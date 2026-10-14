import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminHead, AdminStats } from "@/components/AdminHead";
import { getProduct, getProducts, type Product } from "@/lib/shopify";
import { decideReview, deleteReview } from "./actions";

export const metadata: Metadata = { title: "Modération des avis — Néoli", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const when = (d: string) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d));
const LABEL = { pending: "En attente", approved: "Publié", rejected: "Refusé" } as const;

export default async function ReviewsAdminPage() {
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  if (!u.user) redirect("/connexion?next=/admin/avis");
  const { data: isAdmin } = await db.rpc("is_agent_admin");
  if (isAdmin !== true) {
    return (
      <div className="adm"><h1 className="acct__title">Avis clients</h1>
        <div className="acct__empty"><h2>Accès réservé</h2><p>Ce compte n'est pas administrateur.</p></div></div>
    );
  }
  const { data } = await db.from("reviews").select("*").order("created_at", { ascending: false }).limit(200);
  const all = data ?? [];
  const pending = all.filter((r) => r.status === "pending");
  const done = all.filter((r) => r.status !== "pending");

  // Produit de chaque avis : miniature + nom (catalogue d'abord, puis fiche par fiche pour les autres).
  const catalog = await getProducts(100).catch(() => [] as Product[]);
  const byHandle = new Map<string, Product>(catalog.map((p) => [p.handle, p]));
  const missing = Array.from(new Set(all.map((r) => r.product_handle as string))).filter((h) => !byHandle.has(h));
  (await Promise.all(missing.map((h) => getProduct(h).catch(() => null)))).forEach((p) => p && byHandle.set(p.handle, p));

  const card = (r: (typeof all)[number]) => {
    const prod = byHandle.get(r.product_handle);
    return (
      <article key={r.id} className="admr">
        <a className="admr__prod" href={`/produits/${r.product_handle}`} target="_blank" rel="noreferrer">
          <span className="admr__thumb">
            {prod?.image ? <img src={prod.image.url} alt={prod.image.alt || prod.title} loading="lazy" /> : <i aria-hidden="true">N</i>}
          </span>
          <span className="admr__pname">
            <small>Avis sur</small>
            <b>{prod?.title ?? r.product_handle}</b>
            <em>Voir la fiche ↗</em>
          </span>
        </a>
        <div className="admr__main">
          <div className="admr__top">
            <span className="admr__stars" aria-label={`${r.rating} sur 5`}>{"★".repeat(r.rating)}<i>{"★".repeat(5 - r.rating)}</i></span>
            <span className="admr__status" data-st={r.status}>{LABEL[r.status as keyof typeof LABEL]}</span>
          </div>
          <h3 className="admr__title">{r.title}</h3>
          {r.body && <p className="admr__body">{r.body}</p>}
          <p className="admr__meta">{r.author_name} · {when(r.created_at)}{r.verified ? " · Achat vérifié" : ""}</p>
          <div className="admr__actions">
            {r.status !== "approved" && <form action={decideReview.bind(null, r.id, r.product_handle, "approved")}><button className="acct__btn" data-primary="true">Publier</button></form>}
            {r.status !== "rejected" && <form action={decideReview.bind(null, r.id, r.product_handle, "rejected")}><button className="acct__btn">Refuser</button></form>}
            <form action={deleteReview.bind(null, r.id, r.product_handle)}><button className="acct__btn" data-danger="true">Supprimer</button></form>
          </div>
        </div>
      </article>
    );
  };

  const published = all.filter((r) => r.status === "approved").length;
  const rejected = all.filter((r) => r.status === "rejected").length;

  return (
    <div className="adm admp">
      <AdminHead eyebrow="Contenu" title="Avis clients" lead="Chaque avis reste invisible tant que vous ne l'avez pas publié. Un avis refusé ou supprimé n'apparaît jamais sur la boutique." />
      <AdminStats items={[
        { label: "À valider", value: pending.length, hot: pending.length > 0 },
        { label: "Publiés", value: published },
        { label: "Refusés", value: rejected },
      ]} />
      <section className="admh__panel">
        <div className="admh__panel-head"><h2>À valider ({pending.length})</h2></div>
        {pending.length ? <div className="admr__list">{pending.map(card)}</div> : <p className="admh__empty">Aucun avis en attente.</p>}
      </section>
      {done.length > 0 && (
        <section className="admh__panel">
          <div className="admh__panel-head"><h2>Déjà traités ({done.length})</h2></div>
          <div className="admr__list">{done.map(card)}</div>
        </section>
      )}
    </div>
  );
}
