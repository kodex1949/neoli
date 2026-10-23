import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/AuthForm";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Connexion — ESSNC" };
export const dynamic = "force-dynamic";

const safe = (n?: string) => (n && n.startsWith("/") && !n.startsWith("//") ? n : "/compte");

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; mode?: string }> }) {
  const sp = await searchParams;
  const next = safe(sp.next);
  if (process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
    const supabase = await createClient();
    const { data } = await supabase.auth.getUser();
    if (data.user) redirect(next);
  }
  return <AuthForm next={next} initialMode={sp.mode === "inscription" ? "signup" : "login"} />;
}
