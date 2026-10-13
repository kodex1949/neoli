"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/** Masque l'en-tête / le pied de page habituels sur certaines pages (ex. le panier, comme chez Dior). */
export function ChromeGate({ hideOn, minimal, children }: { hideOn: string[]; minimal?: ReactNode; children?: ReactNode }) {
  const path = usePathname();
  const hidden = hideOn.some((p) => path === p || path.startsWith(`${p}/`));
  return <>{hidden ? minimal ?? null : children}</>;
}
