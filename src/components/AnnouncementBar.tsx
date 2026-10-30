import Link from "next/link";
import { getAnnouncement } from "@/lib/announcement";

/** Bandeau d'annonce en haut du site. Texte, lien, style et affichage : /admin/annonce. */
export async function AnnouncementBar() {
  const a = await getAnnouncement();
  // Masqué : la hauteur du bandeau tombe à 0 pour que la mise en page remonte.
  if (!a.enabled || !a.text.trim()) return <style>{":root{--promo-h:0px}"}</style>;
  return (
    <div className="promo" data-tone={a.tone}>
      <p style={{ margin: 0 }}>
        {a.text}
        {a.href && a.linkLabel && <>{" "}<Link href={a.href}>{a.linkLabel}</Link></>}
      </p>
    </div>
  );
}
