import type { Business, PublicTemplateId, PublicWebContent, PublicWebGalleryItem, Service } from "@/data/types";
import { mapSupabaseBusinessToBusiness } from "@/lib/data/admin-businesses";
import {
  getSupabaseBusinessBySlug,
  getSupabaseBusinesses,
  type SupabaseBusinessRow,
} from "@/lib/data/supabase/businesses";
import { getSupabaseGalleryImagesByBusiness } from "@/lib/data/supabase/gallery";
import { getSupabaseMenuSnapshotByBusiness } from "@/lib/data/supabase/menu";
import { getSupabaseServicesByBusiness } from "@/lib/data/supabase/services";
import { getSupabaseWebContentByBusiness } from "@/lib/data/supabase/webContent";

export type PublicWebFlags = {
  showHero: boolean;
  showAbout: boolean;
  showFeaturedMenu: boolean;
  showFullMenu: boolean;
  showGallery: boolean;
  showLocation: boolean;
  showReservations: boolean;
  showWhatsapp: boolean;
  showEmail: boolean;
  showSocials: boolean;
};

export type SupabasePublicWebSnapshot = {
  business: Business;
  webContent: PublicWebContent;
  galleryImages: PublicWebGalleryItem[];
  services: Service[];
  menuCategories: Array<{
    id: string;
    businessId: string;
    name: string;
    description?: string | null;
    sortOrder: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
  }>;
  menuItems: Array<{
    id: string;
    businessId: string;
    categoryId: string;
    name: string;
    description: string;
    price?: number | null;
    imageDataUrl?: string | null;
    imageUrl?: string | null;
    imagePlaceholder?: string | null;
    isActive: boolean;
    isFeatured?: boolean;
    sortOrder: number;
    tags?: string[];
    createdAt: string;
    updatedAt: string;
  }>;
  templateId: PublicTemplateId;
  flags: PublicWebFlags;
};

type SupabaseWebError = {
  message: string;
  code: string | null;
  details: string | null;
  hint: string | null;
};

export type SupabasePublicWebResult = {
  snapshot: SupabasePublicWebSnapshot | null;
  error: SupabaseWebError | null;
};

function normalizeError(
  error:
    | {
        message?: string | null;
        code?: string | null;
        details?: string | null;
        hint?: string | null;
      }
    | Error
    | unknown,
): SupabaseWebError {
  const data =
    error && typeof error === "object"
      ? (error as {
          message?: string | null;
          code?: string | null;
          details?: string | null;
          hint?: string | null;
        })
      : null;

  return {
    message:
      (error instanceof Error ? error.message : data?.message)?.trim() ||
      "No se pudo completar la consulta pública.",
    code: data?.code?.trim() ?? null,
    details: data?.details?.trim() ?? null,
    hint: data?.hint?.trim() ?? null,
  };
}

function buildFlags(content: PublicWebContent): PublicWebFlags {
  return {
    showHero: content.showHero,
    showAbout: content.showAbout,
    showFeaturedMenu: content.showFeaturedMenu !== false,
    showFullMenu: content.showMenu,
    showGallery: content.showGallery,
    showLocation: content.showLocation,
    showReservations: content.showReservations ?? content.showReservation,
    showWhatsapp: content.showWhatsappButton,
    showEmail: content.showEmailButton !== false,
    showSocials: content.showSocials !== false,
  };
}

async function getBusinessBySlugOrId(slug: string) {
  const normalized = slug.trim();

  if (!normalized) {
    return null;
  }

  const bySlug = await getSupabaseBusinessBySlug(normalized);
  if (bySlug) {
    return bySlug;
  }

  const businesses = await getSupabaseBusinesses();
  return businesses.find((entry) => entry.id === normalized) ?? null;
}

function applyTemplateFallback(
  content: PublicWebContent,
  business: Business,
  businessRow: SupabaseBusinessRow | null,
): PublicWebContent {
  return {
    ...content,
    publicTemplateId:
      businessRow?.public_template_id === "restaurant-elegant" ||
      businessRow?.public_template_id === "compact-premium" ||
      businessRow?.public_template_id === "minimal-cafe"
        ? businessRow.public_template_id
        : content.publicTemplateId ?? "restaurant-elegant",
    showFeaturedMenu: content.showFeaturedMenu !== false,
    showMenu: content.showMenu,
    showReservations: content.showReservations ?? content.showReservation,
    showReservation: content.showReservation,
    businessId: business.id,
    updatedAt: content.updatedAt,
  };
}

export async function getSupabasePublicBusinessBySlug(slug: string) {
  const businessRow = await getBusinessBySlugOrId(slug);
  return businessRow ? mapSupabaseBusinessToBusiness(businessRow) : null;
}

export async function getSupabasePublicWebContentByBusinessId(businessId: string) {
  return getSupabaseWebContentByBusiness(businessId);
}

export async function getSupabasePublicGalleryByBusinessId(businessId: string) {
  return getSupabaseGalleryImagesByBusiness(businessId);
}

export async function getSupabasePublicServicesByBusinessId(businessId: string) {
  return getSupabaseServicesByBusiness(businessId);
}

export async function getSupabasePublicMenuSnapshotByBusinessId(businessId: string) {
  return getSupabaseMenuSnapshotByBusiness(businessId);
}

export async function getSupabasePublicWebSnapshot(slug: string): Promise<SupabasePublicWebResult> {
  try {
    const businessRow = await getBusinessBySlugOrId(slug);

    if (!businessRow) {
      return {
        snapshot: null,
        error: null,
      };
    }

    const business = mapSupabaseBusinessToBusiness(businessRow);
    const [webContent, galleryImages, services, menu] = await Promise.all([
      getSupabaseWebContentByBusiness(businessRow.id),
      getSupabaseGalleryImagesByBusiness(businessRow.id),
      getSupabaseServicesByBusiness(businessRow.id),
      getSupabaseMenuSnapshotByBusiness(businessRow.id),
    ]);

    const snapshot: SupabasePublicWebSnapshot = {
      business,
      webContent: applyTemplateFallback(webContent, business, businessRow),
      galleryImages: galleryImages.filter((image) => image.isActive).sort((left, right) => left.sortOrder - right.sortOrder),
      services: services.filter((service) => service.isActive),
      menuCategories: menu.categories.filter((category) => category.isActive),
      menuItems: menu.items.filter((item) => item.isActive),
      templateId:
        businessRow.public_template_id === "compact-premium" ||
        businessRow.public_template_id === "minimal-cafe" ||
        businessRow.public_template_id === "restaurant-elegant"
          ? businessRow.public_template_id
          : "restaurant-elegant",
      flags: buildFlags(applyTemplateFallback(webContent, business, businessRow)),
    };

    return { snapshot, error: null };
  } catch (error) {
    return {
      snapshot: null,
      error: normalizeError(error),
    };
  }
}
