export function LocalNoActiveBusinessesState() {
  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-300 shadow-2xl shadow-black/20 sm:px-5">
      <p className="font-medium text-white">No hay negocios activos disponibles.</p>
      <p className="mt-1.5 text-xs leading-5 text-slate-400">
        Activá un negocio desde Admin para seguir usando el Panel del Local con datos
        reales.
      </p>
    </section>
  );
}
