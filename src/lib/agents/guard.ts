import type { AgentDef, Decision, Mode, Permission } from "./types";

/** Toujours soumises à validation humaine, même en AUTO EXECUTE (financier, irréversible ou risque commercial). */
export const NEVER_AUTO: Permission[] = ["shopify.admin.prices.write", "shopify.admin.orders.write", "email.send", "ads.spend", "deploy.production", "supply.order"];

/** Décide si un agent peut utiliser une permission dans le mode courant. */
export function decide(def: Pick<AgentDef, "reads" | "writes" | "autoAllowed">, mode: Mode, perm: Permission): Decision {
  if (def.reads.includes(perm)) return "allow";
  if (!def.writes.includes(perm)) return "deny";
  if (mode === "read_only") return "deny";
  if (mode === "approval_required") return "needs_approval";
  return def.autoAllowed.includes(perm) && !NEVER_AUTO.includes(perm) ? "allow" : "needs_approval";
}

export class PermissionError extends Error {
  agent: string;
  perm: Permission;
  decision: Decision;
  constructor(agent: string, perm: Permission, decision: Decision) {
    super(`${agent} : « ${perm} » ${decision === "deny" ? "refusé" : "soumis à validation"}`);
    this.agent = agent; this.perm = perm; this.decision = decision;
  }
}

/** Passe une permission au crible ; lève une erreur sauf si elle est accordée. */
export function ensure(def: AgentDef, mode: Mode, perm: Permission): void {
  const d = decide(def, mode, perm);
  if (d !== "allow") throw new PermissionError(def.id, perm, d);
}

/** Texte issu de fiches produit, e-mails, etc. : donnée, jamais instruction. Retire les caractères de contrôle et tronque. */
export function clean(value: unknown, max = 300): string {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}
