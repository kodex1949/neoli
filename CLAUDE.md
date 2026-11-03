# ESSNC — boutique de parfums (Next.js headless + Shopify + Supabase)

## Identité
- ESSNC **revend** des marques tierces : ne jamais se présenter comme fabricant.
- Direction : éditorial premium (référence visuelle dior.com/fr_fr). Polices : Figtree (texte), Newsreader (titres).
- Langue de travail : français.

## Pile
Next.js 15.5 (App Router) · React 19 · TypeScript · Supabase (`skaqmzsoiyuwxblxmdgp`) · Shopify Storefront (`3rhvh0-9q`) · Vercel (`neoli-nu.vercel.app`) · dépôt `kodex1949/neoli`.

## Règles non négociables
1. Ne jamais inventer de donnée commerciale (ventes, marges, stocks, trafic, coûts, avis, notes olfactives, INCI, allergènes).
2. Ne jamais simuler une connexion : une source non connectée = « indisponible ».
3. Ne jamais casser l'existant ; ne pas écraser une config sans diff validé.
4. Sans autorisation explicite : pas de changement de prix, de dépense, de déploiement production, d'envoi de campagne, de remboursement, de suppression.
5. Jamais de secret affiché : citer le **nom** de la variable seulement. `.env*` ne se commit jamais.
6. Ne jamais écrire qu'un test a réussi sans l'avoir exécuté.
7. Si l'utilisateur dit « non » : revenir à la version précédente.
8. Ne pas déployer/publier sans demande.
9. Ne pas lancer 13 agents quand 2 suffisent.
10. Une analyse IA n'est pas une certification réglementaire.

## Système d'agents
- Moteur déterministe existant : `src/lib/agents/` (+ `/admin/agents`, `/api/agents/cron`, cron Supabase `agents-hourly`). **Étendre, ne pas reconstruire.**
- Agents Claude Code : `.claude/agents/00…12` ; Skills : `.claude/skills/*`.
- Doc : `docs/ai-operations/` (commencer par `README.md`).
- Autonomie : 1 Observer · 2 Proposer · 3 Exécuter en environnement contrôlé · 4 Action sensible = approbation humaine explicite.

## Commandes de contrôle
```
npx tsc --noEmit
npm run lint
node --test --experimental-strip-types tests/agents.test.mjs
npm run build
```
