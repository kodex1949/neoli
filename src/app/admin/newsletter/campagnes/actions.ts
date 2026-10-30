"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { cleanHtml, safeLink, type NlBlock } from "@/lib/newsletter-html";

async function admin() {
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  const { data: ok } = await db.rpc("is_agent_admin");
  if (!u.user || ok !== true) throw new Error("Accès réservé aux administrateurs.");
  return db;
}
const uuid = /^[0-9a-f-]{36}$/i;
const MEDIA = "/storage/v1/object/public/menu-media/";
const s = (v: unknown, n: number) => String(v ?? "").slice(0, n);

export async function createCampaign() {
  const db = await admin();
  const blocks: NlBlock[] = [
    { id: crypto.randomUUID(), type: "title", text: "Le titre de votre newsletter" },
    { id: crypto.randomUUID(), type: "text", text: "Écrivez ici votre message." },
    { id: crypto.randomUUID(), type: "button", label: "Découvrir", href: "/" },
  ];
  const { data, error } = await db.from("newsletter_campaigns").insert({ blocks }).select("id").single();
  if (error || !data) throw new Error(error?.message ?? "Création impossible.");
  revalidatePath("/admin/newsletter/campagnes");
  redirect(`/admin/newsletter/campagnes/${data.id}`);
}

export async function saveCampaign(id: string, v: { subject: string; preheader: string; status: "draft" | "ready"; blocks: NlBlock[]; customHtml: string | null; images: string[] }) {
  if (!uuid.test(id)) throw new Error("Identifiant invalide.");
  if (!Array.isArray(v.blocks) || v.blocks.length > 40) throw new Error("Trop de blocs (40 maximum).");
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  const blocks: NlBlock[] = v.blocks.map((b) => {
    const bid = s(b.id, 40) || crypto.randomUUID();
    switch (b.type) {
      case "title": return { id: bid, type: "title", text: s(b.text, 200) };
      case "text": return { id: bid, type: "text", text: s(b.text, 3000) };
      case "image": {
        const url = s(b.url, 500);
        if (url && !url.startsWith(`${base}${MEDIA}`)) throw new Error("Image invalide.");
        const href = s(b.href, 300);
        if (href && !safeLink(href)) throw new Error("Lien d'image invalide (https:// ou /chemin).");
        return { id: bid, type: "image", url, alt: s(b.alt, 160), href };
      }
      case "button": {
        const href = s(b.href, 300);
        if (href && !safeLink(href)) throw new Error("Lien du bouton invalide (https:// ou /chemin).");
        return { id: bid, type: "button", label: s(b.label, 60), href };
      }
      case "divider": return { id: bid, type: "divider" };
      default: throw new Error("Bloc inconnu.");
    }
  });
  const images = (Array.isArray(v.images) ? v.images : []).slice(0, 100).map((u) => s(u, 500)).filter((u) => u.startsWith(`${base}${MEDIA}`));
  const custom_html = v.customHtml == null ? null : cleanHtml(s(v.customHtml, 300000));
  const db = await admin();
  const { error } = await db.from("newsletter_campaigns").update({ custom_html, images, subject: s(v.subject, 150).trim() || "Sans objet", preheader: s(v.preheader, 200), status: v.status === "ready" ? "ready" : "draft", blocks, updated_at: new Date().toISOString() }).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/newsletter/campagnes");
}

export async function deleteCampaign(id: string) {
  if (!uuid.test(id)) throw new Error("Identifiant invalide.");
  const db = await admin();
  const { error } = await db.from("newsletter_campaigns").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/newsletter/campagnes");
  redirect("/admin/newsletter/campagnes");
}
