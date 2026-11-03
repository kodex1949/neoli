# Missions

| Statut mission | Signification | Table existante |
|---|---|---|
| BACKLOG | Identifiée, non priorisée | `agent_missions` (proposée) |
| READY | Prête | `agent_tasks.status = queued` |
| RUNNING | En cours | `agent_tasks.status = running` |
| REVIEW | Sortie à vérifier | `agent_missions` (proposée) |
| APPROVAL_REQUIRED | Action sensible en attente | `agent_recommendations.status = open` |
| COMPLETED | Terminée | `agent_tasks.status = done` / reco `applied` |
| BLOCKED | Bloquée (permission, donnée) | `agent_tasks.status = blocked` |
| FAILED | Échec | `agent_tasks.status = failed` |

Une mission = 1 objectif, 1 propriétaire, des tâches (`agent_tasks`), des constats, un budget. Voir `migrations/001_agent_missions.sql`.
