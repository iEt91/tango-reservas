import type { FloorTable } from "@/data/types";
import type {
  BusinessHourEditorDay,
} from "@/lib/configuration/business-hours-contract";
import type {
  ReservationSettingsEditor,
} from "@/lib/configuration/reservation-settings-contract";
import type {
  BusinessCustomerEditor,
} from "@/lib/customers/business-customer-contract";
import type {
  BusinessReservationTableAssignment,
} from "@/lib/floor-plan/business-floor-plan-contract";
import type {
  BusinessReservationEditor,
} from "@/lib/reservations/business-reservation-contract";
import type {
  BusinessServiceEditor,
} from "@/lib/services/business-service-contract";

export type V2PersistentReservationSnapshot = {
  id: string;
  serviceId: string;
  customerId: string;
  date: string;
  time: string;
  client: string;
  people: number;
  phone: string;
  email: string;
  note: string;
  status:
    | "pending"
    | "confirmed"
    | "completed"
    | "cancelled"
    | "no_show";
  durationMinutes: number;
  tableName: string;
  origin:
    | "web"
    | "whatsapp"
    | "phone"
    | "instagram"
    | "manual";
  reservationCode: string;
  createdAt: string;
  confirmedAt?: string;
  completedAt?: string;
  cancelledAt?: string;
  noShowAt?: string;
};

export type V2PersistentReservationService = {
  id: string;
  name: string;
  durationMinutes: number;
  capacity: number;
  price: number | null;
  isActive: boolean;
};

export type V2PersistentReservationCustomer = {
  id: string;
  fullName: string;
  phone: string;
  email: string;
  isActive: boolean;
};

export type V2PersistentReservationFloorTable = {
  id: string;
  name: string;
  capacity: number;
  status:
    | "available"
    | "reserved"
    | "occupied"
    | "blocked";
  locked?: boolean;
};

export type V2PersistentReservationConfig = {
  businessHours: BusinessHourEditorDay[];
  reservationEnabled: boolean;
  standardDurationMinutes: number;
  confirmationMode: "manual" | "automatic";
  defaultReservationStatus:
    | "pending"
    | "confirmed";
  minimumNoticeHours: number;
  bookingWindowDays: number;
  maxPeoplePerSlot: number;
  allowReservationsWithoutTable: boolean;
  autoAssignReservationTables: boolean;
  allowTableCombinations: boolean;
};

export type V2ReservationsSnapshot = {
  initialReservations:
    V2PersistentReservationSnapshot[];
  initialFloorTables:
    V2PersistentReservationFloorTable[];
  initialLocalConfig:
    V2PersistentReservationConfig;
  persistentServices:
    V2PersistentReservationService[];
  persistentCustomers:
    V2PersistentReservationCustomer[];
};

type FloorPlanReaderSnapshot = {
  tables: FloorTable[];
  assignments: Array<
    Omit<
      BusinessReservationTableAssignment,
      "totalSeats"
    >
  >;
};

function mapSource(
  source: BusinessReservationEditor["source"],
): V2PersistentReservationSnapshot["origin"] {
  return source === "admin" ? "manual" : source;
}

export function mapBusinessReservationToV2Draft(
  reservation: BusinessReservationEditor,
  tableName = "",
): V2PersistentReservationSnapshot {
  return {
    id: reservation.id ?? "",
    serviceId: reservation.serviceId,
    customerId: reservation.customerId,
    date: reservation.reservationDate,
    time: reservation.reservationTime,
    client: reservation.customerName,
    people: reservation.partySize,
    phone: reservation.customerPhone,
    email: reservation.customerEmail,
    note: reservation.notes,
    status: reservation.status,
    durationMinutes: reservation.durationMinutes,
    tableName,
    origin: mapSource(reservation.source),
    reservationCode: reservation.publicCode,
    createdAt: reservation.createdAt,
    confirmedAt:
      reservation.confirmedAt || undefined,
    completedAt:
      reservation.completedAt || undefined,
    cancelledAt:
      reservation.cancelledAt || undefined,
    noShowAt:
      reservation.noShowAt || undefined,
  };
}

function buildTableNamesByReservationId(
  floorPlan: FloorPlanReaderSnapshot,
) {
  const tableLabelsById = new Map(
    floorPlan.tables.map((table) => [
      table.id,
      table.label,
    ]),
  );

  return floorPlan.assignments.reduce<
    Map<string, string>
  >((result, assignment) => {
    const labels = assignment.tableIds
      .map((tableId) =>
        tableLabelsById.get(tableId),
      )
      .filter(
        (label): label is string =>
          typeof label === "string"
          && label.length > 0,
      );

    result.set(
      assignment.reservationId,
      labels.join(" + "),
    );

    return result;
  }, new Map());
}

function mapFloorTable(
  table: FloorTable,
): V2PersistentReservationFloorTable {
  const isBlocked =
    table.status === "blocked"
    || table.status === "out_of_service";

  return {
    id: table.id,
    name: table.label,
    capacity: table.seats,
    status: isBlocked
      ? "blocked"
      : "available",
    locked: isBlocked,
  };
}

function mapService(
  service: BusinessServiceEditor,
): V2PersistentReservationService {
  return {
    id: service.id ?? "",
    name: service.name,
    durationMinutes: service.durationMinutes,
    capacity: service.capacity,
    price: service.price,
    isActive: service.isActive,
  };
}

function mapCustomer(
  customer: BusinessCustomerEditor,
): V2PersistentReservationCustomer {
  return {
    id: customer.id ?? "",
    fullName: customer.fullName,
    phone: customer.phone,
    email: customer.email,
    isActive: customer.isActive,
  };
}

export function buildV2ReservationsSnapshot({
  reservations,
  services,
  customers,
  businessHours,
  reservationSettings,
  floorPlan,
}: {
  reservations: BusinessReservationEditor[];
  services: BusinessServiceEditor[];
  customers: BusinessCustomerEditor[];
  businessHours: BusinessHourEditorDay[];
  reservationSettings:
    | ReservationSettingsEditor
    | null;
  floorPlan: FloorPlanReaderSnapshot;
}): V2ReservationsSnapshot {
  const tableNamesByReservationId =
    buildTableNamesByReservationId(floorPlan);

  return {
    initialReservations: reservations.map(
      (reservation) =>
        mapBusinessReservationToV2Draft(
          reservation,
          tableNamesByReservationId.get(
            reservation.id ?? "",
          ) ?? "",
        ),
    ),
    initialFloorTables:
      floorPlan.tables.map(mapFloorTable),
    initialLocalConfig: {
      businessHours,
      reservationEnabled:
        reservationSettings?.reservationEnabled
        ?? true,
      standardDurationMinutes:
        reservationSettings
          ?.standardDurationMinutes
        ?? 120,
      confirmationMode:
        reservationSettings?.confirmationMode
        ?? "manual",
      defaultReservationStatus:
        reservationSettings
          ?.defaultReservationStatus
        ?? "pending",
      minimumNoticeHours:
        reservationSettings?.minimumNoticeHours
        ?? 0,
      bookingWindowDays:
        reservationSettings?.bookingWindowDays
        ?? 14,
      maxPeoplePerSlot:
        reservationSettings?.maxPeoplePerSlot
        ?? 40,
      allowReservationsWithoutTable:
        reservationSettings
          ?.allowReservationsWithoutTable
        ?? true,
      autoAssignReservationTables:
        reservationSettings
          ?.autoAssignReservationTables
        ?? false,
      allowTableCombinations:
        reservationSettings
          ?.allowTableCombinations
        ?? false,
    },
    persistentServices:
      services.map(mapService),
    persistentCustomers:
      customers.map(mapCustomer),
  };
}
