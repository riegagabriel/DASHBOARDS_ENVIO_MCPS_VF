import StatCard from "@/components/StatCard";
import PlotlyChart from "@/components/PlotlyChart";
import { getVigentes, getEvolucionAgregada, getTopVariaciones } from "@/lib/data";
import { ETAPAS_ORDEN } from "@/lib/types";
import type { Data } from "plotly.js";

const AZUL     = "#002F56";
const AZUL_PAL = "#B8D2E8";
const VERDE    = "#27AE60";
const ROJO     = "#C0392B";

export default function InicioPage() {
  const vigentes = getVigentes();
  const total = vigentes.length;
  const totalElectores = vigentes.reduce((s, m) => s + (m.etapaFinal ?? 0), 0);
  const nNuevas   = vigentes.filter((m) => m.etapaFebrero === null).length;
  const conCambio = vigentes.filter((m) => m.variacionAbs !== null && m.variacionAbs !== 0).length;
  const estables  = vigentes.filter((m) => m.variacionAbs === 0).length;

  // ── Evolución ─────────────────────────────────────────────────────
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
      marker: { color: AZUL_PAL },
      yaxis: "y2",
      text: evol.map((e) => String(e.mcpsConDatoReal)),
      textposition: "outside",
    },
  ];

  // ── Top variaciones ───────────────────────────────────────────────
  const topVar = getTopVariaciones(20);
  const subio  = topVar.filter((m) => (m.variacionAbs ?? 0) >= 0).reverse();
  const bajo   = topVar.filter((m) => (m.variacionAbs ?? 0) < 0).reverse();
  const varTrace: Data[] = [
    {
      type: "bar",
      orientation: "h",
      name: "Subió",
      y: subio.map((m) => m.mcp),
      x: subio.map((m) => m.variacionAbs),
      marker: { color: VERDE },
      text: subio.map((m) => `+${m.variacionAbs?.toLocaleString("es-PE")}`),
      textposition: "outside",
    },
    {
      type: "bar",
      orientation: "h",
      name: "Bajó",
      y: bajo.map((m) => m.mcp),
      x: bajo.map((m) => m.variacionAbs),
      marker: { color: ROJO },
      text: bajo.map((m) => m.variacionAbs?.toLocaleString("es-PE") ?? ""),
      textposition: "outside",
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-1">Inicio</h1>
      <p className="text-sm text-slate-500 mb-6">
        Universo electoral de Municipalidades de Centro Poblado — padrón consolidado a agosto 2025.
      </p>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6 mb-8">
        <StatCard label="MCPs vigentes"    value={total.toLocaleString("es-PE")}          caption="Lista final única (agosto 2025)." />
        <StatCard label="Electores (final)" value={totalElectores.toLocaleString("es-PE")} caption="Suma del dato final consolidado de cada MCP." />
        <StatCard label="MCPs con cambios"  value={conCambio.toLocaleString("es-PE")} delta={`${((conCambio / total) * 100).toFixed(1)} %`} deltaTone="neutral"   caption="Variación ≠ 0 entre febrero y final." />
        <StatCard label="MCPs estables"     value={estables.toLocaleString("es-PE")}  delta={`${((estables  / total) * 100).toFixed(1)} %`} deltaTone="positive" caption="Sin cambios entre su primera y última etapa." />
        <StatCard label="MCPs sin febrero"  value={nNuevas.toLocaleString("es-PE")}       caption="Incorporadas a partir de abril o después." />
      </div>

      {/* Evolución */}
      <h2 className="text-lg font-semibold text-slate-900 mb-1">Evolución del padrón por etapa</h2>
      <p className="text-sm text-slate-500 mb-3">
        Línea: total de electores acumulados en cada corte. Barras: MCPs que enviaron un padrón nuevo en esa ronda.
      </p>
      <PlotlyChart
        data={evolTrace}
        height={340}
        layout={{
          legend: { orientation: "h", y: -0.18 },
          xaxis: { categoryorder: "array", categoryarray: ETAPAS_ORDEN as unknown as string[] },
          yaxis:  { title: { text: "MCPs con envío real" } },
          yaxis2: { title: { text: "Total electores" }, overlaying: "y", side: "right" },
          margin: { t: 30, b: 60 },
        }}
      />

      {/* Top variaciones */}
      <h2 className="text-lg font-semibold text-slate-900 mt-10 mb-1">
        Top 20 MCPs por variación absoluta (Feb → Final)
      </h2>
      <p className="text-sm text-slate-500 mb-3">
        MCPs con mayor cambio entre el padrón de febrero y el valor final consolidado.
      </p>
      <PlotlyChart
        data={varTrace}
        height={540}
        layout={{
          margin: { l: 220, t: 10, b: 50, r: 100 },
          xaxis: { title: { text: "Variación absoluta de electores" } },
          legend: { orientation: "h", y: -0.09 },
        }}
      />
    </div>
  );
}
