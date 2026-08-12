import { getDataSource } from "@/lib/data/dataSource";
import {
  createDemuruDemoOperationalSnapshot,
  DEMURU_DEMO_OPERATIONAL_VERSION,
} from "@/lib/demo-demuru-operational-data";
import {
  V2_OPERATIONAL_EVENTS,
  V2_OPERATIONAL_STORAGE_KEYS,
} from "@/lib/v2-operational-storage";

const DEMURU_DEMO_OPERATIONAL_STORAGE_KEY =
  "tango-demo-demuru-operational-version";

type DemuruDemoOperationalBootstrapResult =
  | "installed"
  | "current"
  | "skipped"
  | "storage_error";

function localDateKey(
  date: Date,
) {
  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      "0",
    ),
    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    ),
  ].join(
    "-",
  );
}

function dispatchOperationalEvents() {
  for (
    const eventName
    of [
      V2_OPERATIONAL_EVENTS.reservations,
      V2_OPERATIONAL_EVENTS.deliveries,
      V2_OPERATIONAL_EVENTS.expenses,
      V2_OPERATIONAL_EVENTS.cashRegister,
      V2_OPERATIONAL_EVENTS.stockProducts,
      V2_OPERATIONAL_EVENTS.clientsMeta,
      V2_OPERATIONAL_EVENTS.manualClients,
    ]
  ) {
    window.dispatchEvent(
      new Event(
        eventName,
      ),
    );
  }
}

export function ensureDemuruDemoOperationalData():
DemuruDemoOperationalBootstrapResult {
  if (
    typeof window === "undefined"
    || getDataSource() !== "local"
  ) {
    return "skipped";
  }

  try {
    const now =
      new Date();
    const anchorDate =
      localDateKey(
        now,
      );
    const expectedVersion =
      `${DEMURU_DEMO_OPERATIONAL_VERSION}:${anchorDate}`;
    const installedVersion =
      window.localStorage.getItem(
        DEMURU_DEMO_OPERATIONAL_STORAGE_KEY,
      );

    if (
      installedVersion
      === expectedVersion
    ) {
      return "current";
    }

    const snapshot =
      createDemuruDemoOperationalSnapshot(
        now,
      );

    window.localStorage.setItem(
      V2_OPERATIONAL_STORAGE_KEYS.reservations,
      JSON.stringify(
        snapshot.reservations,
      ),
    );
    window.localStorage.setItem(
      V2_OPERATIONAL_STORAGE_KEYS.deliveries,
      JSON.stringify(
        snapshot.deliveries,
      ),
    );
    window.localStorage.setItem(
      V2_OPERATIONAL_STORAGE_KEYS.expenses,
      JSON.stringify(
        snapshot.expenses,
      ),
    );
    window.localStorage.setItem(
      V2_OPERATIONAL_STORAGE_KEYS.cashRegister,
      JSON.stringify(
        snapshot.cashRegisters,
      ),
    );
    window.localStorage.setItem(
      V2_OPERATIONAL_STORAGE_KEYS.stockProducts,
      JSON.stringify(
        snapshot.stockProducts,
      ),
    );
    window.localStorage.setItem(
      V2_OPERATIONAL_STORAGE_KEYS.stockMovements,
      JSON.stringify(
        snapshot.stockMovements,
      ),
    );
    window.localStorage.setItem(
      V2_OPERATIONAL_STORAGE_KEYS.clientsMeta,
      JSON.stringify(
        snapshot.clientMeta,
      ),
    );
    window.localStorage.setItem(
      V2_OPERATIONAL_STORAGE_KEYS.manualClients,
      JSON.stringify(
        snapshot.manualClients,
      ),
    );
    window.localStorage.setItem(
      DEMURU_DEMO_OPERATIONAL_STORAGE_KEY,
      expectedVersion,
    );

    dispatchOperationalEvents();

    return "installed";
  } catch {
    return "storage_error";
  }
}
