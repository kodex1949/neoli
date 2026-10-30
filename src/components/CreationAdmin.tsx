"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import type { Creation } from "@/lib/creations";
import { deleteCreation, moveCreation, removeCreationMedia, saveCreation, saveCreationMedia } from "@/app/admin/creations/actions";

const MAX = 50 * 1024 * 1024;

/** Une création : aperçu du visuel (à droite sur le site), textes, publication, ordre. */
export function CreationAdmin({ c, first, last }: { c: Creation; first: boolean; last: boolean }) {
  const input = useRef<HTMLInputElement>(null);
  const [f, setF] = useState({ title: c.title, eyebrow: c.eyebrow ?? "", text: c.text ?? "", cta: c.cta ?? "", href: c.href ?? "", published: c.published });
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const dirty = f.title !== c.title || f.eyebrow !== (c.eyebrow ?? "") || f.text !== (c.text ?? "") || f.cta !== (c.cta ?? "") || f.href !== (c.href ?? "") || f.published !== c.published;
  const set = (k: keyof typeof f, v: string | boolean) => { setF((p) => ({ ...p, [k]: v })); setMsg(null); };
  const run = (fn: () => Promise<void>, ok: string) => start(async () => {
    try { await fn(); setMsg({ t: ok }); } catch (e) { setMsg({ t: e instanceof Error ? e.message : "Échec.", err: true }); }
  });

  async function upload(file: File) {
    const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : null;
    if (!kind) return setMsg({ t: "Format non pris en charge (image ou vidéo).", err: true });
    if (file.size > MAX) return setMsg({ t: "Fichier trop lourd (50 Mo maximum).", err: true });
    setBusy(true); setMsg(null);
    try {
      const db = createClient();
      const ext = (file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg")).toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `creation-${c.id}-${Date.now()}.${ext}`;
      const { error } = await db.storage.from("menu-media").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
      if (error) throw new Error(error.message);
      await saveCreationMedia(c.id, kind, db.storage.from("menu-media").getPublicUrl(path).data.publicUrl);
      setMsg({ t: "Visuel enregistré." });
    } catch (e) { setMsg({ t: e instanceof Error ? e.message : "Échec de l'envoi.", err: true }); }
    finally { setBusy(false); if (input.current) input.current.value = ""; }
  }

  return (
    <article className="crea" data-off={!c.published}>
      <div className="crea__form">
        <div className="crea__top">
          <span className="crea__state" data-on={c.published}>{c.published ? "Publiée" : "Brouillon"}</span>
          <span className="crea__order">
            <button type="button" aria-label="Monter" disabled={first || pending} onClick={() => run(() => moveCreation(c.id, "up"), "Ordre mis à jour.")}>↑</button>
            <button type="button" aria-label="Descendre" disabled={last || pending} onClick={() => run(() => moveCreation(c.id, "down"), "Ordre mis à jour.")}>↓</button>
          </span>
        </div>
        <form className="mm__fields" onSubmit={(e) => { e.preventDefault(); run(() => saveCreation(c.id, f), "Enregistré."); }}>
          <label><span>Sous-titre</span><input value={f.eyebrow} maxLength={120} onChange={(e) => set("eyebrow", e.target.value)} /></label>
          <label><span>Titre</span><input value={f.title} maxLength={120} required onChange={(e) => set("title", e.target.value)} /></label>
          <label><span>Texte</span><textarea value={f.text} maxLength={600} rows={4} onChange={(e) => set("text", e.target.value)} /></label>
          <label><span>Bouton</span><input value={f.cta} maxLength={60} onChange={(e) => set("cta", e.target.value)} /></label>
          <label><span>Lien (/collections/… ou https://…)</span><input value={f.href} maxLength={300} onChange={(e) => set("href", e.target.value)} /></label>
          <label className="crea__check"><input type="checkbox" checked={f.published} onChange={(e) => set("published", e.target.checked)} /><span>Afficher sur le site</span></label>
          <div className="mm__actions">
            <button type="submit" className="acct__btn" data-primary="true" disabled={!dirty || pending}>{pending ? "…" : "Enregistrer"}</button>
            {confirm
              ? <><button type="button" className="acct__btn" disabled={pending} onClick={() => run(() => deleteCreation(c.id), "Supprimée.")}>Confirmer la suppression</button><button type="button" className="acct__btn" onClick={() => setConfirm(false)}>Annuler</button></>
              : <button type="button" className="acct__btn" disabled={pending} onClick={() => setConfirm(true)}>Supprimer</button>}
          </div>
        </form>
        {msg && <p className="mm__msg" data-error={msg.err ? "true" : undefined}>{msg.t}</p>}
      </div>
      <div className="crea__vis">
        <div className="crea__prev">
          {c.url ? (c.kind === "video" ? <video src={c.url} muted loop playsInline autoPlay /> : <img src={c.url} alt="" />) : <span>Aucun visuel</span>}
        </div>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        <div className="mm__actions">
          <button type="button" className="acct__btn" data-primary="true" disabled={busy || pending} onClick={() => input.current?.click()}>{busy ? "Envoi…" : c.url ? "Changer le visuel" : "Ajouter un visuel"}</button>
          {c.url && <button type="button" className="acct__btn" disabled={busy || pending} onClick={() => run(() => removeCreationMedia(c.id), "Visuel retiré.")}>Retirer</button>}
        </div>
      </div>
    </article>
  );
}
