import assert from "node:assert/strict";
import {
  mkdtemp,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import {
  tmpdir,
} from "node:os";
import {
  join,
} from "node:path";
import {
  pathToFileURL,
} from "node:url";
import {
  createRequire,
} from "node:module";

const MASTER_PATH =
  "src/lib/demo-demuru-master-data.ts";
const MASTER_BOOTSTRAP_PATH =
  "src/lib/demo-demuru-bootstrap.ts";
const OPERATIONAL_PATH =
  "src/lib/demo-demuru-operational-data.ts";
const OPERATIONAL_BOOTSTRAP_PATH =
  "src/lib/demo-demuru-operational-bootstrap.ts";
const DOCS_PATH =
  "docs/demo/DEMURU-OPERATIONAL-HISTORY.md";

const [
  master,
  masterBootstrap,
  operational,
  operationalBootstrap,
  packageText,
  e35aRegression,
  e34cRegression,
  docs,
] = await Promise.all([
  readFile(
    MASTER_PATH,
    "utf8",
  ),
  readFile(
    MASTER_BOOTSTRAP_PATH,
    "utf8",
  ),
  readFile(
    OPERATIONAL_PATH,
    "utf8",
  ),
  readFile(
    OPERATIONAL_BOOTSTRAP_PATH,
    "utf8",
  ),
  readFile(
    "package.json",
    "utf8",
  ),
  readFile(
    "scripts/demuru-master-data-regression-tests.mjs",
    "utf8",
  ),
  readFile(
    "scripts/public-shipping-ordering-regression-tests.mjs",
    "utf8",
  ),
  readFile(
    DOCS_PATH,
    "utf8",
  ),
]);

console.log(
  "Ejecutando Demo Perfecta Demuru - Operational History E35B...",
);

assert.match(
  operational,
  /DEMURU_DEMO_HISTORY_DAYS = 120/u,
);
assert.match(
  operational,
  /DEMURU_DEMO_FUTURE_DAYS = 14/u,
);
assert.match(
  operational,
  /DEMURU_DEMO_STOCK_USAGE_DAYS = 30/u,
);
assert.match(
  operational,
  /DEMURU_DEMO_STOCK_HISTORY_DAYS = 7/u,
);
assert.doesNotMatch(
  operational,
  /Date\.now\(\)/u,
);
console.log(
  "✓ ventana temporal determinística fija 120 días históricos y 14 futuros",
);

assert.match(
  operationalBootstrap,
  /DEMURU_DEMO_OPERATIONAL_VERSION/u,
);
assert.match(
  operationalBootstrap,
  /`\$\{DEMURU_DEMO_OPERATIONAL_VERSION\}:\$\{anchorDate\}`/u,
);
for (
  const storageKey
  of [
    "reservations",
    "deliveries",
    "expenses",
    "cashRegister",
    "stockProducts",
    "stockMovements",
    "clientsMeta",
    "manualClients",
  ]
) {
  assert.match(
    operationalBootstrap,
    new RegExp(
      `V2_OPERATIONAL_STORAGE_KEYS\\.${storageKey}`,
      "u",
    ),
  );
}
console.log(
  "✓ bootstrap diario escribe todos los dominios operativos existentes",
);

assert.match(
  master,
  /name: string;/u,
);
assert.match(
  master,
  /demuruDemoStockNameById/u,
);
assert.match(
  master,
  /name:\s*demuruDemoStockNameById\.get/u,
);
console.log(
  "✓ ingredientes de Recetas conservan nombre visible además del stockProductId",
);

assert.equal(
  (
    masterBootstrap.match(
      /ensureDemuruDemoOperationalData\(\)/gu,
    )
    ?? []
  ).length,
  2,
);
assert.match(
  masterBootstrap,
  /installedVersion[\s\S]+ensureDemuruDemoOperationalData\(\);[\s\S]+return "current"/u,
);
assert.match(
  masterBootstrap,
  /dispatchDemoMasterEvents\(\);[\s\S]+ensureDemuruDemoOperationalData\(\);[\s\S]+return "installed"/u,
);
console.log(
  "✓ Master Data dispara Operational History tanto en instalación nueva como existente",
);

for (
  const source
  of [
    operational,
    operationalBootstrap,
  ]
) {
  assert.doesNotMatch(
    source,
    /supabase/iu,
  );
  assert.doesNotMatch(
    source,
    /service_role/iu,
  );
}
console.log(
  "✓ E35B permanece exclusivamente en la demo local y no toca Supabase",
);

const packageJson =
  JSON.parse(
    packageText,
  );
assert.equal(
  packageJson.scripts?.["test:demuru-operational-history"],
  "node scripts/demuru-operational-history-regression-tests.mjs",
);
const regressionCommands =
  (
    packageJson.scripts?.["test:regression"]
    ?? ""
  )
    .split(" && ")
    .filter(Boolean);
const expectedSequence = [
  "npm run test:public-shipping-ordering",
  "npm run test:demuru-master-data",
  "npm run test:demuru-operational-history",
];
const regressionIndexes =
  expectedSequence.map(
    (command) =>
      regressionCommands.indexOf(
        command,
      ),
  );

for (
  const command
  of expectedSequence
) {
  assert.equal(
    regressionCommands.filter(
      (candidate) =>
        candidate === command,
    ).length,
    1,
  );
}
assert.equal(
  regressionIndexes.every(
    (index) =>
      index >= 0,
  ),
  true,
);
assert.ok(
  regressionIndexes[0]
  < regressionIndexes[1],
);
assert.ok(
  regressionIndexes[1]
  < regressionIndexes[2],
);
assert.match(
  e35aRegression,
  /sin exigir ser la última suite/u,
);
assert.match(
  e34cRegression,
  /globalRegressionCommands/u,
);
console.log(
  "✓ E34C, E35A y E35B están integrados una sola vez y admiten suites posteriores",
);

const requireFromProject =
  createRequire(
    `${process.cwd()}/package.json`,
  );
const ts =
  requireFromProject(
    "typescript",
  );
const runtimeDir =
  await mkdtemp(
    join(
      tmpdir(),
      "tango-e35b-runtime-",
    ),
  );

try {
  const masterJs =
    ts.transpileModule(
      master,
      {
        compilerOptions: {
          target:
            ts.ScriptTarget.ES2022,
          module:
            ts.ModuleKind.ES2022,
        },
        fileName:
          MASTER_PATH,
      },
    ).outputText;
  let operationalJs =
    ts.transpileModule(
      operational,
      {
        compilerOptions: {
          target:
            ts.ScriptTarget.ES2022,
          module:
            ts.ModuleKind.ES2022,
        },
        fileName:
          OPERATIONAL_PATH,
      },
    ).outputText;

  operationalJs =
    operationalJs.replace(
      '"./demo-demuru-master-data"',
      '"./demo-demuru-master-data.mjs"',
    );

  await Promise.all([
    writeFile(
      join(
        runtimeDir,
        "demo-demuru-master-data.mjs",
      ),
      masterJs,
      "utf8",
    ),
    writeFile(
      join(
        runtimeDir,
        "demo-demuru-operational-data.mjs",
      ),
      operationalJs,
      "utf8",
    ),
  ]);

  const masterModule =
    await import(
      `${pathToFileURL(
        join(
          runtimeDir,
          "demo-demuru-master-data.mjs",
        ),
      ).href}?v=${Date.now()}`
    );
  const operationalModule =
    await import(
      `${pathToFileURL(
        join(
          runtimeDir,
          "demo-demuru-operational-data.mjs",
        ),
      ).href}?v=${Date.now()}`
    );

  const anchor =
    new Date(
      "2026-08-12T12:00:00",
    );
  const snapshot =
    operationalModule
      .createDemuruDemoOperationalSnapshot(
        anchor,
      );
  const repeat =
    operationalModule
      .createDemuruDemoOperationalSnapshot(
        new Date(
          "2026-08-12T12:00:00",
        ),
      );

  assert.equal(
    JSON.stringify(
      snapshot,
    ),
    JSON.stringify(
      repeat,
    ),
  );
  assert.equal(
    snapshot.anchorDate,
    "2026-08-12",
  );
  console.log(
    "✓ mismo día y hora producen exactamente el mismo dataset",
  );

  assert.ok(
    snapshot.reservations.length >= 260,
  );
  assert.ok(
    snapshot.reservations.length <= 340,
  );
  assert.equal(
    snapshot.reservations[0]?.date,
    "2026-04-14",
  );
  assert.equal(
    snapshot.reservations.at(-1)?.date,
    "2026-08-26",
  );
  assert.equal(
    snapshot.reservations.some(
      (reservation) =>
        new Date(
          `${reservation.date}T12:00:00`,
        ).getDay() === 1,
    ),
    false,
  );
  assert.equal(
    snapshot.reservations.some(
      (reservation) =>
        reservation.date
          > snapshot.anchorDate
        && [
          "completed",
          "cancelled",
          "no_show",
        ].includes(
          reservation.status,
        ),
    ),
    false,
  );
  const anchorTimestamp =
    anchor.getTime();
  const todayReservations =
    snapshot.reservations.filter(
      (reservation) =>
        reservation.date
        === snapshot.anchorDate,
    );
  assert.equal(
    todayReservations.every(
      (reservation) =>
        new Date(
          reservation.createdAt,
        ).getTime()
        <= anchorTimestamp
        && (
          !reservation.confirmedAt
          || new Date(
            reservation.confirmedAt,
          ).getTime()
          <= anchorTimestamp
        ),
    ),
    true,
  );
  console.log(
    "✓ Reservas respetan días operativos, pasado, futuro y timestamps relativos al ancla",
  );

  const completedReservations =
    snapshot.reservations.filter(
      (reservation) =>
        reservation.status
        === "completed",
    );
  assert.ok(
    completedReservations.length >= 190,
  );
  for (
    const reservation
    of completedReservations
  ) {
    assert.ok(
      reservation.orderLineItems?.length,
    );
    assert.ok(
      Number(
        reservation.orderTotal,
      ) > 0,
    );
    assert.equal(
      reservation.paidAmount,
      reservation.orderTotal,
    );
    assert.ok(
      reservation.paymentClosedAt,
    );
    const breakdown =
      reservation.paymentBreakdown;
    assert.ok(
      breakdown,
    );
    assert.equal(
      (
        breakdown.cash
        + breakdown.card
        + breakdown.mercadoPago
        + breakdown.transfer
      ),
      reservation.orderTotal,
    );
  }
  assert.ok(
    completedReservations.some(
      (reservation) =>
        reservation.paymentMethod
        === "mixed",
    ),
  );
  console.log(
    "✓ ventas de salón tienen consumo, total y cobro canónico incluyendo pagos mixtos",
  );

  assert.ok(
    snapshot.deliveries.length >= 140,
  );
  assert.ok(
    snapshot.deliveries.some(
      (delivery) =>
        delivery.deliveryType
        === "pickup",
    ),
  );
  assert.ok(
    snapshot.deliveries.some(
      (delivery) =>
        delivery.deliveryType
        === "delivery",
    ),
  );
  assert.ok(
    snapshot.deliveries.some(
      (delivery) =>
        delivery.source
        === "web",
    ),
  );
  assert.ok(
    snapshot.deliveries.some(
      (delivery) =>
        delivery.date
          === snapshot.anchorDate
        && delivery.needsAcceptance,
    ),
  );
  const completedDeliveries =
    snapshot.deliveries.filter(
      (delivery) =>
        delivery.status
        === "completed",
    );
  assert.ok(
    completedDeliveries.length >= 130,
  );
  assert.equal(
    completedDeliveries.every(
      (delivery) =>
        delivery.stockDiscounted
        && delivery.orderItems.length > 0
        && Boolean(
          delivery.deliveredAt,
        ),
    ),
    true,
  );
  const todayDeliveries =
    snapshot.deliveries.filter(
      (delivery) =>
        delivery.date
        === snapshot.anchorDate,
    );
  assert.equal(
    todayDeliveries.every(
      (delivery) =>
        new Date(
          delivery.createdAt,
        ).getTime()
        <= anchorTimestamp
        && (
          !delivery.acceptedAt
          || new Date(
            delivery.acceptedAt,
          ).getTime()
          <= anchorTimestamp
        ),
    ),
    true,
  );
  const waitingWebOrder =
    todayDeliveries.find(
      (delivery) =>
        delivery.source
        === "web"
        && delivery.needsAcceptance,
    );
  assert.ok(
    waitingWebOrder,
  );
  assert.equal(
    waitingWebOrder.acceptedAt,
    undefined,
  );
  assert.equal(
    waitingWebOrder.stockDiscounted,
    false,
  );
  console.log(
    "✓ Envíos mezcla Delivery/Retiro y conserva aceptación, timestamps, Cocina y Stock coherentes",
  );

  assert.ok(
    snapshot.expenses.length >= 110,
  );
  assert.ok(
    snapshot.expenses.some(
      (expense) =>
        expense.status
        === "pending",
    ),
  );
  assert.ok(
    snapshot.expenses.some(
      (expense) =>
        expense.status
        === "paid"
        && expense.paymentMethod
          === "Efectivo",
    ),
  );
  assert.ok(
    snapshot.expenses.some(
      (expense) =>
        expense.provider
        === "Carnes del Tuyú",
    ),
  );
  const todayExpenses =
    snapshot.expenses.filter(
      (expense) =>
        expense.date
        === snapshot.anchorDate,
    );
  assert.equal(
    todayExpenses.every(
      (expense) =>
        new Date(
          expense.createdAt,
        ).getTime()
        <= anchorTimestamp
        && new Date(
          expense.updatedAt,
        ).getTime()
        <= anchorTimestamp
        && (
          !expense.paidAt
          || new Date(
            expense.paidAt,
          ).getTime()
          <= anchorTimestamp
        ),
    ),
    true,
  );
  console.log(
    "✓ Gastos usan proveedores y medios coherentes sin timestamps futuros en el día actual",
  );

  const todayCash =
    snapshot.cashRegisters.find(
      (cash) =>
        cash.date
        === snapshot.anchorDate,
    );
  assert.ok(
    todayCash,
  );
  assert.equal(
    todayCash.status,
    "open",
  );
  assert.equal(
    todayCash.actualCash,
    null,
  );
  assert.ok(
    new Date(
      todayCash.openedAt,
    ).getTime()
    <= anchorTimestamp,
  );
  const closedCash =
    snapshot.cashRegisters.filter(
      (cash) =>
        cash.status
        === "closed",
    );
  assert.ok(
    closedCash.length >= 60,
  );
  assert.equal(
    closedCash.every(
      (cash) =>
        cash.expectedCash
          !== null
        && cash.actualCash
          !== null
        && cash.salesSnapshot
          !== null
        && cash.cashExpensesSnapshot
          !== null,
    ),
    true,
  );
  for (const cash of closedCash) {
    const paymentTotals = {
      cash: 0,
      card: 0,
      mercadoPago: 0,
      transfer: 0,
    };
    const completedSales = [
      ...snapshot.reservations.filter(
        (reservation) =>
          reservation.date === cash.date
          && reservation.status === "completed",
      ),
      ...snapshot.deliveries.filter(
        (delivery) =>
          delivery.date === cash.date
          && delivery.status === "completed",
      ),
    ];

    for (const sale of completedSales) {
      const breakdown = sale.paymentBreakdown;
      assert.ok(breakdown, `venta ${sale.id} conserva desglose de pago`);
      const total = Number(sale.orderTotal ?? sale.total) || 0;
      const breakdownTotal =
        (Number(breakdown.cash) || 0)
        + (Number(breakdown.card) || 0)
        + (Number(breakdown.mercadoPago) || 0)
        + (Number(breakdown.transfer) || 0);
      assert.equal(breakdownTotal, total, `pago de ${sale.id} coincide con su venta`);
      paymentTotals.cash += Number(breakdown.cash) || 0;
      paymentTotals.card += Number(breakdown.card) || 0;
      paymentTotals.mercadoPago += Number(breakdown.mercadoPago) || 0;
      paymentTotals.transfer += Number(breakdown.transfer) || 0;
    }

    const cashExpenses = snapshot.expenses
      .filter(
        (expense) =>
          expense.date === cash.date
          && expense.status === "paid"
          && expense.paymentMethod.toLowerCase().includes("efectivo"),
      )
      .reduce((total, expense) => total + expense.amount, 0);
    const movementNet = cash.movements.reduce(
      (total, movement) => total + (movement.type === "income" ? movement.amount : -movement.amount),
      0,
    );
    const expectedCash = cash.openingAmount + paymentTotals.cash - cashExpenses + movementNet;

    assert.deepEqual(cash.salesSnapshot, paymentTotals, `ventas por medio de ${cash.date} coinciden con el cierre`);
    assert.equal(cash.cashExpensesSnapshot, cashExpenses, `gastos en efectivo de ${cash.date} coinciden con el cierre`);
    assert.equal(cash.expectedCash, expectedCash, `efectivo esperado de ${cash.date} coincide con ventas, gastos y movimientos`);
    assert.equal(cash.actualCash - cash.expectedCash, cash.difference, `diferencia de ${cash.date} coincide con contado menos esperado`);
  }
  console.log(
    "✓ Caja concilia cada cierre con ventas, gastos, movimientos y efectivo contado",
  );

  assert.equal(
    snapshot.stockProducts.length,
    77,
  );
  const lowStock =
    snapshot.stockProducts.filter(
      (product) =>
        product.totalStock
        - product.consumedBySales
        < product.alertBelow,
    );
  assert.equal(
    lowStock.length,
    5,
  );
  assert.equal(
    snapshot.stockProducts.every(
      (product) =>
        product.totalStock
        - product.consumedBySales
        > 0,
    ),
    true,
  );
  assert.equal(
    snapshot.stockMovements.length,
    650,
  );
  const stockIds =
    new Set(
      snapshot.stockProducts.map(
        (product) =>
          product.id,
      ),
    );
  assert.equal(
    snapshot.stockMovements.every(
      (movement) =>
        stockIds.has(
          movement.productId,
        )
        && movement.quantity > 0,
    ),
    true,
  );
  console.log(
    "✓ Stock deriva consumo real de Recetas, muestra 5 alertas bajas y conserva 650 movimientos recientes",
  );

  const recipeIngredients =
    masterModule.demuruDemoRecipes
      .flatMap(
        (recipe) =>
          recipe.ingredients,
      );
  assert.ok(
    recipeIngredients.length >= 150,
  );
  assert.equal(
    recipeIngredients.every(
      (ingredient) =>
        ingredient.name
          .trim()
          .length > 0,
    ),
    true,
  );
  console.log(
    "✓ las 20 Recetas muestran los nombres reales de sus 152 ingredientes",
  );

  assert.equal(
    snapshot.clients.length,
    36,
  );
  assert.equal(
    snapshot.manualClients.length,
    5,
  );
  assert.equal(
    Object.keys(
      snapshot.clientMeta,
    ).length,
    36,
  );
  assert.ok(
    snapshot.clients.some(
      (client) =>
        client.status
        === "frequent",
    ),
  );
  console.log(
    "✓ Clientes combina 36 perfiles con historial y 5 leads manuales",
  );

  const storagePayloadBytes =
    [
      snapshot.reservations,
      snapshot.deliveries,
      snapshot.expenses,
      snapshot.cashRegisters,
      snapshot.stockProducts,
      snapshot.stockMovements,
      snapshot.clientMeta,
      snapshot.manualClients,
    ].reduce(
      (total, value) =>
        total
        + Buffer.byteLength(
          JSON.stringify(
            value,
          ),
          "utf8",
        ),
      0,
    );
  assert.ok(
    storagePayloadBytes
    < 1_300_000,
    `Dataset operativo demasiado grande: ${storagePayloadBytes} bytes`,
  );
  console.log(
    `✓ payload operativo ${Math.round(storagePayloadBytes / 1024)} KiB, con margen para localStorage`,
  );
} finally {
  await rm(
    runtimeDir,
    {
      recursive: true,
      force: true,
    },
  );
}

assert.match(
  docs,
  /120 días/u,
);
assert.match(
  docs,
  /14 días/u,
);
assert.match(
  docs,
  /295/u,
);
assert.match(
  docs,
  /Stock/u,
);
assert.match(
  docs,
  /Caja/u,
);
assert.match(
  docs,
  /E35C/u,
);
console.log(
  "✓ documentación fija volumen, rolling diario y frontera con E35C",
);

for (
  const [label, source]
  of [
    [
      "master",
      master,
    ],
    [
      "masterBootstrap",
      masterBootstrap,
    ],
    [
      "operational",
      operational,
    ],
    [
      "operationalBootstrap",
      operationalBootstrap,
    ],
    [
      "docs",
      docs,
    ],
  ]
) {
  assert.doesNotMatch(
    source,
    /[ \t]+\n/u,
    `${label} contiene whitespace accidental`,
  );
}

console.log(
  "Todos los casos E35B pasaron.",
);
