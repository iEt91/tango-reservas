import type {
  Customer,
  Reservation,
  Service,
} from "@/data/types";
import type {
  CustomerReportStats,
  ReportData,
  ReportDateRange,
  ReportPeriod,
  TableReportStats,
  TimeSlotReportStat,
} from "@/lib/reports";
import {
  buildReportDateRange,
  getOperationalAlerts,
  getReportReservations,
  getReportStats,
  getServiceStats,
  getWeekdayStats,
} from "@/lib/reports";
import { classifyCustomer } from "@/lib/data/crm";
import {
  getSupabaseCustomersByBusinessSync,
} from "@/lib/data/supabase/customers";
import {
  getSupabaseReservationsByBusinessSync,
} from "@/lib/data/supabase/reservations";
import {
  getSupabaseServicesByBusinessSync,
} from "@/lib/data/supabase/services";

type ReportFilters = {
  range?: ReportDateRange;
  period?: ReportPeriod;
  customFrom?: string;
  customTo?: string;
  now?: Date;
};

type TimeSlotAccumulator = {
  time: string;
  reservations: number;
  people: number;
  revenue: number;
  serviceCounts: Map<string, number>;
  reservationsWithoutTable: number;
  conflicts: number;
};

type CustomerReportItem = {
  id: string;
  customerKey: string;
  businessId: string;
  name: string;
  phone: string;
  email?: string | null;
  totalReservations: number;
  confirmedReservations: number;
  cancelledReservations: number;
  completedReservations: number;
  noShowReservations: number;
  lastReservationAt: string;
  nextReservationAt?: string | null;
  tags: string[];
  notes: string;
  preferences: string;
  createdAt: string;
  updatedAt: string;
  commercialState: ReturnType<typeof classifyCustomer>;
  peopleTotal: number;
  estimatedSpend: number;
};

function isActiveReservation(reservation: Reservation) {
  return reservation.status === "pending" || reservation.status === "confirmed" || reservation.status === "completed";
}

function parseAssignedTableIds(value: unknown) {
  if (Array.isArray(value)) {
    return [...new Set(value.map((entry) => String(entry).trim()).filter(Boolean))];
  }

  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) {
      return [];
    }

    try {
      const parsed = JSON.parse(trimmed);
      if (Array.isArray(parsed)) {
        return [...new Set(parsed.map((entry) => String(entry).trim()).filter(Boolean))];
      }
    } catch {
      return [];
    }
  }

  return [];
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function hasAssignedTable(reservation: Reservation) {
  if (reservation.tableId || reservation.joinedTableId) {
    return true;
  }

  return parseAssignedTableIds((reservation as { assignedTableIds?: unknown }).assignedTableIds).length > 0;
}

function getReservationServicePrice(serviceId: string, services: Service[]) {
  return services.find((service) => service.id === serviceId)?.price ?? null;
}

function getReportRange(filters: ReportFilters) {
  if (filters.range) {
    return filters.range;
  }

  return buildReportDateRange(filters.period ?? "30d", filters.now ?? new Date(), filters.customFrom ?? "", filters.customTo ?? "");
}

function getSafeTimeValue(value?: string | null) {
  if (!value) {
    return 0;
  }

  const time = new Date(value).getTime();
  return Number.isNaN(time) ? 0 : time;
}

function buildTimeSlotStats(reservations: Reservation[], services: Service[]) {
  const map = new Map<string, TimeSlotAccumulator>();

  for (const reservation of reservations) {
    const entry =
      map.get(reservation.reservationTime) ??
      ({
        time: reservation.reservationTime,
        reservations: 0,
        people: 0,
        revenue: 0,
        serviceCounts: new Map<string, number>(),
        reservationsWithoutTable: 0,
        conflicts: 0,
      } satisfies TimeSlotAccumulator);

    entry.reservations += 1;
    entry.people += reservation.partySize;

    if (isActiveReservation(reservation)) {
      const price = getReservationServicePrice(reservation.serviceId, services);
      entry.revenue += typeof price === "number" ? price : 0;
    }

    entry.serviceCounts.set(reservation.serviceId, (entry.serviceCounts.get(reservation.serviceId) ?? 0) + 1);

    if (isActiveReservation(reservation) && !hasAssignedTable(reservation)) {
      entry.reservationsWithoutTable += 1;
    }

    map.set(reservation.reservationTime, entry);
  }

  return [...map.values()]
    .map<TimeSlotReportStat>((entry) => {
      const topService = [...entry.serviceCounts.entries()].sort(
        ([leftServiceId, leftCount], [rightServiceId, rightCount]) => {
          if (leftCount !== rightCount) {
            return rightCount - leftCount;
          }

          const leftName =
            services.find((service) => service.id === leftServiceId)?.name ?? leftServiceId;
          const rightName =
            services.find((service) => service.id === rightServiceId)?.name ?? rightServiceId;
          return leftName.localeCompare(rightName);
        },
      )[0];

      return {
        time: entry.time,
        reservations: entry.reservations,
        people: entry.people,
        revenue: entry.revenue,
        occupancyRate: 0,
        serviceName: topService
          ? services.find((service) => service.id === topService[0])?.name ?? "Servicio eliminado"
          : null,
        serviceReservations: topService?.[1] ?? 0,
        reservationsWithoutTable: entry.reservationsWithoutTable,
        conflicts: entry.conflicts,
      };
    })
    .filter((entry) => entry.reservations > 0)
    .sort(
      (left, right) =>
        right.reservations - left.reservations ||
        right.people - left.people ||
        left.time.localeCompare(right.time),
    );
}

function buildCustomerReportStats(
  customers: Customer[],
  reservations: Reservation[],
  services: Service[],
  _now: Date,
): CustomerReportStats {
  const serviceMap = new Map(services.map((service) => [service.id, service]));

  const customerList = customers.map<CustomerReportItem>((customer) => {
    const customerPhone = normalizePhone(customer.phone);
    const customerEmail = customer.email?.trim().toLowerCase() ?? "";
    const customerReservations = reservations.filter((reservation) => {
      if (reservation.businessId !== customer.businessId) {
        return false;
      }

      if (reservation.customerId && reservation.customerId === customer.id) {
        return true;
      }

      const reservationPhone = normalizePhone(reservation.customerPhone);
      if (reservationPhone && customerPhone) {
        return reservationPhone === customerPhone;
      }

      if (customerEmail) {
        return reservation.customerEmail?.trim().toLowerCase() === customerEmail;
      }

      return false;
    });

    const estimatedSpend = customerReservations.reduce((total, reservation) => {
      if (!isActiveReservation(reservation)) {
        return total;
      }

      const price = serviceMap.get(reservation.serviceId)?.price;
      return total + (typeof price === "number" ? price : 0);
    }, 0);

    return {
      ...customer,
      commercialState: classifyCustomer(customer),
      peopleTotal: customerReservations.reduce((total, reservation) => total + reservation.partySize, 0),
      estimatedSpend,
    };
  });

  const latestCustomer = [...customerList].sort(
    (left, right) =>
      getSafeTimeValue(right.lastReservationAt) - getSafeTimeValue(left.lastReservationAt) ||
      right.totalReservations - left.totalReservations ||
      left.name.localeCompare(right.name),
  )[0] ?? null;

  const nextCustomer =
    [...customerList]
      .filter((customer) => customer.nextReservationAt)
      .sort(
        (left, right) =>
          getSafeTimeValue(left.nextReservationAt) - getSafeTimeValue(right.nextReservationAt) ||
          left.name.localeCompare(right.name),
      )[0] ?? null;

  const topByReservations = [...customerList].sort(
    (left, right) =>
      right.totalReservations - left.totalReservations || left.name.localeCompare(right.name),
  );
  const topByPeople = [...customerList].sort(
    (left, right) => right.peopleTotal - left.peopleTotal || left.name.localeCompare(right.name),
  );
  const topBySpend = [...customerList].sort(
    (left, right) =>
      right.estimatedSpend - left.estimatedSpend || left.name.localeCompare(right.name),
  );

  return {
    totalCustomers: customerList.length,
    recurringCustomers: customerList.filter((customer) => customer.totalReservations >= 2).length,
    vipCustomers: customerList.filter((customer) => customer.commercialState.key === "vip").length,
    riskCustomers: customerList.filter((customer) => customer.commercialState.key === "risk").length,
    noShowCustomers: customerList.filter((customer) => customer.noShowReservations > 0).length,
    cancelationCustomers: customerList.filter((customer) => customer.cancelledReservations > 0).length,
    latestCustomer,
    nextCustomer,
    customerList,
    topByReservations,
    topByPeople,
    topBySpend,
  } as CustomerReportStats;
}

function buildEmptyTableStats(reservationsWithoutTable: number): TableReportStats {
  return {
    totalTables: 0,
    totalSeats: 0,
    availableTables: 0,
    occupiedTables: 0,
    reservedTables: 0,
    blockedTables: 0,
    outOfServiceTables: 0,
    reservationsWithoutTable,
    conflictCount: 0,
    capacityPotential: 0,
    capacityOccupied: 0,
    occupancyRate: 0,
    mostUsedTables: [],
  };
}

export function getSupabaseReservationsForReport(businessId: string, range: ReportDateRange) {
  const reservations = getSupabaseReservationsByBusinessSync(businessId);
  return getReportReservations(reservations, range, businessId);
}

export function getSupabaseServicesForReport(businessId: string) {
  return getSupabaseServicesByBusinessSync(businessId);
}

export function getSupabaseCustomersForReport(businessId: string) {
  return getSupabaseCustomersByBusinessSync(businessId);
}

export function getSupabaseReportDataByBusiness(
  businessId: string,
  filters: ReportFilters = {},
): ReportData {
  const range = getReportRange(filters);
  const now = filters.now ?? new Date();

  const reservations = getSupabaseReservationsByBusinessSync(businessId);
  const services = getSupabaseServicesByBusinessSync(businessId);
  const customers = getSupabaseCustomersByBusinessSync(businessId);
  const reportReservations = getReportReservations(reservations, range, businessId);
  const summary = getReportStats({
    businessId,
    reservations,
    services,
    hours: [],
    rules: null,
    range,
    now,
  });
  const serviceStats = getServiceStats(reportReservations, services);
  const timeSlotStats = buildTimeSlotStats(reportReservations, services);
  const weekdayStats = getWeekdayStats(reportReservations, services);
  const customerStats = buildCustomerReportStats(customers, reportReservations, services, now);
  const tableStats = buildEmptyTableStats(summary.withoutTableCount);
  const inconsistentServiceReservations = reportReservations.filter(
    (reservation) => !services.some((service) => service.id === reservation.serviceId),
  ).length;
  const alerts = getOperationalAlerts({
    summary,
    serviceStats,
    timeSlotStats,
    tableStats,
    customerStats,
    services,
    inconsistentServiceReservations,
  });

  return {
    range,
    reservations: reportReservations,
    services,
    hours: [],
    rules: null,
    tables: [],
    summary,
    serviceStats,
    timeSlotStats,
    weekdayStats,
    customerStats,
    tableStats,
    alerts,
  };
}
