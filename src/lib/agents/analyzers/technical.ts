import type { Finding } from "../types";

export type Check = { name: string; ok: boolean; status?: number; ms?: number; note?: string };
export type EnvReport = Record<string, boolean>;

const SLOW_MS = 2500;

export function analyzeTechnical(checks: Check[], env: EnvReport, hasWebhookEndpoint: boolean): Finding[] {
  const out: Finding[] = [];
  for (const c of checks) {
    if (!c.ok) out.push({ key: `tech.down:${c.name}`, severity: "critical", title: `${c.name} : en échec`, detail: c.note ?? `Statut ${c.status ?? "inconnu"}.`, data: { ...c } });
    else if ((c.ms ?? 0) > SLOW_MS) out.push({ key: `tech.slow:${c.name}`, severity: "warning", title: `${c.name} : lent (${c.ms} ms)`, detail: `Plus de ${SLOW_MS} ms à la réponse (le premier chargement en développement est naturellement plus lent).`, data: { ...c } });
  }
  const missing = Object.entries(env).filter(([, v]) => !v).map(([k]) => k);
  if (missing.length) out.push({ key: "tech.env", severity: "info", title: `${missing.length} variable(s) d'environnement absente(s)`, detail: `Absentes : ${missing.join(", ")}. Elles conditionnent des fonctions précises (automatisations, paiements, IA).`, data: { missing } });
  if (!hasWebhookEndpoint) out.push({ key: "tech.no-webhooks", severity: "warning", title: "Aucun endpoint webhook dans le projet", detail: "Les déclencheurs par événement (nouvelle commande, produit modifié, stock faible) ne peuvent pas être reçus. Les agents fonctionnent pour l'instant à la demande et en audit planifié." });
  return out;
}
