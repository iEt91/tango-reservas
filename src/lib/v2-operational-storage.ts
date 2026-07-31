export const V2_OPERATIONAL_STORAGE_KEYS = {
  reservations: "tango-v2-reservations-calendar-v2",
  deliveries: "tango-v2-deliveries-v1",
  localConfig: "tango-v2-local-config-v1",
  stockProducts: "tango-v2-stock-products",
  expenses: "tango-v2-expenses-v1",
  cashRegister: "tango-v2-cash-register-v1",
} as const;

export const V2_OPERATIONAL_EVENTS = {
  reservations: "tango-v2-reservations-updated",
  deliveries: "tango-v2-deliveries-updated",
  localConfig: "tango-v2-local-config-updated",
  stockProducts: "tango-v2-stock-products-updated",
  expenses: "tango-v2-expenses-updated",
  cashRegister: "tango-v2-cash-register-updated",
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
