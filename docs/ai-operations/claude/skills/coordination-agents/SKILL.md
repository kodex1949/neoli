---
name: coordination-agents
description: Coordination entre agents : routage, dépendances, dédoublonnage, budget. À utiliser par l'orchestrateur.
---

# Coordination des agents

## Quand l'utiliser
Mission touchant plusieurs domaines.

## Étapes
1. Choisir le nombre minimal d'agents.
2. Définir dépendances (`agent_tasks.depends_on`) et clé de dédoublonnage.
3. Vérifier chaque sortie avant REVIEW ; arbitrer les contradictions sans écraser le travail d'un agent.

## Garde-fous
- Lecture seule par défaut ; données réelles uniquement (sinon « indisponible » + connexion requise).
- Jamais de secret affiché, jamais d'action sensible sans approbation (niveau 4).
- Chaque constat : gravité, donnée source, action proposée non appliquée, clé stable.
- Ne déclarer « testé » que ce qui a été exécuté.
