import type { Metadata } from "next";
import { AddressBook } from "@/components/account/AddressBook";
import { requireUser } from "@/lib/account";

export const metadata: Metadata = { title: "Mes adresses — Néoli" };

export default async function AddressesPage() {
  const { profile } = await requireUser("/compte/adresses");
  return (
    <>
      <header className="acct__head">
        <h1 className="acct__title">Mes adresses</h1>
        <p className="acct__lead">Vos adresses de livraison et de facturation.</p>
      </header>
      <AddressBook initial={profile.addresses ?? []} />
    </>
  );
}
