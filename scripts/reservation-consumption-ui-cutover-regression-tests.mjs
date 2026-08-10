import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const files = {
  page:
    "src/app/local/reservas/page.tsx",
  ui:
    "src/app/local/reservas/v2-reservas-page.tsx",
  stockUi:
    "src/app/local/productos/v2-productos-page.tsx",
  serverSync:
    "src/lib/v2-server-sync.ts",
  consumptionAction:
    "src/app/local/reservas/consumption-actions.ts",
  ordersReader:
    "src/lib/data/server/business-orders.ts",
  reservationsReader:
    "src/lib/data/server/business-reservations.ts",
  reservationContract:
    "src/lib/reservations/business-reservation-contract.ts",
  reservationsCutover:
    "src/lib/reservations/v2-reservations-cutover.ts",
  package:
    "package.json",
  docs:
    "docs/database/RESERVATION-CONSUMPTION-UI-CUTOVER.md",
};

const sources =
  Object.fromEntries(
    await Promise.all(
      Object.entries(files).map(
        async ([key, path]) => [
          key,
          await readFile(path, "utf8"),
        ],
      ),
    ),
  );

const checks = [];

function check(label, assertion) {
  assert.ok(assertion, label);
  checks.push(label);
  console.log(`✓ ${label}`);
}

console.log(
  "Ejecutando regresión del cutover UI de consumo de Reserva...",
);

check(
  "la página conserva fallback local",
  sources.page.includes(
    'getDataSource() !== "supabase"',
  )
    && sources.page.includes(
      "return <V2ReservasPage />",
    ),
);

check(
  "el servidor carga Menú y pedidos persistentes",
  sources.page.includes(
    "getBusinessMenuForBusiness",
  )
    && sources.page.includes(
      "getBusinessDineInOrdersForReservations",
    )
    && sources.page.includes(
      "persistentMenuItems",
    )
    && sources.page.includes(
      "initialPersistentOrders",
    ),
);

check(
  "la lectura de pedidos es por lote y acotada al tenant",
  sources.ordersReader.includes(
    "getBusinessDineInOrdersForReservations",
  )
    && sources.ordersReader.includes(
      '.eq("business_id", businessId)',
    )
    && sources.ordersReader.includes(
      '.in("reservation_id", uniqueReservationIds)',
    )
    && sources.ordersReader.includes(
      '.in("order_id", orderIds)',
    ),
);

check(
  "consumption_started_at entra al contrato normal de Reservas",
  sources.reservationsReader.includes(
    "consumption_started_at",
  )
    && sources.reservationContract.includes(
      "consumptionStartedAt",
    )
    && sources.reservationContract.includes(
      "consumption_started_at",
    )
    && sources.reservationsCutover.includes(
      "consumptionStartedAt:",
    ),
);

check(
  "la UI recibe Menú y pedidos persistentes explícitos",
  sources.ui.includes(
    "persistentMenuItems?: V2MenuOrderItem[]",
  )
    && sources.ui.includes(
      "persistentMenuCategories?:",
    )
    && sources.ui.includes(
      "initialPersistentOrders?: BusinessDineInOrder[]",
    ),
);

check(
  "el estado inicial hidrata pedidos canónicos",
  /function\s+hydratePersistentReservationOrders\s*\(/u.test(
    sources.ui,
  )
    && /function\s+hydrateReservationWithPersistentOrder\s*\(/u.test(
      sources.ui,
    )
    && /const\s+lineItems\s*=\s*\(order\?\.items\s*\?\?\s*\[\]\)\.map\s*\(/u.test(
      sources.ui,
    ),
);

check(
  "Supabase deja de leer Menú desde localStorage",
  sources.ui.includes(
    "if (isSupabasePersistence) {\n      return;\n    }\n\n    function syncReservationsFromStorage",
  )
    && sources.ui.includes(
      "persistentMenuItems",
    ),
);

check(
  "el popup persistente usa la Server Action E31A",
  /saveBusinessReservationConsumptionAction/u.test(
    sources.ui,
  )
    && /"save_business_reservation_consumption"/u.test(
      sources.consumptionAction,
    )
    && /createV2OperationalId\(\s*"reservation-consumption-save"\s*,?\s*\)/u.test(
      sources.ui,
    ),
);

check(
  "la mutación envía solo IDs y cantidades como estado objetivo",
  /items:\s*nextOrderLineItems\.map\s*\(/u.test(
    sources.ui,
  )
    && /menuItemId:\s*lineItem\.menuItemId/u.test(
      sources.ui,
    )
    && /quantity:\s*lineItem\.quantity/u.test(
      sources.ui,
    ),
);

check(
  "el consumo notifica Stock después de adoptar la respuesta canónica",
  /updateOrderReservation\([\s\S]*publishV2ServerSync\("stock"\)/u.test(
    sources.ui,
  ),
);

check(
  "Stock escucha cambios de servidor y refresca su snapshot",
  sources.stockUi.includes(
    'subscribeV2ServerSync(',
  )
    && sources.stockUi.includes(
      '"stock",',
    )
    && sources.stockUi.includes(
      "router.refresh();",
    )
    && sources.stockUi.includes(
      '"visibilitychange"',
    )
    && sources.stockUi.includes(
      '"focus"',
    ),
);

check(
  "la señal entre pestañas no convierte localStorage en fuente de verdad",
  sources.serverSync.includes(
    "BroadcastChannel",
  )
    && sources.serverSync.includes(
      "SERVER_SYNC_STORAGE_KEY",
    )
    && sources.serverSync.includes(
      "Fallback below.",
    )
    && !sources.serverSync.includes(
      "stockProducts",
    )
    && !sources.serverSync.includes(
      "stock_movements",
    ),
);

check(
  "la UI adopta siempre la respuesta canónica",
  sources.ui.includes(
    "result.order",
  )
    && sources.ui.includes(
      "hydrateReservationWithPersistentOrder(",
    )
    && sources.ui.includes(
      "updateOrderReservation(",
    ),
);

check(
  "dobles mutaciones de consumo quedan bloqueadas",
  sources.ui.includes(
    "reservationConsumptionMutationRef",
  )
    && sources.ui.includes(
      "reservationConsumptionMutationRef.current = true",
    )
    && sources.ui.includes(
      "reservationConsumptionMutationRef.current = false",
    ),
);

check(
  "el campo de cantidad usa borrador y persiste al blur",
  sources.ui.includes(
    "persistentQuantityDrafts",
  )
    && sources.ui.includes(
      "onBlur={(event) =>",
    )
    && sources.ui.includes(
      'event.key === "Enter"',
    ),
);

check(
  "vaciar consumo usa la misma mutación persistente",
  /await\s+persistReservationOrderLineItems\(\s*\[\]\s*\)/u.test(
    sources.ui,
  )
    && /Consumo persistente vaciado/u.test(
      sources.ui,
    ),
);

const persistentHelper =
  sources.ui.slice(
    sources.ui.indexOf(
      "async function persistReservationOrderLineItems",
    ),
    sources.ui.indexOf(
      "async function setMenuItemQuantity",
    ),
  );

check(
  "el flujo Supabase no ejecuta el motor local de Stock",
  persistentHelper.includes(
    "saveBusinessReservationConsumptionAction",
  )
    && !persistentHelper.includes(
      "resolveStockMovementsForMenuItem(",
    )
    && !persistentHelper.includes(
      "applyStockMovements(",
    )
    && /if\s*\(isSupabasePersistence\)\s*\{\s*await\s+persistReservationOrderLineItems\s*\(/u.test(
      sources.ui,
    ),
);

check(
  "el fallback local conserva su motor anterior",
  /resolveStockMovementsForMenuItem\(\s*item\s*,\s*quantityDiff\s*\)/u.test(
    sources.ui,
  )
    && /applyStockMovements\(\s*stockMovements\s*,\s*"discount"/u.test(
      sources.ui,
    )
    && /applyStockMovements\(\s*stockMovements\s*,\s*"return"/u.test(
      sources.ui,
    ),
);

check(
  "el navegador no introduce DML Supabase directo",
  !sources.ui.includes("createClient(")
    && !sources.ui.includes('.from("business_orders")')
    && !sources.ui.includes('.from("stock_movements")')
    && !sources.ui.includes(".insert(")
    && !sources.ui.includes(".update(")
    && !sources.ui.includes(".delete("),
);

check(
  "Caja y Pagos siguen fuera del cutover",
  sources.ui.includes(
    "La caja y los pagos persistentes todavía no están habilitados en Reservas V2.",
  )
    && sources.docs.includes(
      "Caja persistente",
    )
    && sources.docs.includes(
      "cobros/pagos persistentes",
    ),
);

check(
  "la cabecera comunica consumo persistente sin prometer Cocina",
  sources.ui.includes(
    "Alta, edición, estados y consumo de mesa son persistentes.",
  )
    && sources.ui.includes(
      "Caja, pagos y Cocina siguen bloqueados",
    ),
);

check(
  "E31B no agrega migraciones",
  sources.docs.includes(
    "E31B **no agrega ni aplica migraciones**",
  ),
);

const packageJson =
  JSON.parse(sources.package);

check(
  "la regresión E31B está integrada al QA",
  packageJson.scripts?.[
    "test:reservation-consumption-ui-cutover"
  ]
    ===
    "node scripts/reservation-consumption-ui-cutover-regression-tests.mjs"
    && packageJson.scripts?.[
      "test:regression"
    ]?.includes(
      "npm run test:reservation-consumption-ui-cutover",
    ),
);

for (const [label, source] of
  Object.entries(sources)) {
  check(
    `${label} sin whitespace accidental`,
    !/[ \t]+\n/u.test(source),
  );
}

console.log(
  `Todos los casos del cutover UI de consumo de Reserva pasaron (${checks.length}).`,
);
