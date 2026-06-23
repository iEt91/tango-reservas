"use client";

import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { FloorTable, Reservation } from "@/data/types";
import baseStyles from "@/components/design-lab/TangoDesignLabDashboard.module.css";
import styles from "./LocalDashboardDesignView.module.css";

type IconName =
  | "home"
  | "calendar"
  | "book"
  | "map"
  | "users"
  | "settings"
  | "menu"
  | "globe"
  | "chart"
  | "bell"
  | "search"
  | "chevronDown"
  | "eye"
  | "pencil"
  | "more"
  | "plus"
  | "lock"
  | "check"
  | "x"
  | "clock"
  | "user"
  | "phone"
  | "sparkles";

type MetricTone = "cyan" | "green" | "red" | "purple" | "blue" | "solid";
type QuickTone = "cyan" | "purple" | "blue" | "green";

export type LocalDashboardDesignMetricCard = {
  label: string;
  value: number | string;
  helper?: string;
  footer: string;
  tone: MetricTone;
  actionLabel: string;
  icon: IconName;
  kind?: "count" | "next" | "occupancy";
};

export type LocalDashboardDesignNavLinks = {
  home: string;
  reservas: string;
  calendario: string;
  plano: string;
  crm: string;
  configuracion: string;
  menu: string;
  web: string;
  reportes: string;
};

type HourlyBar = {
  hour: string;
  label?: string;
  value: number;
  active?: boolean;
};

type RecentActivityItem = {
  icon: IconName;
  tone: "green" | "blue" | "red";
  title: string;
  subtitle: string;
  time: string;
};

type FeaturedCustomerItem = {
  initials: string;
  name: string;
  meta: string;
};

type QuickActionItem = {
  title: string;
  href: string;
  tone: QuickTone;
  icon: IconName;
};

type LocalDashboardDesignViewProps = {
  businessName: string;
  businessSubtitle: string;
  businessStatusLabel: string;
  userName: string;
  userRole: string;
  currentDateLabel: string;
  appVersion: string;
  metricCards: LocalDashboardDesignMetricCard[];
  reservationsToday: Reservation[];
  reservationsTodayTotal: number;
  floorTables: FloorTable[];
  occupancyPercent: number;
  occupiedSeats: number;
  totalSeats: number;
  hourlyOccupancy: HourlyBar[];
  recentActivity: RecentActivityItem[];
  featuredCustomers: FeaturedCustomerItem[];
  quickActions: QuickActionItem[];
  navLinks: LocalDashboardDesignNavLinks;
  websiteHref: string;
  highlightedReservationId?: string | null;
  onOpenReservation?: (reservation: Reservation) => void;
  onOpenAssignTable?: (reservation: Reservation) => void;
};

function Icon({
  name,
  className = "",
}: {
  name: IconName;
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
    case "bell":
      return (
        <svg className={className} {...common}>
          <path d="M7.5 9.5a4.5 4.5 0 1 1 9 0c0 5 2 6 2 6H5.5s2-1 2-6Z" />
          <path d="M10 18a2 2 0 0 0 4 0" />
        </svg>
      );
    case "search":
      return (
        <svg className={className} {...common}>
          <circle cx="11" cy="11" r="5.5" />
          <path d="m15 15 4 4" />
        </svg>
      );
    case "chevronDown":
      return (
        <svg className={className} {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "eye":
      return (
        <svg className={className} {...common}>
          <path d="M2.5 12S6.2 5.5 12 5.5 21.5 12 21.5 12 17.8 18.5 12 18.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="2.8" />
        </svg>
      );
    case "pencil":
      return (
        <svg className={className} {...common}>
          <path d="M4 16.5V20h3.5L18.8 8.7l-3.5-3.5L4 16.5Z" />
          <path d="m14.4 6.3 3.5 3.5" />
        </svg>
      );
    case "more":
      return (
        <svg className={className} {...common}>
          <circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "plus":
      return (
        <svg className={className} {...common}>
          <path d="M12 5.5v13" />
          <path d="M5.5 12h13" />
        </svg>
      );
    case "lock":
      return (
        <svg className={className} {...common}>
          <rect x="5.5" y="11" width="13" height="9" rx="2" />
          <path d="M8 11V8.8a4 4 0 0 1 8 0V11" />
        </svg>
      );
    case "check":
      return (
        <svg className={className} {...common}>
          <path d="m5.5 12 4 4 9-9" />
        </svg>
      );
    case "x":
      return (
        <svg className={className} {...common}>
          <path d="m6.5 6.5 11 11" />
          <path d="m17.5 6.5-11 11" />
        </svg>
      );
    case "clock":
      return (
        <svg className={className} {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 8.5V12l2.6 1.8" />
        </svg>
      );
    case "user":
      return (
        <svg className={className} {...common}>
          <circle cx="12" cy="8.4" r="3" />
          <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
        </svg>
      );
    case "phone":
      return (
        <svg className={className} {...common}>
          <path d="M7 4.8h2.4l1.1 3-1.8 1.5a13.2 13.2 0 0 0 5.9 5.9l1.5-1.8 3 1.1V17a2 2 0 0 1-2 2A14 14 0 0 1 4.9 6.8a2 2 0 0 1 2.1-2Z" />
        </svg>
      );
    case "sparkles":
      return (
        <svg className={className} {...common}>
          <path d="M12 3.5 13.7 8l4.5 1.7-4.5 1.8L12 16l-1.7-4.5L5.8 9.7 10.3 8 12 3.5Z" />
          <path d="M18 13.5 18.8 16l2.5.8-2.5.9-.8 2.5-.9-2.5-2.5-.9 2.5-.8.9-2.5Z" />
        </svg>
      );
    default:
      return null;
  }
}

function formatStatusLabel(status?: Reservation["status"] | FloorTable["status"]) {
  if (status === "pending") return "Pendiente";
  if (status === "confirmed") return "Confirmada";
  if (status === "cancelled") return "Cancelada";
  if (status === "completed") return "Completada";
  if (status === "no_show") return "No-show";
  if (status === "occupied") return "Ocupada";
  if (status === "reserved") return "Reservada";
  if (status === "blocked") return "Bloqueada";
  if (status === "out_of_service") return "Fuera de servicio";
  return "Disponible";
}

function formatTime(value?: string | null) {
  if (!value) {
    return "--:--";
  }

  const normalized = value.trim();
  return normalized.length >= 5 ? normalized.slice(0, 5) : normalized;
}

function getStatusTone(status?: Reservation["status"] | FloorTable["status"]) {
  if (status === "confirmed") return "statusConfirmed";
  if (status === "pending") return "statusPending";
  if (status === "cancelled") return "statusCancelled";
  if (status === "completed") return "statusCompleted";
  if (status === "no_show") return "statusNoShow";
  if (status === "reserved") return "statusReserved";
  if (status === "occupied") return "statusOccupied";
  if (status === "blocked" || status === "out_of_service") return "statusBlocked";
  return "statusCompleted";
}

function getStatusBadgeClass(status?: Reservation["status"] | FloorTable["status"]) {
  switch (getStatusTone(status)) {
    case "statusPending":
      return baseStyles.statusPending;
    case "statusConfirmed":
      return baseStyles.statusConfirmed;
    case "statusCancelled":
      return baseStyles.statusCancelled;
    case "statusCompleted":
      return baseStyles.statusCompleted;
    case "statusNoShow":
      return baseStyles.statusNoShow;
    case "statusReserved":
      return baseStyles.statusReserved;
    case "statusOccupied":
      return baseStyles.statusOccupied;
    case "statusBlocked":
      return baseStyles.statusBlocked;
    default:
      return baseStyles.statusCompleted;
  }
}

function metricToneClass(tone: MetricTone) {
  switch (tone) {
    case "cyan":
      return baseStyles.metricCardBlue;
    case "green":
      return baseStyles.metricCardGreen;
    case "red":
      return baseStyles.metricCardRed;
    case "purple":
      return baseStyles.metricCardPurple;
    case "blue":
      return baseStyles.metricCardSolid;
    case "solid":
      return baseStyles.metricCardSolid;
    default:
      return baseStyles.metricCardSolid;
  }
}

function quickToneClass(tone: QuickTone) {
  switch (tone) {
    case "cyan":
      return baseStyles.tileCyan;
    case "purple":
      return baseStyles.tilePurple;
    case "blue":
      return baseStyles.tileBlue;
    case "green":
      return baseStyles.tileGreen;
    default:
      return baseStyles.tileCyan;
  }
}

function SidebarItem({ label, href, icon, active = false }: { label: string; href: string; icon: IconName; active?: boolean }) {
  return (
    <Link href={href} className={`${baseStyles.navItem} ${active ? baseStyles.navItemActive : ""}`}>
      <Icon name={icon} className={`${baseStyles.navIcon} ${active ? "text-cyan-300" : "text-slate-300"}`} />
      <span>{label}</span>
    </Link>
  );
}

function MetricCardView({
  card,
  occupancyPercent,
  occupiedSeats,
  totalSeats,
}: {
  card: LocalDashboardDesignMetricCard;
  occupancyPercent: number;
  occupiedSeats: number;
  totalSeats: number;
}) {
  const isOccupancy = card.label === "Ocupación de hoy";
  const isNext = card.label === "Próxima reserva";
  const isCount = !isOccupancy && !isNext;

  return (
    <article className={`${baseStyles.metricCard} ${metricToneClass(card.tone)} ${isOccupancy ? baseStyles.occupancyCard : ""}`}>
      <div className={baseStyles.metricTop}>
        <div className={baseStyles.metricTitleWrap}>
          <span className={baseStyles.metricIcon}>
            <Icon name={card.icon} className="h-4 w-4" />
          </span>
          <span className={baseStyles.metricTitle}>{card.label}</span>
        </div>
      </div>

      {isOccupancy ? (
        <div className={baseStyles.occupancyBody}>
          <div className={baseStyles.occupancyCopy}>
            <div className={baseStyles.occupancyCovers}>
              {card.helper ?? `${occupiedSeats} / ${totalSeats} cubiertos`}
            </div>
          </div>
          <div className={baseStyles.occupancyExtra}>
            <div className={baseStyles.occupancyDonut} aria-label={`${occupancyPercent}% de ocupación`}>
              <span>{occupancyPercent}%</span>
            </div>
          </div>
        </div>
      ) : isNext ? (
        <div className={baseStyles.nextReservationBody}>
          <div className={baseStyles.metricValue}>{card.value}</div>
          <div className={baseStyles.nextReservationMeta}>
            <span>{card.helper ?? "Hoy"}</span>
            <small>{card.footer}</small>
          </div>
        </div>
      ) : (
        <div className={baseStyles.metricBody}>
          <div className={baseStyles.metricValueRow}>
            <div className={baseStyles.metricValue}>{card.value}</div>
            {isCount ? (
              <div className={baseStyles.metricUnit}>
                {Number.isFinite(Number(card.value)) ? "reservas" : ""}
              </div>
            ) : null}
          </div>
          {card.helper ? <div className={baseStyles.metricHelper}>{card.helper}</div> : null}
        </div>
      )}

      <div className={baseStyles.metricFooter}>
        <span>{card.footer}</span>
        <span className={baseStyles.metricAction}>{card.actionLabel}</span>
      </div>
    </article>
  );
}

function SectionPanel({
  title,
  badge,
  actions,
  children,
}: {
  title: string;
  badge?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={baseStyles.panel}>
      <div className={baseStyles.panelHeader}>
        <div className={baseStyles.panelTitleGroup}>
          <h2 className={baseStyles.panelTitle}>{title}</h2>
          {badge ? <span className={baseStyles.panelChip}>{badge}</span> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function ReservationsTable({
  reservationsToday,
  reservationsTodayTotal,
  highlightedReservationId,
  onOpenReservation,
  onOpenAssignTable,
  reservationsHref,
}: {
  reservationsToday: Reservation[];
  reservationsTodayTotal: number;
  highlightedReservationId?: string | null;
  onOpenReservation?: (reservation: Reservation) => void;
  onOpenAssignTable?: (reservation: Reservation) => void;
  reservationsHref: string;
}) {
  const visibleReservations = reservationsToday.slice(0, 5);

  return (
    <SectionPanel
      title="Reservas de hoy"
      badge={`${reservationsTodayTotal} en total`}
      actions={
        <div className={baseStyles.panelActions}>
          <Link href={reservationsHref} className={baseStyles.tableLinkButton}>
            Ver todas las reservas de hoy →
          </Link>
          <button type="button" className={baseStyles.selectButton}>
            <span>Vista: Lista</span>
            <Icon name="chevronDown" className="h-4 w-4" />
          </button>
          <Link href={reservationsHref} className={baseStyles.primaryButton}>
            <Icon name="plus" className="h-3.5 w-3.5" />
            <span>Nueva reserva</span>
          </Link>
        </div>
      }
    >
      <div className={baseStyles.tableWrap}>
        <div className={baseStyles.tableHeaderRow}>
          <span>Hora</span>
          <span>Cliente</span>
          <span>Personas</span>
          <span>Mesa</span>
          <span>Estado</span>
          <span>Canal</span>
          <span>Acciones</span>
        </div>

        <div className={baseStyles.tableBody}>
          {(visibleReservations.length > 0 ? visibleReservations : reservationsToday.slice(0, 5)).map((reservation) => {
            const highlighted = reservation.id === highlightedReservationId;
            return (
              <div
                key={reservation.id}
                className={`${baseStyles.tableRow} ${highlighted ? baseStyles.tableRowHighlight : ""}`}
              >
                <div className={`${baseStyles.tableCell} ${baseStyles.tableCellStrong}`}>{formatTime(reservation.reservationTime)}</div>
                <div className={baseStyles.clientCell}>
                  <span className={baseStyles.tableCell}>{reservation.customerName}</span>
                  <span className={baseStyles.tableSubline}>{reservation.customerPhone || "Sin teléfono"}</span>
                </div>
                <div className={baseStyles.tableCell}>{reservation.partySize}</div>
                <div className={baseStyles.tableTableCell}>
                  <span className={baseStyles.tableCell}>
                    {reservation.tableLabel || reservation.joinedTableLabel || (reservation.assignedTableIds?.length ? `${reservation.assignedTableIds.length} mesas` : "Sin mesa")}
                  </span>
                  <span className={baseStyles.tableSubline}>{reservation.joinedTableLabel || reservation.tableLabel || "Salón"}</span>
                </div>
                <div>
                  <span className={`${baseStyles.statusBadge} ${getStatusBadgeClass(reservation.status)}`}>
                    {formatStatusLabel(reservation.status)}
                  </span>
                </div>
                <div className={baseStyles.tableCell}>{reservation.source === "web" ? "Web" : reservation.source === "instagram" ? "Instagram" : reservation.source === "whatsapp" ? "WhatsApp" : reservation.source === "manual" ? "Manual" : "Admin"}</div>
                <div className={baseStyles.actionGroup}>
                  <button type="button" onClick={() => onOpenReservation?.(reservation)} className={baseStyles.iconButton} aria-label="Ver reserva">
                    <Icon name="eye" className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => onOpenAssignTable?.(reservation)} className={baseStyles.iconButton} aria-label="Editar reserva">
                    <Icon name="pencil" className="h-3.5 w-3.5" />
                  </button>
                  <button type="button" onClick={() => onOpenReservation?.(reservation)} className={baseStyles.iconButton} aria-label="Más acciones">
                    <Icon name="more" className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </SectionPanel>
  );
}

function FloorPlan({
  floorTables,
  floorPlanHref,
}: {
  floorTables: FloorTable[];
  floorPlanHref: string;
}) {
  const previewTables = floorTables.length > 0 ? floorTables : [];

  const bounds = (() => {
    if (previewTables.length === 0) {
      return null;
    }

    const minX = Math.min(...previewTables.map((table) => table.x));
    const minY = Math.min(...previewTables.map((table) => table.y));
    const maxX = Math.max(...previewTables.map((table) => table.x + table.width));
    const maxY = Math.max(...previewTables.map((table) => table.y + table.height));

    return {
      minX,
      minY,
      width: Math.max(1, maxX - minX),
      height: Math.max(1, maxY - minY),
    };
  })();

  const fallbackTables = [
    { label: "1", seats: 2, x: 16, y: 12, width: 14, height: 14, status: "available" as const },
    { label: "2", seats: 2, x: 42, y: 12, width: 14, height: 14, status: "available" as const },
    { label: "3", seats: 3, x: 68, y: 12, width: 14, height: 14, status: "reserved" as const },
    { label: "4", seats: 4, x: 82, y: 34, width: 14, height: 14, status: "available" as const },
    { label: "5", seats: 2, x: 18, y: 42, width: 14, height: 14, status: "occupied" as const },
    { label: "6", seats: 6, x: 44, y: 42, width: 16, height: 16, status: "available" as const },
    { label: "7", seats: 2, x: 18, y: 68, width: 14, height: 14, status: "blocked" as const },
    { label: "8", seats: 6, x: 56, y: 66, width: 16, height: 16, status: "available" as const },
  ];
  const visibleTables = previewTables.length > 0 ? previewTables : fallbackTables;

  return (
    <SectionPanel
      title="Plano del salón"
      badge="Vista compacta"
      actions={
        <div className={baseStyles.legend}>
          <span className={baseStyles.legendItem}>
            <span className={`${baseStyles.legendDot} ${baseStyles.legendGreen}`} />
            Disponible
          </span>
          <span className={baseStyles.legendItem}>
            <span className={`${baseStyles.legendDot} ${baseStyles.legendRed}`} />
            Ocupada
          </span>
          <span className={baseStyles.legendItem}>
            <span className={`${baseStyles.legendDot} ${baseStyles.legendBlue}`} />
            Reservada
          </span>
          <span className={baseStyles.legendItem}>
            <span className={`${baseStyles.legendDot} ${baseStyles.legendGray}`} />
            Bloqueada
          </span>
        </div>
      }
    >
      <div className={baseStyles.floorWrap}>
        <div className={baseStyles.floorMap}>
          <div className={baseStyles.floorTexture} />
          {(bounds ? visibleTables : fallbackTables).map((table) => {
            const normalized = bounds
              ? {
                  left: ((table.x - bounds.minX) / bounds.width) * 100,
                  top: ((table.y - bounds.minY) / bounds.height) * 100,
                  width: Math.max(12, (table.width / bounds.width) * 100),
                  height: Math.max(12, (table.height / bounds.height) * 100),
                }
              : {
                  left: Number(table.x),
                  top: Number(table.y),
                  width: Number(table.width),
                  height: Number(table.height),
                };

            const toneClass =
              table.status === "available"
                ? baseStyles.tableAvailable
                : table.status === "reserved"
                  ? baseStyles.tableReserved
                  : table.status === "occupied"
                    ? baseStyles.tableOccupied
                    : baseStyles.tableBlocked;

            return (
              <div
                key={`${table.label}-${table.x}-${table.y}`}
                className={`${baseStyles.tableNode} ${toneClass}`}
                style={{ left: `${normalized.left}%`, top: `${normalized.top}%`, width: `${normalized.width}%`, height: `${normalized.height}%` } as CSSProperties}
              >
                <span>{table.label}</span>
              </div>
            );
          })}

          <Link href={floorPlanHref} className={baseStyles.floorButton}>
            Editar plano
          </Link>
        </div>
      </div>
    </SectionPanel>
  );
}

function HourlyChart({ hourlyOccupancy }: { hourlyOccupancy: HourlyBar[] }) {
  return (
    <section className={baseStyles.bottomCard}>
      <div className={baseStyles.bottomTitleRow}>
        <h3 className={baseStyles.bottomTitle}>Ocupación por franja horaria</h3>
        <select className={baseStyles.smallSelect} defaultValue="Hoy">
          <option>Hoy</option>
        </select>
      </div>

      <div className={styles.chartShell}>
        <div className={styles.chartYAxis}>
          <span>100%</span>
          <span>75%</span>
          <span>50%</span>
          <span>25%</span>
          <span>0%</span>
        </div>

        <div className={styles.chartArea}>
          <div className={styles.chartGrid} aria-hidden="true">
            <span />
            <span />
            <span />
            <span />
            <span />
          </div>

          <div className={styles.chartBars}>
            {hourlyOccupancy.map((bar) => (
              <div key={bar.hour} className={styles.chartBarGroup}>
                <div className={`${styles.chartBar} ${bar.active ? styles.chartBarActive : ""}`} style={{ height: `${bar.value}%` }} />
              </div>
            ))}
          </div>

          <div className={styles.chartXAxis}>
            {hourlyOccupancy.map((bar) => (
              <span key={bar.hour}>{bar.label ?? bar.hour}</span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function RecentActivity({ recentActivity }: { recentActivity: RecentActivityItem[] }) {
  return (
    <section className={baseStyles.bottomCard}>
      <div className={baseStyles.bottomTitleRow}>
        <h3 className={baseStyles.bottomTitle}>Actividad reciente</h3>
      </div>

      <div className={baseStyles.activityList}>
        {recentActivity.map((item) => (
          <article key={`${item.title}-${item.time}`} className={baseStyles.activityItem}>
            <div className={baseStyles.activityLeft}>
              <span
                className={baseStyles.activityIcon}
                style={{
                  background:
                    item.tone === "green"
                      ? "rgba(34, 197, 94, 0.12)"
                      : item.tone === "blue"
                        ? "rgba(59, 130, 246, 0.12)"
                        : "rgba(239, 68, 68, 0.12)",
                  color:
                    item.tone === "green"
                      ? "#86efac"
                      : item.tone === "blue"
                        ? "#93c5fd"
                        : "#fca5a5",
                }}
              >
                <Icon name={item.icon} className="h-4 w-4" />
              </span>
              <div className={baseStyles.activityText}>
                <div className={baseStyles.activityTitle}>{item.title}</div>
                <div className={baseStyles.activitySubtitle}>{item.subtitle}</div>
              </div>
            </div>
            <span className={baseStyles.activityTime}>{item.time}</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function FeaturedCustomers({ featuredCustomers, crmHref }: { featuredCustomers: FeaturedCustomerItem[]; crmHref: string }) {
  return (
    <section className={baseStyles.bottomCard}>
      <div className={baseStyles.bottomTitleRow}>
        <h3 className={baseStyles.bottomTitle}>Clientes destacados</h3>
        <Link href={crmHref} className={baseStyles.crmLink}>
          Ver CRM →
        </Link>
      </div>

      <div className={baseStyles.customersList}>
        {featuredCustomers.map((customer) => (
          <article key={customer.name} className={baseStyles.customerItem}>
            <div className={baseStyles.customerAvatar}>{customer.initials}</div>
            <div className={baseStyles.customerText}>
              <div className={baseStyles.customerName}>{customer.name}</div>
              <div className={baseStyles.customerMeta}>{customer.meta}</div>
            </div>
            <span className={baseStyles.vipBadge}>VIP</span>
          </article>
        ))}
      </div>
    </section>
  );
}

function QuickActions({ quickActions }: { quickActions: QuickActionItem[] }) {
  return (
    <section className={baseStyles.bottomCard}>
      <div className={baseStyles.bottomTitleRow}>
        <h3 className={baseStyles.bottomTitle}>Acciones rápidas</h3>
      </div>

      <div className={baseStyles.quickGrid}>
        {quickActions.map((action) => (
          <Link key={action.title} href={action.href} className={`${baseStyles.quickTile} ${quickToneClass(action.tone)}`}>
            <span className={baseStyles.quickArrow}>→</span>
            <span className={baseStyles.quickIcon}>
              <Icon name={action.icon} className="h-4 w-4" />
            </span>
            <div className={baseStyles.quickLabelWrap}>
              <div className={baseStyles.quickLabel}>{action.title}</div>
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function LocalDashboardDesignView({
  businessName,
  businessSubtitle,
  businessStatusLabel,
  userName,
  userRole,
  currentDateLabel,
  appVersion,
  metricCards,
  reservationsToday,
  reservationsTodayTotal,
  floorTables,
  occupancyPercent,
  occupiedSeats,
  totalSeats,
  hourlyOccupancy,
  recentActivity,
  featuredCustomers,
  quickActions,
  navLinks,
  websiteHref,
  highlightedReservationId,
  onOpenReservation,
  onOpenAssignTable,
}: LocalDashboardDesignViewProps) {
  return (
    <div className={`${baseStyles.shell} ${styles.page}`}>
      <aside className={baseStyles.sidebar}>
        <div className={baseStyles.logo}>
          <div className={baseStyles.logoMark}>
            <span>T</span>
          </div>
          <div className={baseStyles.logoText}>
            <div className={baseStyles.logoTitle}>TANGO</div>
            <div className={baseStyles.logoSub}>RESERVAS</div>
          </div>
        </div>

        <nav className={baseStyles.nav} aria-label="Navegación principal">
          <SidebarItem label="Inicio" href={navLinks.home} icon="home" active />
          <SidebarItem label="Reservas" href={navLinks.reservas} icon="calendar" />
          <SidebarItem label="Calendario" href={navLinks.calendario} icon="book" />
          <SidebarItem label="Plano" href={navLinks.plano} icon="map" />
          <SidebarItem label="CRM" href={navLinks.crm} icon="users" />
          <SidebarItem label="Configuración" href={navLinks.configuracion} icon="settings" />
          <SidebarItem label="Menú" href={navLinks.menu} icon="menu" />
          <SidebarItem label="Web" href={navLinks.web} icon="globe" />
          <SidebarItem label="Reportes" href={navLinks.reportes} icon="chart" />
        </nav>

        <div className={baseStyles.sidebarSpacer} />

        <div className={baseStyles.sidebarFooter}>
          <div className={baseStyles.businessCard}>
            <div className={baseStyles.businessTop}>
              <div className={baseStyles.businessThumb} />
              <div>
                <div className={baseStyles.businessName}>{businessName}</div>
                <div className={baseStyles.businessType}>{businessSubtitle}</div>
              </div>
            </div>
            <Link href={websiteHref} className={baseStyles.websiteButton}>
              Ver mi sitio web
            </Link>
          </div>

          <div className={baseStyles.userCard}>
            <div className={baseStyles.userLeft}>
              <div className={baseStyles.userAvatar}>{userName.trim().charAt(0).toUpperCase() || "M"}</div>
              <div>
                <div className={baseStyles.userName}>{userName}</div>
                <div className={baseStyles.userRole}>{userRole}</div>
              </div>
            </div>
            <Icon name="chevronDown" className="h-4 w-4 text-slate-400" />
          </div>

          <div className={baseStyles.version}>{appVersion}</div>
        </div>
      </aside>

      <main className={`${baseStyles.main} ${styles.main}`}>
        <header className={baseStyles.topbar}>
          <div className={baseStyles.topbarBusiness}>
            <div className={baseStyles.topbarBusinessName}>{businessName}</div>
            <span className={baseStyles.statusDot} />
            <span className={baseStyles.topbarStatus}>{businessStatusLabel}</span>
            <Icon name="chevronDown" className="h-4 w-4 text-slate-400" />
          </div>

          <div className={baseStyles.topbarSearch}>
            <div className={baseStyles.searchHint}>
              <Icon name="search" className="h-4 w-4" />
              <span>Buscar reservas, clientes, mesas…</span>
            </div>
            <span className={baseStyles.shortcut}>
              <span className={baseStyles.shortcutKey}>⌘</span>
              <span className={baseStyles.shortcutKey}>K</span>
            </span>
          </div>

          <div className={baseStyles.topbarUser}>
            <div className={baseStyles.notification}>
              <div style={{ position: "relative" }}>
                <Icon name="bell" className="h-4 w-4" />
                <span className={baseStyles.badge}>3</span>
              </div>
            </div>
            <div className={baseStyles.topbarAvatar} />
            <div className={baseStyles.topbarUserText}>
              <div className={baseStyles.topbarUserName}>{userName}</div>
              <div className={baseStyles.topbarUserRole}>{userRole}</div>
            </div>
            <Icon name="chevronDown" className="h-4 w-4 text-slate-400" />
          </div>
        </header>

        <section className={`${baseStyles.content} ${styles.content}`}>
          <div className={baseStyles.dashboardHeader}>
            <div>
              <div className={baseStyles.greeting}>¡Bienvenido, Mariano!</div>
              <h1 className={baseStyles.headline}>
                Operación del local <span className={baseStyles.headlineSpark}>✧</span>
              </h1>
              <div className={baseStyles.subtitle}>Resumen en tiempo real de tu restaurante.</div>
            </div>

            <div className={baseStyles.headerActions}>
              <button type="button" className={baseStyles.dateButton}>
                <Icon name="calendar" className="h-4 w-4" />
                <span>{currentDateLabel}</span>
                <Icon name="chevronDown" className="h-4 w-4 text-slate-400" />
              </button>
              <button type="button" className={baseStyles.filtersButton}>
                <Icon name="settings" className="h-4 w-4" />
                <span>Filtros</span>
              </button>
            </div>
          </div>

          <div className={baseStyles.metricsGrid}>
            {metricCards.map((card) => (
              <MetricCardView
                key={card.label}
                card={card}
                occupancyPercent={occupancyPercent}
                occupiedSeats={occupiedSeats}
                totalSeats={totalSeats}
              />
            ))}
          </div>

          <div className={baseStyles.centerGrid}>
            <ReservationsTable
              reservationsToday={reservationsToday}
              reservationsTodayTotal={reservationsTodayTotal}
              highlightedReservationId={highlightedReservationId}
              onOpenReservation={onOpenReservation}
              onOpenAssignTable={onOpenAssignTable}
              reservationsHref={navLinks.reservas}
            />

            <FloorPlan floorTables={floorTables} floorPlanHref={navLinks.plano} />
          </div>

          <div className={baseStyles.bottomGrid}>
            <HourlyChart hourlyOccupancy={hourlyOccupancy} />
            <RecentActivity recentActivity={recentActivity} />
            <FeaturedCustomers featuredCustomers={featuredCustomers} crmHref={navLinks.crm} />
            <QuickActions quickActions={quickActions} />
          </div>
        </section>
      </main>
    </div>
  );
}
