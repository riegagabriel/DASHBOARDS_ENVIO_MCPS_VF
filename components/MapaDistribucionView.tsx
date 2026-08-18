"use client";

import { useMemo, useState } from "react";
import type { Data } from "plotly.js";
import PlotlyChart from "@/components/PlotlyChart";
import type { ProvinciaStat } from "@/lib/data";

const BLUES = ["#EAF1F8", "#B8D2E8", "#7FA8CE", "#4A7FAE", "#2E6F9E", "#002F56"];

type Metrica = "nMcps" | "totalElectores";

const METRICA_LABELS: Record<Metrica, { label: string; unidad: string }> = {
  nMcps:          { label: "N° de MCPs",        unidad: "MCPs" },
  totalElectores: { label: "Total de electores", unidad: "electores" },
};

interface Props {
  stats: ProvinciaStat[];
  geojson: GeoJSON.FeatureCollection;
}

export default function MapaDistribucionView({ stats, geojson }: Props) {
  const [metrica, setMetrica] = useState<Metrica>("nMcps");

  const { mapaTrace, topTrace } = useMemo(() => {
    const ids  = stats.map((s) => s.idProv);
    const vals = stats.map((s) => s[metrica]);
    const { unidad } = METRICA_LABELS[metrica];

    const mapa: Data[] = [
      {
        type: "choroplethmap",
        geojson: geojson as unknown as object,
        locations: ids,
        z: vals,
        featureidkey: "properties.idProv",
        colorscale: BLUES.map((c, i) => [i / (BLUES.length - 1), c]),
        marker: { opacity: 0.85 },
        colorbar: { title: { text: unidad } },
      } as unknown as Data,
    ];

    const top = [...stats]
      .sort((a, b) => b[metrica] - a[metrica])
      .slice(0, 15)
      .reverse();

    const topData: Data[] = [
      {
        type: "bar",
        orientation: "h",
        x: top.map((s) => s[metrica]),
        y: top.map((s) => `${s.provincia}\n(${s.departamento})`),
        marker: { color: "#2E6F9E" },
        text: top.map((s) =>
          metrica === "totalElectores"
            ? s.totalElectores.toLocaleString("es-PE")
            : String(s.nMcps)
        ),
        textposition: "outside",
      },
    ];

    return { mapaTrace: mapa, topTrace: topData };
  }, [stats, geojson, metrica]);

  return (
    <div>
      {/* Toggle */}
      <div className="flex gap-2 mb-6">
        {(Object.entries(METRICA_LABELS) as [Metrica, { label: string }][]).map(([key, { label }]) => (
          <button
            key={key}
            className="btn-toggle"
            data-active={metrica === key ? "true" : "false"}
            onClick={() => setMetrica(key)}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        <div className="lg:col-span-3">
          <PlotlyChart
            data={mapaTrace}
            height={520}
            layout={{
              mapbox: { style: "carto-positron", center: { lat: -9.0, lon: -75.5 }, zoom: 4.2 },
              margin: { t: 10, b: 10 },
            }}
          />
        </div>
        <div className="lg:col-span-2">
          <p className="text-xs font-bold tracking-widest uppercase mb-3" style={{ color: "var(--text-muted)" }}>
            Top 15 provincias — {METRICA_LABELS[metrica].label}
          </p>
          <PlotlyChart
            data={topTrace}
            height={520}
            layout={{
              margin: { l: 160, t: 10, b: 40, r: 60 },
              xaxis: { title: { text: METRICA_LABELS[metrica].unidad } },
              showlegend: false,
            }}
          />
        </div>
      </div>
    </div>
  );
}
