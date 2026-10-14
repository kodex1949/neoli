"use client";

import { useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { resetMenuMedia, saveMenuMedia, saveMenuText } from "@/app/admin/menu/actions";

type Fields = { title?: string; eyebrow?: string; cta?: string; href?: string; text?: string; label?: string };
type Props = { slot: string; label: string; type: "iconic" | "card" | "hero" | "tile"; current?: { kind: "image" | "video"; url: string }; original?: string; originalKind?: "image" | "video"; defaults: Fields; texts: Fields; hasEyebrow: boolean; hasCta: boolean; titleLabel: string; hasText?: boolean; hasLabel?: boolean; textOnly?: boolean };

const MAX = 50 * 1024 * 1024;

/** Un emplacement du menu : aperçu, dépôt d'une image ou d'une vidéo (stockées dans Supabase), retour au visuel d'origine. */
export function MenuMediaSlot({ slot, label, type, current, original, originalKind = "image", defaults, texts, hasEyebrow, hasCta, titleLabel, hasText, hasLabel, textOnly }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [msg, setMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const [busy, setBusy] = useState(false);
  const [pending, start] = useTransition();
  const [title, setTitle] = useState(texts.title ?? "");
  const [eyebrow, setEyebrow] = useState(texts.eyebrow ?? "");
  const [cta, setCta] = useState(texts.cta ?? "");
  const [href, setHref] = useState(texts.href ?? "");
  const [text, setText] = useState(texts.text ?? "");
  const [label2, setLabel2] = useState(texts.label ?? "");
  const [textMsg, setTextMsg] = useState<{ text: string; error?: boolean } | null>(null);
  const dirty = title !== (texts.title ?? "") || eyebrow !== (texts.eyebrow ?? "") || cta !== (texts.cta ?? "") || href !== (texts.href ?? "") || text !== (texts.text ?? "") || label2 !== (texts.label ?? "");
  const saveText = () => start(async () => {
    try { await saveMenuText(slot, { title, eyebrow, cta, href, text, label: label2 }); setTextMsg({ text: "Textes enregistrés." }); }
    catch (e) { setTextMsg({ text: e instanceof Error ? e.message : "Échec de l'enregistrement.", error: true }); }
  });

  const shown = current ?? (original ? { kind: originalKind, url: original } : undefined);

  async function upload(file: File) {
    setMsg(null);
    const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : null;
    if (!kind) return setMsg({ text: "Format non pris en charge (image ou vidéo).", error: true });
    if (file.size > MAX) return setMsg({ text: "Fichier trop lourd (50 Mo maximum).", error: true });
    setBusy(true);
    try {
      const db = createClient();
      const ext = (file.name.split(".").pop() || (kind === "video" ? "mp4" : "jpg")).toLowerCase().replace(/[^a-z0-9]/g, "");
      const path = `${slot.replace(/:/g, "-")}-${Date.now()}.${ext}`;
      const { error } = await db.storage.from("menu-media").upload(path, file, { contentType: file.type, cacheControl: "31536000" });
      if (error) throw new Error(error.message);
      const { data } = db.storage.from("menu-media").getPublicUrl(path);
      await saveMenuMedia(slot, kind, data.publicUrl);
      setMsg({ text: "Enregistré. Le menu est mis à jour." });
    } catch (e) {
      setMsg({ text: e instanceof Error ? e.message : "Échec de l'envoi.", error: true });
    } finally {
      setBusy(false);
      if (input.current) input.current.value = "";
    }
  }

  return (
    <div className="mm__slot" data-type={type === "iconic" ? "iconic" : "card"} data-textonly={textOnly ? "true" : undefined}>
      {!textOnly && <div className="mm__preview">
        {shown?.kind === "video" ? <video src={shown.url} muted loop playsInline autoPlay /> : shown ? <img src={shown.url} alt="" /> : <span>Aucun visuel</span>}
      </div>}
      <div className="mm__body">
        <p className="mm__label">{label}</p>
        {!textOnly && <p className="mm__meta">{current ? (current.kind === "video" ? "Vidéo (Supabase)" : "Image (Supabase)") : original ? "Visuel d'origine" : "Aucun visuel"}</p>}
        {!textOnly && <div className="mm__actions">
          <input ref={input} type="file" accept="image/jpeg,image/png,image/webp,image/avif,video/mp4,video/webm" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
          <button type="button" className="acct__btn" data-primary="true" disabled={busy || pending} onClick={() => input.current?.click()}>{busy ? "Envoi…" : "Changer"}</button>
          {current && <button type="button" className="acct__btn" disabled={busy || pending} onClick={() => start(async () => { await resetMenuMedia(slot); setMsg({ text: "Visuel d'origine rétabli." }); })}>Rétablir l'original</button>}
        </div>}
        {msg && <p className="mm__msg" data-error={msg.error ? "true" : undefined}>{msg.text}</p>}
      </div>
      <form className="mm__fields" onSubmit={(e) => { e.preventDefault(); saveText(); }}>
        <label><span>{titleLabel}</span><input value={title} maxLength={120} placeholder={defaults.title} onChange={(e) => { setTitle(e.target.value); setTextMsg(null); }} /></label>
        {hasLabel && <label><span>Nom du panneau replié</span><input value={label2} maxLength={40} placeholder={defaults.label} onChange={(e) => { setLabel2(e.target.value); setTextMsg(null); }} /></label>}
        {hasEyebrow && <label><span>Sous-titre</span><input value={eyebrow} maxLength={120} placeholder={defaults.eyebrow} onChange={(e) => { setEyebrow(e.target.value); setTextMsg(null); }} /></label>}
        {hasText && <label><span>Texte</span><textarea value={text} maxLength={400} rows={3} placeholder={defaults.text} onChange={(e) => { setText(e.target.value); setTextMsg(null); }} /></label>}
        {hasCta && <label><span>Bouton (CTA)</span><input value={cta} maxLength={60} placeholder={defaults.cta} onChange={(e) => { setCta(e.target.value); setTextMsg(null); }} /></label>}
        <label><span>Lien</span><input value={href} maxLength={300} placeholder={defaults.href} onChange={(e) => { setHref(e.target.value); setTextMsg(null); }} /></label>
        <div className="mm__actions">
          <button type="submit" className="acct__btn" data-primary="true" disabled={!dirty || pending}>{pending ? "Enregistrement…" : "Enregistrer les textes"}</button>
          {(texts.title || texts.eyebrow || texts.cta || texts.href || texts.text || texts.label) && <button type="button" className="acct__btn" disabled={pending} onClick={() => { setTitle(""); setEyebrow(""); setCta(""); setHref(""); setText(""); setLabel2(""); start(async () => { await saveMenuText(slot, {}); setTextMsg({ text: "Textes d'origine rétablis." }); }); }}>Rétablir les textes</button>}
        </div>
        {textMsg && <p className="mm__msg" data-error={textMsg.error ? "true" : undefined}>{textMsg.text}</p>}
        <p className="mm__hint">Champ vide = texte d'origine (affiché en grisé). Lien : « /collections/parfums » ou « https://… ».</p>
      </form>
    </div>
  );
}
