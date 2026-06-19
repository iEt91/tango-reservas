import type {
  BusinessHours,
  DayOfWeek,
  FloorTable,
  Reservation,
  ReservationRules,
  ReservationStatus,
  Service,
} from "@/data/types";
import { buildCustomersFromReservations, classifyCustomer, getCustomerKey } from "@/lib/crm";
import { buildDateTimeFromDateAndTime, timeToMinutes } from "@/lib/date-time";
import { getFloorTablesByBusinessId } from "@/data/floor-plan";
import { getJoinedTableByReservationId } from "@/data/joined-tables";
import { getBusinessHours, getBusinessServices, getReservationRules } from "@/data/scheduling";
import {
  dedupeReservations,
  getTableAvailabilitySummary,
  validateReservationTableAssignment,
} from "@/data/reservations";
import { intervalsOverlap } from "@/lib/reservation-availability";

export type ReportPeriod = "today" | "7d" | "30d" | "month" | "custom";

export type ReportDateRange = {
  from: string;
  to: string;
  label: string;
};

export type ReportSummaryStats = {
  totalReservations: number;
  activeReservations: number;
  confirmed: number;
  pending: number;
  cancelled: number;
  completed: number;
  noShow: number;
  peopleTotal: number;
  withoutTableCount: number;
  estimatedRevenue: number;
  cancellationRate: number;
  noShowRate: number;
  occupancyRate: number;
  capacityPotential: number;
  capacityOccupied: number;
  openSlotCount: number;
  pendingSoonCount: number;
};

export type ServiceReportStat = {
  serviceId: string;
  name: string;
  reservations: number;
  people: number;
  revenue: number;
  percentage: number;
  cancellations: number;
  noShows: number;
};

export type TimeSlotReportStat = {
  time: string;
  reservations: number;
  people: number;
  revenue: number;
  occupancyRate: number;
  serviceName: string | null;
  serviceReservations: number;
  reservationsWithoutTable: number;
  conflicts: number;
};

export type WeekdayReportStat = {
  weekday: DayOfWeek;
  label: string;
  reservations: number;
  people: number;
  revenue: number;
  cancellations: number;
  noShows: number;
};

export type CustomerReportItem = ReturnType<typeof buildCustomersFromReservations>[number] & {
  commercialState: ReturnType<typeof classifyCustomer>;
  peopleTotal: number;
  estimatedSpend: number;
};

export type CustomerReportStats = {
  totalCustomers: number;
  recurringCustomers: number;
  vipCustomers: number;
  riskCustomers: number;
  noShowCustomers: number;
  cancelationCustomers: number;
  latestCustomer: CustomerReportItem | null;
  nextCustomer: CustomerReportItem | null;
  customerList: CustomerReportItem[];
  topByReservations: CustomerReportItem[];
  topByPeople: CustomerReportItem[];
  topBySpend: CustomerReportItem[];
};

export type TableReportItem = {
  tableId: string;
  label: string;
  seats: number;
  status: FloorTable["status"];
  reservations: number;
  people: number;
  conflicts: number;
};

export type TableReportStats = {
  totalTables: number;
  totalSeats: number;
  availableTables: number;
  occupiedTables: number;
  reservedTables: number;
  blockedTables: number;
  outOfServiceTables: number;
  reservationsWithoutTable: number;
  conflictCount: number;
  capacityPotential: number;
  capacityOccupied: number;
  occupancyRate: number;
  mostUsedTables: TableReportItem[];
};

export type OperationalAlert = {
  key: string;
  title: string;
  description: string;
  severity: "low" | "medium" | "high";
};

export type ReportData = {
  range: ReportDateRange;
  reservations: Reservation[];
  services: Service[];
  hours: BusinessHours[];
  rules: ReservationRules | null;
  tables: FloorTable[];
  summary: ReportSummaryStats;
  serviceStats: ServiceReportStat[];
  timeSlotStats: TimeSlotReportStat[];
  weekdayStats: WeekdayReportStat[];
  customerStats: CustomerReportStats;
  tableStats: TableReportStats;
  alerts: OperationalAlert[];
};

const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = ["pending", "confirmed", "completed"];
const dayOrder: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function isBrowserDateValue(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function parseDateValue(dateValue: string) {
  const match = dateValue.trim().match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);

  if (
    Number.isNaN(date.getTime()) ||
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }

  return date;
}

function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(dateValue: string, days: number) {
  const date = parseDateValue(dateValue);
  if (!date) {
    return dateValue;
  }

  date.setDate(date.getDate() + days);
  return toDateInputValue(date);
}

function getDateRangeValues(from: string, to: string) {
  if (!isBrowserDateValue(from) || !isBrowserDateValue(to)) {
    return [];
  }

  const start = parseDateValue(from);
  const end = parseDateValue(to);
  if (!start || !end) {
    return [];
  }

  const lower = Math.min(start.getTime(), end.getTime());
  const upper = Math.max(start.getTime(), end.getTime());
  const values: string[] = [];
  const cursor = new Date(lower);

  while (cursor.getTime() <= upper) {
    values.push(toDateInputValue(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }

  return values;
}

function getDayOfWeek(dateValue: string) {
  const date = parseDateValue(dateValue);
  if (!date) {
    return null;
  }

  return [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ][date.getDay()] as DayOfWeek;
}

function getDayLabel(weekday: DayOfWeek) {
  const labels: Record<DayOfWeek, string> = {
    monday: "Lunes",
    tuesday: "Martes",
    wednesday: "Miercoles",
    thursday: "Jueves",
    friday: "Viernes",
    saturday: "Sabado",
    sunday: "Domingo",
  };

  return labels[weekday];
}

function formatShortDate(dateValue: string) {
  const date = parseDateValue(dateValue);
  if (!date) {
    return dateValue;
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPercent(value: number) {
  return `${(value * 100).toFixed(value >= 0.1 ? 1 : 0)}%`;
}

function formatMinutesToTime(minutes: number) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
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

function isActiveReservation(reservation: Reservation) {
  return ACTIVE_RESERVATION_STATUSES.includes(reservation.status);
}

function isReservationAssigned(reservation: Reservation) {
  return getReservationAssignedTableIds(reservation).length > 0;
}

function getReservationAssignedTableIds(reservation: Reservation) {
  const assignedTableIds = parseAssignedTableIds((reservation as { assignedTableIds?: unknown }).assignedTableIds);
  if (assignedTableIds.length > 0) {
    return assignedTableIds;
  }

  if (reservation.tableId) {
    return [reservation.tableId];
  }

  if (reservation.joinedTableId) {
    const joinedTable = getJoinedTableByReservationId(reservation.id);
    if (joinedTable) {
      return [...new Set(joinedTable.tableIds.filter(Boolean))];
    }
  }

  return [];
}

function buildReservationStatusMap(reservations: Reservation[]) {
  return reservations.reduce(
    (map, reservation) => {
      map[reservation.status] += 1;
      return map;
    },
    {
      pending: 0,
      confirmed: 0,
      cancelled: 0,
      completed: 0,
      no_show: 0,
    } satisfies Record<ReservationStatus, number>,
  );
}

function getStatusRank(status: ReservationStatus) {
  const ranking: Record<ReservationStatus, number> = {
    pending: 1,
    confirmed: 2,
    completed: 3,
    cancelled: 4,
    no_show: 5,
  };

  return ranking[status];
}

function sortByReservationOrder(left: Reservation, right: Reservation) {
  const dateCompare = left.reservationDate.localeCompare(right.reservationDate);
  if (dateCompare !== 0) {
    return dateCompare;
  }

  const timeCompare = left.reservationTime.localeCompare(right.reservationTime);
  if (timeCompare !== 0) {
    return timeCompare;
  }

  const statusCompare = getStatusRank(left.status) - getStatusRank(right.status);
  if (statusCompare !== 0) {
    return statusCompare;
  }

  const nameCompare = left.customerName.localeCompare(right.customerName);
  if (nameCompare !== 0) {
    return nameCompare;
  }

  return left.id.localeCompare(right.id);
}

function buildReportSlotSummaries({
  businessId,
  reservations,
  range,
  hours,
  rules,
}: {
  businessId: string;
  reservations: Reservation[];
  range: ReportDateRange;
  hours: BusinessHours[];
  rules: ReservationRules | null;
}) {
  if (!rules) {
    return [];
  }

  const activeReservations = reservations.filter(isActiveReservation);
  const slotSummaries: Array<{
    date: string;
    time: string;
    dayOfWeek: DayOfWeek;
    reservations: Reservation[];
    tableSummary: ReturnType<typeof getTableAvailabilitySummary>;
  }> = [];

  for (const dateValue of getDateRangeValues(range.from, range.to)) {
    const dayOfWeek = getDayOfWeek(dateValue);
    if (!dayOfWeek) {
      continue;
    }

    const businessHours = hours.find((entry) => entry.dayOfWeek === dayOfWeek) ?? null;
    if (!businessHours || !businessHours.isOpen) {
      continue;
    }

    const openMinutes = timeToMinutes(businessHours.openTime) ?? 0;
    const closeMinutes = timeToMinutes(businessHours.closeTime) ?? 0;
    const breakStartMinutes = businessHours.breakStartTime
      ? timeToMinutes(businessHours.breakStartTime)
      : null;
    const breakEndMinutes = businessHours.breakEndTime
      ? timeToMinutes(businessHours.breakEndTime)
      : null;
    const slotStep = Math.max(1, rules.slotDurationMinutes || 30);
    // Treat 23:59 as the last minute of service, so the final reservable
    // start is still allowed if it fits fully before closing.
    const latestEndMinutes = closeMinutes + 1;

    for (
      let startMinutes = openMinutes;
      startMinutes < latestEndMinutes;
      startMinutes += slotStep
    ) {
      const time = formatMinutesToTime(startMinutes);
      if (
        breakStartMinutes !== null &&
        breakEndMinutes !== null &&
        intervalsOverlap(
          startMinutes,
          startMinutes + slotStep,
          breakStartMinutes,
          breakEndMinutes,
        )
      ) {
        continue;
      }

      const reservationsForSlot = activeReservations.filter(
        (reservation) =>
          reservation.reservationDate === dateValue && reservation.reservationTime === time,
      );
      const tableSummary = getTableAvailabilitySummary(
        businessId,
        dateValue,
        time,
        reservationsForSlot,
      );

      slotSummaries.push({
        date: dateValue,
        time,
        dayOfWeek,
        reservations: reservationsForSlot,
        tableSummary,
      });
    }
  }

  return slotSummaries;
}

function getServicePrice(serviceId: string, services: Service[]) {
  return services.find((service) => service.id === serviceId)?.price ?? null;
}

export function buildReportDateRange(
  period: ReportPeriod,
  now = new Date(),
  customFrom = "",
  customTo = "",
): ReportDateRange {
  const today = toDateInputValue(now);

  if (period === "today") {
    return { from: today, to: today, label: "Hoy" };
  }

  if (period === "7d") {
    return { from: addDays(today, -6), to: today, label: "7 dias" };
  }

  if (period === "month") {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return {
      from: toDateInputValue(firstDay),
      to: toDateInputValue(lastDay),
      label: "Mes actual",
    };
  }

  if (period === "custom") {
    const safeFrom = isBrowserDateValue(customFrom) ? customFrom : addDays(today, -29);
    const safeTo = isBrowserDateValue(customTo) ? customTo : today;
    const fromDate = parseDateValue(safeFrom);
    const toDate = parseDateValue(safeTo);

    if (!fromDate || !toDate) {
      return { from: addDays(today, -29), to: today, label: "Personalizado" };
    }

    if (fromDate.getTime() <= toDate.getTime()) {
      return { from: safeFrom, to: safeTo, label: "Personalizado" };
    }

    return { from: safeTo, to: safeFrom, label: "Personalizado" };
  }

  return { from: addDays(today, -29), to: today, label: "30 dias" };
}

export function getReportReservations(
  reservations: Reservation[],
  range: ReportDateRange,
  businessId?: string,
) {
  const deduped = dedupeReservations(reservations);
  const scopedReservations = businessId
    ? deduped.filter((reservation) => reservation.businessId === businessId)
    : deduped;
  const reportReservations = scopedReservations.filter(
    (reservation) =>
      reservation.reservationDate >= range.from && reservation.reservationDate <= range.to,
  );

  return [...reportReservations].sort(sortByReservationOrder);
}

export function getEstimatedRevenue(reservations: Reservation[], services: Service[]) {
  return reservations.reduce((total, reservation) => {
    if (!isActiveReservation(reservation)) {
      return total;
    }

    const price = getServicePrice(reservation.serviceId, services);
    return total + (typeof price === "number" ? price : 0);
  }, 0);
}

export function getServiceStats(reservations: Reservation[], services: Service[]) {
  const totalReservations = Math.max(reservations.length, 1);

  const stats = services.map<ServiceReportStat>((service) => {
    const serviceReservations = reservations.filter((reservation) => reservation.serviceId === service.id);
    const revenue = serviceReservations.reduce((total, reservation) => {
      const price = getServicePrice(reservation.serviceId, services);
      return total + (isActiveReservation(reservation) && typeof price === "number" ? price : 0);
    }, 0);

    return {
      serviceId: service.id,
      name: service.name,
      reservations: serviceReservations.length,
      people: serviceReservations.reduce((total, reservation) => total + reservation.partySize, 0),
      revenue,
      percentage: serviceReservations.length / totalReservations,
      cancellations: serviceReservations.filter((reservation) => reservation.status === "cancelled").length,
      noShows: serviceReservations.filter((reservation) => reservation.status === "no_show").length,
    };
  });

  return stats.sort(
    (left, right) =>
      right.reservations - left.reservations ||
      right.people - left.people ||
      right.revenue - left.revenue ||
      left.name.localeCompare(right.name),
  );
}

export function getWeekdayStats(reservations: Reservation[], services: Service[]) {
  const map = new Map<
    DayOfWeek,
    {
      weekday: DayOfWeek;
      label: string;
      reservations: number;
      people: number;
      revenue: number;
      cancellations: number;
      noShows: number;
    }
  >();

  for (const weekday of dayOrder) {
    map.set(weekday, {
      weekday,
      label: getDayLabel(weekday),
      reservations: 0,
      people: 0,
      revenue: 0,
      cancellations: 0,
      noShows: 0,
    });
  }

  for (const reservation of reservations) {
    const weekday = getDayOfWeek(reservation.reservationDate);
    if (!weekday) {
      continue;
    }

    const entry = map.get(weekday);
    if (!entry) {
      continue;
    }

    entry.reservations += 1;
    entry.people += reservation.partySize;
    if (reservation.status === "cancelled") {
      entry.cancellations += 1;
    }
    if (reservation.status === "no_show") {
      entry.noShows += 1;
    }
    if (isActiveReservation(reservation)) {
      const price = getServicePrice(reservation.serviceId, services);
      entry.revenue += typeof price === "number" ? price : 0;
    }
  }

  return [...map.values()]
    .filter((entry) => entry.reservations > 0)
    .sort(
      (left, right) =>
        right.reservations - left.reservations ||
        dayOrder.indexOf(left.weekday) - dayOrder.indexOf(right.weekday),
    );
}

export function getTimeSlotStats({
  businessId,
  reservations,
  range,
  hours,
  rules,
  services,
}: {
  businessId: string;
  reservations: Reservation[];
  range: ReportDateRange;
  hours: BusinessHours[];
  rules: ReservationRules | null;
  services: Service[];
}) {
  const reportReservations = reservations;
  const slotSummaries = buildReportSlotSummaries({
    businessId,
    reservations: reportReservations,
    range,
    hours,
    rules,
  });

  const map = new Map<
    string,
    {
      time: string;
      reservations: number;
      people: number;
      revenue: number;
      occupancyPotential: number;
      occupancyOccupied: number;
      serviceCounts: Map<string, number>;
      reservationsWithoutTable: number;
      conflicts: number;
    }
  >();

  for (const reservation of reportReservations) {
    const entry =
      map.get(reservation.reservationTime) ??
      ({
        time: reservation.reservationTime,
        reservations: 0,
        people: 0,
        revenue: 0,
        occupancyPotential: 0,
        occupancyOccupied: 0,
        serviceCounts: new Map<string, number>(),
        reservationsWithoutTable: 0,
        conflicts: 0,
      } satisfies {
        time: string;
        reservations: number;
        people: number;
        revenue: number;
        occupancyPotential: number;
        occupancyOccupied: number;
        serviceCounts: Map<string, number>;
        reservationsWithoutTable: number;
        conflicts: number;
      });

    entry.reservations += 1;
    entry.people += reservation.partySize;
    if (isActiveReservation(reservation)) {
      const price = getServicePrice(reservation.serviceId, services);
      entry.revenue += typeof price === "number" ? price : 0;
    }

    entry.serviceCounts.set(
      reservation.serviceId,
      (entry.serviceCounts.get(reservation.serviceId) ?? 0) + 1,
    );

    map.set(reservation.reservationTime, entry);
  }

  for (const slot of slotSummaries) {
    const entry =
      map.get(slot.time) ??
      ({
        time: slot.time,
        reservations: 0,
        people: 0,
        revenue: 0,
        occupancyPotential: 0,
        occupancyOccupied: 0,
        serviceCounts: new Map<string, number>(),
        reservationsWithoutTable: 0,
        conflicts: 0,
      } satisfies {
        time: string;
        reservations: number;
        people: number;
        revenue: number;
        occupancyPotential: number;
        occupancyOccupied: number;
        serviceCounts: Map<string, number>;
        reservationsWithoutTable: number;
        conflicts: number;
      });

    entry.occupancyPotential +=
      (slot.tableSummary.capacityAvailable ?? 0) + (slot.tableSummary.capacityOccupied ?? 0);
    entry.occupancyOccupied += slot.tableSummary.capacityOccupied ?? 0;
    entry.reservationsWithoutTable += slot.tableSummary.reservationsWithoutTableCount ?? 0;
    entry.conflicts += slot.tableSummary.conflictCount ?? 0;

    map.set(slot.time, entry);
  }

  return [...map.values()]
    .map<TimeSlotReportStat>((entry) => {
      const topService = [...entry.serviceCounts.entries()].sort(
        ([leftServiceId, leftCount], [rightServiceId, rightCount]) => {
          if (leftCount !== rightCount) {
            return rightCount - leftCount;
          }

          const leftName = services.find((service) => service.id === leftServiceId)?.name ?? leftServiceId;
          const rightName = services.find((service) => service.id === rightServiceId)?.name ?? rightServiceId;
          return leftName.localeCompare(rightName);
        },
      )[0];

      return {
        time: entry.time,
        reservations: entry.reservations,
        people: entry.people,
        revenue: entry.revenue,
        occupancyRate:
          entry.occupancyPotential > 0 ? entry.occupancyOccupied / entry.occupancyPotential : 0,
        serviceName: topService
          ? services.find((service) => service.id === topService[0])?.name ?? "Dato inconsistente"
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

export function getCustomerReportStats({
  businessId,
  reservations,
  services,
  now = new Date(),
}: {
  businessId: string;
  reservations: Reservation[];
  services: Service[];
  now?: Date;
}) {
  const customers = buildCustomersFromReservations(reservations, now).filter(
    (customer) => customer.businessId === businessId,
  );

  const customerList = customers.map<CustomerReportItem>((customer) => {
    const customerReservations = reservations.filter(
      (reservation) =>
        reservation.businessId === businessId && getCustomerKey(reservation) === customer.customerKey,
    );

    const activeReservations = customerReservations.filter(isActiveReservation);
    const estimatedSpend = activeReservations.reduce((total, reservation) => {
      const price = getServicePrice(reservation.serviceId, services);
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
      new Date(right.lastReservationAt).getTime() - new Date(left.lastReservationAt).getTime() ||
      right.totalReservations - left.totalReservations ||
      left.name.localeCompare(right.name),
  )[0] ?? null;

  const nextCustomer = [...customerList]
    .filter((customer) => customer.nextReservationAt)
    .sort(
      (left, right) =>
        new Date(left.nextReservationAt ?? "").getTime() -
          new Date(right.nextReservationAt ?? "").getTime() ||
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
  } satisfies CustomerReportStats;
}

export function getTableReportStats({
  businessId,
  reservations,
  range,
  hours,
  rules,
}: {
  businessId: string;
  reservations: Reservation[];
  range: ReportDateRange;
  hours: BusinessHours[];
  rules: ReservationRules | null;
}) {
  const tables = getFloorTablesByBusinessId(businessId);
  const slotSummaries = buildReportSlotSummaries({
    businessId,
    reservations,
    range,
    hours,
    rules,
  });
  const activeReservations = reservations.filter(isActiveReservation);
  const usageMap = new Map<string, { reservations: number; people: number; conflicts: number }>();
  let reservationsWithoutTable = 0;
  let conflictCount = 0;

  for (const reservation of activeReservations) {
    if (!isReservationAssigned(reservation)) {
      reservationsWithoutTable += 1;
      continue;
    }

    const validation = validateReservationTableAssignment(reservation);
    const assignedTableIds = getReservationAssignedTableIds(reservation);
    for (const tableId of assignedTableIds) {
      const current = usageMap.get(tableId) ?? { reservations: 0, people: 0, conflicts: 0 };
      current.reservations += 1;
      current.people += reservation.partySize;
      if (validation.errors.length > 0) {
        current.conflicts += 1;
      }
      usageMap.set(tableId, current);
    }

    if (validation.errors.length > 0) {
      conflictCount += validation.errors.length;
    }
  }

  const mostUsedTables = tables
    .map<TableReportItem>((table) => {
      const usage = usageMap.get(table.id) ?? { reservations: 0, people: 0, conflicts: 0 };
      return {
        tableId: table.id,
        label: table.label,
        seats: table.seats,
        status: table.status,
        reservations: usage.reservations,
        people: usage.people,
        conflicts: usage.conflicts,
      };
    })
    .sort(
      (left, right) =>
        right.reservations - left.reservations ||
        right.people - left.people ||
        left.label.localeCompare(right.label),
    )
    .filter((entry) => entry.reservations > 0);

  const totalSeats = tables.reduce((sum, table) => sum + table.seats, 0);
  const capacityPotential = slotSummaries.reduce(
    (sum, slot) =>
      sum + (slot.tableSummary.capacityAvailable ?? 0) + (slot.tableSummary.capacityOccupied ?? 0),
    0,
  );
  const capacityOccupied = slotSummaries.reduce(
    (sum, slot) => sum + (slot.tableSummary.capacityOccupied ?? 0),
    0,
  );

  return {
    totalTables: tables.length,
    totalSeats,
    availableTables: tables.filter((table) => table.status === "available").length,
    occupiedTables: tables.filter((table) => table.status === "occupied").length,
    reservedTables: tables.filter((table) => table.status === "reserved").length,
    blockedTables: tables.filter((table) => table.status === "blocked").length,
    outOfServiceTables: tables.filter((table) => table.status === "out_of_service").length,
    reservationsWithoutTable,
    conflictCount,
    capacityPotential,
    capacityOccupied,
    occupancyRate: capacityPotential > 0 ? capacityOccupied / capacityPotential : 0,
    mostUsedTables,
  } satisfies TableReportStats;
}

export function getReportStats({
  businessId,
  reservations,
  services,
  hours,
  rules,
  range,
  now = new Date(),
}: {
  businessId: string;
  reservations: Reservation[];
  services: Service[];
  hours: BusinessHours[];
  rules: ReservationRules | null;
  range: ReportDateRange;
  now?: Date;
}) {
  const reportReservations = getReportReservations(reservations, range);
  const activeReservations = reportReservations.filter(isActiveReservation);
  const slotSummaries = buildReportSlotSummaries({
    businessId,
    reservations: reportReservations,
    range,
    hours,
    rules,
  });
  const reservationStatusMap = buildReservationStatusMap(reportReservations);
  const estimatedRevenue = getEstimatedRevenue(reportReservations, services);
  const peopleTotal = reportReservations.reduce((total, reservation) => total + reservation.partySize, 0);
  const withoutTableCount = activeReservations.filter((reservation) => !isReservationAssigned(reservation)).length;
  const capacityPotential = slotSummaries.reduce(
    (sum, slot) =>
      sum + (slot.tableSummary.capacityAvailable ?? 0) + (slot.tableSummary.capacityOccupied ?? 0),
    0,
  );
  const capacityOccupied = slotSummaries.reduce(
    (sum, slot) => sum + (slot.tableSummary.capacityOccupied ?? 0),
    0,
  );
  const pendingSoonCount = activeReservations.filter((reservation) => {
    if (reservation.status !== "pending") {
      return false;
    }

    const reservationDateTime = buildDateTimeFromDateAndTime(
      reservation.reservationDate,
      reservation.reservationTime,
    );
    if (!reservationDateTime) {
      return false;
    }

    const diffMinutes = (reservationDateTime.getTime() - now.getTime()) / (1000 * 60);
    return diffMinutes >= 0 && diffMinutes <= 24 * 60;
  }).length;

  return {
    totalReservations: reportReservations.length,
    activeReservations: activeReservations.length,
    confirmed: reservationStatusMap.confirmed,
    pending: reservationStatusMap.pending,
    cancelled: reservationStatusMap.cancelled,
    completed: reservationStatusMap.completed,
    noShow: reservationStatusMap.no_show,
    peopleTotal,
    withoutTableCount,
    estimatedRevenue,
    cancellationRate:
      reportReservations.length > 0 ? reservationStatusMap.cancelled / reportReservations.length : 0,
    noShowRate: reportReservations.length > 0 ? reservationStatusMap.no_show / reportReservations.length : 0,
    occupancyRate: capacityPotential > 0 ? capacityOccupied / capacityPotential : 0,
    capacityPotential,
    capacityOccupied,
    openSlotCount: slotSummaries.length,
    pendingSoonCount,
  } satisfies ReportSummaryStats;
}

export function getOperationalAlerts({
  summary,
  serviceStats,
  timeSlotStats,
  tableStats,
  customerStats,
  services,
  inconsistentServiceReservations = 0,
}: {
  summary: ReportSummaryStats;
  serviceStats: ServiceReportStat[];
  timeSlotStats: TimeSlotReportStat[];
  tableStats: TableReportStats;
  customerStats: CustomerReportStats;
  services: Service[];
  inconsistentServiceReservations?: number;
}) {
  const alerts: OperationalAlert[] = [];

  if (tableStats.reservationsWithoutTable > 0) {
    alerts.push({
      key: "without-table",
      title: "Hay reservas sin mesa",
      description: `Quedan ${tableStats.reservationsWithoutTable} reservas activas sin asignacion en el periodo seleccionado.`,
      severity: tableStats.reservationsWithoutTable >= 3 ? "high" : "medium",
    });
  }

  if (tableStats.conflictCount > 0) {
    alerts.push({
      key: "conflicts",
      title: "Conflictos de mesa",
      description: `Se detectaron ${tableStats.conflictCount} conflictos de asignacion o disponibilidad.`,
      severity: "high",
    });
  }

  if (summary.pendingSoonCount > 0) {
    alerts.push({
      key: "pending-soon",
      title: "Reservas pendientes proximas",
      description: `Hay ${summary.pendingSoonCount} reservas pendientes dentro de las proximas 24 horas.`,
      severity: summary.pendingSoonCount >= 3 ? "high" : "medium",
    });
  }

  if (summary.noShowRate >= 0.15 || summary.noShow >= 3) {
    alerts.push({
      key: "no-show",
      title: "Muchos no-show",
      description: `La tasa de no-show esta en ${formatPercent(summary.noShowRate)}.`,
      severity: summary.noShowRate >= 0.25 ? "high" : "medium",
    });
  }

  if (summary.cancellationRate >= 0.2 || summary.cancelled >= 4) {
    alerts.push({
      key: "cancelled",
      title: "Muchas cancelaciones",
      description: `La tasa de cancelacion actual es ${formatPercent(summary.cancellationRate)}.`,
      severity: summary.cancellationRate >= 0.3 ? "high" : "medium",
    });
  }

  const servicesWithoutReservations = services.filter(
    (service) =>
      service.isActive &&
      !serviceStats.some((stat) => stat.serviceId === service.id && stat.reservations > 0),
  );
  if (servicesWithoutReservations.length > 0) {
    alerts.push({
      key: "services-without-reservations",
      title: "Servicios sin reservas",
      description: `${servicesWithoutReservations.length} servicios no tuvieron reservas en el periodo.`,
      severity: "low",
    });
  }

  if (tableStats.blockedTables > 0 || tableStats.outOfServiceTables > 0) {
    alerts.push({
      key: "blocked-tables",
      title: "Mesas bloqueadas",
      description: `Hay ${tableStats.blockedTables + tableStats.outOfServiceTables} mesas bloqueadas o fuera de servicio.`,
      severity: "medium",
    });
  }

  const topDemandSlot = timeSlotStats[0];
  if (topDemandSlot && topDemandSlot.reservations >= 4) {
    alerts.push({
      key: "high-demand",
      title: "Horario de alta demanda",
      description: `El horario mas demandado es ${topDemandSlot.time} con ${topDemandSlot.reservations} reservas.`,
      severity: topDemandSlot.reservations >= 8 ? "high" : "medium",
    });
  }

  if (customerStats.riskCustomers > 0) {
    alerts.push({
      key: "customer-risk",
      title: "Clientes en riesgo",
      description: `Hay ${customerStats.riskCustomers} clientes clasificados como Riesgo.`,
      severity: "medium",
    });
  }

  if (inconsistentServiceReservations > 0) {
    alerts.push({
      key: "inconsistent-services",
      title: "Datos inconsistentes",
      description: `${inconsistentServiceReservations} reservas usan servicios que no pertenecen a este negocio.`,
      severity: "low",
    });
  }

  return alerts.sort((left, right) => {
    const severityRank = { high: 0, medium: 1, low: 2 } as const;
    return severityRank[left.severity] - severityRank[right.severity] || left.title.localeCompare(right.title);
  });
}

export function buildReportData({
  businessId,
  reservations,
  range,
  now = new Date(),
}: {
  businessId: string;
  reservations: Reservation[];
  range: ReportDateRange;
  now?: Date;
}): ReportData {
  const businessReservations = dedupeReservations(reservations).filter(
    (reservation) => reservation.businessId === businessId,
  );
  const services = getBusinessServices(businessId);
  const hours = getBusinessHours(businessId);
  const rules = getReservationRules(businessId);
  const tables = getFloorTablesByBusinessId(businessId);
  const reportReservations = getReportReservations(businessReservations, range);
  const summary = getReportStats({
    businessId,
    reservations: businessReservations,
    services,
    hours,
    rules,
    range,
    now,
  });
  const serviceStats = getServiceStats(reportReservations, services);
  const timeSlotStats = getTimeSlotStats({
    businessId,
    reservations: reportReservations,
    range,
    hours,
    rules,
    services,
  });
  const weekdayStats = getWeekdayStats(reportReservations, services);
  const customerStats = getCustomerReportStats({
    businessId,
    reservations: reportReservations,
    services,
    now,
  });
  const tableStats = getTableReportStats({
    businessId,
    reservations: reportReservations,
    range,
    hours,
    rules,
  });
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
    hours,
    rules,
    tables,
    summary,
    serviceStats,
    timeSlotStats,
    weekdayStats,
    customerStats,
    tableStats,
    alerts,
  } satisfies ReportData;
}

export {
  addDays,
  formatCurrency,
  formatPercent,
  formatShortDate,
  getDayLabel,
  toDateInputValue,
};
