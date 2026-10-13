"use client";

import { useState } from "react";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Inscription à la newsletter. Pour l'instant l'adresse n'est envoyée nulle part : branchez Shopify (customerCreate) ou votre outil d'e-mailing dans `submit`. */
export function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "error" | "done">("idle");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!EMAIL.test(email.trim())) { setState("error"); return; }
    setState("done");
  };

  return (
    <form className="nl" onSubmit={submit} noValidate>
      <h2 className="nl__title">Inscrivez-vous pour bénéficier de toutes les exclusivités</h2>
      {state === "done" ? (
        <p className="nl__done" role="status">
          <svg viewBox="0 0 16 16" aria-hidden="true"><path d="m3 8.5 3.2 3.2L13 4.8" /></svg>
          Merci, vous êtes inscrit(e). À très bientôt dans votre boîte mail.
        </p>
      ) : (
        <>
          <div className="nl__row">
            <label className="nl__field" data-error={state === "error"}>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); if (state === "error") setState("idle"); }}
                placeholder="Renseignez un e-mail"
                autoComplete="email"
                inputMode="email"
                aria-label="Adresse e-mail"
                aria-invalid={state === "error"}
              />
            </label>
            <button type="submit" className="nl__submit">Confirmer</button>
          </div>
          {state === "error" && <p className="nl__error" role="alert">Saisissez une adresse e-mail valide.</p>}
        </>
      )}
    </form>
  );
}
