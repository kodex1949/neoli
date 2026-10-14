"use client";

import { usePathname } from "next/navigation";
import { CartHeader } from "./CartHeader";

/** En-tête réduit : celui du panier sur /panier, rien sur /admin (qui a son propre cadre). */
export function ChromeMinimal() {
  return usePathname().startsWith("/admin") ? null : <CartHeader />;
}
