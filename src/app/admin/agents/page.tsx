import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AGENTS } from "@/lib/agents/registry";
import { createClient } from "@/lib/supabase/server";
import { AdminHead, AdminStats } from "@/components/AdminHead";
import { ackAlert, decideRecommendation, runAuditAction, setAgentEnabled, setAgentMode } from "./actions";

export const metadata: Metadata = { title: "Agents IA — Néoli", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

const MODES = { read_only: "READ ONLY", approval_required: "APPROVAL REQUIRED", auto_execute: "AUTO EXECUTE" } as const;
const SEV = { critical: "Critique", warning: "Attention", info: "Info" } as const;
const when = (d?: string | null) => (d ? new Intl.DateTimeFormat("fr-FR", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(d)) : "—");

export default async function AgentsAdminPage() {
  const db = await createClient();
  const { data: u } = await db.auth.getUser();
  if (!u.user) redirect("/connexion?next=/admin/agents");
  const { data: isAdmin } = await db.rpc("is_agent_admin");
  if (isAdmin !== true) {
    return (
      <div className="adm"><h1 className="acct__title">Agents IA</h1>
        <div className="acct__empty"><h2>Accès réservé</h2><p>Ce compte n'est pas déclaré administrateur du système d'agents.</p></div></div>
    );
  }

  const [agents, recs, alerts, tasks, runs, reports, log] = await Promise.all([
    db.from("agents").select("*"),
    db.from("agent_recommendations").select("*").order("created_at", { ascending: false }).limit(40),
    db.from("agent_alerts").select("*").eq("acknowledged", false).order("created_at", { ascending: false }).limit(10),
    db.from("agent_tasks").select("*").order("created_at", { ascending: false }).limit(12),
    db.from("agent_runs").select("cost_cents,tokens_in,tokens_out,started_at"),
    db.from("agent_reports").select("*").order("created_at", { ascending: false }).limit(1),
    db.from("agent_audit_log").select("*").order("at", { ascending: false }).limit(10),
  ]);
  const state = new Map((agents.data ?? []).map((a) => [a.id as string, a]));
  const cost = (runs.data ?? []).reduce((n, r) => n + Number(r.cost_cents ?? 0), 0);
  const tokens = (runs.data ?? []).reduce((n, r) => n + (r.tokens_in ?? 0) + (r.tokens_out ?? 0), 0);
  const report = reports.data?.[0]?.body as { headline?: string; counts?: Record<string, number>; priorities?: { agent: string; severity: string; title: string }[]; problems?: { agent: string; error: string }[] } | undefined;
  const open = (recs.data ?? []).filter((r) => r.status === "open");
  const decided = (recs.data ?? []).filter((r) => r.status !== "open").slice(0, 5);

  return (
    <div className="adm admp">
      <AdminHead eyebrow="Intelligence" title="Agents IA" lead="Tous les agents démarrent en lecture seule : ils analysent la boutique et proposent, sans rien modifier." />
      <AdminStats items={[
        { label: "Agents actifs", value: AGENTS.filter((a) => state.get(a.id)?.enabled).length, note: `sur ${AGENTS.length}` },
        { label: "Actions à valider", value: open.length, hot: open.length > 0 },
        { label: "Alertes non vues", value: alerts.data?.length ?? 0, hot: (alerts.data?.length ?? 0) > 0 },
        { label: "Coût IA", value: `${cost.toFixed(2)} ¢`, note: `${tokens} jetons` },
      ]} />

      <form action={runAuditAction} className="adm__bar admp__bar">
        <button type="submit" className="acct__btn" data-primary="true">Lancer un audit maintenant</button>
        <span className="acct__note">Une exécution par agent et par heure au maximum (anti-doublon). Aucun appel IA : coût {cost.toFixed(2)} ¢ · {tokens} jetons.</span>
      </form>

      {report && (
        <section className="admh__panel admp__sec"><div className="admh__panel-head"><h2>Dernier rapport · {reports.data?.[0] && when(reports.data[0].created_at)}</h2></div><div className="admp__body">
          <p className="adm__headline">{report.headline}</p>
          <p>Critiques : {report.counts?.critical ?? 0} · Attention : {report.counts?.warning ?? 0} · Infos : {report.counts?.info ?? 0}</p>
          {report.priorities?.length ? <ul className="adm__list">{report.priorities.map((p, i) => <li key={i}><b data-sev={p.severity}>{SEV[p.severity as keyof typeof SEV]}</b> {p.title} <em>({p.agent})</em></li>)}</ul> : null}
          {report.problems?.length ? <p className="acct__note">Agents en erreur : {report.problems.map((p) => `${p.agent} (${p.error})`).join(", ")}</p> : null}
        </div></section>
      )}

      {(alerts.data?.length ?? 0) > 0 && (
        <section className="admh__panel admp__sec"><div className="admh__panel-head"><h2>Alertes importantes</h2></div><div className="admp__body">
          <ul className="adm__list">{alerts.data!.map((a) => (
            <li key={a.id}><b data-sev="critical">Critique</b> {a.message} <em>({a.agent_id} · {when(a.created_at)})</em>
              <form action={ackAlert.bind(null, a.id)} className="adm__inline"><button type="submit" className="adm__link">Marquer comme vue</button></form></li>
          ))}</ul>
        </div></section>
      )}

      <section className="admh__panel admp__sec"><div className="admh__panel-head"><h2>Actions à valider ({open.length})</h2></div><div className="admp__body">
        {open.length === 0 ? <p>Rien en attente.</p> : (
          <ul className="adm__list">{open.map((r) => (
            <li key={r.id}>
              <b data-sev={r.severity}>{SEV[r.severity as keyof typeof SEV]}</b> <strong>{r.title}</strong> <em>({r.agent_id})</em>
              <span className="adm__detail">{r.detail}</span>
              {r.proposed_action && <span className="adm__detail">Action proposée : <code>{(r.proposed_action as { type: string }).type}</code> (non appliquée automatiquement)</span>}
              <span className="adm__inline">
                <form action={decideRecommendation.bind(null, r.id, "approved")}><button type="submit" className="adm__link">Valider</button></form>
                <form action={decideRecommendation.bind(null, r.id, "rejected")}><button type="submit" className="adm__link">Rejeter</button></form>
              </span>
            </li>
          ))}</ul>
        )}
        {decided.length > 0 && <p className="acct__note">Dernières décisions : {decided.map((d) => `${d.title} → ${d.status}`).join(" · ")}. Valider enregistre votre accord ; l'application sur la boutique n'est pas encore automatisée.</p>}
      </div></section>

      <section className="admp__agents"><h2 className="admp__h2">Agents</h2>
        <div className="adm__agents">
          {AGENTS.map((a) => {
            const s = state.get(a.id);
            return (
              <article key={a.id} className="acct__card adm__agent" data-on={!!s?.enabled}>
                <h3>{a.name}</h3>
                <p>{a.role}</p>
                <p className="adm__status">{!a.implemented ? "Non implémenté : ne peut pas encore exécuter ses tâches" : s?.enabled ? "Actif" : "Désactivé"}</p>
                <div className="adm__inline">
                  <form action={setAgentEnabled.bind(null, a.id, !s?.enabled)}><button type="submit" className="adm__link">{s?.enabled ? "Désactiver" : "Activer"}</button></form>
                  <form action={async (fd: FormData) => { "use server"; await setAgentMode(a.id, String(fd.get("mode"))); }}>
                    <select name="mode" defaultValue={s?.mode ?? "read_only"} aria-label={`Mode de ${a.name}`}>{Object.entries(MODES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
                    <button type="submit" className="adm__link">OK</button>
                  </form>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <section className="admh__panel admp__sec"><div className="admh__panel-head"><h2>Historique des tâches</h2></div><div className="admp__body">
        <ul className="adm__list">{(tasks.data ?? []).map((t) => <li key={t.id}><code>{t.agent_id}</code> · {t.trigger} · <b data-st={t.status}>{t.status}</b> · {when(t.created_at)}{t.error ? <em> — {t.error}</em> : null}</li>)}</ul>
      </div></section>

      <section className="admh__panel admp__sec"><div className="admh__panel-head"><h2>Dernières actions (journal d'audit)</h2></div><div className="admp__body">
        <ul className="adm__list">{(log.data ?? []).map((l) => <li key={l.id}>{when(l.at)} · <code>{l.agent_id ?? "système"}</code> · {l.action} · {l.result ?? ""}{l.error ? <em> — {l.error}</em> : null}</li>)}</ul>
      </div></section>
    </div>
  );
}
