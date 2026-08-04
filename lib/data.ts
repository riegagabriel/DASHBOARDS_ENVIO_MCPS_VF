import mcpsRaw from "@/data/mcps.json";
import type { Etapa, Mcp } from "./types";
import { ETAPAS_ORDEN } from "./types";

const mcps = mcpsRaw as Mcp[];

/** Todas las filas (incl. las 17 identidades históricas ANTERIOR) — para
 * Ficha por MCP, que necesita poder encontrar una MCP por su identidad
 * antigua y explicar a dónde fue reclasificada. */
export function getAllMcps(): Mcp[] {
  return mcps;
}

/** MCP vigentes (una fila por MCP única) — fuente de TODOS los KPIs y
 * gráficos agregados. Nunca usar `getAllMcps()` para un conteo o suma. */
export function getVigentes(): Mcp[] {
  return mcps.filter((m) => m.rolFila !== "ANTERIOR");
}

export function etapaValue(m: Mcp, etapa: Etapa): number | null {
  switch (etapa) {
    case "FEBRERO":
      return m.etapaFebrero;
    case "ABRIL":
      return m.etapaAbril;
    case "JUNIO":
      return m.etapaJunio;
    case "FINAL":
      return m.etapaFinal;
  }
}

export function esEtapaReal(m: Mcp, etapa: Etapa): boolean {
  if (etapa === "ABRIL") return m.esAbrilReal;
  if (etapa === "JUNIO") return m.esJunioReal;
  return true; // FEBRERO y FINAL siempre son "reales" (no arrastrados)
}

export interface EvolucionPunto {
  etapa: Etapa;
  totalElectores: number;
  mcpsConDatoReal: number;
}

/** Serie agregada de evolución del padrón por etapa (para el gráfico combo
 * de Resumen ejecutivo). */
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
