// Graphiques en SVG/CSS pur, sans dépendance. Pas d'état : rendus côté serveur.
import type { CSSProperties } from "react";

export const TONES = ["#33383c", "#6b7378", "#9aa1a5", "#c5c9cb", "#e2e4e5"];

/** Courbe miniature avec aire, pour les cartes de chiffres clés. */
export function Spark({ values, w = 132, h = 36 }: { values: number[]; w?: number; h?: number }) {
  if (values.length < 2 || Math.max(...values) === 0) return <svg className="an-spark" viewBox={`0 0 ${w} ${h}`} aria-hidden="true"><line x1="0" x2={w} y1={h - 1} y2={h - 1} /></svg>;
  const max = Math.max(...values);
  const pts = values.map((v, i) => [(i / (values.length - 1)) * w, h - 2 - (v / max) * (h - 6)] as const);
  const line = pts.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  return (
    <svg className="an-spark" viewBox={`0 0 ${w} ${h}`} aria-hidden="true">
      <path className="an-spark__area" d={`${line} L${w} ${h} L0 ${h} Z`} />
      <path className="an-spark__line" d={line} />
    </svg>
  );
}

/** Anneau de répartition avec légende. */
export function Donut({ parts, center, caption }: { parts: { label: string; value: number }[]; center?: string; caption?: string }) {
  const total = parts.reduce((n, p) => n + p.value, 0);
  const R = 52, C = 2 * Math.PI * R;
  let acc = 0;
  return (
    <div className="an-donut">
      <svg viewBox="0 0 140 140" role="img" aria-label={parts.map((p) => `${p.label} ${p.value}`).join(", ")}>
        <circle cx="70" cy="70" r={R} className="an-donut__track" />
        {total > 0 && parts.map((p, i) => {
          const len = (p.value / total) * C;
          const el = <circle key={p.label} cx="70" cy="70" r={R} className="an-donut__seg" stroke={TONES[i % TONES.length]} strokeDasharray={`${Math.max(0, len - 1.5)} ${C}`} strokeDashoffset={-acc} style={{ "--i": i } as CSSProperties} />;
          acc += len;
          return el;
        })}
        <text x="70" y={caption ? 69 : 75} textAnchor="middle" className="an-donut__n">{center ?? total}</text>
        {caption && <text x="70" y="86" textAnchor="middle" className="an-donut__c">{caption}</text>}
      </svg>
      <ul>
        {parts.map((p, i) => (
          <li key={p.label}><i style={{ background: TONES[i % TONES.length] }} aria-hidden="true" /><span title={p.label}>{p.label}</span><b>{total ? Math.round((p.value / total) * 100) : 0} %</b></li>
        ))}
      </ul>
    </div>
  );
}

/** Carte de chaleur jour × tranche horaire. */
export function Heat({ grid, rows, cols }: { grid: number[][]; rows: string[]; cols: string[] }) {
  const max = Math.max(1, ...grid.flat());
  return (
    <div className="an-heat" role="img" aria-label="Commandes par jour et tranche horaire">
      <div className="an-heat__cols" aria-hidden="true"><span />{cols.map((c) => <span key={c}>{c}</span>)}</div>
      {rows.map((r, y) => (
        <div key={r} className="an-heat__row">
          <span>{r}</span>
          {grid[y].map((v, x) => <i key={x} style={{ "--a": v / max } as CSSProperties} data-zero={v === 0 ? "true" : undefined} title={`${r} ${cols[x]} : ${v} commande${v > 1 ? "s" : ""}`} />)}
        </div>
      ))}
    </div>
  );
}

/** Histogramme vertical. */
export function Histo({ bins }: { bins: { label: string; value: number }[] }) {
  const max = Math.max(1, ...bins.map((b) => b.value));
  return (
    <div className="an-histo" role="img" aria-label={bins.map((b) => `${b.label} : ${b.value}`).join(", ")}>
      {bins.map((b) => (
        <div key={b.label}><b>{b.value}</b><i style={{ "--h": `${(b.value / max) * 100}%` } as CSSProperties} data-zero={b.value === 0 ? "true" : undefined} /><span>{b.label}</span></div>
      ))}
    </div>
  );
}

/** Jauge horizontale simple (part d'un tout). */
export function Meter({ value, total, label }: { value: number; total: number; label: string }) {
  const p = total ? Math.round((value / total) * 100) : 0;
  return <div className="an-meter"><div><span>{label}</span><b>{p} %</b></div><i style={{ "--w": `${p}%` } as CSSProperties} aria-hidden="true" /></div>;
}
