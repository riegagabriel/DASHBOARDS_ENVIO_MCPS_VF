import fs from "node:fs";
import path from "node:path";
import MapaErroresView from "@/components/MapaErroresView";
import { getVigentes } from "@/lib/data";

function loadProvinciasGeojson(): GeoJSON.FeatureCollection {
  // .geojson no tiene loader de bundler por defecto en Next.js (a diferencia
  // de .json) — se lee directo del disco en este server component.
  const filePath = path.join(process.cwd(), "data", "provincias.geojson");
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

export default function MapaErroresPage() {
  const vigentes = getVigentes();
  const geojson = loadProvinciasGeojson();

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-6">Mapa de errores</h1>
      <MapaErroresView mcps={vigentes} geojson={geojson} />
    </div>
  );
}
