"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/",            label: "Inicio",               icon: "🏠" },
  { href: "/trayectoria", label: "Trayectoria del universo", icon: "📈" },
  { href: "/mapa",        label: "Mapa de distribución", icon: "🗺️" },
  { href: "/ficha",       label: "Trazabilidad por MCP", icon: "🔍" },
];

interface SidebarProps {
  totalMcps: number;
  totalElectores: number;
  nNuevas: number;
}

export default function Sidebar({ totalMcps, totalElectores, nNuevas }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside className="w-72 shrink-0 border-r border-slate-200 bg-slate-50 px-5 py-6 flex flex-col">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">📋</span>
        <h1 className="text-lg font-semibold text-[#002F56]">Dashboard MCP</h1>
      </div>
      <p className="text-sm text-slate-500 mb-6">
        Trazabilidad de envíos del padrón de MCPs — RENIEC
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

      <div className="mt-auto pt-6 border-t border-slate-200 text-xs text-slate-500 space-y-0.5">
        <p>
          <strong className="text-slate-700">{totalMcps.toLocaleString("es-PE")}</strong> MCPs vigentes
        </p>
        <p>
          <strong className="text-slate-700">{totalElectores.toLocaleString("es-PE")}</strong> electores (final)
        </p>
        <p>
          <strong className="text-slate-700">{nNuevas}</strong> MCPs sin dato en febrero
        </p>
      </div>
    </aside>
  );
}
