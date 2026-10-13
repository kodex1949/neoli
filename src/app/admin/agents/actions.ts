"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { runAudit } from "@/lib/agents/orchestrator";
import { audit } from "@/lib/agents/store";
import { createClient } from "@/lib/supabase/server";

async function admin() {
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  const { data: ok } = await db.rpc("is_agent_admin");
  if (!u.user || ok !== true) throw new Error("Accès réservé aux administrateurs.");
  return { db, email: u.user.email ?? "inconnu" };
}

export async function runAuditAction() {
  const { db, email } = await admin();
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  await runAudit(db, { trigger: "manual", origin: `${proto}://${host}`, actor: email });
  revalidatePath("/admin/agents");
}

export async function setAgentEnabled(id: string, enabled: boolean) {
  const { db, email } = await admin();
  await db.from("agents").update({ enabled, updated_at: new Date().toISOString() }).eq("id", id);
  await audit(db, { agent_id: id, action: enabled ? "enable" : "disable", result: `par ${email}` });
  revalidatePath("/admin/agents");
}

export async function setAgentMode(id: string, mode: string) {
  const { db, email } = await admin();
  if (!["read_only", "approval_required", "auto_execute"].includes(mode)) return;
  await db.from("agents").update({ mode, updated_at: new Date().toISOString() }).eq("id", id);
  await audit(db, { agent_id: id, action: "set_mode", mode, result: `par ${email}` });
  revalidatePath("/admin/agents");
}

/** Enregistre la décision humaine. Rien n'est appliqué à la boutique : les actions d'écriture ne sont pas encore implémentées. */
export async function decideRecommendation(id: string, decision: "approved" | "rejected") {
  const { db, email } = await admin();
  await db.from("agent_recommendations").update({ status: decision, decided_at: new Date().toISOString(), decided_by: email }).eq("id", id).eq("status", "open");
  await db.from("agent_approvals").insert({ recommendation_id: id, decision, decided_by: email });
  await audit(db, { action: `recommendation:${decision}`, result: id, approval_status: decision });
  revalidatePath("/admin/agents");
}

export async function ackAlert(id: string) {
  const { db } = await admin();
  await db.from("agent_alerts").update({ acknowledged: true }).eq("id", id);
  revalidatePath("/admin/agents");
}
