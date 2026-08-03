import type {
  Business,
  BusinessFormValues,
} from "@/data/types";
import {
  createSlug,
  createUniqueSlug,
} from "@/lib/slug";
import {
  getSupabaseReadClient,
} from "@/lib/supabase/read-client";

export type SupabaseBusinessRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category: string;
  city: string;
  address: string;
  phone: string;
  whatsapp: string;
  email: string;
  instagram_url: string;
  facebook_url: string;
  website_url: string;
  google_maps_url: string;
  logo_url: string;
  cover_image_url: string;
  primary_color: string;
  secondary_color: string;
  theme_id: string;
  hero_title: string;
  hero_subtitle: string;
  about_title: string;
  about_text: string;
  menu_title: string;
  reservation_title: string;
  cta_label: string;
  show_hero: boolean;
  show_about: boolean;
  show_gallery: boolean;
  show_menu: boolean;
  show_location: boolean;
  show_reservation: boolean;
  show_whatsapp_button: boolean;
  status: string;
  created_at: string;
  updated_at: string;
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

const BUSINESS_SELECT = "id, slug, name, description, category, city, address, phone, whatsapp, email, instagram_url, facebook_url, website_url, google_maps_url, logo_url, cover_image_url, primary_color, secondary_color, theme_id, hero_title, hero_subtitle, about_title, about_text, menu_title, reservation_title, cta_label, show_hero, show_about, show_gallery, show_menu, show_location, show_reservation, show_whatsapp_button, status, created_at, updated_at" as const;

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

function normalizeRequiredText(
  value: string | null | undefined,
) {
  return value?.trim() ?? "";
}

function normalizeBusinessStatus(
  value: string | null | undefined,
): Business["status"] {
  if (value === "draft" || value === "inactive") {
    return value;
  }

  return "active";
}

function normalizeThemeId(
  value: string | null | undefined,
): Business["themeId"] {
  if (
    value === "beach_club_dark"
    || value === "cafe_minimal"
  ) {
    return value;
  }

  return "restaurant_elegant";
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
  const slug = createSlug(
    options?.slug ?? data.slug ?? data.name,
  );
  const timestamp = nowIso();

  return {
    slug,
    name: data.name.trim(),
    description: normalizeRequiredText(data.description),
    category: data.category.trim(),
    city: data.city.trim(),
    address: normalizeRequiredText(data.address),
    phone: normalizeRequiredText(data.phone),
    whatsapp: normalizeRequiredText(data.whatsapp),
    email: normalizeRequiredText(data.email),
    instagram_url: normalizeRequiredText(data.instagramUrl),
    facebook_url: normalizeRequiredText(data.facebookUrl),
    website_url: normalizeRequiredText(data.websiteUrl),
    google_maps_url: normalizeRequiredText(data.googleMapsUrl),
    logo_url: normalizeRequiredText(data.logoUrl),
    cover_image_url: normalizeRequiredText(data.coverImageUrl),
    primary_color: normalizeRequiredText(data.primaryColor),
    secondary_color: normalizeRequiredText(data.secondaryColor),
    theme_id: normalizeThemeId(data.themeId),
    hero_title: normalizeRequiredText(data.heroTitle),
    hero_subtitle: normalizeRequiredText(data.heroSubtitle),
    about_title: normalizeRequiredText(data.aboutTitle),
    about_text: normalizeRequiredText(data.aboutText),
    menu_title: normalizeRequiredText(data.menuTitle),
    reservation_title: normalizeRequiredText(
      data.reservationTitle,
    ),
    cta_label: normalizeRequiredText(data.ctaLabel),
    show_hero: data.showHero,
    show_about: data.showAbout,
    show_gallery: data.showGallery,
    show_menu: data.showMenu,
    show_location: data.showLocation,
    show_reservation: data.showReservation,
    show_whatsapp_button: data.showWhatsappButton,
    status: options?.status ?? data.status,
    created_at: options?.createdAt ?? timestamp,
    updated_at: options?.updatedAt ?? timestamp,
  };
}

export function mapSupabaseRowToBusinessInput(
  row: SupabaseBusinessRow,
): BusinessFormValues {
  return {
    name: row.name,
    slug: row.slug,
    category: row.category,
    city: row.city,
    description: row.description,
    phone: row.phone,
    whatsapp: row.whatsapp,
    email: row.email,
    address: row.address,
    googleMapsUrl: row.google_maps_url,
    instagramUrl: row.instagram_url,
    facebookUrl: row.facebook_url,
    websiteUrl: row.website_url,
    logoUrl: row.logo_url,
    coverImageUrl: row.cover_image_url,
    primaryColor: row.primary_color,
    secondaryColor: row.secondary_color,
    themeId: normalizeThemeId(row.theme_id),
    heroTitle: row.hero_title,
    heroSubtitle: row.hero_subtitle,
    aboutTitle: row.about_title,
    aboutText: row.about_text,
    menuTitle: row.menu_title,
    reservationTitle: row.reservation_title,
    ctaLabel: row.cta_label,
    showHero: row.show_hero,
    showAbout: row.show_about,
    showGallery: row.show_gallery,
    showMenu: row.show_menu,
    showLocation: row.show_location,
    showReservation: row.show_reservation,
    showWhatsappButton: row.show_whatsapp_button,
    autoConfirmReservations: true,
    status: normalizeBusinessStatus(row.status),
  };
}

async function querySupabaseBusinesses():
Promise<SupabaseBusinessesResult> {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    return {
      connected: false,
      error: normalizeSupabaseError({
        message: "No se pudo crear el cliente de Supabase.",
      }),
      count: 0,
      businesses: [],
    };
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
    };
  }

  const businesses = (data ?? []) as SupabaseBusinessRow[];

  return {
    connected: true,
    error: null,
    count:
      typeof count === "number"
        ? count
        : businesses.length,
    businesses,
  };
}

function normalizeWriteError(error: {
  message?: string | null;
  code?: string | null;
  details?: string | null;
  hint?: string | null;
}) {
  const normalized = normalizeSupabaseError(error);
  const message = normalized.message.toLowerCase();

  if (
    normalized.code === "23505"
    || message.includes("duplicate")
  ) {
    return new Error(
      "El slug ya existe en Supabase. Elegí otro slug.",
    );
  }

  if (
    normalized.code === "42501"
    || message.includes("permission")
  ) {
    return new Error(
      "Supabase devolvió un error de permisos. "
      + "Revisá RLS o la operación servidora.",
    );
  }

  return new Error(
    normalized.message
    || "No se pudo guardar el negocio en Supabase.",
  );
}

async function getSupabaseClientOrThrow() {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    throw new Error(
      "Faltan variables de entorno de Supabase.",
    );
  }

  return supabase;
}

async function getExistingBusinesses() {
  const result = await querySupabaseBusinesses();

  if (!result.connected) {
    throw result.error
      ? new Error(result.error.message)
      : new Error(
          "No se pudieron leer los negocios desde Supabase.",
        );
  }

  return result.businesses;
}

async function insertBusiness(
  row: Record<string, unknown>,
) {
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

async function updateBusinessRow(
  id: string,
  row: Record<string, unknown>,
) {
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
    throw new Error(
      "No se encontró el negocio para actualizar.",
    );
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
    throw new Error(
      "No se encontró el negocio para eliminar.",
    );
  }

  return data as SupabaseBusinessRow;
}

export async function fetchSupabaseBusinesses():
Promise<SupabaseBusinessesResult> {
  return querySupabaseBusinesses();
}

export async function getSupabaseBusinesses() {
  const result = await querySupabaseBusinesses();
  return result.businesses;
}

export async function getSupabaseBusinessBySlug(
  slug: string,
) {
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

export async function getSupabaseBusinessById(
  id: string,
) {
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

export async function createSupabaseBusiness(
  data: BusinessFormValues,
) {
  const slug = createSlug(data.slug || data.name);

  if (!slug) {
    throw new Error("El slug es obligatorio.");
  }

  const existingBusinesses = await getExistingBusinesses();

  if (
    existingBusinesses.some(
      (business) => business.slug === slug,
    )
  ) {
    throw new Error(
      "El slug ya existe en Supabase. Elegí otro slug.",
    );
  }

  return insertBusiness(
    mapBusinessInputToSupabaseRow(data, {
      slug,
      status: data.status ?? "draft",
    }),
  );
}

export async function updateSupabaseBusiness(
  id: string,
  data: BusinessFormValues,
) {
  const current = await getSupabaseBusinessById(id);

  if (!current) {
    throw new Error(
      "No se encontró el negocio para actualizar.",
    );
  }

  const nextSlug = createSlug(
    data.slug || data.name || current.slug,
  );

  if (!nextSlug) {
    throw new Error("El slug es obligatorio.");
  }

  const existingBusinesses = await getExistingBusinesses();

  if (
    existingBusinesses.some(
      (business) => (
        business.slug === nextSlug
        && business.id !== id
      ),
    )
  ) {
    throw new Error(
      "El slug ya existe en Supabase. Elegí otro slug.",
    );
  }

  return updateBusinessRow(
    id,
    mapBusinessInputToSupabaseRow(data, {
      slug: nextSlug,
      status:
        data.status
        ?? normalizeBusinessStatus(current.status),
      createdAt: current.created_at,
    }),
  );
}

export async function deleteSupabaseBusiness(
  id: string,
) {
  return deleteBusinessRow(id);
}

export async function setSupabaseBusinessStatus(
  id: string,
  status: Business["status"],
) {
  return updateBusinessRow(id, {
    status,
    updated_at: nowIso(),
  });
}

export async function duplicateSupabaseBusiness(
  id: string,
) {
  const current = await getSupabaseBusinessById(id);

  if (!current) {
    throw new Error(
      "No se encontró el negocio para duplicar.",
    );
  }

  const existingBusinesses = await getExistingBusinesses();
  const baseSlug = `${current.slug}-copia`;
  const slug = createUniqueSlug(
    baseSlug,
    existingBusinesses.map(
      (business) => business.slug,
    ),
  );
  const duplicatedInput =
    mapSupabaseRowToBusinessInput(current);

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
