import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { menuSlots, rowsToMedia } from "@/lib/menu-media";
import { MenuMediaSlot } from "@/components/MenuMediaSlot";

export const metadata: Metadata = { title: "Visuels du menu — Néoli", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function MenuAdminPage() {
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  if (!u.user) redirect("/connexion?next=/admin/menu");
  const { data: isAdmin } = await db.rpc("is_agent_admin");
  if (isAdmin !== true) {
    return (
      <div className="adm"><h1 className="acct__title">Visuels du menu</h1>
        <div className="acct__empty"><h2>Accès réservé</h2><p>Ce compte n'est pas administrateur.</p></div></div>
    );
  }
  const { data: rows } = await db.from("menu_media").select("slot,kind,url,title,eyebrow,cta,href");
  const media = rowsToMedia(rows ?? []);
  const slots = menuSlots();
  const groups = Array.from(new Set(slots.map((s) => s.group)));

  return (
    <div className="adm mm" style={{ maxWidth: 920, margin: "0 auto", padding: "48px 24px 96px", display: "grid", gap: 32 }}>
      <div>
        <h1 className="acct__title">Visuels du menu</h1>
        <p style={{ margin: "8px 0 0", fontSize: 14, color: "#7b8487", lineHeight: 1.6 }}>
          Changez les visuels (images, vidéos), titres, sous-titres, boutons et liens de la page d'accueil et du menu. Les fichiers sont stockés dans Supabase (50 Mo maximum : JPG, PNG, WebP, AVIF, MP4, WebM). Les vidéos se lisent en boucle, sans son.
        </p>
      </div>
      {groups.map((m) => (
        <section key={m} className="mm__group">
          <h2 style={{ margin: "0 0 16px", fontSize: 16, fontWeight: 500 }}>{slots.find((s) => s.group === m)!.groupLabel}</h2>
          <div className="mm__grid">
            {slots.filter((s) => s.group === m).map((s) => (
              <MenuMediaSlot
                key={s.slot}
                slot={s.slot}
                label={s.type === "iconic" ? `Vignette · ${s.label}` : s.type === "card" ? `Carte · ${s.label}` : s.label}
                type={s.type}
                current={media[s.slot]?.url && media[s.slot]?.kind ? { kind: media[s.slot].kind!, url: media[s.slot].url! } : undefined}
                original={s.original}
                originalKind={s.originalKind}
                defaults={{ title: s.title, eyebrow: s.eyebrow, cta: s.cta, href: s.href }}
                texts={{ title: media[s.slot]?.title, eyebrow: media[s.slot]?.eyebrow, cta: media[s.slot]?.cta, href: media[s.slot]?.href }}
                hasEyebrow={s.hasEyebrow}
                hasCta={s.hasCta}
                titleLabel={s.titleLabel}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
