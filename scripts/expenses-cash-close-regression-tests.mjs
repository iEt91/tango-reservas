import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const paths = {
  migration:
    "supabase/migrations/20260811_020_expenses_cash_close.sql",
  rollback:
    "supabase/rollbacks/20260811_020_expenses_cash_close.down.sql",
  postflight:
    "supabase/preflight/20260811_020_expenses_cash_close_postflight.sql",
  expenseContract:
    "src/lib/expenses/business-expense-contract.ts",
  cashContract:
    "src/lib/cash/business-cash-reconciliation-contract.ts",
  expenseReader:
    "src/lib/data/server/business-expenses.ts",
  expenseActions:
    "src/app/local/gastos/actions.ts",
  cashActions:
    "src/app/local/caja/actions.ts",
  docs:
    "docs/database/EXPENSES-CASH-CLOSE-WRITE-RPC.md",
  staging:
    "scripts/expenses-cash-close-staging-test.mjs",
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

console.log(
  "Ejecutando regresión de Gastos + cierre canónico de Caja E32C-A...",
);

check(
  "migración crea Gastos y tablas privadas de operaciones",
  /create table if not exists public\.business_expenses/u.test(
    sources.migration,
  )
    && /create table if not exists public\.business_expense_operations/u.test(
      sources.migration,
    )
    && /create table if not exists public\.cash_session_operations/u.test(
      sources.migration,
    ),
);

check(
  "movimientos de Caja tienen ledger y anulación lógica",
  /create table if not exists public\.cash_session_movements/u.test(
    sources.migration,
  )
    && /movement_type in \('income', 'withdrawal'\)/u.test(
      sources.migration.replace(/\s+/gu, " "),
    )
    && /voided_at/u.test(
      sources.migration,
    )
    && /void_operation_key/u.test(
      sources.migration,
    ),
);

check(
  "cash_sessions incorpora snapshots de cierre",
  /cash_sales_snapshot/u.test(
    sources.migration,
  )
    && /cash_expenses_snapshot/u.test(
      sources.migration,
    )
    && /cash_movements_snapshot/u.test(
      sources.migration,
    ),
);

check(
  "Gastos usa permisos del módulo expenses",
  /current_user_has_module_access\([\s\S]*?'expenses',[\s\S]*?'manage'/u.test(
    sources.migration,
  )
    && /current_user_has_module_access\([\s\S]*?'expenses',[\s\S]*?'full'/u.test(
      sources.migration,
    ),
);

check(
  "impacto cash de Gastos exige Cash manage y Caja abierta",
  /Cash permission required for cash expense mutation/u.test(
    sources.migration,
  )
    && /Cash session must be open before registering this paid cash expense/u.test(
      sources.migration,
    )
    && /Cash session must be open before changing this paid cash expense/u.test(
      sources.migration,
    ),
);

check(
  "guardar Gastos es idempotente y tenant-safe",
  /business_expense_operations_business_key/u.test(
    sources.migration,
  )
    && /pg_advisory_xact_lock/u.test(
      sources.migration,
    )
    && /where expense\.business_id = p_business_id/u.test(
      sources.migration,
    ),
);

check(
  "cierre calcula esperado exclusivamente en PostgreSQL",
  /calculated_expected_cash := \([\s\S]*?opening_amount[\s\S]*?\+ cash_sales[\s\S]*?- cash_expenses[\s\S]*?\+ movement_net/u.test(
    sources.migration,
  )
    && /difference_amount :=/u.test(
      sources.migration,
    ),
);

check(
  "cierre y reapertura son idempotentes",
  /cash_session_operations_business_key/u.test(
    sources.migration,
  )
    && /operation_type = 'close'/u.test(
      sources.migration,
    )
    && /operation_type = 'reopen'/u.test(
      sources.migration,
    ),
);

check(
  "reapertura exige Cash full",
  /reopen_business_cash_session[\s\S]*?current_user_has_module_access\([\s\S]*?'cash',[\s\S]*?'full'/u.test(
    sources.migration,
  ),
);

check(
  "conciliación Cash no expone detalle de Gastos",
  /get_business_cash_reconciliation/u.test(
    sources.migration,
  )
    && /'cashExpenses', cash_expenses/u.test(
      sources.migration,
    )
    && !/'description', expense\./u.test(
      sources.migration,
    ),
);

check(
  "RLS forzada y grants explícitos protegen tablas nuevas",
  /alter table public\.business_expenses[\s\S]*?force row level security/u.test(
    sources.migration,
  )
    && /alter table public\.cash_session_movements[\s\S]*?force row level security/u.test(
      sources.migration,
    )
    && /grant select on table public\.business_expenses[\s\S]*?to authenticated/u.test(
      sources.migration,
    )
    && /revoke all on table public\.business_expense_operations/u.test(
      sources.migration,
    ),
);

check(
  "RPC revocan PUBLIC y anon antes de grant authenticated",
  /revoke all on function public\.save_business_expense[\s\S]*?from public, anon, authenticated/u.test(
    sources.migration,
  )
    && /grant execute on function public\.save_business_expense[\s\S]*?to authenticated/u.test(
      sources.migration,
    )
    && /revoke all on function public\.close_business_cash_session[\s\S]*?from public, anon, authenticated/u.test(
      sources.migration,
    ),
);

check(
  "rollback corta API sin destruir evidencia",
  /drop function if exists public\.save_business_expense/u.test(
    sources.rollback,
  )
    && /drop function if exists public\.close_business_cash_session/u.test(
      sources.rollback,
    )
    && !/drop table/u.test(
      sources.rollback,
    )
    && /force row level security/u.test(
      sources.rollback,
    ),
);

check(
  "postflight detecta RLS grants y EXECUTE inseguros",
  /E32C table without forced RLS/u.test(
    sources.postflight,
  )
    && /E32C idempotency tables must remain private/u.test(
      sources.postflight,
    )
    && /anon must not execute close RPC/u.test(
      sources.postflight,
    ),
);

check(
  "contrato TypeScript normaliza métodos importes y operationKey",
  /BUSINESS_EXPENSE_PAYMENT_METHODS/u.test(
    sources.expenseContract,
  )
    && /normalizeBusinessExpenseSaveInput/u.test(
      sources.expenseContract,
    )
    && /operationKey/u.test(
      sources.expenseContract,
    )
    && /toFixed\(2\)/u.test(
      sources.expenseContract,
    ),
);

check(
  "reader de Gastos es server-only y filtra tenant",
  /assertServerOnly/u.test(
    sources.expenseReader,
  )
    && /\.eq\(\s*"business_id",\s*businessId/u.test(
      sources.expenseReader,
    )
    && /\.is\(\s*"archived_at",\s*null/u.test(
      sources.expenseReader,
    ),
);

check(
  "Server Actions de Gastos no aceptan business_id del navegador",
  /resolveActiveBusiness/u.test(
    sources.expenseActions,
  )
    && /"expenses",\s*requiredAccess/u.test(
      sources.expenseActions,
    )
    && /p_business_id:\s*context\.businessId/u.test(
      sources.expenseActions,
    )
    && !/input\.businessId/u.test(
      sources.expenseActions,
    ),
);

check(
  "Caja expone acciones backend de conciliación cierre movimientos y reapertura",
  /getBusinessCashReconciliationAction/u.test(
    sources.cashActions,
  )
    && /addBusinessCashMovementAction/u.test(
      sources.cashActions,
    )
    && /voidBusinessCashMovementAction/u.test(
      sources.cashActions,
    )
    && /closeBusinessCashSessionAction/u.test(
      sources.cashActions,
    )
    && /reopenBusinessCashSessionAction/u.test(
      sources.cashActions,
    ),
);

check(
  "Caja amplía permiso interno hasta full sin debilitar view/manage",
  /requiredAccess:\s*"view"\s*\|\s*"manage"\s*\|\s*"full"/u.test(
    sources.cashActions,
  ),
);

check(
  "documentación mantiene UI fuera de E32C-A",
  /no conecta todavía la UI de Gastos/u.test(
    sources.docs,
  )
    && /E32C-B conectará/u.test(
      sources.docs,
    )
    && /no la aplica a staging/u.test(
      sources.docs,
    ),
);

check(
  "historial remoto incorpora migración 020",
  /expensesCashClosePath/u.test(
    sources.remoteHistory,
  )
    && /Gastos y cierre de Caja agregan conciliación transaccional/u.test(
      sources.remoteHistory,
    ),
);

const migrationSha =
  createHash("sha256")
    .update(
      sources.migration,
    )
    .digest("hex");
const rollbackSha =
  createHash("sha256")
    .update(
      sources.rollback,
    )
    .digest("hex");

check(
  "manifiesto protege migración y rollback 020",
  sources.manifest.includes(
    `${migrationSha}  ${paths.migration}`,
  )
    && sources.manifest.includes(
      `${rollbackSha}  ${paths.rollback}`,
    ),
);

const packageJson =
  JSON.parse(
    sources.package,
  );

check(
  "pruebas local y staging E32C-A quedan integradas",
  packageJson.scripts?.[
    "test:expenses-cash-close"
  ]
    ===
    "node scripts/expenses-cash-close-regression-tests.mjs"
    && packageJson.scripts?.[
      "staging:test-expenses-cash-close"
    ]
      ===
      "node scripts/expenses-cash-close-staging-test.mjs"
    && packageJson.scripts?.[
      "test:regression"
    ]?.includes(
      "test:expenses-cash-close",
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
  `Todos los casos E32C-A pasaron (${checks.length}).`,
);
