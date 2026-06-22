"use client";

import { useEffect, useState } from "react";
import type { Business } from "@/data/types";

type FloorPlanToolbarProps = {
  business: Business | null;
  businesses: Business[];
  onBusinessChange: (businessId: string) => void;
  onNewTable: () => void;
  onResetPlan: () => void;
  onResetBackground: () => void;
  selectedBusinessId: string;
  dataSourceLabel: string;
  canChangeBusiness: boolean;
};

export function FloorPlanToolbar({
  business,
  businesses,
  onBusinessChange,
  onNewTable,
  onResetPlan,
  onResetBackground,
  selectedBusinessId,
  dataSourceLabel,
  canChangeBusiness,
}: FloorPlanToolbarProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4 shadow-2xl shadow-black/20 sm:px-5 sm:py-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
            Plano del local
          </p>
          <div className="space-y-1">
            <h1 className="text-[1.35rem] font-semibold tracking-tight text-white sm:text-[1.55rem]">
              Disena el layout del salon
            </h1>
            <p className="max-w-3xl text-xs leading-5 text-slate-300 sm:text-sm">
              Crear, editar y mover mesas del negocio seleccionado. La fuente de datos se
              adapta al modo activo y la union de mesas seguira llegando en proximas
              versiones.
            </p>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          {canChangeBusiness ? (
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Negocio
              </span>
              {isMounted ? (
                <select
                  value={selectedBusinessId}
                  onChange={(event) => onBusinessChange(event.target.value)}
                  className="input-base min-w-[240px]"
                >
                  {businesses.length > 0 ? (
                    businesses.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))
                  ) : (
                    <option value="" disabled>
                      Cargando negocios...
                    </option>
                  )}
                </select>
              ) : (
                <div className="input-base flex min-w-[240px] items-center text-slate-400">
                  Cargando negocios...
                </div>
              )}
            </label>
          ) : (
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Negocio
              </span>
              <div className="input-base flex min-w-[240px] items-center text-slate-100">
                {business?.name ?? "Negocio asignado"}
              </div>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onNewTable}
              className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Nueva mesa
            </button>
            <button
              type="button"
              onClick={onResetPlan}
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:text-white"
            >
              Resetear plano local
            </button>
            <button
              type="button"
              onClick={onResetBackground}
              className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:text-white"
            >
              Quitar fondo
            </button>
          </div>
        </div>
      </div>

      {isMounted && business ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-300">
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-2 py-0.5">
            {business.category}
          </span>
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-2 py-0.5">
            {business.city}
          </span>
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-2 py-0.5">
            Fuente de datos: {dataSourceLabel}
          </span>
        </div>
      ) : isMounted ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-300">
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-2 py-0.5">
            Fuente de datos: {dataSourceLabel}
          </span>
        </div>
      ) : null}
    </section>
  );
}
