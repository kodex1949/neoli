import type { Metadata } from "next";
import Link from "next/link";
import { ProductCard } from "@/components/ProductCard";
import { requireUser } from "@/lib/account";
import { getProduct, type Product } from "@/lib/shopify";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "Mes favoris — Néoli" };

export default async function FavoritesPage() {
  await requireUser("/compte/favoris");
  const supabase = await createClient();
  const { data } = await supabase.from("favorites").select("handle").order("created_at", { ascending: false });
  const products = (await Promise.all((data ?? []).map((r) => getProduct(r.handle)))).filter((p): p is Product => !!p);
  return (
    <>
      <header className="acct__head">
        <h1 className="acct__title">Mes favoris</h1>
        <p className="acct__lead">Les produits que vous avez mis de côté.</p>
      </header>
      {products.length === 0 ? (
        <div className="acct__empty">
          <h2>Aucun favori pour l'instant</h2>
          <p>Touchez le cœur sur un produit pour le retrouver ici.</p>
          <Link href="/" className="acct__btn" data-primary="true">Découvrir la boutique</Link>
        </div>
      ) : (
        <div className="acct__favs">
          {products.map((p) => <ProductCard key={p.id} product={p} />)}
        </div>
      )}
    </>
  );
}
