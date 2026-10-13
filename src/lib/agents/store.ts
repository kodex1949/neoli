// Persistance Supabase (RLS : seul un administrateur déclaré dans agent_admins peut lire ou écrire).
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Finding, Mode } from "./types";

export type AgentRow = { id: string; name: string; role: string; mode: Mode; enabled: boolean; daily_budget_cents: number };

export async function audit(db: SupabaseClient, row: { agent_id?: string; trigger?: string; action: string; mode?: string; data_used?: unknown; result?: string; error?: string; approval_status?: string }) {
  await db.from("agent_audit_log").insert({ data_used: {}, ...row });
}

export const dayKey = (d = new Date()) => d.toISOString().slice(0, 10);
export const hourKey = (d = new Date()) => d.toISOString().slice(0, 13);

export async function costToday(db: SupabaseClient, agentId: string): Promise<number> {
  const { data } = await db.from("agent_runs").select("cost_cents").eq("agent_id", agentId).gte("started_at", `${dayKey()}T00:00:00Z`);
  return (data ?? []).reduce((n, r) => n + Number(r.cost_cents ?? 0), 0);
}

/** Enregistre les recommandations sans jamais écraser une décision humaine ni le travail d'un autre agent (clé unique par agent + constat + jour). */
export async function saveFindings(db: SupabaseClient, agentId: string, runId: string, findings: Finding[]) {
  if (!findings.length) return 0;
  const day = dayKey();
  const rows = findings.filter((f) => f.severity !== "info" || f.proposedAction || f.key.startsWith("analytics.")).map((f) => ({
    agent_id: agentId, run_id: runId, severity: f.severity, title: f.title, detail: f.detail, data: f.data ?? {}, proposed_action: f.proposedAction ?? null,
    dedupe_key: `${agentId}:${f.key}:${day}`,
  }));
  if (rows.length) await db.from("agent_recommendations").upsert(rows, { onConflict: "dedupe_key", ignoreDuplicates: true });
  const alerts = findings.filter((f) => f.severity === "critical").map((f) => ({ agent_id: agentId, level: "critical" as const, message: f.title, data: f.data ?? {}, dedupe_key: `${agentId}:${f.key}:${day}` }));
  if (alerts.length) await db.from("agent_alerts").upsert(alerts, { onConflict: "dedupe_key", ignoreDuplicates: true });
  return rows.length;
}
