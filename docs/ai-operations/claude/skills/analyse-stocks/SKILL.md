---
name: analyse-stocks
description: Analyse des stocks et prévisions de réapprovisionnement. À utiliser pour les ruptures et surstocks.
---

# Analyse des stocks

## Quand l'utiliser
Alerte de stock, avant réassort.

## Étapes
1. Lire stocks et ventes réels (Admin inventaire requis).
2. Calculer couverture en jours avec historique suffisant, sinon l'indiquer.
3. Proposer un réassort, jamais passer commande.

## Garde-fous
- Lecture seule par défaut ; données réelles uniquement (sinon « indisponible » + connexion requise).
- Jamais de secret affiché, jamais d'action sensible sans approbation (niveau 4).
- Chaque constat : gravité, donnée source, action proposée non appliquée, clé stable.
- Ne déclarer « testé » que ce qui a été exécuté.
