# Maison — boutique headless (Next.js 15.5.14 + Shopify + Supabase)

## Démarrage

```bash
npm install
cp .env.example .env.local   # renseigner Shopify + Supabase
npm run dev
```

Sans variables Shopify, la page d'accueil affiche des produits de démonstration.

## Design (inspiré de dior.com/fr_fr)

| Élément | Valeur |
|---|---|
| Titres | serif léger (Newsreader, poids 350), 40 px / interligne 1,3, crénage -0,02 em |
| Texte | sans-serif géométrique (Figtree), 16 px, couleur `#33383c` |
| Eyebrow | 12 px, majuscules, `#7b8487` |
| Fond de page | `#f8f8f8` ; vignettes produit `#f3f3f3` (ratio 2:3) |
| Noir | `#010101` ; pied de page sable `#d7d1c7` |
| Rayons | 0 partout, 4 px sur les boutons blancs |
| En-tête | 80 px, blanc 85 % + flou, grille 3 colonnes (menu/recherche · logo · compte/panier) |
| Barre d'annonce | noire, 12 px, lien souligné |
| Lien « Découvrir » | 14 px, trait fin à 4 px sous le texte |

Les polices Atacama et Hellix de Dior sont sous licence : Newsreader et Figtree (libres) en sont des équivalents proches. Remplacez textes, images et logo par les vôtres.

## Structure

- `src/lib/shopify.ts` : client Storefront API (GraphQL, cache ISR 60 s)
- `src/lib/supabase/` : clients serveur et navigateur (`@supabase/ssr`), `src/middleware.ts` rafraîchit la session
- `src/components/` : AnnouncementBar, Header, ProductCard, Footer
