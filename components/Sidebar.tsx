"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Resumen ejecutivo", icon: "🏠" },
  { href: "/evolucion", label: "Evolución de electores", icon: "📈" },
  { href: "/mapa-errores", label: "Mapa de errores", icon: "⚠️" },
  { href: "/ficha", label: "Ficha por MCP", icon: "🔍" },
];

interface SidebarProps {
  totalMcps: number;
  nSubsanados: number;
  nPendientes: number;
}

export default function Sidebar({ totalMcps, nSubsanados, nPendientes }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-72 shrink-0 border-r border-slate-200 bg-slate-50 px-5 py-6 flex flex-col">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">📋</span>
        <h1 className="text-lg font-semibold text-[#002F56]">Dashboard MCP</h1>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Auditoría de correcciones del padrón de MCPs — RENIEC
      </p>

      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
                active
                  ? "bg-[#002F56] text-white"
                  : "text-slate-700 hover:bg-slate-200"
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto pt-6 border-t border-slate-200 text-xs text-slate-500">
        <p>
          <strong className="text-slate-700">{totalMcps.toLocaleString("es-PE")}</strong> MCPs ·{" "}
          <strong className="text-slate-700">{nSubsanados}</strong> subsanados ·{" "}
          <strong className="text-slate-700">{nPendientes}</strong> pendientes
        </p>
      </div>
    </aside>
  );
}
