import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { getVigentes } from "@/lib/data";

export const metadata: Metadata = {
  title: "Trazabilidad MCP — RENIEC",
  description: "Trazabilidad de envíos del padrón de Municipalidades de Centro Poblado",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const vigentes = getVigentes();
  const totalMcps = vigentes.length;
  const totalElectores = vigentes.reduce((s, m) => s + (m.etapaFinal ?? 0), 0);
  const nNuevas = vigentes.filter((m) => m.etapaFebrero === null).length;

  return (
    <html lang="es" className="h-full">
      <body className="h-full antialiased">
        <div className="flex h-full min-h-screen">
          <Sidebar totalMcps={totalMcps} totalElectores={totalElectores} nNuevas={nNuevas} />
          <main className="flex-1 overflow-y-auto px-8 py-8 bg-white">{children}</main>
        </div>
      </body>
    </html>
  );
}
