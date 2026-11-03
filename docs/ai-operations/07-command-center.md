# AI Command Center (spécification)

Extension de `/admin/agents` (existant), pas de nouvelle page parallèle.

Sections : état des agents (mode, activé, budget, dernier run) · missions par statut · file d'approbation (approuver/rejeter + note, journalisé) · constats triés par gravité · coût du jour · incidents · connexions (« connecté / indisponible », jamais simulé).

Contraintes : accès réservé à `agent_admins` ; aucune action exécutée au clic « approuver » tant que l'écriture n'est pas implémentée ; aucune valeur de secret affichée. Livraison en 2 temps : (1) lecture des missions/métriques, (2) boutons d'approbation, après application de la migration 001.
