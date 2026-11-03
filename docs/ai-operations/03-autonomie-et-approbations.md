# Autonomie et approbations

| Niveau | Nom | Autorisé |
|---|---|---|
| 1 | Observer | Lire, mesurer, signaler |
| 2 | Proposer | Rédiger recommandations et brouillons (statut `open`) |
| 3 | Exécuter en environnement contrôlé | Modifier le code en local/branche, lancer les tests ; jamais la production |
| 4 | Action sensible | **Approbation humaine explicite, par action** |

Niveau 4 obligatoire : prix, dépenses publicitaires, déploiement production, envoi de campagne/e-mail, remboursement/annulation, commande fournisseur, suppression de données, changement de permissions/RLS, modification de secrets. Ces permissions sont déjà dans `NEVER_AUTO` (`guard.ts`).

## Circuit
1. L'agent écrit une recommandation (`agent_recommendations`, `open`) avec l'action proposée.
2. Un administrateur (`agent_admins`) approuve/rejette dans `/admin/agents` → `agent_approvals` + `agent_audit_log`.
3. L'exécution reste manuelle tant que l'écriture correspondante n'est pas implémentée et testée.

## Contrôle des coûts
`agents.daily_budget_cents` + `costToday()` dans `store.ts` ; un agent qui dépasse son budget est ignoré (`skipped`). Le moteur actuel n'appelle aucun modèle : coût IA = 0.
