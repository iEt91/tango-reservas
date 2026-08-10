import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./lib/load-local-env.mjs";
import { getStagingContext } from "./lib/staging-context.mjs";

const loaded =
  await loadLocalEnv();

if (!loaded) {
  throw new Error(
    "No existe .env.staging.local.",
  );
}

const context =
  getStagingContext({
    requireServerSecret: true,
    requireTestUsers: true,
  });

const fixture =
  JSON.parse(
    await readFile(
      ".tango/staging-isolation.json",
      "utf8",
    ),
  );

if (
  fixture.projectRef
  !== context.stagingProjectRef
) {
  throw new Error(
    "El fixture no pertenece al staging actual.",
  );
}

for (const key of [
  "businessAId",
  "businessBId",
  "serviceAId",
  "customerAId",
  "floorTableAId",
]) {
  if (!fixture[key]) {
    throw new Error(
      `Falta ${key} en el fixture de staging.`,
    );
  }
}

function client(
  key = context.publicKey,
) {
  return createClient(
    context.url,
    key,
    {
      auth: {
        autoRefreshToken: false,
        detectSessionInUrl: false,
        persistSession: false,
      },
    },
  );
}

const admin =
  client(context.serverSecret);
const userA =
  client();
const userB =
  client();
const anonymous =
  client();

async function signIn(
  target,
  email,
  password,
) {
  const { error } =
    await target.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    throw error;
  }
}

async function expectFailure(
  promise,
  label,
) {
  const { error } =
    await promise;

  assert.ok(
    error,
    label,
  );

  return error;
}

function nextMonday() {
  const date =
    new Date();
  date.setUTCHours(
    12,
    0,
    0,
    0,
  );

  const distance =
    (
      1
      - date.getUTCDay()
      + 7
    ) % 7 || 7;

  date.setUTCDate(
    date.getUTCDate()
    + distance,
  );

  return date
    .toISOString()
    .slice(0, 10);
}

function menuPayload(name) {
  return {
    category_id: null,
    name,
    description:
      "Temporal QA E31A",
    price: 1000,
    status: "available",
    is_visible: true,
    is_featured: false,
    image_url: "",
  };
}

function stockPayload(name) {
  return {
    name,
    category: "QA E31A",
    supplier: "",
    unit: "kg",
    unit_cost: 1000,
    alert_below: 0,
    note: "Temporal QA E31A",
    is_active: true,
  };
}

function recipePayload(
  stockProductId,
  quantity,
) {
  return {
    p_recipe: {
      name:
        "Receta QA E31A",
      preparation_time_seconds:
        600,
    },
    p_ingredients: [
      {
        stock_product_id:
          stockProductId,
        quantity,
        unit: "g",
      },
    ],
  };
}

function consumptionPayload(
  reservationId,
  operationKey,
  menuItemId,
  quantity,
) {
  return {
    p_reservation_id:
      reservationId,
    p_operation_key:
      operationKey,
    p_items:
      quantity === 0
        ? []
        : [
            {
              menu_item_id:
                menuItemId,
              quantity,
            },
          ],
  };
}

async function getBalance(
  businessId,
  productId,
) {
  const {
    data,
    error,
  } =
    await userA
      .from("stock_movements")
      .select("quantity_delta")
      .eq(
        "business_id",
        businessId,
      )
      .eq(
        "product_id",
        productId,
      );

  if (error) {
    throw error;
  }

  return (
    data ?? []
  ).reduce(
    (
      total,
      row,
    ) =>
      total
      + Number(
        row.quantity_delta,
      ),
    0,
  );
}

const suffix =
  randomUUID();
const reservationDate =
  nextMonday();

let menuItemAId = null;
let menuItemBId = null;
let stockProductAId = null;
let recipeAId = null;
let reservationId = null;
let orderId = null;

console.log(
  "Ejecutando consumo persistente de Reserva en staging...",
);

try {
  await signIn(
    userA,
    context.userAEmail,
    context.userAPassword,
  );
  await signIn(
    userB,
    context.userBEmail,
    context.userBPassword,
  );
  console.log(
    "✓ usuarios A/B autenticados",
  );

  const {
    data: menuA,
    error: menuAError,
  } =
    await userA.rpc(
      "save_business_menu_item",
      {
        p_business_id:
          fixture.businessAId,
        p_menu_item_id:
          null,
        p_menu_item:
          menuPayload(
            `E31A Plato A ${suffix}`,
          ),
      },
    );

  if (menuAError) {
    throw menuAError;
  }

  menuItemAId =
    menuA.id;

  const {
    data: menuB,
    error: menuBError,
  } =
    await userB.rpc(
      "save_business_menu_item",
      {
        p_business_id:
          fixture.businessBId,
        p_menu_item_id:
          null,
        p_menu_item:
          menuPayload(
            `E31A Plato B ${suffix}`,
          ),
      },
    );

  if (menuBError) {
    throw menuBError;
  }

  menuItemBId =
    menuB.id;
  console.log(
    "✓ platos temporales A/B creados",
  );

  const {
    data: stockProduct,
    error: stockError,
  } =
    await userA.rpc(
      "save_business_stock_product",
      {
        p_business_id:
          fixture.businessAId,
        p_product_id:
          null,
        p_product:
          stockPayload(
            `E31A Insumo ${suffix}`,
          ),
      },
    );

  if (stockError) {
    throw stockError;
  }

  stockProductAId =
    stockProduct.id;

  const {
    error: openingError,
  } =
    await userA.rpc(
      "record_business_stock_movement",
      {
        p_business_id:
          fixture.businessAId,
        p_product_id:
          stockProductAId,
        p_movement: {
          movement_type:
            "opening",
          origin: "manual",
          quantity_delta: 10,
          operation_key: null,
          reference_id: null,
          label:
            "Apertura QA E31A",
          detail: "",
          unit_cost: null,
        },
      },
    );

  if (openingError) {
    throw openingError;
  }

  const {
    data: recipe,
    error: recipeError,
  } =
    await userA.rpc(
      "save_business_menu_recipe",
      {
        p_business_id:
          fixture.businessAId,
        p_menu_item_id:
          menuItemAId,
        ...recipePayload(
          stockProductAId,
          250,
        ),
      },
    );

  if (recipeError) {
    throw recipeError;
  }

  recipeAId =
    recipe.recipe.id;
  console.log(
    "✓ insumo inicia en 10 kg y receta usa 250 g",
  );

  const {
    data: reservation,
    error: reservationError,
  } =
    await userA.rpc(
      "save_business_reservation",
      {
        p_business_id:
          fixture.businessAId,
        p_reservation_id:
          null,
        p_reservation: {
          service_id:
            fixture.serviceAId,
          customer_id:
            fixture.customerAId,
          customer_name:
            "E31A Temporary Reservation",
          customer_phone:
            `5411${Date.now()
              .toString()
              .slice(-8)}`,
          customer_email:
            `e31a.${suffix}@example.com`,
          reservation_date:
            reservationDate,
          reservation_time:
            "10:00",
          party_size: 2,
          notes:
            "Temporal QA E31A",
          source: "manual",
          duration_minutes: 60,
        },
        p_idempotency_key:
          `e31a-res-${suffix}`,
      },
    );

  if (reservationError) {
    throw reservationError;
  }

  reservationId =
    reservation.id;

  const {
    error: confirmError,
  } =
    await userA.rpc(
      "set_business_reservation_status",
      {
        p_business_id:
          fixture.businessAId,
        p_reservation_id:
          reservationId,
        p_status:
          "confirmed",
      },
    );

  if (confirmError) {
    throw confirmError;
  }

  const {
    error: tableError,
  } =
    await userA.rpc(
      "set_business_reservation_tables",
      {
        p_business_id:
          fixture.businessAId,
        p_reservation_id:
          reservationId,
        p_table_ids: [
          fixture.floorTableAId,
        ],
      },
    );

  if (tableError) {
    throw tableError;
  }
  console.log(
    "✓ reserva temporal confirmada y con mesa asignada",
  );

  await expectFailure(
    anonymous.rpc(
      "save_business_reservation_consumption",
      {
        p_business_id:
          fixture.businessAId,
        ...consumptionPayload(
          reservationId,
          `anon-${suffix}`,
          menuItemAId,
          2,
        ),
      },
    ),
    "anon no debe guardar consumo",
  );
  console.log(
    "✓ anon no puede guardar consumo",
  );

  await expectFailure(
    userB.rpc(
      "save_business_reservation_consumption",
      {
        p_business_id:
          fixture.businessAId,
        ...consumptionPayload(
          reservationId,
          `bola-${suffix}`,
          menuItemAId,
          2,
        ),
      },
    ),
    "B no debe modificar A",
  );
  console.log(
    "✓ usuario B no puede modificar consumo de A",
  );

  await expectFailure(
    userA.rpc(
      "save_business_reservation_consumption",
      {
        p_business_id:
          fixture.businessAId,
        ...consumptionPayload(
          reservationId,
          `cross-${suffix}`,
          menuItemBId,
          1,
        ),
      },
    ),
    "plato B no debe usarse en A",
  );
  console.log(
    "✓ plato cross-tenant es rechazado",
  );

  const firstKey =
    `e31a-first-${suffix}`;
  const firstPayload =
    consumptionPayload(
      reservationId,
      firstKey,
      menuItemAId,
      2,
    );

  const {
    data: first,
    error: firstError,
  } =
    await userA.rpc(
      "save_business_reservation_consumption",
      {
        p_business_id:
          fixture.businessAId,
        ...firstPayload,
      },
    );

  if (firstError) {
    throw firstError;
  }

  orderId =
    first.order.id;

  assert.equal(
    first.items.length,
    1,
  );
  assert.equal(
    Number(
      first.items[0].quantity,
    ),
    2,
  );
  assert.equal(
    Number(
      first.items[0]
        .unit_price_snapshot,
    ),
    1000,
  );
  assert.equal(
    Number(
      first.order.subtotal,
    ),
    2000,
  );
  assert.equal(
    await getBalance(
      fixture.businessAId,
      stockProductAId,
    ),
    9.5,
  );
  console.log(
    "✓ 2 platos crean pedido canónico y descuentan exactamente 0,5 kg",
  );

  const {
    data: reservationAfter,
    error: reservationAfterError,
  } =
    await userA
      .from("reservations")
      .select(
        "consumption_started_at",
      )
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "id",
        reservationId,
      )
      .single();

  if (reservationAfterError) {
    throw reservationAfterError;
  }

  assert.ok(
    reservationAfter
      .consumption_started_at,
  );
  console.log(
    "✓ la reserva conserva el inicio del consumo",
  );

  const {
    data: replay,
    error: replayError,
  } =
    await userA.rpc(
      "save_business_reservation_consumption",
      {
        p_business_id:
          fixture.businessAId,
        ...firstPayload,
      },
    );

  if (replayError) {
    throw replayError;
  }

  assert.equal(
    replay.order.id,
    orderId,
  );
  assert.equal(
    await getBalance(
      fixture.businessAId,
      stockProductAId,
    ),
    9.5,
  );
  console.log(
    "✓ reintento idempotente no duplica pedido ni Stock",
  );

  await expectFailure(
    userA.rpc(
      "save_business_reservation_consumption",
      {
        p_business_id:
          fixture.businessAId,
        ...consumptionPayload(
          reservationId,
          firstKey,
          menuItemAId,
          3,
        ),
      },
    ),
    "misma key con payload distinto debe fallar",
  );
  console.log(
    "✓ misma clave con payload diferente devuelve conflicto",
  );

  const {
    data: increased,
    error: increaseError,
  } =
    await userA.rpc(
      "save_business_reservation_consumption",
      {
        p_business_id:
          fixture.businessAId,
        ...consumptionPayload(
          reservationId,
          `e31a-inc-${suffix}`,
          menuItemAId,
          3,
        ),
      },
    );

  if (increaseError) {
    throw increaseError;
  }

  assert.equal(
    Number(
      increased.items[0].quantity,
    ),
    3,
  );
  assert.equal(
    await getBalance(
      fixture.businessAId,
      stockProductAId,
    ),
    9.25,
  );
  console.log(
    "✓ aumentar de 2 a 3 descuenta solo una unidad adicional",
  );

  await expectFailure(
    userA.rpc(
      "set_business_reservation_status",
      {
        p_business_id:
          fixture.businessAId,
        p_reservation_id:
          reservationId,
        p_status:
          "cancelled",
      },
    ),
    "consumo abierto debe bloquear estado terminal",
  );
  console.log(
    "✓ guard bloquea cancelación con consumo abierto",
  );

  const {
    data: recipeV2,
    error: recipeV2Error,
  } =
    await userA.rpc(
      "save_business_menu_recipe",
      {
        p_business_id:
          fixture.businessAId,
        p_menu_item_id:
          menuItemAId,
        ...recipePayload(
          stockProductAId,
          500,
        ),
      },
    );

  if (recipeV2Error) {
    throw recipeV2Error;
  }

  assert.equal(
    Number(
      recipeV2.recipe.revision,
    ),
    2,
  );

  const {
    data: reduced,
    error: reducedError,
  } =
    await userA.rpc(
      "save_business_reservation_consumption",
      {
        p_business_id:
          fixture.businessAId,
        ...consumptionPayload(
          reservationId,
          `e31a-reduce-${suffix}`,
          menuItemAId,
          1,
        ),
      },
    );

  if (reducedError) {
    throw reducedError;
  }

  assert.equal(
    Number(
      reduced.items[0].quantity,
    ),
    1,
  );
  assert.equal(
    await getBalance(
      fixture.businessAId,
      stockProductAId,
    ),
    9.75,
  );
  console.log(
    "✓ reducir devuelve el ledger histórico aunque la receta cambió",
  );

  const {
    data: increasedV2,
    error: increasedV2Error,
  } =
    await userA.rpc(
      "save_business_reservation_consumption",
      {
        p_business_id:
          fixture.businessAId,
        ...consumptionPayload(
          reservationId,
          `e31a-v2-${suffix}`,
          menuItemAId,
          2,
        ),
      },
    );

  if (increasedV2Error) {
    throw increasedV2Error;
  }

  assert.equal(
    Number(
      increasedV2.items[0].quantity,
    ),
    2,
  );
  assert.equal(
    await getBalance(
      fixture.businessAId,
      stockProductAId,
    ),
    9.25,
  );

  const {
    data: revision2Operations,
    error: revision2OperationsError,
  } =
    await admin
      .from("stock_recipe_operations")
      .select(
        "id, recipe_revision, sold_quantity",
      )
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "origin",
        "reservation",
      )
      .eq(
        "reference_id",
        reservationId,
      )
      .eq(
        "recipe_revision",
        2,
      );

  if (revision2OperationsError) {
    throw revision2OperationsError;
  }

  assert.equal(
    revision2Operations.length,
    1,
  );
  console.log(
    "✓ nuevos aumentos usan la revisión vigente sin alterar el historial",
  );

  const insufficientKey =
    `e31a-insufficient-${suffix}`;

  await expectFailure(
    userA.rpc(
      "save_business_reservation_consumption",
      {
        p_business_id:
          fixture.businessAId,
        ...consumptionPayload(
          reservationId,
          insufficientKey,
          menuItemAId,
          1000,
        ),
      },
    ),
    "Stock insuficiente debe fallar",
  );

  assert.equal(
    await getBalance(
      fixture.businessAId,
      stockProductAId,
    ),
    9.25,
  );

  const {
    data: currentItems,
    error: currentItemsError,
  } =
    await userA
      .from("business_order_items")
      .select("quantity")
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "order_id",
        orderId,
      );

  if (currentItemsError) {
    throw currentItemsError;
  }

  assert.equal(
    Number(
      currentItems[0].quantity,
    ),
    2,
  );

  const {
    data: failedMutation,
    error: failedMutationError,
  } =
    await admin
      .from("business_order_mutations")
      .select("id")
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "operation_key",
        insufficientKey,
      );

  if (failedMutationError) {
    throw failedMutationError;
  }

  assert.deepEqual(
    failedMutation,
    [],
  );
  console.log(
    "✓ falta de Stock revierte pedido, movimientos y mutación",
  );

  await expectFailure(
    userA
      .from("business_orders")
      .update({
        subtotal: 1,
      })
      .eq("id", orderId),
    "DML directo order debe fallar",
  );

  await expectFailure(
    userA
      .from("business_order_items")
      .delete()
      .eq("order_id", orderId),
    "DML directo items debe fallar",
  );

  await expectFailure(
    userA
      .from(
        "stock_recipe_return_operations",
      )
      .select("id"),
    "tablas técnicas no deben ser legibles",
  );
  console.log(
    "✓ DML directo y lectura técnica permanecen bloqueados",
  );

  const {
    data: ownOrder,
    error: ownOrderError,
  } =
    await userA
      .from("business_orders")
      .select("id")
      .eq("id", orderId);

  if (ownOrderError) {
    throw ownOrderError;
  }

  const {
    data: foreignOrder,
    error: foreignOrderError,
  } =
    await userB
      .from("business_orders")
      .select("id")
      .eq("id", orderId);

  if (foreignOrderError) {
    throw foreignOrderError;
  }

  assert.equal(
    ownOrder.length,
    1,
  );
  assert.deepEqual(
    foreignOrder,
    [],
  );
  console.log(
    "✓ RLS muestra el pedido a A y lo oculta frente a B",
  );

  const {
    data: cleared,
    error: clearError,
  } =
    await userA.rpc(
      "save_business_reservation_consumption",
      {
        p_business_id:
          fixture.businessAId,
        ...consumptionPayload(
          reservationId,
          `e31a-clear-${suffix}`,
          menuItemAId,
          0,
        ),
      },
    );

  if (clearError) {
    throw clearError;
  }

  assert.deepEqual(
    cleared.items,
    [],
  );
  assert.equal(
    Number(
      cleared.order.subtotal,
    ),
    0,
  );
  assert.equal(
    await getBalance(
      fixture.businessAId,
      stockProductAId,
    ),
    10,
  );
  console.log(
    "✓ vaciar devuelve exactamente todo el Stock histórico",
  );

  const {
    error: cancelError,
  } =
    await userA.rpc(
      "set_business_reservation_status",
      {
        p_business_id:
          fixture.businessAId,
        p_reservation_id:
          reservationId,
        p_status:
          "cancelled",
      },
    );

  if (cancelError) {
    throw cancelError;
  }
  console.log(
    "✓ tras resolver consumo la reserva puede terminar",
  );

  console.log(
    "Consumo persistente de Reserva aprobado en staging (20 controles).",
  );
} finally {
  if (reservationId) {
    const {
      data: sourceOperations,
    } =
      await admin
        .from("stock_recipe_operations")
        .select("id")
        .eq(
          "business_id",
          fixture.businessAId,
        )
        .eq(
          "origin",
          "reservation",
        )
        .eq(
          "reference_id",
          reservationId,
        );

    const sourceIds =
      (
        sourceOperations
        ?? []
      ).map(
        (row) =>
          row.id,
      );

    const {
      data: returnOperations,
    } =
      sourceIds.length
        ? await admin
            .from(
              "stock_recipe_return_operations",
            )
            .select("id")
            .eq(
              "business_id",
              fixture.businessAId,
            )
            .in(
              "original_operation_id",
              sourceIds,
            )
        : {
            data: [],
          };

    const returnIds =
      (
        returnOperations
        ?? []
      ).map(
        (row) =>
          row.id,
      );

    if (returnIds.length) {
      await admin
        .from(
          "stock_recipe_return_operation_movements",
        )
        .delete()
        .eq(
          "business_id",
          fixture.businessAId,
        )
        .in(
          "return_operation_id",
          returnIds,
        );

      await admin
        .from(
          "stock_recipe_return_operations",
        )
        .delete()
        .eq(
          "business_id",
          fixture.businessAId,
        )
        .in(
          "id",
          returnIds,
        );
    }

    if (orderId) {
      for (const table of [
        "business_order_mutations",
        "business_order_stock_operations",
        "business_order_items",
      ]) {
        await admin
          .from(table)
          .delete()
          .eq(
            "business_id",
            fixture.businessAId,
          )
          .eq(
            "order_id",
            orderId,
          );
      }

      await admin
        .from("business_orders")
        .delete()
        .eq(
          "business_id",
          fixture.businessAId,
        )
        .eq("id", orderId);
    }

    if (sourceIds.length) {
      await admin
        .from(
          "stock_recipe_operation_movements",
        )
        .delete()
        .eq(
          "business_id",
          fixture.businessAId,
        )
        .in(
          "operation_id",
          sourceIds,
        );

      await admin
        .from("stock_recipe_operations")
        .delete()
        .eq(
          "business_id",
          fixture.businessAId,
        )
        .in("id", sourceIds);
    }

    await admin
      .from(
        "reservation_table_assignments",
      )
      .delete()
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "reservation_id",
        reservationId,
      );

    await admin
      .from("reservations")
      .delete()
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq("id", reservationId);
  }

  if (recipeAId) {
    await admin
      .from("menu_recipe_ingredients")
      .delete()
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "recipe_id",
        recipeAId,
      );

    await admin
      .from("menu_recipes")
      .delete()
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq("id", recipeAId);
  }

  if (stockProductAId) {
    await admin
      .from("stock_movements")
      .delete()
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "product_id",
        stockProductAId,
      );
  }

  if (menuItemAId) {
    await admin
      .from("menu_items")
      .delete()
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq("id", menuItemAId);
  }

  if (menuItemBId) {
    await admin
      .from("menu_items")
      .delete()
      .eq(
        "business_id",
        fixture.businessBId,
      )
      .eq("id", menuItemBId);
  }

  if (stockProductAId) {
    await admin
      .from("stock_products")
      .delete()
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq("id", stockProductAId);
  }

  await Promise.allSettled([
    userA.auth.signOut(),
    userB.auth.signOut(),
  ]);

  console.log(
    "✓ datos temporales y sesiones E31A fueron limpiados",
  );
}
