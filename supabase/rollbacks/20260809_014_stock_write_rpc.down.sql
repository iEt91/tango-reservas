begin;

revoke all on function public.save_business_stock_product(
  uuid,
  uuid,
  jsonb
) from public, anon, authenticated;

revoke all on function public.record_business_stock_movement(
  uuid,
  uuid,
  jsonb
) from public, anon, authenticated;

revoke all on function public.archive_business_stock_product(
  uuid,
  uuid
) from public, anon, authenticated;

drop function if exists public.save_business_stock_product(
  uuid,
  uuid,
  jsonb
);

drop function if exists public.record_business_stock_movement(
  uuid,
  uuid,
  jsonb
);

drop function if exists public.archive_business_stock_product(
  uuid,
  uuid
);

drop policy if exists stock_products_select_module_member
  on public.stock_products;

drop policy if exists stock_movements_select_module_member
  on public.stock_movements;

revoke all on table public.stock_products
  from public, anon, authenticated;

revoke all on table public.stock_movements
  from public, anon, authenticated;

alter table public.stock_products enable row level security;
alter table public.stock_products force row level security;

alter table public.stock_movements enable row level security;
alter table public.stock_movements force row level security;

revoke all on function private.current_user_has_module_access(
  uuid,
  text,
  text
) from public, anon, authenticated;

drop function if exists private.current_user_has_module_access(
  uuid,
  text,
  text
);

commit;
