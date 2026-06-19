import type { Business, PublicWebContent } from "@/data/types";
import { getBusinessById } from "@/lib/data/admin-businesses";
import { getSupabaseReadClient } from "@/lib/supabase/read-client";

export type SupabaseWebContentRow = {
  business_id: string;
  hero_title: string | null;
  hero_subtitle: string | null;
  hero_badge: string | null;
  about_title: string | null;
  about_text: string | null;
  about_secondary_text: string | null;
  public_tags: unknown;
  hero_image_url: string | null;
  show_hero: boolean;
  show_about: boolean;
  show_featured_menu: boolean;
  show_full_menu: boolean;
  show_gallery: boolean;
  show_location: boolean;
  show_reservations: boolean;
  show_whatsapp: boolean;
  show_email: boolean;
  show_socials: boolean;
  created_at: string | null;
  updated_at: string | null;
};

type WebContentInput = Partial<
  Omit<PublicWebContent, "businessId" | "updatedAt" | "heroImagePlaceholder">
>;

type SupabaseWebContentPayload = Omit<
  SupabaseWebContentRow,
  "created_at" | "updated_at"
> & {
  created_at?: string | null;
  updated_at?: string | null;
};

const WEB_CONTENT_SELECT =
  "business_id, hero_title, hero_subtitle, hero_badge, about_title, about_text, about_secondary_text, public_tags, hero_image_url, show_hero, show_about, show_featured_menu, show_full_menu, show_gallery, show_location, show_reservations, show_whatsapp, show_email, show_socials, created_at, updated_at";

function getSupabaseClientOrThrow() {
  const supabase = getSupabaseReadClient();

  if (!supabase) {
    throw new Error("Faltan variables de entorno de Supabase.");
  }

  return supabase;
}

function formatSupabaseError(
  table: string,
  error:
    | {
        message?: string | null;
        code?: string | null;
        details?: string | null;
        hint?: string | null;
      }
    | Error
    | unknown,
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
    (error instanceof Error ? error.message : data?.message)?.trim() ||
    "No se pudo completar la operación.";
  const code = data?.code?.trim();
  const details = data?.details?.trim();
  const hint = data?.hint?.trim();

  const parts = [`Falló ${table}: ${message}`];
  if (code) parts.push(`Code: ${code}`);
  if (details) parts.push(`Details: ${details}`);
  if (hint) parts.push(`Hint: ${hint}`);

  return new Error(parts.join(". "));
}

function nowIso() {
  return new Date().toISOString();
}

function toText(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : null;
}

function toJsonArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);
}

function toJsonArrayFromText(value: string | null | undefined) {
  const trimmed = typeof value === "string" ? value.trim() : "";

  if (!trimmed) {
    return [];
  }

  return trimmed
    .split(",")
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0);
}

function getBusinessDefaults(business: Business): PublicWebContent {
  return {
    businessId: business.id,
    publicName: business.name,
    publicSubtitle: business.description,
    publicDescription: business.description,
    publicBadge: business.category,
    publicAttributesText: business.category,
    publicTemplateId:
      business.themeId === "cafe_minimal"
        ? "minimal-cafe"
        : business.themeId === "beach_club_dark"
          ? "compact-premium"
          : "restaurant-elegant",
    heroDescription: business.description,
    publicCategory: business.category,
    publicCity: business.city,
    publicAddress: business.address,
    publicPhone: business.phone,
    heroTitle: business.name,
    heroSubtitle: business.description,
    heroSecondaryCtaLabel: business.showMenu ? "Ver menú" : null,
    menuTitle: "Selección destacada",
    menuSubtitle: "Algunas opciones recomendadas por el local.",
    aboutTitle: business.name,
    aboutText: business.description,
    presentationTitle: business.name,
    presentationText: business.description,
    aboutHighlights: [],
    featuredPhrase: business.category,
    mapLabel: "Ubicación",
    locationTitle: "Ubicación",
    locationText: business.address || business.city,
    heroImageDataUrl: null,
    heroImageUrl: null,
    heroImagePlaceholder: business.name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0] ?? "")
      .join("")
      .toUpperCase() || "MN",
    instagramUrl: business.instagramUrl || null,
    facebookUrl: business.facebookUrl || null,
    tiktokUrl: null,
    websiteUrl: business.websiteUrl || null,
    whatsapp: business.whatsapp || null,
    email: business.email || null,
    googleMapsUrl: business.googleMapsUrl || null,
    mapEmbedUrl: null,
    ctaLabel: business.ctaLabel || "Reservar ahora",
    showHero: business.showHero,
    showAbout: business.showAbout,
    showFeaturedMenu: business.showMenu,
    showGallery: business.showGallery,
    showMenu: business.showMenu,
    showLocation: business.showLocation,
    showReservation: business.showReservation,
    showReservations: business.showReservation,
    showWhatsappButton: business.showWhatsappButton,
    showEmailButton: true,
    showSocials: true,
    updatedAt: business.updatedAt,
  };
}

function mapSupabaseRowToWebContent(row: SupabaseWebContentRow, business: Business): PublicWebContent {
  const defaults = getBusinessDefaults(business);
  const heroImage = row.hero_image_url?.trim() ?? "";

  return {
    ...defaults,
    businessId: business.id,
    publicName: business.name,
    publicSubtitle: row.hero_subtitle?.trim() || defaults.publicSubtitle,
    publicDescription: row.about_text?.trim() || defaults.publicDescription,
    publicBadge: row.hero_badge?.trim() || defaults.publicBadge,
    publicAttributesText: toJsonArray(row.public_tags).join(", ") || defaults.publicAttributesText,
    publicTemplateId: defaults.publicTemplateId,
    heroDescription: row.about_text?.trim() || defaults.heroDescription,
    publicCategory: business.category,
    publicCity: business.city,
    publicAddress: business.address,
    publicPhone: business.phone,
    heroTitle: row.hero_title?.trim() || defaults.heroTitle,
    heroSubtitle: row.hero_subtitle?.trim() || defaults.heroSubtitle,
    heroSecondaryCtaLabel: defaults.heroSecondaryCtaLabel,
    menuTitle: defaults.menuTitle,
    menuSubtitle: defaults.menuSubtitle,
    aboutTitle: row.about_title?.trim() || defaults.aboutTitle,
    aboutText: row.about_text?.trim() || defaults.aboutText,
    presentationTitle: row.about_title?.trim() || defaults.presentationTitle,
    presentationText: row.about_secondary_text?.trim() || row.about_text?.trim() || defaults.presentationText,
    aboutHighlights: toJsonArray(row.public_tags),
    featuredPhrase: row.hero_badge?.trim() || defaults.featuredPhrase,
    mapLabel: defaults.mapLabel,
    locationTitle: defaults.locationTitle,
    locationText: defaults.locationText,
    heroImageDataUrl: heroImage.startsWith("data:") ? heroImage : null,
    heroImageUrl: heroImage && !heroImage.startsWith("data:") ? heroImage : null,
    heroImagePlaceholder: defaults.heroImagePlaceholder,
    instagramUrl: business.instagramUrl || null,
    facebookUrl: business.facebookUrl || null,
    tiktokUrl: defaults.tiktokUrl,
    websiteUrl: business.websiteUrl || null,
    whatsapp: business.whatsapp || null,
    email: business.email || null,
    googleMapsUrl: business.googleMapsUrl || null,
    mapEmbedUrl: defaults.mapEmbedUrl,
    ctaLabel: defaults.ctaLabel,
    showHero: row.show_hero,
    showAbout: row.show_about,
    showFeaturedMenu: row.show_featured_menu,
    showGallery: row.show_gallery,
    showMenu: row.show_full_menu,
    showLocation: row.show_location,
    showReservation: row.show_reservations,
    showReservations: row.show_reservations,
    showWhatsappButton: row.show_whatsapp,
    showEmailButton: row.show_email,
    showSocials: row.show_socials,
    updatedAt: row.updated_at ?? nowIso(),
  };
}

export async function mapSupabaseWebContentToWebContent(row: SupabaseWebContentRow) {
  const business = await getBusinessById(row.business_id);

  if (!business) {
    throw new Error("No se encontró el negocio para leer su contenido web.");
  }

  return mapSupabaseRowToWebContent(row, business);
}

export function mapWebContentInputToSupabaseRow(
  businessId: string,
  data: WebContentInput,
  options?: { createdAt?: string | null; updatedAt?: string | null },
): SupabaseWebContentPayload {
  return {
    business_id: businessId,
    hero_title: toText(data.heroTitle) || null,
    hero_subtitle: toText(data.heroSubtitle) || null,
    hero_badge: toText(data.publicBadge) || null,
    about_title: toText(data.aboutTitle) || null,
    about_text: toText(data.aboutText) || null,
    about_secondary_text: toText(data.presentationText) || null,
    public_tags:
      Array.isArray(data.aboutHighlights) && data.aboutHighlights.length > 0
        ? data.aboutHighlights
        : toJsonArrayFromText(data.publicAttributesText),
    hero_image_url:
      toText(data.heroImageDataUrl) ||
      toText(data.heroImageUrl) ||
      null,
    show_hero: typeof data.showHero === "boolean" ? data.showHero : true,
    show_about: typeof data.showAbout === "boolean" ? data.showAbout : true,
    show_featured_menu:
      typeof data.showFeaturedMenu === "boolean"
        ? data.showFeaturedMenu
        : typeof data.showMenu === "boolean"
          ? data.showMenu
          : true,
    show_full_menu: typeof data.showMenu === "boolean" ? data.showMenu : true,
    show_gallery: typeof data.showGallery === "boolean" ? data.showGallery : true,
    show_location: typeof data.showLocation === "boolean" ? data.showLocation : true,
    show_reservations:
      typeof data.showReservations === "boolean"
        ? data.showReservations
        : typeof data.showReservation === "boolean"
          ? data.showReservation
          : true,
    show_whatsapp: typeof data.showWhatsappButton === "boolean" ? data.showWhatsappButton : true,
    show_email: typeof data.showEmailButton === "boolean" ? data.showEmailButton : true,
    show_socials: typeof data.showSocials === "boolean" ? data.showSocials : true,
    created_at: options?.createdAt ?? nowIso(),
    updated_at: options?.updatedAt ?? nowIso(),
  };
}

function formatSupabaseWebContentError(table: string, error: unknown) {
  return formatSupabaseError(table, error);
}

async function getBusinessOrThrow(businessId: string) {
  const business = await getBusinessById(businessId);

  if (!business) {
    throw new Error("No se encontró el negocio para editar su contenido web.");
  }

  return business;
}

async function readCurrentRow(businessId: string) {
  const supabase = getSupabaseClientOrThrow();
  const { data, error } = await supabase
    .schema("public")
    .from("business_web_content")
    .select(WEB_CONTENT_SELECT)
    .eq("business_id", businessId)
    .maybeSingle();

  if (error) {
    throw formatSupabaseWebContentError("business_web_content", error);
  }

  return (data as SupabaseWebContentRow | null) ?? null;
}

export async function getSupabaseWebContentByBusiness(businessId: string) {
  const business = await getBusinessOrThrow(businessId);
  const row = await readCurrentRow(businessId);

  if (!row) {
    return getBusinessDefaults(business);
  }

  return mapSupabaseRowToWebContent(row, business);
}

export async function upsertSupabaseWebContent(
  businessId: string,
  data: WebContentInput,
) {
  const business = await getBusinessOrThrow(businessId);
  const current = await readCurrentRow(businessId);
  const payload = mapWebContentInputToSupabaseRow(businessId, data, {
    createdAt: current?.created_at ?? nowIso(),
    updatedAt: nowIso(),
  });

  const supabase = getSupabaseClientOrThrow();
  const { data: inserted, error } = await supabase
    .schema("public")
    .from("business_web_content")
    .upsert(payload, { onConflict: "business_id" })
    .select(WEB_CONTENT_SELECT)
    .single();

  if (error) {
    throw formatSupabaseWebContentError("business_web_content", error);
  }

  return mapSupabaseRowToWebContent(inserted as SupabaseWebContentRow, business);
}

export async function updateSupabaseWebContent(
  businessId: string,
  data: WebContentInput,
) {
  return upsertSupabaseWebContent(businessId, data);
}
