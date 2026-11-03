import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";

// Réception des événements d'audience (voir src/lib/track.ts). Réponse toujours 204 : la mesure ne doit jamais gêner le visiteur.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TYPES = new Set(["pageview", "add_to_cart", "begin_checkout"]);
const BOT = /bot|crawl|spider|slurp|preview|lighthouse|headless|monitor|facebookexternalhit|vercel-screenshot|curl|wget/i;
const str = (v: unknown, max: number) => (typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max) : "");
const done = () => new NextResponse(null, { status: 204 });

export async function POST(req: NextRequest) {
  try {
    if (BOT.test(req.headers.get("user-agent") ?? "")) return done();
    const origin = req.headers.get("origin");
    if (origin) { try { if (new URL(origin).host !== req.nextUrl.host) return done(); } catch { return done(); } }

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const service = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !service) return done();

    const b = JSON.parse((await req.text()).slice(0, 2000)) as Record<string, unknown>;
    const type = str(b.t, 20);
    const sid = str(b.s, 40);
    let path = str(b.p, 200).split("?")[0].split("#")[0];
    if (!TYPES.has(type) || !/^[a-z0-9-]{8,40}$/i.test(sid) || !path.startsWith("/") || path.startsWith("/admin") || path.startsWith("/api")) return done();
    if (path.length > 1) path = path.replace(/\/+$/, "");

    const handle = /^\/produits\/([a-z0-9-]{1,100})$/i.exec(path)?.[1] ?? (/^[a-z0-9-]{1,100}$/i.test(str(b.h, 100)) ? str(b.h, 100) : null);
    const v = typeof b.v === "number" && Number.isFinite(b.v) && b.v >= 0 && b.v < 100000 ? Math.round(b.v * 100) / 100 : null;

    const db = createClient(url, service, { auth: { persistSession: false } });
    await db.from("analytics_events").insert({
      sid, type, path, ref: str(b.ref, 100) || null, src: str(b.src, 60).toLowerCase() || null, med: str(b.med, 60).toLowerCase() || null, v, handle,
    });
  } catch { /* ignoré */ }
  return done();
}
