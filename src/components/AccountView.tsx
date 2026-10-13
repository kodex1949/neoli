"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AuthShell } from "./AuthForm";
import { createClient } from "@/lib/supabase/client";

export function AccountView({ email, firstName, lastName }: { email: string; firstName: string; lastName: string }) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: "error" | "ok"; text: string } | null>(null);

  const name = [firstName, lastName].filter(Boolean).join(" ");

  const changePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pw.length < 8 || busy) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setBusy(false);
    if (error) setMsg({ kind: "error", text: error.code === "weak_password" ? "Mot de passe trop faible : 8 caractères minimum, avec des lettres et des chiffres." : "Impossible de modifier le mot de passe. Reconnectez-vous puis réessayez." });
    else { setMsg({ kind: "ok", text: "Votre mot de passe a été modifié." }); setPw(""); }
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  };

  return (
    <AuthShell>
      <div className="auth__box">
        <h1 className="auth__title">{name ? `Bonjour ${firstName || name}` : "Mon compte"}</h1>
        <p className="auth__lead">{email}</p>

        <form className="auth__form" onSubmit={changePassword}>
          <label className="auth__field">
            <span>Nouveau mot de passe (8 caractères minimum)</span>
            <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="new-password" />
          </label>
          {msg && <p className="auth__msg" data-kind={msg.kind} role="status">{msg.text}</p>}
          <button type="submit" className="auth__submit" data-ready={pw.length >= 8} disabled={pw.length < 8 || busy}>{busy ? "Veuillez patienter…" : "Modifier le mot de passe"}</button>
        </form>

        <button type="button" className="auth__magic" onClick={signOut}>Se déconnecter</button>
      </div>
    </AuthShell>
  );
}
