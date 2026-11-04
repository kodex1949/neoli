"use server";

import { revalidatePath } from "next/cache";
import { audit } from "@/lib/agents/store";
import { createClient } from "@/lib/supabase/server";
import { groupKey } from "./group";

async function admin() {
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  const { data: ok } = await db.rpc("is_agent_admin");
  if (!u.user || ok !== true) throw new Error("Accès réservé aux administrateurs.");
  return { db, email: u.user.email ?? "inconnu" };
}

const DECISIONS = new Set(["approved", "rejected", "dismissed"]);

/**
 * Enregistre la décision humaine pour toutes les occurrences ouvertes d'un même constat.
 * Aucune modification n'est appliquée à la boutique : les actions d'écriture ne sont pas implémentées.
 */
export async function decideGroup(formData: FormData) {
  const { db, email } = await admin();
  const key = String(formData.get("key") ?? "").slice(0, 300);
  const decision = String(formData.get("decision") ?? "");
  const note = String(formData.get("note") ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, 300);
  if (!key || !DECISIONS.has(decision)) return;

  const { data } = await db.from("agent_recommendations").select("id,dedupe_key,agent_id").eq("status", "open").limit(1000);
  const ids = (data ?? []).filter((r) => groupKey(r.dedupe_key, r.id) === key).map((r) => r.id as string);
  if (!ids.length) return;

  await db.from("agent_recommendations").update({ status: decision, decided_at: new Date().toISOString(), decided_by: email }).in("id", ids).eq("status", "open");
  if (decision !== "dismissed") await db.from("agent_approvals").insert(ids.map((id) => ({ recommendation_id: id, decision, decided_by: email, note: note || null })));
  await audit(db, { action: `recommendation:${decision}`, result: `${ids.length} occurrence(s) · ${key}${note ? ` · ${note}` : ""}`, approval_status: decision });
  revalidatePath("/admin/approbations");
  revalidatePath("/admin/agents");
}

/** Écarte d'un coup les constats d'information (aucune action proposée). */
export async function dismissInfo() {
  const { db, email } = await admin();
  const { data } = await db.from("agent_recommendations").select("id,proposed_action").eq("status", "open").eq("severity", "info").limit(1000);
  const ids = (data ?? []).filter((r) => !r.proposed_action).map((r) => r.id as string);
  if (!ids.length) return;
  await db.from("agent_recommendations").update({ status: "dismissed", decided_at: new Date().toISOString(), decided_by: email }).in("id", ids).eq("status", "open");
  await audit(db, { action: "recommendation:dismissed", result: `${ids.length} info(s) écartée(s) en une fois`, approval_status: "dismissed" });
  revalidatePath("/admin/approbations");
  revalidatePath("/admin/agents");
}
