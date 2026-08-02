export const TANGO_BACKUP_SCHEMA = "tango-local-backup-v1";

type StorageLike = Pick<Storage, "getItem" | "key" | "length" | "removeItem" | "setItem">;

export type TangoLocalBackup = {
  schema: typeof TANGO_BACKUP_SCHEMA;
  exportedAt: string;
  appVersion: string;
  entries: Record<string, string>;
};

export function isTangoStorageKey(key: string) {
  return key.startsWith("tango-");
}

function readTangoEntries(storage: StorageLike) {
  const entries: Record<string, string> = {};

  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index);
    if (!key || !isTangoStorageKey(key)) continue;

    const value = storage.getItem(key);
    if (value !== null) entries[key] = value;
  }

  return entries;
}

export function createTangoLocalBackup(
  storage: StorageLike,
  appVersion: string,
): TangoLocalBackup {
  return {
    schema: TANGO_BACKUP_SCHEMA,
    exportedAt: new Date().toISOString(),
    appVersion,
    entries: readTangoEntries(storage),
  };
}

export function parseTangoLocalBackup(source: string): TangoLocalBackup {
  const parsed: unknown = JSON.parse(source);

  if (!parsed || typeof parsed !== "object") {
    throw new Error("El archivo no contiene un respaldo válido.");
  }

  const candidate = parsed as Partial<TangoLocalBackup>;
  if (
    candidate.schema !== TANGO_BACKUP_SCHEMA ||
    typeof candidate.exportedAt !== "string" ||
    typeof candidate.appVersion !== "string" ||
    !candidate.entries ||
    typeof candidate.entries !== "object" ||
    Array.isArray(candidate.entries)
  ) {
    throw new Error("El archivo no corresponde a un respaldo de Tango Reservas.");
  }

  const entries = Object.entries(candidate.entries);
  if (entries.length === 0) {
    throw new Error("El respaldo no contiene datos de Tango Reservas.");
  }

  if (entries.length > 250) {
    throw new Error("El respaldo contiene demasiados registros.");
  }

  for (const [key, value] of entries) {
    if (!isTangoStorageKey(key) || typeof value !== "string") {
      throw new Error("El respaldo contiene datos no permitidos.");
    }
  }

  return candidate as TangoLocalBackup;
}

function replaceTangoEntries(storage: StorageLike, entries: Record<string, string>) {
  const keysToRemove = Object.keys(readTangoEntries(storage));
  keysToRemove.forEach((key) => storage.removeItem(key));
  Object.entries(entries).forEach(([key, value]) => storage.setItem(key, value));
}

export function restoreTangoLocalBackup(storage: StorageLike, backup: TangoLocalBackup) {
  const previousEntries = readTangoEntries(storage);

  try {
    replaceTangoEntries(storage, backup.entries);
  } catch (error) {
    try {
      replaceTangoEntries(storage, previousEntries);
    } catch {
      // Se conserva el error original; el navegador puede haber agotado su cuota.
    }
    throw error;
  }
}
