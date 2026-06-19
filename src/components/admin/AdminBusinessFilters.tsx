import type { BusinessFiltersState } from "@/data/types";

type AdminBusinessFiltersProps = {
  filters: BusinessFiltersState;
  onFiltersChange: (next: BusinessFiltersState) => void;
  totalCount: number;
  visibleCount: number;
};

const cityOptions = [
  { value: "all", label: "Todas" },
  { value: "Pinamar", label: "Pinamar" },
  { value: "Cariló", label: "Cariló" },
  { value: "Valeria del Mar", label: "Valeria del Mar" },
  { value: "Villa Gesell", label: "Villa Gesell" },
  { value: "other", label: "Otra" },
];

const categoryOptions = [
  { value: "all", label: "Todos" },
  { value: "restaurante", label: "Restaurante" },
  { value: "bar", label: "Bar" },
  { value: "cafetería", label: "Cafetería" },
  { value: "parador", label: "Parador" },
  { value: "hotel", label: "Hotel" },
  { value: "belleza", label: "Belleza" },
  { value: "salud", label: "Salud" },
  { value: "other", label: "Otro" },
];

const sortOptions: Array<{ value: BusinessFiltersState["sortBy"]; label: string }> = [
  { value: "name", label: "Nombre" },
  { value: "status", label: "Estado" },
  { value: "city", label: "Localidad" },
  { value: "reservations", label: "Más reservas" },
  { value: "activity", label: "Última actividad" },
];

export function AdminBusinessFilters({
  filters,
  onFiltersChange,
  totalCount,
  visibleCount,
}: AdminBusinessFiltersProps) {
  const activeFilters = [
    filters.search.trim(),
    filters.status !== "all" ? filters.status : "",
    filters.city !== "all" ? filters.city : "",
    filters.category !== "all" ? filters.category : "",
    filters.sortBy !== "name" ? filters.sortBy : "",
  ].filter(Boolean);

  return (
    <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div className="space-y-2">
          <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
            Filtros
          </p>
          <h2 className="text-xl font-semibold text-white">
            Buscador central de negocios
          </h2>
          <div className="flex flex-wrap gap-2 text-sm text-slate-300">
            <span>
              {visibleCount} de {totalCount} negocios visibles
            </span>
            {activeFilters.length > 0 ? (
              <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs text-cyan-100">
                {activeFilters.length} filtros activos
              </span>
            ) : (
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
                Sin filtros activos
              </span>
            )}
          </div>
        </div>

        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full border border-white/10 bg-slate-900/70 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
          onClick={() =>
            onFiltersChange({
              search: "",
              status: "all",
              city: "all",
              category: "all",
              sortBy: "name",
            })
          }
        >
          Limpiar filtros
        </button>
      </div>

      <div className="mt-5 grid gap-4 xl:grid-cols-2">
        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Buscar
          </span>
          <input
            type="search"
            value={filters.search}
            onChange={(event) =>
              onFiltersChange({ ...filters, search: event.target.value })
            }
            placeholder="Nombre, slug, rubro o localidad"
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-400/40"
          />
        </label>

        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Ordenar por
          </span>
          <select
            value={filters.sortBy}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                sortBy: event.target.value as BusinessFiltersState["sortBy"],
              })
            }
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
          >
            {sortOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Estado
          </span>
          <select
            value={filters.status}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                status: event.target.value as BusinessFiltersState["status"],
              })
            }
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
          >
            <option value="all">Todos</option>
            <option value="active">Activos</option>
            <option value="draft">Borradores</option>
            <option value="inactive">Inactivos</option>
          </select>
        </label>

        <label className="space-y-2">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Localidad
          </span>
          <select
            value={filters.city}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                city: event.target.value,
              })
            }
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
          >
            {cityOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="space-y-2 xl:col-span-2">
          <span className="text-xs uppercase tracking-[0.2em] text-slate-400">
            Rubro
          </span>
          <select
            value={filters.category}
            onChange={(event) =>
              onFiltersChange({
                ...filters,
                category: event.target.value,
              })
            }
            className="w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none transition focus:border-cyan-400/40"
          >
            {categoryOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>
    </section>
  );
}
