"use client";

import { useState, useTransition } from "react";
import type { Announcement } from "@/lib/announcement";
import { saveAnnouncement } from "@/app/admin/annonce/actions";

/** Formulaire du bandeau d'annonce, avec aperçu en direct au-dessus. */
export function AnnouncementAdmin({ initial }: { initial: Announcement }) {
  const [v, setV] = useState(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(v) !== saved;
  const set = <K extends keyof Announcement>(k: K, x: Announcement[K]) => { setV((p) => ({ ...p, [k]: x })); setMsg(null); };
  const save = () => start(async () => {
    try { await saveAnnouncement(v); setSaved(JSON.stringify(v)); setMsg({ t: "Enregistré. Le site est mis à jour." }); }
    catch (e) { setMsg({ t: e instanceof Error ? e.message : "Échec de l'enregistrement.", err: true }); }
  });

  return (
    <div className="ann">
      <p className="nlc__h">Aperçu</p>
      <div className="ann__prev">
        {v.enabled && v.text.trim()
          ? <div className="promo" data-tone={v.tone}><p style={{ margin: 0 }}>{v.text}{v.href && v.linkLabel && <>{" "}<a href="#" onClick={(e) => e.preventDefault()}>{v.linkLabel}</a></>}</p></div>
          : <p className="ann__off">Bandeau masqué sur le site.</p>}
      </div>
      <form className="mm__fields ann__form" onSubmit={(e) => { e.preventDefault(); save(); }}>
        <label className="crea__check"><input type="checkbox" checked={v.enabled} onChange={(e) => set("enabled", e.target.checked)} /><span>Afficher le bandeau sur le site</span></label>
        <label><span>Texte</span><input value={v.text} maxLength={200} onChange={(e) => set("text", e.target.value)} /></label>
        <label><span>Texte du lien (laisser vide pour aucun lien)</span><input value={v.linkLabel} maxLength={40} onChange={(e) => set("linkLabel", e.target.value)} /></label>
        <label><span>Adresse du lien (/collections/… ou https://…)</span><input value={v.href} maxLength={300} onChange={(e) => set("href", e.target.value)} /></label>
        <label><span>Style</span>
          <select value={v.tone} onChange={(e) => set("tone", e.target.value as Announcement["tone"])}>
            <option value="dark">Noir (d'origine)</option>
            <option value="light">Clair</option>
          </select>
        </label>
        <div className="mm__actions">
          <button type="submit" className="acct__btn" data-primary="true" disabled={!dirty || pending}>{pending ? "Enregistrement…" : "Enregistrer"}</button>
          {JSON.stringify(v) !== JSON.stringify({ enabled: true, text: "ÉDITION LIMITÉE : pour les fêtes, découvrez la nouvelle collection.", linkLabel: "Découvrir.", href: "/collections/fetes", tone: "dark" }) &&
            <button type="button" className="acct__btn" disabled={pending} onClick={() => { setV({ enabled: true, text: "ÉDITION LIMITÉE : pour les fêtes, découvrez la nouvelle collection.", linkLabel: "Découvrir.", href: "/collections/fetes", tone: "dark" }); setMsg(null); }}>Rétablir le texte d'origine</button>}
        </div>
        {msg && <p className="mm__msg" data-error={msg.err ? "true" : undefined}>{msg.t}</p>}
      </form>
    </div>
  );
}
