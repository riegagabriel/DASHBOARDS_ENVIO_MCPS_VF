"use client";

import { useMemo, useState } from "react";
import type { Data } from "plotly.js";
import PlotlyChart from "@/components/PlotlyChart";
import type { Mcp } from "@/lib/types";
import { uniqueSorted } from "@/lib/data";

const RENIEC_AZUL = "#002F56";

const ESTADO_COLOR: Record<string, string> = {
  "SIN ERROR": "#27AE60",
  SUBSANADO: "#2E6F9E",
  PENDIENTE: "#C0392B",
};

const CAUSA_COLOR: Record<string, string> = {
  "Error de revisión manual": RENIEC_AZUL,
  "Envío fuera de plazo (Eq. Operativo)": "#8E44AD",
  "GEO: omisión de listas/anexos": "#2E6F9E",
  "GEO: información desactualizada o extemporánea": "#6FA3C7",
  "GEO: asignación incorrecta (códigos/DNI)": "#A9C4DE",
  "Electores de otro distrito quitados": "#C0392B",
  "Otras causas puntuales": "#7F8C8D",
};

const BLUES_DARK = ["#2E6F9E", "#245782", "#1C4468", "#153350", "#002F56"];

interface Props {
  mcps: Mcp[];
  geojson: GeoJSON.FeatureCollection;
}

function toCsv(rows: Mcp[]) {
  const header = ["Departamento", "Provincia", "Distrito", "MCP", "Código RENIEC", "Estado del error", "Causa", "Febrero", "Abril", "Junio", "Final", "Variación absoluta"];
  const lines = rows.map((m) => [
    m.departamento, m.provincia, m.distrito, m.mcp, m.codMcpReniec, m.estadoError, m.causa,
    m.etapaFebrero, m.etapaAbril, m.etapaJunio, m.etapaFinal, m.variacionAbs,
  ]);
  const csv = [header, ...lines].map((r) => r.map((v) => `"${v ?? ""}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mcp_errores.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function MapaErroresView({ mcps, geojson }: Props) {
  const [depto, setDepto] = useState("(Todos)");
  const [provincia, setProvincia] = useState("(Todas)");
  const [estados, setEstados] = useState<string[]>([]);
  const [causas, setCausas] = useState<string[]>([]);
  const [soloError, setSoloError] = useState(true);
  const [modoMapa, setModoMapa] = useState<"estado" | "causa">("estado");

  const deptos = useMemo(() => ["(Todos)", ...uniqueSorted(mcps.map((m) => m.departamento))], [mcps]);
  const causasDisponibles = useMemo(() => uniqueSorted(mcps.map((m) => m.causa)), [mcps]);

  const provinciasDisponibles = useMemo(
    () =>
      depto === "(Todos)"
        ? []
        : ["(Todas)", ...uniqueSorted(mcps.filter((m) => m.departamento === depto).map((m) => m.provincia))],
    [mcps, depto]
  );

  const filtrado = useMemo(() => {
    let rows = mcps;
    if (depto !== "(Todos)") {
      rows = rows.filter((m) => m.departamento === depto);
      if (provincia !== "(Todas)") rows = rows.filter((m) => m.provincia === provincia);
    }
    if (estados.length) rows = rows.filter((m) => estados.includes(m.estadoError));
    if (causas.length) rows = rows.filter((m) => m.causa && causas.includes(m.causa));
    if (soloError) rows = rows.filter((m) => m.estadoError !== "SIN ERROR");
    return rows;
  }, [mcps, depto, provincia, estados, causas, soloError]);

  // ── Gráfico de errores por provincia (respeta filtros) ──────────────────
  const provChartData = useMemo(() => {
    const conError = filtrado.filter((m) => m.estadoError !== "SIN ERROR");
    const counts: Record<string, Record<string, number>> = {};
    for (const m of conError) {
      if (!m.provincia || !m.departamento) continue;
      const label = `${m.provincia} (${m.departamento})`;
      counts[label] ??= {};
      counts[label][m.estadoError] = (counts[label][m.estadoError] ?? 0) + 1;
    }
    let labels = Object.keys(counts);
    if (depto === "(Todos)") {
      labels = labels
        .map((l) => [l, Object.values(counts[l]).reduce((a, b) => a + b, 0)] as const)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 20)
        .map(([l]) => l);
    } else {
      labels = labels.sort((a, b) => Object.values(counts[b]).reduce((x, y) => x + y, 0) - Object.values(counts[a]).reduce((x, y) => x + y, 0));
    }
    return { labels, counts };
  }, [filtrado, depto]);

  const provTraces: Data[] = ["SUBSANADO", "PENDIENTE"].map((estado) => ({
    type: "bar",
    name: estado,
    x: provChartData.labels,
    y: provChartData.labels.map((l) => provChartData.counts[l]?.[estado] ?? 0),
    marker: { color: ESTADO_COLOR[estado] },
  }));

  // ── Mapa de coropletas (independiente de los filtros de arriba) ─────────
  const errorNacional = mcps.filter((m) => m.estadoError !== "SIN ERROR" && m.departamento && m.provincia);

  const mapaTrace: Data[] = useMemo(() => {
    if (modoMapa === "estado") {
      const counts: Record<string, number> = {};
      for (const m of errorNacional) {
        const idProv = `${m.departamento} - ${m.provincia}`;
        counts[idProv] = (counts[idProv] ?? 0) + 1;
      }
      const ids = Object.keys(counts);
      return [
        {
          type: "choroplethmap",
          geojson: geojson as unknown as object,
          locations: ids,
          z: ids.map((id) => counts[id]),
          featureidkey: "properties.idProv",
          colorscale: BLUES_DARK.map((c, i) => [i / (BLUES_DARK.length - 1), c]),
          marker: { opacity: 0.85 },
          colorbar: { title: { text: "MCPs con error" } },
        } as unknown as Data,
      ];
    }
    const porCausa: Record<string, Record<string, number>> = {};
    for (const m of errorNacional) {
      const idProv = `${m.departamento} - ${m.provincia}`;
      const cat = m.causaCategoria ?? "Otras causas puntuales";
      porCausa[idProv] ??= {};
      porCausa[idProv][cat] = (porCausa[idProv][cat] ?? 0) + 1;
    }
    const ids = Object.keys(porCausa);
    const dominante = ids.map((id) => {
      const entries = Object.entries(porCausa[id]);
      entries.sort((a, b) => b[1] - a[1]);
      return entries[0][0];
    });
    // Un trace por categoría (para que el color/leyenda sea discreto por causa)
    const categorias = Array.from(new Set(dominante));
    return categorias.map((cat) => {
      const idsCat = ids.filter((_, i) => dominante[i] === cat);
      return {
        type: "choroplethmap",
        geojson: geojson as unknown as object,
        locations: idsCat,
        z: idsCat.map(() => 1),
        featureidkey: "properties.idProv",
        colorscale: [
          [0, CAUSA_COLOR[cat] ?? "#7F8C8D"],
          [1, CAUSA_COLOR[cat] ?? "#7F8C8D"],
        ],
        showscale: false,
        name: cat,
        marker: { opacity: 0.85 },
      } as unknown as Data;
    });
  }, [modoMapa, errorNacional, geojson]);

  return (
    <div>
      <div className="rounded-lg border border-slate-200 p-4 mb-6">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Filtros</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            {depto !== "(Todos)" && (
              <select
                className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm mt-2"
                value={provincia}
                onChange={(e) => setProvincia(e.target.value)}
              >
                {provinciasDisponibles.map((p) => (
                  <option key={p}>{p}</option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Estado del error</label>
            <select
              multiple
              className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm h-20"
              value={estados}
              onChange={(e) => setEstados(Array.from(e.target.selectedOptions, (o) => o.value))}
            >
              <option value="SUBSANADO">SUBSANADO</option>
              <option value="PENDIENTE">PENDIENTE</option>
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Causa</label>
            <select
              multiple
              className="w-full border border-slate-300 rounded-md px-3 py-1.5 text-sm h-20"
              value={causas}
              onChange={(e) => setCausas(Array.from(e.target.selectedOptions, (o) => o.value))}
            >
              {causasDisponibles.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>
        <label className="flex items-center gap-2 mt-3 text-sm text-slate-700">
          <input type="checkbox" checked={soloError} onChange={(e) => setSoloError(e.target.checked)} />
          Solo MCPs con error
        </label>
      </div>

      <h2 className="text-lg font-semibold text-slate-900 mb-2">Errores por provincia</h2>
      {provChartData.labels.length === 0 ? (
        <p className="text-sm text-slate-500 mb-6">No hay MCPs con error para los filtros seleccionados.</p>
      ) : (
        <PlotlyChart
          data={provTraces}
          height={420}
          layout={{ barmode: "stack", xaxis: { tickangle: -40 }, margin: { t: 10, b: 140, l: 40, r: 20 } }}
        />
      )}

      <div className="my-8 border-t border-slate-200" />

      <h2 className="text-lg font-semibold text-slate-900">Mapa de coropletas — MCPs con error por provincia</h2>
      <p className="text-sm text-slate-500 mb-3">
        Vista geográfica a nivel nacional (independiente de los filtros de arriba). Elige si quieres ver el
        total de errores o la causa predominante de cada provincia.
      </p>
      <div className="flex gap-4 mb-3">
        <label className="flex items-center gap-1.5 text-sm">
          <input type="radio" checked={modoMapa === "estado"} onChange={() => setModoMapa("estado")} />
          Estado del error
        </label>
        <label className="flex items-center gap-1.5 text-sm">
          <input type="radio" checked={modoMapa === "causa"} onChange={() => setModoMapa("causa")} />
          Causa específica
        </label>
      </div>
      <PlotlyChart
        data={mapaTrace}
        height={560}
        layout={{
          map: { center: { lat: -9.2, lon: -75.0 }, zoom: 4.3, style: "carto-positron" },
          legend: { orientation: "h", y: -0.05 },
        }}
      />

      <div className="my-8 border-t border-slate-200" />

      <h2 className="text-lg font-semibold text-slate-900 mb-2">Tabla de MCPs con error</h2>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm text-slate-500">{filtrado.length.toLocaleString("es-PE")} MCPs</p>
        <button
          onClick={() => toCsv(filtrado)}
          className="text-sm font-medium bg-[#002F56] text-white rounded-md px-4 py-1.5 hover:bg-[#00396b]"
        >
          ⬇ Descargar tabla filtrada (.csv)
        </button>
      </div>
      <div className="overflow-auto max-h-[480px] rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600 sticky top-0">
            <tr>
              {["Departamento", "Provincia", "Distrito", "MCP", "Código", "Estado", "Causa", "Final", "Variación"].map((h) => (
                <th key={h} className="px-3 py-2 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtrado.map((m) => (
              <tr key={m.cod ?? m.mcp} className="border-t border-slate-100">
                <td className="px-3 py-1.5 whitespace-nowrap">{m.departamento}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{m.provincia}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{m.distrito}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{m.mcp}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{m.codMcpReniec}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{m.estadoError}</td>
                <td className="px-3 py-1.5 max-w-xs truncate" title={m.causa ?? undefined}>
                  {m.causa}
                </td>
                <td className="px-3 py-1.5 text-right">{m.etapaFinal?.toLocaleString("es-PE") ?? "—"}</td>
                <td className="px-3 py-1.5 text-right">{m.variacionAbs?.toLocaleString("es-PE") ?? "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
