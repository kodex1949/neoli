import type { Metadata } from "next";
import { ReferralShare } from "@/components/account/ReferralShare";
import { FRIEND_BONUS, referralBonus, SPONSOR_BONUS } from "@/lib/loyalty";
import { requireUser } from "@/lib/account";
import { getOrdersByEmail } from "@/lib/shopify-admin";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Parrainage — ESSNC" };

const ALPHA = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const rand = (n: number) => Array.from({ length: n }, () => ALPHA[Math.floor(Math.random() * ALPHA.length)]).join("");

export default async function ReferralPage() {
  const { user, profile } = await requireUser("/compte/parrainage");
  const supabase = await createClient();

  let { data: row } = await supabase.from("referral_codes").select("code").eq("user_id", user.id).maybeSingle();
  if (!row) {
    const base = (profile.first_name ?? "").normalize("NFD").replace(/[^A-Za-z]/g, "").toUpperCase().slice(0, 4) || "MAIS";
    for (let i = 0; i < 5 && !row; i++) {
      const { data } = await supabase.from("referral_codes").insert({ user_id: user.id, code: `${base}-${rand(4)}` }).select("code").maybeSingle();
      row = data;
    }
  }
  const code = row?.code;
  const { orders } = user.email && user.email_confirmed_at ? await getOrdersByEmail(user.email) : { orders: [] };
  const R = await referralBonus(supabase, user.id, orders);

  return (
    <>
      <header className="acct__head">
        <p className="acct__eyebrow">Cercle ESSNC</p>
        <h1 className="acct__title">Parrainage</h1>
        <p className="acct__lead">Partagez votre code personnel : vous gagnez {SPONSOR_BONUS} points dès la première commande d'un ami, et il reçoit {FRIEND_BONUS} points de bienvenue.</p>
      </header>

      {code ? (
        <section className="acct__card ref__card">
          <h2>Votre code personnel</h2>
          <ReferralShare code={code} />
        </section>
      ) : (
        <div className="acct__empty"><h2>Code indisponible</h2><p>Réessayez dans un instant.</p></div>
      )}

      <div className="acct__grid">
        <div className="acct__card"><h2>Amis parrainés</h2><p className="ref__n">{R.joined}</p><p>{R.friends} ont commandé · {R.pending} en attente · {R.friends * SPONSOR_BONUS} points gagnés</p>{R.welcomePending && <p>Vos {FRIEND_BONUS} points de bienvenue arriveront après votre première commande.</p>}</div>
        <div className="acct__card">
          <h2>Comment ça marche</h2>
          <p>1. Envoyez votre lien ou votre code.<br />2. Votre ami crée son compte ESSNC.<br />3. Après sa première commande payée, vous gagnez {SPONSOR_BONUS} points, lui {FRIEND_BONUS}.</p>
        </div>
      </div>
    </>
  );
}
