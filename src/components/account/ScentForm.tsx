"use client";

import { useState } from "react";
import { BUDGETS, FAMILIES, INTENSITY, type Scent } from "@/lib/scent";
import { useSaveMeta } from "./useSaveMeta";

export function ScentForm({ initial }: { initial?: Scent }) {
  const { busy, notice, setNotice, save } = useSaveMeta();
  const [families, setFamilies] = useState<string[]>(initial?.families ?? []);
  const [intensity, setIntensity] = useState(initial?.intensity ?? 3);
  const [budget, setBudget] = useState(initial?.budget ?? "any");
  const toggle = (k: string) => setFamilies((f) => (f.includes(k) ? f.filter((x) => x !== k) : [...f, k]));

  return (
    <form className="acct__card acct__form" onSubmit={(e) => { e.preventDefault(); if (!busy && families.length) save({ scent: { families, intensity, budget } }, "Votre profil olfactif est enregistré."); }}>
      <fieldset className="scent__group">
        <legend>Vos familles olfactives <em>(plusieurs choix possibles)</em></legend>
        <div className="scent__chips">
          {FAMILIES.map((f) => (
            <button type="button" key={f.key} className="scent__chip" aria-pressed={families.includes(f.key)} onClick={() => { setNotice(null); toggle(f.key); }}>
              <strong>{f.label}</strong><span>{f.hint}</span>
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="scent__group">
        <legend>Intensité souhaitée : <strong>{INTENSITY[intensity - 1]}</strong></legend>
        <div className="scent__scale" role="radiogroup" aria-label="Intensité">
          {[1, 2, 3, 4, 5].map((n) => (
            <button type="button" key={n} role="radio" aria-checked={intensity === n} aria-label={INTENSITY[n - 1]} data-on={n <= intensity} onClick={() => { setNotice(null); setIntensity(n); }} />
          ))}
        </div>
      </fieldset>

      <fieldset className="acct__radios">
        <legend>Budget par flacon</legend>
        {BUDGETS.map((b) => (
          <label key={b.key}><input type="radio" name="budget" checked={budget === b.key} onChange={() => { setNotice(null); setBudget(b.key); }} />{b.label}</label>
        ))}
      </fieldset>

      {notice && <p className="auth__msg" data-kind={notice.kind} role="status">{notice.text}</p>}
      <button type="submit" className="auth__submit" data-ready={families.length > 0} disabled={busy || !families.length}>{busy ? "Enregistrement…" : "Enregistrer mon profil"}</button>
    </form>
  );
}
