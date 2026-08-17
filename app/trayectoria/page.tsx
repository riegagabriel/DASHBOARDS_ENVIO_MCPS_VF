import PlotlyChart from "@/components/PlotlyChart";
import { getVigentes, getEvolucionAgregada, getCarpetaOrigenDistribucion, getTopVariaciones } from "@/lib/data";
import { ETAPAS_ORDEN } from "@/lib/types";
import type { Data } from "plotly.js";

const AZUL     = "#002F56";
const AZUL_MED = "#2E6F9E";
const AZUL_PAL = ["#EAF1F8", "#B8D2E8", "#7FA8CE", "#4A7FAE", "#2E6F9E", "#002F56"];
const VERDE    = "#27AE60";
const ROJO     = "#C0392B";

export default function TrayectoriaPage() {
  const vigentes = getVigentes();
  const evol = getEvolucionAgregada();
  const carpetas = getCarpetaOrigenDistribucion();
  const topVar = getTopVariaciones(20);

  // ── Electores por etapa (línea) ──────────────────────────────────
  const evolTrace: Data[] = [
    {
      type: "scatter",
      mode: "text+lines+markers",
      x: evol.map((e) => e.etapa),
      y: evol.map((e) => e.totalElectores),
      text: evol.map((e) => e.totalElectores.toLocaleString("es-PE")),
      textposition: "top center",
      line: { color: AZUL, width: 3 },
      marker: { size: 10, color: AZUL },
      showlegend: false,
    },
  ];

  // ── MCPs con envío real por etapa ────────────────────────────────
  const envioTrace: Data[] = [
    {
      type: "bar",
      x: evol.map((e) => e.etapa),
      y: evol.map((e) => e.mcpsConDatoReal),
      marker: { color: AZUL_PAL },
      text: evol.map((e) => e.mcpsConDatoReal.toLocaleString("es-PE")),
      textposition: "outside",
      showlegend: false,
    },
  ];

  // ── Carpeta de origen ────────────────────────────────────────────
  const carpetaTrace: Data[] = [
    {
      type: "bar",
      x: carpetas.map((c) => c.carpeta),
      y: carpetas.map((c) => c.count),
      marker: { color: AZUL_PAL },
      text: carpetas.map((c) => String(c.count)),
      textposition: "outside",
      showlegend: false,
    },
  ];

  // ── Top variaciones ───────────────────────────────────────────────
  const subio = topVar.filter((m) => (m.variacionAbs ?? 0) >= 0).reverse();
  const bajo  = topVar.filter((m) => (m.variacionAbs ?? 0) < 0).reverse();

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

  // ── MCPs sin dato en febrero (nuevas) ────────────────────────────
  const nuevas = vigentes.filter((m) => m.etapaFebrero === null);
  const nuevasPorCarpeta: Record<string, number> = {};
  for (const m of nuevas) {
    const k = m.carpetaOrigen ?? "Sin datos";
    nuevasPorCarpeta[k] = (nuevasPorCarpeta[k] ?? 0) + 1;
  }
  const nuevasOrdenadas = Object.entries(nuevasPorCarpeta).sort((a, b) => b[1] - a[1]);

  const nuevasTrace: Data[] = [
    {
      type: "bar",
      x: nuevasOrdenadas.map(([k]) => k),
      y: nuevasOrdenadas.map(([, n]) => n),
      marker: { color: AZUL_MED },
      text: nuevasOrdenadas.map(([, n]) => String(n)),
      textposition: "outside",
      showlegend: false,
    },
  ];

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-1">Trayectoria del universo</h1>
      <p className="text-sm text-slate-500 mb-6">
        Cómo evolucionó el padrón electoral de las {vigentes.length.toLocaleString("es-PE")} MCPs
        a través de las rondas de envío.
      </p>

      {/* Evolución electores + MCPs por envío real */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            Total de electores por etapa
          </h2>
          <p className="text-sm text-slate-500 mb-2">
            Universo acumulado al cierre de cada ronda de corrección.
          </p>
          <PlotlyChart
            data={evolTrace}
            height={300}
            layout={{
              xaxis: { categoryorder: "array", categoryarray: ETAPAS_ORDEN as unknown as string[] },
              yaxis: { title: { text: "Electores" } },
              margin: { t: 30 },
            }}
          />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            MCPs con envío real por etapa
          </h2>
          <p className="text-sm text-slate-500 mb-2">
            Solo cuenta las MCPs que enviaron un padrón nuevo en esa ronda (no arrastre).
          </p>
          <PlotlyChart
            data={envioTrace}
            height={300}
            layout={{
              xaxis: { categoryorder: "array", categoryarray: ETAPAS_ORDEN as unknown as string[] },
              yaxis: { title: { text: "N° de MCPs" } },
              margin: { t: 30 },
            }}
          />
        </div>
      </div>

      {/* Carpeta de origen + MCPs nuevas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            ¿En qué carpeta se cerró el dato final?
          </h2>
          <p className="text-sm text-slate-500 mb-2">
            Cada MCP tiene su valor final tomado de una carpeta de envío específica.
          </p>
          <PlotlyChart
            data={carpetaTrace}
            height={300}
            layout={{ yaxis: { title: { text: "N° MCPs" } }, margin: { t: 10 } }}
          />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900 mb-1">
            MCPs nuevas ({nuevas.length}) — por carpeta de incorporación
          </h2>
          <p className="text-sm text-slate-500 mb-2">
            MCPs que no tenían dato en febrero y fueron incorporadas en una ronda posterior.
          </p>
          <PlotlyChart
            data={nuevasTrace}
            height={300}
            layout={{ yaxis: { title: { text: "N° MCPs" } }, margin: { t: 10 } }}
          />
        </div>
      </div>

      {/* Top variaciones */}
      <h2 className="text-lg font-semibold text-slate-900 mb-1">
        Top 20 MCPs por variación absoluta (Feb → Final)
      </h2>
      <p className="text-sm text-slate-500 mb-3">
        Diferencia entre el padrón de febrero y el valor final consolidado. Solo incluye MCPs con dato en ambas etapas.
      </p>
      <PlotlyChart
        data={varTrace}
        height={520}
        layout={{
          margin: { l: 220, t: 10, b: 50, r: 80 },
          xaxis: { title: { text: "Variación absoluta de electores" } },
          legend: { orientation: "h", y: -0.12 },
        }}
      />
    </div>
  );
}
