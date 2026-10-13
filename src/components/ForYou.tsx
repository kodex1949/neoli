import { ProductCard } from "@/components/ProductCard";
import type { Product } from "@/lib/shopify";
import { recommend, type Scent } from "@/lib/scent";

export function ForYou({ products, scent, limit = 4 }: { products: Product[]; scent: Scent; limit?: number }) {
  const picks = recommend(products, scent, limit);
  if (!picks.length) return <p className="acct__note">Aucun produit ne correspond encore à votre profil. Essayez d'ajouter une famille olfactive.</p>;
  return (
    <div className="acct__favs foryou">
      {picks.map(({ product, why }) => (
        <div key={product.id} className="foryou__item">
          <ProductCard product={product} />
          {why.length > 0 && <p className="foryou__why">Pour vous : {why.slice(0, 2).join(" · ")}</p>}
        </div>
      ))}
    </div>
  );
}
