"use client";

import { useState } from "react";
import type { Address } from "@/lib/account";
import { useSaveMeta } from "./useSaveMeta";

const EMPTY: Address = { id: "", label: "", firstName: "", lastName: "", line1: "", line2: "", zip: "", city: "", country: "France", phone: "", isDefault: false };
const COUNTRIES = ["France", "Belgique", "Suisse", "Luxembourg", "Allemagne", "Espagne", "Italie", "Royaume-Uni"];

export function AddressBook({ initial }: { initial: Address[] }) {
  const { busy, notice, setNotice, save } = useSaveMeta();
  const [list, setList] = useState<Address[]>(initial);
  const [edit, setEdit] = useState<Address | null>(null);

  const persist = async (next: Address[], text: string) => {
    if (await save({ addresses: next }, text)) { setList(next); setEdit(null); }
  };

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!edit) return;
    let a: Address = { ...edit, id: edit.id || crypto.randomUUID() };
    let next = list.some((x) => x.id === a.id) ? list.map((x) => (x.id === a.id ? a : x)) : [...list, a];
    if (a.isDefault || next.length === 1) {
      a = { ...a, isDefault: true };
      next = next.map((x) => (x.id === a.id ? a : { ...x, isDefault: false }));
    }
    persist(next, "Adresse enregistrée.");
  };

  const remove = (id: string) => {
    let next = list.filter((x) => x.id !== id);
    if (next.length && !next.some((x) => x.isDefault)) next = next.map((x, i) => ({ ...x, isDefault: i === 0 }));
    persist(next, "Adresse supprimée.");
  };

  const set = (k: keyof Address, v: string | boolean) => setEdit((a) => (a ? { ...a, [k]: v } : a));
  const valid = edit && edit.firstName.trim() && edit.lastName.trim() && edit.line1.trim() && edit.zip.trim() && edit.city.trim();

  return (
    <div className="acct__stack">
      {notice && !edit && <p className="auth__msg" data-kind={notice.kind} role="status">{notice.text}</p>}

      {!edit && (
        <>
          {list.length === 0 ? (
            <div className="acct__empty">
              <h2>Aucune adresse enregistrée</h2>
              <p>Ajoutez une adresse pour accélérer vos prochaines commandes.</p>
            </div>
          ) : (
            <ul className="acct__addrs">
              {list.map((a) => (
                <li key={a.id} className="acct__card">
                  {a.isDefault && <span className="acct__tag">Adresse par défaut</span>}
                  <p className="acct__addr-name">{a.label || `${a.firstName} ${a.lastName}`}</p>
                  <p>{a.firstName} {a.lastName}<br />{a.line1}{a.line2 ? <><br />{a.line2}</> : null}<br />{a.zip} {a.city}<br />{a.country}{a.phone ? <><br />{a.phone}</> : null}</p>
                  <div className="acct__actions">
                    <button type="button" onClick={() => { setNotice(null); setEdit(a); }}>Modifier</button>
                    {!a.isDefault && <button type="button" onClick={() => persist(list.map((x) => ({ ...x, isDefault: x.id === a.id })), "Adresse par défaut mise à jour.")}>Définir par défaut</button>}
                    <button type="button" onClick={() => remove(a.id)} disabled={busy}>Supprimer</button>
                  </div>
                </li>
              ))}
            </ul>
          )}
          <button type="button" className="acct__btn" data-primary="true" onClick={() => { setNotice(null); setEdit({ ...EMPTY }); }}>Ajouter une adresse</button>
        </>
      )}

      {edit && (
        <form className="acct__card acct__form" onSubmit={submit}>
          <h2 className="acct__h2">{edit.id ? "Modifier l'adresse" : "Nouvelle adresse"}</h2>
          <label className="auth__field"><span>Nom de l'adresse (Maison, Bureau…)</span><input value={edit.label ?? ""} onChange={(e) => set("label", e.target.value)} /></label>
          <div className="acct__row">
            <label className="auth__field"><span>*Prénom</span><input value={edit.firstName} onChange={(e) => set("firstName", e.target.value)} autoComplete="given-name" required /></label>
            <label className="auth__field"><span>*Nom</span><input value={edit.lastName} onChange={(e) => set("lastName", e.target.value)} autoComplete="family-name" required /></label>
          </div>
          <label className="auth__field"><span>*Adresse</span><input value={edit.line1} onChange={(e) => set("line1", e.target.value)} autoComplete="address-line1" required /></label>
          <label className="auth__field"><span>Complément d'adresse</span><input value={edit.line2 ?? ""} onChange={(e) => set("line2", e.target.value)} autoComplete="address-line2" /></label>
          <div className="acct__row">
            <label className="auth__field"><span>*Code postal</span><input value={edit.zip} onChange={(e) => set("zip", e.target.value)} autoComplete="postal-code" inputMode="numeric" required /></label>
            <label className="auth__field"><span>*Ville</span><input value={edit.city} onChange={(e) => set("city", e.target.value)} autoComplete="address-level2" required /></label>
          </div>
          <div className="acct__row">
            <label className="auth__field"><span>*Pays</span>
              <select value={edit.country} onChange={(e) => set("country", e.target.value)}>{COUNTRIES.map((c) => <option key={c}>{c}</option>)}</select>
            </label>
            <label className="auth__field"><span>Téléphone</span><input type="tel" value={edit.phone ?? ""} onChange={(e) => set("phone", e.target.value)} autoComplete="tel" inputMode="tel" /></label>
          </div>
          <label className="acct__check"><input type="checkbox" checked={!!edit.isDefault} onChange={(e) => set("isDefault", e.target.checked)} /><span>Utiliser comme adresse par défaut</span></label>
          {notice && <p className="auth__msg" data-kind={notice.kind} role="status">{notice.text}</p>}
          <div className="acct__actions acct__actions--form">
            <button type="button" className="acct__btn" onClick={() => setEdit(null)}>Annuler</button>
            <button type="submit" className="acct__btn" data-primary="true" disabled={!valid || busy}>{busy ? "Enregistrement…" : "Enregistrer"}</button>
          </div>
        </form>
      )}
    </div>
  );
}
