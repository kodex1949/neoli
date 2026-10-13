import type { Metadata } from "next";
import { ProfileForm } from "@/components/account/ProfileForm";
import { requireUser } from "@/lib/account";

export const metadata: Metadata = { title: "Mes informations — Néoli" };

export default async function InfoPage() {
  const { user, profile } = await requireUser("/compte/informations");
  return (
    <>
      <header className="acct__head">
        <h1 className="acct__title">Mes informations</h1>
        <p className="acct__lead">Ces informations servent à personnaliser votre expérience et à préparer vos commandes.</p>
      </header>
      <ProfileForm email={user.email ?? ""} profile={profile} />
    </>
  );
}
