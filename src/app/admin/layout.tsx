import { createClient } from "@/lib/supabase/server";
import { AdminShell } from "@/components/AdminShell";

export const dynamic = "force-dynamic";

/** Cadre commun de l'administration. Sans compte administrateur, on laisse chaque page afficher sa propre invitation à se connecter / « Accès réservé ». */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  const { data: ok } = u.user ? await db.rpc("is_agent_admin") : { data: false };
  if (!u.user || ok !== true) return <>{children}</>;

  const [reviews, recs] = await Promise.all([
    db.from("reviews").select("id", { count: "exact", head: true }).eq("status", "pending"),
    db.from("agent_recommendations").select("id", { count: "exact", head: true }).eq("status", "open"),
  ]);
  return (
    <AdminShell email={u.user.email ?? ""} badges={{ "/admin/avis": reviews.count ?? 0, "/admin/agents": recs.count ?? 0 }}>
      {children}
    </AdminShell>
  );
}
