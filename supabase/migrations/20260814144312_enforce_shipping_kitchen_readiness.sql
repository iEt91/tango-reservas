begin;

-- A shipping order can only become available to the customer or be charged
-- after its canonical kitchen order has reached a ready state. Keeping this
-- in a trigger also protects the invariant from future RPCs or server code.
create or replace function private.enforce_shipping_kitchen_readiness()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  kitchen_status_value text;
  requires_ready_kitchen boolean;
begin
  requires_ready_kitchen :=
    (new.ready_at is distinct from old.ready_at and new.ready_at is not null)
    or (new.on_the_way_at is distinct from old.on_the_way_at and new.on_the_way_at is not null)
    or (new.shipping_status = 'completed' and old.shipping_status is distinct from 'completed');

  if not requires_ready_kitchen then
    return new;
  end if;

  select business_order.kitchen_status
  into kitchen_status_value
  from public.business_orders as business_order
  where business_order.business_id = new.business_id
    and business_order.id = new.order_id;

  if kitchen_status_value not in ('ready', 'completed') then
    raise exception 'Shipping requires a kitchen order marked ready before it can advance.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists business_shipping_orders_require_kitchen_ready
  on public.business_shipping_orders;

create trigger business_shipping_orders_require_kitchen_ready
before update of ready_at, on_the_way_at, shipping_status
on public.business_shipping_orders
for each row
execute function private.enforce_shipping_kitchen_readiness();

revoke all on function private.enforce_shipping_kitchen_readiness()
  from public, anon, authenticated;

commit;
