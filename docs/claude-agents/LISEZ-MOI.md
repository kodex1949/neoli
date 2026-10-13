# Sous-agents Claude Code

Les dix fichiers de ce dossier sont les définitions des sous-agents Claude Code.
L'outil d'écriture à distance n'a pas le droit de créer le dossier `.claude/`.

Pour les activer, copiez-les vous-même :

    mkdir .claude\agents
    copy docs\claude-agents\*.md .claude\agents\
    del .claude\agents\LISEZ-MOI.md

Ces agents organisent le travail en développement. L'exécution automatique de la boutique est assurée par `src/lib/agents/` (page `/admin/agents`).
