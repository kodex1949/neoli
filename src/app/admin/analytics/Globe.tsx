"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { GlobeData } from "@/lib/globe-data";
import "./globe.css";

type Row = { c: string; s: number; l: number };
const RAD = Math.PI / 180;
const regionName = (() => {
  try { const d = new Intl.DisplayNames(["fr"], { type: "region" }); return (c: string) => d.of(c) ?? c; } catch { return (c: string) => c; }
})();

/** Globe interactif des pays d'origine des visites : glisser pour tourner, cliquer un pays de la liste pour le centrer. */
export function Globe({ data, rows }: { data: GlobeData; rows: Row[] }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const view = useRef({ lon: 10, lat: 20 });
  const target = useRef<{ lon: number; lat: number } | null>(null);
  const drag = useRef<{ x: number; y: number; lon: number; lat: number } | null>(null);
  const hover = useRef(false);
  const [active, setActive] = useState<string | null>(null);
  const max = Math.max(1, ...rows.map((r) => r.s));
  const by = useMemo(() => new Map(rows.map((r) => [r.c, r])), [rows]);

  useEffect(() => {
    const el = canvas.current; if (!el) return;
    const ctx = el.getContext("2d"); if (!ctx) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0, size = 0, dpr = 1, dirty = true;
    const css = getComputedStyle(el);
    const v = (n: string, d: string) => css.getPropertyValue(n).trim() || d;
    const ink = v("--gl-ink", "#1f2a30"), land = v("--gl-land", "#dfe3e5"), sea = v("--gl-sea", "#f4f5f6"), line = v("--gl-line", "#c9cfd2"), grat = v("--gl-grat", "#e3e7e9");

    const resize = () => {
      const w = el.clientWidth; dpr = Math.min(window.devicePixelRatio || 1, 2); size = w;
      el.width = Math.round(w * dpr); el.height = Math.round(w * dpr); dirty = true;
    };
    const ro = new ResizeObserver(resize); ro.observe(el); resize();

    const draw = () => {
      const { lon, lat } = view.current, R = size / 2 - 2, cx = size / 2, cy = size / 2;
      const l0 = lon * RAD, p0 = lat * RAD, sp0 = Math.sin(p0), cp0 = Math.cos(p0);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, size, size);
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fillStyle = sea; ctx.fill();
      const path = (ring: [number, number][]) => {
        for (let i = 0; i < ring.length; i++) {
          const l = ring[i][0] * RAD, p = ring[i][1] * RAD, dl = l - l0, cp = Math.cos(p);
          let x = cp * Math.sin(dl), y = cp0 * Math.sin(p) - sp0 * cp * Math.cos(dl);
          const vis = sp0 * Math.sin(p) + cp0 * cp * Math.cos(dl) >= 0;
          if (!vis) { const n = Math.hypot(x, y) || 1; x /= n; y /= n; }
          const X = cx + x * R, Y = cy - y * R;
          if (i) ctx.lineTo(X, Y); else ctx.moveTo(X, Y);
        }
        ctx.closePath();
      };
      // Méridiens et parallèles, seulement sur la face visible
      ctx.lineWidth = 0.5; ctx.strokeStyle = grat; ctx.beginPath();
      const seg = (la: number, lo: number, pen: boolean) => {
        const p = la * RAD, dl = lo * RAD - l0, cp = Math.cos(p);
        if (sp0 * Math.sin(p) + cp0 * cp * Math.cos(dl) < 0) return false;
        const X = cx + cp * Math.sin(dl) * R, Y = cy - (cp0 * Math.sin(p) - sp0 * cp * Math.cos(dl)) * R;
        if (pen) ctx.lineTo(X, Y); else ctx.moveTo(X, Y); return true;
      };
      for (let lo = -180; lo < 180; lo += 30) { let pen = false; for (let la = -90; la <= 90; la += 3) pen = seg(la, lo, pen); }
      for (let la = -60; la <= 60; la += 30) { let pen = false; for (let lo = -180; lo <= 180; lo += 3) pen = seg(la, lo, pen); }
      ctx.stroke();
      ctx.lineJoin = "round";
      for (const c of data.countries) {
        const row = c.c ? by.get(c.c) : undefined;
        ctx.beginPath(); for (const r of c.r) path(r);
        ctx.fillStyle = row ? ink : land;
        ctx.globalAlpha = row ? 0.38 + 0.62 * Math.sqrt(row.s / max) : 1;
        ctx.fill("evenodd"); ctx.globalAlpha = 1;
        const on = !!c.c && c.c === active;
        ctx.strokeStyle = on ? ink : row ? sea : "#fff"; ctx.lineWidth = on ? 1.8 : 0.6; ctx.stroke();
      }
      // Relief : ombre côté droit et bas, reflet en haut à gauche, fin liseré
      const sh = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.15, cx, cy, R);
      sh.addColorStop(0, "rgba(255,255,255,.55)"); sh.addColorStop(0.6, "rgba(255,255,255,0)"); sh.addColorStop(1, "rgba(31,42,48,.14)");
      ctx.beginPath(); ctx.arc(cx, cy, R, 0, 7); ctx.fillStyle = sh; ctx.fill();
      ctx.lineWidth = 1; ctx.strokeStyle = line; ctx.stroke();
    };

    const tick = () => {
      const v = view.current, t = target.current;
      if (t) {
        const dl = ((t.lon - v.lon + 540) % 360) - 180; const dp = t.lat - v.lat;
        v.lon += dl * 0.12; v.lat += dp * 0.12;
        if (Math.abs(dl) < 0.1 && Math.abs(dp) < 0.1) target.current = null;
        dirty = true;
      } else if (!reduce && !hover.current && !drag.current) { v.lon += 0.12; dirty = true; }
      if (dirty) { dirty = false; draw(); }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);

    const down = (e: PointerEvent) => { el.setPointerCapture(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, lon: view.current.lon, lat: view.current.lat }; target.current = null; };
    const move = (e: PointerEvent) => {
      const d = drag.current; if (!d) return;
      const k = 180 / (size || 1) / 0.9;
      view.current.lon = d.lon - (e.clientX - d.x) * k;
      view.current.lat = Math.max(-80, Math.min(80, d.lat + (e.clientY - d.y) * k)); dirty = true;
    };
    const up = () => { drag.current = null; };
    const enter = () => { hover.current = true; }, leave = () => { hover.current = false; };
    el.addEventListener("pointerdown", down); el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up);
    el.addEventListener("pointerenter", enter); el.addEventListener("pointerleave", leave);
    return () => { cancelAnimationFrame(raf); ro.disconnect(); el.removeEventListener("pointerdown", down); el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); el.removeEventListener("pointerenter", enter); el.removeEventListener("pointerleave", leave); };
  }, [data, by, max, active]);

  const focus = (c: string) => {
    const ctr = data.centers[c]; setActive(c);
    if (ctr) target.current = { lat: Math.max(-60, Math.min(60, ctr[0])), lon: ctr[1] };
  };

  const total = rows.reduce((n, r) => n + r.s, 0);
  const top = rows[0];
  const members = rows.reduce((n, r) => n + r.l, 0);
  return (
    <div className="gl">
      <div className="gl__stage">
        <canvas ref={canvas} className="gl__canvas" role="img" aria-label={rows.length ? `Globe des visites : ${rows.slice(0, 5).map((r) => `${regionName(r.c)} ${r.s}`).join(", ")}` : "Globe des visites : aucune donnée de pays pour l'instant"} />
        <span className="gl__hint">Glissez pour tourner</span>
      </div>
      <div className="gl__side">
        {rows.length > 0 && (
          <dl className="gl__stats">
            <div><dt>Pays</dt><dd>{rows.length}</dd></div>
            <div><dt>Premier pays</dt><dd>{regionName(top.c)}</dd></div>
            <div><dt>Visites connectées</dt><dd>{members}</dd></div>
          </dl>
        )}
        {rows.length === 0 ? (
          <p className="gl__empty">Aucun pays enregistré pour l'instant. Le pays apparaît dès les prochaines visites en ligne ; en local, il reste vide.</p>
        ) : (
          <ul className="gl__list">
            {rows.slice(0, 12).map((r) => (
              <li key={r.c}>
                <button type="button" onClick={() => focus(r.c)} data-on={active === r.c || undefined}>
                  <span className="gl__name">{regionName(r.c)}</span>
                  <i style={{ "--w": `${(r.s / max) * 100}%` } as React.CSSProperties} aria-hidden="true" />
                  <b>{r.s}</b>
                  <em>{Math.round((r.s / total) * 100)} %</em>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
