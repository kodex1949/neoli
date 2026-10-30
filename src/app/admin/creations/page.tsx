import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminHead, AdminStats } from "@/components/AdminHead";
import { CreationAdmin } from "@/components/CreationAdmin";
import { CREATION_COLS, type Creation } from "@/lib/creations";
import { createCreation } from "./actions";

export const metadata: Metadata = { title: "Créations — ESSNC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function CreationsAdmin() {
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  if (!u.user) redirect("/admin/login?next=/admin/creations");
  const { data: isAdmin } = await db.rpc("is_agent_admin");
  if (isAdmin !== true) return <div className="adm"><h1 className="acct__title">Créations</h1><div className="acct__empty"><h2>Accès réservé</h2><p>Ce compte n'est pas administrateur.</p></div></div>;

  const { data } = await db.from("creations").select(CREATION_COLS).order("position").order("created_at");
  const list = (data ?? []) as Creation[];
  const live = list.filter((c) => c.published).length;

  return (
    <div className="admh">
      <AdminHead eyebrow="Contenu" title="Créations" lead="Vos mises en avant éditoriales : un texte à gauche, un visuel (image ou vidéo) à droite, affichées sur la page d'accueil dans l'ordre ci-dessous." />
      <AdminStats items={[{ label: "Créations", value: list.length }, { label: "Publiées", value: live }, { label: "Brouillons", value: list.length - live }]} />
      <section className="admh__panel">
        <form action={createCreation} className="crea__new"><button type="submit" className="acct__btn" data-primary="true">+ Nouvelle création</button></form>
        {list.length === 0 && <p className="admh__empty">Aucune création pour le moment. Ajoutez-en une, puis publiez-la.</p>}
        <div className="crea__list">
          {list.map((c, i) => <CreationAdmin key={c.id} c={c} first={i === 0} last={i === list.length - 1} />)}
        </div>
      </section>
    </div>
  );
}
