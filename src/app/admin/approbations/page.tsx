import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AdminHead } from "@/components/AdminHead";
import { decideGroup, dismissInfo } from "./actions";
import { groupKey } from "./group";
import "./approbations.css";

export const metadata: Metadata = { title: "Approbations — ESSNC", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const SEV = { critical: "Critique", warning: "Attention", info: "Info" } as const;
const RANK = { critical: 0, warning: 1, info: 2 } as const;
const STATUS: Record<string, string> = { approved: "Validé", rejected: "Rejeté", dismissed: "Écarté", applied: "Appliqué" };
type Sev = keyof typeof SEV;
type Rec = { id: string; agent_id: string; severity: Sev; title: string; detail: string | null; proposed_action: { type?: string; params?: Record<string, unknown> } | null; dedupe_key: string | null; status: string; created_at: string; decided_at: string | null; decided_by: string | null };

const when = (d?: string | null) => (d ? new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d)) : "—");
const day = (d: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "short" }).format(new Date(d));

export default async function ApprovalsPage({ searchParams }: { searchParams: Promise<{ vue?: string; gravite?: string; agent?: string }> }) {
  const sp = await searchParams;
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  if (!u.user) redirect("/admin/login?next=/admin/approbations");
  const { data: isAdmin } = await db.rpc("is_agent_admin");
  if (isAdmin !== true) {
    return (
      <div className="adm"><h1 className="acct__title">Approbations</h1>
        <div className="acct__empty"><h2>Accès réservé</h2><p>Ce compte n'est pas administrateur.</p></div></div>
    );
  }

  const vue = sp.vue === "decisions" ? "decisions" : "a-traiter";
  const gravite = sp.gravite && sp.gravite in SEV ? (sp.gravite as Sev) : null;
  const agentF = sp.agent && /^[a-z0-9_-]{1,60}$/i.test(sp.agent) ? sp.agent : null;

  const [openQ, doneQ] = await Promise.all([
    db.from("agent_recommendations").select("id,agent_id,severity,title,detail,proposed_action,dedupe_key,status,created_at,decided_at,decided_by").eq("status", "open").order("created_at", { ascending: false }).limit(1000),
    db.from("agent_recommendations").select("id,agent_id,severity,title,detail,proposed_action,dedupe_key,status,created_at,decided_at,decided_by").neq("status", "open").order("decided_at", { ascending: false, nullsFirst: false }).limit(60),
  ]);
  const open = (openQ.data ?? []) as Rec[];
  const done = (doneQ.data ?? []) as Rec[];

  // Regroupement : un constat qui revient chaque jour n'apparaît qu'une fois
  type Group = { key: string; latest: Rec; n: number; first: string; sev: Sev };
  const map = new Map<string, Group>();
  for (const r of open) {
    const key = groupKey(r.dedupe_key, r.id);
    const g = map.get(key);
    if (!g) map.set(key, { key, latest: r, n: 1, first: r.created_at, sev: r.severity });
    else { g.n++; if (r.created_at < g.first) g.first = r.created_at; }
  }
  const all = [...map.values()].sort((a, b) => RANK[a.sev] - RANK[b.sev] || b.n - a.n);
  const agents = [...new Set(all.map((g) => g.latest.agent_id))].sort();
  const groups = all.filter((g) => (!gravite || g.sev === gravite) && (!agentF || g.latest.agent_id === agentF));
  const count = (s: Sev) => all.filter((g) => g.sev === s).length;
  const infoPlain = open.filter((r) => r.severity === "info" && !r.proposed_action).length;
  const stale = all.filter((g) => Date.now() - new Date(g.first).getTime() > 7 * 86_400_000).length;

  const href = (p: Record<string, string | null | undefined>) => {
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(p)) if (v) q.set(k, v);
    const s = q.toString();
    return `/admin/approbations${s ? `?${s}` : ""}`;
  };

  return (
    <div className="admh apv">
      <AdminHead eyebrow="Intelligence" title="Approbations" lead="Les constats des agents, regroupés quand ils reviennent. Valider ou rejeter enregistre votre décision et la trace dans le journal ; rien n'est appliqué automatiquement à la boutique." />

      <section className="apv__kpis" aria-label="Chiffres clés">
        <div className="apv__kpi"><span>À traiter</span><strong>{all.length}</strong><em>constats distincts · {open.length} occurrences</em></div>
        <div className="apv__kpi" data-hot={count("critical") > 0 ? "true" : undefined}><span>Critiques</span><strong>{count("critical")}</strong><em>{count("warning")} attention · {count("info")} infos</em></div>
        <div className="apv__kpi" data-hot={stale > 0 ? "true" : undefined}><span>En attente depuis 7 j</span><strong>{stale}</strong><em>à décider ou écarter</em></div>
        <div className="apv__kpi"><span>Décisions</span><strong>{done.length}</strong><em>les 60 dernières</em></div>
      </section>

      <div className="apv__bar">
        <nav className="apv__tabs" aria-label="Vue">
          <Link href={href({ gravite, agent: agentF })} data-active={vue === "a-traiter"}>À traiter</Link>
          <Link href={href({ vue: "decisions" })} data-active={vue === "decisions"}>Décisions</Link>
        </nav>
        {vue === "a-traiter" && (
          <div className="apv__filters">
            {(Object.keys(SEV) as Sev[]).map((s) => <Link key={s} href={href({ gravite: gravite === s ? null : s, agent: agentF })} data-active={gravite === s}>{SEV[s]}</Link>)}
            {agents.length > 1 && agents.map((a) => <Link key={a} href={href({ gravite, agent: agentF === a ? null : a })} data-active={agentF === a} className="apv__agent">{a}</Link>)}
          </div>
        )}
      </div>

      {vue === "a-traiter" ? (
        <>
          {infoPlain > 0 && (
            <form action={dismissInfo} className="apv__bulk">
              <span>{infoPlain} information{infoPlain > 1 ? "s" : ""} sans action proposée.</span>
              <button type="submit">Tout écarter</button>
            </form>
          )}
          {groups.length === 0 ? <p className="apv__empty">Rien à traiter avec ces filtres.</p> : (
            <ul className="apv__list">
              {groups.map((g) => {
                const r = g.latest;
                return (
                  <li key={g.key} className="apv__card" data-sev={g.sev}>
                    <div className="apv__head">
                      <i className="apv__chip" data-sev={g.sev}>{SEV[g.sev]}</i>
                      <b>{r.title}</b>
                    </div>
                    <p className="apv__meta">{r.agent_id} · {g.n > 1 ? `vu ${g.n} fois depuis le ${day(g.first)}` : `détecté le ${when(r.created_at)}`}</p>
                    {r.detail && <p className="apv__detail">{r.detail}</p>}
                    {r.proposed_action?.type && (
                      <details className="apv__action">
                        <summary>Action proposée : <code>{r.proposed_action.type}</code> · non appliquée</summary>
                        <pre>{JSON.stringify(r.proposed_action.params ?? {}, null, 2).slice(0, 800)}</pre>
                      </details>
                    )}
                    <form action={decideGroup} className="apv__form">
                      <input type="hidden" name="key" value={g.key} />
                      <input name="note" placeholder="Note (facultatif)" maxLength={300} aria-label="Note" />
                      <button type="submit" name="decision" value="approved" data-primary="true">Valider</button>
                      <button type="submit" name="decision" value="rejected">Rejeter</button>
                      <button type="submit" name="decision" value="dismissed" title="Ne concerne pas la boutique ou déjà traité">Écarter</button>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      ) : (
        <div className="apv__log">
          {done.length === 0 ? <p className="apv__empty">Aucune décision pour l'instant.</p> : done.map((r) => (
            <div key={r.id} className="apv__logrow">
              <i className="apv__chip" data-st={r.status}>{STATUS[r.status] ?? r.status}</i>
              <span><b>{r.title}</b><small>{r.agent_id} · {when(r.decided_at)}{r.decided_by ? ` · ${r.decided_by}` : ""}</small></span>
            </div>
          ))}
        </div>
      )}
      <p className="apv__foot">« Écarter » retire un constat sans l'approuver (déjà traité, ou sans objet). Les actions d'écriture (prix, fiches, campagnes) ne sont pas encore automatisées : elles restent à faire dans Shopify.</p>
    </div>
  );
}
