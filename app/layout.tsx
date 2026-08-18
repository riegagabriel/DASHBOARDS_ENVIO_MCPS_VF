import type { Metadata } from "next";
import "./globals.css";
import { getVigentes } from "@/lib/data";

export const metadata: Metadata = {
  title: "Trazabilidad MCP — RENIEC",
  description: "Trazabilidad de envíos del padrón de Municipalidades de Centro Poblado",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const vigentes = getVigentes();
  const totalElectores = vigentes.reduce((s, m) => s + (m.etapaFinal ?? 0), 0);

  return (
    <html lang="es" className="h-full">
      <body className="h-full antialiased bg-white">
        <header className="sticky top-0 z-20 bg-[#002F56] text-white px-8 py-3 flex items-center justify-between shadow-md">
          <div className="flex items-center gap-3">
            <span className="text-2xl">📋</span>
            <div>
              <h1 className="text-base font-semibold leading-tight">Dashboard MCP — RENIEC</h1>
              <p className="text-xs text-blue-200">Trazabilidad de envíos del padrón</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-6 text-sm text-blue-100">
            <span><strong className="text-white">{vigentes.length.toLocaleString("es-PE")}</strong> MCPs</span>
            <span><strong className="text-white">{totalElectores.toLocaleString("es-PE")}</strong> electores</span>
          </div>
        </header>
        <main className="px-8 py-8 max-w-screen-xl mx-auto">{children}</main>
      </body>
    </html>
  );
}
