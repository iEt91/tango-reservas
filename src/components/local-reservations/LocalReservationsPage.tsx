"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { getBusinesses, subscribeBusinesses } from "@/lib/data/admin-businesses";
import { POSTGRES_UUID_REGEX } from "@/lib/data/business-resolution";
import { getDataSource } from "@/lib/data/dataSource";
import { buildDateTimeFromDateAndTime } from "@/lib/date-time";
import { getServicesByBusiness } from "@/lib/data/services";
import { getFloorTablesByBusinessId, subscribeFloorPlan } from "@/lib/data/floorPlan";
import {
  cancelReservation,
  dedupeReservations,
  getReservationsByBusinessId,
  getReservationTableAvailability,
  resetReservationsForBusiness,
  sortReservationsForLocalPanel,
  subscribeReservations,
  updateReservationStatus,
} from "@/data/reservations";
import { initialReservations } from "@/mocks/reservations";
import type { Business, FloorTable, Reservation, ReservationStatus } from "@/data/types";
import { LocalReservationDetailDrawer } from "@/components/local-reservations/LocalReservationDetailDrawer";
import { ReservationTableAssignmentModal } from "@/components/local-reservations/ReservationTableAssignmentModal";
import { LocalNoActiveBusinessesState } from "@/components/local/LocalNoActiveBusinessesState";
import { initialBusinesses } from "@/mocks/businesses";
import { initialServices } from "@/mocks/scheduling";
import {
  LocalReservationsDashboard,
  type LocalReservationsMetricCard,
} from "@/components/local-reservations/LocalReservationsDashboard";
import { useLocalBusinessSelection } from "@/hooks/useLocalBusinessSelection";
import {
  buildLocalAccessHref,
  buildLocalBusinessHref,
  getLocalBusinessSlugFromSearchParams,
  resolveBusinessForLocalRoute,
  INVALID_LOCAL_BUSINESS_MESSAGE,
} from "@/lib/local-business-routing";

type ReservationScope = ReservationStatus | "all";
type ReservationDateFilter = "all" | "today" | "tomorrow" | "week" | "custom";

type GroupedReservations = {
  date: string;
  label: string;
  items: Reservation[];
};

function cloneReservations(records: Reservation[]) {
  return records.map((reservation) => ({ ...reservation }));
}

function getInitialServicesForBusiness(businessId: string) {
  return initialServices.filter((service) => service.businessId === businessId);
}

function formatReservationTime(value: string) {
  if (!value) {
    return value;
  }

  const [hours, minutes] = value.split(":");
  if (!hours || !minutes) {
    return value;
  }

  return `${hours}:${minutes}`;
}

function toDateInputValue(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function shiftDateInputValue(dateValue: string, days: number) {
  const date = new Date(`${dateValue}T12:00:00`);
  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

function getReservationDateTime(reservation: Reservation) {
  return buildDateTimeFromDateAndTime(reservation.reservationDate, reservation.reservationTime) ?? new Date(0);
}

function formatReservationDateLabel(dateValue: string) {
  const date = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(date.getTime())) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })
    .format(date)
    .replace(/^./, (char) => char.toUpperCase());
}

function filterBySearch(
  reservations: Reservation[],
  query: string,
  serviceNameById?: Map<string, string>,
) {
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) {
    return reservations;
  }

  return reservations.filter((reservation) => {
    const haystack = [
      reservation.customerName,
      reservation.customerPhone,
      reservation.customerEmail ?? "",
      reservation.notes ?? "",
      serviceNameById?.get(reservation.serviceId) ?? "",
    ]
      .join(" ")
      .toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}

function filterByStatus(reservations: Reservation[], status: ReservationScope) {
  if (status === "all") {
    return reservations;
  }

  return reservations.filter((reservation) => reservation.status === status);
}

function filterByDate(
  reservations: Reservation[],
  dateFilter: ReservationDateFilter,
  today: string,
  customDate: string,
) {
  if (dateFilter === "all" || !today) {
    return reservations;
  }

  if (dateFilter === "today") {
    return reservations.filter((reservation) => reservation.reservationDate === today);
  }

  if (dateFilter === "tomorrow") {
    const tomorrow = shiftDateInputValue(today, 1);
    return reservations.filter((reservation) => reservation.reservationDate === tomorrow);
  }

  if (dateFilter === "week") {
    const weekEnd = shiftDateInputValue(today, 6);
    return reservations.filter(
      (reservation) =>
        reservation.reservationDate >= today &&
        reservation.reservationDate <= weekEnd,
    );
  }

  if (dateFilter === "custom") {
    if (!customDate) {
      return [];
    }

    return reservations.filter((reservation) => reservation.reservationDate === customDate);
  }

  return reservations;
}

function groupReservationsByDate(reservations: Reservation[]) {
  const map = new Map<string, Reservation[]>();

  for (const reservation of reservations) {
    const list = map.get(reservation.reservationDate) ?? [];
    list.push(reservation);
    map.set(reservation.reservationDate, list);
  }

  return [...map.entries()]
    .sort(([leftDate], [rightDate]) => leftDate.localeCompare(rightDate))
    .map<GroupedReservations>(([date, items]) => ({
      date,
      label: formatReservationDateLabel(date),
      items,
    }));
}

function getNextReservation(reservations: Reservation[], now: Date | null) {
  if (!now) {
    return null;
  }

  const eligible = reservations
    .filter(
      (reservation) =>
        reservation.status === "pending" || reservation.status === "confirmed",
    )
    .filter((reservation) => getReservationDateTime(reservation).getTime() >= now.getTime())
    .sort((left, right) => {
      const leftTime = getReservationDateTime(left).getTime();
      const rightTime = getReservationDateTime(right).getTime();

      if (leftTime !== rightTime) {
        return leftTime - rightTime;
      }

      return right.createdAt.localeCompare(left.createdAt);
    });

  return eligible[0] ?? null;
}

export function LocalReservationsPage() {
  const [isMounted, setIsMounted] = useState(false);
  const dataSource = getDataSource();
  const [businesses, setBusinesses] = useState<Business[]>(() =>
    dataSource === "local"
      ? initialBusinesses.map((business) => ({ ...business }))
      : [],
  );
  const [reservations, setReservations] = useState<Reservation[]>(() =>
    dataSource === "local"
      ? cloneReservations(dedupeReservations(initialReservations))
      : [],
  );
  const [selectedBusinessId, setSelectedBusinessId] = useState(
    () => (dataSource === "local" ? initialBusinesses[0]?.id ?? "" : ""),
  );
  const [today, setToday] = useState("");
  const [now, setNow] = useState<Date | null>(null);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ReservationScope>("all");
  const [dateFilter, setDateFilter] = useState<ReservationDateFilter>("today");
  const [customDate, setCustomDate] = useState("");
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(
    null,
  );
  const [selectedReservationForAssignmentId, setSelectedReservationForAssignmentId] =
    useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [services, setServices] = useState(() =>
    dataSource === "local" ? getInitialServicesForBusiness(initialBusinesses[0]?.id ?? "") : [],
  );
  const [floorTables, setFloorTables] = useState<FloorTable[]>([]);
  const searchParams = useSearchParams();
  const businessQuery = getLocalBusinessSlugFromSearchParams(searchParams);
  const isSupportMode = searchParams.get("mode") === "support";
  const [resolvedRouteBusiness, setResolvedRouteBusiness] = useState<Business | null>(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setIsMounted(true), 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncRouteBusiness = async () => {
      if (!isSupportMode || !businessQuery) {
        setResolvedRouteBusiness(null);
        return;
      }

      const resolved = await resolveBusinessForLocalRoute(businessQuery);

      if (!cancelled) {
        setResolvedRouteBusiness(resolved);
      }
    };

    const timeout = window.setTimeout(() => {
      void syncRouteBusiness();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [businessQuery, isSupportMode]);

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
    const unsubscribeBusinesses = subscribeBusinesses(() => {
      void syncBusinesses();
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      unsubscribeBusinesses();
    };
  }, []);

  useEffect(() => {
    const syncFloorTables = () => {
      if (!selectedBusinessId) {
        setFloorTables([]);
        return;
      }

      if (dataSource === "supabase" && !POSTGRES_UUID_REGEX.test(selectedBusinessId)) {
        return;
      }

      setFloorTables(getFloorTablesByBusinessId(selectedBusinessId));
    };

    const timeout = window.setTimeout(() => {
      syncFloorTables();
    }, 0);

    const unsubscribeFloorPlan = subscribeFloorPlan(syncFloorTables);

    return () => {
      window.clearTimeout(timeout);
      unsubscribeFloorPlan();
    };
  }, [dataSource, selectedBusinessId]);

  useEffect(() => {
    const syncReservations = () => {
      if (!selectedBusinessId) {
        setReservations([]);
        return;
      }

      if (dataSource === "supabase" && !POSTGRES_UUID_REGEX.test(selectedBusinessId)) {
        return;
      }

      setReservations(getReservationsByBusinessId(selectedBusinessId));
    };

    const syncServices = async () => {
      if (!selectedBusinessId) {
        setServices([]);
        return;
      }

      const nextServices = await getServicesByBusiness(selectedBusinessId);
      setServices(nextServices);
    };
    const timeout = window.setTimeout(() => {
      setToday(toDateInputValue(new Date()));
      setNow(new Date());
      syncReservations();
      void syncServices();
    }, 0);

    const unsubscribe = subscribeReservations(syncReservations);

    return () => {
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, [dataSource, selectedBusinessId]);

  useEffect(() => {
    if (!feedback) {
      return;
    }

    const timeout = window.setTimeout(() => setFeedback(null), 2600);
    return () => window.clearTimeout(timeout);
  }, [feedback]);

  const {
    businessWarning,
    selectedBusiness,
    handleBusinessChange: handleBusinessSelectionChange,
    canChangeBusiness,
    isSelectionReady,
  } = useLocalBusinessSelection({
    businesses,
    selectedBusinessId,
    setSelectedBusinessId,
  });

  const effectiveBusiness = resolvedRouteBusiness ?? selectedBusiness;

  function handleBusinessChange(nextBusinessId: string) {
    setSelectedReservationId(null);
    setSelectedReservationForAssignmentId(null);
    void refreshServices(nextBusinessId);
    handleBusinessSelectionChange(nextBusinessId);
  }

  async function refreshServices(nextBusinessId = selectedBusinessKey) {
    if (!nextBusinessId) {
      setServices([]);
      return;
    }

    const nextServices = await getServicesByBusiness(nextBusinessId);
    setServices(nextServices);
  }

  const serviceNameById = useMemo(
    () => new Map(services.map((service) => [service.id, service.name])),
    [services],
  );
  const tableLabelById = useMemo(
    () => new Map(floorTables.map((table) => [table.id, table.label])),
    [floorTables],
  );

  const selectedBusinessKey = effectiveBusiness?.id ?? "";

  const businessReservations = useMemo(() => {
    if (!selectedBusinessKey) {
      return [];
    }

    return sortReservationsForLocalPanel(
      reservations.filter(
        (reservation) => reservation.businessId === selectedBusinessKey,
      ),
    );
  }, [reservations, selectedBusinessKey]);

  const reservationTableLabelById = useMemo(() => {
    const map = new Map<string, string>();

    for (const reservation of businessReservations) {
      const assignedTableIds = [
        ...(reservation.assignedTableIds ?? []),
        ...(reservation.tableId ? [reservation.tableId] : []),
      ].filter(Boolean);
      const uniqueTableIds = [...new Set(assignedTableIds)];

      const labels = uniqueTableIds
        .map((tableId) => tableLabelById.get(tableId) ?? null)
        .filter((label): label is string => Boolean(label));

      if (labels.length > 1) {
        map.set(reservation.id, labels.join(" + "));
      } else if (labels.length === 1) {
        map.set(reservation.id, labels[0]);
      } else if (reservation.joinedTableLabel || reservation.tableLabel) {
        map.set(
          reservation.id,
          reservation.joinedTableLabel ?? reservation.tableLabel ?? "Sin mesa",
        );
      }
    }

    return map;
  }, [businessReservations, tableLabelById]);

  const filteredReservations = useMemo(() => {
    const bySearch = filterBySearch(businessReservations, search, serviceNameById);
    const byStatus = filterByStatus(bySearch, statusFilter);
    return filterByDate(byStatus, dateFilter, today, customDate);
  }, [businessReservations, search, serviceNameById, statusFilter, dateFilter, today, customDate]);

  const groupedReservations = useMemo(
    () => groupReservationsByDate(filteredReservations),
    [filteredReservations],
  );

  const availabilityByReservationId = useMemo(() => {
    if (!isMounted) {
      return new Map();
    }

    const map = new Map<
      string,
      {
        label: string;
        reason?: string | null;
        tone?: "cyan" | "amber" | "emerald" | "rose" | "slate";
      }
    >();

    for (const reservation of businessReservations) {
      const availability = getReservationTableAvailability(reservation.id);
      if (!availability) {
        continue;
      }

      const hasConflict = availability.validation.errors.length > 0;
      const hasAssignment =
        Boolean(reservation.tableId) || Boolean(reservation.joinedTableId);

      if (hasConflict) {
        map.set(reservation.id, {
          label: "Conflicto de mesa",
          reason: availability.validation.errors[0] ?? "La asignacion necesita revision.",
          tone: "rose",
        });
        continue;
      }

      if (hasAssignment) {
        map.set(reservation.id, {
          label: reservation.joinedTableLabel ?? reservation.tableLabel ?? "Mesa asignada",
          reason: "Asignacion activa",
          tone: "emerald",
        });
        continue;
      }

      if (availability.hasSuggestions) {
        map.set(reservation.id, {
          label: "Tiene sugerencias",
          reason: `${availability.availableTableCount + availability.joinedSuggestions.length} opciones sugeridas`,
          tone: "cyan",
        });
      } else {
        map.set(reservation.id, {
          label: "Sin mesas disponibles",
          reason: "Revisar el horario o liberar mesas.",
          tone: "amber",
        });
      }
    }

    return map;
  }, [businessReservations, isMounted]);

  const metrics = useMemo(() => {
    const pending = businessReservations.filter(
      (reservation) => reservation.status === "pending",
    ).length;
    const confirmed = businessReservations.filter(
      (reservation) => reservation.status === "confirmed",
    ).length;
    const cancelled = businessReservations.filter(
      (reservation) => reservation.status === "cancelled",
    ).length;
    const noShow = businessReservations.filter(
      (reservation) => reservation.status === "no_show",
    ).length;
    const totalToday = today
      ? businessReservations.filter(
          (reservation) => reservation.reservationDate === today,
        ).length
      : 0;
    const nextReservation = getNextReservation(businessReservations, now);
    const occupiedSeats = floorTables.reduce(
      (sum, table) => sum + (table.status === "available" ? 0 : table.seats),
      0,
    );
    const totalSeats = floorTables.reduce((sum, table) => sum + table.seats, 0);
    const occupancyPercent = totalSeats > 0 ? Math.round((occupiedSeats / totalSeats) * 100) : 0;

    return {
      pending,
      confirmed,
      cancelled,
      noShow,
      totalToday,
      nextReservation,
      occupiedSeats,
      totalSeats,
      occupancyPercent,
    };
  }, [businessReservations, floorTables, today, now]);

  const metricCards: LocalReservationsMetricCard[] = [
    { label: "Pendientes", value: metrics.pending, tone: "amber" },
    { label: "Confirmadas", value: metrics.confirmed, tone: "emerald" },
    { label: "Canceladas", value: metrics.cancelled, tone: "rose" },
    { label: "No-show", value: metrics.noShow },
    {
      label: "Proxima reserva",
      value: metrics.nextReservation
        ? `${metrics.nextReservation.reservationDate} ${formatReservationTime(metrics.nextReservation.reservationTime)}`
        : "No hay proximas reservas",
      helper: metrics.nextReservation
        ? `${metrics.nextReservation.customerName} • ${metrics.nextReservation.status}`
        : "Aparecera la reserva pendiente o confirmada mas cercana.",
    },
  ];

  const detailReservation =
    selectedReservationId == null
      ? null
      : businessReservations.find((reservation) => reservation.id === selectedReservationId) ??
        null;

  const assignmentReservation =
    selectedReservationForAssignmentId == null
      ? null
      : businessReservations.find(
          (reservation) => reservation.id === selectedReservationForAssignmentId,
        ) ?? null;

  async function handleChangeStatus(reservationId: string, status: ReservationStatus) {
    if (status === "cancelled") {
      await cancelReservation(reservationId);
      return;
    }

    await updateReservationStatus(reservationId, status);
  }

  function handleClearFilters() {
    setSearch("");
    setStatusFilter("all");
    setDateFilter("today");
    setCustomDate("");
  }

  function handleCloseAssignTable() {
    setSelectedReservationForAssignmentId(null);
  }

  function handleAssignmentComplete(message: string) {
    setFeedback(message);
    setSelectedReservationForAssignmentId(null);
  }

  async function handleClearLocalReservations() {
    if (!selectedBusinessKey) {
      return;
    }

    const confirmed = window.confirm(
      "Esto va a resetear las reservas locales del negocio seleccionado. Queres continuar?",
    );

    if (!confirmed) {
      return;
    }

    try {
      await resetReservationsForBusiness(selectedBusinessKey);
      setSelectedReservationId(null);
      setFeedback("Reservas reiniciadas.");
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No se pudieron reiniciar las reservas.");
    }
  }

  const hasActiveFilters =
    search.trim().length > 0 ||
    statusFilter !== "all" ||
    dateFilter !== "today" ||
    customDate.length > 0;

  const hasActiveBusiness = businesses.some((business) => business.status === "active");
  const shouldWaitForBusiness =
    dataSource === "supabase" &&
    isSupportMode &&
    Boolean(businessQuery) &&
    (!isMounted || businesses.length === 0);
  const isInvalidSupportBusiness =
    dataSource === "supabase" &&
    isSupportMode &&
    Boolean(businessQuery) &&
    businesses.length > 0 &&
    !selectedBusiness &&
    businessWarning === INVALID_LOCAL_BUSINESS_MESSAGE;

  const supportAccessMode = searchParams.get("mode") === "support";
  const quickActionBaseParams = supportAccessMode ? searchParams.toString() : null;
  const quickActions = effectiveBusiness?.slug
    ? [
        {
          label: "Nueva reserva",
          href: `/${effectiveBusiness.slug}`,
          tone: "cyan" as const,
          description: "Abrir la web publica para tomar una reserva.",
        },
        {
          label: "Abrir CRM",
          href: supportAccessMode
            ? buildLocalAccessHref(
                "/local/crm",
                effectiveBusiness.slug,
                quickActionBaseParams,
                "support",
              )
            : buildLocalBusinessHref("/local/crm", effectiveBusiness.slug, quickActionBaseParams),
          tone: "emerald" as const,
          description: "Revisar clientes, notas e historial.",
        },
        {
          label: "Ver plano",
          href: supportAccessMode
            ? buildLocalAccessHref(
                "/local/plano",
                effectiveBusiness.slug,
                quickActionBaseParams,
                "support",
              )
            : buildLocalBusinessHref("/local/plano", effectiveBusiness.slug, quickActionBaseParams),
          tone: "slate" as const,
          description: "Abrir el plano y la ocupacion del salon.",
        },
        {
          label: "Editar web",
          href: supportAccessMode
            ? buildLocalAccessHref(
                "/local/web",
                effectiveBusiness.slug,
                quickActionBaseParams,
                "support",
              )
            : buildLocalBusinessHref("/local/web", effectiveBusiness.slug, quickActionBaseParams),
          tone: "violet" as const,
          description: "Actualizar contenido publico y galeria.",
        },
      ]
    : [];

  if (shouldWaitForBusiness) {
    return (
      <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-300 shadow-2xl shadow-black/20 sm:px-5">
        Cargando negocio y reservas...
      </section>
    );
  }

  if (isInvalidSupportBusiness) {
    return (
      <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-300 shadow-2xl shadow-black/20 sm:px-5">
        <p className="text-base font-semibold text-white">Negocio no encontrado</p>
        <p className="mt-2 leading-6 text-slate-300">
          La ruta existe, pero no encontramos un negocio valido para ese slug.
        </p>
      </section>
    );
  }

  if (isMounted && businesses.length > 0 && !hasActiveBusiness) {
    return <LocalNoActiveBusinessesState />;
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <LocalReservationsDashboard
        business={effectiveBusiness}
        businesses={businesses}
        canChangeBusiness={canChangeBusiness}
        selectedBusinessId={selectedBusinessId}
        onBusinessChange={handleBusinessChange}
        serviceCount={services.length}
        businessWarning={businessWarning}
        metricCards={metricCards}
        search={search}
        statusFilter={statusFilter}
        dateFilter={dateFilter}
        customDate={customDate}
        hasActiveFilters={hasActiveFilters}
        resultsCount={filteredReservations.length}
        onClearFilters={handleClearFilters}
        onClearLocalReservations={
          dataSource === "local" ? handleClearLocalReservations : undefined
        }
        onCustomDateChange={(value) => {
          setCustomDate(value);
          if (value) {
            setDateFilter("custom");
          }
        }}
        onDateFilterChange={(value) => setDateFilter(value as ReservationDateFilter)}
        onSearchChange={setSearch}
        onStatusFilterChange={(value) => setStatusFilter(value as ReservationScope)}
        clearLocalReservationsLabel="Limpiar reservas locales"
        hideClearLocalReservations={dataSource === "supabase"}
        groupedReservations={groupedReservations}
        filteredReservationsCount={filteredReservations.length}
        availabilityByReservationId={availabilityByReservationId}
        serviceNameById={serviceNameById}
        tableLabelByReservationId={reservationTableLabelById}
        onChangeStatus={handleChangeStatus}
        onOpenAssignTable={(reservation) =>
          setSelectedReservationForAssignmentId(reservation.id)
        }
        onOpenDetail={(reservation) => setSelectedReservationId(reservation.id)}
        emptyMessage={
          dataSource === "supabase"
            ? "No hay reservas de Supabase que coincidan con estos filtros."
            : "No hay reservas que coincidan con estos filtros."
        }
        floorTables={floorTables}
        reservations={businessReservations}
        today={today}
        now={now}
        occupancyPercent={metrics.occupancyPercent}
        occupiedSeats={metrics.occupiedSeats}
        totalSeats={metrics.totalSeats}
        quickActions={quickActions}
      />

      <LocalReservationDetailDrawer
        business={effectiveBusiness}
        onClose={() => setSelectedReservationId(null)}
        onOpenAssignTable={(reservation) =>
          setSelectedReservationForAssignmentId(reservation.id)
        }
        reservation={detailReservation}
        tableLabel={
          detailReservation
            ? reservationTableLabelById.get(detailReservation.id) ??
              detailReservation.joinedTableLabel ??
              detailReservation.tableLabel ??
              "Sin mesa"
            : "Sin mesa"
        }
        serviceName={
          detailReservation ? serviceNameById.get(detailReservation.serviceId) ?? null : null
        }
      />

      <ReservationTableAssignmentModal
        key={assignmentReservation?.id ?? "reservation-table-assignment-closed"}
        open={Boolean(assignmentReservation)}
        reservation={assignmentReservation}
        onAssigned={handleAssignmentComplete}
        onClose={handleCloseAssignTable}
      />

      {feedback ? (
        <div className="fixed bottom-5 left-1/2 z-50 -translate-x-1/2 rounded-full border border-cyan-400/20 bg-slate-950 px-4 py-2 text-sm text-cyan-100 shadow-2xl shadow-black/40">
          {feedback}
        </div>
      ) : null}
    </section>
  );
}
