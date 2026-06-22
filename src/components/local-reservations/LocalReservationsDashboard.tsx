"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import type { Business, FloorTable, Reservation, ReservationStatus } from "@/data/types";
import { LocalBusinessWarning } from "@/components/local/LocalBusinessWarning";
import { LocalReservationsEmptyState } from "@/components/local-reservations/LocalReservationsEmptyState";
import { LocalReservationsList } from "@/components/local-reservations/LocalReservationsList";
import { getDataSource } from "@/lib/data/dataSource";

export type LocalReservationsMetricCard = {
  label: string;
  value: number | string;
  tone?: "default" | "emerald" | "cyan" | "amber" | "rose";
  helper?: string;
  kind?: "default" | "gauge";
};

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

type LocalReservationsDashboardProps = {
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

function formatDateLabel(dateValue: string) {
  if (!dateValue) {
    return "Sin fecha";
  }

  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
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

function getToneStyles(
  tone: LocalReservationsMetricCard["tone"] = "default",
  highlighted = false,
) {
  if (tone === "emerald") {
    return highlighted
      ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-100"
      : "border-white/10 bg-white/5 text-emerald-100";
  }
  if (tone === "cyan") {
    return highlighted
      ? "border-cyan-400/30 bg-cyan-500/15 text-cyan-100"
      : "border-white/10 bg-white/5 text-cyan-100";
  }
  if (tone === "amber") {
    return highlighted
      ? "border-amber-400/30 bg-amber-500/15 text-amber-100"
      : "border-white/10 bg-white/5 text-amber-100";
  }
  if (tone === "rose") {
    return highlighted
      ? "border-rose-400/30 bg-rose-500/15 text-rose-100"
      : "border-white/10 bg-white/5 text-rose-100";
  }

  return highlighted
    ? "border-cyan-400/30 bg-cyan-500/15 text-cyan-100"
    : "border-white/10 bg-white/5 text-slate-100";
}

function getTableTone(status: FloorTable["status"]) {
  if (status === "blocked") {
    return "border-rose-400/35 bg-rose-500/15 text-rose-100";
  }
  if (status === "out_of_service") {
    return "border-slate-400/35 bg-slate-500/15 text-slate-100";
  }
  if (status === "reserved") {
    return "border-cyan-400/35 bg-cyan-500/15 text-cyan-100";
  }
  if (status === "occupied") {
    return "border-amber-400/35 bg-amber-500/15 text-amber-100";
  }

  return "border-emerald-400/30 bg-emerald-500/10 text-emerald-100";
}

function formatTableStatus(status: FloorTable["status"]) {
  if (status === "available") return "Disponible";
  if (status === "occupied") return "Ocupada";
  if (status === "reserved") return "Reservada";
  if (status === "blocked") return "Bloqueada";
  return "Fuera de servicio";
}

function reserveTimeLabel(value: string) {
  return value?.includes(":") ? value.slice(0, 5) : value;
}

function getBusinessBadgeText(dataSource: string) {
  return dataSource === "supabase" ? "Fuente de datos: Supabase" : "Fuente de datos: Local";
}

export function LocalReservationsDashboard({
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
  onOpenAssignTableFromEmptyState,
  emptyMessage,
  floorTables,
  reservations,
  today,
  now,
  occupancyPercent,
  occupiedSeats,
  totalSeats,
  quickActions,
}: LocalReservationsDashboardProps) {
  const dataSource = getDataSource();
  const businessName = business?.name ?? "Negocio asignado";
  const businessMeta = [business?.category, business?.city].filter(Boolean).join(" · ");

  const todayReservations = reservations.filter((reservation) => reservation.reservationDate === today);
  const recentReservations = [...reservations]
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 4);

  const customerMap = new Map<string, { name: string; visits: number; phone: string }>();
  for (const reservation of reservations) {
    const key = (reservation.customerPhone || reservation.customerName).trim().toLowerCase();
    if (!key) {
      continue;
    }

    const current = customerMap.get(key);
    if (current) {
      current.visits += 1;
      continue;
    }

    customerMap.set(key, {
      name: reservation.customerName || "Cliente sin nombre",
      phone: reservation.customerPhone || "Sin telefono",
      visits: 1,
    });
  }

  const featuredCustomers = [...customerMap.values()]
    .sort((left, right) => right.visits - left.visits || left.name.localeCompare(right.name))
    .slice(0, 3);

  const hourlyMap = new Map<string, { count: number; people: number }>();
  for (const reservation of todayReservations) {
    const hour = reserveTimeLabel(reservation.reservationTime).slice(0, 2);
    if (!hour) {
      continue;
    }

    const bucket = hourlyMap.get(hour) ?? { count: 0, people: 0 };
    bucket.count += 1;
    bucket.people += reservation.partySize;
    hourlyMap.set(hour, bucket);
  }

  const maxHourlyCount = Math.max(1, ...[...hourlyMap.values()].map((item) => item.count));
  const occupancyBars = [...hourlyMap.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .slice(0, 8);

  const visibleCount = filteredReservationsCount || resultsCount;

  return (
    <section className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
      <header className="grid gap-3 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(15,23,42,0.78))] p-4 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-5">
          <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-300/75">
                Reservas
              </p>
              <h1 className="text-[2rem] font-semibold tracking-tight text-white sm:text-[2.35rem]">
                Reservas — {businessName}
              </h1>
              <p className="max-w-3xl text-sm leading-6 text-slate-300">
                Gestiona tus reservas y la asignacion de mesas en tiempo real.
              </p>
              <div className="flex flex-wrap gap-2 pt-1.5 text-[11px] text-slate-300">
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {businessMeta || "Negocio activo"}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {getBusinessBadgeText(dataSource)}
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {serviceCount} servicios
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">
                  {visibleCount} resultados visibles
                </span>
              </div>
            </div>

            <div className="flex flex-col gap-2 xl:min-w-[320px]">
              {canChangeBusiness ? (
                <label className="space-y-1">
                  <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                    Negocio
                  </span>
                  <select
                    value={selectedBusinessId}
                    onChange={(event) => onBusinessChange(event.target.value)}
                    className="input-base h-11 min-w-[240px]"
                  >
                    {businesses.map((entry) => (
                      <option key={entry.id} value={entry.id}>
                        {entry.name}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <div className="rounded-[1.3rem] border border-white/10 bg-white/5 px-4 py-3 shadow-xl shadow-black/20">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    Negocio actual
                  </p>
                  <p className="mt-1 text-lg font-semibold tracking-tight text-white">
                    {businessName}
                  </p>
                  <p className="mt-1 text-sm text-slate-400">
                    Vista fija del negocio asignado.
                  </p>
                </div>
              )}

              <div className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                    Fecha
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {formatDateLabel(today)}
                  </p>
                </div>
                <div className="rounded-[1.2rem] border border-white/10 bg-white/5 px-3 py-2.5">
                  <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                    Ocupacion
                  </p>
                  <p className="mt-1 text-sm font-medium text-white">
                    {Math.round(occupancyPercent)}%
                  </p>
                </div>
              </div>
            </div>
          </div>

          {businessWarning ? <LocalBusinessWarning message={businessWarning} /> : null}
        </div>

        <div className="rounded-[1.6rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.86))] p-4 shadow-2xl shadow-black/25 backdrop-blur-xl sm:p-5">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
                Filtros rapidos
              </p>
              <h2 className="mt-1 text-lg font-semibold text-white">Agenda del local</h2>
            </div>
            <button
              type="button"
              onClick={onClearFilters}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
            >
              Reset
            </button>
          </div>

          <div className="mt-3 space-y-2">
            <div className="grid gap-2 sm:grid-cols-2">
              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Estado
                </span>
                <select
                  value={statusFilter}
                  onChange={(event) => onStatusFilterChange(event.target.value)}
                  className="input-base h-11"
                >
                  <option value="all">Todas</option>
                  <option value="pending">Pendientes</option>
                  <option value="confirmed">Confirmadas</option>
                  <option value="cancelled">Canceladas</option>
                  <option value="completed">Completadas</option>
                  <option value="no_show">No-show</option>
                </select>
              </label>
              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Filtro de fecha
                </span>
                <select
                  value={dateFilter}
                  onChange={(event) => onDateFilterChange(event.target.value)}
                  className="input-base h-11"
                >
                  <option value="today">Hoy</option>
                  <option value="all">Todas</option>
                  <option value="tomorrow">Manana</option>
                  <option value="week">Esta semana</option>
                  <option value="custom">Personalizada</option>
                </select>
              </label>
            </div>

            {dateFilter === "custom" ? (
              <label className="space-y-1">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Fecha personalizada
                </span>
                <input
                  type="date"
                  value={customDate}
                  onChange={(event) => onCustomDateChange(event.target.value)}
                  className="input-base h-11"
                />
              </label>
            ) : null}

            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Buscar
              </span>
              <input
                value={search}
                onChange={(event) => onSearchChange(event.target.value)}
                placeholder="Nombre, telefono, email o nota"
                className="input-base h-11"
              />
            </label>

            <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] text-slate-300">
              <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1">
                {resultsCount} resultados
              </span>
              <span
                className={`rounded-full border px-2.5 py-1 ${hasActiveFilters ? "border-cyan-400/25 bg-cyan-500/10 text-cyan-100" : "border-white/10 bg-slate-900/70 text-slate-300"}`}
              >
                {hasActiveFilters ? "Filtros activos" : "Vista base"}
              </span>
              <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1">
                {serviceCount} servicios
              </span>
            </div>

            {!hideClearLocalReservations ? (
              <button
                type="button"
                onClick={onClearLocalReservations}
                className="w-full rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-2 text-[11px] font-medium text-rose-100 transition hover:border-rose-300/40 hover:bg-rose-500/20"
              >
                {clearLocalReservationsLabel}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <section className="grid gap-2.5 sm:grid-cols-2 xl:grid-cols-6">
        {metricCards.map((card) => (
          <MetricTile key={card.label} card={card} />
        ))}
      </section>

      <section className="grid min-h-0 flex-1 gap-3 xl:grid-rows-[minmax(0,1.12fr)_minmax(0,0.9fr)]">
        <div className="grid min-h-0 gap-3 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,0.95fr)]">
          <section className="flex min-h-0 flex-col overflow-hidden rounded-[1.55rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.86))] shadow-2xl shadow-black/25 backdrop-blur-xl">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/75">
                  Reservas de hoy
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">
                  {filteredReservationsCount > 0
                    ? `${filteredReservationsCount} en total`
                    : "Sin reservas visibles"}
                </h2>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-300">
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                  {filteredReservationsCount} visibles
                </span>
                <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1">
                  {reservations.filter((reservation) => reservation.reservationDate === today).length} hoy
                </span>
              </div>
            </div>

            <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
              {groupedReservations.length === 0 ? (
                <div className="flex-1 overflow-auto p-4">
                  <LocalReservationsEmptyState
                    onClearFilters={onClearFilters}
                    emptyMessage={emptyMessage}
                  />
                </div>
              ) : (
                <div className="flex-1 overflow-auto p-2.5 pr-2.5">
                  <LocalReservationsList
                    groupedReservations={groupedReservations}
                    availabilityByReservationId={availabilityByReservationId}
                    onChangeStatus={onChangeStatus}
                    onOpenAssignTable={onOpenAssignTable}
                    onOpenDetail={onOpenDetail}
                    serviceNameById={serviceNameById}
                    tableLabelByReservationId={tableLabelByReservationId}
                    compact
                  />
                </div>
              )}
            </div>
          </section>

          <section className="flex min-h-0 flex-col overflow-hidden rounded-[1.55rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.86))] shadow-2xl shadow-black/25 backdrop-blur-xl">
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/75">
                  Plano del salon
                </p>
                <h2 className="mt-1 text-lg font-semibold text-white">
                  Vista compacta
                </h2>
              </div>
              <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">
                {floorTables.length} mesas
              </span>
            </div>

            <div className="flex min-h-0 flex-1 flex-col gap-3 p-4">
              <div className="flex flex-wrap gap-2 text-[11px] text-slate-300">
                <LegendPill tone="emerald" label="Disponible" />
                <LegendPill tone="cyan" label="Reservada" />
                <LegendPill tone="amber" label="Ocupada" />
                <LegendPill tone="rose" label="Bloqueada" />
              </div>

              <div className="relative flex-1 overflow-hidden rounded-[1.35rem] border border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.08),transparent_28%),linear-gradient(180deg,rgba(2,6,23,0.95),rgba(15,23,42,0.9))] p-3">
                <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:34px_34px] opacity-50" />
                <div className="relative h-full w-full">
                  {floorTables.length > 0 ? (
                    <MiniFloorMap tables={floorTables} />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-400">
                      No hay mesas configuradas.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="grid min-h-0 gap-3 xl:grid-cols-[1.05fr_1fr_0.95fr_0.9fr]">
          <SectionPanel
            title="Ocupacion por franja horaria"
            eyebrow="Resumen"
            footer={<span className="text-[11px] text-slate-400">Hoy</span>}
          >
            <OccupancyChart bars={occupancyBars} maxValue={maxHourlyCount} />
          </SectionPanel>

          <SectionPanel title="Actividad reciente" eyebrow="Movimiento" footer={null}>
            <div className="space-y-3">
              {recentReservations.map((reservation) => (
                <RecentReservationItem
                  key={reservation.id}
                  reservation={reservation}
                  now={now}
                  tableLabel={
                    tableLabelByReservationId.get(reservation.id) ??
                    reservation.joinedTableLabel ??
                    reservation.tableLabel ??
                    "Sin mesa"
                  }
                />
              ))}
            </div>
          </SectionPanel>

          <SectionPanel title="Clientes destacados" eyebrow="Frecuencia" footer={null}>
            <div className="space-y-3">
              {featuredCustomers.map((customer) => (
                <FeaturedCustomerItem key={`${customer.name}-${customer.phone}`} customer={customer} />
              ))}
            </div>
          </SectionPanel>

          <SectionPanel title="Acciones rapidas" eyebrow="Atajos" footer={null}>
            <div className="grid gap-2">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className={`group rounded-[1.2rem] border px-3 py-3 text-left transition hover:-translate-y-0.5 ${
                    action.tone === "violet"
                      ? "border-violet-400/25 bg-violet-500/10 hover:border-violet-300/45"
                      : action.tone === "emerald"
                        ? "border-emerald-400/25 bg-emerald-500/10 hover:border-emerald-300/45"
                        : action.tone === "slate"
                          ? "border-white/10 bg-white/5 hover:border-white/20"
                          : "border-cyan-400/25 bg-cyan-500/10 hover:border-cyan-300/45"
                  }`}
                >
                  <p className="text-sm font-semibold text-white">{action.label}</p>
                  <p className="mt-1 text-[11px] leading-4 text-slate-300">{action.description}</p>
                </Link>
              ))}
            </div>
          </SectionPanel>
        </div>
      </section>
    </section>
  );
}

function MetricTile({ card }: { card: LocalReservationsMetricCard }) {
  if (card.kind === "gauge") {
    const percent = Math.max(0, Math.min(100, Number(card.value) || 0));
    const style = {
      background: `conic-gradient(rgba(34,211,238,0.95) 0 ${percent}%, rgba(255,255,255,0.08) ${percent}% 100%)`,
    };

    return (
      <article className={`rounded-[1.25rem] border bg-white/[0.05] px-3 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl ${getToneStyles(card.tone, true)}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{card.label}</p>
            <p className="text-[1.7rem] font-semibold tracking-tight text-white">{percent}%</p>
            {card.helper ? <p className="text-[11px] text-slate-400">{card.helper}</p> : null}
          </div>
          <div className="relative h-16 w-16 rounded-full p-1" style={style}>
            <div className="flex h-full w-full items-center justify-center rounded-full border border-white/10 bg-slate-950/95">
              <span className="text-sm font-semibold text-cyan-100">{percent}%</span>
            </div>
          </div>
        </div>
      </article>
    );
  }

  return (
    <article className={`rounded-[1.25rem] border bg-white/[0.05] px-3 py-3 shadow-2xl shadow-black/20 backdrop-blur-xl ${getToneStyles(card.tone)}`}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{card.label}</p>
      <p className="mt-1 text-[1.45rem] font-semibold tracking-tight text-white">{card.value}</p>
      {card.helper ? <p className="mt-1 text-[11px] leading-4 text-slate-400">{card.helper}</p> : null}
    </article>
  );
}

function SectionPanel({
  title,
  eyebrow,
  footer,
  children,
}: {
  title: string;
  eyebrow: string;
  footer: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="flex min-h-0 flex-col overflow-hidden rounded-[1.45rem] border border-white/10 bg-[linear-gradient(180deg,rgba(15,23,42,0.92),rgba(2,6,23,0.85))] shadow-2xl shadow-black/20 backdrop-blur-xl">
      <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/75">{eyebrow}</p>
          <h3 className="mt-1 text-[1.02rem] font-semibold text-white">{title}</h3>
        </div>
        {footer}
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-4">{children}</div>
    </section>
  );
}

function OccupancyChart({
  bars,
  maxValue,
}: {
  bars: Array<[string, { count: number; people: number }]>;
  maxValue: number;
}) {
  return (
    <div className="flex h-full min-h-[180px] flex-col justify-end gap-2">
      <div className="flex h-full items-end gap-1.5">
        {bars.length > 0 ? (
          bars.map(([hour, value]) => {
            const height = Math.max(18, Math.round((value.count / maxValue) * 100));
            return (
              <div key={hour} className="flex flex-1 flex-col items-center justify-end gap-1.5">
                <div className="relative flex h-full w-full items-end justify-center">
                  <div
                    className="w-full max-w-[26px] rounded-t-[0.8rem] bg-[linear-gradient(180deg,rgba(96,165,250,0.8),rgba(34,211,238,0.92))] shadow-lg shadow-cyan-500/20"
                    style={{ height: `${height}%` }}
                  />
                </div>
                <div className="text-center">
                  <p className="text-[10px] font-medium text-slate-300">{hour}:00</p>
                  <p className="text-[10px] text-slate-500">{value.count}</p>
                </div>
              </div>
            );
          })
        ) : (
          <div className="flex h-full items-center justify-center text-sm text-slate-400">
            No hay datos para este dia.
          </div>
        )}
      </div>
    </div>
  );
}

function RecentReservationItem({
  reservation,
  tableLabel,
  now,
}: {
  reservation: Reservation;
  tableLabel: string;
  now: Date | null;
}) {
  return (
    <div className="rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-3 py-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-semibold text-white">{reservation.customerName}</p>
          <p className="mt-1 text-[11px] text-slate-400">
            {reservation.reservationDate} - {reserveTimeLabel(reservation.reservationTime)}
          </p>
        </div>
        <span className="rounded-full border border-white/10 bg-slate-950/80 px-2 py-0.5 text-[10px] text-slate-300">
          {formatRelativeTime(reservation.updatedAt, now)}
        </span>
      </div>
      <div className="mt-2 flex flex-wrap gap-1.5 text-[11px] text-slate-300">
        <span className="rounded-full border border-white/10 bg-slate-950/70 px-2 py-0.5">
          {reservation.partySize} personas
        </span>
        <span className="rounded-full border border-white/10 bg-slate-950/70 px-2 py-0.5">
          {tableLabel}
        </span>
        <span className="rounded-full border border-white/10 bg-slate-950/70 px-2 py-0.5">
          {reservation.status}
        </span>
      </div>
    </div>
  );
}

function FeaturedCustomerItem({
  customer,
}: {
  customer: { name: string; visits: number; phone: string };
}) {
  return (
    <div className="flex items-center gap-3 rounded-[1.1rem] border border-white/10 bg-white/[0.04] px-3 py-3">
      <div className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-slate-950/80 text-sm font-semibold text-cyan-100">
        {customer.name
          .split(" ")
          .slice(0, 2)
          .map((part) => part.charAt(0))
          .join("")
          .toUpperCase()}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">{customer.name}</p>
        <p className="mt-0.5 text-[11px] text-slate-400">{customer.visits} visitas</p>
      </div>
      <div className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-medium text-cyan-100">
        VIP
      </div>
    </div>
  );
}

function LegendPill({
  tone,
  label,
}: {
  tone: "emerald" | "cyan" | "amber" | "rose";
  label: string;
}) {
  const className =
    tone === "emerald"
      ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
      : tone === "cyan"
        ? "border-cyan-400/25 bg-cyan-500/10 text-cyan-100"
        : tone === "amber"
          ? "border-amber-400/25 bg-amber-500/10 text-amber-100"
          : "border-rose-400/25 bg-rose-500/10 text-rose-100";

  return (
    <span className={`rounded-full border px-2.5 py-1 ${className}`}>{label}</span>
  );
}

function MiniFloorMap({ tables }: { tables: FloorTable[] }) {
  const sortedTables = [...tables].sort((left, right) => left.y - right.y || left.x - right.x);
  const maxX = Math.max(1, ...sortedTables.map((table) => table.x + table.width));
  const maxY = Math.max(1, ...sortedTables.map((table) => table.y + table.height));

  return (
    <div className="relative h-full w-full">
      {sortedTables.map((table) => {
        const left = (table.x / maxX) * 100;
        const top = (table.y / maxY) * 100;
        const width = Math.max(7.5, (table.width / maxX) * 100);
        const height = Math.max(8, (table.height / maxY) * 100);

        return (
          <div
            key={table.id}
            className={`absolute flex items-center justify-center rounded-[0.95rem] border px-2 py-1 text-center shadow-lg shadow-black/25 ${getTableTone(table.status)}`}
            style={{
              left: `${left}%`,
              top: `${top}%`,
              width: `${width}%`,
              height: `${height}%`,
              transform: `translate(-50%, -50%) rotate(${table.rotation}deg)`,
            }}
          >
            <div className="space-y-0.5 leading-none">
              <p className="text-[0.95rem] font-semibold">{table.label}</p>
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/70">
                {table.seats} asientos
              </p>
              <p className="text-[10px] font-medium">{formatTableStatus(table.status)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
