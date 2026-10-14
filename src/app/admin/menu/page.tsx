import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { menuSlots, rowsToMedia } from "@/lib/menu-media";
import { AdminHead, AdminStats } from "@/components/AdminHead";
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

  const custom = Object.values(media).filter((m) => m.url || m.title || m.eyebrow || m.cta || m.href).length;

  return (
    <div className="adm admp mm">
      <AdminHead eyebrow="Contenu" title="Visuels & textes" lead="Changez les images, vidéos, titres, sous-titres, boutons et liens de la page d'accueil et du menu. Fichiers stockés dans Supabase (50 Mo maximum : JPG, PNG, WebP, AVIF, MP4, WebM). Les vidéos se lisent en boucle, sans son." />
      <AdminStats items={[
        { label: "Emplacements", value: slots.length },
        { label: "Personnalisés", value: custom, note: "le reste garde l'original" },
        { label: "Rubriques", value: groups.length },
      ]} />
      {groups.map((m) => (
        <section key={m} className="mm__group">
          <h2 className="admp__h2">{slots.find((s) => s.group === m)!.groupLabel}</h2>
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
