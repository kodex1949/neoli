// Contours des pays pour le globe d'administration (Analytics). Côté serveur uniquement : décode la carte « world-atlas » (110 m)
// et la joint aux codes pays ISO via « world-countries ». Aucune requête réseau : tout vient des paquets npm.
// @ts-ignore -- JSON fourni par le paquet world-atlas
import topoRaw from "world-atlas/countries-110m.json";
// @ts-ignore -- JSON fourni par le paquet world-countries
import metaRaw from "world-countries";

type Topo = {
  transform: { scale: [number, number]; translate: [number, number] };
  arcs: number[][][];
  objects: { countries: { geometries: { id?: string | number; type: string; arcs: number[][] | number[][][] }[] } };
};
type Meta = { cca2: string; ccn3: string; latlng: [number, number] };

export type GlobeCountry = { c: string; r: [number, number][][] };
export type GlobeData = { countries: GlobeCountry[]; centers: Record<string, [number, number]> };

let cache: GlobeData | null = null;

export function getGlobeData(): GlobeData {
  if (cache) return cache;
  const topo = topoRaw as unknown as Topo;
  const meta = metaRaw as unknown as Meta[];
  const [sx, sy] = topo.transform.scale, [tx, ty] = topo.transform.translate;
  const arcs = topo.arcs.map((a) => {
    let x = 0, y = 0;
    return a.map(([dx, dy]) => { x += dx; y += dy; return [Math.round((x * sx + tx) * 10) / 10, Math.round((y * sy + ty) * 10) / 10] as [number, number]; });
  });
  const arc = (i: number) => (i >= 0 ? arcs[i] : [...arcs[~i]].reverse());
  const ring = (idx: number[]) => idx.flatMap((i, k) => { const p = arc(i); return k ? p.slice(1) : p; });

  const byNum = new Map(meta.map((m) => [m.ccn3, m]));
  const countries: GlobeCountry[] = [];
  const centers: Record<string, [number, number]> = {};
  for (const m of meta) if (m.cca2 && m.latlng?.length === 2) centers[m.cca2] = [m.latlng[0], m.latlng[1]];
  for (const g of topo.objects.countries.geometries) {
    const m = g.id !== undefined ? byNum.get(String(g.id).padStart(3, "0")) : undefined;
    const polys = g.type === "Polygon" ? [g.arcs as number[][]] : g.type === "MultiPolygon" ? (g.arcs as number[][][]) : [];
    const rings = polys.flatMap((p) => p.map((r) => ring(r)));
    countries.push({ c: m?.cca2 ?? "", r: rings });
  }
  cache = { countries, centers };
  return cache;
}
