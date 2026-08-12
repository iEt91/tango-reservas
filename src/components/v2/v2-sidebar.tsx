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
import {
  useActiveBusiness,
  useBusinessMemberships,
} from "@/components/auth/active-business-provider";
import {
  hasStaffAccess,
  type StaffModuleKey,
} from "@/lib/staff/staff-contract";
import { cn } from "@/lib/v2/v2-utils";
import { V2SidebarUtilities } from "./v2-sidebar-utilities";

type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  moduleKey?: StaffModuleKey;
  ownerOnly?: boolean;
};

const navItems: NavItem[] = [
  { href: "/local", label: "Inicio", icon: Home, moduleKey: "home" },
  { href: "/local/reservas", label: "Reservas", icon: CalendarDays, moduleKey: "reservations" },
  { href: "/local/plano", label: "Plano", icon: Map, moduleKey: "floor_plan" },
  { href: "/local/envios", label: "Envíos", icon: PackageCheck, moduleKey: "shipping" },
  { href: "/local/cocina", label: "Cocina", icon: ChefHat, moduleKey: "kitchen" },
  { href: "/local/caja", label: "Caja", icon: CircleDollarSign, moduleKey: "cash" },
  { href: "/local/clientes", label: "Clientes", icon: UsersRound, moduleKey: "customers" },
  { href: "/local/menu", label: "Menú", icon: BookOpenText, moduleKey: "menu" },
  { href: "/local/stock", label: "Stock", icon: Boxes, moduleKey: "stock" },
  { href: "/local/historial", label: "Historial", icon: History, moduleKey: "history" },
  { href: "/local/reportes", label: "Reportes", icon: ChartNoAxesCombined, moduleKey: "reports" },
  { href: "/local/gastos", label: "Gastos", icon: WalletCards, moduleKey: "expenses" },
  { href: "/local/web", label: "Web", icon: Globe2, moduleKey: "web" },
  { href: "/local/configuracion", label: "Configuración", icon: Settings, ownerOnly: true },
];

export function V2Sidebar() {
  const pathname = usePathname();
  const activeBusiness = useActiveBusiness();
  const memberships = useBusinessMemberships();
  const isOwner = activeBusiness.role === "owner";
  const visibleNavItems = navItems.filter((item) => {
    if (item.ownerOnly) return isOwner;
    if (!item.moduleKey) return false;

    return hasStaffAccess(
      activeBusiness.permissions,
      item.moduleKey,
      "view",
    );
  });
  const businessInitial =
    activeBusiness.business.name.trim().charAt(0).toUpperCase() || "L";

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
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-sm font-bold text-emerald-700">
            {businessInitial}
          </div>
          <div className="min-w-0 flex-1">
            {memberships.length > 1 ? (
              <form method="post" action="/auth/select-business/activate">
                <input type="hidden" name="next" value="/local" />
                <select
                  name="businessId"
                  value={activeBusiness.businessId}
                  aria-label="Local activo"
                  onChange={(event) => event.currentTarget.form?.requestSubmit()}
                  className="w-full cursor-pointer truncate border-0 bg-transparent p-0 text-sm font-semibold text-slate-950 outline-none focus:ring-0"
                >
                  {memberships.map((membership) => (
                    <option
                      key={membership.businessId}
                      value={membership.businessId}
                    >
                      {membership.business.name}
                    </option>
                  ))}
                </select>
              </form>
            ) : (
              <p className="truncate text-sm font-semibold text-slate-950">
                {activeBusiness.business.name}
              </p>
            )}
            <Link
              href={`/${activeBusiness.business.slug}`}
              target="_blank"
              className="mt-0.5 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-emerald-700"
            >
              Ver sitio público <ExternalLink size={12} />
            </Link>
          </div>
        </div>
      </div>

      <V2SidebarUtilities />

      <nav className="mt-4 space-y-1 overflow-y-auto pr-1">
        {visibleNavItems.map((item) => {
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
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
              )}
            >
              <Icon size={20} />
              {item.label}
            </Link>
          );
        })}
      </nav>

    </aside>
  );
}
