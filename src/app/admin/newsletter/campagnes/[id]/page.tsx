import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NewsletterComposer } from "@/components/NewsletterComposer";
import type { NlBlock } from "@/lib/newsletter-html";

export const metadata: Metadata = { title: "Éditeur de newsletter — ESSNC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function Edit({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  if (!u.user) redirect(`/admin/login?next=/admin/newsletter/campagnes/${id}`);
  const { data: ok } = await db.rpc("is_agent_admin");
  if (ok !== true) redirect("/admin");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const { data } = await db.from("newsletter_campaigns").select("id,subject,preheader,status,blocks,custom_html,images").eq("id", id).maybeSingle();
  if (!data) notFound();
  return <NewsletterComposer id={data.id} initial={{ subject: data.subject, preheader: data.preheader ?? "", status: data.status as "draft" | "ready", blocks: (data.blocks ?? []) as NlBlock[], customHtml: data.custom_html ?? null, images: (data.images ?? []) as string[] }} />;
}
