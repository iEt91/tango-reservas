import type { Business } from "@/data/types";

type LocalCrmHeaderProps = {
  business: Business | null;
  businesses: Business[];
  onBusinessChange: (businessId: string) => void;
  selectedBusinessId: string;
  customerCount: number;
  sourceLabel: string;
};

export function LocalCrmHeader({
  business,
  businesses,
  onBusinessChange,
  selectedBusinessId,
  customerCount,
  sourceLabel,
}: LocalCrmHeaderProps) {
  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4 shadow-2xl shadow-black/20 sm:px-5 sm:py-4">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
            Panel del Local
          </p>
          <h1 className="text-[1.45rem] font-semibold tracking-tight text-white sm:text-[1.65rem]">
            CRM básico
          </h1>
          <p className="max-w-3xl text-xs leading-5 text-slate-300 sm:text-sm">
            {sourceLabel === "Supabase"
              ? "Clientes y notas se leen y actualizan desde Supabase. Los reportes avanzados siguen pendientes."
              : "Clientes derivados de las reservas locales/mock, con notas, tags y preferencias guardadas solo en este navegador."}
          </p>
        </div>

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
            {customerCount} clientes
          </span>
          <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-cyan-100">
            Fuente de datos: {sourceLabel}
          </span>
        </div>
      ) : null}
    </section>
  );
}
