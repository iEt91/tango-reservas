export type BusinessServiceEditor = {
  id?: string | null;
  name: string;
  description: string;
  durationMinutes: number;
  capacity: number;
  price: number | null;
  isActive: boolean;
  sortOrder?: number;
};

export type BusinessServiceDatabaseRow = {
  id: string;
  business_id: string;
  name: string;
  description: string;
  duration_minutes: number;
  capacity: number;
  price: number | string | null;
  is_active: boolean;
  sort_order: number;
  created_at?: string | null;
  updated_at?: string | null;
};

export type BusinessServiceRpcPayload = {
  name: string;
  description: string;
  duration_minutes: number;
  capacity: number;
  price: number | null;
  is_active: boolean;
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export function normalizeServiceId(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new Error("El identificador del servicio es inválido.");
  }

  return value;
}

function finiteNumber(value: unknown, label: string) {
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(`${label} es inválido.`);
  }

  return parsed;
}

export function normalizeBusinessService(
  value: unknown,
): BusinessServiceEditor {
  if (!value || typeof value !== "object") {
    throw new Error("El servicio es inválido.");
  }

  const data = value as Record<string, unknown>;
  const name =
    typeof data.name === "string" ? data.name.trim() : "";
  const description =
    typeof data.description === "string"
      ? data.description.trim()
      : "";
  const durationMinutes = finiteNumber(
    data.durationMinutes,
    "La duración",
  );
  const capacity = finiteNumber(
    data.capacity,
    "La capacidad",
  );
  const rawPrice = data.price;
  const price =
    rawPrice === null
    || rawPrice === undefined
    || rawPrice === ""
      ? null
      : finiteNumber(rawPrice, "El precio");

  if (name.length < 1 || name.length > 120) {
    throw new Error(
      "El nombre debe tener entre 1 y 120 caracteres.",
    );
  }

  if (description.length > 1000) {
    throw new Error(
      "La descripción no puede superar 1000 caracteres.",
    );
  }

  if (
    !Number.isInteger(durationMinutes)
    || durationMinutes < 15
    || durationMinutes > 1440
    || durationMinutes % 15 !== 0
  ) {
    throw new Error(
      "La duración debe estar entre 15 y 1440 minutos en pasos de 15.",
    );
  }

  if (
    !Number.isInteger(capacity)
    || capacity < 1
    || capacity > 1000
  ) {
    throw new Error(
      "La capacidad debe estar entre 1 y 1000.",
    );
  }

  if (
    price !== null
    && (
      price < 0
      || price > 99999999.99
    )
  ) {
    throw new Error(
      "El precio debe estar entre 0 y 99.999.999,99.",
    );
  }

  if (typeof data.isActive !== "boolean") {
    throw new Error("El estado del servicio es inválido.");
  }

  return {
    id: normalizeServiceId(data.id),
    name,
    description,
    durationMinutes,
    capacity,
    price:
      price === null
        ? null
        : Math.round(price * 100) / 100,
    isActive: data.isActive,
    sortOrder:
      typeof data.sortOrder === "number"
        ? data.sortOrder
        : undefined,
  };
}

export function mapBusinessServiceRow(
  row: BusinessServiceDatabaseRow,
): BusinessServiceEditor {
  return normalizeBusinessService({
    id: row.id,
    name: row.name,
    description: row.description,
    durationMinutes: row.duration_minutes,
    capacity: row.capacity,
    price: row.price,
    isActive: row.is_active,
    sortOrder: row.sort_order,
  });
}

export function toBusinessServiceRpcPayload(
  value: unknown,
): BusinessServiceRpcPayload {
  const service = normalizeBusinessService(value);

  return {
    name: service.name,
    description: service.description,
    duration_minutes: service.durationMinutes,
    capacity: service.capacity,
    price: service.price,
    is_active: service.isActive,
  };
}
