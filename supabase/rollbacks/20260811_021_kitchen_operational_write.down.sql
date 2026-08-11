begin;

revoke all on function public.get_business_kitchen_snapshot(
  uuid,
  date
) from public, anon, authenticated;

revoke all on function public.set_business_kitchen_command_status(
  uuid,
  uuid,
  uuid,
  text,
  text
) from public, anon, authenticated;

drop function if exists public.get_business_kitchen_snapshot(
  uuid,
  date
);

drop function if exists public.set_business_kitchen_command_status(
  uuid,
  uuid,
  uuid,
  text,
  text
);

drop trigger if exists
  business_order_items_sync_kitchen_delta
on public.business_order_items;

drop function if exists private.sync_business_order_item_kitchen_delta();
drop function if exists private.reduce_business_kitchen_ticket_item(
  uuid,
  uuid,
  uuid,
  integer,
  uuid
);
drop function if exists private.add_business_kitchen_ticket_item(
  uuid,
  uuid,
  text,
  uuid,
  text,
  integer,
  uuid
);
drop function if exists private.kitchen_recipe_target_seconds(
  uuid,
  uuid
);

revoke all
on table
  public.business_kitchen_tickets,
  public.business_kitchen_ticket_items,
  public.business_kitchen_operations
from public, anon, authenticated;

alter table if exists public.business_kitchen_tickets
  enable row level security;
alter table if exists public.business_kitchen_tickets
  force row level security;
alter table if exists public.business_kitchen_ticket_items
  enable row level security;
alter table if exists public.business_kitchen_ticket_items
  force row level security;
alter table if exists public.business_kitchen_operations
  enable row level security;
alter table if exists public.business_kitchen_operations
  force row level security;

commit;
