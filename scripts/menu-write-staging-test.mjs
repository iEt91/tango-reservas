import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./lib/load-local-env.mjs";
import { getStagingContext } from "./lib/staging-context.mjs";

const loaded = await loadLocalEnv();

if (!loaded) {
  throw new Error(
    "No existe .env.staging.local.",
  );
}

const context = getStagingContext({
  requireServerSecret: true,
  requireTestUsers: true,
});
const fixture = JSON.parse(
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
  const { error } = await promise;
  assert.ok(error, label);
  return error;
}

async function snapshotMenu(businessId) {
  const [
    categoriesResult,
    itemsResult,
  ] = await Promise.all([
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
  ]);

  if (
    categoriesResult.error
    || itemsResult.error
  ) {
    throw (
      categoriesResult.error
      ?? itemsResult.error
    );
  }

  return {
    categories: categoriesResult.data ?? [],
    items: itemsResult.data ?? [],
  };
}

async function restoreMenu(
  businessId,
  snapshot,
) {
  const { error: itemDeleteError } =
    await admin
      .from("menu_items")
      .delete()
      .eq("business_id", businessId);

  if (itemDeleteError) {
    throw itemDeleteError;
  }

  const { error: categoryDeleteError } =
    await admin
      .from("menu_categories")
      .delete()
      .eq("business_id", businessId);

  if (categoryDeleteError) {
    throw categoryDeleteError;
  }

  if (snapshot.categories.length > 0) {
    const { error } = await admin
      .from("menu_categories")
      .insert(snapshot.categories);

    if (error) {
      throw error;
    }
  }

  if (snapshot.items.length > 0) {
    const { error } = await admin
      .from("menu_items")
      .insert(snapshot.items);

    if (error) {
      throw error;
    }
  }
}

const categoryPayload = {
  name: "E26 Isolation Category",
  description: "Temporary menu category",
  is_visible: true,
  is_active: true,
};

const itemPayload = {
  category_id: null,
  name: "E26 Isolation Item",
  description: "Temporary menu item",
  price: 12500.5,
  status: "available",
  is_visible: true,
  is_featured: false,
  image_url: "/api/menu-images/e26-isolation-item",
};

console.log(
  "Ejecutando backend de menú en staging...",
);

const menuA =
  await snapshotMenu(fixture.businessAId);
const menuB =
  await snapshotMenu(fixture.businessBId);

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
    "✓ ambos usuarios se autenticaron",
  );

  await expectFailure(
    anonymous.rpc(
      "save_business_menu_category",
      {
        p_business_id: fixture.businessAId,
        p_category_id: null,
        p_category: categoryPayload,
      },
    ),
    "anon no debe ejecutar la RPC",
  );
  console.log(
    "✓ anon no puede ejecutar las RPC",
  );

  await expectFailure(
    userA.rpc(
      "save_business_menu_category",
      {
        p_business_id: fixture.businessAId,
        p_category_id: null,
        p_category: {
          ...categoryPayload,
          name: "",
        },
      },
    ),
    "la categoría inválida debe fallar",
  );

  assert.deepEqual(
    await snapshotMenu(fixture.businessAId),
    menuA,
  );
  console.log(
    "✓ la entrada inválida no cambió el menú",
  );

  const {
    data: category,
    error: categoryError,
  } = await userA.rpc(
    "save_business_menu_category",
    {
      p_business_id: fixture.businessAId,
      p_category_id: null,
      p_category: categoryPayload,
    },
  );

  if (categoryError) {
    throw categoryError;
  }

  assert.equal(
    category.business_id,
    fixture.businessAId,
  );
  console.log(
    "✓ owner A creó una categoría",
  );

  const {
    data: item,
    error: itemError,
  } = await userA.rpc(
    "save_business_menu_item",
    {
      p_business_id: fixture.businessAId,
      p_menu_item_id: null,
      p_menu_item: {
        ...itemPayload,
        category_id: category.id,
      },
    },
  );

  if (itemError) {
    throw itemError;
  }

  assert.equal(item.category_id, category.id);
  assert.equal(Number(item.price), 12500.5);
  console.log(
    "✓ owner A creó un producto categorizado",
  );

  const {
    data: quickItems,
    error: quickError,
  } = await userA.rpc(
    "save_business_menu_item_quick_changes",
    {
      p_business_id: fixture.businessAId,
      p_items: [{
        id: item.id,
        category_id: null,
        price: 13500,
        is_visible: false,
      }],
    },
  );

  if (quickError) {
    throw quickError;
  }

  const quickItem = quickItems.find(
    (candidate) => candidate.id === item.id,
  );
  assert.equal(Number(quickItem.price), 13500);
  assert.equal(quickItem.category_id, null);
  assert.equal(quickItem.is_visible, false);
  console.log(
    "✓ cambios rápidos se guardaron atómicamente",
  );

  const {
    data: categoryTwo,
    error: categoryTwoError,
  } = await userA.rpc(
    "save_business_menu_category",
    {
      p_business_id: fixture.businessAId,
      p_category_id: null,
      p_category: {
        ...categoryPayload,
        name: "E26 Isolation Category Two",
      },
    },
  );

  if (categoryTwoError) {
    throw categoryTwoError;
  }

  const {
    data: reordered,
    error: reorderError,
  } = await userA.rpc(
    "reorder_business_menu_categories",
    {
      p_business_id: fixture.businessAId,
      p_category_ids: [
        categoryTwo.id,
        category.id,
      ],
    },
  );

  if (reorderError) {
    throw reorderError;
  }

  assert.equal(reordered[0].id, categoryTwo.id);
  assert.equal(reordered[0].sort_order, 0);
  console.log(
    "✓ el orden de categorías es persistente",
  );

  await expectFailure(
    userA.rpc(
      "save_business_menu_category",
      {
        p_business_id: fixture.businessBId,
        p_category_id: null,
        p_category: categoryPayload,
      },
    ),
    "usuario A no puede crear en B",
  );
  console.log(
    "✓ usuario A no puede crear en B",
  );

  await expectFailure(
    userB.rpc(
      "save_business_menu_item",
      {
        p_business_id: fixture.businessAId,
        p_menu_item_id: item.id,
        p_menu_item: itemPayload,
      },
    ),
    "usuario B no puede modificar A",
  );
  console.log(
    "✓ usuario B no puede modificar A",
  );

  await expectFailure(
    userA
      .from("menu_categories")
      .insert({
        business_id: fixture.businessAId,
        name: "Blocked category",
      }),
    "DML directo de categorías sigue bloqueado",
  );
  console.log(
    "✓ DML directo de categorías sigue bloqueado",
  );

  await expectFailure(
    userA
      .from("menu_items")
      .update({
        price: 1,
      })
      .eq("id", item.id),
    "DML directo de productos sigue bloqueado",
  );
  console.log(
    "✓ DML directo de productos sigue bloqueado",
  );

  const {
    data: archivedCategory,
    error: archiveCategoryError,
  } = await userA.rpc(
    "archive_business_menu_category",
    {
      p_business_id: fixture.businessAId,
      p_category_id: category.id,
    },
  );

  if (archiveCategoryError) {
    throw archiveCategoryError;
  }

  assert.ok(archivedCategory.archived_at);
  console.log(
    "✓ la categoría usa archivo lógico",
  );

  const {
    data: archivedItem,
    error: archiveItemError,
  } = await userA.rpc(
    "archive_business_menu_item",
    {
      p_business_id: fixture.businessAId,
      p_menu_item_id: item.id,
    },
  );

  if (archiveItemError) {
    throw archiveItemError;
  }

  assert.ok(archivedItem.archived_at);
  assert.equal(archivedItem.status, "paused");
  console.log(
    "✓ el producto usa archivo lógico",
  );

  assert.deepEqual(
    await snapshotMenu(fixture.businessBId),
    menuB,
  );
  console.log(
    "✓ las operaciones de A no modificaron B",
  );
} finally {
  await restoreMenu(
    fixture.businessAId,
    menuA,
  );
  console.log("✓ menú A restaurado");
  await restoreMenu(
    fixture.businessBId,
    menuB,
  );
  console.log("✓ menú B restaurado");
  await userA.auth.signOut();
  await userB.auth.signOut();
  console.log(
    "✓ las sesiones fueron cerradas",
  );
}

console.log(
  "Backend persistente de menú aprobado (14 controles).",
);
