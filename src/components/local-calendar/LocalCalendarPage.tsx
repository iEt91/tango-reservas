"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { LocalReservationDetailDrawer } from "@/components/local-reservations/LocalReservationDetailDrawer";
import { getBusinesses, subscribeBusinesses } from "@/lib/data/admin-businesses";
import { POSTGRES_UUID_REGEX } from "@/lib/data/business-resolution";
import { getDataSource } from "@/lib/data/dataSource";
import { getServicesByBusiness } from "@/lib/data/services";
import { getBusinessHours, getReservationRules } from "@/data/scheduling";
import type { Business, Reservation } from "@/data/types";
import { initialBusinessHours, initialReservationRules } from "@/mocks/scheduling";
import { initialBusinesses } from "@/mocks/businesses";
import { initialReservations } from "@/mocks/reservations";
import { initialServices } from "@/mocks/scheduling";
import {
  cancelReservation,
  getReservationsByBusinessId,
  sortReservationsForLocalPanel,
  subscribeReservations,
  updateReservationStatus,
} from "@/data/reservations";
import {
  buildDaySchedule,
  buildWeekSchedule,
  getCalendarStats,
  hasActiveCalendarFilters,
  toDateInputValue,
  type CalendarServiceFilter,
  type CalendarStatusFilter,
  type CalendarViewMode,
} from "@/lib/calendar";
import { CalendarFilters } from "@/components/local-calendar/CalendarFilters";
import { LocalCalendarControls } from "@/components/local-calendar/LocalCalendarControls";
import { LocalCalendarHeader } from "@/components/local-calendar/LocalCalendarHeader";
import { LocalDayView } from "@/components/local-calendar/LocalDayView";
import { LocalWeekView } from "@/components/local-calendar/LocalWeekView";
import { LocalBusinessWarning } from "@/components/local/LocalBusinessWarning";
import { LocalNoActiveBusinessesState } from "@/components/local/LocalNoActiveBusinessesState";
import { useLocalBusinessSelection } from "@/hooks/useLocalBusinessSelection";
import {
  getLocalBusinessSlugFromSearchParams,
  resolveBusinessForLocalRoute,
} from "@/lib/local-business-routing";

function cloneBusinesses(records: Business[]) {
  return records.map((business) => ({ ...business }));
}

function cloneReservations(records: Reservation[]) {
  return records.map((reservation) => ({ ...reservation }));
}

function getInitialServicesForBusiness(businessId: string) {
  return initialServices.filter((service) => service.businessId === businessId);
}

function getInitialHoursForBusiness(businessId: string) {
  return initialBusinessHours
    .filter((entry) => entry.businessId === businessId)
    .map((entry) => ({ ...entry }));
}

function getInitialRulesForBusiness(businessId: string) {
  const rule = initialReservationRules.find((entry) => entry.businessId === businessId);
  return rule ? { ...rule } : null;
}

function getSchedulingBusinessIdForCurrentBusiness(business: Business | null, dataSource: string) {
  if (!business) {
    return "";
  }

  if (dataSource !== "supabase") {
    return business.id;
  }

  return initialBusinesses.find((entry) => entry.slug === business.slug)?.id ?? business.id;
}

function getWeekSummaryLabel(daySchedules: ReturnType<typeof buildWeekSchedule>["daySchedules"]) {
  const entries = daySchedules
    .map((daySchedule) => ({
      label: daySchedule.label,
      count: daySchedule.slots.reduce(
        (total, slot) => total + slot.reservations.length,
        0,
      ),
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));

  return entries[0] ?? null;
}

type SummaryCard = {
  label: string;
  value: number | string;
  helper?: string;
  tone?: "cyan" | "emerald" | "amber" | "rose" | "slate";
};

function SummaryStrip({ cards }: { cards: SummaryCard[] }) {
  if (cards.length === 0) {
    return null;
  }

  return (
    <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
      {cards.map((card) => (
        <article
          key={card.label}
          className="rounded-[1.2rem] border border-white/10 bg-white/5 px-4 py-3 shadow-2xl shadow-black/20"
        >
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
            {card.label}
          </p>
          <p
            className={`mt-1 text-lg font-semibold tracking-tight ${
              card.tone === "emerald"
                ? "text-emerald-100"
                : card.tone === "amber"
                  ? "text-amber-100"
                  : card.tone === "rose"
                    ? "text-rose-100"
                    : card.tone === "cyan"
                      ? "text-cyan-100"
                      : "text-white"
            }`}
          >
            {card.value}
          </p>
          {card.helper ? (
            <p className="mt-1 text-[11px] leading-5 text-slate-400">{card.helper}</p>
          ) : null}
        </article>
      ))}
    </section>
  );
}

export function LocalCalendarPage() {
  const [isMounted, setIsMounted] = useState(false);
  const dataSource = getDataSource();
  const searchParams = useSearchParams();
  const businessQuery = getLocalBusinessSlugFromSearchParams(searchParams);
  const isSupportMode = searchParams.get("mode") === "support";
  const [businesses, setBusinesses] = useState<Business[]>(() =>
    dataSource === "local" ? cloneBusinesses(initialBusinesses) : [],
  );
  const [reservations, setReservations] = useState<Reservation[]>(() =>
    dataSource === "local" ? cloneReservations(initialReservations) : [],
  );
  const [selectedBusinessId, setSelectedBusinessId] = useState(
    () => (dataSource === "local" ? initialBusinesses[0]?.id ?? "" : ""),
  );
  const [currentDateValue, setCurrentDateValue] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [viewMode, setViewMode] = useState<CalendarViewMode>("day");
  const [statusFilter, setStatusFilter] = useState<CalendarStatusFilter>("all");
  const [serviceFilter, setServiceFilter] = useState<CalendarServiceFilter>("all");
  const [search, setSearch] = useState("");
  const [selectedReservationId, setSelectedReservationId] = useState<string | null>(
    null,
  );
  const [hours, setHours] = useState(() =>
    getInitialHoursForBusiness(initialBusinesses[0]?.id ?? ""),
  );
  const [rules, setRules] = useState(() =>
    getInitialRulesForBusiness(initialBusinesses[0]?.id ?? ""),
  );
  const [services, setServices] = useState(() =>
    dataSource === "local" ? getInitialServicesForBusiness(initialBusinesses[0]?.id ?? "") : [],
  );
  const [resolvedRouteBusiness, setResolvedRouteBusiness] = useState<Business | null>(null);
  const [isResolvingRouteBusiness, setIsResolvingRouteBusiness] = useState(false);
  const selectedBusiness =
    businesses.find((business) => business.id === selectedBusinessId) ?? null;
  const effectiveBusiness = isSupportMode
    ? selectedBusiness ?? resolvedRouteBusiness ?? null
    : selectedBusiness;
  const effectiveBusinessId = effectiveBusiness?.id ?? "";

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setIsMounted(true);
      const today = toDateInputValue(new Date());
      setCurrentDateValue(today);
      setSelectedDate(today);
    }, 0);

    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!isSupportMode) {
      setResolvedRouteBusiness(null);
      setIsResolvingRouteBusiness(false);
      return;
    }

    let cancelled = false;

    const syncBusinesses = async () => {
      const nextBusinesses = await getBusinesses();

      if (!cancelled) {
        setBusinesses(nextBusinesses);
      }
    };

    const timeout = window.setTimeout(syncBusinesses, 0);
    const unsubscribeBusinesses = subscribeBusinesses(syncBusinesses);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      unsubscribeBusinesses();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncReservations = async () => {
      if (!effectiveBusinessId) {
        setReservations([]);
        return;
      }

      if (dataSource === "supabase" && !POSTGRES_UUID_REGEX.test(effectiveBusinessId)) {
        return;
      }

      const nextReservations = getReservationsByBusinessId(effectiveBusinessId);

      if (!cancelled) {
        setReservations(nextReservations);
      }
    };

    const timeout = window.setTimeout(syncReservations, 0);
    const unsubscribe = subscribeReservations(syncReservations);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, [dataSource, effectiveBusinessId]);

  useEffect(() => {
    if (!effectiveBusinessId) {
      return;
    }

    let cancelled = false;

    const timeout = window.setTimeout(() => {
      setHours(getBusinessHours(effectiveBusinessId));
      setRules(getReservationRules(effectiveBusinessId));
      void getServicesByBusiness(effectiveBusinessId).then((nextServices) => {
        if (!cancelled) {
          setServices(nextServices);
        }
      });
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [effectiveBusinessId]);

  useEffect(() => {
    let cancelled = false;

    const syncResolvedRouteBusiness = async () => {
      setIsResolvingRouteBusiness(true);
      const resolved = await resolveBusinessForLocalRoute(businessQuery, businesses);

      if (!cancelled) {
        setResolvedRouteBusiness(resolved);
        setIsResolvingRouteBusiness(false);
      }
    };

    const timeout = window.setTimeout(() => {
      void syncResolvedRouteBusiness();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [businessQuery, businesses, isSupportMode]);

  const {
    businessWarning,
    handleBusinessChange: handleBusinessSelectionChange,
    canChangeBusiness,
    isSelectionReady,
  } = useLocalBusinessSelection({
    businesses,
    selectedBusinessId,
    setSelectedBusinessId,
  });

  const selectedBusinessKey = effectiveBusiness?.id ?? "";

  const serviceNameById = useMemo(() => {
    return new Map(services.map((service) => [service.id, service.name]));
  }, [services]);

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

  const calendarFilters = useMemo(
    () => ({
      status: statusFilter,
      serviceId: serviceFilter,
      search,
    }),
    [search, serviceFilter, statusFilter],
  );

  const activeCalendarFilters = hasActiveCalendarFilters(calendarFilters);

  const daySchedule = useMemo(() => {
    if (
      !rules ||
      !selectedDate ||
      !selectedBusinessKey ||
      (dataSource === "supabase" && !POSTGRES_UUID_REGEX.test(selectedBusinessKey))
    ) {
      return null;
    }

    return buildDaySchedule({
      businessId: selectedBusinessKey,
      dateValue: selectedDate,
      hours,
      reservations: businessReservations,
      rules,
      filters: calendarFilters,
      serviceNameById,
    });
  }, [
    businessReservations,
    calendarFilters,
    hours,
    rules,
    selectedBusinessKey,
    selectedDate,
    serviceNameById,
  ]);

  const weekSchedule = useMemo(() => {
    if (
      !rules ||
      !selectedDate ||
      !selectedBusinessKey ||
      (dataSource === "supabase" && !POSTGRES_UUID_REGEX.test(selectedBusinessKey))
    ) {
      return null;
    }

    return buildWeekSchedule({
      businessId: selectedBusinessKey,
      anchorDateValue: selectedDate,
      hours,
      reservations: businessReservations,
      rules,
      filters: calendarFilters,
      serviceNameById,
    });
  }, [
    businessReservations,
    calendarFilters,
    hours,
    rules,
    selectedBusinessKey,
    selectedDate,
    serviceNameById,
  ]);

  const visibleDaySchedule = useMemo(() => {
    if (!daySchedule) {
      return null;
    }

    if (!activeCalendarFilters) {
      return daySchedule;
    }

    const visibleSlots = daySchedule.slots.filter(
      (slot) => slot.reservations.length > 0,
    );

    return {
      ...daySchedule,
      slots: visibleSlots,
      message:
          visibleSlots.length === 0
          ? "No hay reservas que coincidan con estos filtros. Probá cambiando la búsqueda, el estado o el servicio."
          : daySchedule.message,
    };
  }, [activeCalendarFilters, daySchedule]);

  const visibleWeekSchedule = useMemo(() => {
    if (!weekSchedule) {
      return null;
    }

    if (!activeCalendarFilters) {
      return weekSchedule;
    }

    const daySchedules = weekSchedule.daySchedules.map((dayScheduleItem) => {
      const visibleSlots = dayScheduleItem.slots.filter(
        (slot) => slot.reservations.length > 0,
      );

      return {
        ...dayScheduleItem,
        slots: visibleSlots,
        message:
          visibleSlots.length === 0
            ? "No hay reservas que coincidan con estos filtros. Probá cambiando la búsqueda, el estado o el servicio."
            : dayScheduleItem.message,
      };
    });

    const slotTimes = [...new Set(daySchedules.flatMap((day) => day.slots.map((slot) => slot.time)))];

    return {
      ...weekSchedule,
      daySchedules,
      slotTimes,
    };
  }, [activeCalendarFilters, weekSchedule]);

  const visibleReservationCount = useMemo(() => {
    if (viewMode === "day") {
      return visibleDaySchedule
        ? visibleDaySchedule.slots.reduce(
            (total, slot) => total + slot.reservations.length,
            0,
          )
        : 0;
    }

    return visibleWeekSchedule
      ? visibleWeekSchedule.daySchedules.reduce(
          (total, dayScheduleItem) =>
            total +
            dayScheduleItem.slots.reduce(
              (slotTotal, slot) => slotTotal + slot.reservations.length,
              0,
            ),
          0,
        )
      : 0;
  }, [viewMode, visibleDaySchedule, visibleWeekSchedule]);

  const detailReservation =
    selectedReservationId == null
      ? null
      : businessReservations.find((reservation) => reservation.id === selectedReservationId) ??
        null;

  const daySummary = useMemo(() => {
    if (!daySchedule?.isOpen) {
      return null;
    }

    const reservationsForDay = daySchedule.slots.flatMap((slot) => slot.reservations);
    const stats = getCalendarStats(reservationsForDay);

    return [
      {
        label: "Total reservas",
        value: stats.totalReservations,
        tone: "cyan" as const,
      },
      {
        label: "Pendientes",
        value: stats.pending,
        tone: "amber" as const,
      },
      {
        label: "Confirmadas",
        value: stats.confirmed,
        tone: "emerald" as const,
      },
      {
        label: "Sin mesa",
        value: stats.withoutTableCount,
        tone: "rose" as const,
      },
      {
        label: "Personas totales",
        value: stats.peopleTotal,
      },
      {
        label: "Completadas",
        value: stats.completed,
      },
      {
        label: "Canceladas",
        value: stats.cancelled,
      },
      {
        label: "No-show",
        value: stats.noShow,
      },
    ] satisfies SummaryCard[];
  }, [daySchedule]);

  const weekSummary = useMemo(() => {
    if (!weekSchedule) {
      return null;
    }

    const reservationsForWeek = weekSchedule.daySchedules.flatMap((daySchedule) =>
      daySchedule.slots.flatMap((slot) => slot.reservations),
    );
    const stats = getCalendarStats(reservationsForWeek);
    const topDay = getWeekSummaryLabel(weekSchedule.daySchedules);

    return [
      {
        label: "Total semana",
        value: stats.totalReservations,
        tone: "cyan" as const,
      },
      {
        label: "Dia con mas reservas",
        value: topDay ? topDay.label : "Sin datos",
        helper: topDay ? `${topDay.count} reservas` : "No hay reservas en la semana.",
      },
      {
        label: "Pendientes",
        value: stats.pending,
        tone: "amber" as const,
      },
      {
        label: "Confirmadas",
        value: stats.confirmed,
        tone: "emerald" as const,
      },
      {
        label: "Sin mesa",
        value: stats.withoutTableCount,
        tone: "rose" as const,
      },
      {
        label: "Personas totales",
        value: stats.peopleTotal,
      },
    ] satisfies SummaryCard[];
  }, [weekSchedule]);

  function handleBusinessChange(nextBusinessId: string) {
    const nextBusiness =
      businesses.find((business) => business.id === nextBusinessId) ?? null;
    const nextSchedulingBusinessId = getSchedulingBusinessIdForCurrentBusiness(
      nextBusiness,
      dataSource,
    );

    setSelectedReservationId(null);
    setServiceFilter("all");
    setHours(getBusinessHours(nextSchedulingBusinessId));
    setRules(getReservationRules(nextSchedulingBusinessId));
    void getServicesByBusiness(nextBusinessId).then((nextServices) => {
      setServices(nextServices);
    });
    handleBusinessSelectionChange(nextBusinessId);
  }

  function handleDateChange(nextDate: string) {
    setSelectedDate(nextDate);
  }

  function handleViewModeChange(nextViewMode: CalendarViewMode) {
    setViewMode(nextViewMode);
  }

  function handleReservationOpen(reservation: Reservation) {
    setSelectedReservationId(reservation.id);
  }

  function handleCloseDetail() {
    setSelectedReservationId(null);
  }

  function handleServiceFilterChange(nextServiceId: CalendarServiceFilter) {
    setServiceFilter(nextServiceId);
  }

  function handleStatusFilterChange(nextStatus: CalendarStatusFilter) {
    setStatusFilter(nextStatus);
  }

  async function handleChangeStatus(reservationId: string, status: Reservation["status"]) {
    if (status === "cancelled") {
      await cancelReservation(reservationId);
      return;
    }

    await updateReservationStatus(reservationId, status);
  }

  const hasActiveBusiness = businesses.some((business) => business.status === "active");

  if (isMounted && businesses.length > 0 && !hasActiveBusiness) {
    return <LocalNoActiveBusinessesState />;
  }

  const shouldWaitForBusiness =
    dataSource === "supabase" &&
    (!isSelectionReady || (canChangeBusiness && isResolvingRouteBusiness));

  if (shouldWaitForBusiness) {
    return (
      <section className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-300 shadow-2xl shadow-black/20 sm:px-5">
        Cargando negocio y calendario...
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <LocalCalendarHeader
        business={effectiveBusiness}
        businesses={businesses}
        canChangeBusiness={canChangeBusiness}
        dataSourceLabel={dataSource === "supabase" ? "Supabase" : "local/mock"}
        onBusinessChange={handleBusinessChange}
        selectedBusinessId={selectedBusinessId}
        serviceCount={services.length}
      />

      <LocalBusinessWarning message={businessWarning} />

      {!isMounted || !selectedDate ? (
        <section className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-300 shadow-2xl shadow-black/20 sm:px-5">
          Cargando calendario...
        </section>
      ) : (
        <>
          <SummaryStrip cards={viewMode === "day" ? daySummary ?? [] : weekSummary ?? []} />

          <LocalCalendarControls
            currentDateValue={currentDateValue}
            onDateChange={handleDateChange}
            onViewModeChange={handleViewModeChange}
            selectedDate={selectedDate}
            viewMode={viewMode}
          />

          <CalendarFilters
            search={search}
            serviceFilter={serviceFilter}
            services={services}
            statusFilter={statusFilter}
            visibleReservationCount={visibleReservationCount}
            onSearchChange={setSearch}
            onServiceFilterChange={handleServiceFilterChange}
            onStatusFilterChange={handleStatusFilterChange}
          />

          {viewMode === "day" ? (
            visibleDaySchedule ? (
              <LocalDayView
                daySchedule={visibleDaySchedule}
                onChangeStatus={handleChangeStatus}
                onOpenDetail={handleReservationOpen}
                serviceNameById={serviceNameById}
                showOnlySlotsWithReservations={activeCalendarFilters}
              />
            ) : (
              <section className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-300 shadow-2xl shadow-black/20 sm:px-5">
                Todavia no hay configuracion de horarios para mostrar.
              </section>
            )
          ) : visibleWeekSchedule ? (
            <LocalWeekView
              daySchedules={visibleWeekSchedule.daySchedules}
              onChangeStatus={handleChangeStatus}
              onOpenDetail={handleReservationOpen}
              serviceNameById={serviceNameById}
              showOnlySlotsWithReservations={activeCalendarFilters}
              slotTimes={visibleWeekSchedule.slotTimes}
              weekLabel={visibleWeekSchedule.label}
            />
          ) : (
            <section className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-300 shadow-2xl shadow-black/20 sm:px-5">
              Todavia no hay configuracion de horarios para mostrar.
            </section>
          )}

          <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-3 text-xs text-slate-400 shadow-2xl shadow-black/20 sm:px-5">
            Mostrando {viewMode === "day" ? "dia" : "semana"} con filtros de estado,
            busqueda y servicio. El calendario comparte la misma capa de datos que
            Reservas y Plano.
          </section>
        </>
      )}

      <LocalReservationDetailDrawer
        business={effectiveBusiness}
        onChangeStatus={handleChangeStatus}
        onClose={handleCloseDetail}
        reservation={detailReservation}
        tableLabel={
          detailReservation
            ? detailReservation.joinedTableLabel ??
              detailReservation.tableLabel ??
              "Sin mesa"
            : "Sin mesa"
        }
        serviceName={
          detailReservation
            ? serviceNameById.get(detailReservation.serviceId) ?? null
            : null
        }
      />
    </section>
  );
}
