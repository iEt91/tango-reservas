import type { Business, BusinessStatus, PublicTemplateId } from "@/data/types";
import { getDataSource, type DataSource } from "@/lib/data/dataSource";
import {
  archiveBusiness as archiveLocalBusiness,
  createBusiness as createLocalBusiness,
  deleteBusiness as deleteLocalBusiness,
  duplicateBusiness as duplicateLocalBusiness,
  getBusinessById as getLocalBusinessById,
  getBusinessBySlug as getLocalBusinessBySlug,
  getBusinesses as getLocalBusinesses,
  getEmptyBusinessFormValues,
  subscribeBusinesses as subscribeLocalBusinesses,
  restoreBusiness as restoreLocalBusiness,
  toBusinessFormValues,
  updateBusiness as updateLocalBusiness,
} from "@/lib/data/businesses";
import {
  createSupabaseBusiness,
  fetchSupabaseBusinesses,
  deleteSupabaseBusiness,
  duplicateSupabaseBusiness,
  getSupabaseBusinessById,
  getSupabaseBusinessBySlug,
  setSupabaseBusinessStatus,
  updateSupabaseBusiness,
  type SupabaseBusinessRow,
} from "@/lib/data/supabase/businesses";
import {
  createBusinessBaseRecords,
  duplicateBusinessWebContent,
  duplicateFloorPlanSettings,
  duplicateServices,
} from "@/lib/data/supabase/business-related";
import type { BusinessFormValues } from "@/data/types";

export type AdminBusinessesSnapshot = {
  requestedSource: DataSource;
  resolvedSource: DataSource;
  fallbackUsed: boolean;
  warning: string | null;
  error: string | null;
  businesses: Business[];
};

export type LoadAdminBusinessesSnapshotOptions = {
  allowFallback?: boolean;
};

const SUPABASE_TEMPLATE_TO_THEME: Record<PublicTemplateId, Business["themeId"]> = {
  "restaurant-elegant": "restaurant_elegant",
  "compact-premium": "restaurant_elegant",
  "minimal-cafe": "cafe_minimal",
};

function normalizeBusinessStatus(value: string | null | undefined): BusinessStatus {
  if (value === "draft" || value === "inactive") {
    return value;
  }

  return "active";
}

function mapTemplateToThemeId(templateId: string | null | undefined): Business["themeId"] {
  if (
    templateId === "restaurant-elegant" ||
    templateId === "compact-premium" ||
    templateId === "minimal-cafe"
  ) {
    return SUPABASE_TEMPLATE_TO_THEME[templateId];
  }

  return getEmptyBusinessFormValues().themeId;
}

export function mapSupabaseBusinessToBusiness(row: SupabaseBusinessRow): Business {
  const defaults = getEmptyBusinessFormValues();
  const createdAt = row.created_at ?? new Date(0).toISOString();
  const updatedAt = row.updated_at ?? createdAt;

  return {
    ...defaults,
    id: row.id,
    name: row.name,
    slug: row.slug,
    category: row.category ?? defaults.category,
    city: row.city ?? defaults.city,
    description: row.description ?? defaults.description,
    phone: row.phone ?? defaults.phone,
    whatsapp: row.whatsapp ?? defaults.whatsapp,
    email: row.email ?? defaults.email,
    address: row.address ?? defaults.address,
    googleMapsUrl: row.google_maps_url ?? defaults.googleMapsUrl,
    instagramUrl: row.instagram_url ?? defaults.instagramUrl,
    facebookUrl: row.facebook_url ?? defaults.facebookUrl,
    websiteUrl: row.website_url ?? defaults.websiteUrl,
    logoUrl: defaults.logoUrl,
    coverImageUrl: defaults.coverImageUrl,
    primaryColor: defaults.primaryColor,
    secondaryColor: defaults.secondaryColor,
    themeId: mapTemplateToThemeId(row.public_template_id),
    heroTitle: defaults.heroTitle || row.name,
    heroSubtitle: defaults.heroSubtitle,
    aboutTitle: defaults.aboutTitle,
    aboutText: row.description ?? defaults.aboutText,
    menuTitle: defaults.menuTitle,
    reservationTitle: defaults.reservationTitle,
    ctaLabel: defaults.ctaLabel,
    showHero: defaults.showHero,
    showAbout: defaults.showAbout,
    showGallery: defaults.showGallery,
    showMenu: defaults.showMenu,
    showLocation: defaults.showLocation,
    showReservation: defaults.showReservation,
    showWhatsappButton: defaults.showWhatsappButton,
    autoConfirmReservations:
      typeof row.auto_confirm_reservations === "boolean"
        ? row.auto_confirm_reservations
        : defaults.autoConfirmReservations,
    status: normalizeBusinessStatus(row.status),
    createdAt,
    updatedAt,
  };
}

function resolveStatsBusiness(business: Business) {
  return getLocalBusinessBySlug(business.slug) ?? business;
}

export function getBusinessBySlug(slug: string) {
  const source = getDataSource();

  if (source === "supabase") {
    return getSupabaseBusinessBySlug(slug).then((row) => (row ? mapSupabaseBusinessToBusiness(row) : null));
  }

  return Promise.resolve(getLocalBusinessBySlug(slug) ?? null);
}

export function getBusinessById(id: string) {
  const source = getDataSource();

  if (source === "supabase") {
    return getSupabaseBusinessById(id).then((row) => (row ? mapSupabaseBusinessToBusiness(row) : null));
  }

  return Promise.resolve(getLocalBusinessById(id) ?? null);
}

export async function getBusinesses() {
  const snapshot = await loadAdminBusinessesSnapshot();
  return snapshot.businesses;
}

export async function loadAdminBusinessesSnapshot(
  options: LoadAdminBusinessesSnapshotOptions = {},
): Promise<AdminBusinessesSnapshot> {
  const requestedSource = getDataSource();
  const allowFallback = options.allowFallback ?? true;

  if (requestedSource === "supabase") {
    const result = await fetchSupabaseBusinesses();

    if (!result.connected) {
      if (!allowFallback) {
        return {
          requestedSource,
          resolvedSource: "supabase",
          fallbackUsed: false,
          warning: result.error?.message ?? null,
          error: result.error?.message ?? null,
          businesses: [],
        };
      }

      const fallbackBusinesses = getLocalBusinesses();
      const warning = result.error
        ? `Supabase fallÃ³ y se usÃ³ local/mock como fallback: ${result.error.message}`
        : "Supabase fallÃ³ y se usÃ³ local/mock como fallback.";

      console.warn("[admin-businesses] Supabase fallback to local/mock", result.error);

      return {
        requestedSource,
        resolvedSource: "local",
        fallbackUsed: true,
        warning,
        error: result.error?.message ?? null,
        businesses: fallbackBusinesses,
      };
    }

    return {
      requestedSource,
      resolvedSource: "supabase",
      fallbackUsed: false,
      warning:
        result.businesses.length === 0
          ? "Supabase responde, pero public.businesses no devolviÃ³ registros."
          : null,
      error: null,
      businesses: result.businesses.map(mapSupabaseBusinessToBusiness),
    };
  }

  return {
    requestedSource,
    resolvedSource: "local",
    fallbackUsed: false,
    warning: null,
    error: null,
    businesses: getLocalBusinesses(),
  };
}

export function getAdminBusinessesSourceLabel(snapshot?: Pick<AdminBusinessesSnapshot, "resolvedSource">) {
  return snapshot?.resolvedSource === "supabase" ? "Supabase" : "local/mock";
}

export function getStatsBusinessForAdmin(business: Business) {
  return resolveStatsBusiness(business);
}

export function subscribeBusinesses(listener: () => void) {
  const source = getDataSource();

  if (source === "supabase") {
    return () => {};
  }

  return subscribeLocalBusinesses(listener);
}

function mapAdminMutationBusiness(business: Business | null) {
  if (!business) {
    throw new Error("No se pudo completar la operaciÃ³n sobre el negocio.");
  }

  return business;
}

export async function createAdminBusiness(data: BusinessFormValues) {
  const requestedSource = getDataSource();

  if (requestedSource === "supabase") {
    const row = await createSupabaseBusiness(data);
    const business = mapSupabaseBusinessToBusiness(row);

    try {
      await createBusinessBaseRecords(business);
    } catch (error) {
      await deleteSupabaseBusiness(business.id).catch(() => undefined);
      throw new Error(
        error instanceof Error
          ? `Se creÃ³ el negocio, pero fallÃ³ la configuraciÃ³n base: ${error.message}`
          : "Se creÃ³ el negocio, pero fallÃ³ la configuraciÃ³n base.",
      );
    }

    return business;
  }

  return mapAdminMutationBusiness(createLocalBusiness(data));
}

export async function updateAdminBusiness(id: string, data: BusinessFormValues) {
  const requestedSource = getDataSource();

  if (requestedSource === "supabase") {
    const row = await updateSupabaseBusiness(id, data);
    return mapSupabaseBusinessToBusiness(row);
  }

  return mapAdminMutationBusiness(updateLocalBusiness(id, data));
}

export async function duplicateAdminBusiness(id: string) {
  const requestedSource = getDataSource();

  if (requestedSource === "supabase") {
    const row = await duplicateSupabaseBusiness(id);
    const business = mapSupabaseBusinessToBusiness(row);

    try {
      const original = await getSupabaseBusinessById(id);

      if (original) {
        await duplicateBusinessWebContent(original.id, business.id, business);
        await duplicateFloorPlanSettings(original.id, business.id);
        await duplicateServices(original.id, business.id);
      } else {
        await createBusinessBaseRecords(business);
      }
    } catch (error) {
      await deleteSupabaseBusiness(business.id).catch(() => undefined);
      throw new Error(
        error instanceof Error
          ? `Se duplicÃ³ el negocio, pero fallÃ³ la configuraciÃ³n base: ${error.message}`
          : "Se duplicÃ³ el negocio, pero fallÃ³ la configuraciÃ³n base.",
      );
    }

    return business;
  }

  return mapAdminMutationBusiness(duplicateLocalBusiness(id));
}

export async function deleteAdminBusiness(id: string) {
  const requestedSource = getDataSource();

  if (requestedSource === "supabase") {
    const row = await deleteSupabaseBusiness(id);
    return mapSupabaseBusinessToBusiness(row);
  }

  const result = deleteLocalBusiness(id);

  if (!result.success) {
    throw new Error(
      result.reason === "protected"
        ? "Este negocio base no se puede eliminar en modo mock. PodÃ©s desactivarlo."
        : "No pudimos eliminar el negocio.",
    );
  }

  return result.business;
}

export async function setAdminBusinessStatus(id: string, status: Business["status"]) {
  const requestedSource = getDataSource();

  if (requestedSource === "supabase") {
    const row = await setSupabaseBusinessStatus(id, status);
    return mapSupabaseBusinessToBusiness(row);
  }

  const current = getLocalBusinessById(id);

  if (!current) {
    throw new Error("No se encontrÃ³ el negocio para actualizar.");
  }

  if (status === "inactive") {
    return mapAdminMutationBusiness(archiveLocalBusiness(id));
  }

  if (status === "active") {
    return mapAdminMutationBusiness(restoreLocalBusiness(id));
  }

  return mapAdminMutationBusiness(
    updateLocalBusiness(id, {
      ...toBusinessFormValues(current),
      status,
    }),
  );
}

