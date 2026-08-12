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
const OPERATIONAL_PATH =
  "src/lib/demo-demuru-operational-data.ts";

function localDateKey(
  date,
) {
  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      "0",
    ),
    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    ),
  ].join(
    "-",
  );
}

function addDays(
  dateKey,
  days,
) {
  const value =
    new Date(
      `${dateKey}T12:00:00`,
    );

  value.setDate(
    value.getDate() + days,
  );

  return localDateKey(
    value,
  );
}

function fail(message) {
  console.error(
    `ERROR DEMO: ${message}`,
  );
  process.exit(1);
}

const [
  master,
  operational,
] = await Promise.all([
  readFile(
    MASTER_PATH,
    "utf8",
  ),
  readFile(
    OPERATIONAL_PATH,
    "utf8",
  ),
]);

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
      "tango-demuru-doctor-",
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

  const cacheBust =
    Date.now();
  const masterModule =
    await import(
      `${pathToFileURL(
        join(
          runtimeDir,
          "demo-demuru-master-data.mjs",
        ),
      ).href}?v=${cacheBust}`
    );
  const operationalModule =
    await import(
      `${pathToFileURL(
        join(
          runtimeDir,
          "demo-demuru-operational-data.mjs",
        ),
      ).href}?v=${cacheBust}`
    );

  const now =
    new Date();
  const today =
    localDateKey(
      now,
    );
  const snapshot =
    operationalModule
      .createDemuruDemoOperationalSnapshot(
        now,
      );

  assert.equal(
    masterModule
      .demuruDemoMenuCategories
      .length,
    5,
  );
  assert.equal(
    masterModule
      .demuruDemoMenuItems
      .length,
    20,
  );
  assert.equal(
    masterModule
      .demuruDemoStockProducts
      .length,
    77,
  );
  assert.equal(
    masterModule
      .demuruDemoRecipes
      .length,
    20,
  );

  const recipeIngredients =
    masterModule
      .demuruDemoRecipes
      .flatMap(
        (recipe) =>
          recipe.ingredients,
      );

  assert.equal(
    recipeIngredients.length,
    152,
  );
  assert.equal(
    recipeIngredients.every(
      (ingredient) =>
        typeof ingredient.name
          === "string"
        && ingredient.name
          .trim()
          .length > 0,
    ),
    true,
  );

  assert.equal(
    snapshot.anchorDate,
    today,
  );

  const minDate =
    addDays(
      today,
      -operationalModule
        .DEMURU_DEMO_HISTORY_DAYS,
    );
  const maxDate =
    addDays(
      today,
      operationalModule
        .DEMURU_DEMO_FUTURE_DAYS,
    );
  const anchorTimestamp =
    now.getTime();

  function assertNotFuture(
    value,
    label,
  ) {
    if (!value) {
      return;
    }

    const timestamp =
      new Date(
        value,
      ).getTime();

    if (
      !Number.isFinite(
        timestamp,
      )
      || timestamp
        > anchorTimestamp + 1000
    ) {
      fail(
        `Timestamp futuro o inválido en ${label}: ${value}`,
      );
    }
  }

  assert.ok(
    snapshot.reservations.length
    >= 260,
  );
  assert.ok(
    snapshot.reservations.length
    <= 340,
  );
  assert.equal(
    snapshot.reservations.every(
      (reservation) =>
        reservation.date
          >= minDate
        && reservation.date
          <= maxDate,
    ),
    true,
  );
  assert.equal(
    snapshot.reservations.some(
      (reservation) =>
        reservation.date > today
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

  for (
    const reservation
    of snapshot.reservations.filter(
      (item) =>
        item.date === today,
    )
  ) {
    for (
      const [
        field,
        value,
      ]
      of Object.entries({
        createdAt:
          reservation.createdAt,
        confirmedAt:
          reservation.confirmedAt,
        seatedAt:
          reservation.seatedAt,
        consumptionStartedAt:
          reservation.consumptionStartedAt,
        kitchenStartedAt:
          reservation.kitchenStartedAt,
        kitchenReadyAt:
          reservation.kitchenReadyAt,
        kitchenCompletedAt:
          reservation.kitchenCompletedAt,
        paymentClosedAt:
          reservation.paymentClosedAt,
        completedAt:
          reservation.completedAt,
        cancelledAt:
          reservation.cancelledAt,
        noShowAt:
          reservation.noShowAt,
      })
    ) {
      assertNotFuture(
        value,
        `reserva ${reservation.id}.${field}`,
      );
    }
  }

  assert.ok(
    snapshot.deliveries.length
    >= 140,
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
        delivery.deliveryType
        === "pickup",
    ),
  );
  assert.ok(
    snapshot.deliveries.some(
      (delivery) =>
        delivery.source
        === "web",
    ),
  );

  const webOrders =
    snapshot.deliveries.filter(
      (delivery) =>
        delivery.source
        === "web",
    );

  assert.ok(
    webOrders.length > 0,
  );

  const waitingWebOrders =
    webOrders.filter(
      (delivery) =>
        delivery.needsAcceptance,
    );

  assert.equal(
    waitingWebOrders.every(
      (delivery) =>
        delivery.acceptedAt
          === undefined
        && delivery.stockDiscounted
          === false,
    ),
    true,
  );

  for (
    const delivery
    of snapshot.deliveries.filter(
      (item) =>
        item.date === today,
    )
  ) {
    for (
      const [
        field,
        value,
      ]
      of Object.entries({
        createdAt:
          delivery.createdAt,
        acceptedAt:
          delivery.acceptedAt,
        preparingAt:
          delivery.preparingAt,
        readyAt:
          delivery.readyAt,
        onTheWayAt:
          delivery.onTheWayAt,
        deliveredAt:
          delivery.deliveredAt,
        cancelledAt:
          delivery.cancelledAt,
        kitchenStartedAt:
          delivery.kitchenStartedAt,
        kitchenReadyAt:
          delivery.kitchenReadyAt,
        kitchenCompletedAt:
          delivery.kitchenCompletedAt,
      })
    ) {
      assertNotFuture(
        value,
        `envío ${delivery.id}.${field}`,
      );
    }
  }

  assert.ok(
    snapshot.expenses.length
    >= 110,
  );
  assert.ok(
    snapshot.expenses.some(
      (expense) =>
        expense.status
        === "pending",
    ),
  );

  for (
    const expense
    of snapshot.expenses.filter(
      (item) =>
        item.date === today,
    )
  ) {
    assertNotFuture(
      expense.createdAt,
      `gasto ${expense.id}.createdAt`,
    );
    assertNotFuture(
      expense.updatedAt,
      `gasto ${expense.id}.updatedAt`,
    );
    assertNotFuture(
      expense.paidAt,
      `gasto ${expense.id}.paidAt`,
    );
  }

  assert.equal(
    snapshot.stockProducts.length,
    77,
  );
  assert.equal(
    snapshot.stockMovements.length,
    650,
  );

  for (
    const movement
    of snapshot.stockMovements
  ) {
    assertNotFuture(
      movement.createdAt,
      `movimiento Stock ${movement.id}.createdAt`,
    );
  }

  const lowStock =
    snapshot.stockProducts
      .filter(
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

  const todayCash =
    snapshot.cashRegisters
      .find(
        (cash) =>
          cash.date === today,
      );

  assert.ok(
    todayCash,
  );
  assert.equal(
    todayCash.status,
    "open",
  );
  assertNotFuture(
    todayCash.openedAt,
    `caja ${todayCash.id}.openedAt`,
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

  if (
    storagePayloadBytes
    >= 1_300_000
  ) {
    fail(
      `Payload local demasiado grande: ${storagePayloadBytes} bytes.`,
    );
  }

  console.log(
    "====================================================",
  );
  console.log(
    "  DEMO DEMURU LISTA",
  );
  console.log(
    "====================================================",
  );
  console.log(
    `Fecha ancla: ${today}`,
  );
  console.log(
    `Carta: 5 categorías / 20 productos / 20 recetas`,
  );
  console.log(
    `Stock: 77 insumos / 5 alertas bajas / 650 movimientos`,
  );
  console.log(
    `Reservas: ${snapshot.reservations.length}`,
  );
  console.log(
    `Envíos y retiros: ${snapshot.deliveries.length}`,
  );
  console.log(
    `Clientes: 36 históricos + 5 leads`,
  );
  console.log(
    `Payload local: ${Math.round(storagePayloadBytes / 1024)} KiB`,
  );
  console.log(
    "Rolling: 120 días históricos + 14 días futuros.",
  );
  console.log(
    "La fuente operativa es coherente con Master Data y la fecha actual.",
  );
} catch (error) {
  fail(
    error instanceof Error
      ? error.message
      : String(error),
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
