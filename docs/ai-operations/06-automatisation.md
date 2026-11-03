# Automatisation

| Fréquence | Tâche | Mécanisme | Statut |
|---|---|---|---|
| Horaire | Audit léger (technique, SEO) | pg_cron `agents-hourly` → `POST /api/agents/cron` | **Actif** (existant) |
| Quotidien | Rapport quotidien | Même moteur, déclencheur `daily` | Disponible, à confirmer |
| Hebdomadaire | Rapport hebdo, revue des approbations | pg_cron ou GitHub Actions | **Proposé, non activé** |
| Mensuel | Revue sécurité, coûts, stocks | idem | **Proposé, non activé** |
| Événementiel | Webhooks Shopify (commande, stock) | Route à créer + vérification HMAC | **Proposé, non activé** |

Évaluation : pg_cron est déjà en place et suffit ; Vercel Cron serait redondant ; GitHub Actions convient aux contrôles de code (typage, tests, build) ; Edge Functions inutiles tant que la route Next.js fait le travail. Rien de nouveau n'est activé sans accord. Prérequis : `SUPABASE_SERVICE_ROLE_KEY` côté Vercel.
