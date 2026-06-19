import type { Business, PublicWebContent, PublicWebGalleryItem } from "@/data/types";
import { getBusinesses } from "./businesses";
import { LOCAL_STORE_EVENTS, LOCAL_STORE_KEYS } from "@/lib/data/localStore";

type PublicWebStore = {
  content: PublicWebContent[];
  gallery: PublicWebGalleryItem[];
};

export type PublicWebSnapshotData = {
  content: PublicWebContent;
  gallery: PublicWebGalleryItem[];
};

const STORAGE_KEY = LOCAL_STORE_KEYS.publicWeb;
const CHANGE_EVENT = LOCAL_STORE_EVENTS.publicWeb;

let store: PublicWebStore = {
  content: [],
  gallery: [],
};
let hasHydratedFromStorage = false;

function isBrowser() {
  return typeof window !== "undefined";
}

function nowIso() {
  return new Date().toISOString();
}

function createId(prefix: string, businessId: string, name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  const randomPart =
    globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  return `${prefix}-${businessId}-${slug || "item"}-${randomPart}`;
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0] ?? "").join("").toUpperCase() || "MN";
}

function normalizeHeroImageUrl(value: string | null | undefined, defaultUrl: string | null) {
  const trimmed = typeof value === "string" ? value.trim() : "";

  if (!trimmed) {
    return null;
  }

  if (defaultUrl && trimmed === defaultUrl) {
    return null;
  }

  if (trimmed.startsWith("/mock/covers/")) {
    return null;
  }

  return trimmed;
}

function normalizeStringArray(value: unknown, fallback: string[]) {
  if (!Array.isArray(value)) {
    return fallback;
  }

  const nextValues = value
    .map((entry) => (typeof entry === "string" ? entry.trim() : ""))
    .filter((entry) => entry.length > 0);

  return nextValues.length > 0 ? nextValues.slice(0, 3) : fallback;
}

function normalizeCommaSeparatedText(value: string | null | undefined, fallback: string | null) {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed.length > 0 ? trimmed : fallback;
}

function normalizeTemplateId(value: string | null | undefined, fallback: PublicWebContent["publicTemplateId"]) {
  const trimmed = typeof value === "string" ? value.trim() : "";

  if (trimmed === "restaurant-elegant" || trimmed === "compact-premium" || trimmed === "minimal-cafe") {
    return trimmed;
  }

  return fallback;
}

function getDefaultPublicTemplateId(business: Business) {
  const category = business.category.toLowerCase();

  if (category.includes("caf") || category.includes("brunch")) {
    return "minimal-cafe";
  }

  if (category.includes("bar") || category.includes("parador") || category.includes("beach")) {
    return "compact-premium";
  }

  return "restaurant-elegant";
}

function getDefaultHighlights(business: Business) {
  const category = business.category.toLowerCase();

  if (category.includes("caf")) {
    return ["Brunch de especialidad", "Café de autor", "Mesas tranquilas"];
  }

  if (category.includes("bar") || category.includes("coct")) {
    return ["Coctelería de autor", "Noches con ambiente", "Reservas para grupos"];
  }

  return ["Cocina de autor", "Reservas cuidadas", "Atención personalizada"];
}

function cloneContent(content: PublicWebContent) {
  return { ...content };
}

function cloneGalleryItem(item: PublicWebGalleryItem) {
  return { ...item };
}

function readStoreFromStorage() {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<PublicWebStore>;
    return {
      content: Array.isArray(parsed.content) ? parsed.content : [],
      gallery: Array.isArray(parsed.gallery) ? parsed.gallery : [],
    } satisfies PublicWebStore;
  } catch {
    return null;
  }
}

function persistStore() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function updateStore(nextStore: PublicWebStore) {
  store = nextStore;
  hasHydratedFromStorage = true;
  persistStore();
}

function loadStoreIfNeeded() {
  if (!isBrowser() || hasHydratedFromStorage) {
    return;
  }

  hasHydratedFromStorage = true;
  const stored = readStoreFromStorage();
  if (stored) {
    store = {
      content: stored.content.map((entry) => ({ ...entry })),
      gallery: stored.gallery.map((entry) => ({ ...entry })),
    };
  }
}

function getBusinessDefaults(business: Business): PublicWebContent {
  const timestamp = business.updatedAt ?? nowIso();
  return {
    businessId: business.id,
    publicName: business.name,
    publicSubtitle: business.description,
    publicDescription: business.description,
    publicBadge: business.category,
    publicAttributesText: getDefaultHighlights(business).join(", "),
    publicTemplateId: getDefaultPublicTemplateId(business),
    heroDescription: business.description,
    publicCategory: business.category,
    publicCity: business.city,
    publicAddress: business.address,
    publicPhone: business.phone,
    heroTitle: business.heroTitle || business.name,
    heroSubtitle: business.heroSubtitle || business.description,
    heroSecondaryCtaLabel: business.showMenu ? "Ver menú" : null,
    menuTitle: business.menuTitle || "Selección destacada",
    menuSubtitle: "Algunas opciones recomendadas por el local.",
    aboutTitle: business.aboutTitle || "Presentación",
    aboutText: business.aboutText || business.description,
    presentationTitle: business.aboutTitle || "Presentación",
    presentationText: business.aboutText || business.description,
    aboutHighlights: getDefaultHighlights(business),
    featuredPhrase: business.menuTitle || business.ctaLabel || "Experiencia del negocio",
    mapLabel: "Ubicación",
    locationTitle: "Ubicación",
    locationText: business.address || business.city,
    heroImageDataUrl: null,
    heroImageUrl: null,
    heroImagePlaceholder: getInitials(business.name),
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
    updatedAt: timestamp,
  };
}

function buildSnapshotData(businessId: string, includeStoredData: boolean): PublicWebSnapshotData {
  const business = getBusinessByIdOrThrow(businessId);

  if (!includeStoredData) {
    return {
      content: getBusinessDefaults(business),
      gallery: [],
    };
  }

  const current = getBusinessContentInternal(businessId);
  return {
    content: current ? normalizeContent(current, business) : getBusinessDefaults(business),
    gallery: getBusinessGalleryInternal(businessId).map(cloneGalleryItem),
  };
}

function normalizeContent(
  content: Partial<PublicWebContent> & { businessId: string },
  business: Business,
): PublicWebContent {
  const defaults = getBusinessDefaults(business);

  return {
    ...defaults,
    ...content,
    businessId: business.id,
    publicName: content.publicName?.trim() || defaults.publicName,
    publicSubtitle: content.publicSubtitle?.trim() || defaults.publicSubtitle,
    publicDescription: content.publicDescription?.trim() || defaults.publicDescription,
    publicBadge: normalizeCommaSeparatedText(content.publicBadge, defaults.publicBadge ?? null),
    publicAttributesText: normalizeCommaSeparatedText(
      content.publicAttributesText,
      defaults.publicAttributesText ?? null,
    ),
    publicTemplateId: normalizeTemplateId(content.publicTemplateId, defaults.publicTemplateId),
    heroDescription: content.heroDescription?.trim() || defaults.heroDescription,
    publicCategory: content.publicCategory?.trim() || defaults.publicCategory,
    publicCity: content.publicCity?.trim() || defaults.publicCity,
    publicAddress: content.publicAddress?.trim() || defaults.publicAddress,
    publicPhone: content.publicPhone?.trim() || defaults.publicPhone,
    heroTitle: content.heroTitle?.trim() || defaults.heroTitle,
    heroSubtitle: content.heroSubtitle?.trim() || defaults.heroSubtitle,
    heroSecondaryCtaLabel:
      content.heroSecondaryCtaLabel?.trim() || defaults.heroSecondaryCtaLabel,
    menuTitle: content.menuTitle?.trim() || defaults.menuTitle,
    menuSubtitle: content.menuSubtitle?.trim() || defaults.menuSubtitle,
    aboutTitle: content.aboutTitle?.trim() || defaults.aboutTitle,
    aboutText: content.aboutText?.trim() || defaults.aboutText,
    presentationTitle: content.presentationTitle?.trim() || defaults.presentationTitle,
    presentationText: content.presentationText?.trim() || defaults.presentationText,
    aboutHighlights: normalizeStringArray(content.aboutHighlights, defaults.aboutHighlights || []),
    featuredPhrase: content.featuredPhrase?.trim() || defaults.featuredPhrase,
    mapLabel: content.mapLabel?.trim() || defaults.mapLabel,
    locationTitle: content.locationTitle?.trim() || defaults.locationTitle,
    locationText: content.locationText?.trim() || defaults.locationText,
    heroImageDataUrl:
      typeof content.heroImageDataUrl === "string" && content.heroImageDataUrl.trim().length > 0
        ? content.heroImageDataUrl.trim()
        : defaults.heroImageDataUrl,
    heroImageUrl: normalizeHeroImageUrl(content.heroImageUrl, business.coverImageUrl),
    heroImagePlaceholder:
      typeof content.heroImagePlaceholder === "string" && content.heroImagePlaceholder.trim().length > 0
        ? content.heroImagePlaceholder.trim()
        : defaults.heroImagePlaceholder,
    instagramUrl:
      typeof content.instagramUrl === "string" && content.instagramUrl.trim().length > 0
        ? content.instagramUrl.trim()
        : defaults.instagramUrl,
    facebookUrl:
      typeof content.facebookUrl === "string" && content.facebookUrl.trim().length > 0
        ? content.facebookUrl.trim()
        : defaults.facebookUrl,
    tiktokUrl:
      typeof content.tiktokUrl === "string" && content.tiktokUrl.trim().length > 0
        ? content.tiktokUrl.trim()
        : defaults.tiktokUrl,
    websiteUrl:
      typeof content.websiteUrl === "string" && content.websiteUrl.trim().length > 0
        ? content.websiteUrl.trim()
        : defaults.websiteUrl,
    whatsapp:
      typeof content.whatsapp === "string" && content.whatsapp.trim().length > 0
        ? content.whatsapp.trim()
        : defaults.whatsapp,
    email:
      typeof content.email === "string" && content.email.trim().length > 0
        ? content.email.trim()
        : defaults.email,
    googleMapsUrl:
      typeof content.googleMapsUrl === "string" && content.googleMapsUrl.trim().length > 0
        ? content.googleMapsUrl.trim()
        : defaults.googleMapsUrl,
    mapEmbedUrl:
      typeof content.mapEmbedUrl === "string" && content.mapEmbedUrl.trim().length > 0
        ? content.mapEmbedUrl.trim()
        : defaults.mapEmbedUrl,
    ctaLabel: content.ctaLabel?.trim() || defaults.ctaLabel,
    showHero: typeof content.showHero === "boolean" ? content.showHero : defaults.showHero,
    showAbout: typeof content.showAbout === "boolean" ? content.showAbout : defaults.showAbout,
    showFeaturedMenu:
      typeof content.showFeaturedMenu === "boolean"
        ? content.showFeaturedMenu
        : defaults.showFeaturedMenu ?? defaults.showMenu,
    showGallery: typeof content.showGallery === "boolean" ? content.showGallery : defaults.showGallery,
    showMenu: typeof content.showMenu === "boolean" ? content.showMenu : defaults.showMenu,
    showLocation:
      typeof content.showLocation === "boolean" ? content.showLocation : defaults.showLocation,
    showReservation:
      typeof content.showReservation === "boolean"
        ? content.showReservation
        : typeof content.showReservations === "boolean"
          ? content.showReservations
          : defaults.showReservation,
    showReservations:
      typeof content.showReservations === "boolean"
        ? content.showReservations
        : typeof content.showReservation === "boolean"
          ? content.showReservation
          : defaults.showReservation,
    showWhatsappButton:
      typeof content.showWhatsappButton === "boolean"
        ? content.showWhatsappButton
        : defaults.showWhatsappButton,
    showEmailButton:
      typeof content.showEmailButton === "boolean"
        ? content.showEmailButton
        : defaults.showEmailButton ?? true,
    showSocials:
      typeof content.showSocials === "boolean"
        ? content.showSocials
        : defaults.showSocials ?? true,
    updatedAt: typeof content.updatedAt === "string" ? content.updatedAt : nowIso(),
  };
}

function normalizeGalleryItem(
  item: Partial<PublicWebGalleryItem> & { businessId: string },
  business: Business,
): PublicWebGalleryItem {
  const timestamp = typeof item.createdAt === "string" ? item.createdAt : nowIso();
  const title = item.title?.trim() || "Imagen";
  const altText =
    typeof item.altText === "string" && item.altText.trim().length > 0
      ? item.altText.trim()
      : item.description?.trim() || null;

  return {
    id: item.id ?? createId("web-gallery", business.id, title),
    businessId: business.id,
    title,
    description: item.description?.trim() || null,
    altText,
    imageDataUrl:
      typeof item.imageDataUrl === "string" && item.imageDataUrl.trim().length > 0
        ? item.imageDataUrl.trim()
        : null,
    imageUrl:
      typeof item.imageUrl === "string" && item.imageUrl.trim().length > 0
        ? item.imageUrl.trim()
        : null,
    imagePlaceholder:
      typeof item.imagePlaceholder === "string" && item.imagePlaceholder.trim().length > 0
        ? item.imagePlaceholder.trim()
        : getInitials(title),
    isActive: typeof item.isActive === "boolean" ? item.isActive : true,
    sortOrder: Number.isFinite(item.sortOrder) ? Number(item.sortOrder) : 0,
    createdAt: timestamp,
    updatedAt: typeof item.updatedAt === "string" ? item.updatedAt : timestamp,
  };
}

function getBusinessContentInternal(businessId: string) {
  return store.content.find((entry) => entry.businessId === businessId) ?? null;
}

function getBusinessGalleryInternal(businessId: string) {
  return store.gallery
    .filter((entry) => entry.businessId === businessId)
    .sort((left, right) => left.sortOrder - right.sortOrder || left.title.localeCompare(right.title));
}

function getBusinessByIdOrThrow(businessId: string) {
  const business = getBusinesses().find((entry) => entry.id === businessId);
  if (!business) {
    throw new Error("Negocio no encontrado.");
  }

  return business;
}

export function getPublicWebContentByBusinessId(businessId: string) {
  loadStoreIfNeeded();
  const business = getBusinessByIdOrThrow(businessId);
  const current = getBusinessContentInternal(businessId);
  return cloneContent(current ? normalizeContent(current, business) : getBusinessDefaults(business));
}

export function getPublicWebGalleryByBusinessId(businessId: string) {
  loadStoreIfNeeded();
  return getBusinessGalleryInternal(businessId).map(cloneGalleryItem);
}

export function getPublicWebSnapshot(businessId: string) {
  loadStoreIfNeeded();
  return JSON.stringify(buildSnapshotData(businessId, true));
}

export function getPublicWebServerSnapshot(businessId: string) {
  return JSON.stringify(buildSnapshotData(businessId, false));
}

export function updatePublicWebContent(
  businessId: string,
  data: Partial<Omit<PublicWebContent, "businessId" | "updatedAt">>,
) {
  loadStoreIfNeeded();
  const business = getBusinessByIdOrThrow(businessId);
  const current = getBusinessContentInternal(businessId);
  const timestamp = nowIso();
  const normalized = normalizeContent(
    {
      ...current,
      ...data,
      businessId,
      updatedAt: timestamp,
    },
    business,
  );

  const nextContent = store.content.filter((entry) => entry.businessId !== businessId);
  nextContent.push(normalized);

  updateStore({
    content: nextContent,
    gallery: store.gallery,
  });

  return cloneContent(normalized);
}

export function resetPublicWebContent(businessId: string) {
  loadStoreIfNeeded();
  const business = getBusinessByIdOrThrow(businessId);
  const defaults = getBusinessDefaults(business);
  updateStore({
    content: store.content.filter((entry) => entry.businessId !== businessId),
    gallery: store.gallery.filter((entry) => entry.businessId !== businessId),
  });
  return cloneContent(defaults);
}

export function createPublicWebGalleryItem(
  businessId: string,
  data: Pick<
    PublicWebGalleryItem,
    "title" | "description" | "altText" | "imageDataUrl" | "imageUrl" | "imagePlaceholder" | "isActive"
  >,
) {
  loadStoreIfNeeded();
  const business = getBusinessByIdOrThrow(businessId);
  const timestamp = nowIso();
  const item = normalizeGalleryItem(
    {
      ...data,
      businessId,
      updatedAt: timestamp,
      createdAt: timestamp,
      id: createId("web-gallery", businessId, data.title),
    },
    business,
  );

  updateStore({
    content: store.content,
    gallery: [item, ...store.gallery],
  });

  return cloneGalleryItem(item);
}

export function updatePublicWebGalleryItem(
  itemId: string,
  data: Partial<
    Pick<
      PublicWebGalleryItem,
      "title" | "description" | "altText" | "imageDataUrl" | "imageUrl" | "imagePlaceholder" | "isActive" | "sortOrder"
    >
  >,
) {
  loadStoreIfNeeded();
  const index = store.gallery.findIndex((item) => item.id === itemId);
  if (index === -1) {
    return null;
  }

  const current = store.gallery[index];
  const business = getBusinessByIdOrThrow(current.businessId);
  const updated = normalizeGalleryItem(
    {
      ...current,
      ...data,
      businessId: current.businessId,
      updatedAt: nowIso(),
    },
    business,
  );

  updateStore({
    content: store.content,
    gallery: store.gallery.map((item, itemIndex) => (itemIndex === index ? updated : item)),
  });

  return cloneGalleryItem(updated);
}

export function togglePublicWebGalleryItemStatus(itemId: string) {
  loadStoreIfNeeded();
  const item = store.gallery.find((entry) => entry.id === itemId);
  if (!item) {
    return null;
  }

  return updatePublicWebGalleryItem(itemId, { isActive: !item.isActive });
}

export function deletePublicWebGalleryItem(itemId: string) {
  loadStoreIfNeeded();
  const exists = store.gallery.some((entry) => entry.id === itemId);
  if (!exists) {
    return false;
  }

  updateStore({
    content: store.content,
    gallery: store.gallery.filter((entry) => entry.id !== itemId),
  });
  return true;
}

export function movePublicWebGalleryItem(itemId: string, direction: -1 | 1) {
  loadStoreIfNeeded();
  const item = store.gallery.find((entry) => entry.id === itemId);
  if (!item) {
    return null;
  }

  const items = getBusinessGalleryInternal(item.businessId).filter(
    (entry) => entry.businessId === item.businessId,
  );
  const index = items.findIndex((entry) => entry.id === itemId);
  const targetIndex = index + direction;

  if (index === -1 || targetIndex < 0 || targetIndex >= items.length) {
    return null;
  }

  const current = items[index];
  const target = items[targetIndex];
  const timestamp = nowIso();

  const updatedItems = store.gallery.map((entry) => {
    if (entry.id === current.id) {
      return { ...entry, sortOrder: target.sortOrder, updatedAt: timestamp };
    }
    if (entry.id === target.id) {
      return { ...entry, sortOrder: current.sortOrder, updatedAt: timestamp };
    }
    return entry;
  });

  updateStore({
    content: store.content,
    gallery: updatedItems,
  });

  return cloneGalleryItem(updatedItems.find((entry) => entry.id === itemId) ?? current);
}

export function subscribePublicWeb(listener: () => void) {
  if (!isBrowser()) {
    return () => {};
  }

  const onCustomChange = () => listener();
  const onStorageChange = () => listener();

  window.addEventListener(CHANGE_EVENT, onCustomChange);
  window.addEventListener("storage", onStorageChange);

  return () => {
    window.removeEventListener(CHANGE_EVENT, onCustomChange);
    window.removeEventListener("storage", onStorageChange);
  };
}
