import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const paths = {
  route: "src/app/local/envios/page.tsx",
  ui: "src/app/local/envios/v2-envios-page.tsx",
  actions: "src/app/local/envios/actions.ts",
  kitchenActions: "src/app/local/cocina/actions.ts",
  kitchenUi: "src/app/local/cocina/v2-cocina-page.tsx",
  shippingKitchenContract:
    "src/lib/kitchen/business-shipping-kitchen-contract.ts",
  historicalKitchenContract:
    "src/lib/kitchen/business-kitchen-contract.ts",
  serverSync: "src/lib/v2-server-sync.ts",
  e34aRegression:
    "scripts/shipping-orders-write-regression-tests.mjs",
  e33bRegression:
    "scripts/kitchen-ui-cutover-regression-tests.mjs",
  migration:
    "supabase/migrations/20260811_022_shipping_orders_write.sql",
  rollback:
    "supabase/rollbacks/20260811_022_shipping_orders_write.down.sql",
  docs: "docs/database/SHIPPING-UI-CUTOVER.md",
  package: "package.json",
};

const sources = Object.fromEntries(
  await Promise.all(
    Object.entries(paths).map(
      async ([key, path]) => [
        key,
        await readFile(path, "utf8"),
      ],
    ),
  ),
);

const checks = [];
function check(label, condition) {
  assert.ok(condition, label);
  checks.push(label);
  console.log(`✓ ${label}`);
}
function sha256(source) {
  return createHash("sha256").update(source).digest("hex");
}

const DIRECT_SUPABASE =
  /@supabase\/supabase-js|@\/lib\/supabase\/|createSupabase|\bsupabase\s*\.\s*(?:from|rpc)\s*\(/u;

console.log("Ejecutando cutover UI persistente de Envíos E34B...");

check(
  "detector distingue Array.from de Supabase real",
  !DIRECT_SUPABASE.test(
    "const values = Array.from({ length: 8 });",
  )
    && DIRECT_SUPABASE.test(
      "const rows = supabase.from(\"table\");",
    )
    && DIRECT_SUPABASE.test(
      "const result = supabase.rpc(\"fn\");",
    )
    && DIRECT_SUPABASE.test(
      "import { createClient } from \"@supabase/supabase-js\";",
    ),
);

check(
  "wrapper conserva fallback y habilita Supabase",
  /getDataSource/u.test(sources.route)
    && /<V2EnviosPage\s*\/>/u.test(sources.route)
    && /shippingPersistence="supabase"/u.test(sources.route),
);
check(
  "wrapper revalida shipping view manage y cash manage",
  /resolveActiveBusiness/u.test(sources.route)
    && /"shipping",[\s\S]*?"view"/u.test(sources.route)
    && /"shipping",[\s\S]*?"manage"/u.test(sources.route)
    && /"cash",[\s\S]*?"manage"/u.test(sources.route),
);
check(
  "wrapper entrega Menú persistente",
  /getBusinessMenuForBusiness/u.test(sources.route)
    && /initialMenuCategories/u.test(sources.route)
    && /initialMenuItems/u.test(sources.route),
);
check(
  "UI visual original permanece",
  /export function V2EnviosPage/u.test(sources.ui)
    && /title="Envíos"/u.test(sources.ui)
    && /Nuevo envío/u.test(sources.ui)
    && /Pedido seleccionado/u.test(sources.ui),
);
check(
  "Supabase lee snapshot Shipping",
  /getBusinessShippingSnapshotAction/u.test(sources.ui)
    && /refreshPersistentDeliveries/u.test(sources.ui)
    && /mapPersistentDelivery/u.test(sources.ui),
);
check(
  "storage local queda detrás de frontera",
  /if\s*\(\s*isSupabasePersistence\s*\)\s*\{\s*return;\s*\}[\s\S]*?syncDeliveriesFromStorage/u.test(
    sources.ui,
  ),
);
check(
  "Menú Supabase usa props persistentes",
  /initialMenuCategories/u.test(sources.ui)
    && /initialMenuItems/u.test(sources.ui)
    && /mapPersistentMenu/u.test(sources.ui),
);
check(
  "guardado persistente usa IDs cantidades",
  /saveBusinessShippingOrderAction/u.test(sources.ui)
    && /menuItemId:\s*item\.id/u.test(sources.ui)
    && /quantity:\s*item\.quantity/u.test(sources.ui),
);
check(
  "cliente no accede Supabase directo",
  !DIRECT_SUPABASE.test(sources.ui)
    && !/p_business_id/u.test(sources.ui)
    && !/business_id/u.test(sources.ui),
);
check(
  "aceptación usa Server Action y ETA",
  /acceptBusinessShippingOrderAction/u.test(sources.ui)
    && /acceptanceEtaMinutes/u.test(sources.ui),
);
check(
  "hitos incluyen en camino y listo retiro",
  /setBusinessShippingMilestoneAction/u.test(sources.ui)
    && /"on_the_way"/u.test(sources.ui)
    && /"ready"/u.test(sources.ui)
    && /Listo para retirar/u.test(sources.ui),
);
check(
  "cancelación conserva decisión Stock",
  /cancelBusinessShippingOrderAction/u.test(sources.ui)
    && /returnStock:\s*shouldReturnStock/u.test(sources.ui)
    && /Mantener descontado/u.test(sources.ui)
    && /Devolver stock/u.test(sources.ui),
);
check(
  "entrega registra pago Shipping",
  /completeBusinessShippingPaymentAction/u.test(sources.ui)
    && /canManageCash/u.test(sources.ui)
    && /payments:/u.test(sources.ui),
);
check(
  "tipo Shipping queda inmutable",
  /No se puede cambiar Delivery por Retiro/u.test(sources.ui)
    && /editingDelivery/u.test(sources.ui),
);
check(
  "operationKey estable",
  /operationKeysRef/u.test(sources.ui)
    && /getStableShippingOperation/u.test(sources.ui)
    && /releaseShippingOperation/u.test(sources.ui),
);
check(
  "sync helper publica shipping y reenvía dominios secundarios",
  /function publishShippingRefresh\([\s\S]*?publishV2ServerSync\(\s*"shipping"\s*,?\s*\)[\s\S]*?for \(const domain of domains\)[\s\S]*?publishV2ServerSync\(\s*domain\s*,?\s*\)/u.test(
    sources.ui,
  )
    && /domains:\s*Array<[\s\S]*?"stock"[\s\S]*?"kitchen"[\s\S]*?"cash"[\s\S]*?>/u.test(
      sources.ui,
    ),
);

check(
  "operaciones publican dominios secundarios correctos",
  /publishShippingRefresh\(\s*\[\s*"stock",\s*"kitchen",?\s*\]\s*,?\s*\)/u.test(
    sources.ui,
  )
    && /publishShippingRefresh\(\s*\[\s*"cash",\s*"kitchen",?\s*\]\s*,?\s*\)/u.test(
      sources.ui,
    )
    && /publishShippingRefresh\(\s*\[\s*"kitchen",?\s*\]\s*,?\s*\)/u.test(
      sources.ui,
    ),
);

check(
  "sync escucha shipping kitchen cash",
  /subscribeV2ServerSync\(\s*"shipping"/u.test(sources.ui)
    && /subscribeV2ServerSync\(\s*"kitchen"/u.test(sources.ui)
    && /subscribeV2ServerSync\(\s*"cash"/u.test(sources.ui)
    && /visibilitychange/u.test(sources.ui),
);
check(
  "frontera E34B admite tracking público E34C",
  /businessSlug/u.test(sources.route)
    && /businessSlug/u.test(sources.ui)
    && /getDeliveryTrackingPath/u.test(sources.ui)
    && /getDeliveryTrackingUrl/u.test(sources.ui)
    && !/seguimiento público persistente se habilitará/u.test(
      sources.ui,
    )
    && /E34C/u.test(sources.docs),
);

check(
  "fallback local conserva motores mock",
  /applyStockMovements/u.test(sources.ui)
    && /appendDeliveryKitchenTicket/u.test(sources.ui)
    && /getCashRegisterError/u.test(sources.ui)
    && /getDeliveryTrackingUrl/u.test(sources.ui),
);
check(
  "acciones E34A siguen autorizando en servidor",
  /resolveShippingContext\(\s*"view"/u.test(sources.actions)
    && /resolveShippingContext\(\s*"manage"/u.test(sources.actions)
    && /p_business_id:\s*context\.businessId/u.test(sources.actions),
);
check(
  "Cocina agrega snapshot Shipping",
  /getBusinessShippingKitchenSnapshotAction/u.test(sources.kitchenActions)
    && /mapBusinessShippingKitchenSnapshot/u.test(sources.kitchenActions)
    && /persistentShippingSnapshot/u.test(sources.kitchenUi),
);
check(
  "Cocina combina Reserva y Shipping",
  /mapPersistentShippingCommand/u.test(sources.kitchenUi)
    && /persistentShippingSnapshot/u.test(sources.kitchenUi)
    && /persistentSnapshot/u.test(sources.kitchenUi),
);
check(
  "Cocina muta Shipping por Server Action",
  /setBusinessShippingKitchenCommandStatusAction/u.test(
    sources.kitchenActions,
  )
    && /setBusinessShippingKitchenCommandStatusAction/u.test(
      sources.kitchenUi,
    ),
);
check(
  "contrato Shipping Cocina es separado",
  /source:\s*"delivery"/u.test(sources.shippingKitchenContract)
    && /shippingId:\s*string/u.test(sources.shippingKitchenContract)
    && /mapBusinessShippingKitchenSnapshot/u.test(
      sources.shippingKitchenContract,
    ),
);
check(
  "contrato histórico Cocina sigue reservation-only",
  /source:\s*"reservation"/u.test(sources.historicalKitchenContract)
    && /sourceType !== "reservation"/u.test(
      sources.historicalKitchenContract,
    ),
);
check(
  "server sync agrega shipping antes de expenses",
  /\|\s*"shipping"\s*\n\s*\|\s*"expenses";/u.test(sources.serverSync)
    && /source\.domain === "shipping"/u.test(sources.serverSync),
);
check(
  "históricos aceptan E34B",
  /frontera E34A admite el cutover UI E34B posterior/u.test(
    sources.e34aRegression,
  )
    && /frontera E33B admite comandos Shipping E34B/u.test(
      sources.e33bRegression,
    ),
);
check(
  "022 permanece byte-identical",
  sha256(sources.migration)
    === "09bd53ae54735a8c20939621f44a8960c4dd400f92eaee71f802cea4ede2cd3f",
);
check(
  "rollback 022 permanece byte-identical",
  sha256(sources.rollback)
    === "d1b4b5381987e30292c05a0c95210f779ae668f50d8537f6d563b6e8dde0a3cd",
);
check(
  "docs fijan no migración y E34C",
  /E34B no crea ni aplica migraciones/u.test(sources.docs)
    && /E34C/u.test(sources.docs),
);

check(
  "fallback local reutiliza un único ID sin Date.now en createDelivery",
  /const localDeliveryId\s*=\s*[\s\S]*?createV2OperationalId\(\s*"env"/u.test(
    sources.ui,
  )
    && /id:\s*localDeliveryId/u.test(
      sources.ui,
    )
    && /createPublicCode\(\s*"PED",\s*localDeliveryId/u.test(
      sources.ui,
    )
    && /appendDeliveryKitchenTicket\([\s\S]*?localDeliveryId/u.test(
      sources.ui,
    )
    && !/async function createDelivery\([\s\S]*?Date\.now\(\)[\s\S]*?function acceptWebDelivery/u.test(
      sources.ui,
    ),
);

const pkg = JSON.parse(sources.package);
const regressionScript =
  pkg.scripts?.["test:regression"]
  ?? "";
const shippingUiQaIndex =
  regressionScript.indexOf(
    "npm run test:shipping-ui-cutover",
  );
const publicShippingQaIndex =
  regressionScript.indexOf(
    "npm run test:public-shipping-ordering",
  );

check(
  "E34B forma parte del QA global y admite suites posteriores",
  pkg.scripts?.["test:shipping-ui-cutover"]
    === "node scripts/shipping-ui-cutover-regression-tests.mjs"
    && shippingUiQaIndex >= 0
    && (
      publicShippingQaIndex < 0
      || publicShippingQaIndex > shippingUiQaIndex
    ),
);

for (const [label, source] of Object.entries(sources)) {
  check(
    `${label} sin whitespace accidental`,
    !/[ \t]+\n/u.test(source),
  );
}

console.log(`Todos los casos E34B pasaron (${checks.length}).`);
