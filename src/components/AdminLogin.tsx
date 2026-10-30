"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";

/** Page de connexion de l'administration : identifiant (adresse e-mail du compte administrateur) et mot de passe. */
export function AdminLogin({ next, deniedEmail }: { next: string; deniedEmail: string | null }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [id, setId] = useState("");
  const [pw, setPw] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fails = useRef(0);
  const [lock, setLock] = useState(false);
  const ready = id.trim().length > 3 && pw.length > 0 && !lock;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || busy) return;
    if (!supabase) { setErr("La connexion n'est pas configurée (clés Supabase manquantes)."); return; }
    setBusy(true);
    setErr(null);
    const { error } = await supabase.auth.signInWithPassword({ email: id.trim(), password: pw });
    if (error) {
      fails.current += 1;
      setBusy(false);
      setPw("");
      setErr(error.status === 429 ? "Trop de tentatives. Réessayez dans quelques minutes." : "Identifiant ou mot de passe incorrect.");
      if (fails.current >= 5) { setLock(true); setErr("Trop d'échecs. Patientez 30 secondes avant de réessayer."); window.setTimeout(() => { fails.current = 0; setLock(false); setErr(null); }, 30000); }
      return;
    }
    router.replace(next);
    router.refresh();
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
    router.refresh();
  };

  return (
    <main className="adml">
      <div className="adml__box">
        <p className="adml__brand">ESSNC</p>
        <p className="adml__sub">Administration</p>

        {deniedEmail !== null ? (
          <div className="adml__card">
            <h1>Accès réservé</h1>
            <p>Le compte <b>{deniedEmail}</b> n'est pas administrateur.</p>
            <button type="button" className="adml__submit" data-ready="true" onClick={signOut}>Changer de compte</button>
            <Link href="/" className="adml__back">Retour au site</Link>
          </div>
        ) : (
          <form className="adml__card" onSubmit={submit} noValidate>
            <h1>Connexion</h1>
            <label className="adml__field">
              <span>Identifiant</span>
              <input type="email" value={id} onChange={(e) => setId(e.target.value)} autoComplete="username" autoCapitalize="none" spellCheck={false} autoFocus placeholder="adresse e-mail" />
            </label>
            <label className="adml__field">
              <span>Mot de passe</span>
              <span className="adml__pw">
                <input type={show ? "text" : "password"} value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password" />
                <button type="button" onClick={() => setShow((s) => !s)} aria-pressed={show}>{show ? "Masquer" : "Afficher"}</button>
              </span>
            </label>
            {err && <p className="adml__err" role="alert">{err}</p>}
            <button type="submit" className="adml__submit" data-ready={ready} disabled={!ready || busy}>{busy ? "Connexion…" : "Se connecter"}</button>
            <Link href="/" className="adml__back">Retour au site</Link>
          </form>
        )}
      </div>
    </main>
  );
}
