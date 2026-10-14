import { cache } from "react";
import { createClient as createPublicClient } from "@supabase/supabase-js";
import { MENU } from "./menu";
import { HOME_COLLECTIONS } from "./collections";

export type MenuMediaItem = { kind?: "image" | "video"; url?: string; title?: string; eyebrow?: string; cta?: string; href?: string; text?: string; label?: string };
export type MenuMedia = Record<string, MenuMediaItem>;

export const slotId = (menu: string, type: "iconic" | "card", i: number) => `${menu}:${type}:${i}`;

export type SlotInfo = {
  slot: string; group: string; groupLabel: string; type: "iconic" | "card" | "hero" | "tile"; label: string;
  original?: string; originalKind?: "image" | "video"; title: string; eyebrow?: string; cta?: string; href: string;
  hasEyebrow: boolean; hasCta: boolean; titleLabel: string;
  text?: string; hasText?: boolean; railLabel?: string; hasLabel?: boolean; textOnly?: boolean;
};

/** Page d'accueil : le héros et ses deux tuiles (valeurs d'origine = celles de app/page.tsx). */
export const HOME_SLOTS: SlotInfo[] = [
  { slot: "home:hero", group: "home", groupLabel: "Page d'accueil", type: "hero", label: "Héros (grand visuel)", original: "/videos/hero.mp4", originalKind: "video", title: "Le jasmin, nouvel esprit de parfum", eyebrow: "Nouvelle collection", cta: "Découvrir", href: "/collections/parfums", hasEyebrow: true, hasCta: true, titleLabel: "Titre" },
  { slot: "home:tile:0", group: "home", groupLabel: "Page d'accueil", type: "tile", label: "Tuile gauche", original: "/images/tuile-gauche.jpg", originalKind: "image", title: "Un extrait de parfum intense", cta: "Découvrir", href: "/collections/parfums", hasEyebrow: false, hasCta: true, titleLabel: "Légende" },
  { slot: "home:tile:1", group: "home", groupLabel: "Page d'accueil", type: "tile", label: "Tuile droite", original: "/images/tuile-droite.jpg", originalKind: "image", title: "Une eau de parfum solaire", cta: "Découvrir", href: "/collections/parfums", hasEyebrow: false, hasCta: true, titleLabel: "Légende" },
  { slot: "home:essentials", group: "home", groupLabel: "Page d'accueil", type: "tile", label: "Essentiels tendance (rangée de produits)", title: "Essentiels tendance", eyebrow: "Les références du moment, choisies pour vous.", cta: "Voir la sélection", href: "/collections/best-sellers", hasEyebrow: true, hasCta: true, titleLabel: "Titre" },
  { slot: "home:collections", group: "home", groupLabel: "Page d'accueil", type: "tile", label: "« La nouvelle icône couture » (en-tête de la section)", title: "La nouvelle icône couture", eyebrow: "Parfum", cta: "Découvrir", href: "/collections/parfums", hasEyebrow: true, hasCta: true, titleLabel: "Titre", textOnly: true },
  ...HOME_COLLECTIONS.map((c, i): SlotInfo => ({ slot: `home:coll:${i}`, group: "home", groupLabel: "Page d'accueil", type: "tile", label: `Icône couture · Panneau ${i + 1} (${c.label})`, original: c.image, originalKind: "image", title: c.title, eyebrow: c.eyebrow, cta: "Découvrir", href: c.href, text: c.text, railLabel: c.label, hasEyebrow: true, hasCta: true, hasText: true, hasLabel: true, titleLabel: "Titre" })),
];

/** Tous les emplacements visuels : page d'accueil, puis menu (vignettes « iconiques » + grandes cartes) avec le visuel d'origine du code. */
export function menuSlots(): SlotInfo[] {
  const out: SlotInfo[] = [...HOME_SLOTS];
  for (const item of MENU.items) {
    if (!item.submenu) continue;
    item.submenu.iconics?.forEach((p, i) => out.push({ slot: slotId(item.id, "iconic", i), group: item.id, groupLabel: `Menu · ${item.label}`, type: "iconic", label: p.label, original: p.image, originalKind: "image", title: p.label, href: p.href, hasEyebrow: false, hasCta: false, titleLabel: "Titre" }));
    item.submenu.cards.forEach((c, i) => out.push({ slot: slotId(item.id, "card", i), group: item.id, groupLabel: `Menu · ${item.label}`, type: "card", label: c.title, original: c.image, originalKind: "image", title: c.title, eyebrow: c.eyebrow, href: c.href, hasEyebrow: true, hasCta: false, titleLabel: "Titre (texte souligné)" }));
  }
  return out;
}

/** Visuels du menu enregistrés dans Supabase (table menu_media). Client sans cookies ; vide en cas d'erreur : le menu garde alors ses visuels d'origine. */
export const getMenuMedia = cache(async (): Promise<MenuMedia> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return {};
  try {
    const db = createPublicClient(url, key, { auth: { persistSession: false } });
    const { data, error } = await db.from("menu_media").select("slot,kind,url,title,eyebrow,cta,href,text,label");
    if (error || !data) return {};
    return rowsToMedia(data);
  } catch {
    return {};
  }
});

type Row = { slot: string; kind: string | null; url: string | null; title: string | null; eyebrow: string | null; cta?: string | null; href: string | null; text?: string | null; label?: string | null };
export const rowsToMedia = (rows: Row[]): MenuMedia =>
  Object.fromEntries(rows.map((r) => [r.slot, {
    kind: (r.kind ?? undefined) as MenuMediaItem["kind"], url: r.url ?? undefined,
    title: r.title ?? undefined, eyebrow: r.eyebrow ?? undefined, cta: r.cta ?? undefined, href: r.href ?? undefined, text: r.text ?? undefined, label: r.label ?? undefined,
  }]));
