export const V2_OPERATIONAL_STORAGE_KEYS = {
  reservations: "tango-v2-reservations-calendar-v2",
  deliveries: "tango-v2-deliveries-v1",
  localConfig: "tango-v2-local-config-v1",
  stockProducts: "tango-v2-stock-products",
  expenses: "tango-v2-expenses-v1",
  cashRegister: "tango-v2-cash-register-v1",
  menuItems: "tango-v2-menu-items",
  menuCategories: "tango-v2-menu-categories",
  stockMovements: "tango-v2-stock-movements",
  floorTables: "tango-v2-floor-tables",
  floorBackground: "tango-v2-floor-background",
  floorBackgroundSettings: "tango-v2-floor-background-settings",
  webConfig: "tango-v2-local-web-config-v1",
  publicMenuSections: "tango-v2-public-menu-sections-v1",
  clientsMeta: "tango-v2-clients-meta-v1",
  manualClients: "tango-v2-manual-clients-v1",
} as const;

export const V2_OPERATIONAL_EVENTS = {
  reservations: "tango-v2-reservations-updated",
  deliveries: "tango-v2-deliveries-updated",
  localConfig: "tango-v2-local-config-updated",
  stockProducts: "tango-v2-stock-products-updated",
  expenses: "tango-v2-expenses-updated",
  cashRegister: "tango-v2-cash-register-updated",
  menuItems: "tango-v2-menu-items-updated",
  menuCategories: "tango-v2-menu-categories-updated",
  floorTables: "tango-v2-floor-tables-updated",
  webConfig: "tango-v2-local-web-config-updated",
  publicMenuSections: "tango-v2-public-menu-sections-updated",
  clientsMeta: "tango-v2-clients-meta-updated",
  manualClients: "tango-v2-manual-clients-updated",
} as const;

export function createV2OperationalId(prefix: string) {
  const randomId = globalThis.crypto?.randomUUID?.();

  if (randomId) return `${prefix}-${randomId}`;

  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function createV2PublicCode(prefix: "PED" | "RES", seed: string) {
  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return `${prefix}-${hash
    .toString(36)
    .toUpperCase()
    .slice(0, 5)
    .padStart(5, "0")}`;
}
