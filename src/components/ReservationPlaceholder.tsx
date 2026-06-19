import type { ReactNode } from "react";

type ReservationPlaceholderProps = {
  title?: string;
  description?: string;
  children?: ReactNode;
};

export function ReservationPlaceholder({
  title = "Reservar",
  description = "En la siguiente etapa conectaremos disponibilidad, validaciones y creacion real de reservas. Este modulo queda separado del diseno visual para poder reemplazarlo sin tocar cada template.",
  children,
}: ReservationPlaceholderProps) {
  return (
    <section className="rounded-3xl border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 backdrop-blur">
      <div className="mb-4 flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            Reservas
          </p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
        </div>
        <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-xs text-slate-300">
          Preview
        </span>
      </div>
      <p className="max-w-3xl text-sm leading-6 text-slate-300">
        {description}
      </p>
      {children ? <div className="mt-6">{children}</div> : null}
    </section>
  );
}
