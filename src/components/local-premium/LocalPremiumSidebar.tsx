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
  | "chart"
  | "chevronDown";

function SidebarIcon({
  name,
  className = "",
}: {
  name: SidebarIconName;
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
    case "home":
      return (
        <svg className={className} {...common}>
          <path d="M4 11.5 12 4l8 7.5" />
          <path d="M6 10.75V20h12v-9.25" />
          <path d="M10 20v-5h4v5" />
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
    case "book":
      return (
        <svg className={className} {...common}>
          <path d="M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3V4.5Z" />
          <path d="M8 4.5V20" />
          <path d="M18 18H8" />
        </svg>
      );
    case "map":
      return (
        <svg className={className} {...common}>
          <path d="M9 19 3.5 20.5V5.5L9 4l6 1.5 5.5-1.5v15l-5.5 1.5L9 19Z" />
          <path d="M9 4v15" />
          <path d="M15 5.5v15" />
        </svg>
      );
    case "users":
      return (
        <svg className={className} {...common}>
          <path d="M16.5 18.5v-1.2a4.2 4.2 0 0 0-4.2-4.2H8.7a4.2 4.2 0 0 0-4.2 4.2v1.2" />
          <circle cx="12" cy="8" r="3.1" />
          <path d="M19 19v-1a3.6 3.6 0 0 0-2.4-3.4" />
          <path d="M15.8 5.8a3.1 3.1 0 0 1 0 4.4" />
        </svg>
      );
    case "settings":
      return (
        <svg className={className} {...common}>
          <circle cx="12" cy="12" r="3.1" />
          <path d="M19 12a7 7 0 0 0-.08-1.03l2.08-1.62-1.96-3.4-2.48.98a7.2 7.2 0 0 0-1.78-1.03l-.38-2.63h-3.92l-.38 2.63a7.2 7.2 0 0 0-1.78 1.03l-2.48-.98-1.96 3.4L5.08 10.97A7 7 0 0 0 5 12c0 .35.03.69.08 1.03L3 14.65l1.96 3.4 2.48-.98c.55.4 1.14.74 1.78 1.03l.38 2.63h3.92l.38-2.63c.64-.29 1.23-.63 1.78-1.03l2.48.98 1.96-3.4-2.08-1.62c.05-.34.08-.68.08-1.03Z" />
        </svg>
      );
    case "menu":
      return (
        <svg className={className} {...common}>
          <path d="M4 7.5h16" />
          <path d="M4 12h16" />
          <path d="M4 16.5h16" />
        </svg>
      );
    case "globe":
      return (
        <svg className={className} {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12h17" />
          <path d="M12 3.5c2.5 2.5 3.8 5.3 3.8 8.5S14.5 17 12 20.5C9.5 18 8.2 15.2 8.2 12S9.5 6 12 3.5Z" />
        </svg>
      );
    case "chart":
      return (
        <svg className={className} {...common}>
          <path d="M4.5 19.5h15" />
          <path d="M7 16V9" />
          <path d="M12 16V5.5" />
          <path d="M17 16V11" />
        </svg>
      );
    case "chevronDown":
      return (
        <svg className={className} {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    default:
      return null;
  }
}

export function LocalPremiumSidebar({
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
          <SidebarIcon name="chevronDown" className="h-4 w-4 text-slate-400" />
        </div>

        <div className={designLabStyles.version}>{APP_VERSION}</div>
      </div>
    </aside>
  );
}
