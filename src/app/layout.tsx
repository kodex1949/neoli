import type { Metadata } from "next";
import "@fontsource-variable/figtree";
import "@fontsource-variable/newsreader";
import "./globals.css";
import { AnnouncementBar } from "@/components/AnnouncementBar";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartHeader } from "@/components/CartHeader";
import { ChromeGate } from "@/components/ChromeGate";
import { CartToast } from "@/components/CartToast";
import { CartProvider } from "@/lib/cart";
import { ReferralCapture } from "@/components/ReferralCapture";
import { FavoritesProvider } from "@/lib/favorites";

export const metadata: Metadata = {
  title: "Néoli — Beauté, parfums & soins",
  description: "Boutique headless Shopify + Supabase.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr">
      <body>
        <FavoritesProvider>
        <CartProvider>
          {/* Sur /panier : en-tête réduit (Retour + logo), sans barre d'annonce ni pied de page, comme chez Dior */}
          <ChromeGate hideOn={["/panier"]} minimal={<CartHeader />}>
            <AnnouncementBar />
            <Header />
          </ChromeGate>
          <CartToast />
          <ReferralCapture />
          <main>{children}</main>
          <ChromeGate hideOn={["/panier"]}>
            <Footer />
          </ChromeGate>
        </CartProvider>
        </FavoritesProvider>
      </body>
    </html>
  );
}
