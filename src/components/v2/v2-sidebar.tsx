"use client";

import Link from "next/link";
import {
  BookOpenText,
  Boxes,
  CalendarDays,
  CircleDollarSign,
  ChefHat,
  Globe2,
  Home,
  Map,
  History,
  PackageCheck,
  ChartNoAxesCombined,
  WalletCards,
  Settings,
  UsersRound,
  Utensils,
  ExternalLink,
} from "lucide-react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/v2/v2-utils";
import { v2CurrentLocal } from "@/lib/v2/v2-mock-data";

const navItems = [
  { href: "/local", label: "Inicio", icon: Home },
  { href: "/local/reservas", label: "Reservas", icon: CalendarDays },
  { href: "/local/plano", label: "Plano", icon: Map },
  { href: "/local/envios", label: "Envíos", icon: PackageCheck },
  { href: "/local/cocina", label: "Cocina", icon: ChefHat },
  { href: "/local/caja", label: "Caja", icon: CircleDollarSign },
  { href: "/local/clientes", label: "Clientes", icon: UsersRound },
  { href: "/local/menu", label: "Menú", icon: BookOpenText },
  { href: "/local/stock", label: "Stock", icon: Boxes },
  { href: "/local/historial", label: "Historial", icon: History },
  { href: "/local/reportes", label: "Reportes", icon: ChartNoAxesCombined },
  { href: "/local/gastos", label: "Gastos", icon: WalletCards },
  { href: "/local/web", label: "Web", icon: Globe2 },
  { href: "/local/configuracion", label: "Configuración", icon: Settings },
];

export function V2Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden min-h-screen w-[260px] shrink-0 border-r border-slate-200 bg-white p-4 lg:flex lg:flex-col">
      <div className="flex h-12 items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-700 text-white">
          <Utensils size={18} />
        </div>
        <div className="text-lg font-bold tracking-tight text-slate-950">
          Tango <span className="text-emerald-700">Reservas</span>
        </div>
      </div>

      <div className="mt-6 rounded-[14px] border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-700">
            D
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-slate-950">
              {v2CurrentLocal.name}
            </p>
            <a
              href={`https://${v2CurrentLocal.publicUrl}`}
              target="_blank"
              className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-700"
            >
              Ver sitio público <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </div>

      <nav className="mt-6 space-y-1">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active =
            item.href === "/local"
              ? pathname === "/local"
              : pathname.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex h-11 items-center gap-3 rounded-[10px] px-3 text-sm font-medium transition-colors",
                active
                  ? "bg-emerald-50 text-emerald-700"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950"
              )}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto rounded-[14px] border border-slate-200 bg-white p-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-orange-100 text-xs font-bold text-orange-700">
            MA
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-950">
              {v2CurrentLocal.owner}
            </p>
            <p className="text-xs text-slate-500">{v2CurrentLocal.role}</p>
          </div>
        </div>
      </div>
    </aside>
  );
}
