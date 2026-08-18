"use client";

import { useState, useMemo } from "react";
import type { Mcp } from "@/lib/types";
import { etapaValue, esEtapaReal } from "@/lib/data";
import { ETAPAS_ORDEN } from "@/lib/types";
import PlotlyChart from "@/components/PlotlyChart";
import type { Data } from "plotly.js";

const AZUL     = "#002F56";
const AZUL_MED = "#2E6F9E";
const VERDE    = "#1a7a45";
const ROJO     = "#b91c1c";
const GRIS     = "#6b8ca4";

const ETAPA_LABEL: Record<string, string> = {
  FEBRERO: "Feb.",
  ABRIL:   "Abr.",
  JUNIO:   "Jun.",
  JULIO:   "Jul.",
  AGOSTO:  "Ago.",
  FINAL:   "Final",
};

// ── Nota ejecutiva ────────────────────────────────────────────────
// Elimina referencias internas del texto crudo antes de mostrarlo.
const CLEAN_RULES: [RegExp, string][] = [
  [/^CASO ESPECIAL:\s*/i,                          ""],
  [/Detalle completo en[^.]+\./gi,                 ""],
  [/LOCALMENTE por el proyecto[^,.)]+[,.]?\s*/gi,  ""],
  [/asignado LOCALMENTE[^,.)]+[,.]?\s*/gi,         ""],
  [/pendiente que[^.]+\./gi,                       ""],
  [/Reclasificaci[oó]n confirmada con[^.]+\./gi,   ""],
  [/BASE_MCPS_\S+/g,                               "el catálogo nacional"],
  [/MEMORIA_GENERAL[^\s,).]*/g,                    ""],
  [/RENIEC_JULIO_AGOSTO_\d+\/[^\s,).]+/g,          ""],
  [/secci[oó]n\s+\w+/gi,                           ""],
  [/\bel proyecto\b/gi,                            ""],
];

function cleanDescripcion(raw: string): string {
  // Solo la primera oración (hasta el primer ". " o final)
  const first = raw.split(/\.\s+/)[0] + ".";
  let clean = first;
  for (const [pattern, replacement] of CLEAN_RULES) {
    clean = clean.replace(pattern, replacement);
  }
  // Normalizar espacios y puntuación
  return clean.replace(/\s{2,}/g, " ").replace(/[,;]\s*\.$/, ".").trim();
}

function buildNota(mcp: Mcp): string | null {
  const raw = mcp.descripcionCaso ?? mcp.nota;
  if (raw) {
    const clean = cleanDescripcion(raw);
    if (clean.length > 15) return clean;
  }

  // Generación desde datos estructurales cuando no hay descripción
  if (mcp.etapaFebrero === null) {
    const primeraEtapa =
      mcp.etapaAbril  !== null ? "ABRIL"  :
      mcp.etapaJunio  !== null ? "JUNIO"  :
      mcp.etapaJulio  !== null ? "JULIO"  :
      mcp.etapaAgosto !== null ? "AGOSTO" : null;
    const primerValor = mcp.etapaAbril ?? mcp.etapaJunio ?? mcp.etapaJulio ?? mcp.etapaAgosto ?? mcp.etapaFinal;
    if (primeraEtapa && primerValor !== null) {
      return `Incorporada en ${primeraEtapa} con ${primerValor.toLocaleString("es-PE")} electores.`;
    }
  } else if (mcp.variacionAbs !== null && mcp.variacionAbs !== 0) {
    const abs = Math.abs(mcp.variacionAbs).toLocaleString("es-PE");
    const pct = mcp.variacionPct !== null
      ? ` (${mcp.variacionPct > 0 ? "+" : ""}${mcp.variacionPct.toFixed(1)} %)`
      : "";
    return mcp.variacionAbs > 0
      ? `Incremento de ${abs} electores${pct} respecto al padrón inicial.`
      : `Reducción de ${abs} electores${pct} respecto al padrón inicial.`;
  } else {
    return `Sin variación entre el padrón inicial y el dato final: ${mcp.etapaFinal?.toLocaleString("es-PE") ?? "—"} electores.`;
  }

  return null;
}

// ── Timeline step ─────────────────────────────────────────────────
function TimelineStep({
  etapa, valor, esReal, delta, esPrimero,
}: {
  etapa: string; valor: number | null; esReal: boolean; delta: number | null; esPrimero: boolean;
}) {
  const sinDato = valor === null;
  const deltaColor = delta === null ? GRIS : delta > 0 ? VERDE : delta < 0 ? ROJO : GRIS;
  const deltaLabel =
    delta === null ? null
    : delta > 0    ? `+${delta.toLocaleString("es-PE")}`
    :                delta.toLocaleString("es-PE");

  return (
    <div className="flex items-center">
      {!esPrimero && (
        <div className="flex flex-col items-center w-10 shrink-0">
          <div className="h-px w-full" style={{ background: "var(--border-mid)" }} />
          {deltaLabel && (
            <span className="text-[10px] font-semibold mt-0.5 tabular" style={{ color: deltaColor }}>
              {deltaLabel}
            </span>
          )}
        </div>
      )}
      <div className="flex flex-col items-center shrink-0">
        <div
          className="w-4 h-4 rounded-full border-2"
          style={{
            borderColor: sinDato ? "var(--border-subtle)" : AZUL,
            background: sinDato ? "var(--surface-0)" : esReal ? AZUL : "var(--surface-1)",
          }}
        />
        <span className="text-[10px] mt-1" style={{ color: "var(--text-muted)" }}>
          {ETAPA_LABEL[etapa] ?? etapa}
        </span>
        <span
          className="text-sm font-semibold mt-0.5 tabular"
          style={{ color: sinDato ? "var(--text-muted)" : "var(--text-primary)" }}
        >
          {sinDato ? "—" : valor!.toLocaleString("es-PE")}
        </span>
        {!sinDato && (
          <span
            className="text-[9px] mt-0.5 px-1.5 py-0.5 rounded-full font-semibold"
            style={
              esReal
                ? { background: AZUL, color: "#fff" }
                : { background: "var(--surface-0)", color: "var(--text-muted)", border: "1px solid var(--border-subtle)" }
            }
          >
            {esReal ? "real" : "arrastre"}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Ficha MCP ─────────────────────────────────────────────────────
function FichaMcp({ mcp, allMcps }: { mcp: Mcp; allMcps: Mcp[] }) {
  const [open, setOpen] = useState(true);
  const isAnterior = mcp.rolFila === "ANTERIOR";

  const vinculada = useMemo(() => {
    if (!mcp.idVinculo) return null;
    if (isAnterior)
      return allMcps.find((m) => m.codMcpReniec === mcp.idVinculo && m.rolFila !== "ANTERIOR") ?? null;
    return allMcps.find((m) => m.codMcpReniec === mcp.idVinculo && m.rolFila === "ANTERIOR") ?? null;
  }, [mcp, allMcps, isAnterior]);

  const deltas: (number | null)[] = ETAPAS_ORDEN.map((etapa, i) => {
    if (i === 0) return null;
    const actual   = etapaValue(mcp, etapa);
    const anterior = etapaValue(mcp, ETAPAS_ORDEN[i - 1]);
    if (actual === null || anterior === null) return null;
    return actual - anterior;
  });

  const etapasConValor = ETAPAS_ORDEN.filter((e) => etapaValue(mcp, e) !== null);
  const trajTrace: Data[] = [
    {
      type: "scatter",
      mode: "lines+markers",
      x: etapasConValor,
      y: etapasConValor.map((e) => etapaValue(mcp, e)),
      line: { color: AZUL, width: 2.5 },
      marker: {
        size: 10,
        color: etapasConValor.map((e) => (esEtapaReal(mcp, e) ? AZUL : AZUL_MED)),
        symbol: etapasConValor.map((e) => (esEtapaReal(mcp, e) ? "circle" : "circle-open")),
        line: { color: AZUL, width: 2 },
      },
      showlegend: false,
    },
  ];

  if (isAnterior) {
    return (
      <div className="ficha-card" style={{ borderColor: "#d97706", borderLeftWidth: 3, borderLeftColor: "#d97706" }}>
        <div
          className="ficha-card__header"
          style={{ background: "#fffbeb", borderBottomColor: "#fde68a" }}
          onClick={() => setOpen(!open)}
        >
          <span style={{ fontSize: "1.1rem" }}>🕰️</span>
          <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{mcp.mcp}</span>
          <span
            className="text-xs font-semibold px-2 py-0.5 rounded-full"
            style={{ background: "#fde68a", color: "#92400e" }}
          >
            Identidad anterior
          </span>
          <span className="ml-auto text-sm" style={{ color: "var(--text-muted)" }}>{open ? "▲" : "▼"}</span>
        </div>
        {open && (
          <div className="ficha-card__body">
            <p className="text-sm mb-3" style={{ color: "#92400e" }}>
              Esta identidad ya no está vigente. Su padrón final está registrado bajo otra MCP.
            </p>
            {vinculada && (
              <div className="metric-tile mb-3">
                <p className="metric-tile__label">MCP vigente vinculada</p>
                <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{vinculada.mcp}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>
                  {vinculada.departamento} › {vinculada.provincia} · cód. {vinculada.codMcpReniec}
                </p>
                <p className="text-xs mt-0.5 tabular" style={{ color: "var(--text-secondary)" }}>
                  {vinculada.etapaFinal?.toLocaleString("es-PE")} electores (final)
                </p>
              </div>
            )}
            {mcp.descripcionCaso && (
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                <strong>Descripción:</strong> {mcp.descripcionCaso}
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  const varColor =
    mcp.variacionAbs === null ? GRIS : mcp.variacionAbs >= 0 ? VERDE : ROJO;

  return (
    <div className="ficha-card">
      <div className="ficha-card__header" onClick={() => setOpen(!open)}>
        <div className="flex-1 min-w-0">
          <p className="font-semibold truncate" style={{ color: "var(--text-primary)" }}>{mcp.mcp}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            {mcp.departamento} › {mcp.provincia} › {mcp.distrito}
            <span className="ml-2 font-mono">{mcp.codMcpReniec}</span>
          </p>
        </div>
        <span className="text-sm" style={{ color: "var(--text-muted)" }}>{open ? "▲" : "▼"}</span>
      </div>

      {open && (
        <div className="ficha-card__body">
          {/* Timeline */}
          <div className="mb-5">
            <p className="text-[10px] font-bold tracking-widest uppercase mb-3" style={{ color: "var(--text-muted)" }}>
              Trayectoria de electores
            </p>
            <div className="flex items-start overflow-x-auto pb-2">
              {ETAPAS_ORDEN.map((etapa, i) => (
                <TimelineStep
                  key={etapa}
                  etapa={etapa}
                  valor={etapaValue(mcp, etapa)}
                  esReal={esEtapaReal(mcp, etapa)}
                  delta={deltas[i]}
                  esPrimero={i === 0}
                />
              ))}
            </div>
            <div className="flex items-center gap-4 mt-3">
              <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                <span className="w-3 h-3 rounded-full inline-block" style={{ background: AZUL }} />
                Envío real
              </span>
              <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                <span className="w-3 h-3 rounded-full border-2 inline-block" style={{ borderColor: AZUL_MED }} />
                Arrastre
              </span>
            </div>
          </div>

          {/* Mini chart */}
          {etapasConValor.length > 1 && (
            <PlotlyChart
              data={trajTrace}
              height={200}
              layout={{
                xaxis: { categoryorder: "array", categoryarray: ETAPAS_ORDEN as unknown as string[] },
                yaxis: { title: { text: "Electores" } },
                margin: { t: 10, b: 30, l: 70, r: 20 },
              }}
            />
          )}

          {/* Metric tiles */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 mb-4">
            <div className="metric-tile">
              <p className="metric-tile__label">Electores finales</p>
              <p className="metric-tile__value">
                {mcp.etapaFinal?.toLocaleString("es-PE") ?? "—"}
              </p>
            </div>
            <div className="metric-tile">
              <p className="metric-tile__label">Variación Feb → Final</p>
              <p className="metric-tile__value" style={{ color: varColor }}>
                {mcp.variacionAbs === null
                  ? "—"
                  : `${mcp.variacionAbs >= 0 ? "+" : ""}${mcp.variacionAbs.toLocaleString("es-PE")}`}
              </p>
              {mcp.variacionPct !== null && (
                <p className="text-xs mt-0.5" style={{ color: varColor }}>
                  {mcp.variacionPct >= 0 ? "+" : ""}{mcp.variacionPct.toFixed(1)} %
                </p>
              )}
            </div>
            <div className="metric-tile">
              <p className="metric-tile__label">Rondas con envío real</p>
              <p className="metric-tile__value">{mcp.nCorrecciones}</p>
            </div>
            <div className="metric-tile">
              <p className="metric-tile__label">Dato final tomado de</p>
              <p className="text-sm font-semibold break-words mt-1" style={{ color: "var(--text-primary)" }}>
                {mcp.carpetaOrigen ?? "—"}
              </p>
            </div>
          </div>

          {/* Identidad */}
          <div className="rounded-md p-3 text-sm mb-3" style={{ background: "var(--surface-0)", border: "1px solid var(--border-subtle)" }}>
            <p className="text-[10px] font-bold tracking-widest uppercase mb-2" style={{ color: "var(--text-muted)" }}>
              Identidad
            </p>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
              <span style={{ color: "var(--text-muted)" }}>Rol</span>
              <span className="font-medium" style={{ color: "var(--text-primary)" }}>{mcp.rolFila}</span>
              <span style={{ color: "var(--text-muted)" }}>UBIGEO</span>
              <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{mcp.ubigeo ?? "—"}</span>
              {mcp.clasificacionHistorica && (
                <>
                  <span style={{ color: "var(--text-muted)" }}>Clasificación</span>
                  <span style={{ color: "var(--text-secondary)" }}>{mcp.clasificacionHistorica}</span>
                </>
              )}
              {vinculada && (
                <>
                  <span style={{ color: "var(--text-muted)" }}>Identidad anterior</span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    {vinculada.mcp}
                    <span className="font-mono text-xs ml-1" style={{ color: "var(--text-muted)" }}>
                      ({vinculada.codMcpReniec})
                    </span>
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Nota */}
          {buildNota(mcp) && (
            <div className="rounded-md px-3 py-2.5 text-sm" style={{ background: "var(--blue-ghost)", border: "1px solid var(--blue-pale)" }}>
              <p className="font-semibold mb-0.5" style={{ color: "var(--blue-brand)" }}>Nota</p>
              <p style={{ color: "var(--text-secondary)" }}>{buildNota(mcp)}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tabla filtrable ───────────────────────────────────────────────
function TablaCompleta({ mcps }: { mcps: Mcp[] }) {
  const [depto, setDepto]     = useState("(Todos)");
  const [carpeta, setCarpeta] = useState("(Todas)");

  const deptos   = useMemo(() => ["(Todos)", ...Array.from(new Set(mcps.map((m) => m.departamento).filter(Boolean))).sort()], [mcps]);
  const carpetas = useMemo(() => ["(Todas)", ...Array.from(new Set(mcps.map((m) => m.carpetaOrigen ?? "Sin datos"))).sort()], [mcps]);

  const filtered = useMemo(() => {
    let r = mcps;
    if (depto   !== "(Todos)") r = r.filter((m) => m.departamento === depto);
    if (carpeta !== "(Todas)") r = r.filter((m) => (m.carpetaOrigen ?? "Sin datos") === carpeta);
    return r;
  }, [mcps, depto, carpeta]);

  function toCSV() {
    const header = ["Departamento","Provincia","Distrito","MCP","Código","Febrero","Abril","Junio","Julio","Agosto","Final","Variación","Var%","Carpeta origen","Fuente final","Rol"];
    const lines  = filtered.map((m) => [
      m.departamento, m.provincia, m.distrito, m.mcp, m.codMcpReniec,
      m.etapaFebrero, m.etapaAbril, m.etapaJunio, m.etapaJulio, m.etapaAgosto, m.etapaFinal,
      m.variacionAbs, m.variacionPct?.toFixed(1), m.carpetaOrigen, m.fuenteResultadoFinal, m.rolFila,
    ]);
    const csv = [header, ...lines].map((r) => r.map((v) => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href = url; a.download = "mcp_trazabilidad.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const selectStyle = {
    border: "1px solid var(--border-subtle)",
    borderRadius: "var(--radius-sm)",
    padding: "0.4rem 0.75rem",
    fontSize: "0.82rem",
    color: "var(--text-secondary)",
    background: "var(--surface-1)",
    outline: "none",
  };

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-3 items-center">
        <select style={selectStyle} value={depto}   onChange={(e) => setDepto(e.target.value)}>
          {deptos.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select style={selectStyle} value={carpeta} onChange={(e) => setCarpeta(e.target.value)}>
          {carpetas.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button className="btn-primary ml-auto" onClick={toCSV}>
          ↓ Descargar .csv
        </button>
      </div>
      <p className="text-xs mb-2" style={{ color: "var(--text-muted)" }}>
        {filtered.length.toLocaleString("es-PE")} MCPs
      </p>
      <div className="overflow-auto max-h-[480px] rounded-lg" style={{ border: "1px solid var(--border-subtle)" }}>
        <table className="data-table">
          <thead>
            <tr>
              {["Departamento","Provincia","Distrito","MCP","Código","Feb.","Abr.","Jun.","Jul.","Ago.","Final","Var. abs.","Var. %","Carpeta origen"].map((h) => (
                <th key={h}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.cod ?? m.mcp}>
                <td>{m.departamento}</td>
                <td>{m.provincia}</td>
                <td>{m.distrito}</td>
                <td>{m.mcp}</td>
                <td className="font-mono text-xs">{m.codMcpReniec}</td>
                <td className="text-right tabular">{m.etapaFebrero?.toLocaleString("es-PE") ?? "—"}</td>
                <td className="text-right tabular">{m.etapaAbril?.toLocaleString("es-PE")   ?? "—"}</td>
                <td className="text-right tabular">{m.etapaJunio?.toLocaleString("es-PE")   ?? "—"}</td>
                <td className="text-right tabular">{m.etapaJulio?.toLocaleString("es-PE")   ?? "—"}</td>
                <td className="text-right tabular">{m.etapaAgosto?.toLocaleString("es-PE")  ?? "—"}</td>
                <td className="text-right tabular font-semibold" style={{ color: "var(--text-primary)" }}>
                  {m.etapaFinal?.toLocaleString("es-PE") ?? "—"}
                </td>
                <td className="text-right tabular" style={{ color: (m.variacionAbs ?? 0) >= 0 ? VERDE : ROJO }}>
                  {m.variacionAbs === null ? "—" : `${m.variacionAbs >= 0 ? "+" : ""}${m.variacionAbs.toLocaleString("es-PE")}`}
                </td>
                <td className="text-right tabular" style={{ color: (m.variacionPct ?? 0) >= 0 ? VERDE : ROJO }}>
                  {m.variacionPct === null ? "—" : `${m.variacionPct >= 0 ? "+" : ""}${m.variacionPct.toFixed(1)} %`}
                </td>
                <td className="text-xs">{m.carpetaOrigen ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Componente raíz ───────────────────────────────────────────────
interface Props {
  allMcps: Mcp[];
  vigentes: Mcp[];
}

export default function FichaSearch({ allMcps, vigentes }: Props) {
  const [query,    setQuery]    = useState("");
  const [selected, setSelected] = useState<Mcp | null>(null);

  const sugerencias = useMemo(() => {
    if (query.trim().length < 2) return [];
    const q = query.toLowerCase();
    return allMcps
      .filter(
        (m) =>
          m.mcp?.toLowerCase().includes(q) ||
          m.codMcpReniec?.includes(q) ||
          m.departamento?.toLowerCase().includes(q)
      )
      .slice(0, 10);
  }, [allMcps, query]);

  return (
    <div>
      {/* Search */}
      <div className="relative mb-6 max-w-xl">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="var(--text-muted)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="text"
          placeholder="Buscar MCP por nombre, código o departamento…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
          className="search-input"
        />
        {sugerencias.length > 0 && !selected && (
          <div className="dropdown absolute z-10 mt-1 w-full max-h-72 overflow-y-auto">
            {sugerencias.map((m) => (
              <div
                key={m.codMcpReniec ?? m.mcp}
                className="dropdown-item"
                onClick={() => { setSelected(m); setQuery(m.mcp ?? ""); }}
              >
                <span className="shrink-0 mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {m.rolFila === "ANTERIOR" ? "🕰️" : "📍"}
                </span>
                <div>
                  <p className="font-medium text-sm" style={{ color: "var(--text-primary)" }}>{m.mcp}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {m.departamento} › {m.provincia} · {m.codMcpReniec}
                    {m.rolFila === "ANTERIOR" && " · Identidad anterior"}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Ficha */}
      {selected && <FichaMcp mcp={selected} allMcps={allMcps} />}

      {/* Tabla */}
      <div className="mt-8">
        <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--text-muted)" }}>
          Tabla de trazabilidad
        </p>
        <TablaCompleta mcps={vigentes} />
      </div>
    </div>
  );
}
