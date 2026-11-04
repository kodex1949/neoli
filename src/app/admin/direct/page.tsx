import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminHead } from "@/components/AdminHead";
import { getGlobeData } from "@/lib/globe-data";
import { LiveBoard } from "./LiveBoard";
import "./direct.css";

export const metadata: Metadata = { title: "En direct — ESSNC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function DirectPage() {
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  if (!u.user) redirect("/admin/login?next=/admin/direct");
  const { data: isAdmin } = await db.rpc("is_agent_admin");
  if (isAdmin !== true) {
    return (<div className="adm"><h1 className="acct__title">En direct</h1><div className="acct__empty"><h2>Accès réservé</h2><p>Ce compte n'est pas administrateur.</p></div></div>);
  }
  let globe: ReturnType<typeof getGlobeData> | null = null;
  try { globe = getGlobeData(); } catch { globe = null; }
  return (
    <div className="admp dir">
      <AdminHead eyebrow="Intelligence" title="En direct" lead="Les visiteurs présents sur le site en ce moment, connectés ou non. La page se met à jour toute seule ; aucun compte client n'est nécessaire." />
      <LiveBoard globe={globe} />
    </div>
  );
}
