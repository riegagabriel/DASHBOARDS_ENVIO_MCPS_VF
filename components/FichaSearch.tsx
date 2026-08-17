"use client";

import { useState, useMemo } from "react";
import type { Mcp } from "@/lib/types";
import { etapaValue, esEtapaReal } from "@/lib/data";
import { ETAPAS_ORDEN } from "@/lib/types";
import PlotlyChart from "@/components/PlotlyChart";
import type { Data } from "plotly.js";

const AZUL      = "#002F56";
const AZUL_MED  = "#2E6F9E";
const VERDE     = "#27AE60";
const ROJO      = "#C0392B";
const GRIS      = "#94A3B8";

const ETAPA_LABEL: Record<string, string> = {
  FEBRERO: "Feb.",
  ABRIL:   "Abr.",
  JUNIO:   "Jun.",
  FINAL:   "Final",
};

// ── Timeline visual ───────────────────────────────────────────────
function TimelineStep({
  etapa,
  valor,
  esReal,
  delta,
  esPrimero,
}: {
  etapa: string;
  valor: number | null;
  esReal: boolean;
  delta: number | null;
  esPrimero: boolean;
}) {
  const sinDato = valor === null;
  const deltaColor = delta === null ? GRIS : delta > 0 ? VERDE : delta < 0 ? ROJO : GRIS;
  const deltaLabel =
    delta === null ? null
    : delta > 0 ? `+${delta.toLocaleString("es-PE")}`
    : delta.toLocaleString("es-PE");

  return (
    <div className="flex items-center">
      {!esPrimero && (
        <div className="flex flex-col items-center w-12 shrink-0">
          <div className="h-px w-full bg-slate-300" />
          {deltaLabel && (
            <span className="text-xs font-semibold mt-0.5" style={{ color: deltaColor }}>
              {deltaLabel}
            </span>
          )}
        </div>
      )}
      <div className="flex flex-col items-center shrink-0">
        <div
          className={`w-4 h-4 rounded-full border-2 ${
            sinDato
              ? "border-slate-300 bg-white"
              : esReal
              ? "border-[#002F56] bg-[#002F56]"
              : "border-[#2E6F9E] bg-white"
          }`}
        />
        <span className="text-xs text-slate-500 mt-1">{ETAPA_LABEL[etapa]}</span>
        <span
          className={`text-sm font-semibold mt-0.5 ${
            sinDato ? "text-slate-400" : "text-slate-900"
          }`}
        >
          {sinDato ? "—" : valor!.toLocaleString("es-PE")}
        </span>
        {!sinDato && (
          <span
            className={`text-[10px] mt-0.5 px-1.5 py-0.5 rounded-full ${
              esReal
                ? "bg-[#002F56] text-white"
                : "bg-slate-100 text-slate-500"
            }`}
          >
            {esReal ? "envío real" : "arrastre"}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Ficha principal ───────────────────────────────────────────────
function FichaMcp({ mcp, allMcps }: { mcp: Mcp; allMcps: Mcp[] }) {
  const isAnterior = mcp.rolFila === "ANTERIOR";

  // MCP vinculada (para ANTERIOR busca la vigente; para VIGENTE busca la anterior)
  const vinculada = useMemo(() => {
    if (isAnterior && mcp.idVinculo) {
      return allMcps.find((m) => m.codMcpReniec === mcp.idVinculo && m.rolFila !== "ANTERIOR") ?? null;
    }
    if (!isAnterior && mcp.idVinculo) {
      return allMcps.find((m) => m.codMcpReniec === mcp.idVinculo && m.rolFila === "ANTERIOR") ?? null;
    }
    return null;
  }, [mcp, allMcps, isAnterior]);

  // Deltas entre etapas
  const deltas: (number | null)[] = ETAPAS_ORDEN.map((etapa, i) => {
    if (i === 0) return null;
    const actual = etapaValue(mcp, etapa);
    const anterior = etapaValue(mcp, ETAPAS_ORDEN[i - 1]);
    if (actual === null || anterior === null) return null;
    return actual - anterior;
  });

  // Gráfico de trayectoria (solo etapas con valor)
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
      <details className="rounded-xl border border-amber-200 bg-amber-50 mb-4 open:shadow-sm" open>
        <summary className="cursor-pointer px-5 py-4 font-semibold text-slate-800 flex items-center gap-2">
          <span className="text-lg">🕰️</span>
          <span>{mcp.mcp}</span>
          <span className="ml-2 text-xs font-medium bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
            Identidad anterior (reclasificada)
          </span>
        </summary>
        <div className="px-5 pb-5">
          <p className="text-sm text-amber-800 mb-3">
            Esta identidad ya no está vigente. Su padrón final está registrado bajo otra MCP.
          </p>
          {vinculada && (
            <div className="rounded-lg bg-white border border-slate-200 p-4 mb-3">
              <p className="text-xs text-slate-500 mb-1">MCP vigente vinculada</p>
              <p className="font-semibold text-slate-900">{vinculada.mcp}</p>
              <p className="text-sm text-slate-500">
                {vinculada.departamento} › {vinculada.provincia} › {vinculada.distrito}
              </p>
              <p className="text-sm text-slate-500 mt-1">
                Código: {vinculada.codMcpReniec} · {vinculada.etapaFinal?.toLocaleString("es-PE")} electores
              </p>
            </div>
          )}
          {mcp.descripcionCaso && (
            <p className="text-sm text-slate-700 mt-2">
              <strong>Descripción:</strong> {mcp.descripcionCaso}
            </p>
          )}
        </div>
      </details>
    );
  }

  return (
    <details className="rounded-xl border border-slate-200 mb-4 open:shadow-sm" open>
      <summary className="cursor-pointer px-5 py-4 font-semibold text-slate-800 flex items-center gap-2 flex-wrap">
        <span>{mcp.mcp}</span>
        <span className="text-slate-400 font-normal text-sm">
          {mcp.departamento} › {mcp.provincia} › {mcp.distrito}
        </span>
        <span className="text-xs text-slate-400 font-mono">{mcp.codMcpReniec}</span>
      </summary>

      <div className="px-5 pb-5">
        {/* Timeline */}
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
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
          <div className="flex items-center gap-4 mt-3 text-xs text-slate-500">
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full bg-[#002F56] inline-block" /> Envío real
            </span>
            <span className="flex items-center gap-1">
              <span className="w-3 h-3 rounded-full border-2 border-[#2E6F9E] bg-white inline-block" /> Arrastre de etapa anterior
            </span>
          </div>
        </div>

        {/* Gráfico */}
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

        {/* Métricas rápidas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4 mb-4">
          <div className="rounded-lg bg-slate-50 px-3 py-2.5">
            <p className="text-xs text-slate-500">Electores finales</p>
            <p className="text-xl font-semibold text-slate-900">
              {mcp.etapaFinal?.toLocaleString("es-PE") ?? "—"}
            </p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2.5">
            <p className="text-xs text-slate-500">Variación Feb → Final</p>
            <p
              className="text-xl font-semibold"
              style={{ color: mcp.variacionAbs === null ? GRIS : mcp.variacionAbs >= 0 ? VERDE : ROJO }}
            >
              {mcp.variacionAbs === null
                ? "—"
                : `${mcp.variacionAbs >= 0 ? "+" : ""}${mcp.variacionAbs.toLocaleString("es-PE")}`}
            </p>
            {mcp.variacionPct !== null && (
              <p className="text-xs text-slate-500">{mcp.variacionPct >= 0 ? "+" : ""}{mcp.variacionPct.toFixed(1)} %</p>
            )}
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2.5">
            <p className="text-xs text-slate-500">Rondas con envío real</p>
            <p className="text-xl font-semibold text-slate-900">{mcp.nCorrecciones}</p>
          </div>
          <div className="rounded-lg bg-slate-50 px-3 py-2.5">
            <p className="text-xs text-slate-500">Dato final tomado de</p>
            <p className="text-sm font-semibold text-slate-900 break-words">{mcp.carpetaOrigen ?? "—"}</p>
          </div>
        </div>

        {/* Identidad */}
        <div className="rounded-lg border border-slate-200 p-3 text-sm text-slate-700 mb-3">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Identidad</p>
          <div className="grid grid-cols-2 gap-x-4 gap-y-1">
            <span className="text-slate-500">Rol</span>
            <span className="font-medium">{mcp.rolFila}</span>
            <span className="text-slate-500">UBIGEO</span>
            <span className="font-mono">{mcp.ubigeo ?? "—"}</span>
            {mcp.clasificacionHistorica && (
              <>
                <span className="text-slate-500">Clasificación</span>
                <span>{mcp.clasificacionHistorica}</span>
              </>
            )}
            {vinculada && (
              <>
                <span className="text-slate-500">Identidad anterior vinculada</span>
                <span>{vinculada.mcp} <span className="text-slate-400 font-mono text-xs">({vinculada.codMcpReniec})</span></span>
              </>
            )}
          </div>
        </div>

        {/* Nota o descripción */}
        {(mcp.descripcionCaso || mcp.nota) && (
          <div className="rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5 text-sm text-blue-900">
            <p className="font-semibold mb-0.5">Nota</p>
            <p>{mcp.descripcionCaso ?? mcp.nota}</p>
          </div>
        )}
      </div>
    </details>
  );
}

// ── Tabla filtrable ───────────────────────────────────────────────
function TablaCompleta({ mcps }: { mcps: Mcp[] }) {
  const [depto, setDepto] = useState("(Todos)");
  const [carpeta, setCarpeta] = useState("(Todas)");

  const deptos   = useMemo(() => ["(Todos)", ...Array.from(new Set(mcps.map((m) => m.departamento).filter(Boolean))).sort()], [mcps]);
  const carpetas = useMemo(() => ["(Todas)", ...Array.from(new Set(mcps.map((m) => m.carpetaOrigen ?? "Sin datos"))).sort()], [mcps]);

  const filtered = useMemo(() => {
    let r = mcps;
    if (depto !== "(Todos)") r = r.filter((m) => m.departamento === depto);
    if (carpeta !== "(Todas)") r = r.filter((m) => (m.carpetaOrigen ?? "Sin datos") === carpeta);
    return r;
  }, [mcps, depto, carpeta]);

  function toCSV() {
    const header = ["Departamento","Provincia","Distrito","MCP","Código","Febrero","Abril","Junio","Final","Variación","Var%","Carpeta origen","Rol"];
    const lines = filtered.map((m) => [
      m.departamento, m.provincia, m.distrito, m.mcp, m.codMcpReniec,
      m.etapaFebrero, m.etapaAbril, m.etapaJunio, m.etapaFinal,
      m.variacionAbs, m.variacionPct?.toFixed(1),
      m.carpetaOrigen, m.rolFila,
    ]);
    const csv = [header, ...lines].map((r) => r.map((v) => `"${v ?? ""}"`).join(",")).join("\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "mcp_trazabilidad.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap gap-3 mb-3">
        <select className="border border-slate-300 rounded-md px-3 py-1.5 text-sm" value={depto} onChange={(e) => setDepto(e.target.value)}>
          {deptos.map((d) => <option key={d}>{d}</option>)}
        </select>
        <select className="border border-slate-300 rounded-md px-3 py-1.5 text-sm" value={carpeta} onChange={(e) => setCarpeta(e.target.value)}>
          {carpetas.map((c) => <option key={c}>{c}</option>)}
        </select>
        <button onClick={toCSV} className="ml-auto text-sm font-medium bg-[#002F56] text-white rounded-md px-4 py-1.5 hover:bg-[#00396b]">
          ⬇ Descargar .csv
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-2">{filtered.length.toLocaleString("es-PE")} MCPs</p>
      <div className="overflow-auto max-h-[480px] rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600 sticky top-0">
            <tr>
              {["Departamento","Provincia","MCP","Código","Feb.","Abr.","Jun.","Final","Var. abs.","Var. %","Carpeta origen"].map((h) => (
                <th key={h} className="px-3 py-2 whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.cod ?? m.mcp} className="border-t border-slate-100">
                <td className="px-3 py-1.5 whitespace-nowrap">{m.departamento}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{m.provincia}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{m.mcp}</td>
                <td className="px-3 py-1.5 font-mono text-xs">{m.codMcpReniec}</td>
                <td className="px-3 py-1.5 text-right">{m.etapaFebrero?.toLocaleString("es-PE") ?? "—"}</td>
                <td className="px-3 py-1.5 text-right">{m.etapaAbril?.toLocaleString("es-PE") ?? "—"}</td>
                <td className="px-3 py-1.5 text-right">{m.etapaJunio?.toLocaleString("es-PE") ?? "—"}</td>
                <td className="px-3 py-1.5 text-right font-semibold">{m.etapaFinal?.toLocaleString("es-PE") ?? "—"}</td>
                <td className="px-3 py-1.5 text-right" style={{ color: (m.variacionAbs ?? 0) >= 0 ? VERDE : ROJO }}>
                  {m.variacionAbs === null ? "—" : `${m.variacionAbs >= 0 ? "+" : ""}${m.variacionAbs.toLocaleString("es-PE")}`}
                </td>
                <td className="px-3 py-1.5 text-right" style={{ color: (m.variacionPct ?? 0) >= 0 ? VERDE : ROJO }}>
                  {m.variacionPct === null ? "—" : `${m.variacionPct >= 0 ? "+" : ""}${m.variacionPct.toFixed(1)} %`}
                </td>
                <td className="px-3 py-1.5 text-xs whitespace-nowrap">{m.carpetaOrigen ?? "—"}</td>
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
  const [query, setQuery] = useState("");
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
      {/* Buscador */}
      <div className="relative mb-6 max-w-xl">
        <input
          type="text"
          placeholder="Buscar MCP por nombre, código o departamento…"
          value={query}
          onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
          className="w-full border border-slate-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#002F56]"
        />
        {sugerencias.length > 0 && !selected && (
          <ul className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-72 overflow-y-auto text-sm">
            {sugerencias.map((m) => (
              <li
                key={m.codMcpReniec ?? m.mcp}
                className="px-4 py-2.5 cursor-pointer hover:bg-slate-50 flex items-start gap-2"
                onClick={() => { setSelected(m); setQuery(m.mcp ?? ""); }}
              >
                <span className="shrink-0 text-slate-400 mt-0.5">
                  {m.rolFila === "ANTERIOR" ? "🕰️" : "📍"}
                </span>
                <div>
                  <p className="font-medium text-slate-900">{m.mcp}</p>
                  <p className="text-xs text-slate-500">
                    {m.departamento} › {m.provincia} · {m.codMcpReniec}
                    {m.rolFila === "ANTERIOR" && " · Identidad anterior"}
                  </p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Ficha */}
      {selected && <FichaMcp mcp={selected} allMcps={allMcps} />}

      {/* Tabla completa */}
      <div className="mt-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-3">Tabla de trazabilidad</h2>
        <TablaCompleta mcps={vigentes} />
      </div>
    </div>
  );
}
