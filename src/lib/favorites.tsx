"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Ctx = { has: (handle: string) => boolean; toggle: (handle: string) => Promise<void>; count: number };
const FavCtx = createContext<Ctx>({ has: () => false, toggle: async () => {}, count: 0 });
export const useFavorites = () => useContext(FavCtx);

const configured = Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

/** Favoris du client connecté (table Supabase « favorites », protégée par RLS). Déconnecté : le cœur renvoie vers la connexion. */
export function FavoritesProvider({ children }: { children: React.ReactNode }) {
  const supabase = useMemo(() => (configured ? createClient() : null), []);
  const router = useRouter();
  const pathname = usePathname();
  const [set, setSet] = useState<Set<string>>(new Set());
  const userId = useRef<string | null>(null);

  const load = useCallback(async () => {
    if (!supabase) return;
    const { data: u } = await supabase.auth.getUser();
    userId.current = u.user?.id ?? null;
    if (!u.user) { setSet(new Set()); return; }
    const { data } = await supabase.from("favorites").select("handle");
    setSet(new Set((data ?? []).map((r: { handle: string }) => r.handle)));
  }, [supabase]);

  useEffect(() => {
    load();
    if (!supabase) return;
    const { data } = supabase.auth.onAuthStateChange(() => { load(); });
    return () => data.subscription.unsubscribe();
  }, [supabase, load]);

  const toggle = useCallback(async (handle: string) => {
    if (!supabase) return;
    if (!userId.current) { router.push(`/connexion?next=${encodeURIComponent(pathname)}`); return; }
    const on = set.has(handle);
    setSet((s) => { const n = new Set(s); if (on) n.delete(handle); else n.add(handle); return n; }); // optimiste
    const { error } = on
      ? await supabase.from("favorites").delete().eq("handle", handle)
      : await supabase.from("favorites").insert({ handle });
    if (error) load(); // en cas d'échec : retour à l'état réel
    else router.refresh();
  }, [supabase, set, router, pathname, load]);

  const value = useMemo<Ctx>(() => ({ has: (h) => set.has(h), toggle, count: set.size }), [set, toggle]);
  return <FavCtx.Provider value={value}>{children}</FavCtx.Provider>;
}
