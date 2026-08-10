begin;

revoke execute on function public.save_business_reservation_consumption(
  uuid,
  uuid,
  jsonb,
  text
) from authenticated;

drop function if exists public.save_business_reservation_consumption(
  uuid,
  uuid,
  jsonb,
  text
);

drop trigger if exists
  reservations_guard_terminal_with_consumption
on public.reservations;

drop function if exists
  private.guard_reservation_terminal_with_consumption();

drop function if exists private.apply_recipe_stock_return(
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
  business_orders_select_domain_member
on public.business_orders;

drop policy if exists
  business_order_items_select_domain_member
on public.business_order_items;

revoke all on table public.business_orders
  from public, anon, authenticated;
revoke all on table public.business_order_items
  from public, anon, authenticated;
revoke all on table public.business_order_mutations
  from public, anon, authenticated;
revoke all on table public.business_order_stock_operations
  from public, anon, authenticated;
revoke all on table public.stock_recipe_return_operations
  from public, anon, authenticated;
revoke all on table public.stock_recipe_return_operation_movements
  from public, anon, authenticated;

alter table public.business_orders
  enable row level security;
alter table public.business_orders
  force row level security;
alter table public.business_order_items
  enable row level security;
alter table public.business_order_items
  force row level security;
alter table public.business_order_mutations
  enable row level security;
alter table public.business_order_mutations
  force row level security;
alter table public.business_order_stock_operations
  enable row level security;
alter table public.business_order_stock_operations
  force row level security;
alter table public.stock_recipe_return_operations
  enable row level security;
alter table public.stock_recipe_return_operations
  force row level security;
alter table public.stock_recipe_return_operation_movements
  enable row level security;
alter table public.stock_recipe_return_operation_movements
  force row level security;

commit;
