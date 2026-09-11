begin;

create table if not exists public.business_shipping_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  order_id uuid not null,
  order_kind text not null,
  business_date date not null,
  scheduled_time time without time zone not null,
  client_name text not null,
  client_phone text not null,
  address_snapshot text not null default '',
  note text not null default '',
  source text not null default 'manual',
  needs_acceptance boolean not null default false,
  tracking_code text not null,
  preferred_payment_method text not null default 'cash',
  shipping_status text not null default 'confirmed',
  eta_minutes integer,
  accepted_at timestamptz,
  preparing_at timestamptz,
  ready_at timestamptz,
  on_the_way_at timestamptz,
  completed_at timestamptz,
  cancelled_at timestamptz,
  revision integer not null default 1,
  created_by uuid
    references auth.users(id) on delete set null,
  updated_by uuid
    references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_shipping_orders_business_id_id_key
    unique (business_id, id),
  constraint business_shipping_orders_business_order_key
    unique (business_id, order_id),
  constraint business_shipping_orders_business_id_id_order_key
    unique (business_id, id, order_id),
  constraint business_shipping_orders_tracking_key
    unique (business_id, tracking_code),
  constraint business_shipping_orders_order_tenant_fk
    foreign key (business_id, order_id, order_kind)
    references public.business_orders(business_id, id, order_kind)
    on delete restrict,
  constraint business_shipping_orders_kind_check
    check (order_kind in ('delivery', 'pickup')),
  constraint business_shipping_orders_client_name_check
    check (char_length(btrim(client_name)) between 1 and 160),
  constraint business_shipping_orders_client_phone_check
    check (char_length(btrim(client_phone)) between 3 and 40),
  constraint business_shipping_orders_address_check
    check (
      (
        order_kind = 'delivery'
        and char_length(btrim(address_snapshot)) between 1 and 500
      )
      or (
        order_kind = 'pickup'
        and char_length(address_snapshot) <= 500
      )
    ),
  constraint business_shipping_orders_note_check
    check (char_length(note) <= 4000),
  constraint business_shipping_orders_source_check
    check (source in ('manual', 'web')),
  constraint business_shipping_orders_manual_acceptance_check
    check (source = 'web' or needs_acceptance = false),
  constraint business_shipping_orders_tracking_check
    check (
      tracking_code ~ '^PED-[A-Z0-9]{10,32}$'
    ),
  constraint business_shipping_orders_payment_method_check
    check (
      preferred_payment_method in (
        'cash',
        'card',
        'mercado_pago',
        'transfer'
      )
    ),
  constraint business_shipping_orders_status_check
    check (
      shipping_status in (
        'confirmed',
        'completed',
        'cancelled'
      )
    ),
  constraint business_shipping_orders_eta_check
    check (
      eta_minutes is null
      or eta_minutes between 1 and 1440
    ),
  constraint business_shipping_orders_revision_check
    check (revision between 1 and 2147483647),
  constraint business_shipping_orders_terminal_shape_check
    check (
      (
        shipping_status = 'confirmed'
        and completed_at is null
        and cancelled_at is null
      )
      or (
        shipping_status = 'completed'
        and completed_at is not null
        and cancelled_at is null
      )
      or (
        shipping_status = 'cancelled'
        and cancelled_at is not null
        and completed_at is null
      )
    )
);

create index if not exists
  business_shipping_orders_business_date_status_idx
on public.business_shipping_orders (
  business_id,
  business_date desc,
  shipping_status,
  scheduled_time
);

create table if not exists public.business_shipping_operations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  operation_key text not null,
  shipping_id uuid not null,
  order_id uuid not null,
  operation_type text not null,
  request_payload jsonb not null,
  result_snapshot jsonb not null default '{}'::jsonb,
  created_by uuid
    references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint business_shipping_operations_business_id_id_key
    unique (business_id, id),
  constraint business_shipping_operations_business_key
    unique (business_id, operation_key),
  constraint business_shipping_operations_shipping_tenant_fk
    foreign key (business_id, shipping_id, order_id)
    references public.business_shipping_orders(business_id, id, order_id)
    on delete restrict,
  constraint business_shipping_operations_type_check
    check (
      operation_type in (
        'save',
        'accept',
        'cancel',
        'milestone'
      )
    ),
  constraint business_shipping_operations_key_check
    check (char_length(btrim(operation_key)) between 8 and 120),
  constraint business_shipping_operations_request_check
    check (jsonb_typeof(request_payload) = 'object'),
  constraint business_shipping_operations_result_check
    check (jsonb_typeof(result_snapshot) = 'object')
);

create index if not exists
  business_shipping_operations_shipping_created_idx
on public.business_shipping_operations (
  business_id,
  shipping_id,
  created_at desc
);

alter table public.business_payment_operations
  add column if not exists shipping_id uuid;

alter table public.business_payments
  add column if not exists shipping_id uuid;

alter table public.business_payment_operations
  alter column reservation_id drop not null;

alter table public.business_payments
  alter column reservation_id drop not null;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.business_payment_operations'::regclass
      and conname = 'business_payment_operations_shipping_tenant_fk'
  ) then
    alter table public.business_payment_operations
      add constraint business_payment_operations_shipping_tenant_fk
      foreign key (business_id, shipping_id, order_id)
      references public.business_shipping_orders(business_id, id, order_id)
      on delete restrict;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.business_payments'::regclass
      and conname = 'business_payments_shipping_tenant_fk'
  ) then
    alter table public.business_payments
      add constraint business_payments_shipping_tenant_fk
      foreign key (business_id, shipping_id, order_id)
      references public.business_shipping_orders(business_id, id, order_id)
      on delete restrict;
  end if;
end;
$$;

alter table public.business_payment_operations
  drop constraint if exists business_payment_operations_source_check;

alter table public.business_payment_operations
  add constraint business_payment_operations_source_check
  check (
    (reservation_id is not null and shipping_id is null)
    or (reservation_id is null and shipping_id is not null)
  );

alter table public.business_payments
  drop constraint if exists business_payments_source_check;

alter table public.business_payments
  add constraint business_payments_source_check
  check (
    (reservation_id is not null and shipping_id is null)
    or (reservation_id is null and shipping_id is not null)
  );

create index if not exists
  business_payment_operations_shipping_idx
on public.business_payment_operations (
  business_id,
  shipping_id,
  created_at desc
)
where shipping_id is not null;

create index if not exists
  business_payments_shipping_idx
on public.business_payments (
  business_id,
  shipping_id,
  created_at desc
)
where shipping_id is not null;

drop trigger if exists business_shipping_orders_set_updated_at
  on public.business_shipping_orders;

create trigger business_shipping_orders_set_updated_at
before update on public.business_shipping_orders
for each row
execute function private.tango_set_updated_at();

alter table public.business_shipping_orders
  enable row level security;
alter table public.business_shipping_orders
  force row level security;
alter table public.business_shipping_operations
  enable row level security;
alter table public.business_shipping_operations
  force row level security;

drop policy if exists business_shipping_orders_select_shipping_member
  on public.business_shipping_orders;

create policy business_shipping_orders_select_shipping_member
on public.business_shipping_orders
for select
to authenticated
using (
  (
    select private.current_user_has_module_access(
      business_id,
      'shipping',
      'view'
    )
  )
);

revoke all on table public.business_shipping_orders
  from public, anon, authenticated;
revoke all on table public.business_shipping_operations
  from public, anon, authenticated;

grant select on table public.business_shipping_orders
  to authenticated;

grant select, insert, update, delete
  on table public.business_shipping_orders
  to service_role;
grant select, insert, update, delete
  on table public.business_shipping_operations
  to service_role;

create or replace function private.build_business_shipping_result(
  p_business_id uuid,
  p_shipping_id uuid
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'id', shipping.id,
    'orderId', shipping.order_id,
    'deliveryType', shipping.order_kind,
    'businessDate', shipping.business_date,
    'time', to_char(shipping.scheduled_time, 'HH24:MI'),
    'client', shipping.client_name,
    'phone', shipping.client_phone,
    'address', shipping.address_snapshot,
    'note', shipping.note,
    'source', shipping.source,
    'needsAcceptance', shipping.needs_acceptance,
    'trackingId', shipping.tracking_code,
    'preferredPaymentMethod', shipping.preferred_payment_method,
    'status', shipping.shipping_status,
    'etaMinutes', shipping.eta_minutes,
    'acceptedAt', shipping.accepted_at,
    'preparingAt', shipping.preparing_at,
    'readyAt', shipping.ready_at,
    'onTheWayAt', shipping.on_the_way_at,
    'completedAt', shipping.completed_at,
    'cancelledAt', shipping.cancelled_at,
    'revision', shipping.revision,
    'createdAt', shipping.created_at,
    'updatedAt', shipping.updated_at,
    'order', jsonb_build_object(
      'id', order_row.id,
      'kind', order_row.order_kind,
      'status', order_row.status,
      'revision', order_row.revision,
      'subtotal', order_row.subtotal,
      'kitchenStatus', order_row.kitchen_status,
      'kitchenStartedAt', order_row.kitchen_started_at,
      'kitchenReadyAt', order_row.kitchen_ready_at,
      'kitchenCompletedAt', order_row.kitchen_completed_at,
      'items', coalesce(
        (
          select jsonb_agg(
            jsonb_build_object(
              'menuItemId', item.menu_item_id,
              'name', item.name_snapshot,
              'unitPrice', item.unit_price_snapshot,
              'quantity', item.quantity
            )
            order by item.name_snapshot, item.menu_item_id
          )
          from public.business_order_items as item
          where item.business_id = shipping.business_id
            and item.order_id = shipping.order_id
        ),
        '[]'::jsonb
      )
    ),
    'payments', coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', payment.id,
            'method', payment.payment_method,
            'amount', payment.amount,
            'createdAt', payment.created_at
          )
          order by payment.payment_method
        )
        from public.business_payments as payment
        where payment.business_id = shipping.business_id
          and payment.shipping_id = shipping.id
      ),
      '[]'::jsonb
    )
  )
  from public.business_shipping_orders as shipping
  join public.business_orders as order_row
    on order_row.business_id = shipping.business_id
    and order_row.id = shipping.order_id
  where shipping.business_id = p_business_id
    and shipping.id = p_shipping_id
  limit 1;
$$;

revoke all on function private.build_business_shipping_result(
  uuid,
  uuid
) from public, anon, authenticated;

create or replace function public.get_business_shipping_snapshot(
  p_business_id uuid,
  p_start_date date,
  p_end_date date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  result_value jsonb;
begin
  if actor_user_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not private.current_user_has_module_access(
    p_business_id,
    'shipping',
    'view'
  ) then
    raise exception 'Insufficient shipping permission.'
      using errcode = '42501';
  end if;

  if p_business_id is null
    or p_start_date is null
    or p_end_date is null
    or p_start_date > p_end_date
    or (p_end_date - p_start_date) > 3660 then
    raise exception 'Shipping snapshot input is invalid.'
      using errcode = '22023';
  end if;

  select jsonb_build_object(
    'startDate', p_start_date,
    'endDate', p_end_date,
    'deliveries', coalesce(
      jsonb_agg(
        private.build_business_shipping_result(
          shipping.business_id,
          shipping.id
        )
        order by
          shipping.business_date,
          shipping.scheduled_time,
          shipping.id
      ),
      '[]'::jsonb
    )
  )
  into result_value
  from public.business_shipping_orders as shipping
  where shipping.business_id = p_business_id
    and shipping.business_date between p_start_date and p_end_date;

  return result_value;
end;
$$;

create or replace function public.save_business_shipping_order(
  p_business_id uuid,
  p_shipping_id uuid,
  p_business_date date,
  p_scheduled_time time without time zone,
  p_order_kind text,
  p_client_name text,
  p_client_phone text,
  p_address text,
  p_note text,
  p_source text,
  p_needs_acceptance boolean,
  p_preferred_payment_method text,
  p_items jsonb,
  p_operation_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  normalized_key text := btrim(coalesce(p_operation_key, ''));
  normalized_items jsonb;
  request_value jsonb;
  existing_operation public.business_shipping_operations%rowtype;
  shipping_row public.business_shipping_orders%rowtype;
  order_row public.business_orders%rowtype;
  menu_item_row public.menu_items%rowtype;
  diff_record record;
  source_record record;
  consume_result jsonb;
  source_available integer;
  remaining_return integer;
  quantity_to_return integer;
  item_count integer;
  subtotal_value numeric(12, 2);
  result_value jsonb;
  generated_tracking text;
  is_new boolean := false;
  stock_is_reserved boolean := false;
begin
  if actor_user_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not private.current_user_has_module_access(
    p_business_id,
    'shipping',
    'manage'
  ) then
    raise exception 'Insufficient shipping permission.'
      using errcode = '42501';
  end if;

  if p_business_id is null
    or p_business_date is null
    or p_scheduled_time is null
    or p_order_kind not in ('delivery', 'pickup')
    or char_length(btrim(coalesce(p_client_name, ''))) not between 1 and 160
    or char_length(btrim(coalesce(p_client_phone, ''))) not between 3 and 40
    or char_length(coalesce(p_address, '')) > 500
    or (
      p_order_kind = 'delivery'
      and char_length(btrim(coalesce(p_address, ''))) < 1
    )
    or char_length(coalesce(p_note, '')) > 4000
    or p_source not in ('manual', 'web')
    or p_needs_acceptance is null
    or (p_source = 'manual' and p_needs_acceptance)
    or p_preferred_payment_method not in (
      'cash', 'card', 'mercado_pago', 'transfer'
    )
    or p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or char_length(normalized_key) not between 8 and 120 then
    raise exception 'Shipping order input is invalid.'
      using errcode = '22023';
  end if;

  item_count := jsonb_array_length(p_items);

  if item_count not between 1 and 100 then
    raise exception 'Shipping order must contain between 1 and 100 items.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as entry(value)
    where jsonb_typeof(entry.value) <> 'object'
  ) or exists (
    select 1
    from jsonb_array_elements(p_items) as entry(value)
    cross join lateral jsonb_object_keys(entry.value) as field(key)
    where field.key not in ('menu_item_id', 'quantity')
  ) or exists (
    select 1
    from jsonb_array_elements(p_items) as entry(value)
    where jsonb_typeof(entry.value -> 'menu_item_id') is distinct from 'string'
      or jsonb_typeof(entry.value -> 'quantity') is distinct from 'number'
      or (entry.value ->> 'menu_item_id')
        !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or case
        when (entry.value ->> 'quantity') ~ '^[0-9]+$' then
          (entry.value ->> 'quantity')::numeric < 1
          or (entry.value ->> 'quantity')::numeric > 9999
        else true
      end
  ) then
    raise exception 'Shipping order item is invalid.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as entry(value)
    group by lower(entry.value ->> 'menu_item_id')
    having count(*) > 1
  ) then
    raise exception 'Shipping order contains duplicate menu items.'
      using errcode = '22023';
  end if;

  select jsonb_agg(
    jsonb_build_object(
      'menu_item_id', normalized.menu_item_id::text,
      'quantity', normalized.quantity
    )
    order by normalized.menu_item_id
  )
  into normalized_items
  from (
    select
      (entry.value ->> 'menu_item_id')::uuid as menu_item_id,
      (entry.value ->> 'quantity')::integer as quantity
    from jsonb_array_elements(p_items) as entry(value)
  ) as normalized;

  request_value := jsonb_build_object(
    'shipping_id', p_shipping_id,
    'business_date', p_business_date,
    'scheduled_time', p_scheduled_time,
    'order_kind', p_order_kind,
    'client_name', btrim(p_client_name),
    'client_phone', btrim(p_client_phone),
    'address', case
      when p_order_kind = 'pickup' then ''
      else btrim(p_address)
    end,
    'note', coalesce(btrim(p_note), ''),
    'source', p_source,
    'needs_acceptance', p_needs_acceptance,
    'preferred_payment_method', p_preferred_payment_method,
    'items', normalized_items
  );

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text, 0)
  );

  select operation.*
  into existing_operation
  from public.business_shipping_operations as operation
  where operation.business_id = p_business_id
    and operation.operation_key = normalized_key
  limit 1;

  if found then
    if existing_operation.operation_type = 'save'
      and existing_operation.request_payload = request_value then
      return existing_operation.result_snapshot;
    end if;

    raise exception 'Shipping operation key already exists with different data.'
      using errcode = '23505';
  end if;

  if p_shipping_id is null then
    is_new := true;

    insert into public.business_orders (
      business_id,
      order_kind,
      reservation_id,
      status,
      revision,
      subtotal,
      created_by,
      updated_by
    )
    values (
      p_business_id,
      p_order_kind,
      null,
      'open',
      1,
      0,
      actor_user_id,
      actor_user_id
    )
    returning *
    into order_row;

    generated_tracking :=
      'PED-'
      || upper(
        substr(
          replace(gen_random_uuid()::text, '-', ''),
          1,
          16
        )
      );

    insert into public.business_shipping_orders (
      business_id,
      order_id,
      order_kind,
      business_date,
      scheduled_time,
      client_name,
      client_phone,
      address_snapshot,
      note,
      source,
      needs_acceptance,
      tracking_code,
      preferred_payment_method,
      shipping_status,
      accepted_at,
      preparing_at,
      created_by,
      updated_by
    )
    values (
      p_business_id,
      order_row.id,
      p_order_kind,
      p_business_date,
      p_scheduled_time,
      btrim(p_client_name),
      btrim(p_client_phone),
      case
        when p_order_kind = 'pickup' then ''
        else btrim(p_address)
      end,
      coalesce(btrim(p_note), ''),
      p_source,
      p_needs_acceptance,
      generated_tracking,
      p_preferred_payment_method,
      'confirmed',
      case when p_needs_acceptance then null else now() end,
      case when p_needs_acceptance then null else now() end,
      actor_user_id,
      actor_user_id
    )
    returning *
    into shipping_row;
  else
    select shipping.*
    into shipping_row
    from public.business_shipping_orders as shipping
    where shipping.business_id = p_business_id
      and shipping.id = p_shipping_id
    for update;

    if not found then
      raise exception 'Shipping order is not available for this business.'
        using errcode = '42501';
    end if;

    select target_order.*
    into order_row
    from public.business_orders as target_order
    where target_order.business_id = p_business_id
      and target_order.id = shipping_row.order_id
    for update;

    if not found
      or shipping_row.shipping_status <> 'confirmed'
      or order_row.status <> 'open' then
      raise exception 'Shipping order is not open for editing.'
        using errcode = 'P0001';
    end if;

    if shipping_row.order_kind <> p_order_kind then
      raise exception 'Shipping delivery type cannot change after creation.'
        using errcode = 'P0001';
    end if;

    if shipping_row.source <> p_source
      or shipping_row.needs_acceptance <> p_needs_acceptance then
      raise exception 'Shipping source and acceptance state cannot be edited directly.'
        using errcode = 'P0001';
    end if;
  end if;

  stock_is_reserved := not shipping_row.needs_acceptance;

  if stock_is_reserved then
    for diff_record in
      select
        current_item.menu_item_id,
        current_item.name_snapshot,
        current_item.quantity - coalesce(target.quantity, 0) as quantity_to_remove
      from public.business_order_items as current_item
      left join jsonb_to_recordset(normalized_items)
        as target(menu_item_id text, quantity integer)
        on target.menu_item_id::uuid = current_item.menu_item_id
      where current_item.business_id = p_business_id
        and current_item.order_id = order_row.id
        and current_item.quantity > coalesce(target.quantity, 0)
      order by current_item.menu_item_id
    loop
      remaining_return := diff_record.quantity_to_remove;

      for source_record in
        select
          operation.id,
          operation.sold_quantity,
          operation.created_at,
          coalesce(sum(returned.return_quantity), 0)::integer as returned_quantity
        from public.business_order_stock_operations as order_link
        join public.stock_recipe_operations as operation
          on operation.business_id = order_link.business_id
          and operation.id = order_link.stock_recipe_operation_id
        left join public.stock_recipe_return_operations as returned
          on returned.business_id = operation.business_id
          and returned.original_operation_id = operation.id
        where order_link.business_id = p_business_id
          and order_link.order_id = order_row.id
          and order_link.menu_item_id = diff_record.menu_item_id
        group by operation.id, operation.sold_quantity, operation.created_at
        having operation.sold_quantity > coalesce(sum(returned.return_quantity), 0)
        order by operation.created_at desc, operation.id desc
      loop
        exit when remaining_return <= 0;

        source_available := source_record.sold_quantity - source_record.returned_quantity;
        quantity_to_return := least(remaining_return, source_available);

        perform private.apply_recipe_stock_return(
          p_business_id,
          source_record.id,
          quantity_to_return,
          'shipping',
          shipping_row.id::text,
          'shipping-return:'
            || md5(normalized_key || ':' || source_record.id::text),
          'Devolución de pedido de Envíos',
          diff_record.name_snapshot,
          actor_user_id
        );

        remaining_return := remaining_return - quantity_to_return;
      end loop;

      if remaining_return <> 0 then
        raise exception 'Shipping stock return history is incomplete.'
          using errcode = '23514';
      end if;
    end loop;

    for diff_record in
      select
        target.menu_item_id::uuid as menu_item_id,
        target.quantity - coalesce(current_item.quantity, 0) as quantity_to_add
      from jsonb_to_recordset(normalized_items)
        as target(menu_item_id text, quantity integer)
      left join public.business_order_items as current_item
        on current_item.business_id = p_business_id
        and current_item.order_id = order_row.id
        and current_item.menu_item_id = target.menu_item_id::uuid
      where target.quantity > coalesce(current_item.quantity, 0)
      order by target.menu_item_id::uuid
    loop
      select item.*
      into menu_item_row
      from public.menu_items as item
      where item.business_id = p_business_id
        and item.id = diff_record.menu_item_id
        and item.archived_at is null
        and item.status = 'available'
      for share;

      if not found then
        raise exception 'Menu item is not available for shipping.'
          using errcode = '23503';
      end if;

      consume_result := private.apply_recipe_stock_consumption(
        p_business_id,
        diff_record.menu_item_id,
        diff_record.quantity_to_add,
        'shipping',
        shipping_row.id::text,
        'shipping-consume:'
          || md5(normalized_key || ':' || diff_record.menu_item_id::text),
        'Consumo de Envíos',
        menu_item_row.name,
        actor_user_id
      );

      insert into public.business_order_stock_operations (
        business_id,
        order_id,
        menu_item_id,
        stock_recipe_operation_id
      )
      values (
        p_business_id,
        order_row.id,
        diff_record.menu_item_id,
        (consume_result -> 'operation' ->> 'id')::uuid
      );
    end loop;
  end if;

  delete from public.business_order_items as existing_item
  where existing_item.business_id = p_business_id
    and existing_item.order_id = order_row.id
    and not exists (
      select 1
      from jsonb_to_recordset(normalized_items)
        as target(menu_item_id text, quantity integer)
      where target.menu_item_id::uuid = existing_item.menu_item_id
    );

  update public.business_order_items as existing_item
  set
    quantity = target.quantity,
    updated_at = now()
  from jsonb_to_recordset(normalized_items)
    as target(menu_item_id text, quantity integer)
  where existing_item.business_id = p_business_id
    and existing_item.order_id = order_row.id
    and existing_item.menu_item_id = target.menu_item_id::uuid;

  insert into public.business_order_items (
    business_id,
    order_id,
    order_kind,
    menu_item_id,
    name_snapshot,
    unit_price_snapshot,
    quantity
  )
  select
    p_business_id,
    order_row.id,
    order_row.order_kind,
    target.menu_item_id::uuid,
    item.name,
    item.price,
    target.quantity
  from jsonb_to_recordset(normalized_items)
    as target(menu_item_id text, quantity integer)
  join public.menu_items as item
    on item.business_id = p_business_id
    and item.id = target.menu_item_id::uuid
    and item.archived_at is null
    and item.status = 'available'
  where not exists (
    select 1
    from public.business_order_items as existing_item
    where existing_item.business_id = p_business_id
      and existing_item.order_id = order_row.id
      and existing_item.menu_item_id = target.menu_item_id::uuid
  );

  if (
    select count(*)
    from public.business_order_items as item
    where item.business_id = p_business_id
      and item.order_id = order_row.id
  ) <> item_count then
    raise exception 'Shipping order contains unavailable menu items.'
      using errcode = '23503';
  end if;

  select coalesce(
    sum(item.unit_price_snapshot * item.quantity),
    0
  )::numeric(12, 2)
  into subtotal_value
  from public.business_order_items as item
  where item.business_id = p_business_id
    and item.order_id = order_row.id;

  update public.business_orders
  set
    subtotal = subtotal_value,
    revision = case when is_new then revision else revision + 1 end,
    updated_by = actor_user_id,
    updated_at = now()
  where business_id = p_business_id
    and id = order_row.id
  returning *
  into order_row;

  update public.business_shipping_orders
  set
    business_date = p_business_date,
    scheduled_time = p_scheduled_time,
    client_name = btrim(p_client_name),
    client_phone = btrim(p_client_phone),
    address_snapshot = case
      when order_kind = 'pickup' then ''
      else btrim(p_address)
    end,
    note = coalesce(btrim(p_note), ''),
    preferred_payment_method = p_preferred_payment_method,
    revision = case when is_new then revision else revision + 1 end,
    updated_by = actor_user_id,
    updated_at = now()
  where business_id = p_business_id
    and id = shipping_row.id
  returning *
  into shipping_row;

  result_value := private.build_business_shipping_result(
    p_business_id,
    shipping_row.id
  );

  insert into public.business_shipping_operations (
    business_id,
    operation_key,
    shipping_id,
    order_id,
    operation_type,
    request_payload,
    result_snapshot,
    created_by
  )
  values (
    p_business_id,
    normalized_key,
    shipping_row.id,
    order_row.id,
    'save',
    request_value,
    result_value,
    actor_user_id
  );

  return result_value;
end;
$$;

create or replace function public.accept_business_shipping_order(
  p_business_id uuid,
  p_shipping_id uuid,
  p_eta_minutes integer,
  p_operation_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  normalized_key text := btrim(coalesce(p_operation_key, ''));
  request_value jsonb;
  existing_operation public.business_shipping_operations%rowtype;
  shipping_row public.business_shipping_orders%rowtype;
  order_row public.business_orders%rowtype;
  item_record record;
  consume_result jsonb;
  result_value jsonb;
begin
  if actor_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not private.current_user_has_module_access(
    p_business_id,
    'shipping',
    'manage'
  ) then
    raise exception 'Insufficient shipping permission.' using errcode = '42501';
  end if;

  if p_business_id is null
    or p_shipping_id is null
    or p_eta_minutes is null
    or p_eta_minutes not between 1 and 1440
    or char_length(normalized_key) not between 8 and 120 then
    raise exception 'Shipping acceptance input is invalid.' using errcode = '22023';
  end if;

  request_value := jsonb_build_object(
    'shipping_id', p_shipping_id,
    'eta_minutes', p_eta_minutes
  );

  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text, 0));

  select operation.*
  into existing_operation
  from public.business_shipping_operations as operation
  where operation.business_id = p_business_id
    and operation.operation_key = normalized_key
  limit 1;

  if found then
    if existing_operation.operation_type = 'accept'
      and existing_operation.shipping_id = p_shipping_id
      and existing_operation.request_payload = request_value then
      return existing_operation.result_snapshot;
    end if;
    raise exception 'Shipping operation key already exists with different data.'
      using errcode = '23505';
  end if;

  select shipping.*
  into shipping_row
  from public.business_shipping_orders as shipping
  where shipping.business_id = p_business_id
    and shipping.id = p_shipping_id
  for update;

  if not found then
    raise exception 'Shipping order is not available for this business.'
      using errcode = '42501';
  end if;

  select target_order.*
  into order_row
  from public.business_orders as target_order
  where target_order.business_id = p_business_id
    and target_order.id = shipping_row.order_id
  for update;

  if shipping_row.source <> 'web'
    or shipping_row.shipping_status <> 'confirmed'
    or order_row.status <> 'open' then
    raise exception 'Shipping order cannot be accepted.' using errcode = 'P0001';
  end if;

  if shipping_row.needs_acceptance then
    for item_record in
      select item.*
      from public.business_order_items as item
      where item.business_id = p_business_id
        and item.order_id = order_row.id
      order by item.menu_item_id
    loop
      consume_result := private.apply_recipe_stock_consumption(
        p_business_id,
        item_record.menu_item_id,
        item_record.quantity,
        'shipping',
        shipping_row.id::text,
        'shipping-accept:'
          || md5(normalized_key || ':' || item_record.menu_item_id::text),
        'Consumo de Envíos',
        item_record.name_snapshot,
        actor_user_id
      );

      insert into public.business_order_stock_operations (
        business_id,
        order_id,
        menu_item_id,
        stock_recipe_operation_id
      )
      values (
        p_business_id,
        order_row.id,
        item_record.menu_item_id,
        (consume_result -> 'operation' ->> 'id')::uuid
      );
    end loop;

    update public.business_shipping_orders
    set
      needs_acceptance = false,
      eta_minutes = p_eta_minutes,
      accepted_at = coalesce(accepted_at, now()),
      preparing_at = coalesce(preparing_at, now()),
      revision = revision + 1,
      updated_by = actor_user_id,
      updated_at = now()
    where business_id = p_business_id
      and id = p_shipping_id
    returning *
    into shipping_row;
  else
    update public.business_shipping_orders
    set
      eta_minutes = coalesce(eta_minutes, p_eta_minutes),
      updated_by = actor_user_id,
      updated_at = now()
    where business_id = p_business_id
      and id = p_shipping_id
    returning *
    into shipping_row;
  end if;

  result_value := private.build_business_shipping_result(
    p_business_id,
    shipping_row.id
  );

  insert into public.business_shipping_operations (
    business_id,
    operation_key,
    shipping_id,
    order_id,
    operation_type,
    request_payload,
    result_snapshot,
    created_by
  ) values (
    p_business_id,
    normalized_key,
    shipping_row.id,
    shipping_row.order_id,
    'accept',
    request_value,
    result_value,
    actor_user_id
  );

  return result_value;
end;
$$;

create or replace function public.set_business_shipping_milestone(
  p_business_id uuid,
  p_shipping_id uuid,
  p_milestone text,
  p_operation_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  normalized_key text := btrim(coalesce(p_operation_key, ''));
  request_value jsonb;
  existing_operation public.business_shipping_operations%rowtype;
  shipping_row public.business_shipping_orders%rowtype;
  result_value jsonb;
begin
  if actor_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not private.current_user_has_module_access(
    p_business_id,
    'shipping',
    'manage'
  ) then
    raise exception 'Insufficient shipping permission.' using errcode = '42501';
  end if;

  if p_business_id is null
    or p_shipping_id is null
    or p_milestone not in ('ready', 'on_the_way')
    or char_length(normalized_key) not between 8 and 120 then
    raise exception 'Shipping milestone input is invalid.' using errcode = '22023';
  end if;

  request_value := jsonb_build_object(
    'shipping_id', p_shipping_id,
    'milestone', p_milestone
  );

  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text, 0));

  select operation.*
  into existing_operation
  from public.business_shipping_operations as operation
  where operation.business_id = p_business_id
    and operation.operation_key = normalized_key
  limit 1;

  if found then
    if existing_operation.operation_type = 'milestone'
      and existing_operation.shipping_id = p_shipping_id
      and existing_operation.request_payload = request_value then
      return existing_operation.result_snapshot;
    end if;
    raise exception 'Shipping operation key already exists with different data.'
      using errcode = '23505';
  end if;

  select shipping.*
  into shipping_row
  from public.business_shipping_orders as shipping
  where shipping.business_id = p_business_id
    and shipping.id = p_shipping_id
  for update;

  if not found then
    raise exception 'Shipping order is not available for this business.' using errcode = '42501';
  end if;

  if shipping_row.shipping_status <> 'confirmed'
    or shipping_row.needs_acceptance then
    raise exception 'Shipping milestone is not available.' using errcode = 'P0001';
  end if;

  if p_milestone = 'on_the_way'
    and shipping_row.order_kind <> 'delivery' then
    raise exception 'Pickup orders cannot be marked on the way.' using errcode = 'P0001';
  end if;

  update public.business_shipping_orders
  set
    ready_at = case
      when p_milestone = 'ready' then coalesce(ready_at, now())
      else ready_at
    end,
    on_the_way_at = case
      when p_milestone = 'on_the_way' then coalesce(on_the_way_at, now())
      else on_the_way_at
    end,
    updated_by = actor_user_id,
    updated_at = now()
  where business_id = p_business_id
    and id = p_shipping_id
  returning *
  into shipping_row;

  result_value := private.build_business_shipping_result(p_business_id, p_shipping_id);

  insert into public.business_shipping_operations (
    business_id,
    operation_key,
    shipping_id,
    order_id,
    operation_type,
    request_payload,
    result_snapshot,
    created_by
  ) values (
    p_business_id,
    normalized_key,
    shipping_row.id,
    shipping_row.order_id,
    'milestone',
    request_value,
    result_value,
    actor_user_id
  );

  return result_value;
end;
$$;

create or replace function public.cancel_business_shipping_order(
  p_business_id uuid,
  p_shipping_id uuid,
  p_return_stock boolean,
  p_operation_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  normalized_key text := btrim(coalesce(p_operation_key, ''));
  request_value jsonb;
  existing_operation public.business_shipping_operations%rowtype;
  shipping_row public.business_shipping_orders%rowtype;
  order_row public.business_orders%rowtype;
  source_record record;
  source_available integer;
  result_value jsonb;
begin
  if actor_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not private.current_user_has_module_access(
    p_business_id,
    'shipping',
    'manage'
  ) then
    raise exception 'Insufficient shipping permission.' using errcode = '42501';
  end if;

  if p_business_id is null
    or p_shipping_id is null
    or p_return_stock is null
    or char_length(normalized_key) not between 8 and 120 then
    raise exception 'Shipping cancellation input is invalid.' using errcode = '22023';
  end if;

  request_value := jsonb_build_object(
    'shipping_id', p_shipping_id,
    'return_stock', p_return_stock
  );

  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text, 0));

  select operation.*
  into existing_operation
  from public.business_shipping_operations as operation
  where operation.business_id = p_business_id
    and operation.operation_key = normalized_key
  limit 1;

  if found then
    if existing_operation.operation_type = 'cancel'
      and existing_operation.shipping_id = p_shipping_id
      and existing_operation.request_payload = request_value then
      return existing_operation.result_snapshot;
    end if;
    raise exception 'Shipping operation key already exists with different data.'
      using errcode = '23505';
  end if;

  select shipping.*
  into shipping_row
  from public.business_shipping_orders as shipping
  where shipping.business_id = p_business_id
    and shipping.id = p_shipping_id
  for update;

  if not found then
    raise exception 'Shipping order is not available for this business.' using errcode = '42501';
  end if;

  select target_order.*
  into order_row
  from public.business_orders as target_order
  where target_order.business_id = p_business_id
    and target_order.id = shipping_row.order_id
  for update;

  if shipping_row.shipping_status = 'completed'
    or order_row.status = 'completed' then
    raise exception 'Completed shipping orders cannot be cancelled.' using errcode = 'P0001';
  end if;

  if p_return_stock
    and not shipping_row.needs_acceptance then
    for source_record in
      select
        operation.id,
        operation.sold_quantity,
        coalesce(sum(returned.return_quantity), 0)::integer as returned_quantity
      from public.business_order_stock_operations as order_link
      join public.stock_recipe_operations as operation
        on operation.business_id = order_link.business_id
        and operation.id = order_link.stock_recipe_operation_id
      left join public.stock_recipe_return_operations as returned
        on returned.business_id = operation.business_id
        and returned.original_operation_id = operation.id
      where order_link.business_id = p_business_id
        and order_link.order_id = shipping_row.order_id
      group by operation.id, operation.sold_quantity
      having operation.sold_quantity > coalesce(sum(returned.return_quantity), 0)
      order by operation.id
    loop
      source_available := source_record.sold_quantity - source_record.returned_quantity;

      if source_available > 0 then
        perform private.apply_recipe_stock_return(
          p_business_id,
          source_record.id,
          source_available,
          'shipping',
          shipping_row.id::text,
          'shipping-cancel-return:'
            || md5(normalized_key || ':' || source_record.id::text),
          'Devolución por cancelación de Envíos',
          shipping_row.client_name,
          actor_user_id
        );
      end if;
    end loop;
  end if;

  if shipping_row.shipping_status <> 'cancelled' then
    update public.business_shipping_orders
    set
      shipping_status = 'cancelled',
      cancelled_at = coalesce(cancelled_at, now()),
      revision = revision + 1,
      updated_by = actor_user_id,
      updated_at = now()
    where business_id = p_business_id
      and id = p_shipping_id
    returning *
    into shipping_row;

    update public.business_orders
    set
      status = 'cancelled',
      revision = revision + 1,
      updated_by = actor_user_id,
      updated_at = now()
    where business_id = p_business_id
      and id = shipping_row.order_id
    returning *
    into order_row;
  end if;

  result_value := private.build_business_shipping_result(p_business_id, p_shipping_id);

  insert into public.business_shipping_operations (
    business_id,
    operation_key,
    shipping_id,
    order_id,
    operation_type,
    request_payload,
    result_snapshot,
    created_by
  ) values (
    p_business_id,
    normalized_key,
    shipping_row.id,
    shipping_row.order_id,
    'cancel',
    request_value,
    result_value,
    actor_user_id
  );

  return result_value;
end;
$$;

create or replace function public.complete_business_shipping_payment(
  p_business_id uuid,
  p_shipping_id uuid,
  p_payments jsonb,
  p_operation_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  normalized_key text := btrim(coalesce(p_operation_key, ''));
  normalized_payments jsonb;
  payment_count integer;
  payment_total numeric(12, 2);
  shipping_row public.business_shipping_orders%rowtype;
  order_row public.business_orders%rowtype;
  cash_session_row public.cash_sessions%rowtype;
  existing_operation public.business_payment_operations%rowtype;
  saved_operation public.business_payment_operations%rowtype;
  saved_result jsonb;
begin
  if actor_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not private.current_user_has_module_access(
    p_business_id,
    'shipping',
    'manage'
  ) or not private.current_user_has_module_access(
    p_business_id,
    'cash',
    'manage'
  ) then
    raise exception 'Shipping and cash manage permissions are required.'
      using errcode = '42501';
  end if;

  if p_business_id is null
    or p_shipping_id is null
    or p_payments is null
    or jsonb_typeof(p_payments) <> 'array'
    or char_length(normalized_key) not between 8 and 120 then
    raise exception 'Shipping payment input is invalid.' using errcode = '22023';
  end if;

  payment_count := jsonb_array_length(p_payments);

  if payment_count > 4 then
    raise exception 'Shipping payment contains too many methods.' using errcode = '22023';
  end if;

  if exists (
    select 1 from jsonb_array_elements(p_payments) as entry(value)
    where jsonb_typeof(entry.value) <> 'object'
  ) or exists (
    select 1
    from jsonb_array_elements(p_payments) as entry(value)
    cross join lateral jsonb_object_keys(entry.value) as field(key)
    where field.key not in ('method', 'amount')
  ) or exists (
    select 1
    from jsonb_array_elements(p_payments) as entry(value)
    where jsonb_typeof(entry.value -> 'method') is distinct from 'string'
      or jsonb_typeof(entry.value -> 'amount') is distinct from 'number'
      or (entry.value ->> 'method') not in (
        'cash', 'card', 'mercado_pago', 'transfer'
      )
      or (entry.value ->> 'amount')::numeric <= 0
      or (entry.value ->> 'amount')::numeric > 9999999999.99
      or (entry.value ->> 'amount')::numeric
        <> round((entry.value ->> 'amount')::numeric, 2)
  ) then
    raise exception 'Shipping payment entry is invalid.' using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_payments) as entry(value)
    group by entry.value ->> 'method'
    having count(*) > 1
  ) then
    raise exception 'Shipping payment contains duplicate methods.' using errcode = '22023';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'method', normalized.method,
        'amount', normalized.amount
      )
      order by normalized.method
    ),
    '[]'::jsonb
  )
  into normalized_payments
  from (
    select
      entry.value ->> 'method' as method,
      round((entry.value ->> 'amount')::numeric, 2)::numeric(12, 2) as amount
    from jsonb_array_elements(p_payments) as entry(value)
  ) as normalized;

  select coalesce(sum((entry.value ->> 'amount')::numeric), 0)::numeric(12, 2)
  into payment_total
  from jsonb_array_elements(normalized_payments) as entry(value);

  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text, 0));

  select operation.*
  into existing_operation
  from public.business_payment_operations as operation
  where operation.business_id = p_business_id
    and operation.operation_key = normalized_key
  limit 1;

  if found then
    if existing_operation.shipping_id = p_shipping_id
      and existing_operation.reservation_id is null
      and existing_operation.request_payload = normalized_payments then
      return existing_operation.result_snapshot;
    end if;
    raise exception 'Payment operation key already exists with different data.'
      using errcode = '23505';
  end if;

  select shipping.*
  into shipping_row
  from public.business_shipping_orders as shipping
  where shipping.business_id = p_business_id
    and shipping.id = p_shipping_id
  for update;

  if not found then
    raise exception 'Shipping order is not available for this business.' using errcode = '42501';
  end if;

  select target_order.*
  into order_row
  from public.business_orders as target_order
  where target_order.business_id = p_business_id
    and target_order.id = shipping_row.order_id
  for update;

  if shipping_row.shipping_status <> 'confirmed'
    or shipping_row.needs_acceptance
    or order_row.status <> 'open' then
    raise exception 'Shipping order is not ready for payment.' using errcode = 'P0001';
  end if;

  select session_row.*
  into cash_session_row
  from public.cash_sessions as session_row
  where session_row.business_id = p_business_id
    and session_row.business_date = shipping_row.business_date
  for update;

  if not found or cash_session_row.status <> 'open' then
    raise exception 'Cash session is not open for shipping date.' using errcode = 'P0001';
  end if;

  if order_row.subtotal = 0 then
    if payment_count <> 0 or payment_total <> 0 then
      raise exception 'Zero-total order must not contain payment entries.' using errcode = '23514';
    end if;
  elsif payment_count = 0
    or payment_total <> order_row.subtotal then
    raise exception 'Payment total must match canonical order subtotal.' using errcode = '23514';
  end if;

  insert into public.business_payment_operations (
    business_id,
    operation_key,
    order_id,
    reservation_id,
    shipping_id,
    cash_session_id,
    request_payload,
    result_snapshot,
    total_amount,
    created_by
  ) values (
    p_business_id,
    normalized_key,
    order_row.id,
    null,
    shipping_row.id,
    cash_session_row.id,
    normalized_payments,
    '{}'::jsonb,
    payment_total,
    actor_user_id
  )
  returning *
  into saved_operation;

  insert into public.business_payments (
    business_id,
    operation_id,
    order_id,
    reservation_id,
    shipping_id,
    cash_session_id,
    payment_method,
    amount,
    created_by
  )
  select
    p_business_id,
    saved_operation.id,
    order_row.id,
    null,
    shipping_row.id,
    cash_session_row.id,
    entry.value ->> 'method',
    (entry.value ->> 'amount')::numeric(12, 2),
    actor_user_id
  from jsonb_array_elements(normalized_payments) as entry(value);

  update public.business_orders
  set
    status = 'completed',
    revision = revision + 1,
    updated_by = actor_user_id,
    updated_at = now()
  where business_id = p_business_id
    and id = order_row.id
  returning *
  into order_row;

  update public.business_shipping_orders
  set
    shipping_status = 'completed',
    completed_at = coalesce(completed_at, now()),
    revision = revision + 1,
    updated_by = actor_user_id,
    updated_at = now()
  where business_id = p_business_id
    and id = p_shipping_id
  returning *
  into shipping_row;

  saved_result := jsonb_build_object(
    'operationId', saved_operation.id,
    'cashSessionId', cash_session_row.id,
    'shipping', private.build_business_shipping_result(
      p_business_id,
      p_shipping_id
    ),
    'totalAmount', payment_total
  );

  update public.business_payment_operations
  set result_snapshot = saved_result
  where business_id = p_business_id
    and id = saved_operation.id;

  return saved_result;
end;
$$;

create or replace function public.get_business_shipping_kitchen_snapshot(
  p_business_id uuid,
  p_business_date date
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  result_value jsonb;
begin
  if actor_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if p_business_id is null
    or p_business_date is null then
    raise exception 'Shipping kitchen snapshot input is invalid.' using errcode = '22023';
  end if;

  if not private.current_user_has_module_access(
    p_business_id,
    'kitchen',
    'view'
  ) then
    raise exception 'Insufficient kitchen permission.' using errcode = '42501';
  end if;

  with ticket_allocations as (
    select
      item.business_id,
      item.order_id,
      item.menu_item_id,
      sum(item.quantity)::integer as allocated_quantity
    from public.business_kitchen_ticket_items as item
    join public.business_kitchen_tickets as ticket
      on ticket.business_id = item.business_id
      and ticket.id = item.ticket_id
      and ticket.order_id = item.order_id
    where item.business_id = p_business_id
      and ticket.voided_at is null
      and ticket.order_kind in ('delivery', 'pickup')
    group by item.business_id, item.order_id, item.menu_item_id
  ),
  base_items as (
    select
      order_item.business_id,
      order_item.order_id,
      order_item.menu_item_id,
      order_item.name_snapshot,
      greatest(
        0,
        order_item.quantity - coalesce(allocation.allocated_quantity, 0)
      )::integer as quantity,
      private.kitchen_recipe_target_seconds(
        order_item.business_id,
        order_item.menu_item_id
      ) as preparation_time_seconds
    from public.business_order_items as order_item
    left join ticket_allocations as allocation
      on allocation.business_id = order_item.business_id
      and allocation.order_id = order_item.order_id
      and allocation.menu_item_id = order_item.menu_item_id
    where order_item.business_id = p_business_id
      and order_item.order_kind in ('delivery', 'pickup')
  ),
  base_commands as (
    select
      'order:' || order_row.id::text as command_id,
      order_row.id as order_id,
      shipping.id as shipping_id,
      null::uuid as ticket_id,
      'delivery'::text as source,
      case
        when shipping.order_kind = 'delivery' then 'Delivery'
        else 'Retiro'
      end as source_label,
      shipping.client_name as client,
      to_char(shipping.scheduled_time, 'HH24:MI') as service_time,
      shipping.note,
      order_row.kitchen_status,
      coalesce(
        order_row.kitchen_target_seconds,
        max(base_item.preparation_time_seconds)
      )::integer as target_seconds,
      coalesce(shipping.preparing_at, shipping.accepted_at, shipping.created_at) as entered_at,
      order_row.kitchen_started_at as started_at,
      order_row.kitchen_ready_at as ready_at,
      order_row.kitchen_completed_at as completed_at,
      false as is_addition,
      jsonb_agg(
        jsonb_build_object(
          'menuItemId', base_item.menu_item_id,
          'name', base_item.name_snapshot,
          'quantity', base_item.quantity
        )
        order by base_item.name_snapshot, base_item.menu_item_id
      ) as items
    from public.business_shipping_orders as shipping
    join public.business_orders as order_row
      on order_row.business_id = shipping.business_id
      and order_row.id = shipping.order_id
      and order_row.order_kind = shipping.order_kind
    join base_items as base_item
      on base_item.business_id = order_row.business_id
      and base_item.order_id = order_row.id
      and base_item.quantity > 0
    where shipping.business_id = p_business_id
      and shipping.business_date = p_business_date
      and shipping.needs_acceptance = false
      and shipping.shipping_status in ('confirmed', 'completed')
    group by
      shipping.id,
      shipping.order_kind,
      shipping.client_name,
      shipping.scheduled_time,
      shipping.note,
      shipping.preparing_at,
      shipping.accepted_at,
      shipping.created_at,
      order_row.id,
      order_row.kitchen_status,
      order_row.kitchen_target_seconds,
      order_row.kitchen_started_at,
      order_row.kitchen_ready_at,
      order_row.kitchen_completed_at
  ),
  ticket_commands as (
    select
      'ticket:' || ticket.id::text as command_id,
      ticket.order_id,
      shipping.id as shipping_id,
      ticket.id as ticket_id,
      'delivery'::text as source,
      case
        when shipping.order_kind = 'delivery' then 'Delivery'
        else 'Retiro'
      end as source_label,
      shipping.client_name as client,
      to_char(shipping.scheduled_time, 'HH24:MI') as service_time,
      shipping.note,
      ticket.status as kitchen_status,
      ticket.target_seconds,
      ticket.entered_at,
      ticket.started_at,
      ticket.ready_at,
      ticket.completed_at,
      true as is_addition,
      jsonb_agg(
        jsonb_build_object(
          'menuItemId', item.menu_item_id,
          'name', item.name_snapshot,
          'quantity', item.quantity
        )
        order by item.name_snapshot, item.menu_item_id
      ) as items
    from public.business_kitchen_tickets as ticket
    join public.business_shipping_orders as shipping
      on shipping.business_id = ticket.business_id
      and shipping.order_id = ticket.order_id
      and shipping.order_kind = ticket.order_kind
    join public.business_kitchen_ticket_items as item
      on item.business_id = ticket.business_id
      and item.ticket_id = ticket.id
      and item.order_id = ticket.order_id
    where ticket.business_id = p_business_id
      and ticket.order_kind in ('delivery', 'pickup')
      and ticket.voided_at is null
      and shipping.business_date = p_business_date
      and shipping.needs_acceptance = false
      and shipping.shipping_status in ('confirmed', 'completed')
    group by
      ticket.id,
      ticket.order_id,
      ticket.status,
      ticket.target_seconds,
      ticket.entered_at,
      ticket.started_at,
      ticket.ready_at,
      ticket.completed_at,
      shipping.id,
      shipping.order_kind,
      shipping.client_name,
      shipping.scheduled_time,
      shipping.note
  ),
  all_commands as (
    select * from base_commands
    union all
    select * from ticket_commands
  )
  select jsonb_build_object(
    'businessDate', p_business_date,
    'commands', coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id', command.command_id,
          'orderId', command.order_id,
          'shippingId', command.shipping_id,
          'ticketId', command.ticket_id,
          'source', command.source,
          'sourceLabel', command.source_label,
          'client', command.client,
          'time', command.service_time,
          'note', command.note,
          'items', command.items,
          'status', command.kitchen_status,
          'targetSeconds', command.target_seconds,
          'enteredAt', command.entered_at,
          'startedAt', command.started_at,
          'readyAt', command.ready_at,
          'completedAt', command.completed_at,
          'isAddition', command.is_addition
        )
        order by command.entered_at, command.command_id
      ),
      '[]'::jsonb
    )
  )
  into result_value
  from all_commands as command;

  return coalesce(
    result_value,
    jsonb_build_object(
      'businessDate', p_business_date,
      'commands', '[]'::jsonb
    )
  );
end;
$$;

create or replace function public.set_business_shipping_kitchen_command_status(
  p_business_id uuid,
  p_order_id uuid,
  p_ticket_id uuid,
  p_status text,
  p_operation_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  order_row public.business_orders%rowtype;
  shipping_row public.business_shipping_orders%rowtype;
  ticket_row public.business_kitchen_tickets%rowtype;
  existing_operation public.business_kitchen_operations%rowtype;
  current_status text;
  result_value jsonb;
  target_seconds integer;
begin
  if actor_user_id is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not private.current_user_has_module_access(
    p_business_id,
    'kitchen',
    'manage'
  ) then
    raise exception 'Insufficient kitchen permission.' using errcode = '42501';
  end if;

  if p_business_id is null
    or p_order_id is null
    or p_status not in ('pending', 'preparing', 'ready', 'completed')
    or char_length(btrim(coalesce(p_operation_key, ''))) not between 8 and 120 then
    raise exception 'Shipping kitchen status input is invalid.' using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(p_business_id::text, 0));

  select operation.*
  into existing_operation
  from public.business_kitchen_operations as operation
  where operation.business_id = p_business_id
    and operation.operation_key = btrim(p_operation_key)
  limit 1;

  if found then
    if existing_operation.order_id = p_order_id
      and existing_operation.ticket_id is not distinct from p_ticket_id
      and existing_operation.requested_status = p_status then
      return existing_operation.result_snapshot;
    end if;
    raise exception 'Kitchen operation key already exists with different data.'
      using errcode = '23505';
  end if;

  select target_order.*
  into order_row
  from public.business_orders as target_order
  where target_order.business_id = p_business_id
    and target_order.id = p_order_id
  for update;

  if not found
    or order_row.order_kind not in ('delivery', 'pickup') then
    raise exception 'Shipping kitchen order is not available for this business.'
      using errcode = '42501';
  end if;

  select shipping.*
  into shipping_row
  from public.business_shipping_orders as shipping
  where shipping.business_id = p_business_id
    and shipping.order_id = p_order_id
  for update;

  if not found
    or shipping_row.needs_acceptance
    or shipping_row.shipping_status <> 'confirmed' then
    raise exception 'Shipping kitchen order is not active.' using errcode = 'P0001';
  end if;

  if p_ticket_id is null then
    current_status := order_row.kitchen_status;

    if current_status <> p_status
      and not (
        (current_status = 'pending' and p_status = 'preparing')
        or (current_status = 'preparing' and p_status = 'ready')
        or (current_status = 'ready' and p_status = 'preparing')
        or (current_status = 'ready' and p_status = 'completed')
      ) then
      raise exception 'Kitchen status transition is not allowed.' using errcode = 'P0001';
    end if;

    if current_status = 'pending'
      and p_status = 'preparing'
      and order_row.kitchen_target_seconds is null then
      select coalesce(
        max(private.kitchen_recipe_target_seconds(item.business_id, item.menu_item_id)),
        900
      )
      into target_seconds
      from public.business_order_items as item
      where item.business_id = p_business_id
        and item.order_id = p_order_id;
    else
      target_seconds := coalesce(order_row.kitchen_target_seconds, 900);
    end if;

    if current_status <> p_status then
      update public.business_orders
      set
        kitchen_status = p_status,
        kitchen_started_at = case
          when p_status = 'preparing' then coalesce(kitchen_started_at, now())
          else kitchen_started_at
        end,
        kitchen_ready_at = case
          when p_status = 'ready' then now()
          when p_status = 'preparing' then null
          else kitchen_ready_at
        end,
        kitchen_completed_at = case
          when p_status = 'completed' then now()
          when p_status = 'preparing' then null
          else kitchen_completed_at
        end,
        kitchen_target_seconds = coalesce(kitchen_target_seconds, target_seconds),
        updated_by = actor_user_id,
        updated_at = now()
      where business_id = p_business_id
        and id = p_order_id
      returning *
      into order_row;
    end if;

    result_value := jsonb_build_object(
      'orderId', order_row.id,
      'ticketId', null,
      'status', order_row.kitchen_status,
      'targetSeconds', coalesce(order_row.kitchen_target_seconds, target_seconds, 900),
      'startedAt', order_row.kitchen_started_at,
      'readyAt', order_row.kitchen_ready_at,
      'completedAt', order_row.kitchen_completed_at
    );
  else
    select ticket.*
    into ticket_row
    from public.business_kitchen_tickets as ticket
    where ticket.business_id = p_business_id
      and ticket.order_id = p_order_id
      and ticket.id = p_ticket_id
      and ticket.order_kind in ('delivery', 'pickup')
      and ticket.voided_at is null
    for update;

    if not found then
      raise exception 'Shipping kitchen ticket is not available for this business.'
        using errcode = '42501';
    end if;

    current_status := ticket_row.status;

    if current_status <> p_status
      and not (
        (current_status = 'pending' and p_status = 'preparing')
        or (current_status = 'preparing' and p_status = 'ready')
        or (current_status = 'ready' and p_status = 'preparing')
        or (current_status = 'ready' and p_status = 'completed')
      ) then
      raise exception 'Kitchen status transition is not allowed.' using errcode = 'P0001';
    end if;

    if current_status <> p_status then
      update public.business_kitchen_tickets
      set
        status = p_status,
        started_at = case
          when p_status = 'preparing' then coalesce(started_at, now())
          else started_at
        end,
        ready_at = case
          when p_status = 'ready' then now()
          when p_status = 'preparing' then null
          else ready_at
        end,
        completed_at = case
          when p_status = 'completed' then now()
          when p_status = 'preparing' then null
          else completed_at
        end,
        updated_by = actor_user_id,
        updated_at = now()
      where business_id = p_business_id
        and id = p_ticket_id
      returning *
      into ticket_row;
    end if;

    result_value := jsonb_build_object(
      'orderId', ticket_row.order_id,
      'ticketId', ticket_row.id,
      'status', ticket_row.status,
      'targetSeconds', ticket_row.target_seconds,
      'startedAt', ticket_row.started_at,
      'readyAt', ticket_row.ready_at,
      'completedAt', ticket_row.completed_at
    );
  end if;

  insert into public.business_kitchen_operations (
    business_id,
    operation_key,
    order_id,
    ticket_id,
    requested_status,
    result_snapshot,
    created_by
  ) values (
    p_business_id,
    btrim(p_operation_key),
    p_order_id,
    p_ticket_id,
    p_status,
    result_value,
    actor_user_id
  );

  return result_value;
end;
$$;

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

grant execute on function public.get_business_shipping_snapshot(
  uuid, date, date
) to authenticated;
grant execute on function public.save_business_shipping_order(
  uuid, uuid, date, time without time zone, text, text, text, text,
  text, text, boolean, text, jsonb, text
) to authenticated;
grant execute on function public.accept_business_shipping_order(
  uuid, uuid, integer, text
) to authenticated;
grant execute on function public.set_business_shipping_milestone(
  uuid, uuid, text, text
) to authenticated;
grant execute on function public.cancel_business_shipping_order(
  uuid, uuid, boolean, text
) to authenticated;
grant execute on function public.complete_business_shipping_payment(
  uuid, uuid, jsonb, text
) to authenticated;
grant execute on function public.get_business_shipping_kitchen_snapshot(
  uuid, date
) to authenticated;
grant execute on function public.set_business_shipping_kitchen_command_status(
  uuid, uuid, uuid, text, text
) to authenticated;

commit;
