import type { Business } from "@/data/types";
import { getDataSource } from "@/lib/data/dataSource";

type LocalReservationsHeaderProps = {
  business: Business | null;
  businesses: Business[];
  serviceCount: number;
  onBusinessChange: (businessId: string) => void;
  selectedBusinessId: string;
  canChangeBusiness: boolean;
};

export function LocalReservationsHeader({
  business,
  businesses,
  serviceCount,
  onBusinessChange,
  selectedBusinessId,
  canChangeBusiness,
}: LocalReservationsHeaderProps) {
  const dataSource = getDataSource();
  const sourceBadge =
    dataSource === "supabase"
      ? "Fuente de datos: Supabase"
      : "Modo local. Estos datos viven en tu navegador hasta conectar Supabase.";

  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4 shadow-2xl shadow-black/20 sm:px-5 sm:py-5">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
            Reservas
          </p>
          <h1 className="text-[1.5rem] font-semibold tracking-tight text-white sm:text-[1.7rem]">
            Gestiona las reservas del local, cambios de estado y disponibilidad.
          </h1>
          <p className="max-w-3xl text-xs leading-5 text-slate-300 sm:text-sm">
            Panel operativo para el dia a dia.{" "}
            {dataSource === "supabase"
              ? "Las reservas se leen y actualizan desde Supabase."
              : "La web publica guarda reservas en la capa local y este tablero las procesa sin Supabase."}
          </p>
        </div>

        {canChangeBusiness ? (
          <label className="space-y-1 lg:min-w-[240px] lg:text-right">
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Negocio
            </span>
            <select
              value={selectedBusinessId}
              onChange={(event) => onBusinessChange(event.target.value)}
              className="input-base min-w-[260px]"
            >
              {businesses.map((entry) => (
                <option key={entry.id} value={entry.id}>
                  {entry.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <div className="space-y-1 lg:min-w-[240px] lg:text-right">
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Negocio
            </span>
            <div className="input-base min-w-[260px] text-slate-100">
              {business?.name ?? "Negocio asignado"}
            </div>
          </div>
        )}
      </div>

      {business ? (
        <div className="mt-3 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-300">
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-2 py-0.5">
            {business.category}
          </span>
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-2 py-0.5">
            {business.city}
          </span>
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-2 py-0.5">
            {serviceCount} servicios
          </span>
          <span
            className={`rounded-full px-2 py-0.5 ${
              dataSource === "supabase"
                ? "border border-cyan-400/20 bg-cyan-500/10 text-cyan-100"
                : "border border-cyan-400/20 bg-cyan-500/10 text-cyan-100"
            }`}
          >
            {sourceBadge}
          </span>
        </div>
      ) : null}
    </section>
  );
}
