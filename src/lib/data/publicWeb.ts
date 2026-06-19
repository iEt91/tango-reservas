import { getDataSource } from "@/lib/data/dataSource";
import type {
  Business,
  MenuCategory,
  MenuItem,
  PublicWebContent,
  PublicWebGalleryItem,
  Service,
} from "@/data/types";
import {
  getPublicWebContentByBusinessId,
  getPublicWebGalleryByBusinessId,
} from "@/lib/public-web";
import {
  getSupabasePublicBusinessBySlug,
  getSupabasePublicGalleryByBusinessId,
  getSupabasePublicMenuSnapshotByBusinessId,
  getSupabasePublicServicesByBusinessId,
  getSupabasePublicWebContentByBusinessId,
  getSupabasePublicWebSnapshot,
  type SupabasePublicWebResult,
  type SupabasePublicWebSnapshot,
} from "@/lib/data/supabase/publicWeb";
import { getBusinessBySlug, getBusinessSlugs } from "@/data/businesses";
import { getMenuCategoriesByBusinessId, getMenuItemsByBusinessId } from "@/data/menu";
import { getBusinessServices } from "@/data/scheduling";
import { getBusinessById } from "@/lib/data/businesses";

export type PublicWebPageData = {
  business: Business;
  content: PublicWebContent;
  galleryImages: PublicWebGalleryItem[];
  services: Service[];
  menuCategories: MenuCategory[];
  menuItems: MenuItem[];
  templateId: string;
  flags: SupabasePublicWebSnapshot["flags"] | null;
  source: "local" | "supabase";
  error: SupabasePublicWebResult["error"];
};

export async function getPublicWebPageDataBySlug(slug: string): Promise<PublicWebPageData | null> {
  const source = getDataSource();

  if (source === "supabase") {
    const result = await getSupabasePublicWebSnapshot(slug);

    if (!result.snapshot) {
      return null;
    }

    return {
      business: result.snapshot.business,
      content: result.snapshot.webContent,
      galleryImages: result.snapshot.galleryImages,
      services: result.snapshot.services,
      menuCategories: result.snapshot.menuCategories,
      menuItems: result.snapshot.menuItems,
      templateId: result.snapshot.templateId,
      flags: result.snapshot.flags,
      source,
      error: result.error,
    };
  }

  const business = getBusinessBySlug(slug);
  if (!business) {
    return null;
  }

  const [content, galleryImages, services] = await Promise.all([
    Promise.resolve(getPublicWebContentByBusinessId(business.id)),
    Promise.resolve(getPublicWebGalleryByBusinessId(business.id)),
    Promise.resolve(getBusinessServices(business.id)),
  ]);
  const menuCategories = getMenuCategoriesByBusinessId(business.id);
  const menuItems = getMenuItemsByBusinessId(business.id);

  return {
    business,
    content,
    galleryImages,
    services,
    menuCategories,
    menuItems,
    templateId: content.publicTemplateId ?? "restaurant-elegant",
    flags: {
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
    },
    source,
    error: null,
  };
}

export function getPublicWebKnownSlugs() {
  return getBusinessSlugs();
}

export async function getPublicWebBusinessBySlug(slug: string) {
  if (getDataSource() === "supabase") {
    return getSupabasePublicBusinessBySlug(slug);
  }

  return getBusinessBySlug(slug);
}

export async function getPublicWebContentForBusiness(businessId: string) {
  if (getDataSource() === "supabase") {
    return getSupabasePublicWebContentByBusinessId(businessId);
  }

  return getPublicWebContentByBusinessId(businessId);
}

export async function getPublicWebGalleryForBusiness(businessId: string) {
  if (getDataSource() === "supabase") {
    return getSupabasePublicGalleryByBusinessId(businessId);
  }

  return getPublicWebGalleryByBusinessId(businessId);
}

export async function getPublicWebServicesForBusiness(businessId: string) {
  if (getDataSource() === "supabase") {
    return getSupabasePublicServicesByBusinessId(businessId);
  }

  return getBusinessServices(businessId);
}

export async function getPublicWebMenuSnapshotForBusiness(businessId: string) {
  if (getDataSource() === "supabase") {
    return getSupabasePublicMenuSnapshotByBusinessId(businessId);
  }

  return {
    categories: getMenuCategoriesByBusinessId(businessId),
    items: getMenuItemsByBusinessId(businessId),
  };
}
