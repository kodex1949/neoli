import type { Metadata } from "next";
import Link from "next/link";
import { OrderCard } from "@/components/account/OrderCard";
import { requireUser } from "@/lib/account";
import { getOrdersByEmail } from "@/lib/shopify-admin";

export const metadata: Metadata = { title: "Mes commandes — ESSNC" };

export default async function OrdersPage() {
  const { user } = await requireUser("/compte/commandes");
  // Seule une adresse e-mail confirmée peut consulter des commandes
  const verified = Boolean(user.email && user.email_confirmed_at);
  const { orders, error, detail, denied } = verified && user.email ? await getOrdersByEmail(user.email) : { orders: [], error: undefined, detail: undefined, denied: false };

  return (
    <>
      <header className="acct__head">
        <h1 className="acct__title">Mes commandes</h1>
        <p className="acct__lead">Le suivi de vos achats, vos factures et vos rachats en un clic.</p>
      </header>

      {!verified ? (
        <div className="acct__empty"><h2>Confirmez votre e-mail</h2><p>Confirmez votre adresse e-mail pour retrouver ici vos commandes.</p></div>
      ) : error ? (
        <div className="acct__empty">
          <h2>Vos commandes arrivent bientôt</h2>
          <p>{error === "not_configured" ? "La connexion avec la boutique n'est pas encore activée." : "Impossible de charger vos commandes pour le moment. Réessayez dans un instant."}</p>
          {error === "failed" && detail && <p><code>{detail}</code></p>}
          {error === "not_configured" && process.env.NODE_ENV !== "production" && (
            <p><code>SHOPIFY_ADMIN_CLIENT_ID</code> et <code>SHOPIFY_ADMIN_CLIENT_SECRET</code> manquants dans <code>.env.local</code>.</p>
          )}
        </div>
      ) : orders.length === 0 ? (
        <div className="acct__empty">
          <h2>Vous n'avez pas encore de commande</h2>
          <p>Dès votre première commande avec {user.email}, vous la retrouverez ici avec son suivi de livraison.</p>
          <Link href="/" className="acct__btn" data-primary="true">Découvrir la boutique</Link>
        </div>
      ) : (
        <div className="acct__stack">
          {denied && process.env.NODE_ENV !== "production" && <p className="acct__note">Mode développement : le droit <code>read_products</code> n'est pas actif sur l'accès Shopify, le bouton « Racheter » est masqué.</p>}
          {orders.map((o) => <OrderCard key={o.id} order={o} />)}
        </div>
      )}
    </>
  );
}
