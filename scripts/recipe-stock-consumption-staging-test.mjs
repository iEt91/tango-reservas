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
  const {
    error,
  } =
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
  const {
    error,
  } = await promise;

  assert.ok(
    error,
    label,
  );

  return error;
}

function menuPayload(name) {
  return {
    category_id: null,
    name,
    description: "Temporal QA E30C",
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
    category: "QA E30C",
    supplier: "",
    unit: "kg",
    unit_cost: 1000,
    alert_below: 0,
    note: "Temporal QA E30C",
    is_active: true,
  };
}

function recipePayload(
  stockProductId,
  quantity,
) {
  return {
    p_recipe: {
      name: "Receta QA E30C",
      preparation_time_seconds: 600,
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

function consumePayload({
  menuItemId,
  quantity,
  operationKey,
  referenceId,
} = {}) {
  return {
    p_menu_item_id:
      menuItemId,
    p_quantity:
      quantity,
    p_operation_key:
      operationKey,
    p_reference_id:
      referenceId,
    p_label:
      "Consumo QA E30C",
    p_detail:
      "Prueba temporal del motor Receta → Stock",
  };
}

async function getProductBalance(
  target,
  businessId,
  productId,
) {
  const {
    data,
    error,
  } =
    await target
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
      movement,
    ) =>
      total
      + Number(
        movement.quantity_delta,
      ),
    0,
  );
}

const suffix =
  randomUUID();

const menuNameA =
  `E30C Plato A ${suffix}`;
const menuNameB =
  `E30C Plato B ${suffix}`;
const stockNameA =
  `E30C Insumo A ${suffix}`;

let menuItemAId = null;
let menuItemBId = null;
let stockProductAId = null;
let recipeAId = null;
const operationIds = [];

console.log(
  "Ejecutando motor Receta → Stock en staging...",
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
            menuNameA,
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
            menuNameB,
          ),
      },
    );

  if (menuBError) {
    throw menuBError;
  }

  menuItemBId =
    menuB.id;
  console.log(
    "✓ se crearon platos temporales A/B",
  );

  const {
    data: stockA,
    error: stockAError,
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
            stockNameA,
          ),
      },
    );

  if (stockAError) {
    throw stockAError;
  }

  stockProductAId =
    stockA.id;

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
          origin:
            "manual",
          quantity_delta:
            10,
          operation_key:
            null,
          reference_id:
            null,
          label:
            "Apertura QA E30C",
          detail:
            "",
          unit_cost:
            null,
        },
      },
    );

  if (openingError) {
    throw openingError;
  }
  console.log(
    "✓ insumo A inició con 10 kg",
  );

  const {
    data: recipeA,
    error: recipeAError,
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

  if (recipeAError) {
    throw recipeAError;
  }

  recipeAId =
    recipeA.recipe.id;
  assert.equal(
    Number(
      recipeA.recipe.revision,
    ),
    1,
  );
  console.log(
    "✓ receta A usa 250 g por plato",
  );

  await expectFailure(
    anonymous.rpc(
      "consume_business_menu_recipe_stock",
      {
        p_business_id:
          fixture.businessAId,
        ...consumePayload({
          menuItemId:
            menuItemAId,
          quantity:
            2,
          operationKey:
            `anon-${suffix}`,
          referenceId:
            `anon-${suffix}`,
        }),
      },
    ),
    "anon no debe consumir Stock por receta",
  );
  console.log(
    "✓ anon no puede ejecutar el motor",
  );

  const operationKey1 =
    `e30c-main-${suffix}`;

  const {
    data: consumed,
    error: consumeError,
  } =
    await userA.rpc(
      "consume_business_menu_recipe_stock",
      {
        p_business_id:
          fixture.businessAId,
        ...consumePayload({
          menuItemId:
            menuItemAId,
          quantity:
            2,
          operationKey:
            operationKey1,
          referenceId:
            `qa-${suffix}`,
        }),
      },
    );

  if (consumeError) {
    throw consumeError;
  }

  operationIds.push(
    consumed.operation.id,
  );

  assert.equal(
    consumed.operation.business_id,
    fixture.businessAId,
  );
  assert.equal(
    consumed.operation.menu_item_id,
    menuItemAId,
  );
  assert.equal(
    consumed.operation.recipe_id,
    recipeAId,
  );
  assert.equal(
    Number(
      consumed.operation.recipe_revision,
    ),
    1,
  );
  assert.equal(
    consumed.operation.origin,
    "recipe",
  );
  assert.equal(
    Number(
      consumed.operation.sold_quantity,
    ),
    2,
  );
  assert.equal(
    consumed.movements.length,
    1,
  );
  assert.equal(
    Number(
      consumed.movements[0].quantity_delta,
    ),
    -0.5,
  );
  assert.equal(
    consumed.movements[0].origin,
    "recipe",
  );
  console.log(
    "✓ 2 platos × 250 g descuentan exactamente 0,5 kg",
  );

  const balanceAfterFirst =
    await getProductBalance(
      userA,
      fixture.businessAId,
      stockProductAId,
    );

  assert.equal(
    balanceAfterFirst,
    9.5,
  );
  console.log(
    "✓ saldo queda en 9,5 kg",
  );

  const {
    data: replay,
    error: replayError,
  } =
    await userA.rpc(
      "consume_business_menu_recipe_stock",
      {
        p_business_id:
          fixture.businessAId,
        ...consumePayload({
          menuItemId:
            menuItemAId,
          quantity:
            2,
          operationKey:
            operationKey1,
          referenceId:
            `qa-${suffix}`,
        }),
      },
    );

  if (replayError) {
    throw replayError;
  }

  assert.equal(
    replay.operation.id,
    consumed.operation.id,
  );
  assert.equal(
    replay.movements[0].id,
    consumed.movements[0].id,
  );

  assert.equal(
    await getProductBalance(
      userA,
      fixture.businessAId,
      stockProductAId,
    ),
    9.5,
  );
  console.log(
    "✓ reintento idempotente no duplica movimientos",
  );

  await expectFailure(
    userA.rpc(
      "consume_business_menu_recipe_stock",
      {
        p_business_id:
          fixture.businessAId,
        ...consumePayload({
          menuItemId:
            menuItemAId,
          quantity:
            3,
          operationKey:
            operationKey1,
          referenceId:
            `qa-${suffix}`,
        }),
      },
    ),
    "misma operation key con datos distintos debe fallar",
  );
  console.log(
    "✓ misma clave con payload diferente devuelve conflicto",
  );

  await expectFailure(
    userB.rpc(
      "consume_business_menu_recipe_stock",
      {
        p_business_id:
          fixture.businessAId,
        ...consumePayload({
          menuItemId:
            menuItemAId,
          quantity:
            1,
          operationKey:
            `bola-user-${suffix}`,
          referenceId:
            `bola-user-${suffix}`,
        }),
      },
    ),
    "usuario B no debe operar Stock de A",
  );
  console.log(
    "✓ usuario B no puede consumir Stock de A",
  );

  await expectFailure(
    userA.rpc(
      "consume_business_menu_recipe_stock",
      {
        p_business_id:
          fixture.businessAId,
        ...consumePayload({
          menuItemId:
            menuItemBId,
          quantity:
            1,
          operationKey:
            `bola-item-${suffix}`,
          referenceId:
            `bola-item-${suffix}`,
        }),
      },
    ),
    "plato B no debe usarse dentro de A",
  );
  console.log(
    "✓ plato cross-tenant es rechazado",
  );

  const insufficientKey =
    `insufficient-${suffix}`;

  await expectFailure(
    userA.rpc(
      "consume_business_menu_recipe_stock",
      {
        p_business_id:
          fixture.businessAId,
        ...consumePayload({
          menuItemId:
            menuItemAId,
          quantity:
            1000,
          operationKey:
            insufficientKey,
          referenceId:
            `insufficient-${suffix}`,
        }),
      },
    ),
    "consumo sin saldo suficiente debe fallar",
  );

  assert.equal(
    await getProductBalance(
      userA,
      fixture.businessAId,
      stockProductAId,
    ),
    9.5,
  );

  const {
    data: failedOperation,
    error: failedOperationError,
  } =
    await admin
      .from(
        "stock_recipe_operations",
      )
      .select("id")
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "operation_key",
        insufficientKey,
      );

  if (failedOperationError) {
    throw failedOperationError;
  }

  assert.deepEqual(
    failedOperation,
    [],
  );
  console.log(
    "✓ falta de saldo revierte la operación completa",
  );

  await expectFailure(
    userA
      .from(
        "stock_recipe_operations",
      )
      .insert({
        business_id:
          fixture.businessAId,
        operation_key:
          `direct-${suffix}`,
        menu_item_id:
          menuItemAId,
        recipe_id:
          recipeAId,
        recipe_revision:
          1,
        origin:
          "recipe",
        reference_id:
          `direct-${suffix}`,
        sold_quantity:
          1,
        label:
          "DML directo",
        detail:
          "",
      }),
    "DML directo de cabecera debe fallar",
  );

  await expectFailure(
    userA
      .from(
        "stock_recipe_operation_movements",
      )
      .insert({
        business_id:
          fixture.businessAId,
        operation_id:
          consumed.operation.id,
        stock_movement_id:
          consumed.movements[0].id,
      }),
    "DML directo de vínculo debe fallar",
  );
  console.log(
    "✓ DML directo de operación y vínculo permanece bloqueado",
  );

  const {
    data: ownOperations,
    error: ownOperationsError,
  } =
    await userA
      .from(
        "stock_recipe_operations",
      )
      .select(
        "id, business_id, operation_key",
      )
      .eq(
        "id",
        consumed.operation.id,
      );

  if (ownOperationsError) {
    throw ownOperationsError;
  }

  const {
    data: foreignOperations,
    error: foreignOperationsError,
  } =
    await userB
      .from(
        "stock_recipe_operations",
      )
      .select("id")
      .eq(
        "id",
        consumed.operation.id,
      );

  if (foreignOperationsError) {
    throw foreignOperationsError;
  }

  assert.equal(
    ownOperations.length,
    1,
  );
  assert.deepEqual(
    foreignOperations,
    [],
  );
  console.log(
    "✓ RLS muestra operación propia y oculta A frente a B",
  );

  const {
    data: recipeUpdated,
    error: recipeUpdatedError,
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

  if (recipeUpdatedError) {
    throw recipeUpdatedError;
  }

  assert.equal(
    Number(
      recipeUpdated.recipe.revision,
    ),
    2,
  );

  const {
    data: consumedRevision2,
    error: consumeRevision2Error,
  } =
    await userA.rpc(
      "consume_business_menu_recipe_stock",
      {
        p_business_id:
          fixture.businessAId,
        ...consumePayload({
          menuItemId:
            menuItemAId,
          quantity:
            1,
          operationKey:
            `revision-2-${suffix}`,
          referenceId:
            `revision-2-${suffix}`,
        }),
      },
    );

  if (consumeRevision2Error) {
    throw consumeRevision2Error;
  }

  operationIds.push(
    consumedRevision2.operation.id,
  );

  assert.equal(
    Number(
      consumedRevision2.operation.recipe_revision,
    ),
    2,
  );
  assert.equal(
    Number(
      consumedRevision2.movements[0].quantity_delta,
    ),
    -0.5,
  );
  assert.equal(
    await getProductBalance(
      userA,
      fixture.businessAId,
      stockProductAId,
    ),
    9,
  );
  console.log(
    "✓ una edición posterior usa revision 2 sin alterar el snapshot anterior",
  );

  const {
    data: links,
    error: linksError,
  } =
    await userA
      .from(
        "stock_recipe_operation_movements",
      )
      .select(
        "operation_id, stock_movement_id",
      )
      .in(
        "operation_id",
        operationIds,
      );

  if (linksError) {
    throw linksError;
  }

  assert.equal(
    links.length,
    2,
  );
  console.log(
    "✓ cada operación queda enlazada con su movimiento real del ledger",
  );

  console.log(
    "Motor Receta → Stock aprobado en staging (16 controles).",
  );
} finally {
  if (
    operationIds.length > 0
  ) {
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
        operationIds,
      );

    await admin
      .from(
        "stock_recipe_operations",
      )
      .delete()
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .in(
        "id",
        operationIds,
      );
  }

  if (recipeAId) {
    await admin
      .from(
        "menu_recipe_ingredients",
      )
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
      .from(
        "menu_recipes",
      )
      .delete()
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "id",
        recipeAId,
      );
  }

  if (stockProductAId) {
    await admin
      .from(
        "stock_movements",
      )
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
      .eq(
        "id",
        menuItemAId,
      );
  }

  if (menuItemBId) {
    await admin
      .from("menu_items")
      .delete()
      .eq(
        "business_id",
        fixture.businessBId,
      )
      .eq(
        "id",
        menuItemBId,
      );
  }

  if (stockProductAId) {
    await admin
      .from(
        "stock_products",
      )
      .delete()
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "id",
        stockProductAId,
      );
  }

  await Promise.allSettled([
    userA.auth.signOut(),
    userB.auth.signOut(),
  ]);

  console.log(
    "✓ datos temporales y sesiones E30C fueron limpiados",
  );
}
