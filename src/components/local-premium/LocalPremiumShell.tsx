"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import type { Business } from "@/data/types";
import { getBusinesses } from "@/lib/data/admin-businesses";
import {
  buildLocalAccessHref,
  buildLocalBusinessHref,
  getLocalAccessMode,
  getLocalBusinessSlugFromSearchParams,
  LOCAL_ACCESS_MODE_QUERY_KEY,
} from "@/lib/local-business-routing";
import { LocalPremiumSidebar } from "@/components/local-premium/LocalPremiumSidebar";
import { LocalPremiumTopbar } from "@/components/local-premium/LocalPremiumTopbar";
import designLabStyles from "@/components/design-lab/TangoDesignLabDashboard.module.css";

type LocalPremiumShellProps = {
  children: ReactNode;
};

type LocalNavigationItem = {
  href: string;
  label: string;
  icon: "home" | "calendar" | "book" | "map" | "users" | "settings" | "menu" | "globe" | "chart";
};

const navigation: LocalNavigationItem[] = [
  { href: "/local", label: "Inicio", icon: "home" },
  { href: "/local/reservas", label: "Reservas", icon: "calendar" },
  { href: "/local/calendario", label: "Calendario", icon: "book" },
  { href: "/local/plano", label: "Plano", icon: "map" },
  { href: "/local/crm", label: "CRM", icon: "users" },
  { href: "/local/configuracion", label: "Configuración", icon: "settings" },
  { href: "/local/menu", label: "Menú", icon: "menu" },
  { href: "/local/web", label: "Web", icon: "globe" },
  { href: "/local/reportes", label: "Reportes", icon: "chart" },
];

function formatBusinessLabel(slug: string) {
  const normalized = slug.trim();

  if (!normalized) {
    return "Demuru";
  }

  return normalized
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function isActiveRoute(pathname: string, href: string) {
  if (href === "/local") {
    return pathname === href;
  }

  if (href === "/local/reservas" && pathname.startsWith("/local/reservas-lab")) {
    return true;
  }

  if (href === "/local/calendario" && pathname.startsWith("/local/calendario-lab")) {
    return true;
  }

  if (href === "/local/plano" && pathname.startsWith("/local/plano-lab")) {
    return true;
  }

  if (href === "/local/crm" && pathname.startsWith("/local/crm-lab")) {
    return true;
  }

  if (href === "/local/configuracion" && pathname.startsWith("/local/configuracion-lab")) {
    return true;
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function LocalPremiumShell({ children }: LocalPremiumShellProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const accessMode = getLocalAccessMode(searchParams);
  const currentBusinessSlug = getLocalBusinessSlugFromSearchParams(searchParams);
  const currentBusinessLabel = formatBusinessLabel(currentBusinessSlug);
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

  const webHref = currentBusinessSlug ? `/${currentBusinessSlug}` : "/demuru";

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
    <div className={`${designLabStyles.shell} relative overflow-hidden`}>
      <LocalPremiumSidebar
        businessLabel={currentBusinessLabel}
        businessImageAlt={sidebarBusiness?.name ?? currentBusinessLabel}
        businessImageUrl={sidebarBusiness?.coverImageUrl || sidebarBusiness?.logoUrl || ""}
        navItems={navItems}
        webHref={webHref}
      />

      <div className="ml-[225px] min-h-screen min-w-0 overflow-hidden">
        <div className="flex h-screen min-h-0 w-[calc(100vw-225px)] flex-col overflow-hidden">
          <LocalPremiumTopbar
            businessLabel={currentBusinessLabel}
            isSupportMode={isSupportMode}
            supportHref={supportHref}
          />

          <main className="min-w-0 flex-1 overflow-hidden px-3 py-3 sm:px-4 sm:py-4 lg:px-5">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}

