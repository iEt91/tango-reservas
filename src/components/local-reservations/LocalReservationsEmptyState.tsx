type LocalReservationsEmptyStateProps = {
  onClearFilters: () => void;
  emptyMessage?: string;
};

export function LocalReservationsEmptyState({
  onClearFilters,
  emptyMessage = "No hay reservas que coincidan con estos filtros.",
}: LocalReservationsEmptyStateProps) {
  return (
    <section className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/5 p-6 text-center shadow-2xl shadow-black/20">
      <p className="text-sm font-medium text-white">
        {emptyMessage}
      </p>
      <p className="mt-1.5 text-xs text-slate-400">
        Proba limpiando los filtros o cambiando de negocio.
      </p>
      <div className="mt-5">
        <button
          type="button"
          onClick={onClearFilters}
          className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
        >
          Limpiar filtros
        </button>
      </div>
    </section>
  );
}
