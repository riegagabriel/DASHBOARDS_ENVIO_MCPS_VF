import { readFileSync } from "fs";
import { join } from "path";
import StatCard from "@/components/StatCard";
import PlotlyChart from "@/components/PlotlyChart";
import MapaDistribucionView from "@/components/MapaDistribucionView";
import FichaSearch from "@/components/FichaSearch";
import {
  getAllMcps,
  getVigentes,
  getEvolucionAgregada,
  getTopVariaciones,
  getEstadisticasPorProvincia,
} from "@/lib/data";
import { ETAPAS_ORDEN } from "@/lib/types";
import type { Data } from "plotly.js";
import type GeoJSON from "geojson";

const AZUL     = "#002F56";
const AZUL_PAL = "#B8D2E8";
const VERDE    = "#27AE60";
const ROJO     = "#C0392B";

function Divider({ id, title }: { id: string; title: string }) {
  return (
    <div id={id} className="section-divider">
      <h2>{title}</h2>
    </div>
  );
}

export default function HomePage() {
  const vigentes  = getVigentes();
  const allMcps   = getAllMcps();
  const total     = vigentes.length;
  const totalElec = vigentes.reduce((s, m) => s + (m.etapaFinal ?? 0), 0);
  const nNuevas   = vigentes.filter((m) => m.etapaFebrero === null).length;
  const conCambio = vigentes.filter((m) => m.variacionAbs !== null && m.variacionAbs !== 0).length;
  const estables  = vigentes.filter((m) => m.variacionAbs === 0).length;

  // ── Evolución (todas las rondas) ─────────────────────────────────
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
      type: "bar", orientation: "h", name: "Subió",
      y: subio.map((m) => m.mcp), x: subio.map((m) => m.variacionAbs),
      marker: { color: VERDE },
      text: subio.map((m) => `+${m.variacionAbs?.toLocaleString("es-PE")}`),
      textposition: "outside",
    },
    {
      type: "bar", orientation: "h", name: "Bajó",
      y: bajo.map((m) => m.mcp), x: bajo.map((m) => m.variacionAbs),
      marker: { color: ROJO },
      text: bajo.map((m) => m.variacionAbs?.toLocaleString("es-PE") ?? ""),
      textposition: "outside",
    },
  ];

  // ── Mapa ─────────────────────────────────────────────────────────
  const mapStats   = getEstadisticasPorProvincia();
  const geojsonPath = join(process.cwd(), "data", "provincias.geojson");
  const geojson = JSON.parse(readFileSync(geojsonPath, "utf-8")) as GeoJSON.FeatureCollection;

  return (
    <div>
      {/* ── KPIs ── */}
      <Divider id="resumen" title="Resumen" />
      <div className="grid grid-cols-2 md:grid-cols-5 gap-6">
        <StatCard label="Cantidad de MCPs"            value={total.toLocaleString("es-PE")}       caption="Lista final de MCPs única (08/2026)." />
        <StatCard label="Cantidad de electores de MCP" value={totalElec.toLocaleString("es-PE")}  caption="Suma de electores de la lista final de MCPs." />
        <StatCard label="MCPs con cambios"             value={conCambio.toLocaleString("es-PE")} delta={`${((conCambio/total)*100).toFixed(1)} %`} deltaTone="neutral"   caption="Total de MCPs que presentaron cambios a partir del primer envío de febrero." />
        <StatCard label="MCPs estables"                value={estables.toLocaleString("es-PE")}  delta={`${((estables/total)*100).toFixed(1)} %`}  deltaTone="positive" caption="MCPs sin variación entre el primer envío de febrero y el envío final." />
        <StatCard label="MCPs sin febrero"             value={nNuevas.toLocaleString("es-PE")}   caption="Incorporadas después del primer envío de febrero." />
      </div>

      {/* ── Evolución ── */}
      <Divider id="evolucion" title="Evolución del padrón" />
      <p className="text-sm mb-4"
          style={{ color: "var(--text-muted)" }}>
        Línea: total de electores en cada corte de envío (FEBRERO → AGOSTO → FINAL).
        Barras: MCPs que enviaron un padrón nuevo en esa ronda específica.
      </p>
      <PlotlyChart
        data={evolTrace}
        height={440}
        layout={{
          legend: { orientation: "h", y: -0.15 },
          xaxis: { categoryorder: "array", categoryarray: ETAPAS_ORDEN as unknown as string[] },
          yaxis:  { title: { text: "MCPs con envío real" } },
          yaxis2: { title: { text: "Total electores" }, overlaying: "y", side: "right" },
          margin: { t: 60, b: 60 },
        }}
      />

      {/* ── Top variaciones ── */}
      <Divider id="variaciones" title="Top variaciones" />
      <p className="text-sm mb-4"
          style={{ color: "var(--text-muted)" }}>
        MCPs con mayor cambio absoluto entre el padrón de febrero y el valor final consolidado.
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

      {/* ── Mapa ── */}
      <Divider id="mapa" title="Mapa de distribución" />
      <p className="text-sm mb-4"
          style={{ color: "var(--text-muted)" }}>
        Distribución geográfica por provincia. Toggle entre N° de MCPs y total de electores.
      </p>
      <MapaDistribucionView stats={mapStats} geojson={geojson} />

      {/* ── Ficha ── */}
      <Divider id="ficha" title="Trazabilidad por MCP" />
      <p className="text-sm mb-4"
          style={{ color: "var(--text-muted)" }}>
        Busca una MCP para ver su trayectoria completa etapa a etapa.
      </p>
      <FichaSearch allMcps={allMcps} vigentes={vigentes} />
    </div>
  );
}
