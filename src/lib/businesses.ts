import type { Business, BusinessFormValues } from "@/data/types";
import { createSlug, createUniqueSlug } from "./slug";
import { defaultThemeId, initialBusinesses } from "@/mocks/businesses";
import { LOCAL_STORE_EVENTS, LOCAL_STORE_KEYS } from "@/lib/data/localStore";
import { deleteCRMForBusiness } from "@/lib/crm";
import { deleteFloorPlanBackgroundForBusiness } from "@/lib/floor-plan-background";
import { deleteFloorPlanForBusiness } from "@/lib/floor-plan";
import { deleteMenuForBusiness, duplicateMenuForBusiness } from "@/data/menu";
import { resetReservationsForBusiness } from "@/lib/reservations";
import {
  deleteBusinessSchedulingData,
  duplicateBusinessSchedulingData,
} from "@/lib/scheduling";
import { duplicateFloorPlanForBusiness } from "@/lib/floor-plan";

const STORAGE_KEY = LOCAL_STORE_KEYS.businesses;
const CHANGE_EVENT = LOCAL_STORE_EVENTS.businesses;
const BASE_BUSINESS_IDS = new Set(initialBusinesses.map((business) => business.id));
const PUBLIC_WEB_STORAGE_KEY = LOCAL_STORE_KEYS.publicWeb;
const PUBLIC_WEB_CHANGE_EVENT = LOCAL_STORE_EVENTS.publicWeb;

let businessStore: Business[] = initialBusinesses.map((business) => ({ ...business }));
let hasHydratedFromStorage = false;

function cloneBusiness(business: Business) {
  return { ...business };
}

function cloneBusinesses(businesses: Business[]) {
  return businesses.map(cloneBusiness);
}

type StoredPublicWebContent = {
  businessId: string;
  updatedAt?: string;
  [key: string]: unknown;
};

type StoredPublicWebGalleryItem = {
  id: string;
  businessId: string;
  updatedAt?: string;
  createdAt?: string;
  [key: string]: unknown;
};

type StoredPublicWebState = {
  content: StoredPublicWebContent[];
  gallery: StoredPublicWebGalleryItem[];
};

function nowIso() {
  return new Date().toISOString();
}

function normalizeBusinessSlug(value: string) {
  return createSlug(value);
}

function assertSlugAvailable(
  slug: string,
  existingSlugs: string[],
  currentSlug?: string,
) {
  const normalizedSlug = normalizeBusinessSlug(slug);

  if (!normalizedSlug) {
    throw new Error("El slug es obligatorio.");
  }

  if (currentSlug && normalizedSlug === currentSlug) {
    return normalizedSlug;
  }

  if (existingSlugs.includes(normalizedSlug)) {
    throw new Error("Este slug ya existe. Elegí otro slug.");
  }

  return normalizedSlug;
}

function isBrowser() {
  return typeof window !== "undefined";
}

function readPublicWebState(): StoredPublicWebState | null {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(PUBLIC_WEB_STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Partial<StoredPublicWebState>;
    return {
      content: Array.isArray(parsed.content) ? parsed.content : [],
      gallery: Array.isArray(parsed.gallery) ? parsed.gallery : [],
    };
  } catch {
    return null;
  }
}

function persistPublicWebState(state: StoredPublicWebState) {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(PUBLIC_WEB_STORAGE_KEY, JSON.stringify(state));
  window.dispatchEvent(new Event(PUBLIC_WEB_CHANGE_EVENT));
}

function clearPublicWebData(businessId: string) {
  const state = readPublicWebState();
  if (!state) {
    return;
  }

  persistPublicWebState({
    content: state.content.filter((entry) => entry.businessId !== businessId),
    gallery: state.gallery.filter((entry) => entry.businessId !== businessId),
  });
}

function duplicatePublicWebData(sourceBusinessId: string, targetBusinessId: string) {
  const state = readPublicWebState();
  if (!state) {
    return;
  }

  const timestamp = nowIso();
  const content = state.content.filter((entry) => entry.businessId !== targetBusinessId);
  const gallery = state.gallery.filter((entry) => entry.businessId !== targetBusinessId);
  const sourceContent = state.content.find((entry) => entry.businessId === sourceBusinessId);
  const sourceGallery = state.gallery.filter((entry) => entry.businessId === sourceBusinessId);

  if (sourceContent) {
    content.push({
      ...sourceContent,
      businessId: targetBusinessId,
      updatedAt: timestamp,
    });
  }

  if (sourceGallery.length > 0) {
    gallery.push(
      ...sourceGallery.map((item) => ({
      ...item,
      id:
          globalThis.crypto?.randomUUID?.() ??
          `web-gallery-${targetBusinessId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        businessId: targetBusinessId,
        createdAt: typeof item.createdAt === "string" ? item.createdAt : timestamp,
        updatedAt: timestamp,
      })),
    );
  }

  persistPublicWebState({
    content,
    gallery,
  });
}

function readBusinessesFromStorage() {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Business[];
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function loadStoreIfNeeded() {
  if (!isBrowser() || hasHydratedFromStorage) {
    return;
  }

  hasHydratedFromStorage = true;
  const storedBusinesses = readBusinessesFromStorage();
  if (storedBusinesses) {
    businessStore = storedBusinesses;
  }
}

function persistStore() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(businessStore));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function updateStore(nextBusinesses: Business[]) {
  businessStore = nextBusinesses;
  hasHydratedFromStorage = true;
  persistStore();
}

export function subscribeBusinesses(listener: () => void) {
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

export function getEmptyBusinessFormValues(): BusinessFormValues {
  return {
    name: "",
    slug: "",
    category: "",
    city: "",
    description: "",
    phone: "",
    whatsapp: "",
    email: "",
    address: "",
    googleMapsUrl: "",
    instagramUrl: "",
    facebookUrl: "",
    websiteUrl: "",
    logoUrl: "",
    coverImageUrl: "",
    primaryColor: "#06b6d4",
    secondaryColor: "#0f172a",
    themeId: defaultThemeId,
    heroTitle: "",
    heroSubtitle: "",
    aboutTitle: "",
    aboutText: "",
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
    autoConfirmReservations: true,
    status: "draft",
  };
}

export function toBusinessFormValues(business: Business): BusinessFormValues {
  const {
    name,
    slug,
    category,
    city,
    description,
    phone,
    whatsapp,
    email,
    address,
    googleMapsUrl,
    instagramUrl,
    facebookUrl,
    websiteUrl,
    logoUrl,
    coverImageUrl,
    primaryColor,
    secondaryColor,
    themeId,
    heroTitle,
    heroSubtitle,
    aboutTitle,
    aboutText,
    menuTitle,
    reservationTitle,
    ctaLabel,
    showHero,
    showAbout,
    showGallery,
    showMenu,
    showLocation,
    showReservation,
    showWhatsappButton,
    autoConfirmReservations,
    status,
  } = business;

  return {
    name,
    slug,
    category,
    city,
    description,
    phone,
    whatsapp,
    email,
    address,
    googleMapsUrl,
    instagramUrl,
    facebookUrl,
    websiteUrl,
    logoUrl,
    coverImageUrl,
    primaryColor,
    secondaryColor,
    themeId,
    heroTitle,
    heroSubtitle,
    aboutTitle,
    aboutText,
    menuTitle,
    reservationTitle,
    ctaLabel,
    showHero,
    showAbout,
    showGallery,
    showMenu,
    showLocation,
    showReservation,
    showWhatsappButton,
    autoConfirmReservations,
    status,
  };
}

function getStoreIndex(id: string) {
  return businessStore.findIndex((business) => business.id === id);
}

export function getBusinesses() {
  loadStoreIfNeeded();
  return cloneBusinesses(businessStore);
}

export function getBusinessBySlug(slug: string) {
  loadStoreIfNeeded();
  return businessStore.find((business) => business.slug === slug);
}

export function getBusinessSlugs() {
  loadStoreIfNeeded();
  return businessStore.map((business) => ({ slug: business.slug }));
}

export function getBusinessById(id: string) {
  loadStoreIfNeeded();
  return businessStore.find((business) => business.id === id);
}

export function createBusiness(data: BusinessFormValues) {
  loadStoreIfNeeded();
  const timestamp = nowIso();
  const existingSlugs = businessStore.map((business) => business.slug);
  const slug = assertSlugAvailable(data.slug || data.name, existingSlugs);

  const newBusiness: Business = {
    ...data,
    autoConfirmReservations: data.autoConfirmReservations ?? true,
    slug,
    id:
      globalThis.crypto?.randomUUID?.() ??
      `biz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  updateStore([newBusiness, ...businessStore]);
  return cloneBusiness(newBusiness);
}

export function updateBusiness(id: string, data: BusinessFormValues) {
  loadStoreIfNeeded();
  const index = getStoreIndex(id);

  if (index === -1) {
    return null;
  }

  const timestamp = nowIso();
  const current = businessStore[index];
  const existingSlugs = businessStore
    .filter((business) => business.id !== id)
    .map((business) => business.slug);
  const nextSlug = data.slug || current.slug;
  const slug = assertSlugAvailable(nextSlug, existingSlugs, current.slug);

  const updatedBusiness: Business = {
    ...current,
    ...data,
    autoConfirmReservations:
      data.autoConfirmReservations ?? current.autoConfirmReservations,
    slug,
    updatedAt: timestamp,
  };

  updateStore(
    businessStore.map((business, businessIndex) =>
      businessIndex === index ? updatedBusiness : business,
    ),
  );
  return cloneBusiness(updatedBusiness);
}

export function archiveBusiness(id: string) {
  loadStoreIfNeeded();
  const index = getStoreIndex(id);

  if (index === -1) {
    return null;
  }

  const timestamp = nowIso();
  const updatedBusiness: Business = {
    ...businessStore[index],
    status: "inactive",
    autoConfirmReservations: businessStore[index].autoConfirmReservations,
    updatedAt: timestamp,
  };

  updateStore(
    businessStore.map((business, businessIndex) =>
      businessIndex === index ? updatedBusiness : business,
    ),
  );
  return cloneBusiness(updatedBusiness);
}

export function restoreBusiness(id: string) {
  loadStoreIfNeeded();
  const index = getStoreIndex(id);

  if (index === -1) {
    return null;
  }

  const timestamp = nowIso();
  const updatedBusiness: Business = {
    ...businessStore[index],
    status: "active",
    autoConfirmReservations: businessStore[index].autoConfirmReservations,
    updatedAt: timestamp,
  };

  updateStore(
    businessStore.map((business, businessIndex) =>
      businessIndex === index ? updatedBusiness : business,
    ),
  );
  return cloneBusiness(updatedBusiness);
}

export function duplicateBusiness(id: string) {
  loadStoreIfNeeded();
  const source = getBusinessById(id);

  if (!source) {
    return null;
  }

  const timestamp = nowIso();
  const existingSlugs = businessStore.map((business) => business.slug);
  const slug = createUniqueSlug(`${source.slug}-copia`, existingSlugs);
  const copiedBusiness: Business = {
    ...source,
    id:
      globalThis.crypto?.randomUUID?.() ??
      `biz-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: `${source.name} Copia`,
    slug,
    autoConfirmReservations: source.autoConfirmReservations,
    status: "draft",
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  updateStore([copiedBusiness, ...businessStore]);
  duplicateMenuForBusiness(source.id, copiedBusiness.id);
  duplicateBusinessSchedulingData(source.id, copiedBusiness.id);
  duplicateFloorPlanForBusiness(source.id, copiedBusiness.id);
  duplicatePublicWebData(source.id, copiedBusiness.id);
  return cloneBusiness(copiedBusiness);
}

type DeleteBusinessResult =
  | { success: true; business: Business }
  | { success: false; reason: "not_found" | "protected" };

function clearBusinessRelatedData(businessId: string) {
  resetReservationsForBusiness(businessId);
  deleteBusinessSchedulingData(businessId);
  deleteFloorPlanForBusiness(businessId);
  deleteFloorPlanBackgroundForBusiness(businessId);
  deleteCRMForBusiness(businessId);
  deleteMenuForBusiness(businessId);
  clearPublicWebData(businessId);
}

export function deleteBusiness(id: string): DeleteBusinessResult {
  loadStoreIfNeeded();
  const index = getStoreIndex(id);

  if (index === -1) {
    return { success: false, reason: "not_found" };
  }

  if (BASE_BUSINESS_IDS.has(id)) {
    return { success: false, reason: "protected" };
  }

  const removedBusiness = cloneBusiness(businessStore[index]);
  clearBusinessRelatedData(id);
  updateStore(businessStore.filter((business) => business.id !== id));
  return { success: true, business: removedBusiness };
}

// This local data layer is intentionally isolated so it can be swapped for Supabase
// later without changing the admin UI or public page wiring.
