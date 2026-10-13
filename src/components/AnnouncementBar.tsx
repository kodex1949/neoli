import Link from "next/link";

export function AnnouncementBar() {
  return (
    <div className="promo">
      <p style={{ margin: 0 }}>
        ÉDITION LIMITÉE : pour les fêtes, découvrez la nouvelle collection.{" "}
        <Link href="/collections/fetes">Découvrir.</Link>
      </p>
    </div>
  );
}
