---
name: audit-technique
description: Audit technique : build, types, lint, dépendances, performances, disponibilité. À utiliser avant un déploiement.
---

# Audit technique

## Quand l'utiliser
Avant mise en production ou après incident.

## Étapes
1. Lister les commandes de contrôle : `npx tsc --noEmit`, `npm run lint`, `node --test --experimental-strip-types tests/*.test.mjs`, `npm run build`.
2. Les exécuter si un shell est disponible ; sinon les marquer « à exécuter par l'utilisateur ».
3. Sonder les routes clés et les intégrations.

## Garde-fous
- Lecture seule par défaut ; données réelles uniquement (sinon « indisponible » + connexion requise).
- Jamais de secret affiché, jamais d'action sensible sans approbation (niveau 4).
- Chaque constat : gravité, donnée source, action proposée non appliquée, clé stable.
- Ne déclarer « testé » que ce qui a été exécuté.
