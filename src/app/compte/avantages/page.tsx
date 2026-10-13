import type { Metadata } from "next";
import Link from "next/link";
import { requireUser } from "@/lib/account";
import { createClient } from "@/lib/supabase/server";
import { loyalty, referralBonus, TIERS } from "@/lib/loyalty";
import { getOrdersByEmail } from "@/lib/shopify-admin";

export const metadata: Metadata = { title: "Mes avantages — Néoli" };

export default async function PerksPage() {
  const { user, profile } = await requireUser("/compte/avantages");
  const { orders } = user.email && user.email_confirmed_at ? await getOrdersByEmail(user.email) : { orders: [] };
  const ref = await referralBonus(await createClient(), user.id, orders);
  const L = loyalty(orders, ref.points);
  const birthday = profile.birthday
    ? new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long" }).format(new Date(profile.birthday))
    : null;
  return (
    <>
      <header className="acct__head">
        <p className="acct__eyebrow">Cercle Néoli</p>
        <h1 className="acct__title">Mes avantages</h1>
        <p className="acct__lead">Chaque achat vous rapproche du palier suivant et de nouveaux privilèges.</p>
      </header>

      <section className="acct__tier loy__hero" aria-label="Votre palier">
        <div>
          <p className="acct__eyebrow">Votre palier</p>
          <p className="acct__tier-name">{L.tier.name}</p>
        </div>
        <dl>
          <div><dt>Points</dt><dd>{L.points}</dd></div>
          <div><dt>Commandes</dt><dd>{orders.length}</dd></div>
        </dl>
        <p className="loy__msg">{L.purchases} points d'achats{ref.points > 0 ? <> + <strong>{ref.points} points de parrainage</strong></> : null}</p>
        <div className="loy__bar" role="progressbar" aria-valuenow={Math.round(L.progress * 100)} aria-valuemin={0} aria-valuemax={100}>
          <i style={{ width: `${L.progress * 100}%` }} />
        </div>
        <p className="loy__msg">
          {L.next ? <>Plus que <strong>{L.missing} points</strong> pour atteindre le palier {L.next.name}.</> : "Vous avez atteint le palier le plus élevé. Merci de votre fidélité."}
        </p>
      </section>

      <div className="acct__grid loy__tiers">
        {TIERS.map((t) => {
          const state = t.key === L.tier.key ? "current" : L.points >= t.from ? "done" : "todo";
          return (
            <article key={t.key} className="acct__card loy__tier" data-state={state}>
              <p className="acct__eyebrow">{t.from === 0 ? "Dès l'inscription" : `À partir de ${t.from} points`}</p>
              <h2>{t.name}</h2>
              <ul>{t.perks.map((p) => <li key={p}>{p}</li>)}</ul>
              {state === "current" && <span className="acct__tag">Votre palier</span>}
            </article>
          );
        })}
      </div>

      <div className="acct__card">
        <h2>Cadeau d'anniversaire</h2>
        {birthday ? (
          <p>Votre anniversaire est le {birthday} : un cadeau vous attend ce mois-là.</p>
        ) : (
          <p>Renseignez votre date de naissance pour recevoir un cadeau chaque année.</p>
        )}
        {!birthday && <Link href="/compte/informations" className="acct__btn">Compléter mon profil</Link>}
      </div>
    </>
  );
}
