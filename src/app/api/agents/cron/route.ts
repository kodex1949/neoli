import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { runAudit } from "@/lib/agents/orchestrator";

// Point d'entrée du planificateur (Supabase pg_cron, toutes les heures). Les agents tournent ainsi 24 h/24, 7 j/7, en lecture seule.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !anon) return NextResponse.json({ ok: false, error: "Supabase non configuré." }, { status: 500 });

  // Le jeton est vérifié par la base elle-même : rien à recopier côté Vercel.
  const token = req.headers.get("x-cron-token") ?? "";
  const gate = createClient(url, anon, { auth: { persistSession: false } });
  const { data: ok } = await gate.rpc("agent_cron_ok", { token });
  if (ok !== true) return NextResponse.json({ ok: false, error: "Non autorisé." }, { status: 401 });

  if (!service) return NextResponse.json({ ok: false, error: "SUPABASE_SERVICE_ROLE_KEY manquante dans les variables d'environnement du site." }, { status: 503 });
  const db = createClient(url, service, { auth: { persistSession: false } });

  const summary = await runAudit(db, { trigger: "scheduled", origin: req.nextUrl.origin, actor: "planificateur horaire" });
  return NextResponse.json({ ok: true, outcomes: summary.outcomes.map((o) => ({ agent: o.agent, status: o.status })) });
}
