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
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "search":
      return (
        <svg className={className} {...common}>
          <circle cx="11" cy="11" r="5.5" />
          <path d="m15 15 4 4" />
        </svg>
      );
    case "bell":
      return (
        <svg className={className} {...common}>
          <path d="M7.5 9.5a4.5 4.5 0 1 1 9 0c0 5 2 6 2 6H5.5s2-1 2-6Z" />
          <path d="M10 18a2 2 0 0 0 4 0" />
        </svg>
      );
    case "chevronDown":
      return (
        <svg className={className} {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "settings":
      return (
        <svg className={className} {...common}>
          <circle cx="12" cy="12" r="3.1" />
          <path d="M19 12a7 7 0 0 0-.08-1.03l2.08-1.62-1.96-3.4-2.48.98a7.2 7.2 0 0 0-1.78-1.03l-.38-2.63h-3.92l-.38 2.63a7.2 7.2 0 0 0-1.78 1.03l-2.48-.98-1.96 3.4L5.08 10.97A7 7 0 0 0 5 12c0 .35.03.69.08 1.03L3 14.65l1.96 3.4 2.48-.98c.55.4 1.14.74 1.78 1.03l.38 2.63h3.92l.38-2.63c.64-.29 1.23-.63 1.78-1.03l2.48.98 1.96-3.4-2.08-1.62c.05-.34.08-.68.08-1.03Z" />
        </svg>
      );
    case "calendar":
      return (
        <svg className={className} {...common}>
          <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
          <path d="M3.5 9.2h17" />
          <path d="M8 3.5v3" />
          <path d="M16 3.5v3" />
        </svg>
      );
    default:
      return null;
  }
}

export function LocalPremiumTopbar({
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

        <button type="button" className={designLabStyles.notification} aria-label="Notificaciones">
          <div style={{ position: "relative" }}>
            <TopbarIcon name="bell" className="h-4 w-4" />
            <span className={designLabStyles.badge}>3</span>
          </div>
        </button>

        <div className={designLabStyles.topbarAvatar} />
        <div className={designLabStyles.topbarUserText}>
          <div className={designLabStyles.topbarUserName}>Mariano Demuru</div>
          <div className={designLabStyles.topbarUserRole}>Propietario</div>
        </div>
        <TopbarIcon name="chevronDown" className="h-4 w-4 text-slate-400" />
      </div>
    </header>
  );
}
