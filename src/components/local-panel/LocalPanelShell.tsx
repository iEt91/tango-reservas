"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Business } from "@/data/types";
import { getBusinesses } from "@/lib/data/admin-businesses";
import { LocalSidebar } from "@/components/local-panel/LocalSidebar";
import { LocalTopbar } from "@/components/local-panel/LocalTopbar";
import { getDataSource } from "@/lib/data/dataSource";
import {
  buildLocalAccessHref,
  buildLocalBusinessHref,
  getLocalAccessMode,
  getLocalBusinessSlugFromSearchParams,
  LOCAL_ACCESS_MODE_QUERY_KEY,
} from "@/lib/local-business-routing";

type LocalPanelShellProps = {
  children: ReactNode;
};

type LocalNavigationItem = {
  href: string;
  label: string;
  shortLabel: string;
};

const navigation: LocalNavigationItem[] = [
  { href: "/local", label: "Inicio", shortLabel: "Home" },
  { href: "/local/reservas", label: "Reservas", shortLabel: "Res." },
  { href: "/local/calendario", label: "Calendario", shortLabel: "Cal." },
  { href: "/local/plano", label: "Plano", shortLabel: "Plano" },
  { href: "/local/crm", label: "CRM", shortLabel: "CRM" },
  { href: "/local/configuracion", label: "Configuración", shortLabel: "Config." },
  { href: "/local/menu", label: "Menú", shortLabel: "Menu" },
  { href: "/local/web", label: "Web", shortLabel: "Web" },
  { href: "/local/reportes", label: "Reportes", shortLabel: "Rep." },
];

function getRouteMeta(pathname: string) {
  if (pathname === "/local" || pathname === "/local/") {
    return {
      title: "Inicio",
      subtitle: "Resumen en tiempo real de tu restaurante.",
    };
  }

  if (pathname.startsWith("/local/reservas")) {
    return {
      title: "Reservas",
      subtitle: "Gestiona reservas, estados y asignación de mesas en tiempo real.",
    };
  }

  if (pathname.startsWith("/local/calendario")) {
    return {
      title: "Calendario",
      subtitle: "Agenda operativa con filtros y ocupación por franja horaria.",
    };
  }

  if (pathname.startsWith("/local/plano")) {
    return {
      title: "Plano",
      subtitle: "Diseña el salón, revisa mesas y controla la ocupación del local.",
    };
  }

  if (pathname.startsWith("/local/crm")) {
    return {
      title: "CRM",
      subtitle: "Clientes, historial, notas y preferencias del negocio.",
    };
  }

  if (pathname.startsWith("/local/configuracion")) {
    return {
      title: "Configuración",
      subtitle: "Horarios, reglas de reserva y parámetros del negocio.",
    };
  }

  if (pathname.startsWith("/local/menu")) {
    return {
      title: "Menú",
      subtitle: "Categorías, platos y disponibilidad pública.",
    };
  }

  if (pathname.startsWith("/local/web")) {
    return {
      title: "Web",
      subtitle: "Contenido público, galería y presentación del negocio.",
    };
  }

  if (pathname.startsWith("/local/reportes")) {
    return {
      title: "Reportes",
      subtitle: "Métricas operativas, demanda y rendimiento por período.",
    };
  }

  return {
    title: "Panel local",
    subtitle: "Operación diaria del negocio.",
  };
}

function formatBusinessLabel(slug: string) {
  const normalized = slug.trim();

  if (!normalized) {
    return "Negocio actual";
  }

  return normalized
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isActiveRoute(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function LocalPanelShell({ children }: LocalPanelShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const accessMode = getLocalAccessMode(searchParams);
  const dataSource = getDataSource();
  const currentBusinessSlug = getLocalBusinessSlugFromSearchParams(searchParams);
  const currentBusinessLabel = formatBusinessLabel(currentBusinessSlug);
  const routeMeta = getRouteMeta(pathname);
  const isSupportMode = accessMode === "support";
  const [sidebarBusiness, setSidebarBusiness] = useState<Business | null>(null);

  useEffect(() => {
    let cancelled = false;

    const syncSidebarBusiness = async () => {
      const nextBusinesses = await getBusinesses();
      if (cancelled) {
        return;
      }

      const matchedBusiness =
        nextBusinesses.find((business) => business.slug === currentBusinessSlug) ??
        nextBusinesses.find((business) => business.id === currentBusinessSlug) ??
        null;

      setSidebarBusiness(matchedBusiness);
    };

    void syncSidebarBusiness();

    return () => {
      cancelled = true;
    };
  }, [currentBusinessSlug]);

  const supportHref = (() => {
    const query = new URLSearchParams(searchParams.toString());
    query.delete(LOCAL_ACCESS_MODE_QUERY_KEY);
    query.delete("support");
    const queryString = query.toString();
    return queryString ? `${pathname}?${queryString}` : pathname;
  })();

  const webHref = currentBusinessSlug ? `/${currentBusinessSlug}` : "/";

  const navItems = navigation.map((item) => {
    const href = isSupportMode
      ? buildLocalAccessHref(item.href, currentBusinessSlug, searchParams, "support")
      : buildLocalBusinessHref(item.href, currentBusinessSlug, searchParams);

    return {
      ...item,
      active: isActiveRoute(pathname, item.href),
      href,
    };
  });

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.14),transparent_30%),radial-gradient(circle_at_top_right,rgba(59,130,246,0.14),transparent_28%),linear-gradient(180deg,#030712_0%,#050816_55%,#0f172a_100%)] text-slate-100">
      <div className="pointer-events-none absolute inset-0 opacity-75">
        <div className="absolute left-0 top-20 h-64 w-64 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="absolute right-0 top-0 h-72 w-72 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-slate-500/10 blur-3xl" />
      </div>

      <LocalSidebar
        accessModeLabel={isSupportMode ? "Soporte" : "Dueño"}
        businessLabel={currentBusinessLabel}
        businessImageAlt={sidebarBusiness?.name ?? currentBusinessLabel}
        businessImageUrl={sidebarBusiness?.coverImageUrl || sidebarBusiness?.logoUrl || ""}
        dataSourceLabel={dataSource === "supabase" ? "Supabase" : "Local"}
        navItems={navItems}
        webHref={webHref}
      />

      <div className="relative min-h-screen pl-0 xl:pl-[260px]">
        <div className="flex min-h-screen w-full flex-col">
          <LocalTopbar
            accessModeLabel={isSupportMode ? "Modo soporte" : "Negocio fijo"}
            businessLabel={currentBusinessLabel}
            isSupportMode={isSupportMode}
            subtitle={routeMeta.subtitle}
            supportHref={supportHref}
            title={routeMeta.title}
            webHref={webHref}
          />

          <main className="min-w-0 flex-1 px-3 py-3 sm:px-4 sm:py-4 lg:px-5">{children}</main>
        </div>
      </div>
    </div>
  );
}
