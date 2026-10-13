import type { SupabaseClient } from "@supabase/supabase-js";
import { getOrdersByEmail, type Order } from "@/lib/shopify-admin";

export const SPONSOR_BONUS = 50; // points pour le parrain, par ami
export const FRIEND_BONUS = 25; // points de bienvenue pour l'ami parrainé

/**
 * Points de parrainage. Le bonus n'est versé qu'après une première commande payée :
 * - parrain : 50 points par ami ayant commandé ;
 * - ami : 25 points de bienvenue une fois sa première commande payée.
 */
export async function referralBonus(supabase: SupabaseClient, userId: string, ownOrders: Order[]) {
  const { data } = await supabase.from("referral_claims").select("user_id, email");
  const rows = data ?? [];
  const mine = rows.find((r) => r.user_id === userId);
  const friendsRows = rows.filter((r) => r.user_id !== userId);
  const paid = (os: Order[]) => os.some((o) => o.payment === "Payée");
  const flags = await Promise.all(friendsRows.map(async (r) => (r.email ? paid((await getOrdersByEmail(r.email)).orders) : false)));
  const ordered = flags.filter(Boolean).length;
  const welcomed = !!mine && paid(ownOrders);
  return {
    joined: friendsRows.length,
    friends: ordered,
    pending: friendsRows.length - ordered,
    welcomed,
    welcomePending: !!mine && !welcomed,
    points: ordered * SPONSOR_BONUS + (welcomed ? FRIEND_BONUS : 0),
  };
}

export type Tier = { key: string; name: string; from: number; perks: string[] };

export const TIERS: Tier[] = [
  { key: "membre", name: "Membre", from: 0, perks: ["1 point par euro dépensé", "Échantillons offerts avec chaque commande", "Un cadeau pour votre anniversaire"] },
  { key: "argent", name: "Argent", from: 300, perks: ["Livraison offerte sans minimum d'achat", "Miniature offerte à chaque commande", "Accès anticipé aux nouveautés"] },
  { key: "or", name: "Or", from: 800, perks: ["Coffret découverte offert chaque année", "Invitations aux ventes privées", "Service client prioritaire"] },
];

export function loyalty(orders: Order[], bonus = 0) {
  const purchases = Math.floor(orders.filter((o) => o.payment === "Payée").reduce((n, o) => n + o.amount, 0));
  const points = purchases + bonus;
  let i = 0;
  TIERS.forEach((t, k) => { if (points >= t.from) i = k; });
  const next = TIERS[i + 1];
  return {
    points,
    purchases,
    bonus,
    tier: TIERS[i],
    next,
    missing: next ? next.from - points : 0,
    progress: next ? Math.min(1, (points - TIERS[i].from) / (next.from - TIERS[i].from)) : 1,
  };
}
