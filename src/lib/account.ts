import { redirect } from "next/navigation";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";

export type Address = {
  id: string;
  label?: string;
  firstName: string;
  lastName: string;
  line1: string;
  line2?: string;
  zip: string;
  city: string;
  country: string;
  phone?: string;
  isDefault?: boolean;
};

export type Profile = {
  civility?: "" | "Mme" | "M.";
  first_name?: string;
  last_name?: string;
  phone?: string;
  birthday?: string;
  newsletter?: boolean;
  addresses?: Address[];
  scent?: { families: string[]; intensity: number; budget: string };
};

/** Utilisateur connecté (sinon redirection vers /connexion). Le profil est stocké dans les métadonnées Supabase. */
export async function requireUser(next = "/compte"): Promise<{ user: User; profile: Profile }> {
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) redirect("/connexion");
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect(`/connexion?next=${encodeURIComponent(next)}`);
  return { user: data.user, profile: (data.user.user_metadata ?? {}) as Profile };
}
