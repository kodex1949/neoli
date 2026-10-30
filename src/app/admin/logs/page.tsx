import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminHead, AdminStats } from "@/components/AdminHead";

export const metadata: Metadata = { title: "Journal — ESSNC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const PAGE = 50;
const PERIODS = { "24h": 24, "7j": 24 * 7, "30j": 24 * 30 } as const;
type Period = keyof typeof PERIODS;
type SP = { vue?: string; agent?: string; statut?: string; periode?: string; q?: string; p?: string };

const stamp = (d: string) => new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date(d));
const dur = (a: string, b?: string | null) => (b ? `${Math.max(0, (new Date(b).getTime() - new Date(a).getTime()) / 1000).toFixed(1).replace(".", ",")} s` : "—");
const okStatus = (s: string) => s === "ok" || s === "success";

export default async function LogsPage({ searchParams }: { searchParams: Promise<SP> }) {
  const sp = await searchParams;
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  if (!u.user) redirect("/admin/login?next=/admin/logs");
  const { data: isAdmin } = await db.rpc("is_agent_admin");
  if (isAdmin !== true) {
    return (
      <div className="adm"><h1 className="acct__title">Journal</h1>
        <div className="acct__empty"><h2>Accès réservé</h2><p>Ce compte n'est pas administrateur.</p></div></div>
    );
  }

  const vue = sp.vue === "executions" ? "executions" : "actions";
  const periode: Period = sp.periode && sp.periode in PERIODS ? (sp.periode as Period) : "24h";
  const statut = sp.statut === "erreurs" ? "erreurs" : sp.statut === "ok" ? "ok" : "tous";
  const agent = sp.agent && /^[a-z0-9_-]{1,60}$/i.test(sp.agent) ? sp.agent : "";
  const q = (sp.q ?? "").replace(/[%,()]/g, " ").trim().slice(0, 80);
  const page = Math.max(1, Number.parseInt(sp.p ?? "1", 10) || 1);
  const since = new Date(Date.now() - PERIODS[periode] * 3600 * 1000).toISOString();

  const [agents, kpiAll, kpiErr, kpiRuns, kpiRunErr] = await Promise.all([
    db.from("agents").select("id,name").order("name"),
    db.from("agent_audit_log").select("id", { count: "exact", head: true }).gte("at", since),
    db.from("agent_audit_log").select("id", { count: "exact", head: true }).gte("at", since).not("error", "is", null),
    db.from("agent_runs").select("id", { count: "exact", head: true }).gte("started_at", since),
    db.from("agent_runs").select("id", { count: "exact", head: true }).gte("started_at", since).not("status", "in", "(ok,success,running)"),
  ]);

  const from = (page - 1) * PAGE;
  let rows: Record<string, unknown>[] = [];
  let total = 0;
  if (vue === "actions") {
    let qb = db.from("agent_audit_log").select("id,at,agent_id,trigger,action,mode,result,error,approval_status,data_used", { count: "exact" }).gte("at", since).order("at", { ascending: false }).range(from, from + PAGE - 1);
    if (agent) qb = qb.eq("agent_id", agent);
    if (statut === "erreurs") qb = qb.not("error", "is", null);
    if (statut === "ok") qb = qb.is("error", null);
    if (q) qb = qb.or(`action.ilike.%${q}%,result.ilike.%${q}%,error.ilike.%${q}%`);
    const r = await qb;
    rows = r.data ?? [];
    total = r.count ?? 0;
  } else {
    let qb = db.from("agent_runs").select("id,agent_id,trigger,status,error,started_at,finished_at,tokens_in,tokens_out,cost_cents,output", { count: "exact" }).gte("started_at", since).order("started_at", { ascending: false }).range(from, from + PAGE - 1);
    if (agent) qb = qb.eq("agent_id", agent);
    if (statut === "erreurs") qb = qb.not("status", "in", "(ok,success,running)");
    if (statut === "ok") qb = qb.in("status", ["ok", "success"]);
    if (q) qb = qb.or(`error.ilike.%${q}%,trigger.ilike.%${q}%`);
    const r = await qb;
    rows = r.data ?? [];
    total = r.count ?? 0;
  }
  const pages = Math.max(1, Math.ceil(total / PAGE));

  const href = (over: Partial<SP>) => {
    const m = { vue, agent, statut: statut === "tous" ? "" : statut, periode, q, p: "", ...over } as Record<string, string>;
    const qs = Object.entries(m).filter(([k, v]) => v && !(k === "vue" && v === "actions") && !(k === "periode" && v === "24h")).map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&");
    return `/admin/logs${qs ? `?${qs}` : ""}`;
  };

  return (
    <div className="admh">
      <AdminHead eyebrow="Journal" title="Logs de la boutique" lead="Tout ce que font les agents : actions décidées, exécutions planifiées, erreurs. Filtrez par agent, période ou statut." />

      <AdminStats items={[
        { label: `Actions · ${periode}`, value: kpiAll.count ?? 0 },
        { label: "Actions en erreur", value: kpiErr.count ?? 0, hot: (kpiErr.count ?? 0) > 0 },
        { label: `Exécutions · ${periode}`, value: kpiRuns.count ?? 0 },
        { label: "Exécutions en erreur", value: kpiRunErr.count ?? 0, hot: (kpiRunErr.count ?? 0) > 0 },
      ]} />

      <section className="admh__panel">
        <div className="logs__bar">
          <nav className="logs__tabs" aria-label="Vue">
            <Link href={href({ vue: "actions" })} data-on={vue === "actions"}>Actions</Link>
            <Link href={href({ vue: "executions" })} data-on={vue === "executions"}>Exécutions</Link>
          </nav>
          <nav className="logs__seg" aria-label="Période">
            {(Object.keys(PERIODS) as Period[]).map((k) => <Link key={k} href={href({ periode: k })} data-on={periode === k}>{k}</Link>)}
          </nav>
          <nav className="logs__seg" aria-label="Statut">
            {([["tous", "Tous"], ["erreurs", "Erreurs"], ["ok", "Réussis"]] as const).map(([k, l]) => <Link key={k} href={href({ statut: k === "tous" ? "" : k })} data-on={statut === k}>{l}</Link>)}
          </nav>
          <form className="logs__form" action="/admin/logs" method="get">
            {vue !== "actions" && <input type="hidden" name="vue" value={vue} />}
            {periode !== "24h" && <input type="hidden" name="periode" value={periode} />}
            {statut !== "tous" && <input type="hidden" name="statut" value={statut} />}
            <select name="agent" defaultValue={agent} aria-label="Agent">
              <option value="">Tous les agents</option>
              {(agents.data ?? []).map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
            <input type="search" name="q" defaultValue={q} placeholder="Rechercher" aria-label="Rechercher" />
            <button type="submit">Filtrer</button>
          </form>
        </div>

        {rows.length === 0 && <p className="admh__empty">Aucune ligne pour ces filtres.</p>}
        <ul className="logs__list">
          {rows.map((r) => {
            const isErr = vue === "actions" ? Boolean(r.error) : !okStatus(String(r.status)) && r.status !== "running";
            const at = String(vue === "actions" ? r.at : r.started_at);
            const detail = vue === "actions" ? r.data_used : r.output;
            return (
              <li key={String(r.id)} data-err={isErr}>
                <details>
                  <summary>
                    <span className="logs__lvl" data-err={isErr}>{isErr ? "Erreur" : vue === "actions" ? "Action" : String(r.status)}</span>
                    <time>{stamp(at)}</time>
                    <span className="logs__agent">{String(r.agent_id)}</span>
                    <span className="logs__msg">
                      {vue === "actions"
                        ? <><b>{String(r.action)}</b>{r.result ? <> — {String(r.result).slice(0, 140)}</> : null}{r.error ? <em> · {String(r.error).slice(0, 140)}</em> : null}</>
                        : <><b>{String(r.trigger)}</b>{r.error ? <em> · {String(r.error).slice(0, 160)}</em> : <> — {dur(at, r.finished_at as string | null)}</>}</>}
                    </span>
                    <span className="logs__meta">{vue === "actions" ? [r.mode, r.approval_status].filter(Boolean).join(" · ") : `${Number(r.tokens_in ?? 0) + Number(r.tokens_out ?? 0)} jetons`}</span>
                  </summary>
                  <div className="logs__detail">
                    {r.error ? <p><strong>Erreur</strong> {String(r.error)}</p> : null}
                    {vue === "actions" && r.result ? <p><strong>Résultat</strong> {String(r.result)}</p> : null}
                    {detail ? <pre>{JSON.stringify(detail, null, 2).slice(0, 4000)}</pre> : <p className="logs__none">Pas de données associées.</p>}
                  </div>
                </details>
              </li>
            );
          })}
        </ul>

        <div className="logs__pager">
          <span>{total} ligne{total > 1 ? "s" : ""} · page {Math.min(page, pages)} / {pages}</span>
          <div>
            {page > 1 && <Link href={href({ p: String(page - 1) })}>← Précédent</Link>}
            {page < pages && <Link href={href({ p: String(page + 1) })}>Suivant →</Link>}
          </div>
        </div>
      </section>
    </div>
  );
}
