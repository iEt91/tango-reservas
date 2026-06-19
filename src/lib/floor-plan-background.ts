import type { FloorPlanBackground, FloorPlanBackgroundFit } from "@/data/types";
import { LOCAL_STORE_EVENTS, LOCAL_STORE_KEYS } from "@/lib/data/localStore";

const STORAGE_KEY = LOCAL_STORE_KEYS.floorPlanBackground;
const CHANGE_EVENT = LOCAL_STORE_EVENTS.floorPlanBackground;

let floorPlanBackgroundStore: FloorPlanBackground[] = [];
let hasHydratedFromStorage = false;

function isBrowser() {
  return typeof window !== "undefined";
}

function nowIso() {
  return new Date().toISOString();
}

function cloneBackground(background: FloorPlanBackground) {
  return { ...background };
}

function toNumber(value: unknown, fallback: number) {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeBackground(
  raw: Partial<FloorPlanBackground> & Record<string, unknown>,
  businessId: string,
): FloorPlanBackground {
  const legacyImage = typeof raw.imageUrl === "string" ? raw.imageUrl : null;
  const legacyOpacity = clamp(toNumber(raw.opacity, 50), 0, 100);
  const legacyBrightness = clamp(toNumber(raw.brightness, 100), 0, 100);
  const legacyContrast = clamp(toNumber(raw.contrast, 100), 0, 100);
  const legacyX = toNumber(raw.backgroundX, 0);
  const legacyY = toNumber(raw.backgroundY, 0);
  const legacyWidth = Math.max(100, toNumber(raw.backgroundWidth, 1000));
  const legacyHeight = Math.max(100, toNumber(raw.backgroundHeight, 600));
  const legacyFit = "stretch";

  return {
    businessId,
    backgroundImage:
      typeof raw.backgroundImage === "string"
        ? raw.backgroundImage
        : legacyImage,
    backgroundOpacity: clamp(toNumber(raw.backgroundOpacity, legacyOpacity), 0, 100),
    backgroundBrightness: clamp(toNumber(raw.backgroundBrightness, legacyBrightness), 0, 100),
    backgroundContrast: clamp(toNumber(raw.backgroundContrast, legacyContrast), 0, 100),
    backgroundX: legacyX,
    backgroundY: legacyY,
    backgroundWidth: legacyWidth,
    backgroundHeight: legacyHeight,
    fit: legacyFit,
    updatedAt:
      typeof raw.updatedAt === "string" ? raw.updatedAt : nowIso(),
  };
}

function readBackgroundsFromStorage() {
  if (!isBrowser()) {
    return null;
  }

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as Array<Record<string, unknown>>;
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
  const storedBackgrounds = readBackgroundsFromStorage();
  if (storedBackgrounds) {
    floorPlanBackgroundStore = storedBackgrounds.map((entry) =>
      normalizeBackground(entry, typeof entry.businessId === "string" ? entry.businessId : ""),
    );
  }
}

function persistStore() {
  if (!isBrowser()) {
    return;
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(floorPlanBackgroundStore));
  window.dispatchEvent(new Event(CHANGE_EVENT));
}

function updateStore(nextBackgrounds: FloorPlanBackground[]) {
  floorPlanBackgroundStore = nextBackgrounds;
  hasHydratedFromStorage = true;
  persistStore();
}

function getDefaultBackground(businessId: string): FloorPlanBackground {
  return {
    businessId,
    backgroundImage: null,
    backgroundOpacity: 50,
    backgroundBrightness: 100,
    backgroundContrast: 100,
    backgroundX: 0,
    backgroundY: 0,
    backgroundWidth: 1000,
    backgroundHeight: 600,
    fit: "stretch",
    updatedAt: nowIso(),
  };
}

function getStoreIndex(businessId: string) {
  return floorPlanBackgroundStore.findIndex(
    (background) => background.businessId === businessId,
  );
}

export function getFloorPlanBackgroundByBusinessId(businessId: string) {
  loadStoreIfNeeded();
  const background =
    floorPlanBackgroundStore.find((entry) => entry.businessId === businessId) ??
    getDefaultBackground(businessId);

  return cloneBackground(background);
}

export function updateFloorPlanBackground(
  businessId: string,
  data: Partial<
    Pick<
      FloorPlanBackground,
      | "backgroundImage"
      | "backgroundOpacity"
      | "backgroundBrightness"
      | "backgroundContrast"
      | "backgroundX"
      | "backgroundY"
      | "backgroundWidth"
      | "backgroundHeight"
      | "fit"
    >
  >,
) {
  loadStoreIfNeeded();
  const index = getStoreIndex(businessId);
  const current = index >= 0 ? floorPlanBackgroundStore[index] : getDefaultBackground(businessId);
  const updatedBackground: FloorPlanBackground = {
    ...current,
    ...data,
    backgroundOpacity:
      typeof data.backgroundOpacity === "number"
        ? clamp(data.backgroundOpacity, 0, 100)
        : current.backgroundOpacity,
    backgroundBrightness:
      typeof data.backgroundBrightness === "number"
        ? clamp(data.backgroundBrightness, 0, 100)
        : current.backgroundBrightness,
    backgroundContrast:
      typeof data.backgroundContrast === "number"
        ? clamp(data.backgroundContrast, 0, 100)
        : current.backgroundContrast,
    backgroundWidth:
      typeof data.backgroundWidth === "number" ? Math.max(100, data.backgroundWidth) : current.backgroundWidth,
    backgroundHeight:
      typeof data.backgroundHeight === "number" ? Math.max(100, data.backgroundHeight) : current.backgroundHeight,
    businessId,
    updatedAt: nowIso(),
  };

  if (index >= 0) {
    updateStore(
      floorPlanBackgroundStore.map((entry, entryIndex) =>
        entryIndex === index ? updatedBackground : entry,
      ),
    );
  } else {
    updateStore([updatedBackground, ...floorPlanBackgroundStore]);
  }

  return cloneBackground(updatedBackground);
}

export function resetFloorPlanBackground(businessId: string) {
  loadStoreIfNeeded();
  const defaultBackground = getDefaultBackground(businessId);
  const index = getStoreIndex(businessId);

  if (index >= 0) {
    updateStore(
      floorPlanBackgroundStore.map((entry, entryIndex) =>
        entryIndex === index ? defaultBackground : entry,
      ),
    );
  } else {
    updateStore([defaultBackground, ...floorPlanBackgroundStore]);
  }

  return cloneBackground(defaultBackground);
}

export function deleteFloorPlanBackgroundForBusiness(businessId: string) {
  loadStoreIfNeeded();
  updateStore(
    floorPlanBackgroundStore.filter((background) => background.businessId !== businessId),
  );
}

export function subscribeFloorPlanBackground(listener: () => void) {
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

export function defaultFloorPlanBackground(businessId: string): FloorPlanBackground {
  return getDefaultBackground(businessId);
}

export type { FloorPlanBackgroundFit };
