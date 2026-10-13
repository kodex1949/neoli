import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
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

  const card = (r: (typeof all)[number]) => (
    <article key={r.id} className="acct__card" style={{ display: "grid", gap: 8, padding: 24 }}>
      <p style={{ margin: 0, fontSize: 12, color: "#7b8487" }}>
        {when(r.created_at)} · <a href={`/produits/${r.product_handle}`} style={{ color: "inherit" }}>{r.product_handle}</a> · {LABEL[r.status as keyof typeof LABEL]}{r.verified ? " · Achat vérifié" : ""}
      </p>
      <p style={{ margin: 0, fontSize: 18 }}>{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)} <strong style={{ fontWeight: 500 }}>{r.title}</strong></p>
      <p style={{ margin: 0, fontSize: 14, lineHeight: 1.6, whiteSpace: "pre-line" }}>{r.body}</p>
      <p style={{ margin: 0, fontSize: 13, color: "#7b8487" }}>— {r.author_name}</p>
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
        {r.status !== "approved" && <form action={decideReview.bind(null, r.id, r.product_handle, "approved")}><button className="acct__btn" data-primary="true">Publier</button></form>}
        {r.status !== "rejected" && <form action={decideReview.bind(null, r.id, r.product_handle, "rejected")}><button className="acct__btn">Refuser</button></form>}
        <form action={deleteReview.bind(null, r.id, r.product_handle)}><button className="acct__btn">Supprimer</button></form>
      </div>
    </article>
  );

  return (
    <div className="adm" style={{ maxWidth: 820, margin: "0 auto", padding: "48px 24px 96px", display: "grid", gap: 24 }}>
      <h1 className="acct__title">Avis clients</h1>
      <h2 style={{ margin: 0, fontSize: 16, fontWeight: 500 }}>À valider ({pending.length})</h2>
      {pending.length ? pending.map(card) : <p style={{ color: "#7b8487", fontSize: 14 }}>Aucun avis en attente.</p>}
      {done.length > 0 && <h2 style={{ margin: "24px 0 0", fontSize: 16, fontWeight: 500 }}>Déjà traités ({done.length})</h2>}
      {done.map(card)}
    </div>
  );
}
