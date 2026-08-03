import type { Service } from "@/data/types";
import { getSupabaseReadClient } from "@/lib/supabase/read-client";

export type SupabaseServiceRow = {
  id: string;
  business_id: string;
  name: string;
  description: string | null;
  duration_minutes: number | null;
  capacity: number | null;
  price: number | null;
  is_active: boolean;
  sort_order: number;
  created_at: string | null;
  updated_at: string | null;
};

type SupabaseServiceInput =
  Omit<Service, "id" | "businessId">;

const CHANGE_EVENT = "services";

function getSupabaseClientOrThrow() {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    throw new Error(
      "Faltan variables de entorno de Supabase.",
    );
  }

  return supabase;
}

function formatSupabaseServiceError(
  error: {
    message?: string | null;
    code?: string | null;
  } | Error | unknown,
) {
  const data =
    error && typeof error === "object"
      ? error as {
          message?: string | null;
          code?: string | null;
        }
      : null;
  const message =
    (
      error instanceof Error
        ? error.message
        : data?.message
    )?.trim()
    || "No se pudo leer el catálogo de servicios.";
  const code = data?.code?.trim();

  return new Error(
    code ? `${message} (${code})` : message,
  );
}

export function mapSupabaseServiceToService(
  row: SupabaseServiceRow,
): Service {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    description: row.description ?? "",
    durationMinutes: row.duration_minutes ?? 60,
    capacity: row.capacity ?? 1,
    price: row.price,
    isActive: row.is_active,
  };
}

async function readServices(businessId: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .schema("public")
    .from("services")
    .select(
      "id, business_id, name, description, duration_minutes, capacity, price, is_active, sort_order, created_at, updated_at",
    )
    .eq("business_id", businessId)
    .order("sort_order", { ascending: true })
    .order("name", { ascending: true });

  if (error) {
    throw formatSupabaseServiceError(error);
  }

  return (data ?? []) as SupabaseServiceRow[];
}

const servicesCache = new Map<string, Service[]>();
const loadedBusinesses = new Set<string>();
const loadingBusinesses =
  new Map<string, Promise<void>>();

function isBrowser() {
  return typeof window !== "undefined";
}

function cloneServices(services: Service[]) {
  return services.map((service) => ({ ...service }));
}

function dispatchChange() {
  if (isBrowser()) {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

function ensureLoaded(businessId: string) {
  if (
    !loadedBusinesses.has(businessId)
    && !loadingBusinesses.has(businessId)
  ) {
    void refreshSupabaseServicesForBusiness(businessId);
  }
}

export function subscribeSupabaseServices(
  listener: () => void,
) {
  if (!isBrowser()) {
    return () => {};
  }

  window.addEventListener(CHANGE_EVENT, listener);

  return () =>
    window.removeEventListener(CHANGE_EVENT, listener);
}

export async function refreshSupabaseServicesForBusiness(
  businessId: string,
) {
  if (!businessId) {
    return [];
  }

  const pending = loadingBusinesses.get(businessId);

  if (pending) {
    await pending;
    return cloneServices(
      servicesCache.get(businessId) ?? [],
    );
  }

  const promise = (async () => {
    const rows = await readServices(businessId);
    servicesCache.set(
      businessId,
      rows.map(mapSupabaseServiceToService),
    );
    loadedBusinesses.add(businessId);
    dispatchChange();
  })();

  loadingBusinesses.set(businessId, promise);

  try {
    await promise;
  } finally {
    loadingBusinesses.delete(businessId);
  }

  return cloneServices(
    servicesCache.get(businessId) ?? [],
  );
}

export async function getSupabaseServicesByBusiness(
  businessId: string,
) {
  await refreshSupabaseServicesForBusiness(businessId);
  return getSupabaseServicesByBusinessSync(businessId);
}

export function getSupabaseServicesByBusinessSync(
  businessId: string,
) {
  ensureLoaded(businessId);
  return cloneServices(
    servicesCache.get(businessId) ?? [],
  );
}

function writeRequiresServerAction(): never {
  throw new Error(
    "Las escrituras de servicios requieren una Server Action autenticada.",
  );
}

export async function createSupabaseService(
  businessId: string,
  data: SupabaseServiceInput,
) {
  void businessId;
  void data;
  return writeRequiresServerAction();
}

export async function updateSupabaseService(
  serviceId: string,
  data: SupabaseServiceInput,
) {
  void serviceId;
  void data;
  return writeRequiresServerAction();
}

export async function deleteSupabaseService(
  serviceId: string,
) {
  void serviceId;
  throw new Error(
    "Los servicios con historial no se eliminan: deben desactivarse mediante una Server Action.",
  );
}

export async function setSupabaseServiceActive(
  serviceId: string,
  isActive: boolean,
) {
  void serviceId;
  void isActive;
  return writeRequiresServerAction();
}
