import type {
  Customer,
  CustomerNote,
  Reservation,
  ReservationStatus,
} from "@/data/types";
import { safeIsoFromDateTime } from "@/lib/date-time";
import { getSupabaseReservationsByBusinessSync } from "@/lib/data/supabase/reservations";
import { getSupabaseReadClient } from "@/lib/supabase/read-client";

export type SupabaseCustomerRow = {
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

export type SupabaseCustomerInput = {
  name: string;
  phone: string;
  email?: string | null;
  birthDate?: string | null;
  internalNotes?: string | null;
  preferences?: string | null;
  tags?: string[] | null;
};

type SupabaseCustomerNoteInput = {
  note: string;
};

const CUSTOMER_SELECT =
  "id, business_id, full_name, email, phone, birth_date, notes, preferences, tags, is_active, created_at, updated_at" as const;
const CHANGE_EVENT = "crm";
const ACTIVE_RESERVATION_STATUSES: ReservationStatus[] = [
  "pending",
  "confirmed",
];

const customersCache = new Map<string, Customer[]>();
const loadedBusinesses = new Set<string>();
const loadingBusinesses =
  new Map<string, Promise<void>>();

function isBrowser() {
  return typeof window !== "undefined";
}

function getSupabaseClientOrThrow() {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    throw new Error(
      "Faltan variables de entorno de Supabase.",
    );
  }

  return supabase;
}

function normalizePhone(value?: string | null) {
  return (value ?? "").replace(/\D/g, "");
}

function parseTags(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(
      (entry): entry is string =>
        typeof entry === "string",
    )
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function reservationTimestamp(
  reservation: Pick<
    Reservation,
    "reservationDate" | "reservationTime"
  >,
) {
  const iso = safeIsoFromDateTime(
    reservation.reservationDate,
    reservation.reservationTime,
  );

  if (!iso) {
    return Number.NaN;
  }

  return new Date(iso).getTime();
}

function reservationIso(
  reservation: Pick<
    Reservation,
    "reservationDate" | "reservationTime"
  >,
) {
  return safeIsoFromDateTime(
    reservation.reservationDate,
    reservation.reservationTime,
  );
}

function countStatus(
  reservations: Reservation[],
  status: ReservationStatus,
) {
  return reservations.filter(
    (reservation) => reservation.status === status,
  ).length;
}

function reservationsForRow(row: SupabaseCustomerRow) {
  const normalizedPhone = normalizePhone(row.phone);

  return getSupabaseReservationsByBusinessSync(
    row.business_id,
  ).filter((reservation) => {
    if (reservation.businessId !== row.business_id) {
      return false;
    }

    if (reservation.customerId === row.id) {
      return true;
    }

    return (
      normalizedPhone.length > 0
      && normalizePhone(reservation.customerPhone)
        === normalizedPhone
    );
  });
}

export function mapSupabaseCustomerToCustomer(
  row: SupabaseCustomerRow,
): Customer {
  const reservations = reservationsForRow(row);
  const sorted = [...reservations].sort(
    (left, right) => {
      const leftTime = reservationTimestamp(left);
      const rightTime = reservationTimestamp(right);
      const safeLeft = Number.isNaN(leftTime)
        ? Number.NEGATIVE_INFINITY
        : leftTime;
      const safeRight = Number.isNaN(rightTime)
        ? Number.NEGATIVE_INFINITY
        : rightTime;

      return safeRight - safeLeft;
    },
  );
  const latest = sorted[0] ?? null;
  const next = [...reservations]
    .filter(
      (reservation) =>
        ACTIVE_RESERVATION_STATUSES.includes(
          reservation.status,
        )
        && reservationTimestamp(reservation) >= Date.now(),
    )
    .sort(
      (left, right) =>
        reservationTimestamp(left)
        - reservationTimestamp(right),
    )[0] ?? null;
  const normalizedPhone = normalizePhone(row.phone);
  const customerKey = normalizedPhone
    ? `phone:${normalizedPhone}`
    : row.email
      ? `email:${row.email.toLowerCase()}`
      : `id:${row.id}`;

  return {
    id: row.id,
    customerKey,
    businessId: row.business_id,
    name: row.full_name,
    phone: row.phone ?? "",
    email: row.email,
    totalReservations: reservations.length,
    confirmedReservations: countStatus(
      reservations,
      "confirmed",
    ),
    cancelledReservations: countStatus(
      reservations,
      "cancelled",
    ),
    completedReservations: countStatus(
      reservations,
      "completed",
    ),
    noShowReservations: countStatus(
      reservations,
      "no_show",
    ),
    lastReservationAt:
      (latest ? reservationIso(latest) : null)
      ?? row.created_at,
    nextReservationAt:
      next ? reservationIso(next) : null,
    tags: parseTags(row.tags),
    notes: row.notes ?? "",
    preferences: row.preferences ?? "",
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function cloneCustomer(customer: Customer) {
  return {
    ...customer,
    tags: [...customer.tags],
  };
}

function cloneCustomers(customers: Customer[]) {
  return customers.map(cloneCustomer);
}

function dispatchChange() {
  if (isBrowser()) {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

async function readCustomersByBusiness(
  businessId: string,
) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_SELECT)
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("updated_at", { ascending: false })
    .order("full_name", { ascending: true });

  if (error) {
    throw new Error(
      "No se pudieron leer los clientes del negocio.",
    );
  }

  return (data ?? []) as SupabaseCustomerRow[];
}

async function readCustomerById(customerId: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .from("customers")
    .select(CUSTOMER_SELECT)
    .eq("id", customerId)
    .eq("is_active", true)
    .maybeSingle();

  if (error) {
    throw new Error("No se pudo leer el cliente.");
  }

  return data as SupabaseCustomerRow | null;
}

async function refreshBusinessCustomers(
  businessId: string,
) {
  const rows = await readCustomersByBusiness(businessId);

  customersCache.set(
    businessId,
    rows.map(mapSupabaseCustomerToCustomer),
  );
  loadedBusinesses.add(businessId);
  dispatchChange();
}

function ensureLoaded(businessId: string) {
  if (
    !loadedBusinesses.has(businessId)
    && !loadingBusinesses.has(businessId)
  ) {
    void refreshSupabaseCustomersForBusiness(businessId);
  }
}

export function subscribeSupabaseCRM(
  listener: () => void,
) {
  if (!isBrowser()) {
    return () => {};
  }

  window.addEventListener(CHANGE_EVENT, listener);

  return () =>
    window.removeEventListener(CHANGE_EVENT, listener);
}

export async function refreshSupabaseCustomersForBusiness(
  businessId: string,
) {
  const pending = loadingBusinesses.get(businessId);

  if (pending) {
    await pending;
    return cloneCustomers(
      customersCache.get(businessId) ?? [],
    );
  }

  const promise = refreshBusinessCustomers(businessId);
  loadingBusinesses.set(businessId, promise);

  try {
    await promise;
  } finally {
    loadingBusinesses.delete(businessId);
  }

  return cloneCustomers(
    customersCache.get(businessId) ?? [],
  );
}

export function getSupabaseCustomersByBusinessSync(
  businessId: string,
) {
  ensureLoaded(businessId);

  return cloneCustomers(
    customersCache.get(businessId) ?? [],
  );
}

export async function getSupabaseCustomersByBusiness(
  businessId: string,
) {
  await refreshSupabaseCustomersForBusiness(businessId);
  return getSupabaseCustomersByBusinessSync(businessId);
}

export async function getSupabaseCustomerById(
  customerId: string,
) {
  const row = await readCustomerById(customerId);
  return row ? mapSupabaseCustomerToCustomer(row) : null;
}

export function getSupabaseCustomerByIdSync(
  customerId: string,
) {
  for (const customers of customersCache.values()) {
    const found = customers.find(
      (customer) => customer.id === customerId,
    );

    if (found) {
      return cloneCustomer(found);
    }
  }

  return null;
}

export async function getSupabaseCustomerByPhone(
  businessId: string,
  phone: string,
) {
  const normalized = normalizePhone(phone);

  if (!normalized) {
    return null;
  }

  const customers =
    await getSupabaseCustomersByBusiness(businessId);

  return customers.find(
    (customer) =>
      normalizePhone(customer.phone) === normalized,
  ) ?? null;
}

export function getSupabaseCustomerByPhoneSync(
  businessId: string,
  phone: string,
) {
  const normalized = normalizePhone(phone);

  if (!normalized) {
    return null;
  }

  return getSupabaseCustomersByBusinessSync(
    businessId,
  ).find(
    (customer) =>
      normalizePhone(customer.phone) === normalized,
  ) ?? null;
}

export function mapCustomerInputToSupabaseRow(
  data: SupabaseCustomerInput,
) {
  return {
    full_name: data.name.trim(),
    email: data.email?.trim().toLowerCase() || null,
    phone: normalizePhone(data.phone) || null,
    birth_date: data.birthDate?.trim() || null,
    notes: data.internalNotes?.trim() || null,
    preferences: data.preferences?.trim() || "",
    tags: Array.isArray(data.tags) ? data.tags : [],
  };
}

export function mapSupabaseCustomerNoteToCustomerNote(
  row: {
    id: string;
    customer_id: string;
    note: string;
    created_at: string;
    updated_at: string;
  },
): CustomerNote {
  return {
    id: row.id,
    customerId: row.customer_id,
    note: row.note,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCustomerNoteInputToSupabaseRow(
  data: SupabaseCustomerNoteInput,
) {
  return {
    note: data.note.trim(),
  };
}

function writeRequiresServerAction(): never {
  throw new Error(
    "Las escrituras de clientes requieren una Server Action autenticada.",
  );
}

export async function createSupabaseCustomer(
  businessId: string,
  data: SupabaseCustomerInput,
) {
  void businessId;
  void data;
  return writeRequiresServerAction();
}

export async function updateSupabaseCustomer(
  customerId: string,
  data: Partial<SupabaseCustomerInput>,
) {
  void customerId;
  void data;
  return writeRequiresServerAction();
}

export async function deleteSupabaseCustomer(
  customerId: string,
) {
  void customerId;
  throw new Error(
    "Los clientes no se eliminan físicamente: deben archivarse mediante una Server Action.",
  );
}

export async function getSupabaseCustomerNotes(
  customerId: string,
) {
  void customerId;
  return [] as CustomerNote[];
}

export async function createSupabaseCustomerNote(
  customerId: string,
  note: string,
) {
  void customerId;
  void note;
  return writeRequiresServerAction();
}

export async function updateSupabaseCustomerNote(
  noteId: string,
  note: string,
) {
  void noteId;
  void note;
  return writeRequiresServerAction();
}

export async function deleteSupabaseCustomerNote(
  noteId: string,
) {
  void noteId;
  return writeRequiresServerAction();
}

export function getSupabaseCustomerNotesSync(
  customerId: string,
) {
  void customerId;
  return [] as CustomerNote[];
}

export async function refreshSupabaseCustomerNotes(
  customerId: string,
) {
  void customerId;
  return [] as CustomerNote[];
}
