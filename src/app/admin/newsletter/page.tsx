import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminHead, AdminStats } from "@/components/AdminHead";
import { deleteSubscriber, setSubscriberStatus } from "./actions";

export const metadata: Metadata = { title: "Newsletter — ESSNC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const PAGE = 50;
const when = (d: string) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d));

export default async function NewsletterAdmin({ searchParams }: { searchParams: Promise<{ q?: string; statut?: string; p?: string }> }) {
  const sp = await searchParams;
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  if (!u.user) redirect("/admin/login?next=/admin/newsletter");
  const { data: isAdmin } = await db.rpc("is_agent_admin");
  if (isAdmin !== true) {
    return (
      <div className="adm"><h1 className="acct__title">Newsletter</h1>
        <div className="acct__empty"><h2>Accès réservé</h2><p>Ce compte n'est pas administrateur.</p></div></div>
    );
  }

  const q = (sp.q ?? "").replace(/[%,()]/g, " ").trim().slice(0, 80);
  const statut = sp.statut === "desinscrits" ? "unsubscribed" : sp.statut === "actifs" ? "subscribed" : "";
  const page = Math.max(1, Number.parseInt(sp.p ?? "1", 10) || 1);
  const from = (page - 1) * PAGE;
  const week = new Date(Date.now() - 7 * 86400000).toISOString();

  let list = db.from("newsletter_subscribers").select("id,email,source,status,created_at,unsubscribed_at", { count: "exact" }).order("created_at", { ascending: false }).range(from, from + PAGE - 1);
  if (statut) list = list.eq("status", statut);
  if (q) list = list.ilike("email", `%${q}%`);
  const [rows, active, gone, recent] = await Promise.all([
    list,
    db.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "subscribed"),
    db.from("newsletter_subscribers").select("id", { count: "exact", head: true }).eq("status", "unsubscribed"),
    db.from("newsletter_subscribers").select("id", { count: "exact", head: true }).gte("created_at", week),
  ]);
  const total = rows.count ?? 0;
  const pages = Math.max(1, Math.ceil(total / PAGE));
  const href = (o: { q?: string; statut?: string; p?: string }) => {
    const m = { q, statut: sp.statut ?? "", p: "", ...o } as Record<string, string>;
    const qs = Object.entries(m).filter(([, v]) => v).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    return `/admin/newsletter${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="admh">
      <AdminHead eyebrow="Newsletter" title="Inscrits" lead="Les adresses recueillies par le formulaire du pied de page. Exportez les inscrits actifs pour votre outil d'e-mailing." />
      <AdminStats items={[
        { label: "Inscrits actifs", value: active.count ?? 0 },
        { label: "Cette semaine", value: recent.count ?? 0, note: "nouvelles inscriptions" },
        { label: "Désinscrits", value: gone.count ?? 0 },
      ]} />

      <section className="admh__panel">
        <div className="logs__bar">
          <nav className="logs__seg" aria-label="Statut">
            {([["", "Tous"], ["actifs", "Actifs"], ["desinscrits", "Désinscrits"]] as const).map(([k, l]) => <Link key={k} href={href({ statut: k })} data-on={(sp.statut ?? "") === k}>{l}</Link>)}
          </nav>
          <form className="logs__form" action="/admin/newsletter" method="get">
            {sp.statut && <input type="hidden" name="statut" value={sp.statut} />}
            <input type="search" name="q" defaultValue={q} placeholder="Rechercher une adresse" aria-label="Rechercher" />
            <button type="submit">Filtrer</button>
          </form>
          <Link className="nlad__export" href="/admin/newsletter/campagnes">Créer une newsletter</Link>
          <a className="nlad__export" href="/admin/newsletter/export">Exporter en CSV</a>
        </div>

        {(rows.data?.length ?? 0) === 0 && <p className="admh__empty">Aucun inscrit pour le moment. Le formulaire du pied de page alimente cette liste.</p>}
        <ul className="nlad__list">
          {(rows.data ?? []).map((r) => (
            <li key={r.id} data-off={r.status !== "subscribed"}>
              <span className="nlad__mail">{r.email}</span>
              <span className="nlad__meta">{r.source} · {when(r.created_at)}</span>
              <span className="nlad__st">{r.status === "subscribed" ? "Actif" : "Désinscrit"}</span>
              <span className="nlad__act">
                <form action={setSubscriberStatus}>
                  <input type="hidden" name="id" value={r.id} />
                  <input type="hidden" name="to" value={r.status === "subscribed" ? "unsubscribed" : "subscribed"} />
                  <button type="submit">{r.status === "subscribed" ? "Désinscrire" : "Réinscrire"}</button>
                </form>
                <form action={deleteSubscriber}>
                  <input type="hidden" name="id" value={r.id} />
                  <button type="submit" className="nlad__del">Supprimer</button>
                </form>
              </span>
            </li>
          ))}
        </ul>
        <div className="logs__pager">
          <span>{total} adresse{total > 1 ? "s" : ""} · page {Math.min(page, pages)} / {pages}</span>
          <div>
            {page > 1 && <Link href={href({ p: String(page - 1) })}>← Précédent</Link>}
            {page < pages && <Link href={href({ p: String(page + 1) })}>Suivant →</Link>}
          </div>
        </div>
      </section>
    </div>
  );
}
