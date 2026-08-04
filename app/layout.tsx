import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { getVigentes } from "@/lib/data";

export const metadata: Metadata = {
  title: "Dashboard MCP — RENIEC",
  description: "Auditoría de correcciones del padrón de MCPs",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const vigentes = getVigentes();
  const totalMcps = vigentes.length;
  const nSubsanados = vigentes.filter((m) => m.estadoError === "SUBSANADO").length;
  const nPendientes = vigentes.filter((m) => m.estadoError === "PENDIENTE").length;

  return (
    <html lang="es" className="h-full">
      <body className="h-full antialiased">
        <div className="flex h-full min-h-screen">
          <Sidebar totalMcps={totalMcps} nSubsanados={nSubsanados} nPendientes={nPendientes} />
          <main className="flex-1 overflow-y-auto px-8 py-8 bg-white">{children}</main>
        </div>
      </body>
    </html>
  );
}
