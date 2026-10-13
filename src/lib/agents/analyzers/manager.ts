import type { Finding, Severity } from "../types";

export type AgentOutcome = { agent: string; status: "ok" | "error" | "skipped" | "disabled" | "not_implemented"; findings: Finding[]; error?: string };

const rank: Record<Severity, number> = { critical: 0, warning: 1, info: 2 };

/** Rapport quotidien : synthèse déterministe des résultats des autres agents. */
export function buildReport(outcomes: AgentOutcome[]) {
  const all = outcomes.flatMap((o) => o.findings.map((f) => ({ agent: o.agent, ...f })));
  const counts = { critical: 0, warning: 0, info: 0 } as Record<Severity, number>;
  for (const f of all) counts[f.severity]++;
  const priorities = all.filter((f) => f.severity !== "info").sort((a, b) => rank[a.severity] - rank[b.severity]).slice(0, 8)
    .map((f) => ({ agent: f.agent, severity: f.severity, title: f.title }));
  const problems = outcomes.filter((o) => o.status === "error").map((o) => ({ agent: o.agent, error: o.error ?? "erreur" }));
  const idle = outcomes.filter((o) => o.status === "disabled" || o.status === "not_implemented").map((o) => ({ agent: o.agent, reason: o.status }));
  const headline = counts.critical ? `${counts.critical} problème(s) critique(s) à traiter` : counts.warning ? `${counts.warning} point(s) d'attention` : "Rien d'urgent";
  return { headline, counts, priorities, agentsRun: outcomes.filter((o) => o.status === "ok").map((o) => o.agent), problems, idle };
}
