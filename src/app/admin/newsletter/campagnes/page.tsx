import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminHead } from "@/components/AdminHead";
import { createCampaign } from "./actions";

export const metadata: Metadata = { title: "Campagnes — ESSNC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";
const when = (d: string) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(d));

export default async function Campaigns() {
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  if (!u.user) redirect("/admin/login?next=/admin/newsletter/campagnes");
  const { data: ok } = await db.rpc("is_agent_admin");
  if (ok !== true) return <div className="adm"><h1 className="acct__title">Campagnes</h1><div className="acct__empty"><h2>Accès réservé</h2><p>Ce compte n'est pas administrateur.</p></div></div>;
  const { data } = await db.from("newsletter_campaigns").select("id,subject,status,updated_at").order("updated_at", { ascending: false });
  return (
    <div className="admh">
      <AdminHead eyebrow="Newsletter" title="Campagnes" lead="Composez vos newsletters avec un aperçu en direct, puis exportez le code HTML pour votre outil d'envoi." />
      <section className="admh__panel">
        <div className="logs__bar">
          <form action={createCampaign}><button type="submit" className="acct__btn" data-primary="true">+ Nouvelle campagne</button></form>
          <Link className="nlad__export" href="/admin/newsletter">← Inscrits</Link>
        </div>
        {(data?.length ?? 0) === 0 && <p className="admh__empty">Aucune campagne pour le moment.</p>}
        <ul className="nlad__list">
          {(data ?? []).map((c) => (
            <li key={c.id}>
              <Link className="nlad__mail" href={`/admin/newsletter/campagnes/${c.id}`}>{c.subject}</Link>
              <span className="nlad__meta">Modifiée {when(c.updated_at)}</span>
              <span className="nlad__st">{c.status === "ready" ? "Prête" : "Brouillon"}</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
