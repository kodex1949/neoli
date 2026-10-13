import { NextResponse } from "next/server";

// Route de diagnostic désactivée : ce fichier peut être supprimé.
export async function GET() {
  return NextResponse.json({ error: "not found" }, { status: 404 });
}
