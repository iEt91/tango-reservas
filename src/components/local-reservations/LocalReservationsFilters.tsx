type ReservationScope = "all" | "pending" | "confirmed" | "cancelled" | "completed" | "no_show";
type ReservationDateFilter = "all" | "today" | "tomorrow" | "week" | "custom";

type LocalReservationsFiltersProps = {
  dateFilter: ReservationDateFilter;
  customDate: string;
  hasActiveFilters: boolean;
  onClearFilters: () => void;
  onClearLocalReservations?: () => void;
  onCustomDateChange: (value: string) => void;
  onDateFilterChange: (value: ReservationDateFilter) => void;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: ReservationScope) => void;
  resultsCount: number;
  search: string;
  statusFilter: ReservationScope;
  clearLocalReservationsLabel?: string;
  hideClearLocalReservations?: boolean;
};

const statusFilterOptions: Array<{ label: string; value: ReservationScope }> = [
  { label: "Todas", value: "all" },
  { label: "Pendientes", value: "pending" },
  { label: "Confirmadas", value: "confirmed" },
  { label: "Canceladas", value: "cancelled" },
  { label: "Completadas", value: "completed" },
  { label: "No-show", value: "no_show" },
];

const dateFilterOptions: Array<{ label: string; value: ReservationDateFilter }> = [
  { label: "Todas", value: "all" },
  { label: "Hoy", value: "today" },
  { label: "Manana", value: "tomorrow" },
  { label: "Esta semana", value: "week" },
  { label: "Personalizada", value: "custom" },
];

export function LocalReservationsFilters({
  dateFilter,
  customDate,
  hasActiveFilters,
  onClearFilters,
  onClearLocalReservations,
  onCustomDateChange,
  onDateFilterChange,
  onSearchChange,
  onStatusFilterChange,
  resultsCount,
  search,
  statusFilter,
  clearLocalReservationsLabel = "Limpiar reservas locales",
  hideClearLocalReservations = false,
}: LocalReservationsFiltersProps) {
  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-3.5 shadow-2xl shadow-black/20 sm:px-5">
      <div className="flex flex-col gap-2.5 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-0.5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
            Filtros operativos
          </p>
          <h2 className="text-base font-semibold text-white">
            Buscar y segmentar reservas
          </h2>
        </div>

        <div className="flex flex-wrap gap-1.5">
          <button
            type="button"
            onClick={onClearFilters}
            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
          >
            Limpiar filtros
          </button>
          {!hideClearLocalReservations ? (
            <button
              type="button"
              onClick={onClearLocalReservations}
              className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-[11px] font-medium text-rose-100 transition hover:border-rose-300/50 hover:bg-rose-500/20"
            >
              {clearLocalReservationsLabel}
            </button>
          ) : null}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {statusFilterOptions.map((option) => {
          const isActive = option.value === statusFilter;

          return (
            <button
              key={option.value}
              type="button"
              onClick={() => onStatusFilterChange(option.value)}
              className={`rounded-full border px-3 py-1.5 text-[11px] font-medium transition ${
                isActive
                  ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100"
                  : "border-white/10 bg-white/5 text-slate-300 hover:border-cyan-400/30 hover:text-white"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      <div className="mt-3 grid gap-2.5 xl:grid-cols-[1.45fr_0.76fr_0.76fr_0.76fr_auto_auto]">
        <label className="space-y-1 xl:col-span-2">
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
            Buscar
          </span>
          <input
            value={search}
            onChange={(event) => onSearchChange(event.target.value)}
            placeholder="Nombre, telefono o email"
            className="input-base"
          />
        </label>

        <label className="space-y-1">
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
            Estado
          </span>
          <select
            value={statusFilter}
            onChange={(event) =>
              onStatusFilterChange(event.target.value as ReservationScope)
            }
            className="input-base"
          >
            {statusFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
            Fecha
          </span>
          <select
            value={dateFilter}
            onChange={(event) =>
              onDateFilterChange(event.target.value as ReservationDateFilter)
            }
            className="input-base"
          >
            {dateFilterOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-1">
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
            Fecha personalizada
          </span>
          <input
            type="date"
            value={customDate}
            onChange={(event) => onCustomDateChange(event.target.value)}
            className="input-base"
          />
        </label>
      </div>

      <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-400">
        <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-0.5">
          {resultsCount} resultados
        </span>
        <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-0.5">
          {hasActiveFilters ? "Filtros activos" : "Sin filtros aplicados"}
        </span>
        {dateFilter === "custom" && !customDate ? (
          <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-0.5 text-amber-100">
            Elegi una fecha personalizada
          </span>
        ) : null}
      </div>
    </section>
  );
}
