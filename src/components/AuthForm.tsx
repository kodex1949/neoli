"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type Mode = "login" | "signup" | "reset";
type Provider = "apple" | "google" | "facebook";

const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const TITLES: Record<Mode, { h: string; p: string; cta: string }> = {
  login: { h: "Connexion", p: "Accédez à votre compte pour suivre vos commandes et retrouver vos favoris.", cta: "Se connecter" },
  signup: { h: "Créer un compte", p: "Rejoignez le Cercle ESSNC : avantages, échantillons et invitations exclusives.", cta: "Créer mon compte" },
  reset: { h: "Mot de passe oublié", p: "Entrez votre e-mail : nous vous envoyons un lien pour choisir un nouveau mot de passe.", cta: "Envoyer le lien" },
};

/** Traduit les erreurs Supabase en messages clairs. */
function explain(err: { message?: string; code?: string; status?: number }): string {
  const m = (err.message ?? "").toLowerCase();
  if (m.includes("fetch") || m.includes("network") || err.status === 0) return "Impossible de joindre le serveur de connexion. Vérifiez l'adresse du projet Supabase (NEXT_PUBLIC_SUPABASE_URL) et qu'il n'est pas en pause.";
  if (err.code === "invalid_credentials" || m.includes("invalid login")) return "E-mail ou mot de passe incorrect.";
  if (err.code === "email_not_confirmed" || m.includes("not confirmed")) return "Confirmez d'abord votre adresse e-mail avec le lien que nous vous avons envoyé.";
  if (err.code === "user_already_exists" || m.includes("already registered")) return "Un compte existe déjà avec cette adresse e-mail.";
  if (err.code === "weak_password" || m.includes("password should")) return "Mot de passe trop faible : 8 caractères minimum, avec des lettres et des chiffres.";
  if (err.status === 429 || m.includes("rate limit")) return "Trop de tentatives. Réessayez dans quelques minutes.";
  if (err.code === "signup_disabled") return "Les inscriptions sont désactivées pour le moment.";
  return "Une erreur est survenue. Réessayez dans un instant.";
}

/** Mise en page : formulaire à gauche, visuel (image ou vidéo) à droite. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  const [media, setMedia] = useState<"image" | "video">("image");
  return (
    <section className="auth">
      <div className="auth__pane">{children}</div>
      <aside className="auth__media" aria-hidden="true">
        {media === "video" ? (
          <video src="/videos/hero.mp4" autoPlay muted loop playsInline preload="auto" poster="/images/tuile-gauche.jpg" />
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img src="/images/tuile-gauche.jpg" alt="" />
        )}
        <div className="auth__switch" role="group" aria-label="Aperçu du visuel">
          <button type="button" aria-pressed={media === "image"} onClick={() => setMedia("image")}>Image</button>
          <button type="button" aria-pressed={media === "video"} onClick={() => setMedia("video")}>Vidéo</button>
        </div>
      </aside>
    </section>
  );
}

export function AuthForm({ next, initialMode = "login" }: { next: string; initialMode?: Mode }) {
  const router = useRouter();
  const supabase = useMemo(() => (configured ? createClient() : null), []);
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "ok"; text: string } | null>(null);

  const t = TITLES[mode];
  const emailOk = EMAIL.test(email.trim());
  const ready = emailOk && (mode === "reset" || password.length >= (mode === "signup" ? 8 : 1));
  const callback = () => `${window.location.origin}/auth/callback?next=${encodeURIComponent(next)}`;

  const switchMode = (m: Mode) => { setMode(m); setMsg(null); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ready || busy) return;
    if (!supabase) { setMsg({ kind: "error", text: "La connexion n'est pas configurée (clés Supabase manquantes)." }); return; }
    setBusy(true);
    setMsg(null);
    const mail = email.trim();
    try {
      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email: mail, password });
        if (error) throw error;
        router.replace(next);
        router.refresh();
        return;
      }
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({
          email: mail,
          password,
          options: { emailRedirectTo: callback(), data: { first_name: first.trim(), last_name: last.trim() } },
        });
        if (error) throw error;
        if (data.user && data.user.identities?.length === 0) { setMsg({ kind: "error", text: "Un compte existe déjà avec cette adresse e-mail." }); return; }
        if (data.session) { router.replace(next); router.refresh(); return; }
        setMsg({ kind: "ok", text: `Compte créé ! Un e-mail de confirmation vient d'être envoyé à ${mail}.` });
        return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(mail, { redirectTo: `${window.location.origin}/auth/callback?next=/compte` });
      if (error) throw error;
      setMsg({ kind: "ok", text: `Si un compte existe pour ${mail}, un lien vient d'être envoyé.` });
    } catch (err) {
      setMsg({ kind: "error", text: explain(err as { message?: string; code?: string; status?: number }) });
    } finally {
      setBusy(false);
    }
  };

  const magic = async () => {
    if (!emailOk || busy) { setMsg({ kind: "error", text: "Entrez d'abord votre adresse e-mail." }); return; }
    if (!supabase) return;
    setBusy(true);
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: callback() } });
    setBusy(false);
    setMsg(error ? { kind: "error", text: explain(error) } : { kind: "ok", text: `Un lien de connexion vient d'être envoyé à ${email.trim()}.` });
  };

  const social = async (provider: Provider) => {
    if (!supabase) { setMsg({ kind: "error", text: "La connexion n'est pas configurée (clés Supabase manquantes)." }); return; }
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: callback() } });
    if (error) setMsg({ kind: "error", text: "Cette connexion n'est pas disponible pour le moment." });
  };

  return (
    <AuthShell>
      <div className="auth__box">
        {mode !== "reset" && (
          <div className="auth__tabs" role="tablist">
            <button type="button" role="tab" aria-selected={mode === "login"} onClick={() => switchMode("login")}>Connexion</button>
            <button type="button" role="tab" aria-selected={mode === "signup"} onClick={() => switchMode("signup")}>Inscription</button>
          </div>
        )}

        <h1 className="auth__title">{t.h}</h1>
        <p className="auth__lead">{t.p}</p>

        <form className="auth__form" onSubmit={submit} noValidate>
          {mode === "signup" && (
            <div className="auth__row">
              <label className="auth__field"><span>Prénom</span><input value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" /></label>
              <label className="auth__field"><span>Nom</span><input value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" /></label>
            </div>
          )}
          <label className="auth__field">
            <span>*E-mail</span>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" inputMode="email" required />
          </label>
          {mode !== "reset" && (
            <label className="auth__field">
              <span>*Mot de passe{mode === "signup" ? " (8 caractères minimum)" : ""}</span>
              <span className="auth__pw">
                <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} autoComplete={mode === "signup" ? "new-password" : "current-password"} required />
                <button type="button" onClick={() => setShow((s) => !s)} aria-label={show ? "Masquer le mot de passe" : "Afficher le mot de passe"}>{show ? "Masquer" : "Afficher"}</button>
              </span>
            </label>
          )}
          {mode === "login" && (
            <button type="button" className="auth__link" onClick={() => switchMode("reset")}>Mot de passe oublié ?</button>
          )}

          {msg && <p className="auth__msg" data-kind={msg.kind} role="status">{msg.text}</p>}

          <button type="submit" className="auth__submit" data-ready={ready} disabled={!ready || busy}>{busy ? "Veuillez patienter…" : t.cta}</button>
          {mode === "reset" && <button type="button" className="auth__link auth__link--center" onClick={() => switchMode("login")}>Retour à la connexion</button>}
        </form>

        {mode !== "reset" && (
          <>
            <button type="button" className="auth__magic" onClick={magic}>Recevoir un lien de connexion par e-mail</button>
            {process.env.NEXT_PUBLIC_GOOGLE_LOGIN === "1" && (
              <>
                <div className="auth__or"><span>ou continuez avec</span></div>
                <div className="auth__social">
                  <button type="button" onClick={() => social("google")} className="auth__btn auth__btn--full">Google</button>
                </div>
              </>
            )}
          </>
        )}

        <p className="auth__legal">En continuant, vous acceptez nos <Link href="/info/conditions">conditions d'utilisation</Link> et notre <Link href="/info/confidentialite">politique de confidentialité</Link>.</p>
      </div>
    </AuthShell>
  );
}
