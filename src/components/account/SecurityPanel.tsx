"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export function SecurityPanel() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [pw, setPw] = useState("");
  const [pw2, setPw2] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "error"; text: string } | null>(null);
  const ok = pw.length >= 8 && pw === pw2;

  const change = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ok || busy) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) setMsg({ kind: "error", text: error.code === "weak_password" ? "Mot de passe trop faible : 8 caractères minimum, avec des lettres et des chiffres." : error.code === "same_password" ? "Le nouveau mot de passe doit être différent de l'ancien." : "Impossible de modifier le mot de passe. Reconnectez-vous puis réessayez." });
    else { setMsg({ kind: "ok", text: "Votre mot de passe a été modifié." }); setPw(""); setPw2(""); }
  };

  const signOutAll = async () => {
    await supabase.auth.signOut({ scope: "global" });
    router.replace("/");
    router.refresh();
  };

  return (
    <div className="acct__stack">
      <form className="acct__card acct__form" onSubmit={change}>
        <h2 className="acct__h2">Mot de passe</h2>
        <label className="auth__field"><span>Nouveau mot de passe (8 caractères minimum)</span><input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" /></label>
        <label className="auth__field"><span>Confirmer le mot de passe</span><input type="password" value={pw2} onChange={(e) => setPw2(e.target.value)} autoComplete="new-password" /></label>
        {pw2 && pw !== pw2 && <p className="auth__msg" data-kind="error">Les deux mots de passe ne correspondent pas.</p>}
        {msg && <p className="auth__msg" data-kind={msg.kind} role="status">{msg.text}</p>}
        <button type="submit" className="auth__submit" data-ready={ok} disabled={!ok || busy}>{busy ? "Veuillez patienter…" : "Modifier le mot de passe"}</button>
      </form>

      <div className="acct__card acct__form">
        <h2 className="acct__h2">Appareils connectés</h2>
        <p className="acct__note">Déconnectez votre compte de tous vos appareils, y compris celui-ci.</p>
        <button type="button" className="acct__btn" onClick={signOutAll}>Se déconnecter partout</button>
      </div>
    </div>
  );
}
