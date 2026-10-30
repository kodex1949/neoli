"use client";

import Link from "next/link";
import { useMemo, useRef, useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { cleanHtml, renderNewsletter, type NlBlock } from "@/lib/newsletter-html";
import { deleteCampaign, saveCampaign } from "@/app/admin/newsletter/campagnes/actions";

type State = { subject: string; preheader: string; status: "draft" | "ready"; blocks: NlBlock[]; customHtml: string | null; images: string[] };
type Tab = "preview" | "code" | "json";
const TYPES = ["title", "text", "image", "button", "divider"];
const MAX_FILE = 500 * 1024;
/** Convertit un JSON importé ({subject, preheader, blocks:[…]}) en blocs valides ; null si le format est inconnu. */
function fromJson(d: unknown): Pick<State, "subject" | "preheader" | "blocks"> | null {
  const o = d as { subject?: unknown; preheader?: unknown; blocks?: unknown };
  if (!o || typeof o !== "object" || !Array.isArray(o.blocks)) return null;
  const str = (v: unknown) => (typeof v === "string" ? v : "");
  const blocks: NlBlock[] = [];
  for (const raw of o.blocks as Record<string, unknown>[]) {
    if (!raw || !TYPES.includes(String(raw.type))) return null;
    const id = crypto.randomUUID();
    switch (raw.type) {
      case "title": blocks.push({ id, type: "title", text: str(raw.text) }); break;
      case "text": blocks.push({ id, type: "text", text: str(raw.text) }); break;
      case "image": blocks.push({ id, type: "image", url: str(raw.url), alt: str(raw.alt), href: str(raw.href) }); break;
      case "button": blocks.push({ id, type: "button", label: str(raw.label), href: str(raw.href) }); break;
      default: blocks.push({ id, type: "divider" });
    }
  }
  return { subject: str(o.subject), preheader: str(o.preheader), blocks };
}
const LABEL: Record<NlBlock["type"], string> = { title: "Titre", text: "Texte", image: "Image", button: "Bouton", divider: "Séparateur" };
const MAX = 10 * 1024 * 1024;

/** Éditeur de newsletter : blocs à gauche, aperçu e-mail en direct à droite. */
export function NewsletterComposer({ id, initial }: { id: string; initial: State }) {
  const [st, setSt] = useState<State>(initial);
  const [saved, setSaved] = useState(JSON.stringify(initial));
  const [msg, setMsg] = useState<{ t: string; err?: boolean } | null>(null);
  const [view, setView] = useState<"desktop" | "mobile">("desktop");
  const [tab, setTab] = useState<Tab>("preview");
  const [fileName, setFileName] = useState("");
  const importer = useRef<HTMLInputElement>(null);
  const imgLib = useRef<HTMLInputElement>(null);
  const code = useRef<HTMLTextAreaElement>(null);
  const [libBusy, setLibBusy] = useState(false);
  const [pending, start] = useTransition();
  const [busy, setBusy] = useState<string | null>(null);
  const [confirm, setConfirm] = useState(false);
  const file = useRef<HTMLInputElement>(null);
  const target = useRef<string>("");
  const dirty = JSON.stringify(st) !== saved;
  const generated = useMemo(() => renderNewsletter(st.subject, st.preheader, st.blocks), [st.subject, st.preheader, st.blocks]);
  const html = st.customHtml ?? generated;
  const json = useMemo(() => JSON.stringify({ subject: st.subject, preheader: st.preheader, blocks: st.blocks.map((b) => { const c: Record<string, unknown> = { ...b }; delete c.id; return c; }) }, null, 2), [st.subject, st.preheader, st.blocks]);

  const patch = (p: Partial<State>) => { setSt((s) => ({ ...s, ...p })); setMsg(null); };
  const upd = (bid: string, p: Partial<NlBlock>) => patch({ blocks: st.blocks.map((b) => (b.id === bid ? ({ ...b, ...p } as NlBlock) : b)) });
  const move = (i: number, d: -1 | 1) => { const a = [...st.blocks]; const j = i + d; if (j < 0 || j >= a.length) return; [a[i], a[j]] = [a[j], a[i]]; patch({ blocks: a }); };
  const add = (type: NlBlock["type"]) => {
    const id = crypto.randomUUID();
    const b: NlBlock = type === "title" ? { id, type, text: "Nouveau titre" } : type === "text" ? { id, type, text: "" } : type === "image" ? { id, type, url: "", alt: "", href: "" } : type === "button" ? { id, type, label: "Découvrir", href: "/" } : { id, type };
    patch({ blocks: [...st.blocks, b] });
  };

  const save = (status = st.status) => start(async () => {
    try { const next = { ...st, status }; await saveCampaign(id, next); setSt(next); setSaved(JSON.stringify(next)); setMsg({ t: status === "ready" ? "Enregistrée, marquée prête." : "Enregistrée." }); }
    catch (e) { setMsg({ t: e instanceof Error ? e.message : "Échec de l'enregistrement.", err: true }); }
  });

  /** Envoie une image dans le stockage et l'ajoute à la bibliothèque ; renvoie son URL. */
  async function send(f: File): Promise<string> {
    if (!/^image\/(jpeg|png|webp|gif)$/.test(f.type)) throw new Error("Image JPG, PNG, WebP ou GIF uniquement (compatibles e-mail).");
    if (f.size > MAX) throw new Error("Image trop lourde (10 Mo maximum).");
    const db = createClient();
    const ext = (f.name.split(".").pop() || "jpg").toLowerCase().replace(/[^a-z0-9]/g, "");
    const path = `newsletter-${id}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}.${ext}`;
    const { error } = await db.storage.from("menu-media").upload(path, f, { contentType: f.type, cacheControl: "31536000" });
    if (error) throw new Error(error.message);
    return db.storage.from("menu-media").getPublicUrl(path).data.publicUrl;
  }

  async function upload(f: File) {
    const bid = target.current; setBusy(bid);
    try {
      const url = await send(f);
      setSt((p) => ({ ...p, images: [...p.images, url], blocks: p.blocks.map((b) => (b.id === bid && b.type === "image" ? { ...b, url } : b)) }));
      setMsg(null);
    } catch (e) { setMsg({ t: e instanceof Error ? e.message : "Échec de l'envoi.", err: true }); }
    finally { setBusy(null); if (file.current) file.current.value = ""; }
  }

  async function uploadMany(files: FileList) {
    setLibBusy(true); setMsg(null);
    const urls: string[] = [];
    try { for (const f of Array.from(files)) urls.push(await send(f)); }
    catch (e) { setMsg({ t: e instanceof Error ? e.message : "Échec de l'envoi.", err: true }); }
    if (urls.length) setSt((p) => ({ ...p, images: [...p.images, ...urls] }));
    setLibBusy(false); if (imgLib.current) imgLib.current.value = "";
  }

  async function importFile(f: File) {
    if (f.size > MAX_FILE) return setMsg({ t: "Fichier trop lourd (500 Ko maximum).", err: true });
    const text = await f.text();
    const isJson = /\.json$/i.test(f.name) || f.type === "application/json";
    const isHtml = /\.html?$/i.test(f.name) || f.type === "text/html";
    if (!isJson && !isHtml) return setMsg({ t: "Formats acceptés : .html, .htm ou .json.", err: true });
    setFileName(f.name);
    if (isJson) {
      let d: unknown;
      try { d = JSON.parse(text); } catch { return setMsg({ t: "Ce fichier n'est pas un JSON valide.", err: true }); }
      const r = fromJson(d);
      if (!r) return setMsg({ t: "JSON non reconnu. Attendu : { \"subject\", \"preheader\", \"blocks\": [{ \"type\": \"title|text|image|button|divider\", … }] }.", err: true });
      setSt((p) => ({ ...p, subject: r.subject || p.subject, preheader: r.preheader || p.preheader, blocks: r.blocks, customHtml: null }));
      setTab("json"); setMsg({ t: `« ${f.name} » importé : ${r.blocks.length} blocs. Pensez à enregistrer.` });
    } else {
      setSt((p) => ({ ...p, customHtml: cleanHtml(text) }));
      setTab("preview"); setMsg({ t: `« ${f.name} » importé en HTML libre (scripts retirés). Pensez à enregistrer.` });
    }
    if (importer.current) importer.current.value = "";
  }

  const imgTag = (u: string) => `<img src="${u}" alt="" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0">`;
  const insertInCode = (u: string) => {
    const el = code.current; const cur = st.customHtml ?? "";
    const a = el?.selectionStart ?? cur.length, b = el?.selectionEnd ?? cur.length;
    patch({ customHtml: cur.slice(0, a) + imgTag(u) + cur.slice(b) });
    setTab("code"); setMsg({ t: "Image insérée dans le code." });
  };
  const addImageBlock = (u: string) => { patch({ blocks: [...st.blocks, { id: crypto.randomUUID(), type: "image", url: u, alt: "", href: "" }], customHtml: st.customHtml }); setMsg({ t: "Bloc image ajouté." }); };
  const copyUrl = async (u: string) => { try { await navigator.clipboard.writeText(u); setMsg({ t: "Adresse de l'image copiée." }); } catch { setMsg({ t: "Copie impossible.", err: true }); } };

  const copy = async () => { try { await navigator.clipboard.writeText(tab === "json" ? json : html); setMsg({ t: tab === "json" ? "JSON copié." : "Code HTML copié." }); } catch { setMsg({ t: "Copie impossible : utilisez « Télécharger ».", err: true }); } };
  const download = () => { const j = tab === "json"; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([j ? json : html], { type: j ? "application/json" : "text/html" })); a.download = j ? "newsletter.json" : "newsletter.html"; a.click(); URL.revokeObjectURL(a.href); };

  return (
    <div className="nlc">
      <div className="nlc__form">
        <Link className="nlad__export" href="/admin/newsletter/campagnes">← Campagnes</Link>
        <h1 className="admh__title">Éditeur</h1>
        <div className="mm__fields">
          <label><span>Objet de l'e-mail</span><input value={st.subject} maxLength={150} onChange={(e) => patch({ subject: e.target.value })} /></label>
          <label><span>Texte d'aperçu (affiché après l'objet dans la boîte de réception)</span><input value={st.preheader} maxLength={200} onChange={(e) => patch({ preheader: e.target.value })} /></label>
        </div>

        <section className="nlc__box">
          <p className="nlc__h">Fichier joint</p>
          <input ref={importer} type="file" accept=".html,.htm,.json,text/html,application/json" hidden onChange={(e) => e.target.files?.[0] && importFile(e.target.files[0])} />
          <div className="mm__actions">
            <button type="button" className="acct__btn" data-primary="true" onClick={() => importer.current?.click()}>Joindre un fichier HTML ou JSON</button>
            {fileName && <span className="mm__meta">{fileName}</span>}
          </div>
          <p className="mm__meta">Un .html devient le contenu de l'e-mail (HTML libre) ; un .json remplit l'objet et les blocs. Le contenu s'affiche à droite, onglets « Code » et « JSON ».</p>
          {st.customHtml !== null && <div className="mm__actions"><span className="nlc__tag">HTML libre actif</span><button type="button" className="acct__btn" onClick={() => patch({ customHtml: null })}>Revenir aux blocs</button></div>}
        </section>

        <section className="nlc__box">
          <p className="nlc__h">Images</p>
          <input ref={imgLib} type="file" accept="image/jpeg,image/png,image/webp,image/gif" multiple hidden onChange={(e) => e.target.files?.length && uploadMany(e.target.files)} />
          <div className="mm__actions"><button type="button" className="acct__btn" data-primary="true" disabled={libBusy} onClick={() => imgLib.current?.click()}>{libBusy ? "Envoi…" : "Ajouter des images"}</button></div>
          {st.images.length === 0 && <p className="mm__meta">Aucune image. Ajoutez-en, puis insérez-les en bloc ou directement dans le code HTML.</p>}
          <ul className="nlc__lib">
            {st.images.map((u, i) => (
              <li key={u + i}>
                <img src={u} alt="" />
                <span>
                  <button type="button" onClick={() => addImageBlock(u)} disabled={st.customHtml !== null} title={st.customHtml !== null ? "Revenez aux blocs pour ajouter un bloc" : ""}>Bloc image</button>
                  <button type="button" onClick={() => insertInCode(u)} disabled={st.customHtml === null} title={st.customHtml === null ? "Joignez un HTML (ou « Modifier en HTML libre ») pour insérer dans le code" : ""}>Dans le code</button>
                  <button type="button" onClick={() => copyUrl(u)}>Copier l'adresse</button>
                  <button type="button" onClick={() => patch({ images: st.images.filter((_, k) => k !== i) })}>Retirer</button>
                </span>
              </li>
            ))}
          </ul>
        </section>

        <input ref={file} type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />
        {st.customHtml !== null && <p className="mm__meta">Le HTML libre remplace les blocs : modifiez-le dans l'onglet « Code » à droite.</p>}
        <ol className="nlc__blocks" hidden={st.customHtml !== null}>
          {st.blocks.map((b, i) => (
            <li key={b.id} className="nlc__block">
              <div className="nlc__bar">
                <strong>{LABEL[b.type]}</strong>
                <span>
                  <button type="button" aria-label="Monter" disabled={i === 0} onClick={() => move(i, -1)}>↑</button>
                  <button type="button" aria-label="Descendre" disabled={i === st.blocks.length - 1} onClick={() => move(i, 1)}>↓</button>
                  <button type="button" aria-label="Retirer le bloc" onClick={() => patch({ blocks: st.blocks.filter((x) => x.id !== b.id) })}>✕</button>
                </span>
              </div>
              <div className="mm__fields">
                {b.type === "title" && <label><span>Titre</span><input value={b.text} maxLength={200} onChange={(e) => upd(b.id, { text: e.target.value })} /></label>}
                {b.type === "text" && <label><span>Texte</span><textarea rows={5} value={b.text} maxLength={3000} onChange={(e) => upd(b.id, { text: e.target.value })} /></label>}
                {b.type === "image" && <>
                  <div className="mm__actions">
                    <button type="button" className="acct__btn" data-primary="true" disabled={busy === b.id} onClick={() => { target.current = b.id; file.current?.click(); }}>{busy === b.id ? "Envoi…" : b.url ? "Changer l'image" : "Ajouter une image"}</button>
                    {b.url && <button type="button" className="acct__btn" onClick={() => upd(b.id, { url: "" } as Partial<NlBlock>)}>Retirer</button>}
                  </div>
                  <label><span>Description (texte alternatif)</span><input value={b.alt} maxLength={160} onChange={(e) => upd(b.id, { alt: e.target.value } as Partial<NlBlock>)} /></label>
                  <label><span>Lien de l'image (facultatif)</span><input value={b.href} maxLength={300} placeholder="/collections/parfums ou https://…" onChange={(e) => upd(b.id, { href: e.target.value } as Partial<NlBlock>)} /></label>
                </>}
                {b.type === "button" && <>
                  <label><span>Texte du bouton</span><input value={b.label} maxLength={60} onChange={(e) => upd(b.id, { label: e.target.value } as Partial<NlBlock>)} /></label>
                  <label><span>Lien</span><input value={b.href} maxLength={300} placeholder="/collections/parfums ou https://…" onChange={(e) => upd(b.id, { href: e.target.value } as Partial<NlBlock>)} /></label>
                </>}
                {b.type === "divider" && <p className="mm__meta">Ligne de séparation.</p>}
              </div>
            </li>
          ))}
        </ol>

        <div className="nlc__add">
          <span>Ajouter :</span>
          {(["title", "text", "image", "button", "divider"] as const).map((t) => <button key={t} type="button" className="acct__btn" onClick={() => add(t)}>{LABEL[t]}</button>)}
        </div>

        <div className="mm__actions nlc__actions">
          <button type="button" className="acct__btn" data-primary="true" disabled={!dirty || pending} onClick={() => save()}>{pending ? "…" : "Enregistrer"}</button>
          <button type="button" className="acct__btn" disabled={pending} onClick={() => save(st.status === "ready" ? "draft" : "ready")}>{st.status === "ready" ? "Repasser en brouillon" : "Marquer comme prête"}</button>
          {confirm
            ? <><button type="button" className="acct__btn" onClick={() => start(async () => { await deleteCampaign(id); })}>Confirmer la suppression</button><button type="button" className="acct__btn" onClick={() => setConfirm(false)}>Annuler</button></>
            : <button type="button" className="acct__btn" onClick={() => setConfirm(true)}>Supprimer</button>}
        </div>
        {msg && <p className="mm__msg" data-error={msg.err ? "true" : undefined}>{msg.t}</p>}
        {dirty && !msg && <p className="mm__meta">Modifications non enregistrées.</p>}
      </div>

      <aside className="nlc__preview">
        <div className="nlc__pbar">
          <span className="nlc__seg">
            <button type="button" data-on={tab === "preview"} onClick={() => setTab("preview")}>Aperçu</button>
            <button type="button" data-on={tab === "code"} onClick={() => setTab("code")}>Code HTML</button>
            <button type="button" data-on={tab === "json"} onClick={() => setTab("json")}>JSON</button>
          </span>
          <span>
            <button type="button" className="acct__btn" onClick={copy}>{tab === "json" ? "Copier le JSON" : "Copier le HTML"}</button>
            <button type="button" className="acct__btn" onClick={download}>Télécharger</button>
          </span>
        </div>
        {tab === "preview" && <>
          <p className="nlc__subj"><strong>{st.subject || "Sans objet"}</strong><span>{st.preheader}</span></p>
          <span className="nlc__seg nlc__seg--sm">
            <button type="button" data-on={view === "desktop"} onClick={() => setView("desktop")}>Ordinateur</button>
            <button type="button" data-on={view === "mobile"} onClick={() => setView("mobile")}>Mobile</button>
          </span>
          <div className="nlc__frame" data-view={view}>
            <iframe title="Aperçu de la newsletter" sandbox="" srcDoc={html} />
          </div>
        </>}
        {tab === "code" && <div className="nlc__code">
          {st.customHtml === null
            ? <><p className="mm__meta">Code généré à partir de vos blocs (lecture seule).</p><textarea readOnly value={generated} spellCheck={false} /><div className="mm__actions"><button type="button" className="acct__btn" onClick={() => patch({ customHtml: generated })}>Modifier en HTML libre</button></div></>
            : <><p className="mm__meta">HTML libre : modifiable. Cliquez dans le texte puis « Dans le code » pour y placer une image.</p><textarea ref={code} value={st.customHtml} spellCheck={false} onChange={(e) => patch({ customHtml: e.target.value })} /></>}
        </div>}
        {tab === "json" && <div className="nlc__code"><p className="mm__meta">Contenu de la campagne au format JSON (réimportable).</p><textarea readOnly value={json} spellCheck={false} /></div>}
        <p className="mm__meta">Le lien « Se désinscrire » contient {"{{unsubscribe_url}}"} : remplacez-le par le lien de désinscription de votre outil d'envoi.</p>
      </aside>
    </div>
  );
}
