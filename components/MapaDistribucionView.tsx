"use client";

import { useMemo, useState } from "react";
import type { Data } from "plotly.js";
import PlotlyChart from "@/components/PlotlyChart";
import type { ProvinciaStat } from "@/lib/data";

const BLUES = ["#EAF1F8", "#B8D2E8", "#7FA8CE", "#4A7FAE", "#2E6F9E", "#002F56"];

type Metrica = "nMcps" | "totalElectores" | "varMediaPct" | "pctNuevas";

const METRICA_LABELS: Record<Metrica, { label: string; unidad: string }> = {
  nMcps:          { label: "N° de MCPs",              unidad: "MCPs" },
  totalElectores: { label: "Total de electores",       unidad: "electores" },
  varMediaPct:    { label: "Variación media Feb→Final",unidad: "%" },
  pctNuevas:      { label: "% MCPs sin dato en Feb",   unidad: "%" },
};

interface Props {
  stats: ProvinciaStat[];
  geojson: GeoJSON.FeatureCollection;
}

export default function MapaDistribucionView({ stats, geojson }: Props) {
  const [metrica, setMetrica] = useState<Metrica>("nMcps");

  const { mapaTrace, topTrace } = useMemo(() => {
    const m = metrica;
    const ids  = stats.map((s) => s.idProv);
    const vals = stats.map((s) => s[m] ?? 0);
    const { unidad } = METRICA_LABELS[m];

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
      .filter((s) => s[m] !== null)
      .sort((a, b) => (b[m] as number) - (a[m] as number))
      .slice(0, 15)
      .reverse();

    const topData: Data[] = [
      {
        type: "bar",
        orientation: "h",
        x: top.map((s) => s[m]),
        y: top.map((s) => `${s.provincia}\n(${s.departamento})`),
        marker: { color: "#2E6F9E" },
        text: top.map((s) => {
          const v = s[m];
          if (v === null) return "—";
          return m === "totalElectores"
            ? Number(v).toLocaleString("es-PE")
            : `${Number(v).toLocaleString("es-PE")}${unidad === "%" ? " %" : ""}`;
        }),
        textposition: "outside",
      },
    ];

    return { mapaTrace: mapa, topTrace: topData };
  }, [stats, geojson, metrica]);

  return (
    <div>
      {/* Selector de métrica */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(Object.entries(METRICA_LABELS) as [Metrica, { label: string }][]).map(([key, { label }]) => (
          <button
            key={key}
            onClick={() => setMetrica(key)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors ${
              metrica === key
                ? "bg-[#002F56] text-white border-[#002F56]"
                : "bg-white text-slate-700 border-slate-300 hover:border-[#002F56]"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* Mapa */}
        <div className="lg:col-span-3">
          <PlotlyChart
            data={mapaTrace}
            height={520}
            layout={{
              mapbox: {
                style: "carto-positron",
                center: { lat: -9.0, lon: -75.5 },
                zoom: 4.2,
              },
              margin: { t: 10, b: 10 },
            }}
          />
        </div>

        {/* Top 15 provincias */}
        <div className="lg:col-span-2">
          <h3 className="text-base font-semibold text-slate-800 mb-2">
            Top 15 provincias — {METRICA_LABELS[metrica].label}
          </h3>
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
