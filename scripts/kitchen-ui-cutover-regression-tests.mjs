import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const paths = {
  route:
    "src/app/local/cocina/page.tsx",
  ui:
    "src/app/local/cocina/v2-cocina-page.tsx",
  actions:
    "src/app/local/cocina/actions.ts",
  contract:
    "src/lib/kitchen/business-kitchen-contract.ts",
  serverSync:
    "src/lib/v2-server-sync.ts",
  e33aRegression:
    "scripts/kitchen-operational-write-regression-tests.mjs",
  migration:
    "supabase/migrations/20260811_021_kitchen_operational_write.sql",
  rollback:
    "supabase/rollbacks/20260811_021_kitchen_operational_write.down.sql",
  docs:
    "docs/database/KITCHEN-UI-CUTOVER.md",
  package:
    "package.json",
};

const sources =
  Object.fromEntries(
    await Promise.all(
      Object.entries(paths).map(
        async ([key, path]) => [
          key,
          await readFile(
            path,
            "utf8",
          ),
        ],
      ),
    ),
  );

const checks = [];

function check(
  label,
  condition,
) {
  assert.ok(
    condition,
    label,
  );
  checks.push(label);
  console.log(`✓ ${label}`);
}

function sha256(source) {
  return createHash("sha256")
    .update(source)
    .digest("hex");
}

const DIRECT_SUPABASE_ACCESS =
  /@supabase\/supabase-js|@\/lib\/supabase\/|createSupabase|\.rpc\s*\(|\.from\s*\(/u;

console.log(
  "Ejecutando cutover UI persistente de Cocina E33B...",
);

check(
  "Cocina usa wrapper servidor y conserva fallback local",
  /resolveActiveBusiness/u.test(
    sources.route,
  )
    && /getDataSource/u.test(
      sources.route,
    )
    && /<V2CocinaPage\s*\/>/u.test(
      sources.route,
    )
    && /kitchenPersistence="supabase"/u.test(
      sources.route,
    ),
);

check(
  "wrapper bloquea kitchen view y deriva manage",
  /"kitchen",[\s\S]*?"view"/u.test(
    sources.route,
  )
    && /"kitchen",[\s\S]*?"manage"/u.test(
      sources.route,
    )
    && /canManageKitchen/u.test(
      sources.route,
    )
    && /auth\/access-denied/u.test(
      sources.route,
    ),
);

check(
  "UI visual original permanece como único componente cliente",
  /export function V2CocinaPage/u.test(
    sources.ui,
  )
    && /title="Cocina"/u.test(
      sources.ui,
    )
    && /Pendientes/u.test(
      sources.ui,
    )
    && /En preparación/u.test(
      sources.ui,
    )
    && /Listas/u.test(
      sources.ui,
    )
    && /Historial del día/u.test(
      sources.ui,
    ),
);

check(
  "Supabase obtiene snapshot E33A por Server Action",
  /getBusinessKitchenSnapshotAction/u.test(
    sources.ui,
  )
    && /persistentSnapshot/u.test(
      sources.ui,
    )
    && /getTodayDateKey/u.test(
      sources.ui,
    ),
);

check(
  "snapshot persistente usa tiempos canónicos",
  /mapPersistentCommand/u.test(
    sources.ui,
  )
    && /command\.targetSeconds/u.test(
      sources.ui,
    )
    && /command\.startedAt/u.test(
      sources.ui,
    )
    && /command\.readyAt/u.test(
      sources.ui,
    ),
);

check(
  "modo Supabase no reconstruye Delivery desde localStorage",
  /if\s*\(\s*isSupabasePersistence\s*\)\s*\{[\s\S]*?persistentSnapshot[\s\S]*?\.map\(\s*mapPersistentCommand/u.test(
    sources.ui,
  )
    && /Delivery y retiro se conectarán cuando Envíos tenga backend persistente/u.test(
      sources.ui,
    ),
);

check(
  "fallback local conserva reservas delivery recetas y tickets",
  /readStorage/u.test(
    sources.ui,
  )
    && /RESERVATIONS_STORAGE_KEY/u.test(
      sources.ui,
    )
    && /DELIVERIES_STORAGE_KEY/u.test(
      sources.ui,
    )
    && /LOCAL_CONFIG_STORAGE_KEY/u.test(
      sources.ui,
    )
    && /subtractTicketItems/u.test(
      sources.ui,
    ),
);

check(
  "listeners locales quedan desactivados en Supabase",
  /if\s*\(\s*isSupabasePersistence\s*\)\s*\{\s*return;\s*\}[\s\S]*?function syncCommands/u.test(
    sources.ui,
  ),
);

check(
  "mutación persistente usa solamente Server Action E33A",
  /setBusinessKitchenCommandStatusAction/u.test(
    sources.ui,
  )
    && /orderId:\s*command\.orderId/u.test(
      sources.ui,
    )
    && /ticketId:[\s\S]*?command\.ticketId/u.test(
      sources.ui,
    )
    && /status,/u.test(
      sources.ui,
    )
    && /operationKey,/u.test(
      sources.ui,
    ),
);

check(
  "operationKey de estado permanece estable hasta éxito",
  /statusOperationKeysRef/u.test(
    sources.ui,
  )
    && /createV2OperationalId\(\s*"kitchen-status"/u.test(
      sources.ui,
    )
    && /\.get\(\s*operationId/u.test(
      sources.ui,
    )
    && /\.delete\(\s*operationId/u.test(
      sources.ui,
    ),
);

check(
  "UI aplica respuesta canónica antes de reconciliar",
  /applyPersistentMutation/u.test(
    sources.ui,
  )
    && /result\.mutation/u.test(
      sources.ui,
    )
    && /await refreshPersistentSnapshot\(\)/u.test(
      sources.ui,
    ),
);

check(
  "permisos manage deshabilitan acciones visuales",
  /canManageKitchen/u.test(
    sources.ui,
  )
    && /mutationDisabled/u.test(
      sources.ui,
    )
    && /disabled=\{\s*mutationDisabled/u.test(
      sources.ui,
    ),
);

check(
  "cliente Cocina no introduce acceso Supabase directo",
  !DIRECT_SUPABASE_ACCESS.test(
    sources.ui,
  )
    && !/p_business_id/u.test(
      sources.ui,
    )
    && !/business_id/u.test(
      sources.ui,
    ),
);

check(
  "sincronización incorpora kitchen sin romper expenses terminal",
  /\|\s*"kitchen"/u.test(
    sources.serverSync,
  )
    && /\|\s*"expenses";/u.test(
      sources.serverSync,
    )
    && /source\.domain === "kitchen"/u.test(
      sources.serverSync,
    )
    && /source\.domain === "expenses"/u.test(
      sources.serverSync,
    ),
);

check(
  "Cocina publica kitchen y escucha kitchen más stock",
  /publishV2ServerSync\(\s*"kitchen"/u.test(
    sources.ui,
  )
    && /subscribeV2ServerSync\(\s*"kitchen"/u.test(
      sources.ui,
    )
    && /subscribeV2ServerSync\(\s*"stock"/u.test(
      sources.ui,
    ),
);

check(
  "focus y visibility ejecutan reconciliación canónica",
  /window\.addEventListener\(\s*"focus"/u.test(
    sources.ui,
  )
    && /visibilitychange/u.test(
      sources.ui,
    )
    && /refreshPersistentSnapshot/u.test(
      sources.ui,
    ),
);

check(
  "acciones backend conservan view/manage y business_id servidor",
  /resolveKitchenContext\(\s*"view"/u.test(
    sources.actions,
  )
    && /resolveKitchenContext\(\s*"manage"/u.test(
      sources.actions,
    )
    && /p_business_id:[\s\S]*?context\.businessId/u.test(
      sources.actions,
    ),
);

check(
  "contrato persistente sigue limitado a reservation en E33B",
  /source:\s*"reservation"/u.test(
    sources.contract,
  )
    && /sourceType !== "reservation"/u.test(
      sources.contract,
    ),
);

check(
  "regresión E33A acepta explícitamente el cutover posterior",
  /kitchenUiClient/u.test(
    sources.e33aRegression,
  )
    && /frontera E33A admite el cutover UI E33B posterior/u.test(
      sources.e33aRegression,
    )
    && /getBusinessKitchenSnapshotAction/u.test(
      sources.e33aRegression,
    ),
);

check(
  "migración 021 permanece byte-identical",
  sha256(
    sources.migration,
  )
    === "62d8b0232f23e69195832fb84445126864f15d31b72e53527aa96362030590a6",
);

check(
  "rollback 021 permanece byte-identical",
  sha256(
    sources.rollback,
  )
    === "2f228000c815e09a32c6f4e28a903cfcd902144d00ab82cbd2fcf6adf77f5ee6",
);

check(
  "documentación fija Delivery posterior y ninguna migración",
  /Delivery y Retiro/u.test(
    sources.docs,
  )
    && /E33B no agrega ni aplica migraciones/u.test(
      sources.docs,
    )
    && /021 ya fue aplicada una sola vez/u.test(
      sources.docs,
    ),
);

const pkg =
  JSON.parse(
    sources.package,
  );

check(
  "E33B forma parte del QA global",
  pkg.scripts?.[
    "test:kitchen-ui-cutover"
  ]
    ===
    "node scripts/kitchen-ui-cutover-regression-tests.mjs"
    && pkg.scripts?.[
      "test:regression"
    ]?.includes(
      "test:kitchen-ui-cutover",
    ),
);

for (
  const [
    label,
    source,
  ] of Object.entries(
    sources,
  )
) {
  check(
    `${label} sin whitespace accidental`,
    !/[ \t]+\n/u.test(
      source,
    ),
  );
}

console.log(
  `Todos los casos E33B pasaron (${checks.length}).`,
);
