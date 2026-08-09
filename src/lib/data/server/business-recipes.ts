import { assertServerOnly } from "@/lib/security/server-only";
import {
  mapBusinessRecipeIngredientRow,
  mapBusinessRecipeRow,
  type BusinessRecipeDatabaseRow,
  type BusinessRecipeIngredientDatabaseRow,
} from "@/lib/recipes/business-recipe-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

const BUSINESS_RECIPE_SELECT =
  "id, business_id, menu_item_id, name, preparation_time_seconds, revision, created_at, updated_at" as const;

const BUSINESS_RECIPE_INGREDIENT_SELECT =
  "id, business_id, recipe_id, stock_product_id, quantity, unit, sort_order, created_at" as const;

export async function getBusinessRecipesForBusiness(
  businessId: string,
) {
  assertServerOnly(
    "getBusinessRecipesForBusiness",
  );

  const supabase =
    await createSupabaseAuthServerClient();

  if (!supabase) {
    throw new Error(
      "No se pudo crear el cliente autenticado.",
    );
  }

  const [
    recipesResult,
    ingredientsResult,
  ] = await Promise.all([
    supabase
      .from("menu_recipes")
      .select(BUSINESS_RECIPE_SELECT)
      .eq("business_id", businessId)
      .order("updated_at", {
        ascending: false,
      })
      .limit(1000),
    supabase
      .from("menu_recipe_ingredients")
      .select(
        BUSINESS_RECIPE_INGREDIENT_SELECT,
      )
      .eq("business_id", businessId)
      .order("recipe_id", {
        ascending: true,
      })
      .order("sort_order", {
        ascending: true,
      })
      .limit(5000),
  ]);

  if (
    recipesResult.error
    || ingredientsResult.error
  ) {
    throw new Error(
      "No se pudieron leer las recetas del negocio.",
    );
  }

  const recipeRows = (
    recipesResult.data ?? []
  ) as unknown as BusinessRecipeDatabaseRow[];

  const ingredientRows = (
    ingredientsResult.data ?? []
  ) as unknown as BusinessRecipeIngredientDatabaseRow[];

  const ingredientsByRecipe = new Map<
    string,
    ReturnType<
      typeof mapBusinessRecipeIngredientRow
    >[]
  >();

  for (const row of ingredientRows) {
    const mapped =
      mapBusinessRecipeIngredientRow(row);
    const current =
      ingredientsByRecipe.get(row.recipe_id)
      ?? [];

    current.push(mapped);
    ingredientsByRecipe.set(
      row.recipe_id,
      current,
    );
  }

  return recipeRows.map((row) =>
    mapBusinessRecipeRow(
      row,
      ingredientsByRecipe.get(row.id) ?? [],
    ),
  );
}
