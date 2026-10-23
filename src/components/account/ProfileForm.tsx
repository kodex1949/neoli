"use client";

import { useState } from "react";
import type { Profile } from "@/lib/account";
import { useSaveMeta } from "./useSaveMeta";

export function ProfileForm({ email, profile }: { email: string; profile: Profile }) {
  const { supabase, busy, notice, setNotice, save } = useSaveMeta();
  const [civility, setCivility] = useState(profile.civility ?? "");
  const [first, setFirst] = useState(profile.first_name ?? "");
  const [last, setLast] = useState(profile.last_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [birthday, setBirthday] = useState(profile.birthday ?? "");
  const [newsletter, setNewsletter] = useState(profile.newsletter ?? false);
  const [newEmail, setNewEmail] = useState("");
  const [mailMsg, setMailMsg] = useState<string | null>(null);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    save({ civility, first_name: first.trim(), last_name: last.trim(), phone: phone.trim(), birthday, newsletter });
  };

  const changeEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.auth.updateUser({ email: newEmail.trim() }, { emailRedirectTo: `${window.location.origin}/auth/callback?next=/compte/informations` });
    setMailMsg(error ? "Impossible de modifier l'e-mail pour le moment." : `Un e-mail de confirmation vient d'être envoyé à ${newEmail.trim()}.`);
    if (!error) setNewEmail("");
  };

  return (
    <div className="acct__stack">
      <form className="acct__card acct__form" onSubmit={submit}>
        <fieldset className="acct__radios">
          <legend>Civilité</legend>
          {(["", "Mme", "M."] as const).map((c) => (
            <label key={c || "none"}><input type="radio" name="civ" checked={civility === c} onChange={() => setCivility(c)} />{c || "Non précisé"}</label>
          ))}
        </fieldset>
        <div className="acct__row">
          <label className="auth__field"><span>Prénom</span><input value={first} onChange={(e) => setFirst(e.target.value)} autoComplete="given-name" /></label>
          <label className="auth__field"><span>Nom</span><input value={last} onChange={(e) => setLast(e.target.value)} autoComplete="family-name" /></label>
        </div>
        <div className="acct__row">
          <label className="auth__field"><span>Téléphone</span><input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} autoComplete="tel" inputMode="tel" /></label>
          <label className="auth__field"><span>Date de naissance</span><input type="date" value={birthday} onChange={(e) => setBirthday(e.target.value)} autoComplete="bday" /></label>
        </div>
        <label className="acct__check">
          <input type="checkbox" checked={newsletter} onChange={(e) => setNewsletter(e.target.checked)} />
          <span>Je souhaite recevoir les actualités, offres et invitations du Cercle ESSNC par e-mail.</span>
        </label>
        {notice && <p className="auth__msg" data-kind={notice.kind} role="status">{notice.text}</p>}
        <button type="submit" className="auth__submit" data-ready="true" disabled={busy} onClick={() => setNotice(null)}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
      </form>

      <form className="acct__card acct__form" onSubmit={changeEmail}>
        <h2 className="acct__h2">Adresse e-mail</h2>
        <p className="acct__note">Adresse actuelle : <strong>{email}</strong></p>
        <label className="auth__field"><span>Nouvelle adresse e-mail</span><input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} autoComplete="email" /></label>
        {mailMsg && <p className="auth__msg" role="status">{mailMsg}</p>}
        <button type="submit" className="auth__submit" data-ready={/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(newEmail.trim())} disabled={!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(newEmail.trim())}>Modifier l'e-mail</button>
      </form>
    </div>
  );
}
