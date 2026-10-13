"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export type Notice = { kind: "ok" | "error"; text: string } | null;

/** Enregistre des champs dans les métadonnées du compte Supabase. */
export function useSaveMeta() {
  const supabase = useMemo(() => createClient(), []);
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const save = async (data: Record<string, unknown>, okText = "Modifications enregistrées.") => {
    setBusy(true);
    setNotice(null);
    const { error } = await supabase.auth.updateUser({ data });
    setBusy(false);
    if (error) { setNotice({ kind: "error", text: "Impossible d'enregistrer pour le moment. Réessayez dans un instant." }); return false; }
    setNotice({ kind: "ok", text: okText });
    router.refresh();
    return true;
  };
  return { supabase, busy, notice, setNotice, save };
}
