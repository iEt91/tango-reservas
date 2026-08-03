export type ReservationConfirmationMode =
  | "manual"
  | "automatic";

export type ReservationDefaultStatus =
  | "pending"
  | "confirmed";

export type ReservationSettingsEditor = {
  reservationEnabled: boolean;
  standardDurationMinutes: number;
  confirmationMode: ReservationConfirmationMode;
  defaultReservationStatus: ReservationDefaultStatus;
  minimumNoticeHours: number;
  bookingWindowDays: number;
  maxPeoplePerSlot: number;
  allowReservationsWithoutTable: boolean;
  autoAssignReservationTables: boolean;
  allowTableCombinations: boolean;
};

export type ReservationSettingsDatabaseRow = {
  business_id: string;
  reservations_enabled: boolean;
  default_reservation_duration_minutes: number;
  requires_confirmation: boolean;
  min_notice_minutes: number;
  max_days_ahead: number;
  max_people_per_slot: number;
  allow_reservations_without_table: boolean;
  auto_assign_reservation_tables: boolean;
  allow_table_combinations: boolean;
  updated_at?: string | null;
};

export type ReservationSettingsRpcPayload = {
  reservations_enabled: boolean;
  default_reservation_duration_minutes: number;
  requires_confirmation: boolean;
  min_notice_minutes: number;
  max_days_ahead: number;
  max_people_per_slot: number;
  allow_reservations_without_table: boolean;
  auto_assign_reservation_tables: boolean;
  allow_table_combinations: boolean;
};

const ALLOWED_DURATIONS = new Set([
  60,
  90,
  120,
  150,
]);

function requiredBoolean(
  value: unknown,
  label: string,
) {
  if (typeof value !== "boolean") {
    throw new Error(`${label} es inválido.`);
  }

  return value;
}

function requiredNumber(
  value: unknown,
  label: string,
) {
  const numberValue = Number(value);

  if (!Number.isFinite(numberValue)) {
    throw new Error(`${label} es inválido.`);
  }

  return numberValue;
}

export function normalizeReservationSettingsEditor(
  value: unknown,
): ReservationSettingsEditor {
  if (!value || typeof value !== "object") {
    throw new Error("La configuración de reservas es inválida.");
  }

  const data = value as Record<string, unknown>;
  const reservationEnabled = requiredBoolean(
    data.reservationEnabled,
    "El estado de reservas online",
  );
  const standardDurationMinutes = requiredNumber(
    data.standardDurationMinutes,
    "La duración estándar",
  );
  const confirmationMode = data.confirmationMode;
  const defaultReservationStatus =
    data.defaultReservationStatus;
  const minimumNoticeHours = requiredNumber(
    data.minimumNoticeHours,
    "La anticipación mínima",
  );
  const bookingWindowDays = requiredNumber(
    data.bookingWindowDays,
    "Los días hacia adelante",
  );
  const maxPeoplePerSlot = requiredNumber(
    data.maxPeoplePerSlot,
    "La capacidad máxima",
  );

  if (!ALLOWED_DURATIONS.has(standardDurationMinutes)) {
    throw new Error("La duración estándar no está permitida.");
  }

  if (
    confirmationMode !== "manual"
    && confirmationMode !== "automatic"
  ) {
    throw new Error("El modo de confirmación es inválido.");
  }

  if (
    defaultReservationStatus !== "pending"
    && defaultReservationStatus !== "confirmed"
  ) {
    throw new Error("El estado inicial es inválido.");
  }

  const expectedStatus: ReservationDefaultStatus =
    confirmationMode === "automatic"
      ? "confirmed"
      : "pending";

  if (defaultReservationStatus !== expectedStatus) {
    throw new Error(
      "El estado inicial no coincide con el modo de confirmación.",
    );
  }

  if (
    minimumNoticeHours < 0
    || minimumNoticeHours > 168
    || !Number.isInteger(minimumNoticeHours * 2)
  ) {
    throw new Error(
      "La anticipación debe estar entre 0 y 168 horas en pasos de 30 minutos.",
    );
  }

  if (
    !Number.isInteger(bookingWindowDays)
    || bookingWindowDays < 1
    || bookingWindowDays > 365
  ) {
    throw new Error(
      "Los días hacia adelante deben estar entre 1 y 365.",
    );
  }

  if (
    !Number.isInteger(maxPeoplePerSlot)
    || maxPeoplePerSlot < 1
    || maxPeoplePerSlot > 1000
  ) {
    throw new Error(
      "La capacidad máxima debe estar entre 1 y 1000 personas.",
    );
  }

  return {
    reservationEnabled,
    standardDurationMinutes,
    confirmationMode,
    defaultReservationStatus,
    minimumNoticeHours,
    bookingWindowDays,
    maxPeoplePerSlot,
    allowReservationsWithoutTable: requiredBoolean(
      data.allowReservationsWithoutTable,
      "Permitir reservas sin mesa",
    ),
    autoAssignReservationTables: requiredBoolean(
      data.autoAssignReservationTables,
      "La asignación automática de mesa",
    ),
    allowTableCombinations: requiredBoolean(
      data.allowTableCombinations,
      "Permitir unir mesas",
    ),
  };
}

export function mapReservationSettingsRowToEditor(
  row: ReservationSettingsDatabaseRow,
): ReservationSettingsEditor {
  const confirmationMode = row.requires_confirmation
    ? "manual"
    : "automatic";

  return normalizeReservationSettingsEditor({
    reservationEnabled: row.reservations_enabled,
    standardDurationMinutes:
      row.default_reservation_duration_minutes,
    confirmationMode,
    defaultReservationStatus:
      confirmationMode === "automatic"
        ? "confirmed"
        : "pending",
    minimumNoticeHours: row.min_notice_minutes / 60,
    bookingWindowDays: row.max_days_ahead,
    maxPeoplePerSlot: row.max_people_per_slot,
    allowReservationsWithoutTable:
      row.allow_reservations_without_table,
    autoAssignReservationTables:
      row.auto_assign_reservation_tables,
    allowTableCombinations:
      row.allow_table_combinations,
  });
}

export function mergeReservationSettingsEditor(
  defaults: ReservationSettingsEditor,
  persisted: ReservationSettingsEditor | null | undefined,
) {
  return persisted ?? defaults;
}

export function toReservationSettingsRpcPayload(
  value: unknown,
): ReservationSettingsRpcPayload {
  const settings = normalizeReservationSettingsEditor(value);

  return {
    reservations_enabled: settings.reservationEnabled,
    default_reservation_duration_minutes:
      settings.standardDurationMinutes,
    requires_confirmation:
      settings.confirmationMode === "manual",
    min_notice_minutes: Math.round(
      settings.minimumNoticeHours * 60,
    ),
    max_days_ahead: settings.bookingWindowDays,
    max_people_per_slot: settings.maxPeoplePerSlot,
    allow_reservations_without_table:
      settings.allowReservationsWithoutTable,
    auto_assign_reservation_tables:
      settings.autoAssignReservationTables,
    allow_table_combinations:
      settings.allowTableCombinations,
  };
}
