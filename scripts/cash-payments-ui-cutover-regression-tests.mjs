import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const paths = {
  reservationsPage:
    "src/app/local/reservas/page.tsx",
  reservationsUi:
    "src/app/local/reservas/v2-reservas-page.tsx",
  paymentActions:
    "src/app/local/reservas/payment-actions.ts",
  cashPage:
    "src/app/local/caja/page.tsx",
  cashUi:
    "src/app/local/caja/v2-caja-page.tsx",
  cashActions:
    "src/app/local/caja/actions.ts",
  cashReader:
    "src/lib/data/server/business-cash.ts",
  serverSync:
    "src/lib/v2-server-sync.ts",
  e25Regression:
    "scripts/reservations-ui-cutover-regression-tests.mjs",
  e31bRegression:
    "scripts/reservation-consumption-ui-cutover-regression-tests.mjs",
  docs:
    "docs/database/CASH-PAYMENTS-UI-CUTOVER.md",
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
  "Ejecutando regresión del cutover UI de Caja/Pagos E32B (compatible con E32C-B)...",
);

check(
  "Reservas carga pagos persistentes por lote",
  /getBusinessPaymentsForReservations/u.test(
    sources.reservationsPage,
  )
    && /initialPersistentPayments\s*=\s*\{\s*persistentPayments\s*\}/u.test(
      sources.reservationsPage,
    ),
);

check(
  "permiso de cobro deriva del módulo Cash",
  /hasStaffAccess\s*\([\s\S]*?"cash"\s*,\s*"manage"/u.test(
    sources.reservationsPage,
  )
    && /canManageCash\s*=\s*\{\s*canManageCash\s*\}/u.test(
      sources.reservationsPage,
    ),
);

check(
  "la UI hidrata pagos canónicos después del refresh",
  /hydratePersistentReservationPayments/u.test(
    sources.reservationsUi,
  )
    && /initialPersistentPayments/u.test(
      sources.reservationsUi,
    )
    && /paymentClosedAt\s*:/u.test(
      sources.reservationsUi,
    ),
);

check(
  "el modal persistente usa la Server Action E32A",
  /completeBusinessReservationPaymentAction/u.test(
    sources.reservationsUi,
  )
    && /"complete_business_reservation_payment"/u.test(
      sources.paymentActions,
    ),
);

check(
  "el navegador no decide el subtotal canónico",
  /result\.payment\.order\s*\.\s*subtotal/u.test(
    sources.reservationsUi,
  )
    && !/p_business_id\s*:/u.test(
      sources.reservationsUi,
    ),
);

check(
  "el cobro conserva operationKey estable y evita dobles envíos",
  /paymentOperationKeyRef/u.test(
    sources.reservationsUi,
  )
    && /paymentMutationRef\.current\s*=\s*true/u.test(
      sources.reservationsUi,
    )
    && /paymentMutationRef\.current\s*=\s*false/u.test(
      sources.reservationsUi,
    ),
);

check(
  "la respuesta canónica reemplaza estado de pago y reserva",
  /result\.payment\.reservation\s*\.\s*completedAt/u.test(
    sources.reservationsUi,
  )
    && /result\.payment\.totalAmount/u.test(
      sources.reservationsUi,
    )
    && /paymentBreakdown\s*:\s*canonicalBreakdown/u.test(
      sources.reservationsUi,
    ),
);

check(
  "el fallback local conserva la validación de caja local",
  /if\s*\(\s*!isSupabasePersistence\s*\)[\s\S]*?getCashRegisterError\s*\(/u.test(
    sources.reservationsUi,
  ),
);

check(
  "Caja detecta datasource y corta la sincronización local en Supabase",
  /cashPersistence\s*===\s*"supabase"/u.test(
    sources.cashUi,
  )
    && /useEffect\s*\(\s*\(\)\s*=>\s*\{\s*if\s*\(\s*isSupabasePersistence\s*\)\s*\{\s*return;\s*\}[\s\S]*?const sync\s*=/u.test(
      sources.cashUi,
    ),
);

check(
  "Caja abre la sesión mediante Server Action",
  /openBusinessCashSessionAction/u.test(
    sources.cashUi,
  )
    && /createV2OperationalId\s*\(\s*"cash-open"/u.test(
      sources.cashUi,
    ),
);

check(
  "Caja rehidrata sesión y pagos al cambiar fecha",
  /getBusinessCashReconciliationAction/u.test(
    sources.cashUi,
  )
    && /persistentReconciliation/u.test(
      sources.cashUi,
    )
    && /selectedDate/u.test(
      sources.cashUi,
    ),
);

check(
  "lectura de Caja exige view y apertura exige manage",
  /resolveCashContext\s*\(\s*"view"/u.test(
    sources.cashActions,
  )
    && /resolveCashContext\s*\(\s*"manage"/u.test(
      sources.cashActions,
    ),
);

check(
  "reader financiero filtra por tenant y cash_session_id",
  /getBusinessPaymentsForCashSession/u.test(
    sources.cashReader,
  )
    && /\.eq\s*\(\s*"business_id"\s*,\s*businessId/u.test(
      sources.cashReader,
    )
    && /\.eq\s*\(\s*"cash_session_id"\s*,\s*cashSessionId/u.test(
      sources.cashReader,
    ),
);

check(
  "frontera E32B solo se levanta mediante E32C-B",
  /E32B NO habilita todavía/u.test(
    sources.docs,
  )
    && /closeBusinessCashSessionAction/u.test(
      sources.cashUi,
    )
    && /addBusinessCashMovementAction/u.test(
      sources.cashUi,
    ),
);

check(
  "Caja E32C-B condiciona acciones persistentes por permisos",
  /canManageCash/u.test(
    sources.cashUi,
  )
    && /canFullCash/u.test(
      sources.cashUi,
    )
    && /reopenBusinessCashSessionAction/u.test(
      sources.cashUi,
    ),
);

check(
  "Caja local registra y muestra el medio de pago de cada movimiento",
  /movementPaymentMethod/u.test(
    sources.cashUi,
  )
    && /label="Medio de pago"/u.test(
      sources.cashUi,
    )
    && /paymentMethodLabel\(getMovementPaymentMethod\(movement\)\)/u.test(
      sources.cashUi,
    ),
);

check(
  "solo los movimientos en efectivo alteran el efectivo esperado local",
  /getMovementPaymentMethod\(movement\) === "cash"/u.test(
    sources.cashUi,
  ),
);

check(
  "sincronización cash mantiene reconciliación con dominios posteriores",
  /\|\s*"cash"/u.test(
    sources.serverSync,
  )
    && /\|\s*"expenses";/u.test(
      sources.serverSync,
    )
    && /publishV2ServerSync\s*\(\s*"cash"\s*\)/u.test(
      sources.reservationsUi,
    )
    && /subscribeV2ServerSync\s*\(\s*"cash"/u.test(
      sources.cashUi,
    ),
);

check(
  "componentes cliente no introducen DML financiero directo",
  !/\.from\s*\(\s*"business_payments"\s*\)/u.test(
    sources.reservationsUi,
  )
    && !/@supabase\/supabase-js/u.test(
      sources.cashUi,
    )
    && !/@\/lib\/supabase\//u.test(
      sources.cashUi,
    )
    && !/createSupabase/u.test(
      sources.cashUi,
    )
    && !/\.rpc\s*\(/u.test(
      sources.cashUi,
    )
    && !/\.from\s*\(\s*["'](?:cash_sessions|business_payments|business_expenses|business_expense_operations|cash_session_movements|cash_session_operations)["']/u.test(
      sources.cashUi,
    )
    && !/p_business_id/u.test(
      sources.cashUi,
    ),
);

check(
  "regresiones históricas aceptan el cutover posterior",
  /consumo y pagos pueden usar cutovers posteriores/u.test(
    sources.e25Regression,
  )
    && /Caja y Pagos pueden entrar por un cutover posterior/u.test(
      sources.e31bRegression,
    ),
);

check(
  "documentación fija frontera de E32B",
  /E32B no agrega ni aplica migraciones\./u.test(
    sources.docs,
  )
    && /business_payment_operations sigue siendo privada/u.test(
      sources.docs,
    )
    && /cierre definitivo de Caja/u.test(
      sources.docs,
    ),
);

const pkg =
  JSON.parse(sources.package);

check(
  "E32B forma parte del QA global",
  pkg.scripts?.[
    "test:cash-payments-ui-cutover"
  ]
    ===
    "node scripts/cash-payments-ui-cutover-regression-tests.mjs"
    && pkg.scripts?.[
      "test:regression"
    ]?.includes(
      "test:cash-payments-ui-cutover",
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
  `Todos los casos del cutover UI de Caja/Pagos E32B pasaron (${checks.length}).`,
);
