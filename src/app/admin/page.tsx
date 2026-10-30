import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getProducts } from "@/lib/shopify";
import { menuSlots } from "@/lib/menu-media";

export const metadata: Metadata = { title: "Administration — ESSNC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const ago = (d?: string | null) => {
  if (!d) return "jamais";
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.round(h / 24)} j`;
};
const MODES: Record<string, string> = { read_only: "Lecture seule", approval_required: "Sur validation", auto_execute: "Automatique" };

const when = (d: string) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d));

export default async function AdminHome() {
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  if (!u.user) redirect("/admin/login?next=/admin");
  const { data: isAdmin } = await db.rpc("is_agent_admin");
  if (isAdmin !== true) {
    return (
      <div className="adm"><h1 className="acct__title">Administration</h1>
        <div className="acct__empty"><h2>Accès réservé</h2><p>Ce compte n'est pas administrateur.</p></div></div>
    );
  }

  const since = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const [pending, approved, recs, alerts, media, latest, products, agents, runs, reports, ratings] = await Promise.all([
    db.from("reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("reviews").select("id", { count: "exact", head: true }).eq("status", "approved"),
    db.from("agent_recommendations").select("id,title,severity,agent_id,created_at").eq("status", "open").order("created_at", { ascending: false }).limit(4),
    db.from("agent_alerts").select("id", { count: "exact", head: true }).eq("acknowledged", false),
    db.from("menu_media").select("slot", { count: "exact", head: true }),
    db.from("reviews").select("id,author_name,rating,title,product_handle,created_at").eq("status", "pending").order("created_at", { ascending: false }).limit(4),
    getProducts(100).catch(() => []),
    db.from("agents").select("id,name,role,mode,enabled").order("name"),
    db.from("agent_runs").select("agent_id,status,trigger,started_at").gte("started_at", since).order("started_at", { ascending: false }).limit(800),
    db.from("agent_reports").select("id,agent_id,kind,title,created_at").order("created_at", { ascending: false }).limit(6),
    db.from("reviews").select("rating").eq("status", "approved"),
  ]);

  // Agents : dernière exécution de chacun, volume et erreurs sur 24 h
  const runList = runs.data ?? [];
  const lastRun = new Map<string, { status: string; at: string }>();
  for (const r of runList) if (!lastRun.has(r.agent_id)) lastRun.set(r.agent_id, { status: r.status, at: r.started_at });
  const lastScheduled = runList.find((r) => r.trigger === "scheduled")?.started_at;
  const errors24 = runList.filter((r) => r.status !== "ok" && r.status !== "success" && r.status !== "running").length;
  const agentList = agents.data ?? [];

  // Avis : note moyenne
  const rs = ratings.data ?? [];
  const avg = rs.length ? rs.reduce((a, r) => a + r.rating, 0) / rs.length : 0;

  // Catalogue : répartition par catégorie et fiches à compléter
  const byCat = new Map<string, number>();
  for (const p of products) byCat.set(p.category || "Sans catégorie", (byCat.get(p.category || "Sans catégorie") ?? 0) + 1);
  const cats = [...byCat.entries()].sort((a, b) => b[1] - a[1]);
  const maxCat = Math.max(1, ...cats.map(([, n]) => n));
  const todo = products
    .map((p) => ({ p, miss: [!p.image && "visuel", !(p.description && p.description.length > 60) && "description", !p.category && "catégorie"].filter(Boolean) as string[] }))
    .filter((x) => x.miss.length);

  // Santé : chaque point est vert / orange avec la marche à suivre
  const hasService = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const schedAge = lastScheduled ? (Date.now() - new Date(lastScheduled).getTime()) / 60000 : Infinity;
  const checks: { label: string; ok: boolean; note: string }[] = [
    { label: "Planificateur des agents", ok: schedAge < 130, note: lastScheduled ? `dernier passage ${ago(lastScheduled)}` : "aucun passage automatique sur 24 h" },
    { label: "Clé service Supabase (Vercel)", ok: hasService, note: hasService ? "configurée" : "à ajouter dans les variables d'environnement" },
    { label: "Catalogue Shopify", ok: products.length > 0, note: `${products.length} produit${products.length > 1 ? "s" : ""} lu${products.length > 1 ? "s" : ""}` },
    { label: "Fiches produit complètes", ok: todo.length === 0, note: todo.length ? `${todo.length} à compléter` : "toutes complètes" },
    { label: "Erreurs d'agents (24 h)", ok: errors24 === 0, note: errors24 ? `${errors24} exécution${errors24 > 1 ? "s" : ""} en erreur` : "aucune" },
    { label: "Avis en attente", ok: (pending.count ?? 0) === 0, note: (pending.count ?? 0) ? `${pending.count} à modérer` : "à jour" },
  ];

  const stats = [
    { label: "Avis à valider", value: pending.count ?? 0, href: "/admin/avis", note: `${approved.count ?? 0} publié${(approved.count ?? 0) > 1 ? "s" : ""}`, hot: (pending.count ?? 0) > 0 },
    { label: "Actions des agents", value: recs.data?.length ?? 0, href: "/admin/agents", note: `${alerts.count ?? 0} alerte${(alerts.count ?? 0) > 1 ? "s" : ""} non vue${(alerts.count ?? 0) > 1 ? "s" : ""}`, hot: (alerts.count ?? 0) > 0 },
    { label: "Visuels personnalisés", value: media.count ?? 0, href: "/admin/menu", note: `sur ${menuSlots().length} emplacements` },
    { label: "Produits en ligne", value: products.length, href: "https://admin.shopify.com/store/9nwbbg-xh/products", note: "boutique Shopify", ext: true },
  ];

  const extra = [
    { label: "Exécutions d'agents · 24 h", value: runList.length, note: `${agentList.filter((a) => a.enabled).length} agent${agentList.filter((a) => a.enabled).length > 1 ? "s" : ""} actif${agentList.filter((a) => a.enabled).length > 1 ? "s" : ""}` },
    { label: "Note moyenne", value: rs.length ? avg.toFixed(1).replace(".", ",") : "—", note: `${rs.length} avis publié${rs.length > 1 ? "s" : ""}` },
    { label: "Fiches à compléter", value: todo.length, note: "visuel, description, catégorie", hot: todo.length > 0 },
    { label: "Catégories", value: cats.length, note: "dans le catalogue" },
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

      <section className="admh__stats admh__stats--sub" aria-label="Indicateurs">
        {extra.map((s) => (
          <div key={s.label} className="admh__stat">
            <span className="admh__stat-label">{s.label}</span>
            <strong data-hot={s.hot ? "true" : undefined}>{s.value}</strong>
            <em>{s.note}</em>
          </div>
        ))}
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

      <div className="admh__cols admh__cols--even">
        <section className="admh__panel">
          <div className="admh__panel-head admh__panel-head--row"><h2>Équipe d'agents</h2><Link href="/admin/agents">Tout voir</Link></div>
          <ul className="admh__list">
            {agentList.map((a) => {
              const r = lastRun.get(a.id);
              const bad = r && r.status !== "ok" && r.status !== "success" && r.status !== "running";
              return (
                <li key={a.id}>
                  <Link href="/admin/agents">
                    <span className="admh__dot" data-s={!a.enabled ? "off" : bad ? "bad" : "ok"} aria-hidden="true" />
                    <span className="admh__item"><b>{a.name}</b><small>{MODES[a.mode] ?? a.mode} · {a.enabled ? `dernier passage ${ago(r?.at)}` : "désactivé"}</small></span>
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m9.5 6 6 6-6 6" /></svg>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>

        <section className="admh__panel">
          <div className="admh__panel-head"><h2>Santé du site</h2></div>
          <ul className="admh__checks">
            {checks.map((c) => (
              <li key={c.label} data-ok={c.ok}>
                <span className="admh__mark" aria-hidden="true">{c.ok ? "✓" : "!"}</span>
                <span className="admh__item"><b>{c.label}</b><small>{c.note}</small></span>
              </li>
            ))}
          </ul>
        </section>
      </div>

      <div className="admh__cols admh__cols--even">
        <section className="admh__panel">
          <div className="admh__panel-head admh__panel-head--row"><h2>Catalogue</h2><a href="https://admin.shopify.com/store/9nwbbg-xh/products" target="_blank" rel="noreferrer">Ouvrir Shopify</a></div>
          {cats.length === 0 && <p className="admh__empty">Aucun produit lu pour le moment.</p>}
          <ul className="admh__bars">
            {cats.map(([name, n]) => (
              <li key={name}>
                <span>{name}</span>
                <i style={{ "--w": `${(n / maxCat) * 100}%` } as React.CSSProperties} aria-hidden="true" />
                <b>{n}</b>
              </li>
            ))}
          </ul>
          {todo.length > 0 && (
            <div className="admh__todo">
              <h3>Fiches à compléter</h3>
              <ul>
                {todo.slice(0, 5).map(({ p, miss }) => (
                  <li key={p.id}><Link href={`/produits/${p.handle}`}>{p.title}</Link><small>manque : {miss.join(", ")}</small></li>
                ))}
              </ul>
            </div>
          )}
        </section>

        <section className="admh__panel">
          <div className="admh__panel-head"><h2>Activité récente</h2></div>
          {(reports.data?.length ?? 0) === 0 && <p className="admh__empty">Aucune activité récente.</p>}
          <ul className="admh__feed">
            {(reports.data ?? []).map((r) => (
              <li key={r.id}>
                <span className="admh__feed-dot" aria-hidden="true" />
                <span className="admh__item"><b>{r.title}</b><small>{r.agent_id} · {r.kind} · {ago(r.created_at)}</small></span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
