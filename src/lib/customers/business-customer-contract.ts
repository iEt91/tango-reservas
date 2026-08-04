export type BusinessCustomerEditor = {
  id?: string | null;
  fullName: string;
  email: string;
  phone: string;
  birthDate: string;
  internalNotes: string;
  preferences: string;
  tags: string[];
  isActive: boolean;
};

export type BusinessCustomerDatabaseRow = {
  id: string;
  business_id: string;
  full_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  notes: string | null;
  preferences: string;
  tags: unknown;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

export type BusinessCustomerRpcPayload = {
  full_name: string;
  email: string | null;
  phone: string | null;
  birth_date: string | null;
  notes: string | null;
  preferences: string;
  tags: string[];
};

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/u;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/u;

export function normalizeCustomerId(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
    throw new Error("El identificador del cliente es inválido.");
  }

  return value;
}

function normalizeTags(value: unknown) {
  if (value === null || value === undefined) {
    return [];
  }

  if (!Array.isArray(value)) {
    throw new Error("Las etiquetas del cliente son inválidas.");
  }

  if (value.length > 30) {
    throw new Error("El cliente no puede tener más de 30 etiquetas.");
  }

  const normalized = value.map((entry) => {
    if (typeof entry !== "string") {
      throw new Error("Cada etiqueta debe ser texto.");
    }

    const tag = entry.trim();

    if (tag.length < 1 || tag.length > 60) {
      throw new Error(
        "Cada etiqueta debe tener entre 1 y 60 caracteres.",
      );
    }

    return tag;
  });

  return [...new Set(normalized)];
}

function normalizeBirthDate(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "";
  }

  if (typeof value !== "string" || !DATE_PATTERN.test(value)) {
    throw new Error("La fecha de nacimiento es inválida.");
  }

  const parsed = new Date(`${value}T00:00:00Z`);

  if (
    Number.isNaN(parsed.getTime())
    || parsed.toISOString().slice(0, 10) !== value
  ) {
    throw new Error("La fecha de nacimiento es inválida.");
  }

  const minimum = new Date("1900-01-01T00:00:00Z");
  const today = new Date();
  const todayKey = [
    today.getUTCFullYear(),
    String(today.getUTCMonth() + 1).padStart(2, "0"),
    String(today.getUTCDate()).padStart(2, "0"),
  ].join("-");

  if (parsed < minimum || value > todayKey) {
    throw new Error(
      "La fecha de nacimiento está fuera del rango permitido.",
    );
  }

  return value;
}

export function normalizeBusinessCustomer(
  value: unknown,
): BusinessCustomerEditor {
  if (!value || typeof value !== "object") {
    throw new Error("El cliente es inválido.");
  }

  const data = value as Record<string, unknown>;
  const fullName =
    typeof data.fullName === "string"
      ? data.fullName.trim()
      : "";
  const email =
    typeof data.email === "string"
      ? data.email.trim().toLowerCase()
      : "";
  const phone =
    typeof data.phone === "string"
      ? data.phone.replace(/\D/g, "")
      : "";
  const internalNotes =
    typeof data.internalNotes === "string"
      ? data.internalNotes.trim()
      : "";
  const preferences =
    typeof data.preferences === "string"
      ? data.preferences.trim()
      : "";

  if (fullName.length < 1 || fullName.length > 160) {
    throw new Error(
      "El nombre debe tener entre 1 y 160 caracteres.",
    );
  }

  if (
    email.length > 0
    && (email.length > 320 || !EMAIL_PATTERN.test(email))
  ) {
    throw new Error("El correo electrónico es inválido.");
  }

  if (phone.length > 40) {
    throw new Error("El teléfono es inválido.");
  }

  if (internalNotes.length > 4000) {
    throw new Error(
      "Las notas internas no pueden superar 4000 caracteres.",
    );
  }

  if (preferences.length > 2000) {
    throw new Error(
      "Las preferencias no pueden superar 2000 caracteres.",
    );
  }

  if (typeof data.isActive !== "boolean") {
    throw new Error("El estado del cliente es inválido.");
  }

  return {
    id: normalizeCustomerId(data.id),
    fullName,
    email,
    phone,
    birthDate: normalizeBirthDate(data.birthDate),
    internalNotes,
    preferences,
    tags: normalizeTags(data.tags),
    isActive: data.isActive,
  };
}

export function mapBusinessCustomerRow(
  row: BusinessCustomerDatabaseRow,
): BusinessCustomerEditor {
  return normalizeBusinessCustomer({
    id: row.id,
    fullName: row.full_name,
    email: row.email ?? "",
    phone: row.phone ?? "",
    birthDate: row.birth_date ?? "",
    internalNotes: row.notes ?? "",
    preferences: row.preferences ?? "",
    tags: Array.isArray(row.tags) ? row.tags : [],
    isActive: row.is_active,
  });
}

export function toBusinessCustomerRpcPayload(
  value: unknown,
): BusinessCustomerRpcPayload {
  const customer = normalizeBusinessCustomer(value);

  return {
    full_name: customer.fullName,
    email: customer.email || null,
    phone: customer.phone || null,
    birth_date: customer.birthDate || null,
    notes: customer.internalNotes || null,
    preferences: customer.preferences,
    tags: customer.tags,
  };
}
