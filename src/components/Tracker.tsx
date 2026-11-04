"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";
import { createClient } from "@/lib/supabase/client";

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
  // Connexions et inscriptions : un simple comptage par session de navigation, sans identifiant, e-mail ni compte associé.
  useEffect(() => {
    let sub: { unsubscribe: () => void } | undefined;
    try {
      const { data } = createClient().auth.onAuthStateChange((event, session) => {
        if (event !== "SIGNED_IN" || !session?.user) return;
        try {
          if (sessionStorage.getItem("essnc-login")) return;
          sessionStorage.setItem("essnc-login", "1");
        } catch { return; }
        const created = Date.parse(session.user.created_at ?? "");
        const fresh = Number.isFinite(created) && Date.now() - created < 2 * 60_000;
        track(fresh ? "signup" : "login", { path: window.location.pathname.startsWith("/admin") ? "/" : window.location.pathname });
      });
      sub = data.subscription;
    } catch { /* la mesure ne doit jamais gêner */ }
    return () => sub?.unsubscribe();
  }, []);
  return null;
}
