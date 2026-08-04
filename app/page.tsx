import StatCard from "@/components/StatCard";
import PlotlyChart from "@/components/PlotlyChart";
import { getVigentes, getEvolucionAgregada } from "@/lib/data";
import { ETAPAS_ORDEN } from "@/lib/types";
import type { Data } from "plotly.js";

const RENIEC_AZUL = "#002F56";
const RENIEC_AZUL_CLARO = "#2E6F9E";
const RENIEC_AZUL_SUAVE = "#EAF1F8";

const ESTADO_COLOR: Record<string, string> = {
  "SIN ERROR": "#27AE60",
  SUBSANADO: RENIEC_AZUL_CLARO,
  PENDIENTE: "#C0392B",
};

const CAUSA_COLOR: Record<string, string> = {
  "Error de revisión manual": RENIEC_AZUL,
  "Envío fuera de plazo (Eq. Operativo)": "#8E44AD",
  "GEO: omisión de listas/anexos": RENIEC_AZUL_CLARO,
  "GEO: información desactualizada o extemporánea": "#6FA3C7",
  "GEO: asignación incorrecta (códigos/DNI)": "#A9C4DE",
  "Electores de otro distrito quitados": "#C0392B",
  "Otras causas puntuales": "#7F8C8D",
};

export default function ResumenEjecutivoPage() {
  const vigentes = getVigentes();
  const total = vigentes.length;
  const electoresFinales = vigentes.reduce((acc, m) => acc + (m.etapaFinal ?? 0), 0);
  const nSubsanados = vigentes.filter((m) => m.estadoError === "SUBSANADO").length;
  const nPendientes = vigentes.filter((m) => m.estadoError === "PENDIENTE").length;
  const nNuevas = vigentes.filter((m) => m.etapaFebrero === null).length;

  const evolucion = getEvolucionAgregada();

  const evolTrace: Data[] = [
    {
      type: "bar",
      name: "MCPs corregidas en la etapa",
      x: evolucion.map((e) => e.etapa),
      y: evolucion.map((e) => e.mcpsConDatoReal),
      marker: { color: RENIEC_AZUL_SUAVE, line: { color: RENIEC_AZUL_CLARO, width: 1 } },
      text: evolucion.map((e) => String(e.mcpsConDatoReal)),
      textposition: "outside",
      yaxis: "y",
    },
    {
      type: "scatter",
      mode: "text+lines+markers",
      name: "Total de electores",
      x: evolucion.map((e) => e.etapa),
      y: evolucion.map((e) => e.totalElectores),
      line: { color: RENIEC_AZUL, width: 3 },
      text: evolucion.map((e) => e.totalElectores.toLocaleString("es-PE")),
      textposition: "top center",
      yaxis: "y2",
    },
  ];

  const estadoCounts = { "SIN ERROR": total - nSubsanados - nPendientes, SUBSANADO: nSubsanados, PENDIENTE: nPendientes };
  const estadoTrace: Data[] = [
    {
      type: "pie",
      labels: Object.keys(estadoCounts),
      values: Object.values(estadoCounts),
      hole: 0.45,
      marker: { colors: Object.keys(estadoCounts).map((k) => ESTADO_COLOR[k]) },
      textinfo: "value+percent",
    },
  ];

  const subsanados = vigentes.filter((m) => m.estadoError === "SUBSANADO");
  const causaCounts: Record<string, number> = {};
  for (const m of subsanados) {
    const cat = m.causaCategoria ?? "Otras causas puntuales";
    causaCounts[cat] = (causaCounts[cat] ?? 0) + 1;
  }
  const causasOrdenadas = Object.entries(causaCounts).sort((a, b) => b[1] - a[1]);

  const errorMcps = vigentes.filter((m) => m.estadoError !== "SIN ERROR");
  const provCausaCounts: Record<string, Record<string, number>> = {};
  for (const m of errorMcps) {
    if (!m.provincia || !m.departamento) continue;
    const label = `${m.provincia} (${m.departamento})`;
    const cat = m.causaCategoria ?? "Otras causas puntuales";
    provCausaCounts[label] ??= {};
    provCausaCounts[label][cat] = (provCausaCounts[label][cat] ?? 0) + 1;
  }
  const provTotales = Object.entries(provCausaCounts)
    .map(([prov, cats]) => [prov, Object.values(cats).reduce((a, b) => a + b, 0)] as const)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .map(([prov]) => prov)
    .reverse();

  const categoriasUsadas = Array.from(new Set(errorMcps.map((m) => m.causaCategoria ?? "Otras causas puntuales")));
  const provCausaTraces: Data[] = categoriasUsadas.map((cat) => ({
    type: "bar",
    orientation: "h",
    name: cat,
    y: provTotales,
    x: provTotales.map((p) => provCausaCounts[p]?.[cat] ?? 0),
    marker: { color: CAUSA_COLOR[cat] ?? "#7F8C8D" },
  }));

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-1">Resumen ejecutivo</h1>
      <p className="text-sm text-slate-500 mb-6">
        Todos los KPIs de esta vista se calculan sobre la lista final de MCPs únicas (vigentes).
      </p>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
        <StatCard label="MCPs totales" value={total.toLocaleString("es-PE")} caption="Municipalidades de Centro Poblado vigentes (lista final única)." />
        <StatCard
          label="Electores (final)"
          value={electoresFinales.toLocaleString("es-PE")}
          caption="Suma de la cifra final oficial de cada MCP (OTI julio o consolidado junio)."
        />
        <StatCard
          label="Errores subsanados"
          value={nSubsanados.toLocaleString("es-PE")}
          delta={`${((nSubsanados / total) * 100).toFixed(1)} %`}
          deltaTone="positive"
        />
        <StatCard
          label="Errores pendientes"
          value={nPendientes.toLocaleString("es-PE")}
          delta={`−${((nPendientes / total) * 100).toFixed(1)} %`}
          deltaTone="negative"
        />
        <StatCard label="MCPs nuevas (post-febrero)" value={nNuevas.toLocaleString("es-PE")} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-8">
        <div className="lg:col-span-3">
          <h2 className="text-lg font-semibold text-slate-900">
            Evolución del padrón — electores totales y MCPs corregidas por etapa
          </h2>
          <p className="text-sm text-slate-500 mb-2">
            La línea muestra el total de electores acumulado en cada etapa; las barras muestran cuántas
            MCPs tuvieron un dato reportado explícitamente en esa ronda (no arrastrado de una etapa anterior).
          </p>
          <PlotlyChart
            data={evolTrace}
            height={380}
            layout={{
              legend: { orientation: "h", y: -0.2 },
              yaxis: { title: { text: "MCPs corregidas" } },
              yaxis2: { title: { text: "Total de electores" }, overlaying: "y", side: "right" },
              xaxis: { categoryorder: "array", categoryarray: ETAPAS_ORDEN as unknown as string[] },
            }}
          />
        </div>
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Composición por estado de error</h2>
          <PlotlyChart data={estadoTrace} height={380} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900">Top causas de error subsanado</h2>
          <p className="text-sm text-slate-500 mb-2">Causas agrupadas en 7 categorías para facilitar la lectura.</p>
          <div className="overflow-x-auto rounded-lg border border-slate-200">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2">Categoría de causa</th>
                  <th className="px-3 py-2 text-right">Cantidad</th>
                  <th className="px-3 py-2 text-right">% del total subsanado</th>
                </tr>
              </thead>
              <tbody>
                {causasOrdenadas.map(([cat, count]) => (
                  <tr key={cat} className="border-t border-slate-100">
                    <td className="px-3 py-2">{cat}</td>
                    <td className="px-3 py-2 text-right">{count}</td>
                    <td className="px-3 py-2 text-right">{((count / nSubsanados) * 100).toFixed(1)} %</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="lg:col-span-3">
          <h2 className="text-lg font-semibold text-slate-900">¿En qué provincias se dieron las causas de error?</h2>
          <p className="text-sm text-slate-500 mb-2">Top 15 provincias con más MCPs con error, por categoría de causa.</p>
          <PlotlyChart
            data={provCausaTraces}
            height={460}
            layout={{ barmode: "stack", legend: { orientation: "h", y: -0.15 }, margin: { t: 10, b: 40, l: 200, r: 20 } }}
          />
        </div>
      </div>
    </div>
  );
}
