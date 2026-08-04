import PlotlyChart from "@/components/PlotlyChart";
import EvolucionTable from "@/components/EvolucionTable";
import { getVigentes } from "@/lib/data";
import type { Data } from "plotly.js";

export default function EvolucionPage() {
  const vigentes = getVigentes();

  const variadas = vigentes
    .filter((m) => m.variacionAbs !== null)
    .slice()
    .sort((a, b) => Math.abs(b.variacionAbs!) - Math.abs(a.variacionAbs!))
    .slice(0, 20)
    .reverse();

  const subio = variadas.filter((m) => (m.variacionAbs ?? 0) >= 0);
  const bajo = variadas.filter((m) => (m.variacionAbs ?? 0) < 0);

  const variacionTraces: Data[] = [
    {
      type: "bar",
      orientation: "h",
      name: "Subió",
      y: subio.map((m) => m.mcp),
      x: subio.map((m) => m.variacionAbs),
      marker: { color: "#27AE60" },
      text: subio.map((m) => m.variacionAbs?.toLocaleString("es-PE") ?? ""),
      textposition: "outside",
    },
    {
      type: "bar",
      orientation: "h",
      name: "Bajó",
      y: bajo.map((m) => m.mcp),
      x: bajo.map((m) => m.variacionAbs),
      marker: { color: "#C0392B" },
      text: bajo.map((m) => m.variacionAbs?.toLocaleString("es-PE") ?? ""),
      textposition: "outside",
    },
  ];

  const total = vigentes.length;
  const distCorrecciones: Record<number, number> = {};
  for (const m of vigentes) {
    distCorrecciones[m.nCorrecciones] = (distCorrecciones[m.nCorrecciones] ?? 0) + 1;
  }
  const nCorreccionesOrdenado = Object.keys(distCorrecciones)
    .map(Number)
    .sort((a, b) => a - b);
  const pctSinCorreccion = ((distCorrecciones[0] ?? 0) / total) * 100;

  const bluesScale = ["#EAF1F8", "#B8D2E8", "#7FA8CE", "#4A7FAE", "#2E6F9E"];
  const proporcionTraces: Data[] = nCorreccionesOrdenado.map((n, i) => ({
    type: "bar",
    orientation: "h",
    name: `${n} corrección(es)`,
    y: ["Todas las MCPs"],
    x: [(distCorrecciones[n] / total) * 100],
    marker: { color: bluesScale[i % bluesScale.length] },
    text: [`${((distCorrecciones[n] / total) * 100).toFixed(1)}%`],
    textposition: "inside",
  }));

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Evolución de electores</h1>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div>
          <div className="flex items-start justify-between gap-2">
            <h2 className="text-lg font-semibold text-slate-900">Top 20 MCPs por variación absoluta (Feb. → Final)</h2>
            <details className="text-sm shrink-0">
              <summary className="cursor-pointer list-none text-lg">ℹ️</summary>
              <div className="absolute z-10 mt-1 w-80 rounded-lg border border-slate-200 bg-white p-3 shadow-lg text-slate-600">
                Cada barra es cuánto cambió el conteo de electores de una MCP entre el primer registro
                (febrero) y el valor final consolidado.
                <br />
                <br />
                <strong className="text-emerald-700">Verde (subió):</strong> normalmente refleja electores
                agregados en una corrección posterior.
                <br />
                <strong className="text-red-700">Rojo (bajó):</strong> suele corresponder a correcciones
                donde se retiraron electores asignados por error. Ver Mapa de errores o Ficha por MCP para
                la causa exacta.
              </div>
            </details>
          </div>
          <PlotlyChart
            data={variacionTraces}
            height={520}
            layout={{ margin: { t: 10, b: 40, l: 220, r: 40 }, xaxis: { title: { text: "Variación absoluta de electores" } } }}
          />
        </div>

        <div>
          <h2 className="text-lg font-semibold text-slate-900">¿Cuántas veces se corrigió cada MCP?</h2>
          <p className="text-sm text-slate-500 mb-2">Proporción de MCPs según su número de correcciones (0 a 3 rondas).</p>
          <p className="text-sm text-slate-500 mb-1">MCPs sin ninguna corrección</p>
          <p className="text-3xl font-semibold text-slate-900 mb-4">{pctSinCorreccion.toFixed(1)} %</p>
          <PlotlyChart
            data={proporcionTraces}
            height={200}
            layout={{ barmode: "stack", legend: { orientation: "h", y: -0.3 }, xaxis: { title: { text: "% de MCPs" } } }}
          />
        </div>
      </div>

      <h2 className="text-lg font-semibold text-slate-900 mb-3">Tabla de correcciones por MCP</h2>
      <EvolucionTable mcps={vigentes} />
    </div>
  );
}
