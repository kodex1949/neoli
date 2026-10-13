import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Retour du lien magique / de la connexion Apple, Google, Facebook : échange le code contre une session.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  // Redirection interne uniquement (évite les redirections ouvertes)
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (code) {
    const supabase = await createClient();
    await supabase.auth.exchangeCodeForSession(code);
  }
  return NextResponse.redirect(`${origin}${safeNext}`);
}
