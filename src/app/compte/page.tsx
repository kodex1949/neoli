import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/account";
import { ForYou } from "@/components/ForYou";
import { isScent } from "@/lib/scent";
import { getProducts } from "@/lib/shopify";
import { loyalty, referralBonus } from "@/lib/loyalty";
import { createClient } from "@/lib/supabase/server";
import { getOrdersByEmail } from "@/lib/shopify-admin";

export const metadata: Metadata = { title: "Mon compte — ESSNC" };

const fmt = (d?: string) => (d ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(d)) : "—");

export default async function AccountPage() {
  const { user, profile } = await requireUser();
  const addresses = profile.addresses ?? [];
  const { orders } = user.email && user.email_confirmed_at ? await getOrdersByEmail(user.email) : { orders: [] };
  const scent = isScent(profile.scent) ? profile.scent : undefined;
  const picks = scent ? await getProducts(40) : [];
  const L = loyalty(orders, (await referralBonus(await createClient(), user.id, orders)).points);
  const missing = [!profile.first_name && "prénom", !profile.last_name && "nom", !profile.phone && "téléphone"].filter(Boolean) as string[];
  const cards = [
    { href: "/compte/informations", t: "Mes informations", d: "Civilité, nom, téléphone, date de naissance et préférences de communication." },
    { href: "/compte/commandes", t: "Mes commandes", d: orders.length ? `${orders.length} commande${orders.length > 1 ? "s" : ""} : suivi, factures et rachat en un clic.` : "Suivez vos achats, retrouvez vos factures et rachetez en un clic." },
    { href: "/compte/avantages", t: "Mes avantages", d: L.next ? `Plus que ${L.missing} points pour le palier ${L.next.name}.` : "Vous avez atteint le palier le plus élevé." },
    { href: "/compte/parrainage", t: "Parrainage", d: "Votre code personnel à partager avec vos proches." },
    { href: "/compte/profil-olfactif", t: "Profil olfactif", d: scent ? "Vos préférences olfactives : modifiez-les à tout moment." : "Dites-nous ce que vous aimez pour recevoir des parfums à votre image." },
    { href: "/compte/favoris", t: "Mes favoris", d: "Les parfums et soins que vous avez mis de côté." },
    { href: "/compte/adresses", t: "Mes adresses", d: addresses.length ? `${addresses.length} adresse${addresses.length > 1 ? "s" : ""} enregistrée${addresses.length > 1 ? "s" : ""}.` : "Enregistrez vos adresses de livraison pour commander plus vite." },
    { href: "/compte/securite", t: "Connexion et sécurité", d: "Mot de passe, déconnexion de tous vos appareils." },
  ];
  return (
    <>
      <header className="acct__head">
        <p className="acct__eyebrow">Mon espace</p>
        <h1 className="acct__title">Bonjour{profile.first_name ? ` ${profile.first_name}` : ""}</h1>
        <p className="acct__lead">Retrouvez ici vos informations, vos commandes et vos adresses.</p>
      </header>

      <div className="acct__tier">
        <div>
          <p className="acct__eyebrow">Cercle ESSNC</p>
          <p className="acct__tier-name">{L.tier.name}</p>
        </div>
        <dl>
          <div><dt>Points</dt><dd>{L.points}</dd></div>
          <div><dt>Membre depuis</dt><dd>{fmt(user.created_at)}</dd></div>
          <div><dt>Dernière connexion</dt><dd>{fmt(user.last_sign_in_at)}</dd></div>
          <div><dt>Commandes</dt><dd>{orders.length}</dd></div>
        </dl>
      </div>

      {missing.length > 0 && (
        <Link href="/compte/informations" className="acct__nudge">
          <strong>Complétez votre profil</strong>
          <span>Il manque : {missing.join(", ")}. Pour des livraisons et un service plus personnalisés.</span>
        </Link>
      )}

      {scent && (
        <section className="acct__stack">
          <h2 className="acct__h2">Sélectionnés pour vous</h2>
          <ForYou products={picks} scent={scent} limit={3} />
        </section>
      )}

      <div className="acct__grid">
        {cards.map((c) => (
          <Link key={c.href} href={c.href} className="acct__card">
            <h2>{c.t}</h2>
            <p>{c.d}</p>
            <span aria-hidden="true">→</span>
          </Link>
        ))}
      </div>
    </>
  );
}
