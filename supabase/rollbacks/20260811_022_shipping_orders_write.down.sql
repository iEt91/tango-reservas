begin;

revoke all on function public.get_business_shipping_snapshot(
  uuid,
  date,
  date
) from public, anon, authenticated;
revoke all on function public.save_business_shipping_order(
  uuid, uuid, date, time without time zone, text, text, text, text,
  text, text, boolean, text, jsonb, text
) from public, anon, authenticated;
revoke all on function public.accept_business_shipping_order(
  uuid, uuid, integer, text
) from public, anon, authenticated;
revoke all on function public.set_business_shipping_milestone(
  uuid, uuid, text, text
) from public, anon, authenticated;
revoke all on function public.cancel_business_shipping_order(
  uuid, uuid, boolean, text
) from public, anon, authenticated;
revoke all on function public.complete_business_shipping_payment(
  uuid, uuid, jsonb, text
) from public, anon, authenticated;
revoke all on function public.get_business_shipping_kitchen_snapshot(
  uuid, date
) from public, anon, authenticated;
revoke all on function public.set_business_shipping_kitchen_command_status(
  uuid, uuid, uuid, text, text
) from public, anon, authenticated;

drop function if exists public.get_business_shipping_snapshot(
  uuid,
  date,
  date
);
drop function if exists public.save_business_shipping_order(
  uuid, uuid, date, time without time zone, text, text, text, text,
  text, text, boolean, text, jsonb, text
);
drop function if exists public.accept_business_shipping_order(
  uuid, uuid, integer, text
);
drop function if exists public.set_business_shipping_milestone(
  uuid, uuid, text, text
);
drop function if exists public.cancel_business_shipping_order(
  uuid, uuid, boolean, text
);
drop function if exists public.complete_business_shipping_payment(
  uuid, uuid, jsonb, text
);
drop function if exists public.get_business_shipping_kitchen_snapshot(
  uuid, date
);
drop function if exists public.set_business_shipping_kitchen_command_status(
  uuid, uuid, uuid, text, text
);

drop function if exists private.build_business_shipping_result(
  uuid,
  uuid
);

revoke all on table public.business_shipping_orders
  from public, anon, authenticated;
revoke all on table public.business_shipping_operations
  from public, anon, authenticated;

alter table public.business_shipping_orders
  enable row level security;
alter table public.business_shipping_orders
  force row level security;
alter table public.business_shipping_operations
  enable row level security;
alter table public.business_shipping_operations
  force row level security;

-- Deliberately preserve Shipping rows, payment source columns/FKs,
-- source-shape constraints and Stock/Kitchen evidence. Returning reservation_id
-- to NOT NULL or dropping shipping_id would destroy valid E34A evidence.

commit;
