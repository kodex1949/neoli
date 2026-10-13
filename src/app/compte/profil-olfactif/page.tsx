import type { Metadata } from "next";
import { ForYou } from "@/components/ForYou";
import { ScentForm } from "@/components/account/ScentForm";
import { requireUser } from "@/lib/account";
import { isScent } from "@/lib/scent";
import { getProducts } from "@/lib/shopify";

export const metadata: Metadata = { title: "Profil olfactif — Néoli" };

export default async function ScentPage() {
  const { profile } = await requireUser("/compte/profil-olfactif");
  const scent = isScent(profile.scent) ? profile.scent : undefined;
  const products = scent ? await getProducts(40) : [];
  return (
    <>
      <header className="acct__head">
        <p className="acct__eyebrow">Pour vous</p>
        <h1 className="acct__title">Profil olfactif</h1>
        <p className="acct__lead">Dites-nous ce que vous aimez : nous vous proposons les parfums qui vous ressemblent.</p>
      </header>
      <ScentForm initial={scent} />
      {scent && (
        <section className="acct__stack">
          <h2 className="acct__h2">Sélectionnés pour vous</h2>
          <ForYou products={products} scent={scent} limit={4} />
        </section>
      )}
    </>
  );
}
