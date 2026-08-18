import type { Metadata } from "next";
import "./globals.css";
import { getVigentes } from "@/lib/data";

export const metadata: Metadata = {
  title: "Trazabilidad MCP — RENIEC",
  description: "Trazabilidad de envíos del padrón de Municipalidades de Centro Poblado",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const vigentes      = getVigentes();
  const totalElectores = vigentes.reduce((s, m) => s + (m.etapaFinal ?? 0), 0);

  return (
    <html lang="es" className="h-full">
      <body className="h-full" style={{ background: "var(--surface-0)", color: "var(--text-primary)" }}>
        <header className="site-header">
          <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "0.75rem 2rem", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "0.875rem" }}>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <h1 style={{ fontSize: "0.9rem", fontWeight: 700, color: "#fff", lineHeight: 1.2, margin: 0 }}>
                  Dashboard MCP · RENIEC
                </h1>
                <p style={{ fontSize: "0.7rem", color: "rgba(176,207,232,0.85)", margin: 0, letterSpacing: "0.04em" }}>
                  Trazabilidad de envíos del padrón
                </p>
              </div>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "1.75rem" }}>
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "0.72rem", color: "rgba(176,207,232,0.7)", letterSpacing: "0.05em", textTransform: "uppercase", margin: 0 }}>
                  MCPs vigentes
                </p>
                <p style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums", margin: 0, lineHeight: 1 }}>
                  {vigentes.length.toLocaleString("es-PE")}
                </p>
              </div>
              <div style={{ width: 1, height: "2rem", background: "rgba(255,255,255,0.12)" }} />
              <div style={{ textAlign: "right" }}>
                <p style={{ fontSize: "0.72rem", color: "rgba(176,207,232,0.7)", letterSpacing: "0.05em", textTransform: "uppercase", margin: 0 }}>
                  Total electores
                </p>
                <p style={{ fontSize: "1rem", fontWeight: 700, color: "#fff", fontVariantNumeric: "tabular-nums", margin: 0, lineHeight: 1 }}>
                  {totalElectores.toLocaleString("es-PE")}
                </p>
              </div>
            </div>
          </div>
        </header>
        <main style={{ maxWidth: "1280px", margin: "0 auto", padding: "2rem 2rem 4rem" }}>
          {children}
        </main>
      </body>
    </html>
  );
}
