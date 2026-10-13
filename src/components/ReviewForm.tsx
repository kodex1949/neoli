"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { submitReview } from "@/app/produits/[handle]/actions";

export function ReviewForm({ handle }: { handle: string }) {
  const supabase = useMemo(() => createClient(), []);
  const [user, setUser] = useState<{ first?: string } | null | undefined>(undefined);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const u = data.user;
      setUser(u ? { first: (u.user_metadata?.first_name as string | undefined) ?? "" } : null);
      if (u) setName((u.user_metadata?.first_name as string | undefined) ?? "");
    }).catch(() => setUser(null));
  }, [supabase]);

  if (user === undefined) return null;
  if (!user) {
    return <p className="rev__login"><Link href={`/connexion?next=${encodeURIComponent(`/produits/${handle}#avis`)}`}>Connectez-vous</Link> pour donner votre avis.</p>;
  }
  if (msg?.kind === "ok") return <p className="rev__msg" data-kind="ok" role="status">{msg.text}</p>;
  if (!open) return <button type="button" className="rev__open" onClick={() => setOpen(true)}>Donner mon avis</button>;

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await submitReview({ handle, rating, title, body, name }).catch(() => ({ ok: false as const, error: "Impossible d'envoyer votre avis pour le moment." }));
    setBusy(false);
    setMsg(r.ok ? { kind: "ok", text: "Merci ! Votre avis a bien été reçu, il sera publié après validation." } : { kind: "error", text: r.error });
  };

  return (
    <form className="rev__form" onSubmit={send}>
      <div className="rev__pick" role="radiogroup" aria-label="Votre note" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button key={n} type="button" role="radio" aria-checked={rating === n} aria-label={`${n} étoile${n > 1 ? "s" : ""}`} data-on={n <= (hover || rating)} onMouseEnter={() => setHover(n)} onClick={() => setRating(n)}>★</button>
        ))}
      </div>
      <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} placeholder="Prénom affiché" aria-label="Prénom affiché" required />
      <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={100} placeholder="Titre (facultatif)" aria-label="Titre" />
      <textarea value={body} onChange={(e) => setBody(e.target.value)} maxLength={2000} rows={5} placeholder="Votre avis (10 caractères minimum)" aria-label="Votre avis" required />
      {msg && <p className="rev__msg" data-kind={msg.kind} role="alert">{msg.text}</p>}
      <div className="rev__actions">
        <button type="submit" className="rev__send" disabled={busy || rating === 0 || body.trim().length < 10}>{busy ? "Envoi…" : "Envoyer mon avis"}</button>
        <button type="button" className="rev__cancel" onClick={() => setOpen(false)}>Annuler</button>
      </div>
    </form>
  );
}
