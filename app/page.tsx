import StatCard from "@/components/StatCard";
import PlotlyChart from "@/components/PlotlyChart";
import {
  getVigentes,
  getEvolucionAgregada,
  getCarpetaOrigenDistribucion,
  groupCount,
} from "@/lib/data";
import { ETAPAS_ORDEN } from "@/lib/types";
import type { Data } from "plotly.js";

const AZUL      = "#002F56";
const AZUL_MED  = "#2E6F9E";
const AZUL_PAL  = ["#EAF1F8", "#B8D2E8", "#7FA8CE", "#4A7FAE", "#2E6F9E", "#002F56"];

export default function InicioPage() {
  const vigentes = getVigentes();
  const total = vigentes.length;
  const totalElectores = vigentes.reduce((s, m) => s + (m.etapaFinal ?? 0), 0);
  const nNuevas = vigentes.filter((m) => m.etapaFebrero === null).length;
  const conCambio = vigentes.filter((m) => m.variacionAbs !== null && m.variacionAbs !== 0).length;
  const estables  = vigentes.filter((m) => m.variacionAbs === 0).length;

  // ── Evolución de electores por etapa ─────────────────────────────
  const evol = getEvolucionAgregada();
  const evolTrace: Data[] = [
    {
      type: "scatter",
      mode: "text+lines+markers",
      name: "Total electores",
      x: evol.map((e) => e.etapa),
      y: evol.map((e) => e.totalElectores),
      text: evol.map((e) => e.totalElectores.toLocaleString("es-PE")),
      textposition: "top center",
      line: { color: AZUL, width: 3 },
      marker: { size: 9, color: AZUL },
    },
    {
      type: "bar",
      name: "MCPs con envío real",
      x: evol.map((e) => e.etapa),
      y: evol.map((e) => e.mcpsConDatoReal),
      marker: { color: AZUL_PAL[1] },
      yaxis: "y2",
      text: evol.map((e) => String(e.mcpsConDatoReal)),
      textposition: "outside",
    },
  ];

  // ── Distribución por carpeta de origen ───────────────────────────
  const carpetas = getCarpetaOrigenDistribucion();
  const carpetaTrace: Data[] = [
    {
      type: "pie",
      labels: carpetas.map((c) => c.carpeta),
      values: carpetas.map((c) => c.count),
      hole: 0.48,
      marker: { colors: AZUL_PAL },
      textinfo: "value+percent",
      insidetextorientation: "radial",
    },
  ];

  // ── Top departamentos por N° MCPs ────────────────────────────────
  const deptoCount = groupCount(vigentes, (m) => m.departamento);
  const deptoOrdenado = Object.entries(deptoCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 15)
    .reverse();

  const deptoTrace: Data[] = [
    {
      type: "bar",
      orientation: "h",
      x: deptoOrdenado.map(([, n]) => n),
      y: deptoOrdenado.map(([d]) => d),
      marker: { color: AZUL_MED },
      text: deptoOrdenado.map(([, n]) => String(n)),
      textposition: "outside",
    },
  ];

  // ── Distribución de variación ────────────────────────────────────
  const conVar = vigentes.filter((m) => m.variacionPct !== null);
  const varTrace: Data[] = [
    {
      type: "histogram",
      x: conVar.map((m) => m.variacionPct),
      marker: { color: AZUL_MED, line: { color: AZUL, width: 0.5 } },
      name: "MCPs",
    } as unknown as Data,
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-1">Inicio</h1>
      <p className="text-sm text-slate-500 mb-6">
        Universo electoral de Municipalidades de Centro Poblado — padrón consolidado a agosto 2025.
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
        <StatCard
          label="MCPs vigentes"
          value={total.toLocaleString("es-PE")}
          caption="Lista final única (agosto 2025)."
        />
        <StatCard
          label="Electores (final)"
          value={totalElectores.toLocaleString("es-PE")}
          caption="Suma del dato final consolidado de cada MCP."
        />
        <StatCard
          label="MCPs con cambios"
          value={conCambio.toLocaleString("es-PE")}
          delta={`${((conCambio / total) * 100).toFixed(1)} %`}
          deltaTone="neutral"
          caption="Variación ≠ 0 entre febrero y final."
        />
        <StatCard
          label="MCPs estables"
          value={estables.toLocaleString("es-PE")}
          delta={`${((estables / total) * 100).toFixed(1)} %`}
          deltaTone="positive"
          caption="Sin cambios entre su primera y última etapa."
        />
        <StatCard
          label="MCPs sin febrero"
          value={nNuevas.toLocaleString("es-PE")}
          caption="Incorporadas a partir de abril o después."
        />
      </div>

      {/* Evolución + Carpeta origen */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 mb-8">
        <div className="lg:col-span-3">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            Evolución del padrón por etapa
          </h2>
          <p className="text-sm text-slate-500 mb-2">
            Línea: total de electores acumulados. Barras: MCPs con envío real en esa ronda
            (no arrastre de etapa anterior).
          </p>
          <PlotlyChart
            data={evolTrace}
            height={340}
            layout={{
              legend: { orientation: "h", y: -0.2 },
              xaxis: { categoryorder: "array", categoryarray: ETAPAS_ORDEN as unknown as string[] },
              yaxis: { title: { text: "MCPs con envío real" } },
              yaxis2: { title: { text: "Total electores" }, overlaying: "y", side: "right" },
            }}
          />
        </div>
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            ¿En qué ronda se cerró el dato final?
          </h2>
          <p className="text-sm text-slate-500 mb-2">
            Cada sector muestra cuántas MCPs tomaron su valor final de esa carpeta de envío.
          </p>
          <PlotlyChart data={carpetaTrace} height={340} />
        </div>
      </div>

      {/* Departamentos + Distribución variación */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            MCPs por departamento (top 15)
          </h2>
          <PlotlyChart
            data={deptoTrace}
            height={420}
            layout={{ margin: { l: 160, t: 10, b: 40, r: 60 }, xaxis: { title: { text: "N° de MCPs" } } }}
          />
        </div>
        <div className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            Distribución de variación (Feb → Final)
          </h2>
          <p className="text-sm text-slate-500 mb-2">
            Histograma de la variación porcentual entre el primer dato (febrero) y el padrón final.
          </p>
          <PlotlyChart
            data={varTrace}
            height={420}
            layout={{ xaxis: { title: { text: "Variación %" } }, yaxis: { title: { text: "N° MCPs" } }, showlegend: false }}
          />
        </div>
      </div>
    </div>
  );
}
