import type { Metadata } from "next";
import { SecurityPanel } from "@/components/account/SecurityPanel";
import { requireUser } from "@/lib/account";

export const metadata: Metadata = { title: "Connexion et sécurité — ESSNC" };

export default async function SecurityPage() {
  const { user } = await requireUser("/compte/securite");
  return (
    <>
      <header className="acct__head">
        <h1 className="acct__title">Connexion et sécurité</h1>
        <p className="acct__lead">{user.email}</p>
      </header>
      <SecurityPanel />
    </>
  );
}
