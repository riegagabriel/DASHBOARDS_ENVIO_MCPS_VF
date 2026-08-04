// Tipos de datos — reflejan exactamente los campos de data/mcps.json,
// generado por scripts/build_data.py. Si se agrega un campo ahí, agregarlo
// aquí también.

export type EstadoError = "SIN ERROR" | "SUBSANADO" | "PENDIENTE";

export type RolFila = "UNICA" | "VIGENTE" | "ANTERIOR";

export interface Mcp {
  codMcpReniec: string | null;
  cod: string | null;
  ubigeo: string | null;
  departamento: string | null;
  provincia: string | null;
  distrito: string | null;
  mcp: string | null;
  rolFila: RolFila;
  idVinculo: string | null;
  clasificacionHistorica: string | null;
  etapaFebrero: number | null;
  etapaAbril: number | null;
  etapaJunio: number | null;
  etapaFinal: number | null;
  esAbrilReal: boolean;
  esJunioReal: boolean;
  variacionAbs: number | null;
  variacionPct: number | null;
  nCorrecciones: number;
  estadoError: EstadoError;
  causa: string | null;
  causaCategoria: string | null;
  errorPendienteDetalle: string | null;
  descripcionCaso: string | null;
  nota: string | null;
  fuenteResultadoFinal: string | null;
}

export const ETAPAS_ORDEN = ["FEBRERO", "ABRIL", "JUNIO", "FINAL"] as const;
export type Etapa = (typeof ETAPAS_ORDEN)[number];

export interface ProvinciaFeatureProps {
  idProv: string;
  nombdep: string;
  nombprov: string;
}
