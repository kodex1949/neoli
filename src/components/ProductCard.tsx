import Image from "next/image";
import Link from "next/link";
import type { Product } from "@/lib/shopify";
import { AutoVideo } from "./AutoVideo";
import { FavoriteButton } from "./FavoriteButton";
import { AddToCart } from "./AddToCart";
import { unitPrice } from "@/lib/unit-price";

export function ProductCard({ product }: { product: Product }) {
  const unit = unitPrice(product);
  return (
    <div className="card">
      <div className="card__frame">
        <Link href={`/produits/${product.handle}`} className="card__media" aria-label={product.title} tabIndex={-1}>
          {product.featuredVideo ? (
            <AutoVideo video={product.featuredVideo} />
          ) : product.image ? (
            <Image
              src={product.image.url}
              alt={product.image.alt}
              width={product.image.width}
              height={product.image.height}
              sizes="(max-width: 1024px) 50vw, 25vw"
            />
          ) : (
            <div className="card__placeholder" />
          )}
        </Link>
        {product.badges && product.badges.length > 0 && (
          <p className="card__badges">
            {product.badges.map((b) => <span key={b}>{b}</span>)}
          </p>
        )}
        <FavoriteButton handle={product.handle} title={product.title} className="fav--card" />
        <AddToCart product={product} />
      </div>
      <div className="card__meta">
        <div className="card__row">
          <h3 className="card__title"><Link href={`/produits/${product.handle}`}>{product.title}</Link></h3>
          <p className="card__price">{product.price}</p>
        </div>
        {product.tagline && <p className="card__tagline">{product.tagline}</p>}
        {product.intensity ? (
          <p className="card__intensity" aria-label={`Intensité ${product.intensity} sur 5`}>
            Intensité
            <span aria-hidden="true">
              {[1, 2, 3, 4, 5].map((n) => <i key={n} data-on={n <= product.intensity!} />)}
            </span>
          </p>
        ) : (
          <p className="card__intensity" aria-hidden="true" />
        )}
        <div className="card__foot">
          <ul className="card__opts" aria-label="Déclinaisons">
            {product.variants?.map((v) =>
              v.color ? (
                <li key={v.label} className="card__swatch" title={v.label} style={{ background: v.color }}><span>{v.label}</span></li>
              ) : (
                <li key={v.label} className="card__size">{v.label}</li>
              ),
            )}
          </ul>
          {unit && <p className="card__unit">{unit}</p>}
        </div>
      </div>
    </div>
  );
}
