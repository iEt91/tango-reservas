begin;

revoke all on function public.save_business_menu_recipe(
  uuid,
  uuid,
  jsonb,
  jsonb
) from public, anon, authenticated;

drop function if exists public.save_business_menu_recipe(
  uuid,
  uuid,
  jsonb,
  jsonb
);

drop trigger if exists stock_products_validate_recipe_references
  on public.stock_products;

revoke all on function private.validate_stock_product_recipe_references()
  from public, anon, authenticated;

drop function if exists private.validate_stock_product_recipe_references();

revoke all on function private.recipe_quantity_in_stock_unit(
  numeric,
  text,
  text
) from public, anon, authenticated;

drop function if exists private.recipe_quantity_in_stock_unit(
  numeric,
  text,
  text
);

drop policy if exists menu_recipes_select_module_member
  on public.menu_recipes;

drop policy if exists menu_recipe_ingredients_select_module_member
  on public.menu_recipe_ingredients;

revoke all on table public.menu_recipes
  from public, anon, authenticated;

revoke all on table public.menu_recipe_ingredients
  from public, anon, authenticated;

alter table public.menu_recipes enable row level security;
alter table public.menu_recipes force row level security;

alter table public.menu_recipe_ingredients enable row level security;
alter table public.menu_recipe_ingredients force row level security;

drop trigger if exists menu_recipes_set_updated_at
  on public.menu_recipes;

commit;
