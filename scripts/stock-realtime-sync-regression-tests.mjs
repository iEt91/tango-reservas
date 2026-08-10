import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const paths = {
  migration:
    "supabase/migrations/20260810_018_stock_realtime_sync.sql",
  rollback:
    "supabase/rollbacks/20260810_018_stock_realtime_sync.down.sql",
  postflight:
    "supabase/preflight/20260810_018_stock_realtime_sync_postflight.sql",
  stockPage:
    "src/app/local/stock/page.tsx",
  stockUi:
    "src/app/local/productos/v2-productos-page.tsx",
  stockUiRegression:
    "scripts/stock-ui-cutover-regression-tests.mjs",
  reservationUi:
    "src/app/local/reservas/v2-reservas-page.tsx",
  serverSync:
    "src/lib/v2-server-sync.ts",
  stockDocs:
    "docs/database/STOCK-UI-CUTOVER.md",
  reservationDocs:
    "docs/database/RESERVATION-CONSUMPTION-UI-CUTOVER.md",
  remoteHistory:
    "scripts/remote-schema-history-regression-tests.mjs",
  manifest:
    "supabase/MIGRATIONS.sha256",
  package:
    "package.json",
};

const sources =
  Object.fromEntries(
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

console.log(
  "Ejecutando regresión de Stock Realtime E31B V16...",
);

check(
  "la migración publica solamente stock_movements",
  /alter publication supabase_realtime\s+add table public\.stock_movements/u.test(
    sources.migration,
  )
    && !/add table public\.stock_products/u.test(
      sources.migration,
    ),
);

check(
  "la migración es idempotente y exige la publicación esperada",
  sources.migration.includes(
    "pg_publication_tables",
  )
    && sources.migration.includes(
      "supabase_realtime publication is missing.",
    )
    && sources.migration.includes(
      "if not exists",
    ),
);

check(
  "el rollback revierte solamente la membresía Realtime",
  /alter publication supabase_realtime\s+drop table public\.stock_movements/u.test(
    sources.rollback,
  )
    && !/(?:^|;)\s*drop\s+table\b/iu.test(
      sources.rollback,
    )
    && !/disable row level security/iu.test(
      sources.rollback,
    ),
);

check(
  "postflight conserva RLS tenant y default deny",
  sources.postflight.includes(
    "stock_movements must keep forced RLS.",
  )
    && sources.postflight.includes(
      "stock_movements_select_module_member",
    )
    && sources.postflight.includes(
      "Anon must not read stock_movements.",
    )
    && sources.postflight.includes(
      "Realtime must not introduce direct Stock DML grants.",
    ),
);

check(
  "Stock recibe businessId explícito desde el servidor",
  sources.stockPage.includes(
    "businessId={activeBusiness.membership.businessId}",
  )
    && sources.stockUi.includes(
      "businessId?: string",
    ),
);

const getSessionIndex =
  sources.stockUi.indexOf(
    "supabase.auth.getSession",
  );
const setAuthIndex =
  sources.stockUi.indexOf(
    "supabase.realtime.setAuth",
  );
const authenticatedChannelIndex =
  sources.stockUi.indexOf(
    ".channel(",
    setAuthIndex,
  );

check(
  "Stock autentica Realtime explícitamente antes de abrir el canal",
  getSessionIndex >= 0
    && setAuthIndex > getSessionIndex
    && authenticatedChannelIndex > setAuthIndex,
);

check(
  "el staging test entrega el JWT firmado a Realtime",
  sources.stockUi.includes(
    "sessionData.session?.access_token",
  )
    && sources.stockUi.includes(
      "refreshPersistentStock();",
    )
    && sources.package.includes(
      "staging:test-stock-realtime-sync",
    ),
);

check(
  "Stock usa el cliente Auth existente solo para Realtime",
  sources.stockUi.includes(
    "createSupabaseBrowserClient",
  )
    && /\.channel\s*\(/u.test(
      sources.stockUi,
    )
    && sources.stockUi.includes(
      '"postgres_changes"',
    )
    && /table:\s*"stock_movements"/u.test(
      sources.stockUi,
    ),
);

const compactStockUi =
  sources.stockUi.replace(
    /\s+/gu,
    "",
  );

check(
  "la suscripción filtra por business_id",
  compactStockUi.includes(
    'filter:"business_id=eq."+businessId,',
  )
    || compactStockUi.includes(
      'filter:`business_id=eq.${businessId}`,',
    ),
);

check(
  "la aserción de payload Realtime es segura para TSX",
  sources.stockUi.includes(
    "payload.new as unknown as BusinessStockMovementDatabaseRow",
  )
    && !sources.stockUi.includes(
      "payload.new\n                      as unknown",
    ),
);

check(
  "el INSERT Realtime se valida con el contrato canónico",
  sources.stockUi.includes(
    "mapBusinessStockMovementRow",
  )
    && sources.stockUi.includes(
      "BusinessStockMovementDatabaseRow",
    )
    && sources.stockUi.includes(
      "payload.new",
    ),
);

check(
  "la UI aplica el movimiento canónico sin esperar router.refresh",
  sources.stockUi.includes(
    "applyRealtimeStockMovement",
  )
    && sources.stockUi.includes(
      "applyPersistentMovement(",
    )
    && sources.stockUi.includes(
      "mapPersistentStockMovement(",
    ),
);

check(
  "los IDs de movimientos evitan doble aplicación local/Reatime",
  sources.stockUi.includes(
    "appliedPersistentMovementIdsRef",
  )
    && /has\(\s*movement\.id\s*,?\s*\)/u.test(
      sources.stockUi,
    )
    && /add\(\s*result\.movement\.id\s*,?\s*\)/u.test(
      sources.stockUi,
    ),
);

check(
  "BroadcastChannel queda como fallback y no duplica refresh con Realtime sano",
  sources.stockUi.includes(
    "stockRealtimeReadyRef",
  )
    && /if\s*\(\s*!stockRealtimeReadyRef\.current\s*\)/u.test(
      sources.stockUi,
    )
    && sources.serverSync.includes(
      "BroadcastChannel",
    ),
);

check(
  "focus y visibility son reconciliación solo si Realtime no está conectado",
  sources.stockUi.includes(
    "handlePersistentStockFocus",
  )
    && sources.stockUi.includes(
      "handlePersistentStockVisibility",
    )
    && /status\s*===\s*"SUBSCRIBED"/u.test(
      sources.stockUi,
    ),
);

check(
  "una falla de payload, producto desconocido o canal vuelve al refresh canónico",
  sources.stockUi.includes(
    "refreshPersistentStock();",
  )
    && sources.stockUi.includes(
      "knownStockProductIdsRef",
    )
    && sources.stockUi.includes(
      '"CHANNEL_ERROR"',
    )
    && sources.stockUi.includes(
      '"TIMED_OUT"',
    ),
);

check(
  "el navegador no obtiene DML directo sobre Stock",
  !sources.stockUi.includes(
    '.from("stock_products")',
  )
    && !sources.stockUi.includes(
      '.from("stock_movements")',
    )
    && !sources.stockUi.includes(
      ".insert(",
    )
    && !sources.stockUi.includes(
      ".update(",
    )
    && !sources.stockUi.includes(
      ".delete(",
    ),
);

check(
  "la regresión histórica E29B admite Realtime pero sigue prohibiendo DML",
  sources.stockUiRegression.includes(
    "cliente Supabase se limita a suscripción Realtime",
  )
    && /doesNotMatch\([\s\S]+stock_movements/u.test(
      sources.stockUiRegression,
    ),
);

check(
  "documentación distingue Realtime de escritura cliente",
  sources.stockDocs.includes(
    "suscripción Realtime de solo lectura",
  )
    && sources.reservationDocs.includes(
      "Postgres Changes",
    )
    && sources.reservationDocs.includes(
      "BroadcastChannel",
    ),
);

const pkg =
  JSON.parse(sources.package);

check(
  "pruebas local y staging de Realtime están integradas",
  pkg.scripts?.["test:stock-realtime-sync"]
    ===
    "node scripts/stock-realtime-sync-regression-tests.mjs"
    && pkg.scripts?.["staging:test-stock-realtime-sync"]
      ===
      "node scripts/stock-realtime-sync-staging-test.mjs"
    && pkg.scripts?.["test:regression"]?.includes(
      "test:stock-realtime-sync",
    ),
);

check(
  "historial remoto incorpora migración 018",
  sources.remoteHistory.includes(
    "stockRealtimeSyncPath",
  )
    && sources.remoteHistory.includes(
      "Stock Realtime publica el ledger sin relajar RLS",
    )
    && sources.remoteHistory.includes(
      "historial remoto pasaron (19)",
    ),
);

check(
  "manifiesto incorpora migración y rollback 018",
  sources.manifest.includes(
    "20260810_018_stock_realtime_sync.sql",
  )
    && sources.manifest.includes(
      "20260810_018_stock_realtime_sync.down.sql",
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
  `Todos los casos de Stock Realtime E31B V12 pasaron (${checks.length}).`,
);
