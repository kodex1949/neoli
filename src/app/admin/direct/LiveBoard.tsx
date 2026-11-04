"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { GlobeData } from "@/lib/globe-data";
import { Globe } from "../analytics/Globe";

type Live = {
  now: string; online: number; views30: number; today: number; carts: number; checkouts: number;
  countries: { c: string; s: number; l: number }[];
  pages: { k: string; n: number }[];
  minutes: { t: string; n: number }[];
  feed: { at: string; t: string; p: string; c: string | null; v: string }[];
};

const VERB: Record<string, string> = { pageview: "consulte", add_to_cart: "ajoute au panier", begin_checkout: "passe au paiement", login: "se connecte", signup: "crée un compte" };
const regionName = (() => { try { const d = new Intl.DisplayNames(["fr"], { type: "region" }); return (c: string) => d.of(c) ?? c; } catch { return (c: string) => c; } })();
const pageLabel = (p: string) => (p === "/" ? "l'accueil" : p.startsWith("/produits/") ? `le produit ${p.slice(10).replace(/-/g, " ")}` : p.startsWith("/marques/") ? `la marque ${p.slice(9).replace(/-/g, " ")}` : p);
const pageShort = (p: string) => (p === "/" ? "Accueil" : p);
const ago = (ms: number) => { const s = Math.max(0, Math.round(ms / 1000)); return s < 5 ? "à l'instant" : s < 60 ? `il y a ${s} s` : s < 3600 ? `il y a ${Math.floor(s / 60)} min` : `il y a ${Math.floor(s / 3600)} h`; };

/** Tableau en direct : interroge la base toutes les 8 secondes tant que l'onglet est visible. */
export function LiveBoard({ globe }: { globe: GlobeData | null }) {
  const [d, setD] = useState<Live | null>(null);
  const [err, setErr] = useState(false);
  const [tick, setTick] = useState(0);
  const [skew, setSkew] = useState(0);

  const load = useCallback(async () => {
    try {
      const { data, error } = await createClient().rpc("analytics_live", { p_minutes: 5 });
      if (error || !data) { setErr(true); return; }
      const j = data as Live; setErr(false); setD(j); setSkew(Date.now() - Date.parse(j.now));
    } catch { setErr(true); }
  }, []);

  useEffect(() => {
    void load();
    const poll = setInterval(() => { if (!document.hidden) void load(); }, 8000);
    const clock = setInterval(() => setTick((n) => n + 1), 1000);
    const vis = () => { if (!document.hidden) void load(); };
    document.addEventListener("visibilitychange", vis);
    return () => { clearInterval(poll); clearInterval(clock); document.removeEventListener("visibilitychange", vis); };
  }, [load]);

  if (!d) return <div className="an__notice" role="status">{err ? <><b>Lecture impossible.</b> Vérifiez que vous êtes connecté en administrateur.</> : "Chargement…"}</div>;

  const nowMs = Date.now() - skew; void tick;
  const maxM = Math.max(1, ...d.minutes.map((m) => m.n));
  const byMin = new Map(d.minutes.map((m) => [Math.floor(Date.parse(m.t) / 60000), m.n]));
  const base = Math.floor(nowMs / 60000);
  const bars = Array.from({ length: 30 }, (_, i) => byMin.get(base - 29 + i) ?? 0);
  const maxP = Math.max(1, ...d.pages.map((p) => p.n));

  return (
    <>
      <section className="dir__kpis" aria-label="Visiteurs en direct">
        <div className="dir__kpi dir__kpi--live"><span><i className="dir__dot" aria-hidden="true" />En ligne maintenant</span><strong>{d.online}</strong><em>actifs ces 5 dernières minutes</em></div>
        <div className="dir__kpi"><span>Aujourd'hui</span><strong>{d.today}</strong><em>sessions depuis minuit</em></div>
        <div className="dir__kpi"><span>Pages vues</span><strong>{d.views30}</strong><em>sur 30 minutes</em></div>
        <div className="dir__kpi"><span>Panier</span><strong>{d.carts}</strong><em>{d.checkouts} au paiement</em></div>
      </section>

      <section className="admh__panel dir__panel">
        <div className="admh__panel-head admh__panel-head--row"><h2>Visiteurs par pays</h2><span className="an__hint">{d.countries.length ? "Dernières 5 minutes" : "Aucun pays détecté"}</span></div>
        {globe ? <Globe data={globe} rows={d.countries} /> : <div className="an__notice" role="status"><b>Globe indisponible.</b> Installez les paquets : <code>npm i world-atlas world-countries</code>.</div>}
      </section>

      <div className="admh__cols admh__cols--even">
        <section className="admh__panel">
          <div className="admh__panel-head"><h2>Pages consultées</h2></div>
          {d.pages.length === 0 ? <p className="admh__empty">Personne sur le site pour l'instant.</p> : (
            <ul className="admh__bars an__bars">{d.pages.map((p) => (<li key={p.k}><span title={p.k}>{pageShort(p.k)}</span><i style={{ "--w": `${(p.n / maxP) * 100}%` } as React.CSSProperties} aria-hidden="true" /><b>{p.n}</b></li>))}</ul>
          )}
          <div className="dir__spark" role="img" aria-label="Visiteurs par minute sur 30 minutes">
            {bars.map((n, i) => <i key={i} style={{ height: `${Math.max(4, (n / maxM) * 100)}%` }} data-on={n > 0 || undefined} />)}
          </div>
          <p className="an__sub">Visiteurs par minute, sur les 30 dernières minutes.</p>
        </section>
        <section className="admh__panel">
          <div className="admh__panel-head"><h2>Activité</h2></div>
          {d.feed.length === 0 ? <p className="admh__empty">Aucune visite enregistrée. Ouvrez le site dans un autre onglet : votre passage apparaîtra ici en quelques secondes.</p> : (
            <ul className="dir__feed">
              {d.feed.map((f, i) => (
                <li key={`${f.at}-${i}`} data-t={f.t}>
                  <span><b>Visiteur {f.v}</b>{f.c ? ` (${regionName(f.c)})` : ""} {VERB[f.t] ?? f.t} {f.t === "pageview" ? pageLabel(f.p) : ""}</span>
                  <time dateTime={f.at}>{ago(nowMs - Date.parse(f.at))}</time>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
      <p className="an__sub dir__note">Mesure anonyme : un visiteur est un onglet ouvert, identifié par un code aléatoire qui disparaît à la fermeture. Les visiteurs qui refusent le suivi (« Ne pas me suivre ») ne sont pas comptés.</p>
    </>
  );
}
