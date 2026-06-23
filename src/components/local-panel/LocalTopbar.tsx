import Link from "next/link";
import designLabStyles from "@/components/design-lab/TangoDesignLabDashboard.module.css";

type LocalTopbarProps = {
  businessLabel: string;
  isSupportMode: boolean;
  supportHref: string;
};

function TopbarIcon({
  name,
  className = "",
}: {
  name: "search" | "bell" | "chevronDown" | "settings" | "calendar";
  className?: string;
}) {
  const shared = `fill-none stroke-current stroke-[1.7] ${className}`;

  switch (name) {
    case "search":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <circle cx="11" cy="11" r="5.5" />
          <path d="M15.5 15.5 20 20" />
        </svg>
      );
    case "bell":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 2.5 7H3.5c1-1.5 2.5-3 2.5-7Z" />
          <path d="M10 19a2 2 0 0 0 4 0" />
        </svg>
      );
    case "chevronDown":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <circle cx="12" cy="12" r="3.25" />
          <path d="M19 12h2M3 12h2M12 3v2M12 19v2M16.95 7.05l1.4-1.4M5.65 18.35l1.4-1.4M16.95 16.95l1.4 1.4M5.65 5.65l1.4 1.4" />
        </svg>
      );
    case "calendar":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <rect x="4" y="5" width="16" height="15" rx="3" />
          <path d="M8 3v4M16 3v4M4 9h16" />
        </svg>
      );
    default:
      return null;
  }
}

export function LocalTopbar({
  businessLabel,
  isSupportMode,
  supportHref,
}: LocalTopbarProps) {
  return (
    <header className={designLabStyles.topbar}>
      <div className={designLabStyles.topbarBusiness}>
        <div className={designLabStyles.topbarBusinessName}>{businessLabel}</div>
        <span className={designLabStyles.statusDot} />
        <span className={designLabStyles.topbarStatus}>
          {isSupportMode ? "Modo soporte" : "Abierto ahora"}
        </span>
        <TopbarIcon name="chevronDown" className="h-4 w-4 text-slate-400" />
      </div>

      <div className={designLabStyles.topbarSearch}>
        <div className={designLabStyles.searchHint}>
          <TopbarIcon name="search" className="h-4 w-4" />
          <span>Buscar reservas, clientes, mesas...</span>
        </div>
        <span className={designLabStyles.shortcut}>
          <span className={designLabStyles.shortcutKey}>⌘</span>
          <span className={designLabStyles.shortcutKey}>K</span>
        </span>
      </div>

      <div className={designLabStyles.topbarUser}>
        {isSupportMode ? (
          <Link
            href={supportHref}
            className="inline-flex items-center justify-center rounded-[0.75rem] border border-cyan-400/20 bg-cyan-400/10 px-3.5 py-2 text-sm font-medium text-cyan-50 transition hover:border-cyan-300/30 hover:bg-cyan-400/15"
          >
            Salir de soporte
          </Link>
        ) : null}

        <button
          type="button"
          className={designLabStyles.notification}
          aria-label="Notificaciones"
        >
          <TopbarIcon name="bell" className="h-4 w-4" />
          <span className={designLabStyles.badge}>3</span>
        </button>

        <button
          type="button"
          className="flex items-center gap-3 rounded-[0.95rem] border border-white/10 bg-white/[0.04] px-3 py-2 text-left transition hover:border-cyan-400/25 hover:bg-white/[0.06]"
        >
          <div className={designLabStyles.topbarAvatar} />
          <div className={designLabStyles.topbarUserText}>
            <div className={designLabStyles.topbarUserName}>Mariano Demuru</div>
            <div className={designLabStyles.topbarUserRole}>Propietario</div>
          </div>
          <TopbarIcon name="chevronDown" className="h-4 w-4 text-slate-400" />
        </button>
      </div>
    </header>
  );
}
