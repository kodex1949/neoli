import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProducts } from "@/lib/shopify";
import { menuSlots } from "@/lib/menu-media";

export const metadata: Metadata = { title: "Administration — ESSNC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const when = (d: string) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d));

export default async function AdminHome() {
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  if (!u.user) redirect("/connexion?next=/admin");
  const { data: isAdmin } = await db.rpc("is_agent_admin");
  if (isAdmin !== true) {
    return (
      <div className="adm"><h1 className="acct__title">Administration</h1>
        <div className="acct__empty"><h2>Accès réservé</h2><p>Ce compte n'est pas administrateur.</p></div></div>
    );
  }

  const [pending, approved, recs, alerts, media, latest, products] = await Promise.all([
    db.from("reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("reviews").select("id", { count: "exact", head: true }).eq("status", "approved"),
    db.from("agent_recommendations").select("id,title,severity,agent_id,created_at").eq("status", "open").order("created_at", { ascending: false }).limit(4),
    db.from("agent_alerts").select("id", { count: "exact", head: true }).eq("acknowledged", false),
    db.from("menu_media").select("slot", { count: "exact", head: true }),
    db.from("reviews").select("id,author_name,rating,title,product_handle,created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(4),
    getProducts(100).catch(() => []),
  ]);

  const stats = [
    { label: "Avis à valider", value: pending.count ?? 0, href: "/admin/avis", note: `${approved.count ?? 0} publié${(approved.count ?? 0) > 1 ? "s" : ""}`, hot: (pending.count ?? 0) > 0 },
    { label: "Actions des agents", value: recs.data?.length ?? 0, href: "/admin/agents", note: `${alerts.count ?? 0} alerte${(alerts.count ?? 0) > 1 ? "s" : ""} non vue${(alerts.count ?? 0) > 1 ? "s" : ""}`, hot: (alerts.count ?? 0) > 0 },
    { label: "Visuels personnalisés", value: media.count ?? 0, href: "/admin/menu", note: `sur ${menuSlots().length} emplacements` },
    { label: "Produits en ligne", value: products.length, href: "https://admin.shopify.com/store/9nwbbg-xh/products", note: "boutique Shopify", ext: true },
  ];

  const hour = new Date().getHours();
  const hello = hour < 18 ? "Bonjour" : "Bonsoir";
  const today = new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date());

  return (
    <div className="admh">
      <header className="admh__head">
        <p className="admh__eyebrow">{today}</p>
        <h1 className="admh__title">{hello}.</h1>
        <p className="admh__lead">Tout ce qui fait vivre la boutique, au même endroit : visuels, avis, agents.</p>
      </header>

      <section className="admh__stats" aria-label="Chiffres clés">
        {stats.map((s) => {
          const body = (
            <>
              <span className="admh__stat-label">{s.label}</span>
              <strong data-hot={s.hot ? "true" : undefined}>{s.value}</strong>
              <em>{s.note}</em>
            </>
          );
          return s.ext ? <a key={s.label} href={s.href} target="_blank" rel="noreferrer" className="admh__stat">{body}</a> : <Link key={s.label} href={s.href} className="admh__stat">{body}</Link>;
        })}
      </section>

      <div className="admh__cols">
        <section className="admh__panel">
          <div className="admh__panel-head"><h2>À traiter</h2></div>
          {(latest.data?.length ?? 0) + (recs.data?.length ?? 0) === 0 && <p className="admh__empty">Rien en attente. Tout est à jour.</p>}
          <ul className="admh__list">
            {(latest.data ?? []).map((r) => (
              <li key={r.id}>
                <Link href="/admin/avis">
                  <span className="admh__tag">Avis</span>
                  <span className="admh__item"><b>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)} {r.title || "Sans titre"}</b><small>{r.author_name} · {r.product_handle} · {when(r.created_at)}</small></span>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6" /></svg>
                </Link>
              </li>
            ))}
            {(recs.data ?? []).map((r) => (
              <li key={r.id}>
                <Link href="/admin/agents">
                  <span className="admh__tag" data-sev={r.severity}>Agent</span>
                  <span className="admh__item"><b>{r.title}</b><small>{r.agent_id} · {when(r.created_at)}</small></span>
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6" /></svg>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="admh__panel">
          <div className="admh__panel-head"><h2>Raccourcis</h2></div>
          <div className="admh__tiles">
            <Link href="/admin/menu" className="admh__tile"><b>Page d'accueil</b><span>Héros, tuiles, titres, boutons</span></Link>
            <Link href="/admin/menu" className="admh__tile"><b>Menu</b><span>Vignettes, cartes, vidéos</span></Link>
            <Link href="/admin/avis" className="admh__tile"><b>Avis clients</b><span>Publier, refuser, supprimer</span></Link>
            <Link href="/admin/agents" className="admh__tile"><b>Audit de la boutique</b><span>Lancer et valider les actions</span></Link>
            <a href="https://admin.shopify.com/store/9nwbbg-xh/products" target="_blank" rel="noreferrer" className="admh__tile"><b>Produits</b><span>Prix, formats, étiquettes (Shopify)</span></a>
            <a href="https://admin.shopify.com/store/9nwbbg-xh/orders" target="_blank" rel="noreferrer" className="admh__tile"><b>Commandes</b><span>Suivi et expéditions (Shopify)</span></a>
          </div>
        </section>
      </div>
    </div>
  );
}
