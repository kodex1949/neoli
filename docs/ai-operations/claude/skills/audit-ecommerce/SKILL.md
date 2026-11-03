---
name: audit-ecommerce
description: Audit global de la boutique ESSNC (technique, catalogue, SEO, conversion, sécurité). À utiliser pour un état des lieux complet.
---

# Audit e-commerce global

## Quand l'utiliser
Demande d'état des lieux, avant un lancement ou une campagne.

## Étapes
1. Lancer `ecom-orchestrator`.
2. Déléguer au minimum : catalogue, SEO, QA, sécurité.
3. Consolider, dédoublonner, classer par gravité.
4. Produire l'AI COMMAND REPORT (Réalisé / Testé / Proposé / En attente / Bloqué).

## Garde-fous
- Lecture seule par défaut ; données réelles uniquement (sinon « indisponible » + connexion requise).
- Jamais de secret affiché, jamais d'action sensible sans approbation (niveau 4).
- Chaque constat : gravité, donnée source, action proposée non appliquée, clé stable.
- Ne déclarer « testé » que ce qui a été exécuté.
