begin;

revoke all on function public.consume_business_menu_recipe_stock(
  uuid,
  uuid,
  integer,
  text,
  text,
  text,
  text
) from public, anon, authenticated;

drop function if exists public.consume_business_menu_recipe_stock(
  uuid,
  uuid,
  integer,
  text,
  text,
  text,
  text
);

revoke all on function private.apply_recipe_stock_consumption(
  uuid,
  uuid,
  integer,
  text,
  text,
  text,
  text,
  text,
  uuid
) from public, anon, authenticated;

drop function if exists private.apply_recipe_stock_consumption(
  uuid,
  uuid,
  integer,
  text,
  text,
  text,
  text,
  text,
  uuid
);

drop policy if exists
  stock_recipe_operations_select_module_member
on public.stock_recipe_operations;

drop policy if exists
  stock_recipe_operation_movements_select_module_member
on public.stock_recipe_operation_movements;

revoke all on table public.stock_recipe_operations
  from public, anon, authenticated;
revoke all on table public.stock_recipe_operation_movements
  from public, anon, authenticated;

alter table public.stock_recipe_operations
  enable row level security;
alter table public.stock_recipe_operations
  force row level security;

alter table public.stock_recipe_operation_movements
  enable row level security;
alter table public.stock_recipe_operation_movements
  force row level security;

commit;
