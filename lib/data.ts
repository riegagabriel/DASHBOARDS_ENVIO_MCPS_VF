import mcpsRaw from "@/data/mcps.json";
import type { Etapa, Mcp } from "./types";
import { ETAPAS_ORDEN } from "./types";

const mcps = mcpsRaw as Mcp[];

export function getAllMcps(): Mcp[] {
  return mcps;
}

export function getVigentes(): Mcp[] {
  return mcps.filter((m) => m.rolFila !== "ANTERIOR");
}

export function etapaValue(m: Mcp, etapa: Etapa): number | null {
  switch (etapa) {
    case "FEBRERO": return m.etapaFebrero;
    case "ABRIL":   return m.etapaAbril;
    case "JUNIO":   return m.etapaJunio;
    case "FINAL":   return m.etapaFinal;
  }
}

export function esEtapaReal(m: Mcp, etapa: Etapa): boolean {
  if (etapa === "ABRIL") return m.esAbrilReal;
  if (etapa === "JUNIO") return m.esJunioReal;
  return true;
}

export interface EvolucionPunto {
  etapa: Etapa;
  totalElectores: number;
  mcpsConDatoReal: number;
}

export function getEvolucionAgregada(): EvolucionPunto[] {
  const vigentes = getVigentes();
  return ETAPAS_ORDEN.map((etapa) => {
    let total = 0;
    let conDatoReal = 0;
    for (const m of vigentes) {
      const v = etapaValue(m, etapa);
      if (v !== null) total += v;
      if (esEtapaReal(m, etapa) && v !== null) conDatoReal += 1;
    }
    return { etapa, totalElectores: total, mcpsConDatoReal: conDatoReal };
  });
}

/** Cuántas MCPs cerraron su dato final en cada carpeta de envío. */
export function getCarpetaOrigenDistribucion(): { carpeta: string; count: number }[] {
  const vigentes = getVigentes();
  const counts: Record<string, number> = {};
  for (const m of vigentes) {
    const k = m.carpetaOrigen ?? "Sin datos";
    counts[k] = (counts[k] ?? 0) + 1;
  }
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([carpeta, count]) => ({ carpeta, count }));
}

/** Top N variaciones (positivas y negativas). */
export function getTopVariaciones(n = 20): Mcp[] {
  return getVigentes()
    .filter((m) => m.variacionAbs !== null && m.etapaFebrero !== null)
    .sort((a, b) => Math.abs(b.variacionAbs!) - Math.abs(a.variacionAbs!))
    .slice(0, n);
}

/** Datos por provincia para el mapa: count MCPs, total electores, variación media, % nuevas. */
export interface ProvinciaStat {
  idProv: string;
  departamento: string;
  provincia: string;
  nMcps: number;
  totalElectores: number;
  varMediaPct: number | null;
  pctNuevas: number;
}

export function getEstadisticasPorProvincia(): ProvinciaStat[] {
  const vigentes = getVigentes();
  const prov: Record<string, { dep: string; prov: string; mcps: Mcp[] }> = {};
  for (const m of vigentes) {
    if (!m.departamento || !m.provincia) continue;
    const id = `${m.departamento} - ${m.provincia}`;
    prov[id] ??= { dep: m.departamento, prov: m.provincia, mcps: [] };
    prov[id].mcps.push(m);
  }
  return Object.entries(prov).map(([id, { dep, prov: pr, mcps: ms }]) => {
    const conVar = ms.filter((m) => m.variacionPct !== null);
    const varMedia = conVar.length
      ? conVar.reduce((s, m) => s + m.variacionPct!, 0) / conVar.length
      : null;
    const nuevas = ms.filter((m) => m.etapaFebrero === null).length;
    return {
      idProv: id,
      departamento: dep,
      provincia: pr,
      nMcps: ms.length,
      totalElectores: ms.reduce((s, m) => s + (m.etapaFinal ?? 0), 0),
      varMediaPct: varMedia !== null ? Math.round(varMedia * 10) / 10 : null,
      pctNuevas: Math.round((nuevas / ms.length) * 100),
    };
  });
}

export function groupCount<T>(items: T[], keyFn: (item: T) => string | null): Record<string, number> {
  const out: Record<string, number> = {};
  for (const item of items) {
    const key = keyFn(item);
    if (key === null) continue;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

export function uniqueSorted(values: (string | null)[]): string[] {
  return Array.from(new Set(values.filter((v): v is string => v !== null))).sort();
}
