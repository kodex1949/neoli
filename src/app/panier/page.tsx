import type { Metadata } from "next";
import { getProducts } from "@/lib/shopify";
import { CartView } from "@/components/CartView";

export const metadata: Metadata = { title: "Votre panier — Néoli" };
export const revalidate = 60;

export default async function CartPage() {
  const suggestions = await getProducts(6);
  return <CartView suggestions={suggestions} />;
}
