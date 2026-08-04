"use client";

import dynamic from "next/dynamic";
import type { Data, Layout, Config } from "plotly.js";

// Plotly usa `window`/`document` — debe cargar solo en cliente, nunca en SSR.
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const RENIEC_FONT = "system-ui, -apple-system, Segoe UI, sans-serif";

export const DEFAULT_LAYOUT: Partial<Layout> = {
  font: { family: RENIEC_FONT, color: "#1A1A1A" },
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  margin: { t: 30, b: 40, l: 50, r: 20 },
};

const DEFAULT_CONFIG: Partial<Config> = {
  displaylogo: false,
  responsive: true,
  modeBarButtonsToRemove: ["lasso2d", "select2d"],
};

interface PlotlyChartProps {
  data: Data[];
  layout?: Partial<Layout>;
  config?: Partial<Config>;
  height?: number;
  className?: string;
}

export default function PlotlyChart({ data, layout, config, height = 400, className }: PlotlyChartProps) {
  return (
    <div className={className} style={{ width: "100%", height }}>
      <Plot
        data={data}
        layout={{ ...DEFAULT_LAYOUT, ...layout, height }}
        config={{ ...DEFAULT_CONFIG, ...config }}
        useResizeHandler
        style={{ width: "100%", height: "100%" }}
      />
    </div>
  );
}
