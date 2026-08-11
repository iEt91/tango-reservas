import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./lib/load-local-env.mjs";
import { getStagingContext } from "./lib/staging-context.mjs";

const loaded = await loadLocalEnv();

if (!loaded) {
  throw new Error("No existe .env.staging.local.");
}

const context = getStagingContext({
  requireServerSecret: true,
  requireTestUsers: true,
});

const fixture = JSON.parse(
  await readFile(".tango/staging-isolation.json", "utf8"),
);

if (fixture.projectRef !== context.stagingProjectRef) {
  throw new Error("El fixture no pertenece al staging actual.");
}

for (const key of ["businessAId", "businessBId"]) {
  if (!fixture[key]) throw new Error(`Falta ${key} en el fixture de staging.`);
}

function client(key = context.publicKey) {
  return createClient(context.url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

const admin = client(context.serverSecret);
const userA = client();
const userB = client();
const anonymous = client();

async function signIn(target, email, password) {
  const { error } = await target.auth.signInWithPassword({ email, password });
  if (error) throw error;
}

async function expectFailure(promise, label) {
  const { error } = await promise;
  assert.ok(error, label);
  return error;
}

if (
  typeof context.userAEmail !== "string"
  || typeof context.userAPassword !== "string"
  || typeof context.userBEmail !== "string"
  || typeof context.userBPassword !== "string"
) {
  throw new Error("El contrato de credenciales de staging no coincide.");
}

await signIn(userA, context.userAEmail, context.userAPassword);
await signIn(userB, context.userBEmail, context.userBPassword);
console.log("✓ usuarios A/B autenticados");

const businessA = fixture.businessAId;
const suffix = randomUUID().replaceAll("-", "");
const businessDate = "2098-12-31";
const seedMovementIds = [];
const shippingIds = [];
const orderIds = [];
let cashSessionId = null;

async function cleanup() {
  if (orderIds.length > 0) {
    await admin
      .from("business_orders")
      .update({ kitchen_status: "pending" })
      .eq("business_id", businessA)
      .in("id", orderIds);
  }

  const { data: links } = orderIds.length > 0
    ? await admin
      .from("business_order_stock_operations")
      .select("stock_recipe_operation_id")
      .eq("business_id", businessA)
      .in("order_id", orderIds)
    : { data: [] };

  const stockOperationIds = [
    ...new Set((links ?? []).map((row) => row.stock_recipe_operation_id)),
  ];

  const { data: returnRows } = stockOperationIds.length > 0
    ? await admin
      .from("stock_recipe_return_operations")
      .select("id")
      .eq("business_id", businessA)
      .in("original_operation_id", stockOperationIds)
    : { data: [] };

  const returnOperationIds = (returnRows ?? []).map((row) => row.id);

  const { data: originalMovementLinks } = stockOperationIds.length > 0
    ? await admin
      .from("stock_recipe_operation_movements")
      .select("stock_movement_id")
      .eq("business_id", businessA)
      .in("operation_id", stockOperationIds)
    : { data: [] };

  const { data: returnMovementLinks } = returnOperationIds.length > 0
    ? await admin
      .from("stock_recipe_return_operation_movements")
      .select("source_stock_movement_id, return_stock_movement_id")
      .eq("business_id", businessA)
      .in("return_operation_id", returnOperationIds)
    : { data: [] };

  const movementIds = [
    ...seedMovementIds,
    ...(originalMovementLinks ?? []).map((row) => row.stock_movement_id),
    ...(returnMovementLinks ?? []).flatMap((row) => [
      row.source_stock_movement_id,
      row.return_stock_movement_id,
    ]),
  ].filter(Boolean);

  if (shippingIds.length > 0) {
    await admin
      .from("business_payments")
      .delete()
      .eq("business_id", businessA)
      .in("shipping_id", shippingIds);
    await admin
      .from("business_payment_operations")
      .delete()
      .eq("business_id", businessA)
      .in("shipping_id", shippingIds);
  }

  if (orderIds.length > 0) {
    await admin
      .from("business_kitchen_operations")
      .delete()
      .eq("business_id", businessA)
      .in("order_id", orderIds);
    await admin
      .from("business_kitchen_ticket_items")
      .delete()
      .eq("business_id", businessA)
      .in("order_id", orderIds);
    await admin
      .from("business_kitchen_tickets")
      .delete()
      .eq("business_id", businessA)
      .in("order_id", orderIds);
    await admin
      .from("business_order_stock_operations")
      .delete()
      .eq("business_id", businessA)
      .in("order_id", orderIds);
  }

  if (returnOperationIds.length > 0) {
    await admin
      .from("stock_recipe_return_operation_movements")
      .delete()
      .eq("business_id", businessA)
      .in("return_operation_id", returnOperationIds);
    await admin
      .from("stock_recipe_return_operations")
      .delete()
      .eq("business_id", businessA)
      .in("id", returnOperationIds);
  }

  if (stockOperationIds.length > 0) {
    await admin
      .from("stock_recipe_operation_movements")
      .delete()
      .eq("business_id", businessA)
      .in("operation_id", stockOperationIds);
    await admin
      .from("stock_recipe_operations")
      .delete()
      .eq("business_id", businessA)
      .in("id", stockOperationIds);
  }

  if (movementIds.length > 0) {
    await admin
      .from("stock_movements")
      .delete()
      .eq("business_id", businessA)
      .in("id", [...new Set(movementIds)]);
  }

  if (shippingIds.length > 0) {
    await admin
      .from("business_shipping_operations")
      .delete()
      .eq("business_id", businessA)
      .in("shipping_id", shippingIds);
    await admin
      .from("business_shipping_orders")
      .delete()
      .eq("business_id", businessA)
      .in("id", shippingIds);
  }

  if (orderIds.length > 0) {
    await admin
      .from("business_order_items")
      .delete()
      .eq("business_id", businessA)
      .in("order_id", orderIds);
    await admin
      .from("business_orders")
      .delete()
      .eq("business_id", businessA)
      .in("id", orderIds);
  }

  if (cashSessionId) {
    await admin
      .from("cash_sessions")
      .delete()
      .eq("business_id", businessA)
      .eq("id", cashSessionId);
  }
}

try {
  const { data: recipes, error: recipesError } = await admin
    .from("menu_recipes")
    .select("id, menu_item_id")
    .eq("business_id", businessA)
    .limit(20);

  if (recipesError || !recipes?.length) {
    throw new Error("El fixture necesita al menos una receta persistente en negocio A.");
  }

  let selectedRecipe = null;
  let selectedMenuItem = null;
  let ingredients = [];

  for (const recipe of recipes) {
    const { data: menuItem } = await admin
      .from("menu_items")
      .select("id, name, price, status, archived_at")
      .eq("business_id", businessA)
      .eq("id", recipe.menu_item_id)
      .maybeSingle();

    if (!menuItem || menuItem.status !== "available" || menuItem.archived_at) continue;

    const { data: recipeIngredients } = await admin
      .from("menu_recipe_ingredients")
      .select("stock_product_id")
      .eq("business_id", businessA)
      .eq("recipe_id", recipe.id);

    if (!recipeIngredients?.length) continue;

    selectedRecipe = recipe;
    selectedMenuItem = menuItem;
    ingredients = recipeIngredients;
    break;
  }

  if (!selectedRecipe || !selectedMenuItem || ingredients.length === 0) {
    throw new Error("El fixture necesita un plato disponible con receta e ingredientes.");
  }

  for (const ingredient of ingredients) {
    const key = `e34a-seed-${suffix}-${ingredient.stock_product_id}`;
    const { data: movement, error } = await userA.rpc(
      "record_business_stock_movement",
      {
        p_business_id: businessA,
        p_product_id: ingredient.stock_product_id,
        p_movement: {
          movement_type: "replenishment",
          origin: "manual",
          quantity_delta: 1000000,
          operation_key: key,
          reference_id: `e34a-${suffix}`,
          label: "E34A staging stock",
          detail: "temporary QA stock",
        },
      },
    );

    if (error) throw error;
    seedMovementIds.push(movement.id);
  }
  console.log("✓ Stock temporal preparado para receta QA");

  const saveKey = `e34a-save-${suffix}`;
  const { data: manualShipping, error: saveError } = await userA.rpc(
    "save_business_shipping_order",
    {
      p_business_id: businessA,
      p_shipping_id: null,
      p_business_date: businessDate,
      p_scheduled_time: "21:00",
      p_order_kind: "delivery",
      p_client_name: "Shipping QA Manual",
      p_client_phone: "+5491111111111",
      p_address: "Calle QA 123",
      p_note: "Sin sal",
      p_source: "manual",
      p_needs_acceptance: false,
      p_preferred_payment_method: "cash",
      p_items: [{ menu_item_id: selectedMenuItem.id, quantity: 1 }],
      p_operation_key: saveKey,
    },
  );

  if (saveError) throw saveError;
  shippingIds.push(manualShipping.id);
  orderIds.push(manualShipping.orderId);
  assert.equal(manualShipping.order.kind, "delivery");
  assert.equal(manualShipping.needsAcceptance, false);
  assert.equal(manualShipping.order.items[0].quantity, 1);

  const { data: replay, error: replayError } = await userA.rpc(
    "save_business_shipping_order",
    {
      p_business_id: businessA,
      p_shipping_id: null,
      p_business_date: businessDate,
      p_scheduled_time: "21:00",
      p_order_kind: "delivery",
      p_client_name: "Shipping QA Manual",
      p_client_phone: "+5491111111111",
      p_address: "Calle QA 123",
      p_note: "Sin sal",
      p_source: "manual",
      p_needs_acceptance: false,
      p_preferred_payment_method: "cash",
      p_items: [{ menu_item_id: selectedMenuItem.id, quantity: 1 }],
      p_operation_key: saveKey,
    },
  );

  if (replayError) throw replayError;
  assert.deepEqual(replay, manualShipping);
  console.log("✓ pedido manual consume Stock e idempotencia de save funciona");

  const { data: stockOperations, error: stockOpsError } = await admin
    .from("stock_recipe_operations")
    .select("origin, reference_id")
    .eq("business_id", businessA)
    .eq("reference_id", manualShipping.id);

  if (stockOpsError) throw stockOpsError;
  assert.ok(stockOperations?.some((row) => row.origin === "shipping"));
  console.log("✓ Stock conserva origin=shipping y referencia al Envío");

  const { data: kitchenSnapshot, error: kitchenSnapshotError } = await userA.rpc(
    "get_business_shipping_kitchen_snapshot",
    { p_business_id: businessA, p_business_date: businessDate },
  );

  if (kitchenSnapshotError) throw kitchenSnapshotError;
  const baseCommand = kitchenSnapshot.commands.find(
    (command) => command.orderId === manualShipping.orderId && !command.isAddition,
  );
  assert.ok(baseCommand);
  assert.equal(baseCommand.source, "delivery");

  const { error: startError } = await userA.rpc(
    "set_business_shipping_kitchen_command_status",
    {
      p_business_id: businessA,
      p_order_id: manualShipping.orderId,
      p_ticket_id: null,
      p_status: "preparing",
      p_operation_key: `e34a-kitchen-start-${suffix}`,
    },
  );
  if (startError) throw startError;

  const { data: edited, error: editError } = await userA.rpc(
    "save_business_shipping_order",
    {
      p_business_id: businessA,
      p_shipping_id: manualShipping.id,
      p_business_date: businessDate,
      p_scheduled_time: "21:00",
      p_order_kind: "delivery",
      p_client_name: "Shipping QA Manual",
      p_client_phone: "+5491111111111",
      p_address: "Calle QA 123",
      p_note: "Sin sal",
      p_source: "manual",
      p_needs_acceptance: false,
      p_preferred_payment_method: "cash",
      p_items: [{ menu_item_id: selectedMenuItem.id, quantity: 2 }],
      p_operation_key: `e34a-edit-${suffix}`,
    },
  );
  if (editError) throw editError;
  assert.equal(edited.order.items[0].quantity, 2);

  const { data: kitchenAfterEdit, error: kitchenAfterEditError } = await userA.rpc(
    "get_business_shipping_kitchen_snapshot",
    { p_business_id: businessA, p_business_date: businessDate },
  );
  if (kitchenAfterEditError) throw kitchenAfterEditError;
  assert.ok(kitchenAfterEdit.commands.some(
    (command) => command.orderId === manualShipping.orderId && command.isAddition,
  ));
  console.log("✓ Cocina usa trigger 021 y crea agregado después de comenzar");

  const { data: cancelled, error: cancelError } = await userA.rpc(
    "cancel_business_shipping_order",
    {
      p_business_id: businessA,
      p_shipping_id: manualShipping.id,
      p_return_stock: true,
      p_operation_key: `e34a-cancel-${suffix}`,
    },
  );
  if (cancelError) throw cancelError;
  assert.equal(cancelled.status, "cancelled");
  assert.equal(cancelled.order.status, "cancelled");
  console.log("✓ cancelación devuelve Stock y cierra pedido canónico");

  const { data: pickup, error: pickupError } = await userA.rpc(
    "save_business_shipping_order",
    {
      p_business_id: businessA,
      p_shipping_id: null,
      p_business_date: businessDate,
      p_scheduled_time: "22:00",
      p_order_kind: "pickup",
      p_client_name: "Shipping QA Pickup",
      p_client_phone: "+5492222222222",
      p_address: "",
      p_note: "",
      p_source: "manual",
      p_needs_acceptance: false,
      p_preferred_payment_method: "transfer",
      p_items: [{ menu_item_id: selectedMenuItem.id, quantity: 1 }],
      p_operation_key: `e34a-pickup-${suffix}`,
    },
  );
  if (pickupError) throw pickupError;
  shippingIds.push(pickup.id);
  orderIds.push(pickup.orderId);

  const { data: cashSession, error: cashError } = await userA.rpc(
    "open_business_cash_session",
    {
      p_business_id: businessA,
      p_business_date: businessDate,
      p_opening_amount: 0,
      p_operation_key: `e34a-cash-${suffix}`,
    },
  );
  if (cashError) throw cashError;
  cashSessionId = cashSession.id;

  const subtotal = Number(pickup.order.subtotal);
  const { data: paid, error: paymentError } = await userA.rpc(
    "complete_business_shipping_payment",
    {
      p_business_id: businessA,
      p_shipping_id: pickup.id,
      p_payments: subtotal === 0
        ? []
        : [{ method: "transfer", amount: subtotal }],
      p_operation_key: `e34a-payment-${suffix}`,
    },
  );
  if (paymentError) throw paymentError;
  assert.equal(paid.shipping.status, "completed");
  assert.equal(paid.shipping.order.status, "completed");
  assert.equal(Number(paid.totalAmount), subtotal);
  console.log("✓ Caja registra pago Shipping y completa pedido atómicamente");

  const { data: snapshot, error: snapshotError } = await userA.rpc(
    "get_business_shipping_snapshot",
    {
      p_business_id: businessA,
      p_start_date: businessDate,
      p_end_date: businessDate,
    },
  );
  if (snapshotError) throw snapshotError;
  assert.ok(snapshot.deliveries.some((row) => row.id === pickup.id));
  console.log("✓ snapshot autenticado devuelve Envíos canónicos");

  await expectFailure(
    userB.rpc("get_business_shipping_snapshot", {
      p_business_id: businessA,
      p_start_date: businessDate,
      p_end_date: businessDate,
    }),
    "BOLA debe bloquear negocio B",
  );
  await expectFailure(
    anonymous.rpc("get_business_shipping_snapshot", {
      p_business_id: businessA,
      p_start_date: businessDate,
      p_end_date: businessDate,
    }),
    "anon debe quedar bloqueado",
  );
  console.log("✓ BOLA y anon quedan bloqueados");

  await expectFailure(
    userA
      .from("business_shipping_orders")
      .update({ note: "DML prohibido" })
      .eq("business_id", businessA)
      .eq("id", pickup.id),
    "DML técnico directo debe quedar bloqueado",
  );
  console.log("✓ DML técnico directo queda bloqueado");

  console.log("E34A_STAGING_PASS");
} finally {
  await cleanup();
}
