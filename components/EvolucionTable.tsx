"use client";

import { useMemo, useState } from "react";
import type { Mcp } from "@/lib/types";
import { uniqueSorted } from "@/lib/data";

interface Props {
  mcps: Mcp[];
}

function toExcel(rows: Mcp[]) {
  const header = [
    "Departamento", "Provincia", "Distrito", "MCP", "Código RENIEC",
    "Electores (febrero)", "Electores (abril)", "Electores (junio)", "Electores (final)",
    "Variación absoluta", "Variación (%)", "N° de correcciones",
  ];
  const lines = rows.map((m) => [
    m.departamento, m.provincia, m.distrito, m.mcp, m.codMcpReniec,
    m.etapaFebrero, m.etapaAbril, m.etapaJunio, m.etapaFinal,
    m.variacionAbs, m.variacionPct?.toFixed(1), m.nCorrecciones,
  ]);
  const csv = [header, ...lines].map((r) => r.map((v) => `"${v ?? ""}"`).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "mcp_evolucion.csv";
  a.click();
  URL.revokeObjectURL(url);
}

export default function EvolucionTable({ mcps }: Props) {
  const [depto, setDepto] = useState("(Todos)");
  const [provincia, setProvincia] = useState("(Todas)");

  const deptos = useMemo(() => ["(Todos)", ...uniqueSorted(mcps.map((m) => m.departamento))], [mcps]);
  const filteredByDepto = useMemo(
    () => (depto === "(Todos)" ? mcps : mcps.filter((m) => m.departamento === depto)),
    [mcps, depto]
  );
  const provincias = useMemo(
    () => ["(Todas)", ...uniqueSorted(filteredByDepto.map((m) => m.provincia))],
    [filteredByDepto]
  );
  const filtered = useMemo(
    () => (provincia === "(Todas)" ? filteredByDepto : filteredByDepto.filter((m) => m.provincia === provincia)),
    [filteredByDepto, provincia]
  );

  return (
    <div>
      <div className="flex flex-wrap gap-4 mb-3">
        <select
          className="border border-slate-300 rounded-md px-3 py-1.5 text-sm"
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
        <select
          className="border border-slate-300 rounded-md px-3 py-1.5 text-sm disabled:opacity-50"
          value={provincia}
          disabled={depto === "(Todos)"}
          onChange={(e) => setProvincia(e.target.value)}
        >
          {provincias.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <button
          onClick={() => toExcel(filtered)}
          className="ml-auto text-sm font-medium bg-[#002F56] text-white rounded-md px-4 py-1.5 hover:bg-[#00396b]"
        >
          ⬇ Descargar tabla (.csv)
        </button>
      </div>
      <p className="text-sm text-slate-500 mb-2">{filtered.length.toLocaleString("es-PE")} MCPs</p>
      <div className="overflow-auto max-h-[480px] rounded-lg border border-slate-200">
        <table className="w-full text-sm">
          <thead className="bg-slate-50 text-left text-slate-600 sticky top-0">
            <tr>
              {["Departamento", "Provincia", "Distrito", "MCP", "Código RENIEC", "Febrero", "Abril", "Junio", "Final", "Variación", "Variación %", "N° correcciones"].map((h) => (
                <th key={h} className="px-3 py-2 whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr key={m.cod ?? m.mcp} className="border-t border-slate-100">
                <td className="px-3 py-1.5 whitespace-nowrap">{m.departamento}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{m.provincia}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{m.distrito}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{m.mcp}</td>
                <td className="px-3 py-1.5 whitespace-nowrap">{m.codMcpReniec}</td>
                <td className="px-3 py-1.5 text-right">{m.etapaFebrero?.toLocaleString("es-PE") ?? "—"}</td>
                <td className="px-3 py-1.5 text-right">{m.etapaAbril?.toLocaleString("es-PE") ?? "—"}</td>
                <td className="px-3 py-1.5 text-right">{m.etapaJunio?.toLocaleString("es-PE") ?? "—"}</td>
                <td className="px-3 py-1.5 text-right">{m.etapaFinal?.toLocaleString("es-PE") ?? "—"}</td>
                <td className="px-3 py-1.5 text-right">{m.variacionAbs?.toLocaleString("es-PE") ?? "—"}</td>
                <td className="px-3 py-1.5 text-right">{m.variacionPct !== null ? `${m.variacionPct.toFixed(1)} %` : "—"}</td>
                <td className="px-3 py-1.5 text-right">{m.nCorrecciones}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
