"use client";

import Link from "next/link";
import { useSheetDrag } from "@/lib/sheet";
import { useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/client";

type Props = { open: boolean; onClose: () => void; pos: { top: number; right: number } };
type Provider = "apple" | "google" | "facebook";

const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Panneau compte : même verre dépoli que la recherche, ancré sous l'icône compte.
 * Déconnecté : e-mail (lien magique Supabase) ou Apple / Google / Facebook. Connecté : liens du compte.
 */
export function UserPanel({ open, onClose, pos }: Props) {
  const supabase = useMemo(() => (configured ? createClient() : null), []);
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "loading" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");
  const input = useRef<HTMLInputElement>(null);
  const sheet = useSheetDrag(onClose);

  // Session courante + changements (connexion, déconnexion)
  useEffect(() => {
    if (!supabase) return;
    supabase.auth.getUser().then(({ data }) => setUser(data.user ?? null));
    const { data } = supabase.auth.onAuthStateChange((_e, session) => setUser(session?.user ?? null));
    return () => data.subscription.unsubscribe();
  }, [supabase]);

  // Focus + verrouillage du scroll à l'ouverture
  useEffect(() => {
    if (!open) return;
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    input.current?.focus();
    return () => { document.documentElement.style.overflow = prev; };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Remet le formulaire à zéro après la fermeture
  useEffect(() => {
    if (open) return;
    const t = setTimeout(() => { setStatus("idle"); setMessage(""); }, 1000);
    return () => clearTimeout(t);
  }, [open]);

  const valid = EMAIL.test(email.trim());
  const redirectTo = () => `${window.location.origin}/auth/callback`;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || status === "loading") return;
    if (!supabase) { setStatus("error"); setMessage("La connexion n'est pas encore configurée (clés Supabase manquantes)."); return; }
    setStatus("loading");
    const { error } = await supabase.auth.signInWithOtp({ email: email.trim(), options: { emailRedirectTo: redirectTo() } });
    if (error) { setStatus("error"); setMessage("Impossible d'envoyer le lien. Réessayez dans un instant."); return; }
    setStatus("sent");
    setMessage(`Un lien de connexion vient d'être envoyé à ${email.trim()}.`);
  };

  const social = async (provider: Provider) => {
    if (!supabase) { setStatus("error"); setMessage("La connexion n'est pas encore configurée (clés Supabase manquantes)."); return; }
    const { error } = await supabase.auth.signInWithOAuth({ provider, options: { redirectTo: redirectTo() } });
    if (error) { setStatus("error"); setMessage("Cette connexion n'est pas disponible pour le moment."); }
  };

  const signOut = async () => {
    await supabase?.auth.signOut();
    onClose();
  };

  return (
    <>
      {open && <div className="search__scrim" onClick={onClose} aria-hidden="true" />}
      <div
        ref={sheet.ref}
        className="user"
        data-open={open}
        role="dialog"
        aria-label="Mon compte"
        inert={!open}
        style={{ top: pos.top, right: pos.right }}
      >
        <div className="user__inner">
          <div className="user__grab" aria-hidden="true" {...sheet.grab} />
          <div className="user__top">
            <button type="button" className="user__close" onClick={onClose} aria-label="Fermer">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6.5 17.5 17.5 6.5" /><path d="M6.5 6.5 17.5 17.5" /></svg>
            </button>
          </div>

          {user ? (
            <div className="user__body">
              <h2 className="user__title">Bonjour</h2>
              <p className="user__lead">{user.email}</p>
              <ul className="user__links">
                <li><Link href="/compte" onClick={onClose}>Mon compte</Link></li>
                <li><Link href="/compte/commandes" onClick={onClose}>Mes commandes</Link></li>
                <li><Link href="/compte/adresses" onClick={onClose}>Mes adresses</Link></li>
              </ul>
              <button type="button" className="user__submit" data-ready="true" onClick={signOut}>Se déconnecter</button>
            </div>
          ) : (
            <div className="user__body">
              <h2 className="user__title">Connectez-vous ou créez un compte</h2>
              <p className="user__lead">Entrez votre adresse e-mail pour vous connecter ou créer un compte et devenir membre du Cercle ESSNC.</p>

              <form className="user__card" onSubmit={submit} noValidate>
                <label className="user__field">
                  <span>*E-mail</span>
                  <input
                    ref={input}
                    type="email"
                    value={email}
                    onChange={(e) => { setEmail(e.target.value); if (status !== "loading") setStatus("idle"); }}
                    autoComplete="email"
                    inputMode="email"
                    required
                  />
                </label>
                <button type="submit" className="user__submit" data-ready={valid} disabled={!valid || status === "loading"}>
                  {status === "loading" ? "Envoi…" : "Connexion / Inscription"}
                </button>
              </form>

              <p className="user__lead" style={{ margin: 0 }}>
                <Link href="/connexion" onClick={onClose} style={{ textDecoration: "underline", textUnderlineOffset: 3 }}>Se connecter avec un mot de passe</Link>
              </p>

              {message && <p className="user__msg" data-status={status} role="status">{message}</p>}

              <div className="user__or"><span>ou continuez avec</span></div>
              <div className="user__social">
                <button type="button" className="user__btn user__btn--full" onClick={() => social("apple")}>Apple</button>
                <button type="button" className="user__btn" onClick={() => social("google")}>Google</button>
                <button type="button" className="user__btn" onClick={() => social("facebook")}>Facebook</button>
              </div>

              <Link href="/connexion?mode=inscription" onClick={onClose} className="user__member">
                <strong>Rejoignez le Cercle ESSNC</strong>
                <span>Entrez dans le cercle privilégié des membres pour vivre une expérience unique : avantages, échantillons et invitations exclusives.</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
