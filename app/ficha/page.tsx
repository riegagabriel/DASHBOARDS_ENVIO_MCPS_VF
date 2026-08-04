import FichaSearch from "@/components/FichaSearch";
import { getAllMcps, getVigentes } from "@/lib/data";

export default function FichaPage() {
  const allMcps = getAllMcps();
  const vigentes = getVigentes();
  const pendientesMuestra = vigentes
    .filter((m) => m.estadoError === "PENDIENTE")
    .slice()
    .sort((a, b) => (a.departamento ?? "").localeCompare(b.departamento ?? "") || (a.mcp ?? "").localeCompare(b.mcp ?? ""))
    .slice(0, 30);

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-1">Ficha por MCP</h1>
      <p className="text-sm text-slate-500 mb-6">
        Busca una MCP para ver su trayectoria de electores por etapa, el detalle de sus errores, y — si
        cambió de identidad/territorio alguna vez — la explicación completa.
      </p>
      <FichaSearch allMcps={allMcps} pendientesMuestra={pendientesMuestra} />
    </div>
  );
}
