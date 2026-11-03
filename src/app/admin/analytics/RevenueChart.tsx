"use client";

import { useRef, useState } from "react";

export type Point = { label: string; value: number; orders: number; prev?: number };

/** Courbe interactive du chiffre d'affaires : période courante pleine, période précédente en pointillés. */
export function RevenueChart({ points, currency, showPrev, kind = "money" }: { points: Point[]; currency: string; showPrev: boolean; kind?: "money" | "traffic" }) {
  const W = 800, H = 260, L = 8, R = 8, T = 16, B = 28;
  const ref = useRef<SVGSVGElement>(null);
  const [hover, setHover] = useState<number | null>(null);
  const n = points.length;
  const max = Math.max(1, ...points.map((p) => Math.max(p.value, showPrev ? p.prev ?? 0 : 0)));
  const nice = (() => { const e = 10 ** Math.floor(Math.log10(max)); const m = max / e; return (m <= 1 ? 1 : m <= 2 ? 2 : m <= 5 ? 5 : 10) * e; })();
  const x = (i: number) => L + (n === 1 ? (W - L - R) / 2 : (i / (n - 1)) * (W - L - R));
  const y = (v: number) => T + (1 - v / nice) * (H - T - B);
  const path = (get: (p: Point) => number) => points.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(get(p)).toFixed(1)}`).join(" ");
  const cur = path((p) => p.value);
  const money = (v: number) => kind === "traffic" ? new Intl.NumberFormat("fr-FR").format(v) : new Intl.NumberFormat("fr-FR", { style: "currency", currency, maximumFractionDigits: v >= 100 ? 0 : 2 }).format(v);
  const compact = (v: number) => new Intl.NumberFormat("fr-FR", { notation: "compact", maximumFractionDigits: 1 }).format(v);

  const move = (e: React.PointerEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r || n === 0) return;
    const px = ((e.clientX - r.left) / r.width) * W;
    setHover(Math.max(0, Math.min(n - 1, Math.round(((px - L) / (W - L - R)) * (n - 1)))));
  };
  const hp = hover === null ? null : points[hover];
  const step = Math.max(1, Math.ceil(n / 8));

  return (
    <div className="an-rev">
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} role="img" aria-label="Chiffre d'affaires par jour" onPointerMove={move} onPointerLeave={() => setHover(null)}>
        {[0, 0.25, 0.5, 0.75, 1].map((t) => (
          <g key={t}>
            <line x1={L} x2={W - R} y1={y(nice * t)} y2={y(nice * t)} className="an-rev__grid" />
            {t > 0 && <text x={L + 2} y={y(nice * t) - 4} className="an-rev__tick">{compact(nice * t)}</text>}
          </g>
        ))}
        <path d={`${cur} L${x(n - 1)} ${y(0)} L${x(0)} ${y(0)} Z`} className="an-rev__area" />
        {showPrev && <path d={path((p) => p.prev ?? 0)} className="an-rev__prev" />}
        <path d={cur} className="an-rev__line" />
        {points.map((p, i) => i % step === 0 || i === n - 1 ? <text key={i} x={x(i)} y={H - 8} textAnchor={i === 0 ? "start" : i === n - 1 ? "end" : "middle"} className="an-rev__x">{p.label}</text> : null)}
        {hp && hover !== null && (
          <g>
            <line x1={x(hover)} x2={x(hover)} y1={T} y2={H - B} className="an-rev__cursor" />
            <circle cx={x(hover)} cy={y(hp.value)} r="4.5" className="an-rev__dot" />
          </g>
        )}
      </svg>
      {hp && hover !== null && (
        <div className="an-rev__tip" style={{ left: `${(x(hover) / W) * 100}%` }} data-flip={hover > n * 0.6 ? "true" : undefined}>
          <small>{hp.label}</small>
          <b>{money(hp.value)}{kind === "traffic" ? ` session${hp.value > 1 ? "s" : ""}` : ""}</b>
          <span>{kind === "traffic" ? `${hp.orders} page${hp.orders > 1 ? "s" : ""} vue${hp.orders > 1 ? "s" : ""}` : `${hp.orders} commande${hp.orders > 1 ? "s" : ""}`}</span>
          {showPrev && hp.prev !== undefined && <em>Période préc. : {money(hp.prev)}</em>}
        </div>
      )}
      <p className="an-rev__legend"><span><i /> {kind === "traffic" ? "Sessions" : "Période en cours"}</span>{showPrev && <span><i data-dash="true" /> Période précédente</span>}</p>
    </div>
  );
}
