---
name: audit-catalogue
description: Audit du catalogue : fiches, vendeur, tags, médias, collections, notes olfactives réelles. À utiliser pour la qualité produit.
---

# Audit catalogue

## Quand l'utiliser
Nouveaux produits, import, incohérences de fiches.

## Étapes
1. Lire les produits Storefront.
2. Signaler champs manquants (vendeur, description, alt, collection, notes).
3. Ne jamais compléter une pyramide, un INCI ou un allergène non fourni.
4. Proposer des diffs avant/après (APPROVAL_REQUIRED).

## Garde-fous
- Lecture seule par défaut ; données réelles uniquement (sinon « indisponible » + connexion requise).
- Jamais de secret affiché, jamais d'action sensible sans approbation (niveau 4).
- Chaque constat : gravité, donnée source, action proposée non appliquée, clé stable.
- Ne déclarer « testé » que ce qui a été exécuté.
