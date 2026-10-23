"use client";

import { useState } from "react";

export function ReferralShare({ code }: { code: string }) {
  const [copied, setCopied] = useState<"" | "code" | "link">("");
  const link = () => `${window.location.origin}/connexion?mode=inscription&parrain=${code}`;
  const copy = async (what: "code" | "link") => {
    try { await navigator.clipboard.writeText(what === "code" ? code : link()); setCopied(what); setTimeout(() => setCopied(""), 2000); } catch {}
  };
  const share = async () => {
    const data = { title: "ESSNC", text: `Rejoignez le Cercle ESSNC avec mon code ${code}`, url: link() };
    if (navigator.share) { try { await navigator.share(data); return; } catch { return; } }
    copy("link");
  };
  return (
    <div className="ref">
      <div className="ref__code" aria-label="Votre code de parrainage">{code}</div>
      <div className="ref__actions">
        <button type="button" className="acct__btn" data-primary="true" onClick={share}>Partager mon lien</button>
        <button type="button" className="acct__btn" onClick={() => copy("code")}>{copied === "code" ? "Code copié" : "Copier le code"}</button>
        <button type="button" className="acct__btn" onClick={() => copy("link")}>{copied === "link" ? "Lien copié" : "Copier le lien"}</button>
      </div>
    </div>
  );
}
