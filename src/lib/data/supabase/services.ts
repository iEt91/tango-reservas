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

type SupabaseServiceInput = Omit<Service, "id" | "businessId">;
const CHANGE_EVENT = "services";

function getSupabaseClientOrThrow() {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    throw new Error("Faltan variables de entorno de Supabase.");
  }

  return supabase;
}

function formatSupabaseServiceError(
  table: string,
  error: {
    message?: string | null;
    code?: string | null;
    details?: string | null;
    hint?: string | null;
  } | Error | unknown,
) {
  const data =
    error && typeof error === "object"
      ? (error as {
          message?: string | null;
          code?: string | null;
          details?: string | null;
          hint?: string | null;
        })
      : null;

  const message =
    (error instanceof Error ? error.message : data?.message)?.trim() || "No se pudo completar la operación.";
  const code = data?.code?.trim();
  const details = data?.details?.trim();
  const hint = data?.hint?.trim();

  const parts = [`Falló ${table}: ${message}`];

  if (code) parts.push(`Code: ${code}`);
  if (details) parts.push(`Details: ${details}`);
  if (hint) parts.push(`Hint: ${hint}`);

  return new Error(parts.join(". "));
}

function nextSortOrder(services: SupabaseServiceRow[]) {
  return services.reduce((max, service) => Math.max(max, service.sort_order), -1) + 1;
}

export function mapSupabaseServiceToService(row: SupabaseServiceRow): Service {
  return {
    id: row.id,
    businessId: row.business_id,
    name: row.name,
    description: row.description ?? "",
    durationMinutes: row.duration_minutes ?? 60,
    capacity: row.capacity ?? 0,
    price: row.price,
    isActive: row.is_active,
  };
}

export function mapServiceInputToSupabaseRow(
  data: SupabaseServiceInput,
  options: { businessId: string; sortOrder: number },
) {
  return {
    business_id: options.businessId,
    name: data.name.trim(),
    description: data.description.trim() || null,
    duration_minutes: data.durationMinutes,
    capacity: data.capacity,
    price: data.price ?? null,
    is_active: data.isActive,
    sort_order: options.sortOrder,
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
    throw formatSupabaseServiceError("services", error);
  }

  return (data ?? []) as SupabaseServiceRow[];
}

let servicesCache = new Map<string, Service[]>();
let loadedBusinesses = new Set<string>();
let loadingBusinesses = new Map<string, Promise<void>>();

function isBrowser() {
  return typeof window !== "undefined";
}

function cloneService(service: Service) {
  return { ...service };
}

function cloneServices(services: Service[]) {
  return services.map(cloneService);
}

function dispatchChange() {
  if (!isBrowser()) {
    return;
  }

  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function ensureLoaded(businessId: string) {
  if (!loadedBusinesses.has(businessId) && !loadingBusinesses.has(businessId)) {
    void refreshSupabaseServicesForBusiness(businessId);
  }
}

export function subscribeSupabaseServices(listener: () => void) {
  if (!isBrowser()) {
    return () => {};
  }

  const handleChange = () => listener();
  window.addEventListener(CHANGE_EVENT, handleChange);
  return () => window.removeEventListener(CHANGE_EVENT, handleChange);
}

export async function refreshSupabaseServicesForBusiness(businessId: string) {
  if (!businessId) {
    return [];
  }

  if (loadingBusinesses.has(businessId)) {
    await loadingBusinesses.get(businessId);
    return cloneServices(servicesCache.get(businessId) ?? []);
  }

  const promise = (async () => {
    const rows = await readServices(businessId);
    const mapped = rows.map(mapSupabaseServiceToService);
    servicesCache.set(businessId, mapped);
    loadedBusinesses.add(businessId);
    dispatchChange();
  })();

  loadingBusinesses.set(businessId, promise);

  try {
    await promise;
  } finally {
    loadingBusinesses.delete(businessId);
  }

  return cloneServices(servicesCache.get(businessId) ?? []);
}

function normalizeServiceInput(data: Partial<SupabaseServiceInput> & Pick<SupabaseServiceInput, "name" | "durationMinutes" | "capacity" | "isActive">): SupabaseServiceInput {
  return {
    name: data.name,
    description: data.description ?? "",
    durationMinutes: data.durationMinutes,
    capacity: data.capacity,
    price: data.price ?? null,
    isActive: data.isActive,
  };
}

export async function getSupabaseServicesByBusiness(businessId: string) {
  await refreshSupabaseServicesForBusiness(businessId);
  return getSupabaseServicesByBusinessSync(businessId);
}

export function getSupabaseServicesByBusinessSync(businessId: string) {
  ensureLoaded(businessId);
  return cloneServices(servicesCache.get(businessId) ?? []);
}

export async function createSupabaseService(
  businessId: string,
  data: Partial<SupabaseServiceInput> & Pick<SupabaseServiceInput, "name" | "durationMinutes" | "capacity" | "isActive">,
) {
  const supabase = getSupabaseClientOrThrow();
  const rows = await readServices(businessId);
  const row = mapServiceInputToSupabaseRow(normalizeServiceInput(data), {
    businessId,
    sortOrder: nextSortOrder(rows),
  });

  const { data: inserted, error } = await supabase
    .schema("public")
    .from("services")
    .insert(row)
    .select(
      "id, business_id, name, description, duration_minutes, capacity, price, is_active, sort_order, created_at, updated_at",
    )
    .single();

  if (error) {
    throw formatSupabaseServiceError("services", error);
  }

  await refreshSupabaseServicesForBusiness(businessId);
  return mapSupabaseServiceToService(inserted as SupabaseServiceRow);
}

export async function updateSupabaseService(
  serviceId: string,
  data: Partial<SupabaseServiceInput> & Pick<SupabaseServiceInput, "name" | "durationMinutes" | "capacity" | "isActive">,
) {
  const supabase = getSupabaseClientOrThrow();
  const { data: current, error: readError } = await supabase
    .schema("public")
    .from("services")
    .select(
      "id, business_id, name, description, duration_minutes, capacity, price, is_active, sort_order, created_at, updated_at",
    )
    .eq("id", serviceId)
    .maybeSingle();

  if (readError) {
    throw formatSupabaseServiceError("services", readError);
  }

  if (!current) {
    throw new Error("No se encontró el servicio para actualizar.");
  }

  const currentRow = current as SupabaseServiceRow;
  const row = mapServiceInputToSupabaseRow(normalizeServiceInput(data), {
    businessId: currentRow.business_id,
    sortOrder: currentRow.sort_order,
  });

  const { data: updated, error } = await supabase
    .schema("public")
    .from("services")
    .update(row)
    .eq("id", serviceId)
    .select(
      "id, business_id, name, description, duration_minutes, capacity, price, is_active, sort_order, created_at, updated_at",
    )
    .single();

  if (error) {
    throw formatSupabaseServiceError("services", error);
  }

  await refreshSupabaseServicesForBusiness(currentRow.business_id);
  return mapSupabaseServiceToService(updated as SupabaseServiceRow);
}

export async function deleteSupabaseService(serviceId: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .schema("public")
    .from("services")
    .delete()
    .eq("id", serviceId)
    .select(
      "id, business_id, name, description, duration_minutes, capacity, price, is_active, sort_order, created_at, updated_at",
    )
    .maybeSingle();

  if (error) {
    throw formatSupabaseServiceError("services", error);
  }

  if (data) {
    servicesCache.set(
      (data as SupabaseServiceRow).business_id,
      (servicesCache.get((data as SupabaseServiceRow).business_id) ?? []).filter(
        (service) => service.id !== serviceId,
      ),
    );
    dispatchChange();
  }

  return data ? mapSupabaseServiceToService(data as SupabaseServiceRow) : null;
}

export async function setSupabaseServiceActive(serviceId: string, isActive: boolean) {
  const supabase = getSupabaseClientOrThrow();
  const { data: current, error: readError } = await supabase
    .schema("public")
    .from("services")
    .select(
      "id, business_id, name, description, duration_minutes, capacity, price, is_active, sort_order, created_at, updated_at",
    )
    .eq("id", serviceId)
    .maybeSingle();

  if (readError) {
    throw formatSupabaseServiceError("services", readError);
  }

  if (!current) {
    throw new Error("No se encontró el servicio para actualizar.");
  }

  const row = current as SupabaseServiceRow;
  const { data: updated, error } = await supabase
    .schema("public")
    .from("services")
    .update({ is_active: isActive })
    .eq("id", serviceId)
    .select(
      "id, business_id, name, description, duration_minutes, capacity, price, is_active, sort_order, created_at, updated_at",
    )
    .single();

  if (error) {
    throw formatSupabaseServiceError("services", error);
  }

  await refreshSupabaseServicesForBusiness(row.business_id);
  return mapSupabaseServiceToService((updated ?? row) as SupabaseServiceRow);
}
