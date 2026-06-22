import Link from "next/link";
import { APP_NAME, APP_VERSION } from "@/lib/constants";

type LocalSidebarNavItem = {
  href: string;
  label: string;
  shortLabel: string;
  active: boolean;
};

type LocalSidebarProps = {
  businessLabel: string;
  businessImageUrl?: string | null;
  businessImageAlt?: string;
  dataSourceLabel: string;
  accessModeLabel: string;
  navItems: LocalSidebarNavItem[];
  webHref: string;
};

export function LocalSidebar({
  businessLabel,
  businessImageUrl,
  businessImageAlt,
  dataSourceLabel,
  accessModeLabel,
  navItems,
  webHref,
}: LocalSidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[260px] p-3 xl:block">
      <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-[1rem] border border-white/10 bg-slate-950/82 shadow-[0_24px_70px_rgba(0,0,0,0.35)] backdrop-blur-xl">
        <div className="flex items-center gap-3 border-b border-white/5 px-4 py-4">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-400 via-sky-400 to-blue-500 text-lg font-black text-slate-950 shadow-[0_8px_24px_rgba(34,211,238,0.2)]">
            T
          </div>
          <div className="min-w-0">
            <p className="text-[0.9rem] font-semibold tracking-[0.24em] text-white">
              {APP_NAME.toUpperCase()}
            </p>
            <p className="text-[11px] uppercase tracking-[0.2em] text-slate-500">
              Panel local
            </p>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col px-3 py-3">
          <div className="rounded-[1rem] border border-white/10 bg-white/[0.04] px-3 py-3">
            <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Negocio activo</p>
            <div className="mt-2 flex items-center gap-3">
              <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-full border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.35),rgba(8,145,178,0.9))] text-[11px] font-bold text-slate-950 shadow-[0_10px_20px_rgba(34,211,238,0.15)]">
                {businessImageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={businessImageUrl}
                    alt={businessImageAlt ?? businessLabel}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  businessLabel.slice(0, 1).toUpperCase()
                )}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-base font-semibold text-white">{businessLabel}</p>
                <p className="mt-0.5 text-sm text-slate-400">Restaurante de autor</p>
              </div>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-slate-300">
              <span className="rounded-full border border-white/10 bg-slate-900/75 px-2.5 py-1">
                {dataSourceLabel}
              </span>
              <span className="rounded-full border border-white/10 bg-slate-900/75 px-2.5 py-1">
                {accessModeLabel}
              </span>
            </div>
          </div>

          <nav className="mt-3 min-h-0 flex-1 space-y-1 pr-1">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={`group flex items-center justify-between rounded-[0.8rem] border px-3 py-2.5 text-left text-sm font-medium transition ${
                  item.active
                    ? "border-cyan-400/25 bg-cyan-400/10 text-cyan-50 shadow-[0_8px_24px_rgba(34,211,238,0.08)]"
                    : "border-transparent text-slate-300 hover:border-white/10 hover:bg-white/[0.04] hover:text-white"
                }`}
              >
                <span className="flex items-center gap-3">
                  <span
                    className={`h-2.5 w-2.5 rounded-full transition ${
                      item.active
                        ? "bg-cyan-300 shadow-[0_0_0_4px_rgba(34,211,238,0.12)]"
                        : "bg-slate-600"
                    }`}
                  />
                  <span>{item.label}</span>
                </span>
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-500 group-hover:text-slate-300">
                  {item.shortLabel}
                </span>
              </Link>
            ))}
          </nav>

          <div className="mt-3 space-y-2 border-t border-white/5 pt-3">
            <Link
              href={webHref}
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between rounded-[0.85rem] border border-cyan-400/20 bg-cyan-400/10 px-3 py-2.5 text-sm font-medium text-cyan-50 transition hover:border-cyan-300/30 hover:bg-cyan-400/15"
            >
              <span>Ver mi sitio web</span>
              <span aria-hidden="true">↗</span>
            </Link>

            <div className="rounded-[0.95rem] border border-white/10 bg-slate-900/80 p-3 text-[11px] text-slate-300">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/5 text-sm font-semibold text-cyan-100">
                  M
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold text-white">Propietario</p>
                  <p className="mt-0.5 text-slate-400">Usuario actual del panel</p>
                </div>
                <span aria-hidden="true" className="text-slate-400">
                  ›
                </span>
              </div>
            </div>

            <div className="rounded-[0.95rem] border border-white/10 bg-slate-900/80 p-3 text-[11px] text-slate-300">
              <p className="text-[10px] uppercase tracking-[0.22em] text-slate-500">Versión</p>
              <p className="mt-1 text-sm font-semibold text-white">{APP_VERSION}</p>
              <p className="mt-1 text-slate-400">{dataSourceLabel}.</p>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
}
