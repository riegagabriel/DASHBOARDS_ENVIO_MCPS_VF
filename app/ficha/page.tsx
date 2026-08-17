import FichaSearch from "@/components/FichaSearch";
import { getAllMcps, getVigentes } from "@/lib/data";

export default function FichaPage() {
  const allMcps  = getAllMcps();
  const vigentes = getVigentes();

  return (
    <div>
      <h1 className="text-3xl font-bold text-slate-900 mb-1">Trazabilidad por MCP</h1>
      <p className="text-sm text-slate-500 mb-6">
        Busca una MCP para ver su trayectoria completa: electores por etapa, envíos reales vs. arrastres,
        de qué carpeta proviene el dato final y si cambió de identidad o territorio.
      </p>
      <FichaSearch allMcps={allMcps} vigentes={vigentes} />
    </div>
  );
}
