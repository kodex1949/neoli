"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";

/** Compte les pages vues (hors administration). Origine de la visite relevée une seule fois par session. */
export function Tracker() {
  const path = usePathname();
  useEffect(() => {
    if (!path || path.startsWith("/admin")) return;
    let first = false;
    try { first = !sessionStorage.getItem("essnc-src"); sessionStorage.setItem("essnc-src", "1"); } catch { /* ignoré */ }
    if (!first) { track("pageview", { path }); return; }
    const q = new URLSearchParams(window.location.search);
    let ref = "";
    try { const h = new URL(document.referrer).hostname; if (h && h !== window.location.hostname) ref = h.replace(/^www\./, ""); } catch { /* pas de referrer */ }
    track("pageview", { path, ref, src: q.get("utm_source") ?? undefined, med: q.get("utm_medium") ?? undefined });
  }, [path]);
  return null;
}
