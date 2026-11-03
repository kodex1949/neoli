# Audit initial (2 novembre 2026)

Méthode : lecture du dépôt (copie de travail), requêtes Supabase en lecture, conseils de sécurité Supabase. Aucune écriture.

## Existant
- **Moteur d'agents** : `src/lib/agents/{types,registry,guard,orchestrator,store}.ts`, analyseurs (`product, seo, analytics, technical, inventory, pricing, orders, support, marketing, manager`), sources, 10 agents déclarés, garde de permissions (`decide/ensure`, `NEVER_AUTO`), nettoyage du texte externe (`clean`).
- **Entrée planifiée** : `POST /api/agents/cron`, jeton vérifié par la base (`agent_cron_ok`), exige `SUPABASE_SERVICE_ROLE_KEY`.
- **Planificateur actif** : pg_cron `agents-hourly` (`7 * * * *`).
- **Admin** : `/admin/agents`.
- **Tables** : `agents, agent_tasks, agent_runs, agent_recommendations, agent_approvals, agent_alerts, agent_reports, agent_events, agent_audit_log, agent_admins`.
- **Tests** : `tests/agents.test.mjs` (node:test). Pas de script `test` dans `package.json`.
- **Docs agents** : `docs/claude-agents/` (3 fichiers présents sur 10 annoncés ; `.claude/` jamais créé).

## Constats
| # | Gravité | Constat | Action proposée (non appliquée) |
|---|---|---|---|
| F-01 | attention | `store-manager`, `product-manager`, `seo-specialist` sont en mode `auto_execute` en base. Aucune écriture n'est implémentée et `autoAllowed` est vide, donc sans effet réel, mais contraire à la règle d'approbation. | Passer en `approval_required` (ou `read_only`) après accord. |
| F-02 | attention | Avertissements de sécurité Supabase : lecture exposée à `anon/authenticated` via GraphQL sur des tables `agent_*` et autres ; fonctions SECURITY DEFINER appelables par `anon` ; `search_path` mutable ; protection des mots de passe compromis désactivée. | Revue RLS/GRANT + migration réversible, sur approbation. |
| F-03 | info | Pas de script `test` dans `package.json` ; tests lancés à la main. | Ajouter `"test"` (diff proposé). |
| F-04 | info | Le dossier `.claude/` n'avait jamais été créé (limite de l'outil d'écriture distant). | Fichiers livrés ; copie manuelle si besoin. |
| F-05 | attention | Statut de tâche existant (`queued/running/done/failed/blocked/cancelled`) ne couvre pas BACKLOG, REVIEW, APPROVAL_REQUIRED. | Table `agent_missions` proposée (migration). |
| F-06 | info | Pied de page « Retours sous 14 jours » vs page « 30 jours ». | Aligner sur la politique réelle. |
| F-07 | info | Variables possibles sans valeur : `SUPABASE_SERVICE_ROLE_KEY` (cron), jetons Admin Shopify (commandes/stocks). Sans elles, ces agents rapportent « accès partiel/indisponible ». | Le propriétaire les ajoute dans Vercel (noms seulement ici). |
| F-08 | info | Polices d'essai (`atacama-…`, `hellix-…`) présentes mais ignorées par git : OK. | Ne jamais les publier. |

## Non vérifiable depuis cet environnement
Build, lint, tests et typage (pas de shell sur la machine) ; état réel du site déployé et de Shopify (réseau bloqué).
