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
  "Ejecutando regresión del cutover UI de Caja/Pagos E32B...",
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
  /getDataSource\s*\(\s*\)\s*===\s*"supabase"/u.test(
    sources.cashPage,
  )
    && /useEffect\s*\(\s*\(\)\s*=>\s*\{\s*if\s*\(\s*isSupabasePersistence\s*\)\s*\{\s*return;\s*\}[\s\S]*?const sync\s*=/u.test(
      sources.cashPage,
    ),
);

check(
  "Caja abre la sesión mediante Server Action",
  /openBusinessCashSessionAction/u.test(
    sources.cashPage,
  )
    && /createV2OperationalId\s*\(\s*"cash-open"/u.test(
      sources.cashPage,
    ),
);

check(
  "Caja rehidrata sesión y pagos al cambiar fecha",
  /getBusinessCashSnapshotAction/u.test(
    sources.cashPage,
  )
    && /persistentPayments/u.test(
      sources.cashPage,
    )
    && /selectedDate/u.test(
      sources.cashPage,
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
  "cierre movimientos y gastos siguen bloqueados en Supabase",
  /Cierre, movimientos manuales, Gastos y Envíos siguen bloqueados/u.test(
    sources.cashPage,
  )
    && /El cierre persistente de Caja se habilitará junto con Gastos persistentes\./u.test(
      sources.cashPage,
    )
    && /Pendiente de persistencia/u.test(
      sources.cashPage,
    ),
);

check(
  "Caja no muestra acciones de cierre persistente incompletas",
  /selectedClose\?\.status\s*===\s*"open"\s*&&\s*!isSupabasePersistence/u.test(
    sources.cashPage,
  )
    && /selectedClose\?\.status\s*===\s*"closed"\s*&&\s*!isSupabasePersistence/u.test(
      sources.cashPage,
    ),
);

check(
  "sincronización cash solo dispara reconciliación",
  /\|\s*"cash";/u.test(
    sources.serverSync,
  )
    && /publishV2ServerSync\s*\(\s*"cash"\s*\)/u.test(
      sources.reservationsUi,
    )
    && /subscribeV2ServerSync\s*\(\s*"cash"/u.test(
      sources.cashPage,
    ),
);

check(
  "componentes cliente no introducen DML financiero directo",
  !/\.from\s*\(\s*"business_payments"\s*\)/u.test(
    sources.reservationsUi,
  )
    && !/\.from\s*\(\s*"cash_sessions"\s*\)/u.test(
      sources.cashPage,
    )
    && !/\.from\s*\(\s*"business_payments"\s*\)/u.test(
      sources.cashPage,
    )
    && !/\.insert\s*\(/u.test(
      sources.cashPage,
    )
    && !/\.update\s*\(/u.test(
      sources.cashPage,
    )
    && !/\.delete\s*\(/u.test(
      sources.cashPage,
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
