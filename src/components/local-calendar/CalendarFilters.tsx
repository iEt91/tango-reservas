import type { CalendarStatusFilter, CalendarServiceFilter } from "@/lib/calendar";
import type { Service } from "@/data/types";

type CalendarFiltersProps = {
  search: string;
  serviceFilter: CalendarServiceFilter;
  services: Service[];
  statusFilter: CalendarStatusFilter;
  visibleReservationCount: number;
  onSearchChange: (value: string) => void;
  onServiceFilterChange: (value: CalendarServiceFilter) => void;
  onStatusFilterChange: (value: CalendarStatusFilter) => void;
};

const statusOptions: Array<{ label: string; value: CalendarStatusFilter }> = [
  { label: "Todas", value: "all" },
  { label: "Pendiente", value: "pending" },
  { label: "Confirmada", value: "confirmed" },
  { label: "Cancelada", value: "cancelled" },
  { label: "Completada", value: "completed" },
  { label: "No-show", value: "no_show" },
];

export function CalendarFilters({
  search,
  serviceFilter,
  services,
  statusFilter,
  visibleReservationCount,
  onSearchChange,
  onServiceFilterChange,
  onStatusFilterChange,
}: CalendarFiltersProps) {
  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-3.5 shadow-2xl shadow-black/20 sm:px-5">
      <div className="space-y-3">
        <div className="space-y-0.5">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
            Filtros
          </p>
          <h2 className="text-sm font-semibold text-white">
            Buscar, estado y servicio
          </h2>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px_220px]">
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Buscar
            </span>
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              className="input-base"
              placeholder="Cliente, telefono, email, mesa o servicio"
            />
          </label>

          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Estado
            </span>
            <select
              value={statusFilter}
              onChange={(event) =>
                onStatusFilterChange(event.target.value as CalendarStatusFilter)
              }
              className="input-base"
            >
              {statusOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Servicio
            </span>
            <select
              value={serviceFilter}
              onChange={(event) =>
                onServiceFilterChange(event.target.value as CalendarServiceFilter)
              }
              className="input-base"
            >
              <option value="all">Todos</option>
              {services.map((service) => (
                <option key={service.id} value={service.id}>
                  {service.name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
          <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-cyan-100">
            Resultados: {visibleReservationCount} reservas
          </span>
        </div>
      </div>
    </section>
  );
}
