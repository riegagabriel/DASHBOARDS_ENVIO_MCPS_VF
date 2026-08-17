import { readFileSync } from "fs";
import { join } from "path";
import MapaDistribucionView from "@/components/MapaDistribucionView";
import { getEstadisticasPorProvincia } from "@/lib/data";
import type GeoJSON from "geojson";

export default function MapaPage() {
  const stats = getEstadisticasPorProvincia();
  const geojsonPath = join(process.cwd(), "data", "provincias.geojson");
  const geojson = JSON.parse(readFileSync(geojsonPath, "utf-8")) as GeoJSON.FeatureCollection;

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-1">Mapa de distribución</h1>
      <p className="text-sm text-slate-500 mb-6">
        Distribución geográfica de las MCPs por provincia. Selecciona la métrica para colorear el mapa.
      </p>
      <MapaDistribucionView stats={stats} geojson={geojson} />
    </div>
  );
}
