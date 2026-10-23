// Moteur d'orchestration : audit à la demande ou planifié. Aucun appel IA : tout est déterministe, lecture seule.
import type { SupabaseClient } from "@supabase/supabase-js";
import { AGENTS } from "./registry";
import { PermissionError } from "./guard";
import { audit, costToday, dayKey, hourKey, saveFindings, type AgentRow } from "./store";
import { envReport, fetchCatalog, fetchCollectionsHealth, fetchOrders, fetchOrderStatuses, fetchReviews, fetchStock, probePage, runIntegrationChecks, runSiteChecks, type Ctx } from "./sources";
import { analyzeCatalog } from "./analyzers/product";
import { analyzeSeo } from "./analyzers/seo";
import { analyzeSales, computeStats } from "./analyzers/analytics";
import { analyzeTechnical } from "./analyzers/technical";
import { analyzeStock } from "./analyzers/inventory";
import { analyzePricing } from "./analyzers/pricing";
import { analyzeOrders } from "./analyzers/orders";
import { analyzeSupport } from "./analyzers/support";
import { analyzeMarketing } from "./analyzers/marketing";
import { buildReport, type AgentOutcome } from "./analyzers/manager";
import type { AgentDef, Finding } from "./types";

export type RunOptions = { trigger: "manual" | "daily" | string; origin: string; actor: string };
export type RunSummary = { trigger: string; outcomes: AgentOutcome[]; report?: ReturnType<typeof buildReport> };

const MAX_ATTEMPTS = 2;
const TIMEOUT_MS = 45_000;
const withTimeout = <T,>(p: Promise<T>) => Promise.race([p, new Promise<T>((_, rej) => setTimeout(() => rej(new Error("délai dépassé")), TIMEOUT_MS))]);

/** Tâche de chaque agent spécialisé. Le Store Manager est traité à part, une fois les autres terminés. */
async function perform(def: AgentDef, ctx: Ctx, db: SupabaseClient): Promise<Finding[]> {
  switch (def.id) {
    case "product-manager": return analyzeCatalog(await fetchCatalog(ctx));
    case "seo-specialist": {
      const catalog = await fetchCatalog(ctx, 0).catch(() => []);
      const handle = catalog[0]?.handle;
      const paths = ["/", "/collections/parfums", ...(handle ? [`/produits/${handle}`] : [])];
      const pages = []; for (const p of paths) pages.push(await probePage(ctx, p));
      return analyzeSeo(pages, await probePage(ctx, "/robots.txt", false), await probePage(ctx, "/sitemap.xml", false));
    }
    case "analytics-specialist": {
      const { orders, denied } = await fetchOrders(ctx);
      const f = analyzeSales(computeStats(orders));
      if (denied) f.push({ key: "analytics.denied", severity: "warning", title: "Accès partiel aux commandes", detail: "Shopify a refusé une partie des champs (droits de l'application). Les chiffres peuvent être incomplets." });
      return f;
    }
    case "technical-quality": {
      const checks = [...await runSiteChecks(ctx, ["/", "/collections/parfums", "/connexion", "/panier", "/api/search"]), ...await runIntegrationChecks(ctx)];
      return analyzeTechnical(checks, envReport(), false);
    }
    case "inventory-manager": {
      const { items, denied } = await fetchStock(ctx);
      return analyzeStock(items, denied);
    }
    case "pricing-manager": {
      const catalog = await fetchCatalog(ctx, 0);
      const orders = await fetchOrders(ctx).then((r) => r.orders).catch(() => null);
      return analyzePricing(catalog, orders);
    }
    case "order-manager": {
      const { orders, denied } = await fetchOrderStatuses(ctx);
      return analyzeOrders(orders, denied);
    }
    case "customer-support": return analyzeSupport(await fetchReviews(ctx, db));
    case "marketing-manager": {
      const [catalog, collections, reviews, sales] = await Promise.all([fetchCatalog(ctx, 0), fetchCollectionsHealth(ctx), fetchReviews(ctx, db).catch(() => []), fetchOrders(ctx).then((r) => computeStats(r.orders)).catch(() => null)]);
      const reviewed = new Set(reviews.filter((r) => r.status === "approved").map((r) => r.product_handle));
      return analyzeMarketing({ collections, bestSellers: sales?.bestSellers ?? [], productsWithoutReviews: catalog.filter((p) => !reviewed.has(p.handle)).map((p) => p.handle), productCount: catalog.length });
    }
    default: throw new Error("agent non implémenté");
  }
}

export async function runAudit(db: SupabaseClient, opts: RunOptions): Promise<RunSummary> {
  const { data: rows } = await db.from("agents").select("id,name,role,mode,enabled,daily_budget_cents");
  const state = new Map((rows as AgentRow[] | null ?? []).map((r) => [r.id, r]));
  const bucket = opts.trigger === "daily" ? dayKey() : hourKey();
  const outcomes: AgentOutcome[] = [];
  const taskIds: string[] = [];

  const order = [...AGENTS.filter((a) => a.id !== "store-manager"), ...AGENTS.filter((a) => a.id === "store-manager")];
  for (const def of order) {
    const row = state.get(def.id);
    const isManager = def.id === "store-manager";
    if (!row?.enabled) { outcomes.push({ agent: def.id, status: "disabled", findings: [] }); continue; }
    if (!def.implemented) { outcomes.push({ agent: def.id, status: "not_implemented", findings: [] }); await audit(db, { agent_id: def.id, trigger: opts.trigger, action: "skip:not_implemented", mode: row.mode, result: "activé mais non implémenté" }); continue; }
    if (row.daily_budget_cents > 0 && (await costToday(db, def.id)) >= row.daily_budget_cents) { outcomes.push({ agent: def.id, status: "skipped", findings: [], error: "budget quotidien atteint" }); await audit(db, { agent_id: def.id, trigger: opts.trigger, action: "skip:budget", mode: row.mode }); continue; }

    // File de tâches : la clé unique empêche d'exécuter deux fois la même tâche dans la même période.
    const { data: task, error: dupErr } = await db.from("agent_tasks").insert({ agent_id: def.id, kind: "audit", trigger: opts.trigger, status: "running", dedupe_key: `${def.id}:${opts.trigger}:${bucket}`, depends_on: isManager ? taskIds : [], attempts: 1, max_attempts: MAX_ATTEMPTS, started_at: new Date().toISOString() }).select("id").single();
    if (dupErr || !task) { outcomes.push({ agent: def.id, status: "skipped", findings: [], error: "déjà exécuté sur cette période" }); await audit(db, { agent_id: def.id, trigger: opts.trigger, action: "skip:duplicate", mode: row.mode, result: dupErr?.code ?? "no task" }); continue; }
    taskIds.push(task.id);

    const started = new Date().toISOString();
    const ctx: Ctx = { def, mode: row.mode, origin: opts.origin, used: new Set() };
    let findings: Finding[] = []; let error: string | undefined; let attempts = 0;
    while (attempts < MAX_ATTEMPTS) {
      attempts++;
      try {
        if (isManager) { findings = []; break; }
        findings = await withTimeout(perform(def, ctx, db)); error = undefined; break;
      } catch (e) {
        error = e instanceof Error ? e.message : String(e);
        if (e instanceof PermissionError) break; // inutile de réessayer un refus
      }
    }

    const finished = new Date().toISOString();
    const { data: run } = await db.from("agent_runs").insert({ task_id: task.id, agent_id: def.id, trigger: opts.trigger, status: error ? "error" : "ok", input_summary: { sources: [...ctx.used], mode: row.mode, actor: opts.actor }, output: { findings: findings.length, attempts }, error: error ?? null, started_at: started, finished_at: finished }).select("id").single();
    if (!isManager && run) await saveFindings(db, def.id, run.id, findings);
    await db.from("agent_tasks").update({ status: error ? "failed" : "done", attempts, error: error ?? null, finished_at: finished }).eq("id", task.id);
    await audit(db, { agent_id: def.id, trigger: opts.trigger, action: "analyze", mode: row.mode, data_used: { sources: [...ctx.used] }, result: error ? "échec" : `${findings.length} constat(s)`, error, approval_status: "n/a (lecture seule)" });
    outcomes.push({ agent: def.id, status: error ? "error" : "ok", findings, error });

    if (isManager) {
      const report = buildReport(outcomes.filter((o) => o.agent !== "store-manager"));
      await db.from("agent_reports").insert({ agent_id: "store-manager", kind: opts.trigger === "daily" ? "daily" : opts.trigger === "scheduled" ? "scheduled" : "manual", title: `Rapport ${dayKey()} — ${report.headline}`, body: report });
      return { trigger: opts.trigger, outcomes, report };
    }
  }
  return { trigger: opts.trigger, outcomes };
}
