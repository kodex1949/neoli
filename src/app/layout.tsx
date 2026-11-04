import type { Metadata } from "next";
import "@fontsource-variable/figtree";
import "@fontsource-variable/newsreader";
import "./globals.css";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { ChromeMinimal } from "@/components/ChromeMinimal";
import { ChromeGate } from "@/components/ChromeGate";
import { CartToast } from "@/components/CartToast";
import { CartProvider } from "@/lib/cart";
import { ReferralCapture } from "@/components/ReferralCapture";
import { FavoritesProvider } from "@/lib/favorites";
import { getMenuMedia } from "@/lib/menu-media";
import { getBrands } from "@/lib/shopify";
import { Analytics } from "@vercel/analytics/next";
import { Tracker } from "@/components/Tracker";

export const metadata: Metadata = {
  title: "ESSNC — Beauté, parfums & soins",
  description: "Boutique headless Shopify + Supabase.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [menuMedia, brands] = await Promise.all([getMenuMedia(), getBrands().catch(() => [])]);
  return (
    <html lang="fr">
      <body>
        <FavoritesProvider>
        <CartProvider>
          {/* Sur /panier : en-tête réduit (Retour + logo), sans barre d'annonce ni pied de page, comme chez Dior */}
          <ChromeGate hideOn={["/panier", "/admin"]} minimal={<ChromeMinimal />}>
            <AnnouncementBar />
            <Header menuMedia={menuMedia} brands={brands} />
          </ChromeGate>
          <CartToast />
          <ReferralCapture />
          <Tracker />
          <main>{children}</main>
          <ChromeGate hideOn={["/panier", "/admin"]}>
            <Footer />
          </ChromeGate>
        </CartProvider>
        </FavoritesProvider>
        <Analytics />
      </body>
    </html>
  );
}
