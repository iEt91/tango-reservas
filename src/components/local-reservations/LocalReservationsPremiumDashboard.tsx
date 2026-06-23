"use client";

import Link from "next/link";
import { useMemo, type ReactNode } from "react";
import type { Business, FloorTable, Reservation, ReservationStatus } from "@/data/types";
import { getDataSource } from "@/lib/data/dataSource";
import styles from "./LocalReservationsPremiumDashboard.module.css";
import { LocalBusinessWarning } from "@/components/local/LocalBusinessWarning";
import { LocalNoActiveBusinessesState } from "@/components/local/LocalNoActiveBusinessesState";
import { LocalReservationStatusBadge } from "@/components/local-reservations/LocalReservationStatusBadge";
import { LocalReservationActions } from "@/components/local-reservations/LocalReservationActions";
type GroupedReservations = {
  date: string;
  label: string;
  items: Reservation[];
};

type AvailabilitySummary = {
  label: string;
  reason?: string | null;
  tone?: "cyan" | "amber" | "emerald" | "rose" | "slate";
};

type QuickActionLink = {
  href: string;
  label: string;
  tone?: "cyan" | "violet" | "emerald" | "slate";
  description: string;
};

export type LocalReservationsMetricCard = {
  label: string;
  value: string | number;
  helper?: string;
  tone?: "cyan" | "amber" | "emerald" | "rose" | "violet" | "slate";
};

type LocalReservationsPremiumDashboardProps = {
  business: Business | null;
  businesses: Business[];
  canChangeBusiness: boolean;
  selectedBusinessId: string;
  onBusinessChange: (businessId: string) => void;
  serviceCount: number;
  businessWarning: string | null;
  metricCards: LocalReservationsMetricCard[];
  search: string;
  statusFilter: string;
  dateFilter: string;
  customDate: string;
  hasActiveFilters: boolean;
  resultsCount: number;
  onClearFilters: () => void;
  onClearLocalReservations?: () => void;
  onCustomDateChange: (value: string) => void;
  onDateFilterChange: (value: string) => void;
  onSearchChange: (value: string) => void;
  onStatusFilterChange: (value: string) => void;
  clearLocalReservationsLabel?: string;
  hideClearLocalReservations?: boolean;
  groupedReservations: GroupedReservations[];
  filteredReservationsCount: number;
  availabilityByReservationId: Map<string, AvailabilitySummary>;
  serviceNameById: Map<string, string>;
  tableLabelByReservationId: Map<string, string>;
  onChangeStatus: (reservationId: string, status: ReservationStatus) => void;
  onOpenAssignTable: (reservation: Reservation) => void;
  onOpenDetail: (reservation: Reservation) => void;
  onOpenAssignTableFromEmptyState?: () => void;
  emptyMessage: string;
  floorTables: FloorTable[];
  reservations: Reservation[];
  today: string;
  now: Date | null;
  occupancyPercent: number;
  occupiedSeats: number;
  totalSeats: number;
  quickActions: QuickActionLink[];
};

type ReservationGroup = {
  hour: string;
  items: Reservation[];
};

function formatDateLabel(dateValue: string) {
  if (!dateValue) {
    return "Sin fecha";
  }

  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
    .format(date)
    .replace(/^./, (char) => char.toUpperCase());
}

function formatTimeLabel(value: string) {
  if (!value) {
    return "--:--";
  }

  return value.includes(":") ? value.slice(0, 5) : value;
}

function formatRelativeTime(isoValue: string, now: Date | null) {
  if (!isoValue || !now) {
    return "Hace poco";
  }

  const date = new Date(isoValue);
  if (Number.isNaN(date.getTime())) {
    return "Hace poco";
  }

  const diffMinutes = Math.max(0, Math.floor((now.getTime() - date.getTime()) / 60000));
  if (diffMinutes < 1) {
    return "Ahora";
  }
  if (diffMinutes < 60) {
    return `Hace ${diffMinutes} min`;
  }

  const hours = Math.floor(diffMinutes / 60);
  if (hours < 24) {
    return `Hace ${hours} h`;
  }

  const days = Math.floor(hours / 24);
  return `Hace ${days} d`;
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

function getStatusTone(status?: Reservation["status"] | FloorTable["status"]) {
  if (status === "confirmed") return "statusConfirmed";
  if (status === "pending") return "statusPending";
  if (status === "cancelled") return "statusCancelled";
  if (status === "completed") return "statusCompleted";
  if (status === "no_show") return "statusNoShow";
  if (status === "reserved") return "statusConfirmed";
  if (status === "occupied") return "statusPending";
  if (status === "blocked" || status === "out_of_service") return "statusCancelled";
  return "statusCompleted";
}

function getBusinessBadgeText(dataSource: string) {
  return dataSource === "supabase" ? "Fuente de datos: Supabase" : "Fuente de datos: Local";
}

function groupReservationsByHour(reservations: Reservation[]) {
  const groups = new Map<string, Reservation[]>();

  for (const reservation of reservations) {
    const hour = formatTimeLabel(reservation.reservationTime).slice(0, 2);
    if (!hour) {
      continue;
    }

    const list = groups.get(hour) ?? [];
    list.push(reservation);
    groups.set(hour, list);
  }

  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map<ReservationGroup>(([hour, items]) => ({
      hour: `${hour}:00`,
      items: [...items].sort((left, right) => left.reservationTime.localeCompare(right.reservationTime)),
    }));
}

function getUpcomingAgenda(reservations: Reservation[], now: Date | null) {
  const eligible = reservations
    .filter((reservation) => reservation.status === "pending" || reservation.status === "confirmed")
    .sort((left, right) => {
      const leftTime = `${left.reservationDate}T${formatTimeLabel(left.reservationTime)}`;
      const rightTime = `${right.reservationDate}T${formatTimeLabel(right.reservationTime)}`;
      return leftTime.localeCompare(rightTime);
    });

  const base = eligible.filter((reservation) => {
    if (!now) {
      return true;
    }
    const date = new Date(`${reservation.reservationDate}T${formatTimeLabel(reservation.reservationTime)}:00`);
    return !Number.isNaN(date.getTime()) && date.getTime() >= now.getTime();
  });

  return (base.length > 0 ? base : eligible).slice(0, 3);
}

function QuickIcon({ label }: { label: string }) {
  const initial = label.trim().charAt(0).toUpperCase();
  return <span className="text-[14px] font-bold">{initial}</span>;
}

function Icon({
  name,
  className = "",
}: {
  name:
    | "calendar"
    | "clock"
    | "search"
    | "bell"
    | "chevron-down"
    | "chevron-left"
    | "chevron-right"
    | "plus"
    | "lock"
    | "users"
    | "map"
    | "eye"
    | "ellipsis"
    | "check"
    | "x"
    | "spark";
  className?: string;
}) {
  const base = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "calendar":
      return (
        <svg className={className} {...base}>
          <rect x="3.5" y="5.5" width="17" height="15" rx="3.5" />
          <path d="M7 3.5v4M17 3.5v4M3.5 9.5h17" />
        </svg>
      );
    case "clock":
      return (
        <svg className={className} {...base}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 8.5V12l2.5 1.5" />
        </svg>
      );
    case "search":
      return (
        <svg className={className} {...base}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
      );
    case "bell":
      return (
        <svg className={className} {...base}>
          <path d="M12 5.5a4.5 4.5 0 0 0-4.5 4.5v2.2c0 .8-.3 1.6-.8 2.2L5.5 15h13l-1.2-.6c-.5-.6-.8-1.4-.8-2.2V10a4.5 4.5 0 0 0-4.5-4.5Z" />
          <path d="M10 17.5a2 2 0 0 0 4 0" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg className={className} {...base}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "chevron-left":
      return (
        <svg className={className} {...base}>
          <path d="m14 6-6 6 6 6" />
        </svg>
      );
    case "chevron-right":
      return (
        <svg className={className} {...base}>
          <path d="m10 6 6 6-6 6" />
        </svg>
      );
    case "plus":
      return (
        <svg className={className} {...base}>
          <path d="M12 5.5v13M5.5 12h13" />
        </svg>
      );
    case "lock":
      return (
        <svg className={className} {...base}>
          <rect x="5" y="10" width="14" height="9" rx="2.5" />
          <path d="M8 10V8a4 4 0 0 1 8 0v2" />
        </svg>
      );
    case "users":
      return (
        <svg className={className} {...base}>
          <path d="M16 18.5v-1.2a3.5 3.5 0 0 0-3.5-3.5h-1A3.5 3.5 0 0 0 8 17.3v1.2" />
          <circle cx="12" cy="8.5" r="2.8" />
          <path d="M4.5 18.5v-.7a2.8 2.8 0 0 1 2.8-2.8h.7" />
          <circle cx="6.7" cy="9" r="1.9" />
          <path d="M19.5 18.5v-.7a2.8 2.8 0 0 0-2.8-2.8h-.7" />
          <circle cx="17.3" cy="9" r="1.9" />
        </svg>
      );
    case "map":
      return (
        <svg className={className} {...base}>
          <path d="M9 5.5 5.5 7v11l3.5-1.5 5 2 4-1.8V5.7l-4 1.8-5-2Z" />
          <path d="M9 5.5v11m5-9.2v11" />
        </svg>
      );
    case "eye":
      return (
        <svg className={className} {...base}>
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="2.7" />
        </svg>
      );
    case "ellipsis":
      return (
        <svg className={className} {...base}>
          <circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "check":
      return (
        <svg className={className} {...base}>
          <path d="m5.5 12 4 4 9-9" />
        </svg>
      );
    case "x":
      return (
        <svg className={className} {...base}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );
    case "spark":
      return (
        <svg className={className} {...base}>
          <path d="M12 3.5 13.8 8l4.5 1.8-4.5 1.7L12 16l-1.8-4.5-4.5-1.7L10.2 8 12 3.5Z" />
        </svg>
      );
  }
}

function colorForTone(tone?: string) {
  if (tone === "emerald") return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
  if (tone === "rose") return "border-rose-400/20 bg-rose-500/10 text-rose-100";
  if (tone === "amber") return "border-amber-400/20 bg-amber-500/10 text-amber-100";
  if (tone === "violet") return "border-violet-400/20 bg-violet-500/10 text-violet-100";
  if (tone === "slate") return "border-slate-400/20 bg-slate-500/10 text-slate-100";
  return "border-cyan-400/20 bg-cyan-500/10 text-cyan-100";
}

function getQuickActionTone(tone?: QuickActionLink["tone"]) {
  if (tone === "violet") return "border-violet-400/20 bg-violet-500/10 text-violet-100";
  if (tone === "emerald") return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
  if (tone === "slate") return "border-slate-400/20 bg-slate-500/10 text-slate-100";
  return "border-cyan-400/20 bg-cyan-500/10 text-cyan-100";
}

export function LocalReservationsPremiumDashboard({
  business,
  businesses,
  canChangeBusiness,
  selectedBusinessId,
  onBusinessChange,
  serviceCount,
  businessWarning,
  metricCards,
  search,
  statusFilter,
  dateFilter,
  customDate,
  hasActiveFilters,
  resultsCount,
  onClearFilters,
  onClearLocalReservations,
  onCustomDateChange,
  onDateFilterChange,
  onSearchChange,
  onStatusFilterChange,
  clearLocalReservationsLabel = "Limpiar reservas locales",
  hideClearLocalReservations = false,
  groupedReservations,
  filteredReservationsCount,
  availabilityByReservationId,
  serviceNameById,
  tableLabelByReservationId,
  onChangeStatus,
  onOpenAssignTable,
  onOpenDetail,
  emptyMessage,
  floorTables,
  reservations,
  today,
  now,
  occupancyPercent,
  occupiedSeats,
  totalSeats,
  quickActions,
}: LocalReservationsPremiumDashboardProps) {
  const dataSource = getDataSource();
  const businessName = business?.name ?? "Negocio asignado";
  const businessMeta = [business?.category, business?.city].filter(Boolean).join(" Ã‚Â· ");
  const visibleReservations = groupedReservations.flatMap((group) => group.items);
  const hourGroups = useMemo(() => groupReservationsByHour(visibleReservations), [visibleReservations]);
  const agendaItems = useMemo(() => getUpcomingAgenda(reservations, now), [reservations, now]);

  const visibleCount = filteredReservationsCount || resultsCount;
  const todayReservations = reservations.filter((reservation) => reservation.reservationDate === today);

  const tableRows = useMemo(() => {
    return visibleReservations.sort((left, right) => {
      const leftDate = `${left.reservationDate}T${formatTimeLabel(left.reservationTime)}`;
      const rightDate = `${right.reservationDate}T${formatTimeLabel(right.reservationTime)}`;
      return leftDate.localeCompare(rightDate);
    });
  }, [visibleReservations]);

  if (businesses.length > 0 && !business) {
    return <LocalNoActiveBusinessesState />;
  }

  return (
    <section className={styles.page}>
      <header className={styles.hero}>
        <div className={styles.heroLayout}>
          <div className={styles.heroCopy}>
            <p className={styles.heroKicker}>Reservas</p>
            <h1 className={styles.heroTitle}>Reservas Ã¢â‚¬â€ {businessName}</h1>
            <p className={styles.heroSubtitle}>
              GestionÃƒÂ¡ tus reservas y la asignaciÃƒÂ³n de mesas en tiempo real.
            </p>

            <div className={styles.heroChips}>
              <span className={styles.chip}>{businessMeta || "Negocio activo"}</span>
              <span className={styles.chip}>{getBusinessBadgeText(dataSource)}</span>
              <span className={styles.chip}>{serviceCount} servicios</span>
              <span className={styles.chip}>{visibleCount} resultados visibles</span>
            </div>

            {businessWarning ? (
              <div className="mt-3">
                <LocalBusinessWarning message={businessWarning} />
              </div>
            ) : null}
          </div>

          <div className={styles.heroActions}>
            <div className={styles.heroActionCard}>
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">Estado</p>
                <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] font-semibold text-emerald-100">
                  Activo
                </span>
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <div className="rounded-[14px] border border-white/10 bg-slate-950/70 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Negocio</p>
                  <p className="mt-1 text-sm font-semibold text-white">{businessName}</p>
                </div>
                <div className="rounded-[14px] border border-white/10 bg-slate-950/70 px-3 py-2">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-slate-500">Servicios</p>
                  <p className="mt-1 text-sm font-semibold text-white">{serviceCount}</p>
                </div>
              </div>
            </div>

            <div className={styles.heroActionCard}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.22em] text-slate-400">
                    Fecha
                  </p>
                  <p className="mt-1 text-sm font-semibold text-white">{formatDateLabel(today)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <button type="button" className={styles.heroButtonAlt} onClick={() => onDateFilterChange("today")}>Hoy</button>
                  <button type="button" className={styles.heroButton} aria-label="Anterior">
                    <Icon name="chevron-left" className="h-4 w-4" />
                  </button>
                  <button type="button" className={styles.heroButton} aria-label="Siguiente">
                    <Icon name="chevron-right" className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className={styles.heroActionGrid}>
                <button type="button" onClick={onClearFilters} className={styles.heroButton}>
                  Limpiar filtros
                </button>
                <button type="button" className={styles.heroButtonAlt}>
                  Filtros
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className={styles.metricsGrid}>
        {metricCards.map((card) => (
          <article key={card.label} className={styles.metricCard}>
            <div className={styles.metricHeader}>
              <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full border ${colorForTone(card.tone)}`}>
                <Icon name="clock" className="h-4 w-4" />
              </span>
              <div className={styles.metricLabel}>{card.label}</div>
            </div>

            <div>
              <div className={styles.metricValueRow}>
                <span className={styles.metricValue}>{card.value}</span>
                {typeof card.value === "number" ? <span className={styles.metricUnit}>reservas</span> : null}
              </div>
              {card.helper ? <div className="mt-1 text-[11px] text-slate-400">{card.helper}</div> : null}
            </div>

            <div className={styles.metricFooter}>
              <span className={styles.metricHint}>Hoy</span>
              <span className={styles.metricLink}>{card.label === "PrÃƒÂ³xima reserva" ? "Ver detalle Ã¢â€ â€™" : "Ver todas Ã¢â€ â€™"}</span>
            </div>
          </article>
        ))}
      </section>

      <section className={styles.filtersBar}>
        <div className={styles.filtersGrid}>
          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Buscar</span>
            <input
              value={search}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Buscar por nombre, telÃƒÂ©fono o email..."
              className={styles.filterInput}
            />
          </label>

          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Estado</span>
            <select
              value={statusFilter}
              onChange={(event) => onStatusFilterChange(event.target.value)}
              className={styles.filterSelect}
            >
              <option value="all">Todos</option>
              <option value="pending">Pendientes</option>
              <option value="confirmed">Confirmadas</option>
              <option value="cancelled">Canceladas</option>
              <option value="completed">Completadas</option>
              <option value="no_show">No-show</option>
            </select>
          </label>

          <label className={styles.filterField}>
            <span className={styles.filterLabel}>Fecha</span>
            <select
              value={dateFilter}
              onChange={(event) => onDateFilterChange(event.target.value)}
              className={styles.filterSelect}
            >
              <option value="today">Hoy</option>
              <option value="all">Todas</option>
              <option value="tomorrow">MaÃƒÂ±ana</option>
              <option value="week">Esta semana</option>
              <option value="custom">Personalizada</option>
            </select>
          </label>

          <button type="button" onClick={() => onDateFilterChange("custom")} className={`${styles.filterButton} ${styles.filterButtonAlt}`}>
            + Fecha personalizada
          </button>

          <button type="button" onClick={onClearFilters} className={styles.filterButton}>
            Limpiar filtros
          </button>

          <div className={styles.filterHint}>Agrupar por: Horario</div>
        </div>

        {dateFilter === "custom" ? (
          <div className="mt-3">
            <label className={styles.filterField}>
              <span className={styles.filterLabel}>Fecha personalizada</span>
              <input
                type="date"
                value={customDate}
                onChange={(event) => onCustomDateChange(event.target.value)}
                className={styles.filterInput}
              />
            </label>
          </div>
        ) : null}

        {hideClearLocalReservations ? null : onClearLocalReservations ? (
          <div className="mt-3 flex justify-end">
            <button
              type="button"
              onClick={onClearLocalReservations}
              className="rounded-full border border-rose-400/20 bg-rose-500/10 px-4 py-2 text-[11px] font-semibold text-rose-100"
            >
              {clearLocalReservationsLabel}
            </button>
          </div>
        ) : null}
      </section>

      <section className={styles.mainGrid}>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.panelHeaderText}>
              <div className={styles.panelEyebrow}>{formatDateLabel(today)}</div>
              <div className={styles.panelTitle}>
                Reservas de hoy <span className="text-slate-400">Ã¢â‚¬â€ {filteredReservationsCount} reservas</span>
              </div>
              <div className={styles.panelSubline}>GestionÃƒÂ¡ el flujo del dÃƒÂ­a con vista agrupada por horario.</div>
            </div>

            <div className={styles.panelHeaderActions}>
              <span className={styles.pill}>{filteredReservationsCount} visibles</span>
              <span className={styles.pill}>{todayReservations.length} hoy</span>
              <select className={`${styles.pill} !h-[30px]`} defaultValue="Horario" aria-label="Agrupar por">
                <option>Horario</option>
              </select>
            </div>
          </div>

          <div className={styles.scrollArea}>
            {tableRows.length === 0 ? (
              <div className="p-4">
                <LocalBusinessWarning message={emptyMessage} />
              </div>
            ) : (
              <>
                <div className={styles.columnHeader}>
                  <span>Hora</span>
                  <span>Cliente</span>
                  <span>Personas</span>
                  <span>Mesa</span>
                  <span>Estado</span>
                  <span>Canal</span>
                  <span>Servicio</span>
                  <span>Nota</span>
                  <span>Acciones</span>
                </div>

                {hourGroups.map((group) => (
                  <article key={group.hour} className={styles.groupCard}>
                    <div className={styles.groupHeader}>
                      <div className={styles.groupHour}>
                        <Icon name="clock" className="h-4 w-4 text-cyan-300" />
                        {group.hour}
                      </div>
                      <span className={styles.groupCount}>{group.items.length} reservas</span>
                    </div>

                    <div>
                      {group.items.map((reservation) => {
                        const availability = availabilityByReservationId.get(reservation.id);
                        const tableLabel =
                          tableLabelByReservationId.get(reservation.id) ??
                          reservation.joinedTableLabel ??
                          reservation.tableLabel ??
                          "Sin mesa";
                        const serviceName =
                          serviceNameById.get(reservation.serviceId) ?? "Sin servicio";
                        const statusTone = getStatusTone(reservation.status);

                        return (
                          <div key={reservation.id} className={styles.reservationRow}>
                            <div className={styles.timeCell}>
                              <div className={styles.timeLabel}>{formatTimeLabel(reservation.reservationTime)}</div>
                              <div className={styles.timeMeta}>{reservation.partySize} personas</div>
                            </div>

                            <div className={styles.clientCell}>
                              <div className={styles.clientName}>{reservation.customerName}</div>
                              <div className={styles.clientPhone}>{reservation.customerPhone}</div>
                            </div>

                            <div className={styles.stackCell}>
                              <div className={styles.stackLabel}>Personas</div>
                              <div className={styles.stackValue}>{reservation.partySize}</div>
                            </div>

                            <div className={styles.stackCell}>
                              <div className={styles.stackLabel}>Mesa</div>
                              <div className={styles.stackValue}>{tableLabel}</div>
                            </div>

                            <div className={styles.stackCell}>
                              <span className={`${styles.statusTone} ${styles[statusTone]}`}>{formatStatusLabel(reservation.status)}</span>
                            </div>

                            <div className={styles.stackCell}>
                              <div className={styles.stackLabel}>Canal</div>
                              <div className={styles.stackValue}>{reservation.source}</div>
                            </div>

                            <div className={styles.stackCell}>
                              <div className={styles.stackLabel}>Servicio</div>
                              <div className={styles.stackValue}>{serviceName}</div>
                            </div>

                            <div className={styles.noteCell}>
                              <div className={styles.noteBadge}>
                                {availability?.label ?? "Sin alerta"}
                              </div>
                              <div className={styles.noteText}>{reservation.notes || "Sin notas"}</div>
                            </div>

                            <div className={styles.actionCell}>
                              <div className={styles.actionRow}>
                                {reservation.status === "pending" ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => onChangeStatus(reservation.id, "confirmed")}
                                      className={`${styles.actionButton} ${styles.actionButtonStrong}`}
                                    >
                                      Confirmar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onChangeStatus(reservation.id, "cancelled")}
                                      className={`${styles.actionButton} ${styles.actionButtonRose}`}
                                    >
                                      Cancelar
                                    </button>
                                  </>
                                ) : reservation.status === "confirmed" ? (
                                  <>
                                    <button
                                      type="button"
                                      onClick={() => onOpenAssignTable(reservation)}
                                      className={`${styles.actionButton} ${styles.actionButtonStrong}`}
                                    >
                                      {reservation.joinedTableLabel || reservation.tableLabel ? "Cambiar mesa" : "Asignar mesa"}
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => onChangeStatus(reservation.id, "completed")}
                                      className={styles.actionButton}
                                    >
                                      Completar
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => onOpenDetail(reservation)}
                                    className={styles.actionButton}
                                  >
                                    Ver detalle
                                  </button>
                                )}

                                <button
                                  type="button"
                                  onClick={() => onOpenDetail(reservation)}
                                  className={`${styles.actionButton} ${styles.actionButtonSlate}`}
                                  aria-label="MÃƒÂ¡s opciones"
                                >
                                  <Icon name="ellipsis" className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </article>
                ))}
              </>
            )}
          </div>
        </section>

        <aside className={styles.rightStack}>
          <section className={styles.rightCard}>
            <div className={styles.rightCardHeader}>
              <div className={styles.panelEyebrow}>Resumen</div>
              <div className={styles.rightCardTitle}>OcupaciÃƒÂ³n de hoy</div>
            </div>
            <div className={styles.rightCardBody}>
              <div className={styles.occupancyMain}>
                <div className={styles.occupancyDonut} aria-label={`${occupancyPercent}% de ocupaciÃƒÂ³n`}>
                  <span className={styles.occupancyDonutValue}>{occupancyPercent}%</span>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] font-semibold text-white">
                    {occupiedSeats} / {totalSeats} cubiertos
                  </div>
                  <div className="mt-1 text-[12px] text-slate-400">Hoy</div>
                </div>
              </div>

              <div className={styles.occupancyStats}>
                <div className={styles.occupancyStat}>
                  <span>Confirmadas</span>
                  <strong>24 / 75%</strong>
                </div>
                <div className={styles.occupancyStat}>
                  <span>Pendientes</span>
                  <strong>6 / 19%</strong>
                </div>
                <div className={styles.occupancyStat}>
                  <span>Disponibles</span>
                  <strong>30 / 22%</strong>
                </div>
              </div>

              <Link href={business?.slug ? `/local/plano?business=${business.slug}` : "/local/plano"} className={styles.rightLink}>
                Ver plano de salÃƒÂ³n Ã¢â€ â€™
              </Link>
            </div>
          </section>

          <section className={styles.rightCard}>
            <div className={styles.rightCardHeader}>
              <div className={styles.panelEyebrow}>Agenda</div>
              <div className={styles.rightCardTitle}>Agenda rÃƒÂ¡pida</div>
            </div>
            <div className={styles.rightCardBody}>
              <div className={styles.agendaList}>
                {agendaItems.map((reservation, index) => {
                  const label =
                    index === 0
                      ? "PrÃƒÂ³xima reserva"
                      : reservation.notes?.toLowerCase().includes("cumple")
                        ? "CumpleaÃƒÂ±os"
                        : reservation.partySize >= 6
                          ? "Grupo grande"
                          : reservation.status === "pending"
                            ? "Reserva pendiente"
                            : "Reserva";

                  return (
                    <div key={reservation.id} className={styles.agendaItem}>
                      <div className={styles.agendaTime}>{formatTimeLabel(reservation.reservationTime)}</div>
                      <div className={styles.agendaText}>
                        <div className={styles.agendaLabel}>
                          {label} — {reservation.customerName}
                        </div>
                        <div className={styles.agendaSub}>
                          {tableLabelByReservationId.get(reservation.id) ??
                            reservation.tableLabel ??
                            "Sin mesa"}{" "}
                          · {reservation.partySize} personas
                        </div>
                      </div>
                      <button type="button" className={styles.agendaAction} aria-label="Abrir reserva">
                        <Icon name="calendar" className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>

          <section className={styles.rightCard}>
            <div className={styles.rightCardHeader}>
              <div className={styles.panelEyebrow}>Atajos</div>
              <div className={styles.rightCardTitle}>Acciones rÃƒÂ¡pidas</div>
            </div>
            <div className={styles.rightCardBody}>
              <div className={styles.quickGrid}>
                {quickActions.map((action) => (
                  <Link key={action.label} href={action.href} className={`${styles.quickTile} ${getQuickActionTone(action.tone)}`}>
                    <div className="flex items-center justify-between gap-2">
                      <span className={styles.quickIcon}>
                        <QuickIcon label={action.label} />
                      </span>
                      <Icon name="chevron-right" className="h-4 w-4 text-white/70" />
                    </div>
                    <div>
                      <div className={styles.quickTitle}>{action.label}</div>
                      <div className={styles.quickSub}>{action.description}</div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </section>
        </aside>
      </section>
    </section>
  );
}
