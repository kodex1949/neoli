import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminHead } from "@/components/AdminHead";
import { AnnouncementAdmin } from "@/components/AnnouncementAdmin";
import { ANNOUNCEMENT_KEY, normalizeAnnouncement } from "@/lib/announcement";

export const metadata: Metadata = { title: "Bandeau d'annonce — ESSNC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function AnnonceAdmin() {
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  if (!u.user) redirect("/admin/login?next=/admin/annonce");
  const { data: ok } = await db.rpc("is_agent_admin");
  if (ok !== true) return <div className="adm"><h1 className="acct__title">Bandeau d'annonce</h1><div className="acct__empty"><h2>Accès réservé</h2><p>Ce compte n'est pas administrateur.</p></div></div>;
  const { data } = await db.from("site_settings").select("value").eq("key", ANNOUNCEMENT_KEY).maybeSingle();
  return (
    <div className="admh">
      <AdminHead eyebrow="Contenu" title="Bandeau d'annonce" lead="La ligne affichée tout en haut du site : promotion, livraison, événement. Modifiez le texte et le lien, changez le style ou masquez-la." />
      <section className="admh__panel"><AnnouncementAdmin initial={normalizeAnnouncement(data?.value)} /></section>
    </div>
  );
}
