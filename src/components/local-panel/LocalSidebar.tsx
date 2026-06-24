import Link from "next/link";
import { APP_VERSION } from "@/lib/constants";
import designLabStyles from "@/components/design-lab/TangoDesignLabDashboard.module.css";

type LocalSidebarNavItem = {
  href: string;
  label: string;
  active: boolean;
  icon: SidebarIconName;
};

type LocalSidebarProps = {
  businessLabel: string;
  businessImageUrl?: string | null;
  businessImageAlt?: string;
  navItems: LocalSidebarNavItem[];
  webHref: string;
};

type SidebarIconName =
  | "home"
  | "calendar"
  | "book"
  | "map"
  | "users"
  | "settings"
  | "menu"
  | "globe"
  | "chart";

function SidebarIcon({
  name,
  className = "",
}: {
  name: SidebarIconName;
  className?: string;
}) {
  const shared = `fill-none stroke-current stroke-[1.7] ${className}`;

  switch (name) {
    case "home":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <path d="M4 11.5 12 4l8 7.5" />
          <path d="M6.5 10.8V20h11V10.8" />
          <path d="M10 20v-5h4v5" />
        </svg>
      );
    case "calendar":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <rect x="4" y="5" width="16" height="15" rx="3" />
          <path d="M8 3v4M16 3v4M4 9h16" />
        </svg>
      );
    case "book":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <path d="M6 4h11a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H7a3 3 0 0 0-3 3V6a2 2 0 0 1 2-2Z" />
          <path d="M7 7h8M7 11h8" />
        </svg>
      );
    case "map":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <path d="m4 6 6-2 4 2 6-2v14l-6 2-4-2-6 2V6Z" />
          <path d="M10 4v14M14 6v14" />
        </svg>
      );
    case "users":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <path d="M8 11a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Z" />
          <path d="M16.5 12a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z" />
          <path d="M3.5 20a5 5 0 0 1 9 0" />
          <path d="M13.5 20a4 4 0 0 1 7 0" />
        </svg>
      );
    case "settings":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <circle cx="12" cy="12" r="3.25" />
          <path d="M19 12h2M3 12h2M12 3v2M12 19v2M16.95 7.05l1.4-1.4M5.65 18.35l1.4-1.4M16.95 16.95l1.4 1.4M5.65 5.65l1.4 1.4" />
        </svg>
      );
    case "menu":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      );
    case "globe":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <circle cx="12" cy="12" r="8" />
          <path d="M4 12h16M12 4c2.5 2.7 2.5 13.3 0 16M12 4c-2.5 2.7-2.5 13.3 0 16" />
        </svg>
      );
    case "chart":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <path d="M5 19V5M11 19v-8M17 19v-12M3 19h18" />
        </svg>
      );
    default:
      return null;
  }
}

export function LocalSidebar({
  businessLabel,
  businessImageUrl,
  businessImageAlt,
  navItems,
  webHref,
}: LocalSidebarProps) {
  return (
    <aside className={designLabStyles.sidebar}>
      <div className={designLabStyles.logo}>
        <div className={designLabStyles.logoMark}>
          <span>T</span>
        </div>
        <div className={designLabStyles.logoText}>
          <div className={designLabStyles.logoTitle}>TANGO</div>
          <div className={designLabStyles.logoSub}>RESERVAS</div>
        </div>
      </div>

      <nav className={designLabStyles.nav} aria-label="Navegación principal">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`${designLabStyles.navItem} ${item.active ? designLabStyles.navItemActive : ""}`}
          >
            <SidebarIcon
              name={item.icon}
              className={`${designLabStyles.navIcon} ${item.active ? "text-cyan-300" : "text-slate-300"}`}
            />
            <span>{item.label}</span>
          </Link>
        ))}
      </nav>

      <div className={designLabStyles.sidebarSpacer} />

      <div className={designLabStyles.sidebarFooter}>
        <div className={designLabStyles.businessCard}>
          <div className={designLabStyles.businessTop}>
            <div className={designLabStyles.businessThumb}>
              {businessImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={businessImageUrl}
                  alt={businessImageAlt ?? businessLabel}
                  className="h-full w-full rounded-full object-cover"
                />
              ) : null}
            </div>
            <div>
              <div className={designLabStyles.businessName}>{businessLabel}</div>
              <div className={designLabStyles.businessType}>Restaurante de autor</div>
            </div>
          </div>
          <Link
            href={webHref}
            target="_blank"
            rel="noreferrer"
            className={designLabStyles.websiteButton}
          >
            Ver mi sitio web
          </Link>
        </div>

        <div className={designLabStyles.userCard}>
          <div className={designLabStyles.userLeft}>
            <div className={designLabStyles.userAvatar}>M</div>
            <div>
              <div className={designLabStyles.userName}>Mariano Demuru</div>
              <div className={designLabStyles.userRole}>Propietario</div>
            </div>
          </div>
          <span className="text-slate-400">⌄</span>
        </div>

        <div className={designLabStyles.version}>{APP_VERSION}</div>
      </div>
    </aside>
  );
}
