import type { Metadata } from "next";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Désinscription — ESSNC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const uuid = /^[0-9a-f-]{36}$/i;

/** Lien de désinscription des e-mails (?t=jeton personnel de l'inscrit). */
export default async function Unsubscribe({ searchParams }: { searchParams: Promise<{ t?: string }> }) {
  const t = (await searchParams).t ?? "";
  let state: "ok" | "unknown" | "invalid" = "invalid";
  if (uuid.test(t)) {
    const db = await createClient();
    const { data } = await db.rpc("newsletter_unsubscribe", { p_token: t });
    state = data === true ? "ok" : "unknown";
  }
  return (
    <main className="nlu">
      <h1>{state === "ok" ? "Vous êtes désinscrit(e)" : "Lien de désinscription"}</h1>
      <p>
        {state === "ok" && "Vous ne recevrez plus nos e-mails. Vous pouvez vous réinscrire à tout moment depuis le pied de page du site."}
        {state === "unknown" && "Cette adresse est déjà désinscrite, ou le lien n'est plus valable."}
        {state === "invalid" && "Ce lien n'est pas valable. Utilisez le lien présent en bas de l'e-mail que vous avez reçu."}
      </p>
      <Link href="/">Retour au site</Link>
    </main>
  );
}
