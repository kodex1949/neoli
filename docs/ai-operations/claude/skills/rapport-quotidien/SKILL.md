---
name: rapport-quotidien
description: Rapport quotidien : synthèse des agents, alertes, priorités du jour. À utiliser pour la revue du matin.
---

# Rapport quotidien

## Quand l'utiliser
Chaque jour (job quotidien du moteur).

## Étapes
1. Lire les constats du jour (`agent_recommendations`, `agent_alerts`).
2. Classer critique > attention > info ; dédoublonner.
3. Lister agents en erreur/inactifs et coûts du jour.

## Garde-fous
- Lecture seule par défaut ; données réelles uniquement (sinon « indisponible » + connexion requise).
- Jamais de secret affiché, jamais d'action sensible sans approbation (niveau 4).
- Chaque constat : gravité, donnée source, action proposée non appliquée, clé stable.
- Ne déclarer « testé » que ce qui a été exécuté.
