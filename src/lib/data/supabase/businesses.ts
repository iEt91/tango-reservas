import type { Business, BusinessFormValues } from "@/data/types";
import { createSlug, createUniqueSlug } from "@/lib/slug";
import { getSupabaseReadClient } from "@/lib/supabase/read-client";

export type SupabaseBusinessRow = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  category: string | null;
  city: string | null;
  address: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  instagram_url: string | null;
  facebook_url: string | null;
  website_url: string | null;
  google_maps_url: string | null;
  google_maps_embed_url: string | null;
  status: string | null;
  auto_confirm_reservations: boolean | null;
  public_template_id: string | null;
  created_at: string | null;
  updated_at: string | null;
};

export type SupabaseBusinessesError = {
  message: string;
  code: string | null;
  details: string | null;
  hint: string | null;
};

export type SupabaseBusinessesResult = {
  connected: boolean;
  error: SupabaseBusinessesError | null;
  count: number;
  businesses: SupabaseBusinessRow[];
};

const BUSINESS_SELECT =
  "id, slug, name, description, category, city, address, phone, whatsapp, email, instagram_url, facebook_url, website_url, google_maps_url, google_maps_embed_url, status, auto_confirm_reservations, public_template_id, created_at, updated_at";

const TEMPLATE_BY_THEME: Record<Business["themeId"], string> = {
  restaurant_elegant: "restaurant-elegant",
  beach_club_dark: "compact-premium",
  cafe_minimal: "minimal-cafe",
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeSupabaseError(error: {
  message?: string | null;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
}): SupabaseBusinessesError {
  return {
    message: error.message ?? "Error desconocido de Supabase.",
    code: error.code ?? null,
    details: error.details ?? null,
    hint: error.hint ?? null,
  };
}

function normalizeText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function normalizeBusinessStatus(value: string | null | undefined): Business["status"] {
  if (value === "draft" || value === "inactive") {
    return value;
  }

  return "active";
}

function mapThemeIdToTemplateId(themeId: Business["themeId"] | null | undefined) {
  if (!themeId) {
    return "restaurant-elegant";
  }

  return TEMPLATE_BY_THEME[themeId] ?? "restaurant-elegant";
}

export function mapBusinessInputToSupabaseRow(
  data: BusinessFormValues,
  options?: {
    slug?: string;
    status?: Business["status"];
    createdAt?: string | null;
    updatedAt?: string | null;
  },
) {
  const slug = createSlug(options?.slug ?? data.slug ?? data.name);
  const timestamp = nowIso();

  return {
    slug,
    name: data.name.trim(),
    description: normalizeText(data.description),
    category: data.category.trim(),
    city: data.city.trim(),
    address: normalizeText(data.address),
    phone: normalizeText(data.phone),
    whatsapp: normalizeText(data.whatsapp),
    email: normalizeText(data.email),
    instagram_url: normalizeText(data.instagramUrl),
    facebook_url: normalizeText(data.facebookUrl),
    website_url: normalizeText(data.websiteUrl),
    google_maps_url: normalizeText(data.googleMapsUrl),
    google_maps_embed_url: null,
    status: options?.status ?? data.status,
    auto_confirm_reservations:
      typeof data.autoConfirmReservations === "boolean"
        ? data.autoConfirmReservations
        : true,
    public_template_id: mapThemeIdToTemplateId(data.themeId),
    created_at: options?.createdAt ?? timestamp,
    updated_at: options?.updatedAt ?? timestamp,
  };
}

export function mapSupabaseRowToBusinessInput(row: SupabaseBusinessRow): BusinessFormValues {
  return {
    name: row.name ?? "",
    slug: row.slug ?? "",
    category: row.category ?? "",
    city: row.city ?? "",
    description: row.description ?? "",
    phone: row.phone ?? "",
    whatsapp: row.whatsapp ?? "",
    email: row.email ?? "",
    address: row.address ?? "",
    googleMapsUrl: row.google_maps_url ?? "",
    instagramUrl: row.instagram_url ?? "",
    facebookUrl: row.facebook_url ?? "",
    websiteUrl: row.website_url ?? "",
    logoUrl: "",
    coverImageUrl: "",
    primaryColor: "#06b6d4",
    secondaryColor: "#0f172a",
    themeId:
      row.public_template_id === "compact-premium"
        ? "beach_club_dark"
        : row.public_template_id === "minimal-cafe"
          ? "cafe_minimal"
          : "restaurant_elegant",
    heroTitle: row.name ?? "",
    heroSubtitle: "",
    aboutTitle: "",
    aboutText: row.description ?? "",
    menuTitle: "",
    reservationTitle: "",
    ctaLabel: "Reservar ahora",
    showHero: true,
    showAbout: true,
    showGallery: true,
    showMenu: true,
    showLocation: true,
    showReservation: true,
    showWhatsappButton: true,
    autoConfirmReservations: row.auto_confirm_reservations ?? true,
    status: normalizeBusinessStatus(row.status),
  };
}

async function querySupabaseBusinesses() {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    return {
      connected: false,
      error: normalizeSupabaseError({
        message: "No se pudo crear el cliente de Supabase.",
      }),
      count: 0,
      businesses: [] as SupabaseBusinessRow[],
    } satisfies SupabaseBusinessesResult;
  }

  const { data, error, count } = await supabase
    .schema("public")
    .from("businesses")
    .select(BUSINESS_SELECT, { count: "exact" })
    .order("slug", { ascending: true });

  if (error) {
    return {
      connected: false,
      error: normalizeSupabaseError(error),
      count: 0,
      businesses: [],
    } satisfies SupabaseBusinessesResult;
  }

  const businesses = (data ?? []) as SupabaseBusinessRow[];

  return {
    connected: true,
    error: null,
    count: typeof count === "number" ? count : businesses.length,
    businesses,
  } satisfies SupabaseBusinessesResult;
}

function normalizeWriteError(error: {
  message?: string | null;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
}) {
  const normalized = normalizeSupabaseError(error);
  const message = normalized.message.toLowerCase();

  if (normalized.code === "23505" || message.includes("duplicate")) {
    return new Error("El slug ya existe en Supabase. Elegí otro slug.");
  }

  if (normalized.code === "42501" || message.includes("permission")) {
    return new Error(
      "Supabase devolvió un error de permisos. Revisá RLS o la policy de escritura para public.businesses.",
    );
  }

  return new Error(normalized.message || "No se pudo guardar el negocio en Supabase.");
}

async function getSupabaseClientOrThrow() {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    throw new Error("Faltan variables de entorno de Supabase.");
  }

  return supabase;
}

async function getExistingBusinesses() {
  const result = await querySupabaseBusinesses();

  if (!result.connected) {
    throw result.error
      ? new Error(result.error.message)
      : new Error("No se pudieron leer los negocios desde Supabase.");
  }

  return result.businesses;
}

async function insertBusiness(row: Record<string, unknown>) {
  const supabase = await getSupabaseClientOrThrow();

  const { data, error } = await supabase
    .schema("public")
    .from("businesses")
    .insert(row)
    .select(BUSINESS_SELECT)
    .single();

  if (error) {
    throw normalizeWriteError(error);
  }

  return data as SupabaseBusinessRow;
}

async function updateBusinessRow(id: string, row: Record<string, unknown>) {
  const supabase = await getSupabaseClientOrThrow();

  const { data, error } = await supabase
    .schema("public")
    .from("businesses")
    .update(row)
    .eq("id", id)
    .select(BUSINESS_SELECT)
    .maybeSingle();

  if (error) {
    throw normalizeWriteError(error);
  }

  if (!data) {
    throw new Error("No se encontró el negocio para actualizar.");
  }

  return data as SupabaseBusinessRow;
}

async function deleteBusinessRow(id: string) {
  const supabase = await getSupabaseClientOrThrow();

  const { data, error } = await supabase
    .schema("public")
    .from("businesses")
    .delete()
    .eq("id", id)
    .select(BUSINESS_SELECT)
    .maybeSingle();

  if (error) {
    throw normalizeWriteError(error);
  }

  if (!data) {
    throw new Error("No se encontró el negocio para eliminar.");
  }

  return data as SupabaseBusinessRow;
}

export async function fetchSupabaseBusinesses(): Promise<SupabaseBusinessesResult> {
  return querySupabaseBusinesses();
}

export async function getSupabaseBusinesses() {
  const result = await querySupabaseBusinesses();
  return result.businesses;
}

export async function getSupabaseBusinessBySlug(slug: string) {
  const supabase = getSupabaseReadClient();

  if (!supabase || !slug) {
    return null;
  }

  const { data, error } = await supabase
    .schema("public")
    .from("businesses")
    .select(BUSINESS_SELECT)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    return null;
  }

  return (data ?? null) as SupabaseBusinessRow | null;
}

export async function getSupabaseBusinessById(id: string) {
  const supabase = getSupabaseReadClient();

  if (!supabase || !id) {
    return null;
  }

  const { data, error } = await supabase
    .schema("public")
    .from("businesses")
    .select(BUSINESS_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    return null;
  }

  return (data ?? null) as SupabaseBusinessRow | null;
}

export async function createSupabaseBusiness(data: BusinessFormValues) {
  const slug = createSlug(data.slug || data.name);

  if (!slug) {
    throw new Error("El slug es obligatorio.");
  }

  const existingBusinesses = await getExistingBusinesses();
  if (existingBusinesses.some((business) => business.slug === slug)) {
    throw new Error("El slug ya existe en Supabase. Elegí otro slug.");
  }

  const row = mapBusinessInputToSupabaseRow(data, {
    slug,
    status: data.status ?? "draft",
  });

  return insertBusiness(row);
}

export async function updateSupabaseBusiness(id: string, data: BusinessFormValues) {
  const current = await getSupabaseBusinessById(id);

  if (!current) {
    throw new Error("No se encontró el negocio para actualizar.");
  }

  const nextSlug = createSlug(data.slug || data.name || current.slug);

  if (!nextSlug) {
    throw new Error("El slug es obligatorio.");
  }

  const existingBusinesses = await getExistingBusinesses();
  if (existingBusinesses.some((business) => business.slug === nextSlug && business.id !== id)) {
    throw new Error("El slug ya existe en Supabase. Elegí otro slug.");
  }

  const row = mapBusinessInputToSupabaseRow(data, {
    slug: nextSlug,
    status: data.status ?? current.status ?? "draft",
    createdAt: current.created_at,
  });

  return updateBusinessRow(id, row);
}

export async function deleteSupabaseBusiness(id: string) {
  return deleteBusinessRow(id);
}

export async function setSupabaseBusinessStatus(id: string, status: Business["status"]) {
  const current = await getSupabaseBusinessById(id);

  if (!current) {
    throw new Error("No se encontró el negocio para actualizar.");
  }

  return updateBusinessRow(id, {
    slug: current.slug,
    name: current.name,
    description: current.description,
    category: current.category,
    city: current.city,
    address: current.address,
    phone: current.phone,
    whatsapp: current.whatsapp,
    email: current.email,
    instagram_url: current.instagram_url,
    facebook_url: current.facebook_url,
    website_url: current.website_url,
    google_maps_url: current.google_maps_url,
    google_maps_embed_url: current.google_maps_embed_url,
    status,
    auto_confirm_reservations: current.auto_confirm_reservations ?? true,
    public_template_id: current.public_template_id,
    created_at: current.created_at,
    updated_at: nowIso(),
  });
}

export async function duplicateSupabaseBusiness(id: string) {
  const current = await getSupabaseBusinessById(id);

  if (!current) {
    throw new Error("No se encontró el negocio para duplicar.");
  }

  const existingBusinesses = await getExistingBusinesses();
  const baseSlug = `${current.slug}-copia`;
  const slug = createUniqueSlug(baseSlug, existingBusinesses.map((business) => business.slug));
  const duplicatedInput = mapSupabaseRowToBusinessInput(current);

  return insertBusiness(
    mapBusinessInputToSupabaseRow(
      {
        ...duplicatedInput,
        name: `${current.name} Copia`,
        slug,
        status: "draft",
      },
      {
        slug,
        status: "draft",
      },
    ),
  );
}
