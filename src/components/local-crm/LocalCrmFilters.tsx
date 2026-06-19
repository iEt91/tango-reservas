import type { CustomerFilter } from "@/lib/data/crm";

type LocalCrmFiltersProps = {
  filter: CustomerFilter;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onFilterChange: (filter: CustomerFilter) => void;
  onSearchChange: (value: string) => void;
  resultsCount: number;
  search: string;
};

const filterOptions: Array<{ label: string; value: CustomerFilter }> = [
  { label: "Todos", value: "all" },
  { label: "Recurrentes", value: "recurring" },
  { label: "Con cancelaciones", value: "cancelled" },
  { label: "Con no-show", value: "no_show" },
  { label: "Con próxima reserva", value: "next" },
  { label: "Sin email", value: "no_email" },
  { label: "Sin notas", value: "no_notes" },
  { label: "Con tags", value: "with_tags" },
];

export function LocalCrmFilters({
  filter,
  hasActiveFilters,
  onClearFilters,
  onFilterChange,
  onSearchChange,
  resultsCount,
  search,
}: LocalCrmFiltersProps) {
  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-3.5 shadow-2xl shadow-black/20 sm:px-5">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-0.5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
            Filtros operativos
          </p>
          <h2 className="text-sm font-semibold text-white">
            Buscar y segmentar clientes
          </h2>
        </div>

        <button
          type="button"
          onClick={onClearFilters}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
        >
          Limpiar filtros
        </button>
      </div>

      <div className="mt-3 grid gap-2 xl:grid-cols-[1.4fr_repeat(3,minmax(0,0.9fr))]">
        <label className="space-y-1">
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
            Buscar
          </span>
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Nombre, teléfono o email"
            className="input-base"
          />
        </label>

        <div className="flex flex-wrap gap-1.5 xl:col-span-3">
          {filterOptions.map((option) => {
            const active = option.value === filter;

            return (
              <button
                key={option.value}
                type="button"
                onClick={() => onFilterChange(option.value)}
                className={`inline-flex h-8 items-center justify-center whitespace-nowrap rounded-lg border px-3 text-[10px] font-medium leading-none tracking-tight transition sm:text-[11px] ${
                  active
                    ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100 shadow-[0_0_0_1px_rgba(34,211,238,0.12)]"
                    : "border-white/10 bg-white/5 text-slate-300 hover:border-cyan-400/30 hover:text-white"
                }`}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
        <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-0.5">
          {resultsCount} clientes visibles
        </span>
        <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-0.5">
          {hasActiveFilters ? "Filtros activos" : "Sin filtros aplicados"}
        </span>
      </div>
    </section>
  );
}

export type { CustomerFilter };
