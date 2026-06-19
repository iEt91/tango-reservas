"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ReactNode } from "react";
import { WideContainer } from "@/components/WideContainer";
import {
  buildLocalBusinessHref,
  LOCAL_BUSINESS_QUERY_KEY,
} from "@/lib/local-business-routing";

type LocalAreaFrameProps = {
  children: ReactNode;
};

const tabs = [
  { label: "Reservas", href: "/local/reservas" },
  { label: "Calendario", href: "/local/calendario" },
  { label: "Plano", href: "/local/plano" },
  { label: "CRM", href: "/local/crm" },
  { label: "Configuracion", href: "/local/configuracion" },
  { label: "Menú", href: "/local/menu" },
  { label: "Web", href: "/local/web" },
  { label: "Reportes", href: "/local/reportes" },
];

function isActiveTab(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function LocalAreaFrame({ children }: LocalAreaFrameProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentBusinessSlug = searchParams.get(LOCAL_BUSINESS_QUERY_KEY)?.trim() ?? "";

  return (
    <WideContainer className="flex flex-col gap-4 py-8 sm:py-10">
      <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4 shadow-2xl shadow-black/20 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
              Panel del Local
            </p>
            <h1 className="text-[1.5rem] font-semibold tracking-tight text-white sm:text-[1.7rem]">
              Operacion diaria del negocio
            </h1>
            <p className="max-w-3xl text-xs leading-5 text-slate-300 sm:text-sm">
              Reservas, calendario, plano, CRM, configuracion, web y reportes
              quedan organizados por tabs para crecer sin mezclar la logica.
            </p>
          </div>

          <div className="rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-2 text-xs text-slate-300">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-500">
              Entrada principal
            </p>
            <p className="mt-1 font-medium text-white">/local/reservas</p>
          </div>
        </div>

        <nav className="mt-4 flex flex-wrap gap-2">
          {tabs.map((tab) => {
            const href = currentBusinessSlug
              ? buildLocalBusinessHref(tab.href, currentBusinessSlug, searchParams)
              : tab.href;
            const isActive = isActiveTab(pathname, tab.href);

            return (
              <Link
                key={tab.href}
                href={href}
                className={`rounded-full border px-3.5 py-2 text-sm font-medium transition ${
                  isActive
                    ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-cyan-400/30 hover:text-white"
                }`}
              >
                {tab.label}
              </Link>
            );
          })}
        </nav>
      </section>

      {children}
    </WideContainer>
  );
}
