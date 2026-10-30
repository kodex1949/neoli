import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const cell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`; // neutralise l'injection de formule dans Excel
  return `"${s.replace(/"/g, '""')}"`;
};

/** Export CSV des inscrits actifs (administrateurs uniquement). */
export async function GET() {
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  if (!u.user) return new Response("Connexion requise.", { status: 401 });
  const { data: ok } = await db.rpc("is_agent_admin");
  if (ok !== true) return new Response("Accès réservé.", { status: 403 });
  const { data } = await db.from("newsletter_subscribers").select("email,source,status,created_at").eq("status", "subscribed").order("created_at", { ascending: false }).limit(50000);
  const lines = ["email,source,statut,inscrit_le", ...(data ?? []).map((r) => [r.email, r.source, r.status, r.created_at].map(cell).join(","))];
  return new Response("﻿" + lines.join("\r\n"), {
    headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="newsletter-${new Date().toISOString().slice(0, 10)}.csv"`, "Cache-Control": "no-store" },
  });
}
