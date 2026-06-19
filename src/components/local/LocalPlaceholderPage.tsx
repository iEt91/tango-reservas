type LocalPlaceholderPageProps = {
  title: string;
  description: string;
};

export function LocalPlaceholderPage({
  title,
  description,
}: LocalPlaceholderPageProps) {
  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-5 shadow-2xl shadow-black/20 sm:px-5 sm:py-6">
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
        {title}
      </p>
      <h2 className="mt-1 text-xl font-semibold text-white">{title}</h2>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
        {description}
      </p>
      <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        <article className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-4 text-sm text-slate-200">
          Esta seccion quedara lista en una version posterior del Panel del Local.
        </article>
        <article className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-4 text-sm text-slate-200">
          Por ahora solo muestra un placeholder elegante y estable.
        </article>
        <article className="rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-4 text-sm text-slate-200">
          La logica comun seguira viviendo en capas reutilizables.
        </article>
      </div>
    </section>
  );
}
