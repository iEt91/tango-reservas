import assert from "node:assert/strict";
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

async function snapshotMenu(businessId) {
  const [categoriesResult, itemsResult, productsResult] = await Promise.all([
    admin
      .from("menu_categories")
      .select("*")
      .eq("business_id", businessId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
    admin
      .from("menu_items")
      .select("*")
      .eq("business_id", businessId)
      .order("sort_order", { ascending: true })
      .order("id", { ascending: true }),
    admin
      .from("menu_category_products")
      .select("*")
      .eq("business_id", businessId)
      .order("category_id", { ascending: true })
      .order("menu_item_id", { ascending: true }),
  ]);

  const error =
    categoriesResult.error ?? itemsResult.error ?? productsResult.error;
  if (error) throw error;

  return {
    categories: categoriesResult.data ?? [],
    items: itemsResult.data ?? [],
    categoryProducts: productsResult.data ?? [],
  };
}

async function restoreMenu(snapshot, created) {
  if (snapshot.categories.length > 0) {
    const { error } = await admin
      .from("menu_categories")
      .upsert(snapshot.categories, { onConflict: "id" });
    if (error) throw error;
  }

  if (snapshot.items.length > 0) {
    const { error } = await admin
      .from("menu_items")
      .upsert(snapshot.items, { onConflict: "id" });
    if (error) throw error;
  }

  if (snapshot.categoryProducts.length > 0) {
    const { error } = await admin
      .from("menu_category_products")
      .upsert(snapshot.categoryProducts, {
        onConflict: "business_id,category_id,menu_item_id",
      });
    if (error) throw error;
  }

  if (created.promotionId) {
    const { error } = await admin
      .from("menu_category_products")
      .delete()
      .eq("category_id", created.promotionId);
    if (error) throw error;
  }

  for (const itemId of created.itemIds) {
    const { error } = await admin.from("menu_items").delete().eq("id", itemId);
    if (error) throw error;
  }

  if (created.promotionId) {
    const { error } = await admin
      .from("menu_categories")
      .delete()
      .eq("id", created.promotionId);
    if (error) throw error;
  }
}

const nonce = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
const itemPayload = (name, price) => ({
  category_id: null,
  name,
  description: "Temporary E27A promotion product",
  price,
  status: "available",
  is_visible: true,
  is_featured: false,
  image_url: "",
});

console.log("Ejecutando promociones y combos de menú en staging...");

const menuA = await snapshotMenu(fixture.businessAId);
const menuB = await snapshotMenu(fixture.businessBId);
const created = { itemIds: [], promotionId: null };

try {
  await signIn(userA, context.userAEmail, context.userAPassword);
  await signIn(userB, context.userBEmail, context.userBPassword);
  console.log("✓ ambos usuarios se autenticaron");

  const { data: itemOne, error: itemOneError } = await userA.rpc(
    "save_business_menu_item",
    {
      p_business_id: fixture.businessAId,
      p_menu_item_id: null,
      p_menu_item: itemPayload(`E27A Promo Item 1 ${nonce}`, 10000),
    },
  );
  if (itemOneError) throw itemOneError;
  created.itemIds.push(itemOne.id);

  const { data: itemTwo, error: itemTwoError } = await userA.rpc(
    "save_business_menu_item",
    {
      p_business_id: fixture.businessAId,
      p_menu_item_id: null,
      p_menu_item: itemPayload(`E27A Promo Item 2 ${nonce}`, 5000),
    },
  );
  if (itemTwoError) throw itemTwoError;
  created.itemIds.push(itemTwo.id);
  console.log("✓ se crearon productos temporales para el combo");

  const promotionPayload = {
    name: `E27A Promo ${nonce}`,
    description: "2x1 y combo persistente",
    is_visible: true,
    is_active: true,
    is_promotion: true,
    fixed_price: null,
    discount_percent: 50,
  };

  await expectFailure(
    anonymous.rpc("save_business_menu_category_details", {
      p_business_id: fixture.businessAId,
      p_category_id: null,
      p_category: promotionPayload,
      p_products: [{ product_id: itemOne.id, quantity: 2 }],
    }),
    "anon no debe crear promociones",
  );
  console.log("✓ anon no puede ejecutar la RPC de promociones");

  const { data: promotion, error: promotionError } = await userA.rpc(
    "save_business_menu_category_details",
    {
      p_business_id: fixture.businessAId,
      p_category_id: null,
      p_category: promotionPayload,
      p_products: [
        { product_id: itemOne.id, quantity: 2 },
        { product_id: itemTwo.id, quantity: 3 },
      ],
    },
  );
  if (promotionError) throw promotionError;
  created.promotionId = promotion.id;

  assert.equal(promotion.business_id, fixture.businessAId);
  assert.equal(promotion.is_promotion, true);
  assert.equal(Number(promotion.discount_percent), 50);
  assert.equal(promotion.products.length, 2);
  assert.equal(
    promotion.products.find((entry) => entry.product_id === itemTwo.id)?.quantity,
    3,
  );
  console.log("✓ owner A creó un combo con cantidades mayores a 2");

  const { data: relationRows, error: relationError } = await userA
    .from("menu_category_products")
    .select("category_id, menu_item_id, quantity")
    .eq("category_id", promotion.id)
    .order("menu_item_id", { ascending: true });
  if (relationError) throw relationError;
  assert.equal(relationRows.length, 2);
  assert.ok(relationRows.some((entry) => entry.quantity === 3));
  console.log("✓ la composición se lee mediante RLS del tenant");

  const { data: updatedPromotion, error: updateError } = await userA.rpc(
    "save_business_menu_category_details",
    {
      p_business_id: fixture.businessAId,
      p_category_id: promotion.id,
      p_category: {
        ...promotionPayload,
        fixed_price: 20000,
        discount_percent: null,
      },
      p_products: [
        { product_id: itemOne.id, quantity: 4 },
        { product_id: itemTwo.id, quantity: 1 },
      ],
    },
  );
  if (updateError) throw updateError;
  assert.equal(Number(updatedPromotion.fixed_price), 20000);
  assert.equal(
    updatedPromotion.products.find((entry) => entry.product_id === itemOne.id)?.quantity,
    4,
  );
  console.log("✓ precio fijo y cantidades se actualizan atómicamente");

  await expectFailure(
    userA.rpc("save_business_menu_category_details", {
      p_business_id: fixture.businessAId,
      p_category_id: promotion.id,
      p_category: promotionPayload,
      p_products: [
        { product_id: itemOne.id, quantity: 2 },
        { product_id: itemOne.id, quantity: 3 },
      ],
    }),
    "productos duplicados deben fallar",
  );

  const { data: afterInvalid, error: afterInvalidError } = await userA
    .from("menu_category_products")
    .select("menu_item_id, quantity")
    .eq("category_id", promotion.id);
  if (afterInvalidError) throw afterInvalidError;
  assert.equal(
    afterInvalid.find((entry) => entry.menu_item_id === itemOne.id)?.quantity,
    4,
  );
  console.log("✓ una composición inválida hace rollback sin cambios parciales");

  const { data: discountedCategory, error: discountedError } = await userA.rpc(
    "save_business_menu_category_details",
    {
      p_business_id: fixture.businessAId,
      p_category_id: null,
      p_category: {
        name: `E27A Discount Category ${nonce}`,
        description: "Descuento de categoría",
        is_visible: true,
        is_active: true,
        is_promotion: false,
        fixed_price: null,
        discount_percent: 10,
      },
      p_products: [],
    },
  );
  if (discountedError) throw discountedError;
  assert.equal(discountedCategory.is_promotion, false);
  assert.equal(Number(discountedCategory.discount_percent), 10);
  assert.deepEqual(discountedCategory.products, []);
  console.log("✓ descuentos de categoría también persisten sin composición artificial");

  await expectFailure(
    userA.rpc("save_business_menu_category_details", {
      p_business_id: fixture.businessBId,
      p_category_id: null,
      p_category: promotionPayload,
      p_products: [],
    }),
    "usuario A no puede crear promociones en B",
  );
  console.log("✓ usuario A no puede crear promociones en B");

  await expectFailure(
    userB.rpc("save_business_menu_category_details", {
      p_business_id: fixture.businessAId,
      p_category_id: promotion.id,
      p_category: promotionPayload,
      p_products: [],
    }),
    "usuario B no puede modificar promociones de A",
  );
  console.log("✓ usuario B no puede modificar promociones de A");

  await expectFailure(
    userA.from("menu_category_products").insert({
      business_id: fixture.businessAId,
      category_id: promotion.id,
      menu_item_id: itemOne.id,
      quantity: 9,
    }),
    "DML directo de composición debe permanecer bloqueado",
  );
  console.log("✓ DML directo de composición permanece bloqueado");

  const { data: crossTenantRows, error: crossTenantReadError } = await userB
    .from("menu_category_products")
    .select("category_id")
    .eq("category_id", promotion.id);
  if (crossTenantReadError) throw crossTenantReadError;
  assert.deepEqual(crossTenantRows, []);
  console.log("✓ RLS oculta la composición de A al usuario B");

  assert.deepEqual(await snapshotMenu(fixture.businessBId), menuB);
  console.log("✓ las operaciones de A no modificaron B");
} finally {
  await restoreMenu(menuA, created);
  console.log("✓ menú A restaurado");
  await restoreMenu(menuB, { itemIds: [], promotionId: null });
  console.log("✓ menú B restaurado");
  await userA.auth.signOut();
  await userB.auth.signOut();
  console.log("✓ las sesiones fueron cerradas");
}

console.log("Promociones persistentes de menú aprobadas (13 controles).");
