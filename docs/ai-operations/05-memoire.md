# Mémoire persistante

| Entité demandée | Déjà couverte par | Manque |
|---|---|---|
| AgentRuns | `agent_runs` | — |
| Tasks | `agent_tasks` | — |
| Findings | `agent_recommendations` + `agent_alerts` | — |
| Recommendations | `agent_recommendations` | — |
| Approvals | `agent_approvals` | — |
| Actions | `agent_audit_log` | — |
| Metrics | — | `agent_metrics` (proposée) |
| Incidents | — | `agent_incidents` (proposée) |
| Missions | — | `agent_missions` (proposée) |

Aucune donnée personnelle client dans ces tables. Migrations non appliquées : `migrations/`.
