import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminLogin } from "@/components/AdminLogin";

export const metadata: Metadata = { title: "Connexion administrateur — ESSNC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

// Seules les pages de l'administration sont acceptées comme destination après connexion.
const safe = (n?: string) => (n && n.startsWith("/admin") && !n.startsWith("//") && !n.startsWith("/admin/login") ? n : "/admin");

export default async function AdminLoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const next = safe((await searchParams).next);
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  let email: string | null = null;
  if (u.user) {
    const { data: ok } = await db.rpc("is_agent_admin");
    if (ok === true) redirect(next);
    email = u.user.email ?? "";
  }
  return <AdminLogin next={next} deniedEmail={email} />;
}
