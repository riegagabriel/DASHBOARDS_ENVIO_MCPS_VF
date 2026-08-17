"use client";

import { useMemo, useState } from "react";
import type { Data } from "plotly.js";
import PlotlyChart from "@/components/PlotlyChart";
import type { Etapa, Mcp } from "@/lib/types";
import { ETAPAS_ORDEN, } from "@/lib/types";
import { esEtapaReal, etapaValue, uniqueSorted } from "@/lib/data";

const RENIEC_AZUL = "#002F56";

const ESTADO_BADGE: Record<string, string> = {
  "SIN ERROR": "🟢",
  SUBSANADO: "🔵",
  PENDIENTE: "🔴",
};

const TIMELINE_BG: Record<string, string> = {
  PRIMERA: "#D5E8D4",
  SIN_CAMBIO: "#EAEAEA",
  SUBIO: "#D5E8D4",
  BAJO: "#FFE6CC",
  SIN_DATO: "#F5F5F5",
};

interface TimelineRow {
  etapa: Etapa;
  cantidad: string;
  origen: string;
  estadoLabel: string;
  estadoKey: string;
}

function buildTimeline(m: Mcp): TimelineRow[] {
  const rows: TimelineRow[] = [];
  let prev: number | null = null;
  for (const etapa of ETAPAS_ORDEN) {
    const valor = etapaValue(m, etapa);
    if (valor === null) {
      rows.push({ etapa, cantidad: "—", origen: "—", estadoLabel: "⬜ Sin dato", estadoKey: "SIN_DATO" });
      continue;
    }
    const esReal = esEtapaReal(m, etapa);
    const origen = esReal ? "Dato real" : "Arrastrado (sin cambio)";
    let estadoLabel: string;
    let estadoKey: string;
    if (prev === null) {
      estadoLabel = "🟢 Primera aparición";
      estadoKey = "PRIMERA";
    } else if (valor === prev) {
      estadoLabel = "⬜ Sin cambio";
      estadoKey = "SIN_CAMBIO";
    } else if (valor > prev) {
      estadoLabel = "🟢 Subió";
      estadoKey = "SUBIO";
    } else {
      estadoLabel = "🟠 Bajó";
      estadoKey = "BAJO";
    }
    rows.push({ etapa, cantidad: valor.toLocaleString("es-PE"), origen, estadoLabel, estadoKey });
    prev = valor;
  }
  return rows;
}

function ResultCard({ mcp, allMcps }: { mcp: Mcp; allMcps: Mcp[] }) {
  if (mcp.rolFila === "ANTERIOR") {
    const vigente = allMcps.find((m) => m.idVinculo === mcp.idVinculo && m.rolFila === "VIGENTE");
    return (
      <details className="rounded-lg border border-slate-200 mb-3 open:shadow-sm" open>
        <summary className="cursor-pointer px-4 py-3 font-medium text-slate-800">
          🕰️ {mcp.departamento} › {mcp.provincia} › <strong>{mcp.mcp}</strong> — IDENTIDAD ANTERIOR (reclasificada)
        </summary>
        <div className="px-4 pb-4">
          <div className="rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2 mb-3">
            ⚠️ Esta es una <strong>identidad anterior</strong> — ya no está vigente. El resultado final real
            está bajo otra identidad:
          </div>
          {vigente && (
            <div className="grid grid-cols-2 gap-4 mb-3">
              <div>
                <p className="text-sm text-slate-500">MCP vigente</p>
                <p className="text-xl font-semibold">{vigente.mcp}</p>
                <p className="text-xs text-slate-500">
                  {vigente.departamento} › {vigente.provincia} › {vigente.distrito} — código {vigente.codMcpReniec}
                </p>
              </div>
              <div>
                <p className="text-sm text-slate-500">Electores finales</p>
                <p className="text-xl font-semibold">{vigente.etapaFinal?.toLocaleString("es-PE") ?? "—"}</p>
                <p className="text-xs text-slate-500">Fuente: {vigente.fuenteResultadoFinal}</p>
              </div>
            </div>
          )}
          {(mcp.descripcionCaso || mcp.nota) && (
            <div>
              <h4 className="text-sm font-semibold mb-1">Cómo se llegó a esta conclusión</h4>
              <p className="text-sm text-slate-700">{mcp.descripcionCaso ?? mcp.nota}</p>
            </div>
          )}
        </div>
      </details>
    );
  }

  const timeline = buildTimeline(mcp);
  const trajData: Data[] = [
    {
      type: "scatter",
      mode: "lines+markers",
      x: ETAPAS_ORDEN as unknown as string[],
      y: ETAPAS_ORDEN.map((e) => etapaValue(mcp, e)),
      line: { color: RENIEC_AZUL, width: 2 },
      marker: {
        size: 8,
        symbol: ETAPAS_ORDEN.map((e) => (esEtapaReal(mcp, e) ? "circle" : "circle-open")),
      },
    },
  ];

  const descripcionLarga = mcp.descripcionCaso && mcp.descripcionCaso.length > 100 ? mcp.descripcionCaso : null;

  return (
    <details className="rounded-lg border border-slate-200 mb-3 open:shadow-sm" open>
      <summary className="cursor-pointer px-4 py-3 font-medium text-slate-800">
        {ESTADO_BADGE[mcp.estadoError]} {mcp.departamento} › {mcp.provincia} › <strong>{mcp.mcp}</strong> —{" "}
        {mcp.estadoError}
      </summary>
      <div className="px-4 pb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-3">
          <div>
            <p className="text-sm text-slate-500">Electores finales</p>
            <p className="text-xl font-semibold">{mcp.etapaFinal?.toLocaleString("es-PE") ?? "—"}</p>
          </div>
          <div>
            <p className="text-sm text-slate-500">Variación vs. febrero</p>
            <p className="text-xl font-semibold">{mcp.variacionAbs?.toLocaleString("es-PE") ?? "—"}</p>
            {mcp.variacionPct !== null && <p className="text-xs text-slate-500">{mcp.variacionPct.toFixed(1)} %</p>}
          </div>
          <div>
            <p className="text-sm text-slate-500">Estado de error</p>
            <p className="text-xl font-semibold">{mcp.estadoError}</p>
          </div>
        </div>

        {mcp.estadoError !== "SIN ERROR" && (
          <div className="rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2 mb-3">
            ⚠️ <strong>Causa:</strong> {mcp.causa}
            {mcp.estadoError === "PENDIENTE" && mcp.errorPendienteDetalle && (
              <p className="mt-1">
                <strong>Detalle:</strong> {mcp.errorPendienteDetalle}
              </p>
            )}
          </div>
        )}

        {descripcionLarga && (
          <div className="rounded-md bg-sky-50 border border-sky-200 text-sky-800 text-sm px-3 py-2 mb-3">
            📋 <strong>Caso especial:</strong> {descripcionLarga}
          </div>
        )}

        <h4 className="text-sm font-semibold mb-1 mt-4">Trayectoria de electores por etapa</h4>
        <PlotlyChart data={trajData} height={240} layout={{ showlegend: false, margin: { t: 10, b: 30, l: 50, r: 20 } }} />

        <table className="w-full text-sm mt-3">
          <thead className="bg-slate-50 text-left text-slate-600">
            <tr>
              <th className="px-3 py-1.5">Etapa</th>
              <th className="px-3 py-1.5">Cantidad</th>
              <th className="px-3 py-1.5">Origen</th>
              <th className="px-3 py-1.5">Estado</th>
            </tr>
          </thead>
          <tbody>
            {timeline.map((row) => (
              <tr key={row.etapa} style={{ backgroundColor: TIMELINE_BG[row.estadoKey] }}>
                <td className="px-3 py-1.5">{row.etapa}</td>
                <td className="px-3 py-1.5">{row.cantidad}</td>
                <td className="px-3 py-1.5">{row.origen}</td>
                <td className="px-3 py-1.5">{row.estadoLabel}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

export default function FichaSearch({ allMcps, pendientesMuestra }: { allMcps: Mcp[]; pendientesMuestra: Mcp[] }) {
  const [busqueda, setBusqueda] = useState("");
  const [codBusq, setCodBusq] = useState("");
  const [depto, setDepto] = useState("(Todos)");
  const [provincia, setProvincia] = useState("(Todas)");

  const deptos = useMemo(() => ["(Todos)", ...uniqueSorted(allMcps.map((m) => m.departamento))], [allMcps]);
  const provincias = useMemo(
    () =>
      depto === "(Todos)"
        ? []
        : ["(Todas)", ...uniqueSorted(allMcps.filter((m) => m.departamento === depto).map((m) => m.provincia))],
    [allMcps, depto]
  );

  const hayFiltroGeo = depto !== "(Todos)";
  const hayBusqueda = busqueda.trim() !== "" || codBusq.trim() !== "" || hayFiltroGeo;

  const resultados = useMemo(() => {
    if (!hayBusqueda) return [];
    let rows = allMcps;
    if (busqueda.trim()) {
      const q = busqueda.trim().toUpperCase();
      rows = rows.filter((m) => m.mcp?.includes(q));
    }
    if (codBusq.trim()) {
      rows = rows.filter((m) => m.codMcpReniec?.includes(codBusq.trim()));
    }
    if (depto !== "(Todos)") {
      rows = rows.filter((m) => m.departamento === depto);
      if (provincia !== "(Todas)") rows = rows.filter((m) => m.provincia === provincia);
    }
    return rows;
  }, [allMcps, busqueda, codBusq, depto, provincia, hayBusqueda]);

  return (
    <div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Nombre de MCP</label>
          <input
            className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm"
            placeholder="Ej: CHOMZA ALTA"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Código RENIEC</label>
          <input
            className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm"
            placeholder="Ej: 010201100"
            value={codBusq}
            onChange={(e) => setCodBusq(e.target.value)}
          />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div>
          <label className="block text-xs text-slate-500 mb-1">Departamento</label>
          <select
            className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm"
            value={depto}
            onChange={(e) => {
              setDepto(e.target.value);
              setProvincia("(Todas)");
            }}
          >
            {deptos.map((d) => (
              <option key={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-slate-500 mb-1">Provincia</label>
          <select
            className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm disabled:opacity-50"
            value={provincia}
            disabled={depto === "(Todos)"}
            onChange={(e) => setProvincia(e.target.value)}
          >
            {provincias.map((p) => (
              <option key={p}>{p}</option>
            ))}
          </select>
        </div>
      </div>

      {hayBusqueda ? (
        resultados.length === 0 ? (
          <p className="rounded-md bg-amber-50 border border-amber-200 text-amber-800 text-sm px-3 py-2">
            No se encontraron MCPs con esos criterios.
          </p>
        ) : (
          <>
            <p className="rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm px-3 py-2 mb-3">
              {resultados.length} resultado(s)
            </p>
            {resultados.map((m) => (
              <ResultCard key={`${m.rolFila}-${m.cod ?? m.mcp}-${m.idVinculo}`} mcp={m} allMcps={allMcps} />
            ))}
          </>
        )
      ) : (
        <div>
          <p className="rounded-md bg-sky-50 border border-sky-200 text-sky-800 text-sm px-3 py-2 mb-4">
            Ingresa un nombre, código, o elige un departamento/provincia para buscar.
          </p>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">MCPs con error pendiente — muestra</h2>
          <div className="overflow-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  {["Departamento", "Provincia", "MCP", "Código", "Final", "Causa"].map((h) => (
                    <th key={h} className="px-3 py-2">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pendientesMuestra.map((m) => (
                  <tr key={m.cod} className="border-t border-slate-100">
                    <td className="px-3 py-1.5">{m.departamento}</td>
                    <td className="px-3 py-1.5">{m.provincia}</td>
                    <td className="px-3 py-1.5">{m.mcp}</td>
                    <td className="px-3 py-1.5">{m.codMcpReniec}</td>
                    <td className="px-3 py-1.5 text-right">{m.etapaFinal?.toLocaleString("es-PE")}</td>
                    <td className="px-3 py-1.5">{m.causa}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
