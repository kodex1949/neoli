---
name: analyse-incident
description: Analyse d'incident : chronologie, cause, impact, correctif, prévention. À utiliser après une panne ou une erreur.
---

# Analyse d'incident

## Quand l'utiliser
Site en erreur, intégration cassée, mauvais prix affiché.

## Étapes
1. Chronologie factuelle (journaux, déploiements).
2. Impact mesuré ; cause prouvée vs probable.
3. Correctif proposé + prévention + test de non-régression.

## Garde-fous
- Lecture seule par défaut ; données réelles uniquement (sinon « indisponible » + connexion requise).
- Jamais de secret affiché, jamais d'action sensible sans approbation (niveau 4).
- Chaque constat : gravité, donnée source, action proposée non appliquée, clé stable.
- Ne déclarer « testé » que ce qui a été exécuté.
