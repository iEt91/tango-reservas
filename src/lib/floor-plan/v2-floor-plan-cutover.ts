import type {
  FloorPlanBackground,
  FloorTable,
} from "@/data/types";
import type {
  BusinessHourEditorDay,
} from "@/lib/configuration/business-hours-contract";
import type {
  ReservationSettingsEditor,
} from "@/lib/configuration/reservation-settings-contract";
import type {
  BusinessReservationTableAssignment,
} from "@/lib/floor-plan/business-floor-plan-contract";
import type {
  BusinessReservationEditor,
} from "@/lib/reservations/business-reservation-contract";

export type V2FloorPlanTableSnapshot = {
  id: string;
  name: string;
  capacity: number;
  status: "available" | "blocked";
  shape: "round" | "square" | "rectangle";
  zoneId: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  physicalStatus:
    | "available"
    | "blocked"
    | "out_of_service";
  cornerRadius: number;
  canJoin: boolean;
  reservationId?: string;
  reservationClient?: string;
  reservationTime?: string;
  note?: string;
  locked?: boolean;
};

export type V2FloorPlanReservationSnapshot = {
  id: string;
  date: string;
  time: string;
  client: string;
  people: number;
  phone: string;
  email: string;
  durationMinutes: number;
  tableName: string;
  note: string;
  status:
    | "pending"
    | "confirmed"
    | "completed"
    | "cancelled"
    | "no_show";
  seatedAt?: string;
  consumptionStartedAt?: string;
};

export type V2FloorPlanLocalConfigSnapshot = {
  businessHours: BusinessHourEditorDay[];
  reservationEnabled: boolean;
  standardDurationMinutes: number;
  bookingWindowDays: number;
  allowTableCombinations: boolean;
};

export type V2FloorPlanBackgroundSnapshot = {
  fit: "cover" | "contain" | "stretch" | "custom";
  scale: number;
  positionX: number;
  positionY: number;
  fade: number;
};

export type V2FloorPlanSnapshot = {
  initialTables: V2FloorPlanTableSnapshot[];
  initialReservations: V2FloorPlanReservationSnapshot[];
  initialLocalConfig: V2FloorPlanLocalConfigSnapshot;
  initialBackgroundImageUrl: string;
  initialBackgroundSettings: V2FloorPlanBackgroundSnapshot;
};

type FloorPlanReaderSnapshot = {
  tables: FloorTable[];
  settings: FloorPlanBackground;
  assignments: Array<
    Omit<
      BusinessReservationTableAssignment,
      "totalSeats"
    >
  >;
};

function clamp(
  value: number,
  minimum: number,
  maximum: number,
) {
  return Math.min(
    Math.max(Number(value) || 0, minimum),
    maximum,
  );
}

export function mapFloorTableToV2Snapshot(
  table: FloorTable,
): V2FloorPlanTableSnapshot {
  const physicalStatus =
    table.status === "blocked"
    || table.status === "out_of_service"
      ? table.status
      : "available";
  const isBlocked =
    physicalStatus !== "available";

  return {
    id: table.id,
    name: table.label,
    capacity: table.seats,
    status: isBlocked ? "blocked" : "available",
    shape: table.shape,
    zoneId: "main",
    x: table.x,
    y: table.y,
    width: table.width,
    height: table.height,
    rotation: table.rotation,
    physicalStatus,
    cornerRadius: table.cornerRadius,
    canJoin: table.isJoinable,
    note:
      table.status === "out_of_service"
        ? "Fuera de servicio."
        : table.status === "blocked"
          ? "Mesa bloqueada."
          : "",
    locked: isBlocked,
  };
}

function mapBackground(
  settings: FloorPlanBackground,
): Pick<
  V2FloorPlanSnapshot,
  | "initialBackgroundImageUrl"
  | "initialBackgroundSettings"
> {
  return {
    initialBackgroundImageUrl:
      settings.backgroundImage ?? "",
    initialBackgroundSettings: {
      fit: settings.fit,
      scale: 100,
      positionX: clamp(
        settings.backgroundX,
        0,
        100,
      ),
      positionY: clamp(
        settings.backgroundY,
        0,
        100,
      ),
      fade:
        100
        - clamp(
          settings.backgroundOpacity,
          0,
          100,
        ),
    },
  };
}

function mapReservations({
  reservations,
  assignments,
  tableLabelsById,
}: {
  reservations: BusinessReservationEditor[];
  assignments: FloorPlanReaderSnapshot["assignments"];
  tableLabelsById: Map<string, string>;
}): V2FloorPlanReservationSnapshot[] {
  const tableIdsByReservationId =
    assignments.reduce<Map<string, string[]>>(
      (result, assignment) => {
        const current =
          result.get(assignment.reservationId) ?? [];
        current.push(...assignment.tableIds);
        result.set(
          assignment.reservationId,
          [...new Set(current)].sort(),
        );

        return result;
      },
      new Map(),
    );

  return reservations.map((reservation) => {
    const reservationId = reservation.id ?? "";
    const tableName =
      (
        tableIdsByReservationId.get(
          reservationId,
        ) ?? []
      )
        .map((tableId) =>
          tableLabelsById.get(tableId),
        )
        .filter(
          (label): label is string =>
            typeof label === "string"
            && label.length > 0,
        )
        .join(" + ");

    return {
      id: reservationId,
      date: reservation.reservationDate,
      time: reservation.reservationTime,
      client: reservation.customerName,
      people: reservation.partySize,
      phone: reservation.customerPhone,
      email: reservation.customerEmail,
      durationMinutes:
        reservation.durationMinutes,
      tableName,
      note: reservation.notes || "—",
      status: reservation.status,
    };
  });
}

export function buildV2FloorPlanSnapshot({
  floorPlan,
  reservations,
  businessHours,
  reservationSettings,
}: {
  floorPlan: FloorPlanReaderSnapshot;
  reservations: BusinessReservationEditor[];
  businessHours: BusinessHourEditorDay[];
  reservationSettings:
    | ReservationSettingsEditor
    | null;
}): V2FloorPlanSnapshot {
  const initialTables =
    floorPlan.tables.map(mapFloorTableToV2Snapshot);
  const tableLabelsById = new Map(
    initialTables.map(
      (table) => [table.id, table.name],
    ),
  );
  const background = mapBackground(
    floorPlan.settings,
  );

  return {
    initialTables,
    initialReservations: mapReservations({
      reservations,
      assignments: floorPlan.assignments,
      tableLabelsById,
    }),
    initialLocalConfig: {
      businessHours,
      reservationEnabled:
        reservationSettings?.reservationEnabled
        ?? true,
      standardDurationMinutes:
        reservationSettings
          ?.standardDurationMinutes
        ?? 120,
      bookingWindowDays:
        reservationSettings?.bookingWindowDays
        ?? 14,
      allowTableCombinations:
        reservationSettings?.allowTableCombinations
        ?? false,
    },
    ...background,
  };
}
