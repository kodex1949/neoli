# Les 13 agents

| # | Agent Claude Code | Moteur existant (`registry.ts`) | Statut moteur | Autonomie max |
|---|---|---|---|---|
| 00 | ecom-orchestrator | store-manager | opérationnel | 2 |
| 01 | ecom-cto | — (nouveau) | outillage dev seulement | 3 |
| 02 | ecom-uiux | — (nouveau) | outillage dev seulement | 3 |
| 03 | ecom-catalog | product-manager | opérationnel (lecture) | 2 |
| 04 | ecom-seo | seo-specialist | opérationnel (lecture) | 2 |
| 05 | ecom-cro | — (nouveau) | à construire | 2 |
| 06 | ecom-growth | marketing-manager | déclaré | 2 |
| 07 | ecom-crm | — (nouveau) | à construire | 2 |
| 08 | ecom-finance | pricing-manager | déclaré | 2 |
| 09 | ecom-inventory | inventory-manager | déclaré (accès Admin requis) | 2 |
| 10 | ecom-support | customer-support + order-manager | déclaré | 2 |
| 11 | ecom-security | — (nouveau) | outillage dev seulement | 2 |
| 12 | ecom-qa | technical-quality + analytics-specialist | opérationnel | 3 |

Les fichiers `.claude/agents/*.md` pilotent le travail **dans Claude Code**. L'exécution automatique de la boutique reste assurée par le moteur TypeScript. Les nouveaux agents (01, 02, 05, 07, 11) n'ont pas encore d'équivalent dans `AGENTS` : les ajouter est une modification de code à valider (étendre `AgentId`, `registry.ts`, `tests`).
