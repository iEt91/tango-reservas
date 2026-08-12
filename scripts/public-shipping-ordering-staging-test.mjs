import assert from "node:assert/strict";
import {
  createHash,
  randomUUID,
} from "node:crypto";
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

for (
  const key
  of [
    "businessAId",
    "businessBId",
  ]
) {
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

async function signIn(
  target,
  email,
  password,
) {
  const {
    error,
  } =
    await target.auth
      .signInWithPassword({
        email,
        password,
      });

  if (error) {
    throw error;
  }
}

const admin =
  client(
    context.serverSecret,
  );
const userA =
  client();
const anonymous =
  client();

if (
  typeof context.userAEmail
    !== "string"
  || typeof context.userAPassword
    !== "string"
) {
  throw new Error(
    "Faltan credenciales A de staging.",
  );
}

await signIn(
  userA,
  context.userAEmail,
  context.userAPassword,
);

const businessA =
  fixture.businessAId;
const businessB =
  fixture.businessBId;
const suffix =
  randomUUID()
    .replaceAll("-", "")
    .slice(0, 12);
const requestFingerprint =
  createHash("sha256")
    .update(
      `e34c:${suffix}`,
    )
    .digest("hex");
const rateFingerprint =
  createHash("sha256")
    .update(
      `e34c-rate:${suffix}`,
    )
    .digest("hex");
const shippingIds = [];
const orderIds = [];
const seedMovementIds = [];
let categoryId = null;
let menuItemId = null;
let recipeId = null;
let businessAOriginal = null;
let businessBOriginal = null;

async function cleanup() {
  if (orderIds.length > 0) {
    await admin
      .from(
        "business_orders",
      )
      .update({
        kitchen_status:
          "pending",
      })
      .eq(
        "business_id",
        businessA,
      )
      .in(
        "id",
        orderIds,
      );
  }

  const {
    data: stockLinks,
  } =
    orderIds.length > 0
      ? await admin
          .from(
            "business_order_stock_operations",
          )
          .select(
            "stock_recipe_operation_id",
          )
          .eq(
            "business_id",
            businessA,
          )
          .in(
            "order_id",
            orderIds,
          )
      : {
          data: [],
        };

  const stockOperationIds = [
    ...new Set(
      (
        stockLinks
        ?? []
      )
        .map(
          (row) =>
            row.stock_recipe_operation_id,
        )
        .filter(Boolean),
    ),
  ];

  const {
    data: stockMovementLinks,
  } =
    stockOperationIds.length > 0
      ? await admin
          .from(
            "stock_recipe_operation_movements",
          )
          .select(
            "stock_movement_id",
          )
          .eq(
            "business_id",
            businessA,
          )
          .in(
            "operation_id",
            stockOperationIds,
          )
      : {
          data: [],
        };

  const stockMovementIds = [
    ...new Set([
      ...seedMovementIds,
      ...(
        stockMovementLinks
        ?? []
      )
        .map(
          (row) =>
            row.stock_movement_id,
        )
        .filter(Boolean),
    ]),
  ];

  if (orderIds.length > 0) {
    await admin
      .from(
        "business_kitchen_operations",
      )
      .delete()
      .eq(
        "business_id",
        businessA,
      )
      .in(
        "order_id",
        orderIds,
      );

    await admin
      .from(
        "business_kitchen_ticket_items",
      )
      .delete()
      .eq(
        "business_id",
        businessA,
      )
      .in(
        "order_id",
        orderIds,
      );

    await admin
      .from(
        "business_kitchen_tickets",
      )
      .delete()
      .eq(
        "business_id",
        businessA,
      )
      .in(
        "order_id",
        orderIds,
      );

    await admin
      .from(
        "business_order_stock_operations",
      )
      .delete()
      .eq(
        "business_id",
        businessA,
      )
      .in(
        "order_id",
        orderIds,
      );
  }

  if (stockOperationIds.length > 0) {
    await admin
      .from(
        "stock_recipe_operation_movements",
      )
      .delete()
      .eq(
        "business_id",
        businessA,
      )
      .in(
        "operation_id",
        stockOperationIds,
      );

    await admin
      .from(
        "stock_recipe_operations",
      )
      .delete()
      .eq(
        "business_id",
        businessA,
      )
      .in(
        "id",
        stockOperationIds,
      );
  }

  if (stockMovementIds.length > 0) {
    await admin
      .from(
        "stock_movements",
      )
      .delete()
      .eq(
        "business_id",
        businessA,
      )
      .in(
        "id",
        stockMovementIds,
      );
  }

  if (shippingIds.length > 0) {
    await admin
      .from(
        "business_shipping_operations",
      )
      .delete()
      .eq(
        "business_id",
        businessA,
      )
      .in(
        "shipping_id",
        shippingIds,
      );

    await admin
      .from(
        "business_shipping_orders",
      )
      .delete()
      .eq(
        "business_id",
        businessA,
      )
      .in(
        "id",
        shippingIds,
      );
  }

  if (orderIds.length > 0) {
    await admin
      .from(
        "business_order_items",
      )
      .delete()
      .eq(
        "business_id",
        businessA,
      )
      .in(
        "order_id",
        orderIds,
      );

    await admin
      .from(
        "business_orders",
      )
      .delete()
      .eq(
        "business_id",
        businessA,
      )
      .in(
        "id",
        orderIds,
      );
  }

  await admin
    .from(
      "business_public_request_limits",
    )
    .delete()
    .eq(
      "business_id",
      businessA,
    )
    .in(
      "scope_hash",
      [
        requestFingerprint,
        rateFingerprint,
      ],
    );

  if (recipeId) {
    await admin
      .from(
        "menu_recipe_ingredients",
      )
      .delete()
      .eq(
        "business_id",
        businessA,
      )
      .eq(
        "recipe_id",
        recipeId,
      );

    await admin
      .from(
        "menu_recipes",
      )
      .delete()
      .eq(
        "business_id",
        businessA,
      )
      .eq(
        "id",
        recipeId,
      );
  }

  if (menuItemId) {
    await admin
      .from(
        "menu_items",
      )
      .delete()
      .eq(
        "business_id",
        businessA,
      )
      .eq(
        "id",
        menuItemId,
      );
  }

  if (categoryId) {
    await admin
      .from(
        "menu_categories",
      )
      .delete()
      .eq(
        "business_id",
        businessA,
      )
      .eq(
        "id",
        categoryId,
      );
  }

  if (businessAOriginal) {
    await admin
      .from("businesses")
      .update({
        status:
          businessAOriginal.status,
      })
      .eq(
        "id",
        businessA,
      );
  }

  if (businessBOriginal) {
    await admin
      .from("businesses")
      .update({
        status:
          businessBOriginal.status,
      })
      .eq(
        "id",
        businessB,
      );
  }
}

try {
  const {
    data: businesses,
    error: businessReadError,
  } =
    await admin
      .from("businesses")
      .select(
        "id, slug, status",
      )
      .in(
        "id",
        [
          businessA,
          businessB,
        ],
      );

  if (businessReadError) {
    throw businessReadError;
  }

  businessAOriginal =
    businesses?.find(
      (row) =>
        row.id
        === businessA,
    )
    ?? null;
  businessBOriginal =
    businesses?.find(
      (row) =>
        row.id
        === businessB,
    )
    ?? null;

  assert.ok(
    businessAOriginal?.slug,
    "Falta slug negocio A.",
  );
  assert.ok(
    businessBOriginal?.slug,
    "Falta slug negocio B.",
  );

  {
    const {
      error,
    } =
      await admin
        .from("businesses")
        .update({
          status:
            "active",
        })
        .in(
          "id",
          [
            businessA,
            businessB,
          ],
        );

    if (error) {
      throw error;
    }
  }

  {
    const {
      data,
      error,
    } =
      await admin
        .from(
          "menu_categories",
        )
        .insert({
          business_id:
            businessA,
          name:
            `E34C ${suffix}`,
          description:
            "Fixture E34C",
          sort_order:
            99001,
          is_visible:
            true,
          is_active:
            true,
          is_promotion:
            false,
        })
        .select("id")
        .single();

    if (error) {
      throw error;
    }

    categoryId =
      data.id;
  }

  {
    const {
      data,
      error,
    } =
      await admin
        .from(
          "menu_items",
        )
        .insert({
          business_id:
            businessA,
          category_id:
            categoryId,
          name:
            `Producto E34C ${suffix}`,
          description:
            "Producto público E34C",
          price:
            12345,
          status:
            "available",
          is_visible:
            true,
          is_featured:
            false,
          sort_order:
            99001,
        })
        .select("id")
        .single();

    if (error) {
      throw error;
    }

    menuItemId =
      data.id;
  }

  const {
    data: sourceRecipes,
    error: sourceRecipesError,
  } =
    await admin
      .from(
        "menu_recipes",
      )
      .select(
        "id, menu_item_id",
      )
      .eq(
        "business_id",
        businessA,
      )
      .limit(50);

  if (
    sourceRecipesError
    || !sourceRecipes?.length
  ) {
    throw new Error(
      "El fixture E34C necesita al menos una receta persistente fuente.",
    );
  }

  let sourceIngredients = [];

  for (
    const sourceRecipe
    of sourceRecipes
  ) {
    const {
      data: sourceMenuItem,
      error: sourceMenuItemError,
    } =
      await admin
        .from(
          "menu_items",
        )
        .select(
          "id, status, archived_at",
        )
        .eq(
          "business_id",
          businessA,
        )
        .eq(
          "id",
          sourceRecipe.menu_item_id,
        )
        .maybeSingle();

    if (sourceMenuItemError) {
      throw sourceMenuItemError;
    }

    if (
      !sourceMenuItem
      || sourceMenuItem.status
        !== "available"
      || sourceMenuItem.archived_at
    ) {
      continue;
    }

    const {
      data: candidateIngredients,
      error: candidateIngredientsError,
    } =
      await admin
        .from(
          "menu_recipe_ingredients",
        )
        .select(
          "stock_product_id, quantity, unit",
        )
        .eq(
          "business_id",
          businessA,
        )
        .eq(
          "recipe_id",
          sourceRecipe.id,
        );

    if (candidateIngredientsError) {
      throw candidateIngredientsError;
    }

    if (
      candidateIngredients?.length
    ) {
      sourceIngredients =
        candidateIngredients;
      break;
    }
  }

  if (
    sourceIngredients.length
    < 1
  ) {
    throw new Error(
      "El fixture E34C necesita una receta fuente con ingredientes.",
    );
  }

  const {
    data: savedRecipe,
    error: savedRecipeError,
  } =
    await userA.rpc(
      "save_business_menu_recipe",
      {
        p_business_id:
          businessA,
        p_menu_item_id:
          menuItemId,
        p_recipe: {
          name:
            `Receta E34C ${suffix}`,
          preparation_time_seconds:
            900,
        },
        p_ingredients:
          sourceIngredients.map(
            (
              ingredient,
            ) => ({
              stock_product_id:
                ingredient.stock_product_id,
              quantity:
                Number(
                  ingredient.quantity,
                ),
              unit:
                ingredient.unit,
            }),
          ),
      },
    );

  if (savedRecipeError) {
    throw savedRecipeError;
  }

  recipeId =
    savedRecipe.recipe.id;

  for (
    const ingredient
    of sourceIngredients
  ) {
    const {
      data: movement,
      error: movementError,
    } =
      await userA.rpc(
        "record_business_stock_movement",
        {
          p_business_id:
            businessA,
          p_product_id:
            ingredient.stock_product_id,
          p_movement: {
            movement_type:
              "replenishment",
            origin:
              "manual",
            quantity_delta:
              1000000,
            operation_key:
              `e34c-seed-${suffix}-${ingredient.stock_product_id}`,
            reference_id:
              `e34c-${suffix}`,
            label:
              "E34C staging stock",
            detail:
              "temporary public shipping QA stock",
          },
        },
      );

    if (movementError) {
      throw movementError;
    }

    seedMovementIds.push(
      movement.id,
    );
  }

  console.log(
    "✓ fixture público usa receta persistente y Stock temporal",
  );

  const {
    data: ordering,
    error: orderingError,
  } =
    await admin.rpc(
      "service_get_public_business_ordering_snapshot",
      {
        p_slug:
          businessAOriginal.slug,
      },
    );

  if (orderingError) {
    throw orderingError;
  }

  assert.equal(
    ordering.items.some(
      (item) =>
        item.id
        === menuItemId,
    ),
    true,
  );
  console.log(
    "✓ snapshot público resuelve slug y Menú canónico",
  );

  const {
    data: draftHidden,
    error: draftError,
  } =
    await admin.rpc(
      "service_get_public_business_ordering_snapshot",
      {
        p_slug:
          `missing-${suffix}`,
      },
    );

  assert.equal(
    draftError,
    null,
  );
  assert.equal(
    draftHidden,
    null,
  );
  console.log(
    "✓ slug inexistente no filtra datos",
  );

  const anonOrdering =
    await anonymous.rpc(
      "service_get_public_business_ordering_snapshot",
      {
        p_slug:
          businessAOriginal.slug,
      },
    );

  assert.ok(
    anonOrdering.error,
    "anon no debe ejecutar service_get_public_business_ordering_snapshot",
  );
  console.log(
    "✓ anon no ejecuta RPC service-only",
  );

  const anonTable =
    await anonymous
      .from(
        "business_shipping_orders",
      )
      .select("id")
      .limit(1);

  assert.ok(
    anonTable.error,
    "anon no debe leer tabla Shipping",
  );
  console.log(
    "✓ anon sigue sin SELECT técnico",
  );

  const requestKey =
    `web:${randomUUID()}`;
  const createPayload = {
    p_slug:
      businessAOriginal.slug,
    p_client_name:
      "Cliente E34C",
    p_client_phone:
      "2216145679",
    p_order_kind:
      "delivery",
    p_address:
      "Calle E34C 123",
    p_note:
      "Nota privada E34C",
    p_preferred_payment_method:
      "cash",
    p_items: [
      {
        menuItemId,
        quantity: 2,
      },
    ],
    p_request_key:
      requestKey,
    p_fingerprint:
      requestFingerprint,
  };

  const firstCreate =
    await admin.rpc(
      "service_create_public_shipping_order",
      createPayload,
    );

  if (firstCreate.error) {
    throw firstCreate.error;
  }

  assert.match(
    firstCreate.data.trackingId,
    /^PED-[A-Z0-9]{10,32}$/u,
  );
  assert.equal(
    Number(
      firstCreate.data.total,
    ),
    24690,
  );
  assert.equal(
    firstCreate.data.needsAcceptance,
    true,
  );

  const retryCreate =
    await admin.rpc(
      "service_create_public_shipping_order",
      createPayload,
    );

  if (retryCreate.error) {
    throw retryCreate.error;
  }

  assert.equal(
    retryCreate.data.trackingId,
    firstCreate.data.trackingId,
  );
  console.log(
    "✓ creación pública usa precio canónico e idempotencia",
  );

  const {
    data: shipping,
    error: shippingReadError,
  } =
    await admin
      .from(
        "business_shipping_orders",
      )
      .select(
        "id, order_id, business_date, source, needs_acceptance, tracking_code",
      )
      .eq(
        "business_id",
        businessA,
      )
      .eq(
        "tracking_code",
        firstCreate.data.trackingId,
      )
      .single();

  if (shippingReadError) {
    throw shippingReadError;
  }

  shippingIds.push(
    shipping.id,
  );
  orderIds.push(
    shipping.order_id,
  );

  assert.equal(
    shipping.source,
    "web",
  );
  assert.equal(
    shipping.needs_acceptance,
    true,
  );

  const {
    data: stockLinksBefore,
    error: stockLinksBeforeError,
  } =
    await admin
      .from(
        "business_order_stock_operations",
      )
      .select("stock_recipe_operation_id")
      .eq(
        "business_id",
        businessA,
      )
      .eq(
        "order_id",
        shipping.order_id,
      );

  if (stockLinksBeforeError) {
    throw stockLinksBeforeError;
  }

  assert.equal(
    stockLinksBefore.length,
    0,
  );
  console.log(
    "✓ pedido web pendiente no reserva Stock",
  );

  const internalSnapshot =
    await userA.rpc(
      "get_business_shipping_snapshot",
      {
        p_business_id:
          businessA,
        p_start_date:
          shipping.business_date,
        p_end_date:
          shipping.business_date,
      },
    );

  if (internalSnapshot.error) {
    throw internalSnapshot.error;
  }

  assert.equal(
    internalSnapshot.data.deliveries.some(
      (delivery) =>
        delivery.id
        === shipping.id
        && delivery.needsAcceptance
          === true,
    ),
    true,
  );

  const dateForKitchen =
    shipping.business_date;

  const kitchenBefore =
    await userA.rpc(
      "get_business_shipping_kitchen_snapshot",
      {
        p_business_id:
          businessA,
        p_business_date:
          dateForKitchen,
      },
    );

  if (kitchenBefore.error) {
    throw kitchenBefore.error;
  }

  assert.equal(
    kitchenBefore.data.commands.some(
      (command) =>
        command.shippingId
        === shipping.id,
    ),
    false,
  );
  console.log(
    "✓ Cocina no expone pedido antes de aceptación",
  );

  const acceptResult =
    await userA.rpc(
      "accept_business_shipping_order",
      {
        p_business_id:
          businessA,
        p_shipping_id:
          shipping.id,
        p_eta_minutes:
          25,
        p_operation_key:
          `e34c-accept-${suffix}`,
      },
    );

  if (acceptResult.error) {
    throw acceptResult.error;
  }

  const kitchenAfter =
    await userA.rpc(
      "get_business_shipping_kitchen_snapshot",
      {
        p_business_id:
          businessA,
        p_business_date:
          dateForKitchen,
      },
    );

  if (kitchenAfter.error) {
    throw kitchenAfter.error;
  }

  assert.equal(
    kitchenAfter.data.commands.some(
      (command) =>
        command.shippingId
        === shipping.id,
    ),
    true,
  );
  console.log(
    "✓ aceptación E34A activa Cocina",
  );

  const tracking =
    await admin.rpc(
      "service_get_public_shipping_tracking",
      {
        p_slug:
          businessAOriginal.slug,
        p_tracking_code:
          firstCreate.data.trackingId,
        p_fingerprint:
          requestFingerprint,
      },
    );

  if (tracking.error) {
    throw tracking.error;
  }

  assert.equal(
    tracking.data.trackingId,
    firstCreate.data.trackingId,
  );

  for (
    const forbidden
    of [
      "phone",
      "address",
      "note",
      "client",
      "businessId",
      "orderId",
      "shippingId",
    ]
  ) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(
        tracking.data,
        forbidden,
      ),
      false,
      `tracking filtra ${forbidden}`,
    );
  }
  console.log(
    "✓ tracking público no expone PII ni IDs internos",
  );

  const crossBusinessTracking =
    await admin.rpc(
      "service_get_public_shipping_tracking",
      {
        p_slug:
          businessBOriginal.slug,
        p_tracking_code:
          firstCreate.data.trackingId,
        p_fingerprint:
          requestFingerprint,
      },
    );

  if (crossBusinessTracking.error) {
    throw crossBusinessTracking.error;
  }

  assert.equal(
    crossBusinessTracking.data,
    null,
  );
  console.log(
    "✓ tracking está ligado al slug y bloquea BOLA",
  );

  for (
    let index = 2;
    index <= 5;
    index += 1
  ) {
    const extra =
      await admin.rpc(
        "service_create_public_shipping_order",
        {
          ...createPayload,
          p_request_key:
            `web:${randomUUID()}`,
          p_fingerprint:
            rateFingerprint,
          p_client_name:
            `Rate ${index}`,
        },
      );

    if (extra.error) {
      throw extra.error;
    }

    const {
      data: extraShipping,
      error: extraReadError,
    } =
      await admin
        .from(
          "business_shipping_orders",
        )
        .select(
          "id, order_id",
        )
        .eq(
          "business_id",
          businessA,
        )
        .eq(
          "tracking_code",
          extra.data.trackingId,
        )
        .single();

    if (extraReadError) {
      throw extraReadError;
    }

    shippingIds.push(
      extraShipping.id,
    );
    orderIds.push(
      extraShipping.order_id,
    );
  }

  const fifthAllowed =
    await admin.rpc(
      "service_create_public_shipping_order",
      {
        ...createPayload,
        p_request_key:
          `web:${randomUUID()}`,
        p_fingerprint:
          rateFingerprint,
        p_client_name:
          "Rate 5 real",
      },
    );

  if (fifthAllowed.error) {
    throw fifthAllowed.error;
  }

  const {
    data: fifthShipping,
    error: fifthReadError,
  } =
    await admin
      .from(
        "business_shipping_orders",
      )
      .select(
        "id, order_id",
      )
      .eq(
        "business_id",
        businessA,
      )
      .eq(
        "tracking_code",
        fifthAllowed.data.trackingId,
      )
      .single();

  if (fifthReadError) {
    throw fifthReadError;
  }

  shippingIds.push(
    fifthShipping.id,
  );
  orderIds.push(
    fifthShipping.order_id,
  );

  const limited =
    await admin.rpc(
      "service_create_public_shipping_order",
      {
        ...createPayload,
        p_request_key:
          `web:${randomUUID()}`,
        p_fingerprint:
          rateFingerprint,
        p_client_name:
          "Rate limit",
      },
    );

  assert.ok(
    limited.error,
    "el sexto pedido del fingerprint debe limitarse",
  );
  assert.match(
    limited.error.message,
    /rate limit/iu,
  );
  console.log(
    "✓ rate-limit atómico bloquea abuso",
  );

  {
    const {
      error,
    } =
      await admin
        .from(
          "business_orders",
        )
        .update({
          status:
            "completed",
        })
        .eq(
          "business_id",
          businessA,
        )
        .eq(
          "id",
          shipping.order_id,
        );

    if (error) {
      throw error;
    }
  }

  {
    const {
      error,
    } =
      await admin
        .from(
          "business_shipping_orders",
        )
        .update({
          shipping_status:
            "completed",
          completed_at:
            new Date(
              Date.now()
              - 2 * 60 * 1000,
            ).toISOString(),
        })
        .eq(
          "business_id",
          businessA,
        )
        .eq(
          "id",
          shipping.id,
        );

    if (error) {
      throw error;
    }
  }

  const expiredTracking =
    await admin.rpc(
      "service_get_public_shipping_tracking",
      {
        p_slug:
          businessAOriginal.slug,
        p_tracking_code:
          firstCreate.data.trackingId,
        p_fingerprint:
          requestFingerprint,
      },
    );

  if (expiredTracking.error) {
    throw expiredTracking.error;
  }

  assert.equal(
    expiredTracking.data,
    null,
  );
  console.log(
    "✓ tracking terminal expira después de un minuto",
  );

  console.log(
    "E34C_STAGING_PASS",
  );
} finally {
  await cleanup();
}
