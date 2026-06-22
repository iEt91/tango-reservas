import type { FloorTable, Reservation, Service } from "@/data/types";
import { buildDateTimeFromDateAndTime, normalizeDateKey, timeToMinutes } from "@/lib/date-time";

export type ReservationDurationContext = {
  service?: Service | null;
  defaultDurationMinutes?: number | null;
  fallbackDurationMinutes?: number | null;
};

export type ReservationRange = {
  start: Date;
  end: Date;
  startMinutes: number;
  endMinutes: number;
};

export type AvailableTableSearchInput = {
  businessId: string;
  reservationDate: string;
  reservationTime: string;
  durationMinutes: number;
  partySize: number;
  reservations: Reservation[];
  tables: FloorTable[];
  services?: Service[];
  fallbackDurationMinutes?: number | null;
};

export type OccupiedTableSlotInput = {
  businessId: string;
  date: string;
  time: string;
  reservations: Reservation[];
  services?: Service[];
  fallbackDurationMinutes?: number | null;
};

export type ReservationTableAvailabilityInput = {
  businessId: string;
  reservationDate: string;
  reservationTime: string;
  durationMinutes: number;
  partySize: number;
  tables: FloorTable[];
  reservations: Reservation[];
  services?: Service[];
  fallbackDurationMinutes?: number | null;
  optionalReservationIdToIgnore?: string | null;
};

export type ReservationTableAvailabilityResult = {
  availableTables: FloorTable[];
  occupiedTableIds: string[];
  reasonsByTableId: Record<string, string[]>;
  conflictsByTableId: Record<string, string[]>;
  availableTableIds: string[];
};

// Only pending-with-table and confirmed reservations block a table.
const ACTIVE_STATUSES: Reservation["status"][] = ["pending", "confirmed"];

export function normalizeAssignedTableIds(values: unknown) {
  const parsedValues = (() => {
    if (Array.isArray(values)) {
      return values;
    }

    if (typeof values === "string") {
      const trimmed = values.trim();
      if (!trimmed) {
        return [];
      }

      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed;
        }

        return [parsed];
      } catch {
        return [trimmed];
      }
    }

    return [];
  })();

  return [
    ...new Set(
      parsedValues
        .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
        .filter(Boolean),
    ),
  ];
}

function getReservationTableIds(
  reservation:
    | Pick<Reservation, "assignedTableIds" | "tableId">
    | { assigned_table_ids?: unknown; tableId?: unknown },
) {
  const assignedTableIds =
    "assignedTableIds" in reservation
      ? reservation.assignedTableIds
      : (reservation as { assigned_table_ids?: unknown }).assigned_table_ids;
  const directTableId =
    "tableId" in reservation ? reservation.tableId : (reservation as { tableId?: unknown }).tableId;

  const normalizedIds = normalizeAssignedTableIds(assignedTableIds);
  if (normalizedIds.length > 0) {
    return normalizedIds;
  }

  return typeof directTableId === "string" && directTableId.trim()
    ? [directTableId.trim()]
    : [];
}

export function reservationUsesTable(
  reservation:
    | Pick<Reservation, "assignedTableIds" | "tableId">
    | { assigned_table_ids?: unknown; tableId?: unknown },
  tableId: string,
) {
  // Table conflicts are always matched by exact ID, never by label/name.
  return getReservationTableIds(reservation).some((entry) => entry === tableId);
}

export function isReservationBlockingStatus(status: Reservation["status"]) {
  return status === "confirmed" || status === "pending";
}

function getReservationOverlapDetails(
  reservation: Pick<Reservation, "status" | "reservationDate" | "reservationTime" | "serviceId">,
  selectedDate: string,
  selectedTime: string,
  options: {
    service?: Service | null;
    slotDurationMinutes?: number | null;
    fallbackDurationMinutes?: number | null;
  } = {},
) {
  if (!isReservationBlockingStatus(reservation.status)) {
    return null;
  }

  if (normalizeDateKey(reservation.reservationDate) !== normalizeDateKey(selectedDate)) {
    return null;
  }

  const slotStartMinutes = timeToMinutes(selectedTime);
  if (slotStartMinutes === null) {
    return null;
  }

  const slotDurationMinutes = Math.max(1, options.slotDurationMinutes ?? 30);
  const slotEndMinutes = slotStartMinutes + slotDurationMinutes;
  const reservationRange = getReservationDateTimeRange(reservation, options.service, {
    fallbackDurationMinutes: options.fallbackDurationMinutes,
  });

  if (!reservationRange) {
    return null;
  }

  if (!doDateTimeRangesOverlap(
    reservationRange.startMinutes,
    reservationRange.endMinutes,
    slotStartMinutes,
    slotEndMinutes,
  )) {
    return null;
  }

  return {
    currentStart: slotStartMinutes,
    currentEnd: slotEndMinutes,
    conflictStart: reservationRange.startMinutes,
    conflictEnd: reservationRange.endMinutes,
  };
}

export type ReservationSlotOverlapInput = {
  businessId: string;
  date: string;
  time: string;
  reservations: Reservation[];
  services?: Service[];
  slotDurationMinutes?: number | null;
  fallbackDurationMinutes?: number | null;
  optionalReservationIdToIgnore?: string | null;
};

export function getReservationsOverlappingSlot({
  businessId,
  date,
  time,
  reservations,
  services = [],
  slotDurationMinutes = 30,
  fallbackDurationMinutes = 120,
  optionalReservationIdToIgnore = null,
}: ReservationSlotOverlapInput) {
  return reservations.filter((reservation) => {
    if (reservation.businessId !== businessId) {
      return false;
    }

    if (optionalReservationIdToIgnore && reservation.id === optionalReservationIdToIgnore) {
      return false;
    }

    return Boolean(
      getReservationOverlapDetails(reservation, date, time, {
        service: services.find((entry) => entry.id === reservation.serviceId) ?? null,
        slotDurationMinutes,
        fallbackDurationMinutes,
      }),
    );
  });
}

export function getReservationDurationMinutes(
  reservation: Pick<Reservation, "serviceId">,
  service: Service | null | undefined,
  context: ReservationDurationContext = {},
) {
  if (service && typeof service.durationMinutes === "number" && service.durationMinutes > 0) {
    return service.durationMinutes;
  }

  if (typeof context.defaultDurationMinutes === "number" && context.defaultDurationMinutes > 0) {
    return context.defaultDurationMinutes;
  }

  if (typeof context.fallbackDurationMinutes === "number" && context.fallbackDurationMinutes > 0) {
    return context.fallbackDurationMinutes;
  }

  return 120;
}

export function getReservationInterval(
  reservation: Pick<Reservation, "reservationDate" | "reservationTime" | "serviceId">,
  service: Service | null | undefined,
  context: ReservationDurationContext = {},
) {
  const range = getReservationDateTimeRange(reservation, service, context);
  if (!range) {
    return null;
  }

  return {
    start: range.start,
    end: range.end,
    startMinutes: range.startMinutes,
    endMinutes: range.endMinutes,
    durationMinutes: getReservationDurationMinutes(reservation, service, context),
  };
}

export function getReservationDateTimeRange(
  reservation: Pick<Reservation, "reservationDate" | "reservationTime" | "serviceId">,
  service: Service | null | undefined,
  context: ReservationDurationContext = {},
): ReservationRange | null {
  // reservationStart and reservationEnd define the full occupied interval.
  const start = buildDateTimeFromDateAndTime(reservation.reservationDate, reservation.reservationTime);
  if (!start) {
    return null;
  }

  const durationMinutes = getReservationDurationMinutes(reservation, service, context);
  const end = new Date(start.getTime() + Math.max(1, durationMinutes) * 60 * 1000);
  const startMinutes = timeToMinutes(reservation.reservationTime);
  const endMinutes = startMinutes === null ? null : startMinutes + Math.max(1, durationMinutes);

  if (startMinutes === null || endMinutes === null) {
    return null;
  }

  return {
    start,
    end,
    startMinutes,
    endMinutes,
  };
}

export function doDateTimeRangesOverlap(
  aStartMinutes: number,
  aEndMinutes: number,
  bStartMinutes: number,
  bEndMinutes: number,
) {
  // Two intervals overlap only when each one starts before the other ends.
  return aStartMinutes < bEndMinutes && bStartMinutes < aEndMinutes;
}

export function intervalsOverlap(
  aStartMinutes: number,
  aEndMinutes: number,
  bStartMinutes: number,
  bEndMinutes: number,
) {
  return doDateTimeRangesOverlap(aStartMinutes, aEndMinutes, bStartMinutes, bEndMinutes);
}

export function isReservationActiveAtSlot(
  reservation: Pick<Reservation, "status" | "reservationDate" | "reservationTime" | "serviceId">,
  selectedDate: string,
  selectedTime: string,
  options: {
    service?: Service | null;
    slotDurationMinutes?: number | null;
    fallbackDurationMinutes?: number | null;
  } = {},
) {
  if (!ACTIVE_STATUSES.includes(reservation.status)) {
    return false;
  }

  if (normalizeDateKey(reservation.reservationDate) !== normalizeDateKey(selectedDate)) {
    return false;
  }

  const slotStartMinutes = timeToMinutes(selectedTime);
  if (slotStartMinutes === null) {
    return false;
  }

  const slotDurationMinutes = Math.max(1, options.slotDurationMinutes ?? 30);
  const slotEndMinutes = slotStartMinutes + slotDurationMinutes;
  const reservationRange = getReservationDateTimeRange(reservation, options.service, {
    fallbackDurationMinutes: options.fallbackDurationMinutes,
  });

  if (!reservationRange) {
    return false;
  }

  return doDateTimeRangesOverlap(
    reservationRange.startMinutes,
    reservationRange.endMinutes,
    slotStartMinutes,
    slotEndMinutes,
  );
}

function isTableBaseAvailable(table: FloorTable) {
  return (
    table.status !== "blocked" &&
    table.status !== "out_of_service"
  );
}

function getTableAvailabilityReasons(
  table: FloorTable,
  input: Pick<ReservationTableAvailabilityInput, "partySize">,
) {
  const reasons: string[] = [];

  if (table.status === "blocked") {
    reasons.push("Mesa bloqueada");
  } else if (table.status === "out_of_service") {
    reasons.push("Mesa fuera de servicio");
  }

  if (table.seats < input.partySize) {
    reasons.push("Capacidad insuficiente");
  }

  return reasons;
}

export function getAvailableTablesForReservationSlot({
  businessId,
  reservationDate,
  reservationTime,
  durationMinutes,
  partySize,
  tables,
  reservations,
  services = [],
  fallbackDurationMinutes = 120,
  optionalReservationIdToIgnore = null,
}: ReservationTableAvailabilityInput): ReservationTableAvailabilityResult {
  const startMinutes = timeToMinutes(reservationTime);
  const reservationRange =
    startMinutes === null
      ? null
      : {
          startMinutes,
          endMinutes: startMinutes + Math.max(1, durationMinutes || fallbackDurationMinutes || 120),
        };

  const reasonsByTableId: Record<string, string[]> = {};
  const conflictsByTableId: Record<string, string[]> = {};
  const occupiedTableIds = new Set<string>();
  const overlappingReservations = getReservationsOverlappingSlot({
    businessId,
    date: reservationDate,
    time: reservationTime,
    reservations,
    services,
    slotDurationMinutes: Math.max(1, durationMinutes || fallbackDurationMinutes || 120),
    fallbackDurationMinutes,
    optionalReservationIdToIgnore,
  });

  for (const table of tables) {
    if (table.businessId !== businessId) {
      reasonsByTableId[table.id] = ["Mesa de otro negocio"];
      continue;
    }

    const reasons = getTableAvailabilityReasons(table, { partySize });
    if (reasons.length > 0) {
      reasonsByTableId[table.id] = [...new Set(reasons)];
    }
  }

  if (!reservationRange) {
    return {
      availableTables: [],
      occupiedTableIds: [],
      reasonsByTableId,
      conflictsByTableId,
      availableTableIds: [],
    };
  }

  for (const reservation of overlappingReservations) {
    const assignedTableIds = getReservationTableIds(reservation);
    if (assignedTableIds.length === 0) {
      continue;
    }

    const overlap = getReservationOverlapDetails(reservation, reservationDate, reservationTime, {
      service: services.find((entry) => entry.id === reservation.serviceId) ?? null,
      fallbackDurationMinutes,
    });
    if (!overlap) {
      continue;
    }

    for (const tableId of assignedTableIds.filter((assignedTableId) =>
      reservationUsesTable(reservation, assignedTableId),
    )) {
      const table = tables.find((entry) => entry.id === tableId) ?? null;

      occupiedTableIds.add(tableId);
      conflictsByTableId[tableId] = [...new Set([...(conflictsByTableId[tableId] ?? []), reservation.id])];
      reasonsByTableId[tableId] = [...new Set([...(reasonsByTableId[tableId] ?? []), "Mesa ocupada por otra reserva en este horario"])];

      if (process.env.NODE_ENV !== "production") {
        // eslint-disable-next-line no-console
        console.debug("[availability] table blocked", {
          tableId,
          tableLabel: table?.label ?? null,
          reason: "Mesa ocupada por otra reserva en este horario",
          currentReservationId: optionalReservationIdToIgnore ?? null,
          currentStart: overlap.currentStart,
          currentEnd: overlap.currentEnd,
          conflictReservationId: reservation.id,
          conflictAssignedTableIds: assignedTableIds,
          conflictStart: overlap.conflictStart,
          conflictEnd: overlap.conflictEnd,
        });
      }
    }
  }

  // availableTables only keeps mesas that survive business, status, capacity and
  // real overlap checks for the exact reservation interval being evaluated.
  const availableTables = tables
    .filter((table) => {
      const reasons = reasonsByTableId[table.id] ?? [];
      return reasons.length === 0;
    })
    .sort((left, right) => left.seats - right.seats || left.label.localeCompare(right.label));

  if (process.env.NODE_ENV !== "production") {
    for (const table of tables) {
      const reasons = reasonsByTableId[table.id] ?? [];
      if (reasons.length > 0) {
        // eslint-disable-next-line no-console
        console.debug("[availability]", {
          tableId: table.id,
          tableLabel: table.label,
          reasons,
          reservationDate,
          reservationTime,
          conflictingReservationIds: conflictsByTableId[table.id] ?? [],
        });
      }
    }
  }

  return {
    availableTables,
    occupiedTableIds: [...occupiedTableIds],
    reasonsByTableId,
    conflictsByTableId,
    availableTableIds: availableTables.map((table) => table.id),
  };
}

export function getOccupiedTableIdsForSlot({
  businessId,
  date,
  time,
  reservations,
  services = [],
  fallbackDurationMinutes = 120,
  slotDurationMinutes = 30,
}: OccupiedTableSlotInput & {
  slotDurationMinutes?: number | null;
}) {
  const occupiedTableIds = new Set<string>();
  const overlappingReservations = getReservationsOverlappingSlot({
    businessId,
    date,
    time,
    reservations,
    services,
    slotDurationMinutes,
    fallbackDurationMinutes,
  });

  for (const reservation of overlappingReservations) {
    for (const tableId of getReservationTableIds(reservation)) {
      occupiedTableIds.add(tableId);
    }
  }

  return [...occupiedTableIds];
}

export function isTableAvailableForReservation(
  table: FloorTable,
  input: {
    businessId: string;
    reservationDate: string;
    reservationTime: string;
    durationMinutes: number;
    partySize: number;
    reservations: Reservation[];
    services?: Service[];
    fallbackDurationMinutes?: number | null;
  },
) {
  if (!isTableBaseAvailable(table)) {
    return false;
  }

  if (table.seats < input.partySize) {
    return false;
  }

  return (
    getAvailableTablesForReservationSlot({
      businessId: input.businessId,
      reservationDate: input.reservationDate,
      reservationTime: input.reservationTime,
      durationMinutes: input.durationMinutes,
      partySize: input.partySize,
      reservations: input.reservations,
      tables: [table],
      services: input.services,
      fallbackDurationMinutes: input.fallbackDurationMinutes,
    }).availableTableIds[0] === table.id
  );
}

export function findAvailableTableForReservation({
  businessId,
  reservationDate,
  reservationTime,
  durationMinutes,
  partySize,
  reservations,
  tables,
  services = [],
  fallbackDurationMinutes = 120,
}: AvailableTableSearchInput) {
  const result = getAvailableTablesForReservationSlot({
    businessId,
    reservationDate,
    reservationTime,
    durationMinutes,
    partySize,
    reservations,
    tables,
    services,
    fallbackDurationMinutes,
  });

  return result.availableTables[0]?.id ?? null;
}
