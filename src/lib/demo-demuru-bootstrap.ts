import { getDataSource } from "@/lib/data/dataSource";
import { ensureDemuruDemoOperationalData } from "@/lib/demo-demuru-operational-bootstrap";
import {
  DEMURU_DEMO_MASTER_VERSION,
  demuruDemoMenuCategories,
  demuruDemoMenuItems,
  demuruDemoRecipes,
  demuruDemoStockProducts,
} from "@/lib/demo-demuru-master-data";
import {
  V2_OPERATIONAL_EVENTS,
  V2_OPERATIONAL_STORAGE_KEYS,
} from "@/lib/v2-operational-storage";

const DEMURU_DEMO_MASTER_STORAGE_KEY =
  "tango-demo-demuru-master-version";

type DemuruDemoBootstrapResult =
  | "installed"
  | "current"
  | "skipped"
  | "storage_error";

function readLocalConfig() {
  if (typeof window === "undefined") {
    return {};
  }

  try {
    const rawValue =
      window.localStorage.getItem(
        V2_OPERATIONAL_STORAGE_KEYS.localConfig,
      );

    if (!rawValue) {
      return {};
    }

    const parsedValue =
      JSON.parse(rawValue);

    return parsedValue
      && typeof parsedValue === "object"
      && !Array.isArray(parsedValue)
      ? parsedValue as Record<string, unknown>
      : {};
  } catch {
    return {};
  }
}

function dispatchDemoMasterEvents() {
  for (
    const eventName
    of [
      V2_OPERATIONAL_EVENTS.menuItems,
      V2_OPERATIONAL_EVENTS.menuCategories,
      V2_OPERATIONAL_EVENTS.stockProducts,
      V2_OPERATIONAL_EVENTS.localConfig,
    ]
  ) {
    window.dispatchEvent(
      new Event(eventName),
    );
  }
}

export function ensureDemuruDemoMasterData():
DemuruDemoBootstrapResult {
  if (
    typeof window === "undefined"
    || getDataSource() !== "local"
  ) {
    return "skipped";
  }

  try {
    const installedVersion =
      window.localStorage.getItem(
        DEMURU_DEMO_MASTER_STORAGE_KEY,
      );

    if (
      installedVersion
      === DEMURU_DEMO_MASTER_VERSION
    ) {
      ensureDemuruDemoOperationalData();

      return "current";
    }

    const currentConfig =
      readLocalConfig();

    window.localStorage.setItem(
      V2_OPERATIONAL_STORAGE_KEYS.menuCategories,
      JSON.stringify(
        demuruDemoMenuCategories,
      ),
    );
    window.localStorage.setItem(
      V2_OPERATIONAL_STORAGE_KEYS.menuItems,
      JSON.stringify(
        demuruDemoMenuItems,
      ),
    );
    window.localStorage.setItem(
      V2_OPERATIONAL_STORAGE_KEYS.stockProducts,
      JSON.stringify(
        demuruDemoStockProducts,
      ),
    );
    window.localStorage.setItem(
      V2_OPERATIONAL_STORAGE_KEYS.stockMovements,
      "[]",
    );
    window.localStorage.setItem(
      V2_OPERATIONAL_STORAGE_KEYS.localConfig,
      JSON.stringify({
        ...currentConfig,
        recipes:
          demuruDemoRecipes,
      }),
    );

    window.localStorage.setItem(
      DEMURU_DEMO_MASTER_STORAGE_KEY,
      DEMURU_DEMO_MASTER_VERSION,
    );

    dispatchDemoMasterEvents();
    ensureDemuruDemoOperationalData();

    return "installed";
  } catch {
    return "storage_error";
  }
}
