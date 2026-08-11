import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

const paths = {
  expensesRoute:
    "src/app/local/gastos/page.tsx",
  expensesUi:
    "src/app/local/gastos/v2-gastos-page.tsx",
  expensesActions:
    "src/app/local/gastos/actions.ts",
  expensesReader:
    "src/lib/data/server/business-expenses.ts",
  cashRoute:
    "src/app/local/caja/page.tsx",
  cashUi:
    "src/app/local/caja/v2-caja-page.tsx",
  cashActions:
    "src/app/local/caja/actions.ts",
  cashReader:
    "src/lib/data/server/business-cash.ts",
  cashContract:
    "src/lib/cash/business-cash-reconciliation-contract.ts",
  paymentContract:
    "src/lib/payments/business-payment-contract.ts",
  serverSync:
    "src/lib/v2-server-sync.ts",
  e32bRegression:
    "scripts/cash-payments-ui-cutover-regression-tests.mjs",
  migration019:
    "supabase/migrations/20260810_019_cash_payments_write.sql",
  rollback019:
    "supabase/rollbacks/20260810_019_cash_payments_write.down.sql",
  migration020:
    "supabase/migrations/20260811_020_expenses_cash_close.sql",
  rollback020:
    "supabase/rollbacks/20260811_020_expenses_cash_close.down.sql",
  docs:
    "docs/database/EXPENSES-CASH-CLOSE-UI-CUTOVER.md",
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

function extractCallBlock(
  source,
  marker,
) {
  const start =
    source.indexOf(marker);

  if (start < 0) {
    return "";
  }

  const end =
    source.indexOf(
      "});",
      start,
    );

  if (end < 0) {
    return "";
  }

  return source.slice(
    start,
    end + 3,
  );
}

const DIRECT_FINANCIAL_SUPABASE_ACCESS =
  /@supabase\/supabase-js|@\/lib\/supabase\/|createSupabase|\.rpc\s*\(|\.from\s*\(\s*["'](?:cash_sessions|business_payments|business_expenses|business_expense_operations|cash_session_movements|cash_session_operations)["']/u;

check(
  "detector DML permite Array.from y Map.delete",
  !DIRECT_FINANCIAL_SUPABASE_ACCESS.test(
    "Array.from({ length: 7 }); cache.delete(id);",
  ),
);

check(
  "detector DML bloquea acceso financiero Supabase",
  DIRECT_FINANCIAL_SUPABASE_ACCESS.test(
    'supabase.from("cash_sessions").delete().eq("id", id)',
  )
    && DIRECT_FINANCIAL_SUPABASE_ACCESS.test(
      'supabase.rpc("close_business_cash_session", payload)',
    )
    && DIRECT_FINANCIAL_SUPABASE_ACCESS.test(
      'import { createClient } from "@supabase/supabase-js";',
    ),
);

console.log(
  "Ejecutando cutover UI Gastos + cierre de Caja E32C-B...",
);

check(
  "Gastos usa wrapper servidor y snapshot persistente",
  /resolveActiveBusiness/u.test(
    sources.expensesRoute,
  )
    && /getBusinessExpenses/u.test(
      sources.expensesRoute,
    )
    && /initialBusinessExpenses/u.test(
      sources.expensesRoute,
    )
    && /expensePersistence="supabase"/u.test(
      sources.expensesRoute,
    ),
);

check(
  "permisos de Gastos y Cash se resuelven en servidor",
  /"expenses",[\s\S]*?"manage"/u.test(
    sources.expensesRoute,
  )
    && /"expenses",[\s\S]*?"full"/u.test(
      sources.expensesRoute,
    )
    && /"cash",[\s\S]*?"manage"/u.test(
      sources.expensesRoute,
    ),
);

check(
  "UI Gastos conserva fallback local solo fuera de Supabase",
  /if\s*\(\s*isSupabasePersistence\s*\)\s*\{\s*return;\s*\}[\s\S]*?readExpenses/u.test(
    sources.expensesUi,
  )
    && /window\.localStorage\.setItem/u.test(
      sources.expensesUi,
    )
    && /if\s*\(\s*isSupabasePersistence\s*\)\s*\{\s*return;\s*\}[\s\S]*?window\.localStorage\.setItem/u.test(
      sources.expensesUi,
    ),
);

check(
  "Gastos persistente usa Server Actions y operationKey estable",
  /saveBusinessExpenseAction/u.test(
    sources.expensesUi,
  )
    && /archiveBusinessExpenseAction/u.test(
      sources.expensesUi,
    )
    && /getBusinessExpensesAction/u.test(
      sources.expensesUi,
    )
    && /expenseOperationKeyRef/u.test(
      sources.expensesUi,
    )
    && /createV2OperationalId\(\s*"expense-save"/u.test(
      sources.expensesUi,
    ),
);

check(
  "Gastos cliente no introduce DML Supabase",
  !DIRECT_FINANCIAL_SUPABASE_ACCESS.test(
    sources.expensesUi,
  )
    && !/p_business_id/u.test(
      sources.expensesUi,
    ),
);

check(
  "acciones de Gastos incorporan lectura view",
  /requiredAccess:[\s\S]*?"view"[\s\S]*?"manage"[\s\S]*?"full"/u.test(
    sources.expensesActions,
  )
    && /getBusinessExpensesAction/u.test(
      sources.expensesActions,
    )
    && /getBusinessExpenses\(/u.test(
      sources.expensesActions,
    ),
);

check(
  "sincronización incorpora dominio expenses",
  /\|\s*"expenses";/u.test(
    sources.serverSync,
  )
    && /source\.domain === "expenses"/u.test(
      sources.serverSync,
    )
    && /publishV2ServerSync\(\s*"expenses"/u.test(
      sources.expensesUi,
    )
    && /subscribeV2ServerSync\(\s*"expenses"/u.test(
      sources.expensesUi,
    ),
);

check(
  "Caja usa wrapper servidor y permisos manage/full",
  /resolveActiveBusiness/u.test(
    sources.cashRoute,
  )
    && /cashPersistence="supabase"/u.test(
      sources.cashRoute,
    )
    && /"cash",[\s\S]*?"manage"/u.test(
      sources.cashRoute,
    )
    && /"cash",[\s\S]*?"full"/u.test(
      sources.cashRoute,
    ),
);

check(
  "Caja rehidrata conciliación e historial canónicos",
  /getBusinessCashReconciliationAction/u.test(
    sources.cashUi,
  )
    && /getBusinessCashHistoryAction/u.test(
      sources.cashUi,
    )
    && /persistentReconciliation/u.test(
      sources.cashUi,
    )
    && /persistentHistory/u.test(
      sources.cashUi,
    ),
);

check(
  "Caja habilita movimientos cierre y reapertura E32C",
  /addBusinessCashMovementAction/u.test(
    sources.cashUi,
  )
    && /voidBusinessCashMovementAction/u.test(
      sources.cashUi,
    )
    && /closeBusinessCashSessionAction/u.test(
      sources.cashUi,
    )
    && /reopenBusinessCashSessionAction/u.test(
      sources.cashUi,
    ),
);

check(
  "Caja cliente no introduce DML financiero directo",
  !DIRECT_FINANCIAL_SUPABASE_ACCESS.test(
    sources.cashUi,
  )
    && !/p_business_id/u.test(
      sources.cashUi,
    ),
);

check(
  "movimientos anulados no vuelven al saldo activo",
  /movement\.voidedAt\s*===\s*null/u.test(
    sources.cashUi,
  )
    && /cashMovementVoidOperationKeysRef/u.test(
      sources.cashUi,
    )
    && /\.get\(id\)/u.test(
      sources.cashUi,
    )
    && /\.delete\(id\)/u.test(
      sources.cashUi,
    ),
);

const closeCashActionCall =
  extractCallBlock(
    sources.cashUi,
    "closeBusinessCashSessionAction({",
  );

check(
  "cierre cliente no envía expectedCash",
  Boolean(
    closeCashActionCall,
  )
    && /actualCash\s*:/u.test(
      closeCashActionCall,
    )
    && /operationKey\s*,/u.test(
      closeCashActionCall,
    )
    && !/expectedCash\s*:/u.test(
      closeCashActionCall,
    ),
);

check(
  "Caja usa total cash de Gastos sin leer detalle",
  /persistentReconciliation\?\.cashExpenses/u.test(
    sources.cashUi,
  )
    && /Gastos de tarjeta/u.test(
      sources.cashUi,
    )
    && /Detalle en Gastos/u.test(
      sources.cashUi,
    )
    && !/business_expenses/u.test(
      sources.cashUi,
    ),
);

check(
  "Cash session expone evidencia de cierre",
  /closedAt:\s*string\s*\|\s*null/u.test(
    sources.paymentContract,
  )
    && /actualCash:\s*number\s*\|\s*null/u.test(
      sources.paymentContract,
    )
    && /expectedCash:\s*number\s*\|\s*null/u.test(
      sources.paymentContract,
    )
    && /difference:\s*number\s*\|\s*null/u.test(
      sources.paymentContract,
    )
    && /cashExpensesSnapshot/u.test(
      sources.paymentContract,
    ),
);

check(
  "reader de Caja incluye historial cerrado por tenant",
  /getBusinessClosedCashSessions/u.test(
    sources.cashReader,
  )
    && /\.eq\(\s*"business_id",\s*businessId/u.test(
      sources.cashReader,
    )
    && /\.eq\(\s*"status",\s*"closed"/u.test(
      sources.cashReader,
    ),
);

check(
  "acción de historial exige Cash view",
  /getBusinessCashHistoryAction/u.test(
    sources.cashActions,
  )
    && /getBusinessClosedCashSessions/u.test(
      sources.cashActions,
    )
    && /resolveCashContext\(\s*"view"/u.test(
      sources.cashActions,
    ),
);

check(
  "histórico E32B acepta el cutover posterior",
  /cashUi/u.test(
    sources.e32bRegression,
  )
    && /E32C-B/u.test(
      sources.e32bRegression,
    ),
);

const expectedHashes = new Map([
  [
    paths.migration019,
    "e4aa218d4d24848f7381fc08685070fdb85b73816c17df9952e27ec4fa46e69f",
  ],
  [
    paths.rollback019,
    "59bd2858061519a6de4a9aea437525f075ab330c5e51ecc6c8b8fa1c246ac840",
  ],
  [
    paths.migration020,
    "d19277d5449443562b60b4809eb89089f158edf19d82a8b121ca6ff444cec935",
  ],
  [
    paths.rollback020,
    "67930a7998150df632ca0246916b56ed1fe80fe544f4f9437aa8383eaa74c346",
  ],
]);

for (const [path, expected] of expectedHashes) {
  const actual =
    createHash("sha256")
      .update(sources[
        Object.entries(paths).find(([, value]) => value === path)?.[0]
      ])
      .digest("hex");

  check(
    `${path} permanece byte-identical`,
    actual === expected,
  );
}

check(
  "documentación fija frontera de permisos y sin migración",
  /Caja recibe únicamente el total de Gastos pagados en efectivo/u.test(
    sources.docs,
  )
    && /E32C-B no agrega migraciones/u.test(
      sources.docs,
    ),
);

const packageJson =
  JSON.parse(
    sources.package,
  );

check(
  "E32C-B forma parte del QA global",
  packageJson.scripts?.[
    "test:expenses-cash-close-ui-cutover"
  ] ===
    "node scripts/expenses-cash-close-ui-cutover-regression-tests.mjs"
    && packageJson.scripts?.[
      "test:regression"
    ]?.includes(
      "test:expenses-cash-close-ui-cutover",
    ),
);

for (const [label, source] of Object.entries(sources)) {
  check(
    `${label} sin whitespace accidental`,
    !/[ \t]+\n/u.test(source),
  );
}

console.log(
  `Todos los casos E32C-B pasaron (${checks.length}).`,
);
