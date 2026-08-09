import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
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

const suffix = randomUUID();
const menuName =
  `E30A Plato ${suffix}`;
const stockNameA =
  `E30A Harina A ${suffix}`;
const stockNameB =
  `E30A Harina B ${suffix}`;

let menuItemId = null;
let stockProductAId = null;
let stockProductBId = null;
let recipeId = null;

const menuPayload = {
  category_id: null,
  name: menuName,
  description: "Temporal QA E30A",
  price: 1000,
  status: "available",
  is_visible: true,
  is_featured: false,
  image_url: "",
};

function stockPayload(name) {
  return {
    name,
    category: "QA E30A",
    supplier: "",
    unit: "kg",
    unit_cost: 1000,
    alert_below: 0,
    note: "Temporal QA E30A",
    is_active: true,
  };
}

function recipePayload({
  name = "Receta QA",
  preparationTimeSeconds = 900,
  quantity = 250,
  unit = "g",
  stockProductId = stockProductAId,
  duplicate = false,
} = {}) {
  const ingredient = {
    stock_product_id: stockProductId,
    quantity,
    unit,
  };

  return {
    p_recipe: {
      name,
      preparation_time_seconds:
        preparationTimeSeconds,
    },
    p_ingredients:
      duplicate
        ? [ingredient, { ...ingredient }]
        : [ingredient],
  };
}

console.log(
  "Ejecutando backend persistente de Recetas en staging...",
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
    "✓ ambos usuarios se autenticaron",
  );

  const {
    data: menuItem,
    error: menuError,
  } = await userA.rpc(
    "save_business_menu_item",
    {
      p_business_id: fixture.businessAId,
      p_menu_item_id: null,
      p_menu_item: menuPayload,
    },
  );

  if (menuError) {
    throw menuError;
  }

  menuItemId = menuItem.id;
  console.log(
    "✓ owner A creó un plato temporal",
  );

  const {
    data: stockA,
    error: stockAError,
  } = await userA.rpc(
    "save_business_stock_product",
    {
      p_business_id: fixture.businessAId,
      p_product_id: null,
      p_product:
        stockPayload(stockNameA),
    },
  );

  if (stockAError) {
    throw stockAError;
  }

  stockProductAId = stockA.id;

  const {
    data: stockB,
    error: stockBError,
  } = await userB.rpc(
    "save_business_stock_product",
    {
      p_business_id: fixture.businessBId,
      p_product_id: null,
      p_product:
        stockPayload(stockNameB),
    },
  );

  if (stockBError) {
    throw stockBError;
  }

  stockProductBId = stockB.id;
  console.log(
    "✓ se crearon insumos A/B para probar aislamiento",
  );

  await expectFailure(
    anonymous.rpc(
      "save_business_menu_recipe",
      {
        p_business_id:
          fixture.businessAId,
        p_menu_item_id:
          menuItemId,
        ...recipePayload(),
      },
    ),
    "anon no debe guardar recetas",
  );
  console.log(
    "✓ anon no puede ejecutar la RPC de Recetas",
  );

  const {
    data: saved,
    error: saveError,
  } = await userA.rpc(
    "save_business_menu_recipe",
    {
      p_business_id:
        fixture.businessAId,
      p_menu_item_id:
        menuItemId,
      ...recipePayload(),
    },
  );

  if (saveError) {
    throw saveError;
  }

  recipeId = saved.recipe.id;

  assert.equal(
    saved.recipe.business_id,
    fixture.businessAId,
  );
  assert.equal(
    saved.recipe.menu_item_id,
    menuItemId,
  );
  assert.equal(
    Number(saved.recipe.revision),
    1,
  );
  assert.equal(
    saved.ingredients.length,
    1,
  );
  assert.equal(
    saved.ingredients[0].stock_product_id,
    stockProductAId,
  );
  assert.equal(
    Number(saved.ingredients[0].quantity),
    250,
  );
  assert.equal(
    saved.ingredients[0].unit,
    "g",
  );
  console.log(
    "✓ 250 g se vinculan correctamente a un insumo medido en kg",
  );

  const {
    data: ownRecipe,
    error: ownRecipeError,
  } = await userA
    .from("menu_recipes")
    .select("id, business_id, revision")
    .eq("id", recipeId);

  if (ownRecipeError) {
    throw ownRecipeError;
  }

  const {
    data: ownIngredients,
    error: ownIngredientsError,
  } = await userA
    .from("menu_recipe_ingredients")
    .select(
      "id, business_id, recipe_id, stock_product_id",
    )
    .eq("recipe_id", recipeId);

  if (ownIngredientsError) {
    throw ownIngredientsError;
  }

  assert.equal(ownRecipe.length, 1);
  assert.equal(ownIngredients.length, 1);
  console.log(
    "✓ RLS permite leer receta e ingredientes propios",
  );

  const {
    data: bolaRecipe,
    error: bolaRecipeError,
  } = await userB
    .from("menu_recipes")
    .select("id")
    .eq("id", recipeId);

  if (bolaRecipeError) {
    throw bolaRecipeError;
  }

  const {
    data: bolaIngredients,
    error: bolaIngredientsError,
  } = await userB
    .from("menu_recipe_ingredients")
    .select("id")
    .eq("recipe_id", recipeId);

  if (bolaIngredientsError) {
    throw bolaIngredientsError;
  }

  assert.deepEqual(bolaRecipe, []);
  assert.deepEqual(bolaIngredients, []);
  console.log(
    "✓ RLS oculta receta e ingredientes de A al usuario B",
  );

  await expectFailure(
    userA
      .from("menu_recipes")
      .insert({
        business_id:
          fixture.businessAId,
        menu_item_id:
          menuItemId,
        name: "DML directo",
        preparation_time_seconds: 900,
      }),
    "DML directo de recetas debe fallar",
  );

  await expectFailure(
    userA
      .from("menu_recipe_ingredients")
      .insert({
        business_id:
          fixture.businessAId,
        recipe_id:
          recipeId,
        stock_product_id:
          stockProductAId,
        quantity: 1,
        unit: "kg",
      }),
    "DML directo de ingredientes debe fallar",
  );
  console.log(
    "✓ DML directo permanece bloqueado",
  );

  await expectFailure(
    userB.rpc(
      "save_business_menu_recipe",
      {
        p_business_id:
          fixture.businessAId,
        p_menu_item_id:
          menuItemId,
        ...recipePayload(),
      },
    ),
    "B no debe modificar recetas de A",
  );
  console.log(
    "✓ usuario B no puede modificar Recetas de A",
  );

  await expectFailure(
    userA.rpc(
      "save_business_menu_recipe",
      {
        p_business_id:
          fixture.businessAId,
        p_menu_item_id:
          menuItemId,
        ...recipePayload({
          stockProductId:
            stockProductBId,
        }),
      },
    ),
    "A no debe vincular un insumo de B",
  );
  console.log(
    "✓ un ingrediente cross-tenant es rechazado",
  );

  await expectFailure(
    userA.rpc(
      "save_business_menu_recipe",
      {
        p_business_id:
          fixture.businessAId,
        p_menu_item_id:
          menuItemId,
        ...recipePayload({
          unit: "l",
        }),
      },
    ),
    "litros no son compatibles con kg",
  );
  console.log(
    "✓ una unidad incompatible con Stock es rechazada",
  );

  await expectFailure(
    userA.rpc(
      "save_business_menu_recipe",
      {
        p_business_id:
          fixture.businessAId,
        p_menu_item_id:
          menuItemId,
        ...recipePayload({
          duplicate: true,
        }),
      },
    ),
    "un mismo insumo no debe repetirse",
  );
  console.log(
    "✓ un insumo duplicado es rechazado",
  );

  await expectFailure(
    userA.rpc(
      "archive_business_stock_product",
      {
        p_business_id:
          fixture.businessAId,
        p_product_id:
          stockProductAId,
      },
    ),
    "un insumo usado por receta no debe eliminarse",
  );
  console.log(
    "✓ Stock no puede eliminar un insumo usado por una receta activa",
  );

  const {
    data: updated,
    error: updateError,
  } = await userA.rpc(
    "save_business_menu_recipe",
    {
      p_business_id:
        fixture.businessAId,
      p_menu_item_id:
        menuItemId,
      ...recipePayload({
        name: "Receta QA actualizada",
        quantity: 500,
      }),
    },
  );

  if (updateError) {
    throw updateError;
  }

  assert.equal(
    Number(updated.recipe.revision),
    2,
  );
  assert.equal(
    updated.ingredients.length,
    1,
  );
  assert.equal(
    Number(updated.ingredients[0].quantity),
    500,
  );
  console.log(
    "✓ editar reemplaza ingredientes e incrementa revision",
  );

  const {
    data: cleared,
    error: clearError,
  } = await userA.rpc(
    "save_business_menu_recipe",
    {
      p_business_id:
        fixture.businessAId,
      p_menu_item_id:
        menuItemId,
      p_recipe: {
        name: "Receta QA limpia",
        preparation_time_seconds: 600,
      },
      p_ingredients: [],
    },
  );

  if (clearError) {
    throw clearError;
  }

  assert.equal(
    Number(cleared.recipe.revision),
    3,
  );
  assert.deepEqual(
    cleared.ingredients,
    [],
  );
  console.log(
    "✓ una receta puede limpiar su composición atómicamente",
  );

  const {
    data: archivedStock,
    error: archiveStockError,
  } = await userA.rpc(
    "archive_business_stock_product",
    {
      p_business_id:
        fixture.businessAId,
      p_product_id:
        stockProductAId,
    },
  );

  if (archiveStockError) {
    throw archiveStockError;
  }

  assert.ok(
    archivedStock.archived_at,
  );
  console.log(
    "✓ al quitar la referencia, el insumo vuelve a poder eliminarse",
  );

  const {
    data: businessBRecipes,
    error: businessBRecipesError,
  } = await admin
    .from("menu_recipes")
    .select("id")
    .eq(
      "business_id",
      fixture.businessBId,
    )
    .ilike(
      "name",
      "Receta QA%",
    );

  if (businessBRecipesError) {
    throw businessBRecipesError;
  }

  assert.equal(
    businessBRecipes.length,
    0,
  );
  console.log(
    "✓ la prueba no creó recetas accidentales en el local B",
  );

  console.log(
    "Recetas persistentes aprobadas en staging (17 controles).",
  );
} finally {
  if (recipeId) {
    await admin
      .from("menu_recipe_ingredients")
      .delete()
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "recipe_id",
        recipeId,
      );

    await admin
      .from("menu_recipes")
      .delete()
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "id",
        recipeId,
      );
  }

  if (menuItemId) {
    await admin
      .from("menu_items")
      .delete()
      .eq(
        "business_id",
        fixture.businessAId,
      )
      .eq(
        "id",
        menuItemId,
      );
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

    await admin
      .from("stock_products")
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

  if (stockProductBId) {
    await admin
      .from("stock_movements")
      .delete()
      .eq(
        "business_id",
        fixture.businessBId,
      )
      .eq(
        "product_id",
        stockProductBId,
      );

    await admin
      .from("stock_products")
      .delete()
      .eq(
        "business_id",
        fixture.businessBId,
      )
      .eq(
        "id",
        stockProductBId,
      );
  }

  await Promise.allSettled([
    userA.auth.signOut(),
    userB.auth.signOut(),
  ]);

  console.log(
    "✓ datos temporales y sesiones de Recetas fueron limpiados",
  );
}
