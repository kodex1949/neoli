import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { adminConfigured, adminGraphQL } from "@/lib/shopify-admin";
import { getProducts } from "@/lib/shopify";
import { envReport } from "@/lib/agents/sources";
import { AdminHead } from "@/components/AdminHead";
import "./connexions.css";

export const metadata: Metadata = { title: "Connexions — ESSNC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

type State = "ok" | "warn" | "bad" | "off";
type Check = { group: string; name: string; state: State; note: string; ms?: number; fix?: string; href?: string };

const timed = async <T,>(fn: () => Promise<T>): Promise<{ v?: T; ms: number; err?: string }> => {
  const t = Date.now();
  try { return { v: await Promise.race([fn(), new Promise<T>((_, rej) => setTimeout(() => rej(new Error("délai dépassé (8 s)")), 8000))]), ms: Date.now() - t }; }
  catch (e) { return { ms: Date.now() - t, err: e instanceof Error ? e.message : String(e) }; }
};
const ago = (d?: string | null) => {
  if (!d) return "jamais";
  const m = Math.round((Date.now() - new Date(d).getTime()) / 60000);
  if (m < 1) return "à l'instant";
  if (m < 60) return `il y a ${m} min`;
  const h = Math.round(m / 60);
  return h < 48 ? `il y a ${h} h` : `il y a ${Math.round(h / 24)} j`;
};

const NEEDED = ["read_orders", "read_products", "read_inventory"];

export default async function ConnexionsPage() {
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  if (!u.user) redirect("/admin/login?next=/admin/connexions");
  const { data: isAdmin } = await db.rpc("is_agent_admin");
  if (isAdmin !== true) {
    return (
      <div className="adm"><h1 className="acct__title">Connexions</h1>
        <div className="acct__empty"><h2>Accès réservé</h2><p>Ce compte n'est pas administrateur.</p></div></div>
    );
  }

  const env = envReport();
  const domain = process.env.SHOPIFY_STORE_DOMAIN ?? "";
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  const [sf, shop, sb, lastCron, lastEvent, runs] = await Promise.all([
    timed(() => getProducts(1)),
    adminConfigured ? timed(() => adminGraphQL<{ shop: { name: string; myshopifyDomain: string }; currentAppInstallation: { accessScopes: { handle: string }[] } }>(`query { shop { name myshopifyDomain } currentAppInstallation { accessScopes { handle } } }`)) : Promise.resolve(null),
    url && anon ? timed(() => fetch(`${url}/auth/v1/health`, { headers: { apikey: anon }, cache: "no-store" })) : Promise.resolve(null),
    db.from("agent_runs").select("started_at,status").eq("trigger", "scheduled").order("started_at", { ascending: false }).limit(1),
    db.from("analytics_events").select("at").order("at", { ascending: false }).limit(1),
    db.from("agent_runs").select("agent_id,status").gte("started_at", new Date(Date.now() - 24 * 3600 * 1000).toISOString()).limit(1500),
  ]);

  const checks: Check[] = [];

  // --- Shopify ---
  checks.push(sf.err || !sf.v?.length
    ? { group: "Shopify", name: "API Storefront (catalogue)", state: "bad", note: sf.err ?? "aucun produit renvoyé", ms: sf.ms, fix: "Vérifiez SHOPIFY_STORE_DOMAIN et SHOPIFY_STOREFRONT_TOKEN." }
    : { group: "Shopify", name: "API Storefront (catalogue)", state: "ok", note: "catalogue lisible", ms: sf.ms });

  if (!adminConfigured) {
    checks.push({ group: "Shopify", name: "API Admin (commandes, stocks)", state: "off", note: "non configurée", fix: "Ajoutez SHOPIFY_ADMIN_CLIENT_ID et SHOPIFY_ADMIN_CLIENT_SECRET (ou SHOPIFY_ADMIN_TOKEN)." });
  } else if (!shop || shop.err || !shop.v?.data?.shop) {
    const err = shop?.err ?? shop?.v?.errors?.[0]?.message ?? "réponse vide";
    checks.push({ group: "Shopify", name: "API Admin (commandes, stocks)", state: "bad", note: err.slice(0, 200), ms: shop?.ms, fix: /app_not_installed/.test(err) ? "L'application n'est pas installée sur cette boutique (Dev Dashboard, Installer)." : "Vérifiez le domaine, l'identifiant et le secret de l'application." });
  } else {
    const d = shop.v.data;
    const scopes = d.currentAppInstallation.accessScopes.map((s) => s.handle);
    const missing = NEEDED.filter((s) => !scopes.includes(s));
    const writes = scopes.filter((s) => s.startsWith("write_"));
    checks.push({ group: "Shopify", name: "API Admin (commandes, stocks)", state: missing.length ? "warn" : "ok", note: `boutique « ${d.shop.name} » (${d.shop.myshopifyDomain})${missing.length ? ` · droits manquants : ${missing.join(", ")}` : ""}`, ms: shop.ms, fix: missing.length ? "Ajoutez ces droits à l'application, publiez une version, puis réinstallez-la." : undefined });
    checks.push({ group: "Shopify", name: "Droits de l'application", state: writes.length ? "warn" : "ok", note: writes.length ? `${scopes.length} droits dont ${writes.length} d'écriture (${writes.slice(0, 4).join(", ")}${writes.length > 4 ? "…" : ""})` : `${scopes.length} droits, tous en lecture`, fix: writes.length ? "Cet admin est en lecture seule : retirez les droits write_* (et read_customers si inutile) dans une nouvelle version de l'application." : undefined });
    if (domain && d.shop.myshopifyDomain && domain.toLowerCase() !== d.shop.myshopifyDomain.toLowerCase()) checks.push({ group: "Shopify", name: "Domaine configuré", state: "warn", note: `SHOPIFY_STORE_DOMAIN = ${domain}, boutique réelle = ${d.shop.myshopifyDomain}`, fix: "Alignez la variable sur l'adresse .myshopify.com réelle." });
  }

  // --- Supabase ---
  checks.push(!url || !anon
    ? { group: "Supabase", name: "Authentification", state: "bad", note: "variables absentes", fix: "NEXT_PUBLIC_SUPABASE_URL et NEXT_PUBLIC_SUPABASE_ANON_KEY." }
    : { group: "Supabase", name: "Authentification", state: sb?.err || !(sb?.v as Response | undefined)?.ok ? "bad" : "ok", note: sb?.err ?? `HTTP ${(sb?.v as Response | undefined)?.status}`, ms: sb?.ms });
  checks.push({ group: "Supabase", name: "Clé service (planificateur, mesure d'audience)", state: env.SUPABASE_SERVICE_ROLE_KEY ? "ok" : "bad", note: env.SUPABASE_SERVICE_ROLE_KEY ? "présente" : "absente de l'environnement chargé", fix: env.SUPABASE_SERVICE_ROLE_KEY ? undefined : "Ajoutez SUPABASE_SERVICE_ROLE_KEY dans Vercel (et .env.local en local). Sans elle, ni le planificateur ni la mesure d'audience ne fonctionnent." });

  // --- Agents ---
  const cron = lastCron.data?.[0] as { started_at: string; status: string } | undefined;
  const cronAge = cron ? (Date.now() - new Date(cron.started_at).getTime()) / 60000 : Infinity;
  checks.push({ group: "Agents", name: "Planificateur horaire", state: cronAge < 130 ? "ok" : cronAge < 360 ? "warn" : "bad", note: cron ? `dernier passage ${ago(cron.started_at)}` : "aucun passage planifié enregistré", fix: cronAge < 130 ? undefined : "Le cron Supabase « agents-hourly » doit appeler /api/agents/cron toutes les heures." });
  const byAgent = new Map<string, { ok: number; bad: number }>();
  for (const r of runs.data ?? []) { const a = byAgent.get(r.agent_id) ?? { ok: 0, bad: 0 }; if (r.status === "ok" || r.status === "success") a.ok++; else if (r.status !== "running") a.bad++; byAgent.set(r.agent_id, a); }
  const failing = [...byAgent.entries()].filter(([, v]) => v.bad > 0 && v.ok === 0).map(([id]) => id);
  checks.push({ group: "Agents", name: "Exécutions des agents (24 h)", state: failing.length ? "warn" : byAgent.size ? "ok" : "off", note: failing.length ? `en erreur : ${failing.join(", ")}` : byAgent.size ? `${byAgent.size} agents actifs sans erreur persistante` : "aucune exécution", fix: failing.length ? "Les agents Shopify Admin échouent tant que l'API Admin n'est pas accessible." : undefined, href: "/admin/logs" });

  // --- Mesure d'audience ---
  const ev = lastEvent.data?.[0] as { at: string } | undefined;
  checks.push({ group: "Mesure", name: "Mesure d'audience maison", state: ev ? "ok" : "warn", note: ev ? `dernier événement ${ago(ev.at)}` : "aucun événement reçu", fix: ev ? undefined : "Normal avant le déploiement de cette version. Sinon, vérifiez SUPABASE_SERVICE_ROLE_KEY et que le site en ligne contient /api/track." });
  checks.push({ group: "Mesure", name: "Clé IA (Anthropic)", state: env.ANTHROPIC_API_KEY ? "ok" : "off", note: env.ANTHROPIC_API_KEY ? "présente" : "absente : les agents restent déterministes, sans appel IA", fix: undefined });

  const order: Record<State, number> = { bad: 0, warn: 1, off: 2, ok: 3 };
  const okN = checks.filter((c) => c.state === "ok").length;
  const badN = checks.filter((c) => c.state === "bad").length;
  const warnN = checks.filter((c) => c.state === "warn").length;
  const groups = [...new Set(checks.map((c) => c.group))];
  const LABEL: Record<State, string> = { ok: "Connecté", warn: "À surveiller", bad: "En panne", off: "Non configuré" };

  return (
    <div className="admh cnx">
      <AdminHead eyebrow="Intelligence" title="Connexions" lead="L'état réel de chaque service branché au site, vérifié à l'ouverture de la page. Aucun secret n'est affiché : seulement les noms des variables à renseigner." />

      <section className="cnx__kpis" aria-label="Résumé">
        <div className="cnx__kpi"><span>Connectés</span><strong>{okN}</strong><em>sur {checks.length} vérifications</em></div>
        <div className="cnx__kpi" data-hot={badN > 0 ? "true" : undefined}><span>En panne</span><strong>{badN}</strong><em>à corriger</em></div>
        <div className="cnx__kpi" data-warn={warnN > 0 ? "true" : undefined}><span>À surveiller</span><strong>{warnN}</strong><em>fonctionne, mais à revoir</em></div>
        <div className="cnx__kpi"><span>Latence Shopify</span><strong>{sf.ms} ms</strong><em>API Storefront</em></div>
      </section>

      {groups.map((g) => (
        <section key={g} className="cnx__group">
          <h2>{g}</h2>
          <ul className="cnx__list">
            {checks.filter((c) => c.group === g).sort((a, b) => order[a.state] - order[b.state]).map((c) => (
              <li key={c.name} className="cnx__item" data-s={c.state}>
                <i className="cnx__dot" data-s={c.state} aria-hidden="true" />
                <div>
                  <p className="cnx__name"><b>{c.name}</b><span className="cnx__tag" data-s={c.state}>{LABEL[c.state]}</span>{c.ms !== undefined && <small>{c.ms} ms</small>}</p>
                  <p className="cnx__note">{c.note}</p>
                  {c.fix && <p className="cnx__fix">À faire : {c.fix}</p>}
                  {c.href && <Link href={c.href} className="cnx__link">Voir le journal</Link>}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <p className="cnx__foot">Les variables d'environnement lues ici sont celles du serveur qui affiche cette page : en local, le fichier .env.local ; en ligne, les réglages Vercel. Un changement n'est pris en compte qu'après redémarrage ou redéploiement.</p>
    </div>
  );
}
