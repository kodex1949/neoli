"use client";

import { useEffect } from "react";
import { createClient } from "@/lib/supabase/client";

const KEY = "maison_ref";

/** Mémorise ?parrain=CODE puis rattache le compte au parrain dès qu'on est connecté. */
export function ReferralCapture() {
  useEffect(() => {
    try {
      const c = new URL(window.location.href).searchParams.get("parrain");
      if (c && /^[A-Z0-9-]{4,20}$/i.test(c)) localStorage.setItem(KEY, c.toUpperCase());
    } catch {}
    const supabase = createClient();
    const claim = async () => {
      let code: string | null = null;
      try { code = localStorage.getItem(KEY); } catch {}
      if (!code) return;
      const { data } = await supabase.auth.getUser();
      if (!data.user) return;
      await supabase.from("referral_claims").insert({ code, email: (data.user.email ?? "").toLowerCase() });
      try { localStorage.removeItem(KEY); } catch {}
    };
    claim();
    const { data: sub } = supabase.auth.onAuthStateChange((e) => { if (e === "SIGNED_IN") claim(); });
    return () => sub.subscription.unsubscribe();
  }, []);
  return null;
}
