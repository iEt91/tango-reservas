import Link from "next/link";

type LocalTopbarProps = {
  title: string;
  subtitle: string;
  businessLabel: string;
  accessModeLabel: string;
  isSupportMode: boolean;
  supportHref: string;
  webHref: string;
};

export function LocalTopbar({
  title,
  subtitle,
  businessLabel,
  accessModeLabel,
  isSupportMode,
  supportHref,
  webHref,
}: LocalTopbarProps) {
  return (
    <div className="sticky top-0 z-30 border-b border-white/10 bg-[rgba(7,17,31,0.88)] px-4 py-3 backdrop-blur-xl sm:px-5 lg:px-6">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="space-y-1">
          <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
            {isSupportMode ? "Modo soporte" : "Modo dueño"}
          </p>
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-[1.15rem] font-semibold tracking-tight text-white sm:text-[1.28rem]">
              {title}
            </h1>
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300">
              {businessLabel}
            </span>
            <span
              className={`rounded-full px-2.5 py-1 text-[11px] ${
                isSupportMode
                  ? "border border-cyan-400/20 bg-cyan-400/10 text-cyan-100"
                  : "border border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
              }`}
            >
              {accessModeLabel}
            </span>
          </div>
          <p className="max-w-3xl text-[13px] leading-5 text-slate-300">{subtitle}</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="hidden min-w-[340px] items-center gap-3 rounded-[0.8rem] border border-white/10 bg-white/[0.04] px-4 py-2.5 text-slate-400 shadow-inner shadow-black/20 md:flex">
            <span className="text-slate-500">⌕</span>
            <span className="text-sm">Buscar reservas, clientes, mesas...</span>
            <span className="ml-auto rounded-md border border-white/10 bg-slate-900/80 px-2 py-0.5 text-[10px] uppercase tracking-[0.18em] text-slate-500">
              ⌘ K
            </span>
          </div>

          {isSupportMode ? (
            <Link
              href={supportHref}
              className="inline-flex items-center justify-center rounded-[0.75rem] border border-cyan-400/20 bg-cyan-400/10 px-3.25 py-2 text-sm font-medium text-cyan-50 transition hover:border-cyan-300/30 hover:bg-cyan-400/15"
            >
              Salir de soporte
            </Link>
          ) : null}

          <button
            type="button"
            className="relative inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-slate-200 transition hover:border-cyan-400/30 hover:text-white"
            aria-label="Notificaciones"
          >
            <span className="text-lg">🔔</span>
            <span className="absolute right-0 top-0 inline-flex h-4 min-w-4 items-center justify-center rounded-full border border-slate-950 bg-cyan-400 px-1 text-[10px] font-semibold text-slate-950">
              3
            </span>
          </button>

          <button
            type="button"
            className="flex items-center gap-3 rounded-[0.95rem] border border-white/10 bg-white/[0.04] px-3 py-2 text-left transition hover:border-cyan-400/25 hover:bg-white/[0.06]"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[radial-gradient(circle_at_top_left,rgba(244,205,144,0.95),rgba(159,111,42,0.95))] text-sm font-semibold text-slate-950">
              M
            </div>
            <div className="leading-tight">
              <p className="text-sm font-medium text-white">Mariano Demuru</p>
              <p className="text-[11px] text-slate-400">Propietario</p>
            </div>
            <span className="ml-1 text-slate-500">⌄</span>
          </button>
        </div>
      </div>
    </div>
  );
}
