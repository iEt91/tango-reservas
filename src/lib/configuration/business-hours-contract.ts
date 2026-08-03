export const BUSINESS_HOUR_DAYS = [
  { key: "monday", label: "Lunes" },
  { key: "tuesday", label: "Martes" },
  { key: "wednesday", label: "Miércoles" },
  { key: "thursday", label: "Jueves" },
  { key: "friday", label: "Viernes" },
  { key: "saturday", label: "Sábado" },
  { key: "sunday", label: "Domingo" },
] as const;

export type BusinessHourDayKey =
  (typeof BUSINESS_HOUR_DAYS)[number]["key"];

export type BusinessHourEditorSlot = {
  open: string;
  close: string;
};

export type BusinessHourEditorDay = {
  day: string;
  open: string;
  close: string;
  enabled: boolean;
  slots: BusinessHourEditorSlot[];
};

export type BusinessHourDatabaseRow = {
  id?: string;
  business_id: string;
  day_of_week: string;
  is_open: boolean;
  open_time: string;
  close_time: string;
  break_start_time: string | null;
  break_end_time: string | null;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BusinessHourRpcRow = {
  day_of_week: BusinessHourDayKey;
  is_open: boolean;
  open_time: string;
  close_time: string;
  break_start_time: string | null;
  break_end_time: string | null;
};

const TIME_PATTERN = /^(?:[01][0-9]|2[0-3]):(?:00|30)$/u;
type BusinessHourDayDefinition =
  (typeof BUSINESS_HOUR_DAYS)[number];

const DAY_BY_LABEL = new Map<
  string,
  BusinessHourDayDefinition
>(
  BUSINESS_HOUR_DAYS.map(
    (day) => [day.label, day] as const,
  ),
);
const DAY_BY_KEY = new Map(
  BUSINESS_HOUR_DAYS.map((day) => [day.key, day]),
);

function normalizeTime(value: unknown, field: string) {
  if (typeof value !== "string" || !TIME_PATTERN.test(value)) {
    throw new Error(
      `${field} debe usar intervalos de 30 minutos.`,
    );
  }

  return value;
}

function timeToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function assertChronologicalSlots(
  day: string,
  slots: BusinessHourEditorSlot[],
) {
  const firstStart = timeToMinutes(slots[0].open);
  let firstEnd = timeToMinutes(slots[0].close);

  if (firstEnd <= firstStart) {
    firstEnd += 1440;
  }

  if (firstEnd - firstStart > 1440) {
    throw new Error(`El horario de ${day} supera 24 horas.`);
  }

  if (slots.length === 1) {
    return;
  }

  let secondStart = timeToMinutes(slots[1].open);
  let secondEnd = timeToMinutes(slots[1].close);

  while (secondStart <= firstStart) {
    secondStart += 1440;
  }

  while (secondEnd <= secondStart) {
    secondEnd += 1440;
  }

  if (firstEnd >= secondStart) {
    throw new Error(
      `Los tramos de ${day} se superponen o no tienen pausa.`,
    );
  }

  if (secondEnd - firstStart > 1440) {
    throw new Error(`El horario de ${day} supera 24 horas.`);
  }
}

function normalizeEditorDay(value: unknown): BusinessHourEditorDay {
  if (!value || typeof value !== "object") {
    throw new Error("Cada día debe ser un objeto válido.");
  }

  const data = value as Record<string, unknown>;
  const day = typeof data.day === "string" ? data.day : "";
  const definition = DAY_BY_LABEL.get(day);

  if (!definition) {
    throw new Error(`Día de la semana inválido: ${day || "vacío"}.`);
  }

  if (typeof data.enabled !== "boolean") {
    throw new Error(`El estado de ${day} es inválido.`);
  }

  if (!Array.isArray(data.slots)) {
    throw new Error(`Los tramos de ${day} son inválidos.`);
  }

  if (data.slots.length < 1 || data.slots.length > 2) {
    throw new Error(`${day} debe tener uno o dos tramos.`);
  }

  const slots = data.slots.map((slot, index) => {
    if (!slot || typeof slot !== "object") {
      throw new Error(`El tramo ${index + 1} de ${day} es inválido.`);
    }

    const entry = slot as Record<string, unknown>;

    return {
      open: normalizeTime(
        entry.open,
        `La apertura del tramo ${index + 1} de ${day}`,
      ),
      close: normalizeTime(
        entry.close,
        `El cierre del tramo ${index + 1} de ${day}`,
      ),
    };
  });

  if (data.enabled) {
    assertChronologicalSlots(day, slots);
  }

  return {
    day: definition.label,
    enabled: data.enabled,
    open: slots[0].open,
    close: slots[0].close,
    slots,
  };
}

export function normalizeBusinessHoursEditor(
  value: unknown,
): BusinessHourEditorDay[] {
  if (!Array.isArray(value) || value.length !== 7) {
    throw new Error("Deben enviarse exactamente siete días.");
  }

  const normalized = value.map(normalizeEditorDay);
  const labels = new Set(normalized.map((day) => day.day));

  if (labels.size !== 7) {
    throw new Error("Los días de la semana no pueden repetirse.");
  }

  return BUSINESS_HOUR_DAYS.map((day) => {
    const match = normalized.find((entry) => entry.day === day.label);

    if (!match) {
      throw new Error(`Falta ${day.label}.`);
    }

    return match;
  });
}

function normalizeDatabaseTime(value: string) {
  const normalized = value.slice(0, 5);

  if (!TIME_PATTERN.test(normalized)) {
    throw new Error("Supabase devolvió un horario inválido.");
  }

  return normalized;
}

export function mapBusinessHourRowsToEditor(
  rows: BusinessHourDatabaseRow[],
): BusinessHourEditorDay[] {
  return rows.flatMap((row) => {
    const definition = DAY_BY_KEY.get(
      row.day_of_week as BusinessHourDayKey,
    );

    if (!definition) {
      return [];
    }

    const firstSlot = {
      open: normalizeDatabaseTime(row.open_time),
      close: normalizeDatabaseTime(
        row.break_start_time ?? row.close_time,
      ),
    };
    const slots = row.break_start_time && row.break_end_time
      ? [
          firstSlot,
          {
            open: normalizeDatabaseTime(row.break_end_time),
            close: normalizeDatabaseTime(row.close_time),
          },
        ]
      : [firstSlot];

    return [
      {
        day: definition.label,
        enabled: row.is_open,
        open: firstSlot.open,
        close: firstSlot.close,
        slots,
      },
    ];
  }).sort((left, right) => (
    BUSINESS_HOUR_DAYS.findIndex((day) => day.label === left.day)
    - BUSINESS_HOUR_DAYS.findIndex((day) => day.label === right.day)
  ));
}

export function mergeBusinessHoursEditor(
  defaults: BusinessHourEditorDay[],
  persisted: BusinessHourEditorDay[] | null | undefined,
) {
  if (!persisted || persisted.length === 0) {
    return defaults;
  }

  const persistedByDay = new Map(
    persisted.map((day) => [day.day, day]),
  );

  return defaults.map((day) => (
    persistedByDay.get(day.day) ?? day
  ));
}

export function toBusinessHoursRpcPayload(
  value: unknown,
): BusinessHourRpcRow[] {
  return normalizeBusinessHoursEditor(value).map((day) => {
    const definition = DAY_BY_LABEL.get(day.day);

    if (!definition) {
      throw new Error(`Día inválido: ${day.day}.`);
    }

    const firstSlot = day.slots[0];
    const secondSlot = day.slots[1] ?? null;

    return {
      day_of_week: definition.key,
      is_open: day.enabled,
      open_time: firstSlot.open,
      close_time: secondSlot?.close ?? firstSlot.close,
      break_start_time: secondSlot ? firstSlot.close : null,
      break_end_time: secondSlot ? secondSlot.open : null,
    };
  });
}
