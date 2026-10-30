"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/** Inscription à la newsletter : l'adresse est enregistrée dans Supabase (table newsletter_subscribers, via la fonction newsletter_subscribe) et consultable dans /admin/newsletter. */
export function Newsletter() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "error" | "busy" | "fail" | "done">("idle");
  const supabase = useMemo(() => createClient(), []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (state === "busy") return;
    if (!EMAIL.test(email.trim())) { setState("error"); return; }
    if (!supabase) { setState("fail"); return; }
    setState("busy");
    const { error } = await supabase.rpc("newsletter_subscribe", { p_email: email.trim(), p_source: "footer" });
    setState(error ? (error.code === "22023" ? "error" : "fail") : "done");
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
            <button type="submit" className="nl__submit" disabled={state === "busy"}>{state === "busy" ? "Envoi…" : "Confirmer"}</button>
          </div>
          {state === "error" && <p className="nl__error" role="alert">Saisissez une adresse e-mail valide.</p>}
          {state === "fail" && <p className="nl__error" role="alert">L'inscription a échoué. Réessayez dans un instant.</p>}
          <p className="nl__legal">En vous inscrivant, vous acceptez de recevoir nos e-mails. Désinscription possible à tout moment.</p>
        </>
      )}
    </form>
  );
}
