"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import type { Business, Customer, FloorTable, Reservation, Service } from "@/data/types";
import { LocalNoActiveBusinessesState } from "@/components/local/LocalNoActiveBusinessesState";
import { LocalBusinessWarning } from "@/components/local/LocalBusinessWarning";
import { getDataSource } from "@/lib/data/dataSource";
import { getBusinesses, subscribeBusinesses } from "@/lib/data/admin-businesses";
import { getCustomersByBusinessId, subscribeCRM } from "@/lib/data/crm";
import { getFloorTablesByBusinessId, subscribeFloorPlan } from "@/lib/data/floorPlan";
import { getReservationsByBusinessId, subscribeReservations } from "@/data/reservations";
import { getServicesByBusiness } from "@/lib/data/services";
import { useLocalBusinessSelection } from "@/hooks/useLocalBusinessSelection";
import { APP_VERSION } from "@/lib/constants";
import {
  buildLocalAccessHref,
  buildLocalBusinessHref,
  getLocalAccessMode,
  getLocalBusinessSlugFromSearchParams,
} from "@/lib/local-business-routing";
import {
  buildDateTimeFromDateAndTime,
  normalizeDateKey,
  timeToMinutes,
} from "@/lib/date-time";

type DashboardMetricTone = "cyan" | "emerald" | "rose" | "violet" | "blue";

type DashboardMetricCard = {
  label: string;
  value: number | string;
  helper: string;
  footer: string;
  tone: DashboardMetricTone;
  actionLabel: string;
  icon: string;
};

type DashboardActionTone = "cyan" | "emerald" | "violet" | "slate";

type DashboardQuickAction = {
  label: string;
  href: string;
  tone: DashboardActionTone;
  description: string;
  icon: string;
};

type ChartPoint = {
  hour: string;
  value: number;
  highlighted?: boolean;
};

const FALLBACK_RESERVATIONS: Reservation[] = [];
const FALLBACK_CUSTOMERS: Customer[] = [];

function toDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatLongDate(date = new Date()) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
    .format(date)
    .replace(/^./, (char) => char.toUpperCase());
}

function formatShortDate(date = new Date()) {
  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatTime(value?: string | null) {
  if (!value) {
    return "--:--";
  }

  const normalized = value.trim();
  return normalized.length >= 5 ? normalized.slice(0, 5) : normalized;
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

function getStatusTone(status?: Reservation["status"] | FloorTable["status"]): string {
  if (status === "confirmed") return "bg-emerald-500/15 text-emerald-100 border-emerald-400/20";
  if (status === "pending") return "bg-cyan-500/15 text-cyan-100 border-cyan-400/20";
  if (status === "cancelled") return "bg-rose-500/15 text-rose-100 border-rose-400/20";
  if (status === "completed") return "bg-slate-500/15 text-slate-100 border-slate-400/20";
  if (status === "no_show") return "bg-violet-500/15 text-violet-100 border-violet-400/20";
  if (status === "reserved") return "bg-sky-500/15 text-sky-100 border-sky-400/20";
  if (status === "occupied") return "bg-amber-500/15 text-amber-100 border-amber-400/20";
  if (status === "blocked" || status === "out_of_service") {
    return "bg-slate-500/15 text-slate-100 border-slate-400/20";
  }
  return "bg-emerald-500/15 text-emerald-100 border-emerald-400/20";
}

function getMetricToneClasses(tone: DashboardMetricTone) {
  if (tone === "emerald") return "from-emerald-400/20 via-emerald-400/10 to-slate-950/80 text-emerald-100";
  if (tone === "rose") return "from-rose-400/20 via-rose-400/10 to-slate-950/80 text-rose-100";
  if (tone === "violet") return "from-violet-400/20 via-violet-400/10 to-slate-950/80 text-violet-100";
  if (tone === "blue") return "from-blue-400/20 via-blue-400/10 to-slate-950/80 text-blue-100";
  return "from-cyan-400/20 via-cyan-400/10 to-slate-950/80 text-cyan-100";
}

function getMetricIconToneClasses(tone: DashboardMetricTone) {
  if (tone === "emerald") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-200";
  if (tone === "rose") return "border-rose-400/20 bg-rose-400/10 text-rose-200";
  if (tone === "violet") return "border-violet-400/20 bg-violet-400/10 text-violet-200";
  if (tone === "blue") return "border-blue-400/20 bg-blue-400/10 text-blue-200";
  return "border-cyan-400/20 bg-cyan-400/10 text-cyan-200";
}

function getActionToneClasses(tone: DashboardActionTone) {
  if (tone === "emerald") return "border-emerald-400/20 bg-emerald-400/10 text-emerald-100 hover:bg-emerald-400/15";
  if (tone === "violet") return "border-violet-400/20 bg-violet-400/10 text-violet-100 hover:bg-violet-400/15";
  if (tone === "slate") return "border-slate-400/20 bg-slate-400/10 text-slate-100 hover:bg-slate-400/15";
  return "border-cyan-400/20 bg-cyan-400/10 text-cyan-100 hover:bg-cyan-400/15";
}

function getDayLabel(date = new Date()) {
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  })
    .format(date)
    .replace(/^./, (char) => char.toUpperCase());
}

function getBusinessMeta(business: Business | null) {
  if (!business) {
    return "Resumen del local";
  }

  return [business.category, business.city].filter(Boolean).join(" · ");
}

function sortReservationsByTime(reservations: Reservation[]) {
  return [...reservations].sort((left, right) => {
    const leftTime = buildDateTimeFromDateAndTime(left.reservationDate, left.reservationTime)?.getTime() ?? 0;
    const rightTime = buildDateTimeFromDateAndTime(right.reservationDate, right.reservationTime)?.getTime() ?? 0;

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return right.updatedAt.localeCompare(left.updatedAt);
  });
}

function aggregateCustomersFromReservations(reservations: Reservation[]) {
  const map = new Map<string, { name: string; visits: number }>();

  for (const reservation of reservations) {
    const key = `${reservation.customerName.trim().toLowerCase()}|${reservation.customerPhone.trim()}`;
    if (!key.trim()) {
      continue;
    }

    const current = map.get(key);
    if (current) {
      current.visits += 1;
      continue;
    }

    map.set(key, {
      name: reservation.customerName || "Cliente sin nombre",
      visits: 1,
    });
  }

  return [...map.values()].sort((left, right) => right.visits - left.visits || left.name.localeCompare(right.name));
}

function buildHourBuckets(reservations: Reservation[]) {
  const hours = ["11:00", "13:00", "15:00", "17:00", "19:00", "21:00", "23:00"];
  const counts = hours.map((hour) => {
    const minute = timeToMinutes(hour);
    if (minute === null) {
      return 0;
    }

    return reservations.filter((reservation) => {
      const reservationMinutes = timeToMinutes(reservation.reservationTime);
      return reservationMinutes !== null && Math.floor(reservationMinutes / 60) === Math.floor(minute / 60);
    }).length;
  });

  const max = Math.max(1, ...counts);

  return hours.map<ChartPoint>((hour, index) => ({
    hour,
    value: Math.round((counts[index] / max) * 100),
    highlighted: hour === "19:00",
  }));
}

function MiniIcon({ glyph, tone }: { glyph: string; tone: DashboardMetricTone }) {
  return (
    <span
      className={`inline-flex h-10 w-10 items-center justify-center rounded-full border text-lg shadow-inner shadow-black/30 ${getMetricIconToneClasses(tone)}`}
    >
      {glyph}
    </span>
  );
}

function MetricCard({ card }: { card: DashboardMetricCard }) {
  return (
    <article
      className={`rounded-[1rem] border border-white/10 bg-gradient-to-br px-4 py-3.5 shadow-[0_14px_30px_rgba(0,0,0,0.18)] ${getMetricToneClasses(card.tone)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <MiniIcon glyph={card.icon} tone={card.tone} />
            <p className="text-sm font-medium text-white/95">{card.label}</p>
          </div>
          <div className="flex items-end gap-2">
            <p className="text-[2rem] font-semibold leading-none tracking-tight text-white">
              {card.value}
            </p>
            {typeof card.value === "number" && card.label !== "Próxima reserva" ? (
              <span className="pb-1 text-xs text-slate-400">reservas</span>
            ) : null}
          </div>
        </div>
        <div className="rounded-md border border-white/10 bg-slate-900/55 px-2 py-1 text-[10px] uppercase tracking-[0.18em] text-slate-400">
          {card.footer}
        </div>
      </div>

      <div className="mt-2.5 flex items-center justify-between border-t border-white/10 pt-2 text-[11px] text-slate-300">
        <span>{card.helper}</span>
        <span className="text-cyan-200">{card.actionLabel}</span>
      </div>
    </article>
  );
}

function SectionCard({
  title,
  badge,
  action,
  children,
  className = "",
}: {
  title: string;
  badge?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[0.95rem] border border-white/10 bg-[rgba(10,18,32,0.9)] shadow-[0_18px_36px_rgba(0,0,0,0.18)] backdrop-blur-xl ${className}`}
    >
      <div className="flex items-center justify-between gap-3 border-b border-white/5 px-4 py-3">
        <div className="flex items-center gap-3">
          <h2 className="text-[15px] font-semibold tracking-tight text-white">{title}</h2>
          {badge ? (
            <span className="inline-flex items-center rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[11px] text-slate-300">
              {badge}
            </span>
          ) : null}
        </div>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function StatusBadge({ status }: { status?: Reservation["status"] | FloorTable["status"] }) {
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2.5 py-1 text-[10px] font-medium ${getStatusTone(status)}`}
    >
      {formatStatusLabel(status)}
    </span>
  );
}

function MiniPlan({
  tables,
  href,
  emptyLabel = "Plano no disponible",
}: {
  tables: FloorTable[];
  href: string;
  emptyLabel?: string;
}) {
  const previewTables = tables.length > 0 ? tables : [];

  const bounds = useMemo(() => {
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
  }, [previewTables]);

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
    <SectionCard
      title="Plano del salón"
      badge="Vista compacta"
      action={<span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-300">8 mesas</span>}
      className="h-full"
    >
      <div className="mb-3 flex flex-wrap items-center gap-3 text-[11px] text-slate-300">
        <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-2.5 py-1">
          <span className="h-2 w-2 rounded-full bg-emerald-400" />
          Disponible
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-rose-400/20 bg-rose-400/10 px-2.5 py-1">
          <span className="h-2 w-2 rounded-full bg-rose-400" />
          Ocupada
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-sky-400/20 bg-sky-400/10 px-2.5 py-1">
          <span className="h-2 w-2 rounded-full bg-sky-400" />
          Reservada
        </span>
        <span className="inline-flex items-center gap-2 rounded-full border border-slate-400/20 bg-slate-400/10 px-2.5 py-1">
          <span className="h-2 w-2 rounded-full bg-slate-400" />
          Bloqueada
        </span>
      </div>

      <div className="relative h-[228px] overflow-hidden rounded-[1rem] border border-white/5 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.08),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(59,130,246,0.08),transparent_24%),linear-gradient(180deg,rgba(10,16,29,0.92),rgba(6,11,22,0.98))] p-3">
        <div className="absolute inset-0 opacity-60">
          <div className="absolute left-[4%] top-[8%] h-8 w-8 rounded-full bg-cyan-500/10 blur-xl" />
          <div className="absolute right-[10%] top-[18%] h-12 w-12 rounded-full bg-blue-500/10 blur-2xl" />
          <div className="absolute left-[18%] bottom-[14%] h-10 w-10 rounded-full bg-emerald-500/10 blur-2xl" />
        </div>

        <div className="absolute inset-0 rounded-[1.15rem] border border-white/5" />

        {(bounds ? visibleTables : fallbackTables).map((table) => {
          const normalized = bounds
            ? {
                left: ((table.x - bounds.minX) / bounds.width) * 100,
                top: ((table.y - bounds.minY) / bounds.height) * 100,
                width: Math.max(12, (table.width / bounds.width) * 100),
                height: Math.max(12, (table.height / bounds.height) * 100),
              }
            : {
                left: `${table.x}%`,
                top: `${table.y}%`,
                width: `${table.width}%`,
                height: `${table.height}%`,
              };

          return (
            <div
              key={`${table.label}-${table.x}-${table.y}`}
              className={`absolute rounded-2xl border backdrop-blur-sm ${getStatusTone(table.status)} flex flex-col items-center justify-center gap-0.5 shadow-[0_16px_30px_rgba(0,0,0,0.22)]`}
              style={{
                left: `${normalized.left}%`,
                top: `${normalized.top}%`,
                width: `${normalized.width}%`,
                height: `${normalized.height}%`,
                minWidth: "54px",
                minHeight: "54px",
              }}
            >
              <span className="text-sm font-semibold leading-none text-white">{table.label}</span>
              <span className="text-[10px] uppercase tracking-[0.2em] text-white/70">
                {table.seats} asientos
              </span>
              <span className="text-[10px] font-medium text-white/85">
                {formatStatusLabel(table.status)}
              </span>
            </div>
          );
        })}

        <Link
          href={href}
          className="absolute bottom-3 right-3 rounded-md border border-white/10 bg-slate-900/80 px-3 py-2 text-xs font-medium text-slate-100 transition hover:border-cyan-400/30 hover:bg-slate-800"
        >
          Editar plano
        </Link>

        {tables.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/50 px-4 py-3 text-sm text-slate-300">
              {emptyLabel}
            </div>
          </div>
        ) : null}
      </div>
    </SectionCard>
  );
}

function QuickActionButton({
  action,
}: {
  action: DashboardQuickAction;
}) {
  return (
    <Link
      href={action.href}
      className={`group flex h-full min-h-[56px] flex-col justify-between rounded-[0.85rem] border px-3 py-3 text-left transition ${getActionToneClasses(action.tone)}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg border border-white/10 bg-white/5 text-lg">
          {action.icon}
        </div>
        <span className="text-[15px] font-semibold leading-none text-white/85 transition group-hover:translate-x-0.5">
          →
        </span>
      </div>
      <div>
        <p className="text-sm font-medium text-white">{action.label}</p>
        <p className="mt-1 text-[10px] leading-4 text-slate-300">{action.description}</p>
      </div>
    </Link>
  );
}

export function LocalDashboardPage() {
  const searchParams = useSearchParams();
  const dataSource = getDataSource();
  const businessQuery = getLocalBusinessSlugFromSearchParams(searchParams);
  const isSupportMode = getLocalAccessMode(searchParams) === "support";

  const [isMounted, setIsMounted] = useState(false);
  const [today, setToday] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [reservations, setReservations] = useState<Reservation[]>(dataSource === "local" ? FALLBACK_RESERVATIONS : []);
  const [floorTables, setFloorTables] = useState<FloorTable[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>(dataSource === "local" ? FALLBACK_CUSTOMERS : []);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIsMounted(true);
      setToday(toDateInputValue(new Date()));
      setNow(new Date());
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncBusinesses = async () => {
      const nextBusinesses = await getBusinesses();
      if (!cancelled) {
        setBusinesses(nextBusinesses);
      }
    };

    const timeout = window.setTimeout(() => {
      void syncBusinesses();
    }, 0);
    const unsubscribe = subscribeBusinesses(() => {
      void syncBusinesses();
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const {
    businessWarning,
    selectedBusiness,
  } = useLocalBusinessSelection({
    businesses,
    selectedBusinessId,
    setSelectedBusinessId,
  });

  const activeBusiness = selectedBusiness ?? businesses.find((business) => business.id === selectedBusinessId) ?? null;
  const activeBusinessId = activeBusiness?.id ?? selectedBusinessId;
  const currentBusinessSlug = activeBusiness?.slug ?? businessQuery;
  const currentBusinessLabel = activeBusiness?.name ?? "Negocio";
  const currentBusinessStatusLabel = activeBusiness?.status === "active" ? "Abierto ahora" : "Negocio inactivo";
  const currentBusinessMeta = getBusinessMeta(activeBusiness);

  useEffect(() => {
    let cancelled = false;

    if (!activeBusinessId) {
      setReservations([]);
      setFloorTables([]);
      setServices([]);
      setCustomers([]);
      return;
    }

    const syncReservations = () => {
      setReservations(getReservationsByBusinessId(activeBusinessId));
    };

    const syncFloorTables = () => {
      setFloorTables(getFloorTablesByBusinessId(activeBusinessId));
    };

    const syncCustomers = () => {
      setCustomers(getCustomersByBusinessId(activeBusinessId));
    };

    const syncServices = async () => {
      const nextServices = await getServicesByBusiness(activeBusinessId);
      if (!cancelled) {
        setServices(nextServices);
      }
    };

    const timeout = window.setTimeout(() => {
      setToday(toDateInputValue(new Date()));
      setNow(new Date());
      syncReservations();
      syncFloorTables();
      syncCustomers();
      void syncServices();
    }, 0);

    const unsubscribeReservations = subscribeReservations(syncReservations);
    const unsubscribeFloorPlan = subscribeFloorPlan(syncFloorTables);
    const unsubscribeCRM = subscribeCRM(syncCustomers);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      unsubscribeReservations();
      unsubscribeFloorPlan();
      unsubscribeCRM();
    };
  }, [activeBusinessId]);

  const todayReservations = useMemo(() => {
    if (!today) {
      return [];
    }

    return sortReservationsByTime(
      reservations.filter((reservation) => normalizeDateKey(reservation.reservationDate) === today),
    );
  }, [reservations, today]);

  const businessReservations = useMemo(() => {
    return sortReservationsByTime(reservations);
  }, [reservations]);

  const pendingCount = businessReservations.filter((reservation) => reservation.status === "pending").length;
  const confirmedCount = businessReservations.filter((reservation) => reservation.status === "confirmed").length;
  const cancelledCount = businessReservations.filter((reservation) => reservation.status === "cancelled").length;
  const noShowCount = businessReservations.filter((reservation) => reservation.status === "no_show").length;

  const upcomingReservation = useMemo(() => {
    if (!now) {
      return null;
    }

    const eligible = businessReservations
      .filter((reservation) => reservation.status === "pending" || reservation.status === "confirmed")
      .filter((reservation) => {
        const dateTime = buildDateTimeFromDateAndTime(reservation.reservationDate, reservation.reservationTime);
        return Boolean(dateTime) && dateTime!.getTime() >= now.getTime();
      })
      .sort((left, right) => {
        const leftTime = buildDateTimeFromDateAndTime(left.reservationDate, left.reservationTime)?.getTime() ?? 0;
        const rightTime = buildDateTimeFromDateAndTime(right.reservationDate, right.reservationTime)?.getTime() ?? 0;

        if (leftTime !== rightTime) {
          return leftTime - rightTime;
        }

        return right.updatedAt.localeCompare(left.updatedAt);
      });

    return eligible[0] ?? null;
  }, [businessReservations, now]);

  const totalSeats = useMemo(() => floorTables.reduce((sum, table) => sum + table.seats, 0), [floorTables]);
  const occupiedSeats = useMemo(
    () => floorTables.reduce((sum, table) => sum + (table.status === "available" ? 0 : table.seats), 0),
    [floorTables],
  );
  const occupancyPercent = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;

  const featuredCustomers = useMemo(() => {
    if (customers.length > 0) {
      return [...customers].sort((left, right) => right.totalReservations - left.totalReservations || left.name.localeCompare(right.name)).slice(0, 3);
    }

    return aggregateCustomersFromReservations(businessReservations)
      .slice(0, 3)
      .map((customer, index) => ({
        id: `fallback-${index}`,
        customerKey: `fallback-${index}`,
        businessId: activeBusinessId,
        name: customer.name,
        phone: "Sin telefono",
        email: null,
        totalReservations: customer.visits,
        confirmedReservations: 0,
        cancelledReservations: 0,
        completedReservations: 0,
        noShowReservations: 0,
        lastReservationAt: now ? now.toISOString() : new Date().toISOString(),
        nextReservationAt: null,
        tags: [],
        notes: "",
        preferences: "",
        createdAt: now ? now.toISOString() : new Date().toISOString(),
        updatedAt: now ? now.toISOString() : new Date().toISOString(),
      })) as Customer[];
  }, [activeBusinessId, businessReservations, customers, now]);

  const chartPoints = useMemo(() => {
    const baseValues = [18, 26, 34, 48, 58, 66, 92, 84, 76, 70, 64, 54, 46];
    const points = ["11:00", "12:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00", "19:00", "20:00", "21:00", "22:00", "23:00"].map(
      (hour, index) => {
        const matchingReservations = todayReservations.filter((reservation) => {
          const minutes = timeToMinutes(reservation.reservationTime);
          return minutes !== null && Math.floor(minutes / 60) === Number(hour.slice(0, 2));
        }).length;

        const value = Math.min(
          100,
          Math.max(baseValues[index], baseValues[index] + matchingReservations * 4 + Math.round(occupancyPercent / 6)),
        );

        return {
          hour,
          value,
          highlighted: hour === "19:00",
        };
      },
    );

    return points;
  }, [occupancyPercent, todayReservations]);

  const metricCards = useMemo<DashboardMetricCard[]>(() => {
    const upcomingLabel = upcomingReservation
      ? `${formatTime(upcomingReservation.reservationTime)}`
      : "--:--";

    return [
      {
        label: "Pendientes",
        value: pendingCount,
        helper: "Gestión diaria",
        footer: "Hoy",
        tone: "cyan",
        actionLabel: "Ver todas →",
        icon: "◔",
      },
      {
        label: "Confirmadas",
        value: confirmedCount,
        helper: "Reservas activas",
        footer: "Hoy",
        tone: "emerald",
        actionLabel: "Ver todas →",
        icon: "✓",
      },
      {
        label: "Canceladas",
        value: cancelledCount,
        helper: "Reservas anuladas",
        footer: "Hoy",
        tone: "rose",
        actionLabel: "Ver todas →",
        icon: "✕",
      },
      {
        label: "No-show",
        value: noShowCount,
        helper: "Ausencias del día",
        footer: "Hoy",
        tone: "violet",
        actionLabel: "Ver todas →",
        icon: "◉",
      },
      {
        label: "Próxima reserva",
        value: upcomingLabel,
        helper: upcomingReservation
          ? `${upcomingReservation.customerName} · ${upcomingReservation.partySize} personas`
          : "No hay reservas próximas",
        footer: "Hoy",
        tone: "blue",
        actionLabel: "Ver detalle →",
        icon: "⌚",
      },
      {
        label: "Ocupación de hoy",
        value: `${occupancyPercent}%`,
        helper: `${occupiedSeats} / ${totalSeats} cubiertos`,
        footer: "Hoy",
        tone: "cyan",
        actionLabel: "Ver calendario →",
        icon: "◔",
      },
    ];
  }, [cancelledCount, confirmedCount, noShowCount, occupancyPercent, occupiedSeats, pendingCount, totalSeats, upcomingReservation]);

  const supportBaseParams = isSupportMode ? searchParams.toString() : null;
  const dashboardActionHref = (pathname: string) =>
    isSupportMode
      ? buildLocalAccessHref(pathname, currentBusinessSlug, supportBaseParams, "support")
      : buildLocalBusinessHref(pathname, currentBusinessSlug, supportBaseParams);

  const quickActions: DashboardQuickAction[] = [
    {
      label: "Nueva reserva",
      description: "Abrir la web pública para tomar una reserva.",
      href: dashboardActionHref("/local/reservas"),
      tone: "cyan",
      icon: "+",
    },
    {
      label: "Bloquear mesa",
      description: "Ir al plano y revisar la ocupación.",
      href: dashboardActionHref("/local/plano"),
      tone: "emerald",
      icon: "▣",
    },
    {
      label: "Abrir CRM",
      description: "Revisar clientes, notas e historial.",
      href: dashboardActionHref("/local/crm"),
      tone: "slate",
      icon: "◫",
    },
    {
      label: "Editar web",
      description: "Actualizar contenido público y galería.",
      href: dashboardActionHref("/local/web"),
      tone: "violet",
      icon: "◈",
    },
  ];

  if (!isMounted) {
    return (
      <section className="flex h-full min-h-0 items-start">
        <div className="w-full rounded-[1.6rem] border border-white/10 bg-[rgba(10,18,32,0.86)] px-5 py-6 shadow-[0_30px_80px_rgba(0,0,0,0.26)] backdrop-blur-xl">
          <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/75">Inicio</p>
          <p className="mt-2 text-lg font-semibold text-white">Cargando panel...</p>
          <p className="mt-1 text-[13px] text-slate-400">Preparando negocios, reservas y estado del local.</p>
        </div>
      </section>
    );
  }

  if (businesses.length === 0) {
    return (
      <section className="flex h-full min-h-0 items-start">
        <div className="w-full">
          <LocalNoActiveBusinessesState />
        </div>
      </section>
    );
  }

  if (!activeBusiness) {
    return businessWarning ? <LocalBusinessWarning message={businessWarning} /> : <LocalNoActiveBusinessesState />;
  }

  return (
    <div className="flex min-h-0 flex-col gap-3 pb-6">
      {businessWarning ? <LocalBusinessWarning message={businessWarning} /> : null}

      <section className="px-1 py-1.5">
        <div className="flex flex-col gap-2.5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-1">
            <p className="text-[11px] uppercase tracking-[0.24em] text-slate-400">
              ¡Bienvenido, Mariano!
            </p>
            <div className="flex items-center gap-3">
              <h1 className="text-[1.45rem] font-semibold tracking-tight text-white sm:text-[1.72rem]">
                Operación del local
              </h1>
              <span className="text-cyan-300">✦</span>
            </div>
            <p className="text-[13px] text-slate-400">Resumen en tiempo real de tu restaurante.</p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="inline-flex items-center gap-2 rounded-[0.8rem] border border-white/10 bg-white/[0.04] px-3.5 py-2.25 text-sm text-slate-200">
              <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-slate-500/50 text-[10px] text-slate-400">
                <span className="h-2.5 w-2.5 rounded-full bg-cyan-400" />
              </span>
              {getDayLabel(new Date())}
            </div>
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-[0.85rem] border border-white/10 bg-white/[0.04] px-3 py-2.25 text-sm font-medium text-slate-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
            >
              <span>⚲</span>
              Filtros
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-2.5 md:grid-cols-2 xl:grid-cols-6">
        {metricCards.map((card) => (
          <MetricCard key={card.label} card={card} />
        ))}
      </section>

      <section className="grid min-h-0 grid-cols-1 gap-2.5 xl:grid-cols-[minmax(0,1.45fr)_minmax(340px,1fr)]">
        <SectionCard
          title="Reservas de hoy"
          badge={`${todayReservations.length} en total`}
          action={
            <div className="flex items-center gap-2">
              <button
                type="button"
                className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-200 transition hover:border-cyan-400/30 hover:bg-cyan-400/10"
              >
                Vista: Lista
              </button>
              <Link
                href={dashboardActionHref("/local/reservas")}
                className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-1.5 text-xs font-medium text-cyan-100 transition hover:bg-cyan-400/15"
              >
                + Nueva reserva
              </Link>
            </div>
          }
          className="min-h-[280px]"
        >
          <div className="flex min-h-[210px] flex-col overflow-hidden rounded-[0.95rem] border border-white/5 bg-slate-950/40">
            <div className="grid grid-cols-[82px_minmax(0,1.35fr)_64px_98px_100px_82px_76px] gap-2.5 border-b border-white/5 px-3 py-2.25 text-[10px] uppercase tracking-[0.18em] text-slate-500">
              <span>Hora</span>
              <span>Cliente</span>
              <span>Personas</span>
              <span>Mesa</span>
              <span>Estado</span>
              <span>Canal</span>
              <span>Acciones</span>
            </div>

            <div className="flex-1 overflow-auto">
              {(todayReservations.length > 0 ? todayReservations : businessReservations.slice(0, 5)).map((reservation) => (
                <div
                  key={reservation.id}
                  className="grid grid-cols-[82px_minmax(0,1.35fr)_64px_98px_100px_82px_76px] items-center gap-2.5 border-b border-white/5 px-3 py-2.25 text-[12px] text-slate-200 last:border-b-0"
                >
                  <div className="font-semibold text-white">{formatTime(reservation.reservationTime)}</div>
                  <div className="min-w-0">
                    <div className="truncate font-medium text-white">{reservation.customerName}</div>
                    <div className="truncate text-xs text-slate-400">{reservation.customerPhone || "Sin telefono"}</div>
                  </div>
                  <div className="text-slate-200">{reservation.partySize}</div>
                  <div className="truncate text-slate-200">
                    {reservation.tableLabel || reservation.joinedTableLabel || (reservation.assignedTableIds?.length ? `${reservation.assignedTableIds.length} mesas` : "Sin mesa")}
                  </div>
                  <div>
                    <StatusBadge status={reservation.status} />
                  </div>
                  <div className="text-slate-300">
                    {reservation.source === "web" ? "Web" : reservation.source === "instagram" ? "Instagram" : reservation.source === "whatsapp" ? "WhatsApp" : reservation.source === "manual" ? "Manual" : "Admin"}
                  </div>
                  <div className="flex items-center gap-2 text-slate-400">
                    <button type="button" className="rounded-full border border-white/10 bg-white/5 p-2 transition hover:text-white">
                      ⌁
                    </button>
                    <button type="button" className="rounded-full border border-white/10 bg-white/5 p-2 transition hover:text-white">
                      ✎
                    </button>
                    <button type="button" className="rounded-full border border-white/10 bg-white/5 p-2 transition hover:text-white">
                      ⋯
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="border-t border-white/5 px-3 py-2.25 text-right">
              <Link href={dashboardActionHref("/local/reservas")} className="text-sm text-cyan-200 transition hover:text-cyan-100">
                Ver todas las reservas de hoy →
              </Link>
            </div>
          </div>
        </SectionCard>

        <MiniPlan
          tables={floorTables}
          href={dashboardActionHref("/local/plano")}
        />
      </section>

      <section className="grid min-h-0 grid-cols-1 gap-3 xl:grid-cols-4">
        <SectionCard
          title="Ocupación por franja horaria"
          badge="Hoy"
          action={
            <button
              type="button"
              className="rounded-md border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs text-slate-200"
            >
              Hoy
            </button>
          }
          className="min-h-[172px]"
        >
          <div className="flex h-[132px] flex-col justify-end rounded-[0.95rem] border border-white/5 bg-slate-950/35 px-3 py-3">
            <div className="relative flex h-full items-end gap-2">
              {chartPoints.map((point) => (
                <div key={point.hour} className="relative flex h-full flex-1 flex-col items-center justify-end">
                  {point.highlighted ? (
                    <div className="absolute -top-7 rounded-md border border-white/10 bg-slate-900/90 px-2 py-1 text-[10px] text-slate-200 shadow-lg shadow-black/30">
                      {point.hour} · {point.value}%
                    </div>
                  ) : null}
                  <div
                    className={`w-full rounded-t-xl bg-gradient-to-t from-cyan-500/40 to-blue-400/80 shadow-[0_10px_24px_rgba(34,211,238,0.12)] ${point.highlighted ? "ring-1 ring-cyan-300/50" : ""}`}
                    style={{ height: `${Math.max(10, point.value)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500">
              {chartPoints.map((point) => (
                <span key={point.hour} className="w-full text-center">
                  {point.hour}
                </span>
              ))}
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Actividad reciente" badge="Movimiento" className="min-h-[172px]">
          <div className="flex h-full flex-col gap-3 overflow-auto pr-1">
            {(businessReservations.slice(0, 3).length > 0
              ? businessReservations.slice(0, 3)
              : businessReservations.slice(0, 3)).map((reservation, index) => {
              const tone =
                reservation.status === "confirmed"
                  ? "emerald"
                  : reservation.status === "pending"
                    ? "cyan"
                    : reservation.status === "cancelled"
                      ? "rose"
                      : "violet";

              const icon = reservation.status === "confirmed" ? "✓" : reservation.status === "pending" ? "⌂" : reservation.status === "cancelled" ? "×" : "•";

              return (
                <article key={reservation.id} className="flex items-start gap-3 rounded-[0.9rem] border border-white/5 bg-slate-950/35 p-2.5">
                  <span
                    className={`inline-flex h-9 w-9 items-center justify-center rounded-full border text-sm ${
                      tone === "emerald"
                        ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-100"
                        : tone === "cyan"
                          ? "border-cyan-400/20 bg-cyan-400/10 text-cyan-100"
                          : tone === "rose"
                            ? "border-rose-400/20 bg-rose-400/10 text-rose-100"
                            : "border-violet-400/20 bg-violet-400/10 text-violet-100"
                    }`}
                  >
                    {icon}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-white">
                        {reservation.status === "confirmed"
                          ? "Nueva reserva confirmada"
                          : reservation.status === "pending"
                            ? "Reserva pendiente"
                            : reservation.status === "cancelled"
                              ? "Reserva cancelada"
                              : "Reserva actualizada"}
                      </p>
                      <span className="rounded-full border border-white/10 bg-white/5 px-2 py-1 text-[10px] text-slate-300">
                        {formatRelativeTime(reservation.updatedAt, now)}
                      </span>
                    </div>
                    <p className="mt-1 truncate text-xs text-slate-400">
                      Mesa {reservation.tableLabel || reservation.joinedTableLabel || "sin mesa"} para {reservation.partySize} personas a las {formatTime(reservation.reservationTime)}
                    </p>
                  </div>
                </article>
              );
            })}
          </div>
        </SectionCard>

        <SectionCard title="Clientes destacados" badge="Frecuencia" action={<Link href={dashboardActionHref("/local/crm")} className="text-sm text-cyan-200 transition hover:text-cyan-100">Ver CRM →</Link>} className="min-h-[172px]">
          <div className="flex h-full flex-col gap-3 overflow-auto pr-1">
            {(featuredCustomers.length > 0
              ? featuredCustomers
              : aggregateCustomersFromReservations(businessReservations).slice(0, 3).map((item, index) => ({
                  id: `fallback-${index}`,
                  customerKey: `fallback-${index}`,
                  businessId: activeBusinessId,
                  name: item.name,
                  phone: "",
                  email: null,
                  totalReservations: item.visits,
                  confirmedReservations: 0,
                  cancelledReservations: 0,
                  completedReservations: 0,
                  noShowReservations: 0,
                  lastReservationAt: now ? now.toISOString() : new Date().toISOString(),
                  nextReservationAt: null,
                  tags: [],
                  notes: "",
                  preferences: "",
                  createdAt: now ? now.toISOString() : new Date().toISOString(),
                  updatedAt: now ? now.toISOString() : new Date().toISOString(),
                })) as Customer[])
              .map((customer, index) => (
                <article key={customer.id} className="flex items-center gap-3 rounded-[0.9rem] border border-white/5 bg-slate-950/35 p-2.5">
                  <div className="flex h-9 w-9 items-center justify-center rounded-full bg-slate-900 text-sm font-semibold text-slate-100">
                    {customer.name
                      .split(" ")
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((part) => part[0]?.toUpperCase())
                      .join("") || "C"}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium text-white">{customer.name}</p>
                      <span className="rounded-full border border-cyan-400/20 bg-cyan-400/10 px-2 py-0.5 text-[10px] font-medium text-cyan-100">
                        VIP
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Cliente frecuente · {customer.totalReservations} visitas
                    </p>
                  </div>
                </article>
              ))}
          </div>
        </SectionCard>

        <SectionCard title="Acciones rápidas" badge="Atajos" className="min-h-[172px]">
          <div className="grid h-full grid-cols-2 gap-2">
            {quickActions.map((action) => (
              <QuickActionButton key={action.label} action={action} />
            ))}
          </div>
        </SectionCard>
      </section>

      <div className="mt-auto flex items-center justify-between px-1 pb-0 text-[10px] text-slate-400">
        <span>Tango Reservas</span>
        <span>Version {APP_VERSION}</span>
      </div>
    </div>
  );
}
