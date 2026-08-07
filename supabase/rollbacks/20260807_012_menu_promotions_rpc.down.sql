begin;

revoke all on function public.save_business_menu_category_details(
  uuid,
  uuid,
  jsonb,
  jsonb
) from public, anon, authenticated;

drop function if exists public.save_business_menu_category_details(
  uuid,
  uuid,
  jsonb,
  jsonb
);

revoke all on table public.menu_category_products
  from public, anon, authenticated;

drop policy if exists
  menu_category_products_select_active_member
on public.menu_category_products;

alter table public.menu_category_products enable row level security;
alter table public.menu_category_products force row level security;

-- Deliberadamente no se eliminan la tabla, sus filas ni las columnas nuevas.
-- Un rollback de código vuelve a usar las RPC de E26 sin perder promociones.

commit;
