begin;

alter table public.reservations
  add column if not exists consumption_started_at timestamptz;

do $$
begin
  if not exists (
    select 1
    from pg_class as index_relation
    join pg_namespace as namespace
      on namespace.oid = index_relation.relnamespace
    join pg_index as index_definition
      on index_definition.indexrelid = index_relation.oid
    where namespace.nspname = 'public'
      and index_relation.relname = 'reservations_business_id_id_key'
      and index_definition.indrelid = 'public.reservations'::regclass
      and index_definition.indisunique
      and index_definition.indpred is null
  ) then
    create unique index reservations_business_id_id_key
      on public.reservations (business_id, id);
  end if;
end;
$$;

create table if not exists public.business_orders (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  order_kind text not null default 'dine_in',
  reservation_id uuid,
  status text not null default 'open',
  revision integer not null default 1,
  subtotal numeric(12, 2) not null default 0,
  created_by uuid
    references auth.users(id) on delete set null,
  updated_by uuid
    references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_orders_business_id_id_key
    unique (business_id, id),
  constraint business_orders_business_id_id_kind_key
    unique (business_id, id, order_kind),
  constraint business_orders_reservation_tenant_fk
    foreign key (business_id, reservation_id)
    references public.reservations(business_id, id)
    on delete restrict,
  constraint business_orders_kind_check
    check (order_kind in ('dine_in', 'delivery', 'pickup')),
  constraint business_orders_status_check
    check (status in ('open', 'completed', 'cancelled')),
  constraint business_orders_revision_check
    check (revision between 1 and 2147483647),
  constraint business_orders_subtotal_check
    check (subtotal between 0 and 9999999999.99),
  constraint business_orders_reservation_kind_check
    check (
      (order_kind = 'dine_in' and reservation_id is not null)
      or (order_kind in ('delivery', 'pickup'))
    )
);

create unique index if not exists
  business_orders_business_reservation_key
on public.business_orders (
  business_id,
  reservation_id
)
where reservation_id is not null;

create index if not exists
  business_orders_business_kind_updated_idx
on public.business_orders (
  business_id,
  order_kind,
  updated_at desc
);

create table if not exists public.business_order_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  order_id uuid not null,
  order_kind text not null,
  menu_item_id uuid not null,
  name_snapshot text not null,
  unit_price_snapshot numeric(12, 2) not null,
  quantity integer not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_order_items_business_id_id_key
    unique (business_id, id),
  constraint business_order_items_order_tenant_fk
    foreign key (business_id, order_id, order_kind)
    references public.business_orders(business_id, id, order_kind)
    on delete cascade,
  constraint business_order_items_menu_item_tenant_fk
    foreign key (business_id, menu_item_id)
    references public.menu_items(business_id, id)
    on delete restrict,
  constraint business_order_items_order_menu_key
    unique (business_id, order_id, menu_item_id),
  constraint business_order_items_kind_check
    check (order_kind in ('dine_in', 'delivery', 'pickup')),
  constraint business_order_items_name_length_check
    check (char_length(btrim(name_snapshot)) between 1 and 160),
  constraint business_order_items_price_check
    check (unit_price_snapshot between 0 and 9999999999.99),
  constraint business_order_items_quantity_check
    check (quantity between 1 and 9999)
);

create index if not exists
  business_order_items_business_order_idx
on public.business_order_items (
  business_id,
  order_id,
  menu_item_id
);

create table if not exists public.business_order_mutations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  operation_key text not null,
  order_id uuid not null,
  reservation_id uuid not null,
  request_payload jsonb not null,
  result_snapshot jsonb not null,
  created_by uuid
    references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint business_order_mutations_business_id_id_key
    unique (business_id, id),
  constraint business_order_mutations_business_key
    unique (business_id, operation_key),
  constraint business_order_mutations_order_tenant_fk
    foreign key (business_id, order_id)
    references public.business_orders(business_id, id)
    on delete restrict,
  constraint business_order_mutations_reservation_tenant_fk
    foreign key (business_id, reservation_id)
    references public.reservations(business_id, id)
    on delete restrict,
  constraint business_order_mutations_key_length_check
    check (char_length(operation_key) between 8 and 120),
  constraint business_order_mutations_request_array_check
    check (jsonb_typeof(request_payload) = 'array'),
  constraint business_order_mutations_result_object_check
    check (jsonb_typeof(result_snapshot) = 'object')
);

create table if not exists public.business_order_stock_operations (
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  order_id uuid not null,
  menu_item_id uuid not null,
  stock_recipe_operation_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (
    business_id,
    order_id,
    stock_recipe_operation_id
  ),
  constraint business_order_stock_operations_order_tenant_fk
    foreign key (business_id, order_id)
    references public.business_orders(business_id, id)
    on delete restrict,
  constraint business_order_stock_operations_menu_item_tenant_fk
    foreign key (business_id, menu_item_id)
    references public.menu_items(business_id, id)
    on delete restrict,
  constraint business_order_stock_operations_recipe_operation_tenant_fk
    foreign key (business_id, stock_recipe_operation_id)
    references public.stock_recipe_operations(business_id, id)
    on delete restrict
);

create index if not exists
  business_order_stock_operations_order_item_idx
on public.business_order_stock_operations (
  business_id,
  order_id,
  menu_item_id,
  created_at desc
);

create table if not exists public.stock_recipe_return_operations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  operation_key text not null,
  original_operation_id uuid not null,
  return_quantity integer not null,
  origin text not null,
  reference_id text not null,
  label text not null,
  detail text not null default '',
  created_by uuid
    references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint stock_recipe_return_operations_business_id_id_key
    unique (business_id, id),
  constraint stock_recipe_return_operations_business_key
    unique (business_id, operation_key),
  constraint stock_recipe_return_operations_original_tenant_fk
    foreign key (business_id, original_operation_id)
    references public.stock_recipe_operations(business_id, id)
    on delete restrict,
  constraint stock_recipe_return_operations_key_length_check
    check (char_length(operation_key) between 1 and 120),
  constraint stock_recipe_return_operations_quantity_check
    check (return_quantity between 1 and 9999),
  constraint stock_recipe_return_operations_origin_check
    check (origin in ('reservation', 'shipping', 'recipe')),
  constraint stock_recipe_return_operations_reference_length_check
    check (char_length(reference_id) between 1 and 160),
  constraint stock_recipe_return_operations_label_length_check
    check (char_length(btrim(label)) between 1 and 160),
  constraint stock_recipe_return_operations_detail_length_check
    check (char_length(detail) <= 2000)
);

create index if not exists
  stock_recipe_return_operations_original_idx
on public.stock_recipe_return_operations (
  business_id,
  original_operation_id,
  created_at
);

create table if not exists public.stock_recipe_return_operation_movements (
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  return_operation_id uuid not null,
  source_stock_movement_id uuid not null,
  return_stock_movement_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (
    business_id,
    return_operation_id,
    source_stock_movement_id
  ),
  constraint stock_recipe_return_movements_operation_tenant_fk
    foreign key (business_id, return_operation_id)
    references public.stock_recipe_return_operations(business_id, id)
    on delete cascade,
  constraint stock_recipe_return_movements_source_tenant_fk
    foreign key (business_id, source_stock_movement_id)
    references public.stock_movements(business_id, id)
    on delete restrict,
  constraint stock_recipe_return_movements_return_tenant_fk
    foreign key (business_id, return_stock_movement_id)
    references public.stock_movements(business_id, id)
    on delete restrict
);

create unique index if not exists
  stock_recipe_return_movements_return_key
on public.stock_recipe_return_operation_movements (
  business_id,
  return_stock_movement_id
);

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

drop policy if exists
  business_orders_select_domain_member
on public.business_orders;

create policy business_orders_select_domain_member
on public.business_orders
for select
to authenticated
using (
  case order_kind
    when 'dine_in' then (
      select private.current_user_has_module_access(
        business_id,
        'reservations',
        'view'
      )
    )
    when 'delivery' then (
      select private.current_user_has_module_access(
        business_id,
        'shipping',
        'view'
      )
    )
    when 'pickup' then (
      select private.current_user_has_module_access(
        business_id,
        'shipping',
        'view'
      )
    )
    else false
  end
);

drop policy if exists
  business_order_items_select_domain_member
on public.business_order_items;

create policy business_order_items_select_domain_member
on public.business_order_items
for select
to authenticated
using (
  case order_kind
    when 'dine_in' then (
      select private.current_user_has_module_access(
        business_id,
        'reservations',
        'view'
      )
    )
    when 'delivery' then (
      select private.current_user_has_module_access(
        business_id,
        'shipping',
        'view'
      )
    )
    when 'pickup' then (
      select private.current_user_has_module_access(
        business_id,
        'shipping',
        'view'
      )
    )
    else false
  end
);

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

grant select on table public.business_orders
  to authenticated;
grant select on table public.business_order_items
  to authenticated;

create or replace function private.apply_recipe_stock_return(
  p_business_id uuid,
  p_original_operation_id uuid,
  p_quantity integer,
  p_origin text,
  p_reference_id text,
  p_operation_key text,
  p_label text,
  p_detail text,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  original_operation public.stock_recipe_operations%rowtype;
  existing_return public.stock_recipe_return_operations%rowtype;
  saved_return public.stock_recipe_return_operations%rowtype;
  source_movement public.stock_movements%rowtype;
  saved_movement public.stock_movements%rowtype;
  already_returned integer;
  cumulative_returned integer;
  already_returned_movement numeric(14, 3);
  target_returned_movement numeric(14, 3);
  delta_to_return numeric(14, 3);
begin
  if p_actor_user_id is null then
    raise exception 'Recipe stock return requires an actor.'
      using errcode = '42501';
  end if;

  if p_business_id is null
    or p_original_operation_id is null
    or p_quantity is null
    or p_quantity < 1
    or p_quantity > 9999
    or p_origin not in ('reservation', 'shipping', 'recipe')
    or p_reference_id is null
    or char_length(btrim(p_reference_id)) < 1
    or char_length(btrim(p_reference_id)) > 160
    or p_operation_key is null
    or char_length(btrim(p_operation_key)) < 1
    or char_length(btrim(p_operation_key)) > 120
    or p_label is null
    or char_length(btrim(p_label)) < 1
    or char_length(btrim(p_label)) > 160
    or char_length(coalesce(p_detail, '')) > 2000 then
    raise exception 'Recipe stock return input is invalid.'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text, 0)
  );

  select returned.*
  into existing_return
  from public.stock_recipe_return_operations as returned
  where returned.business_id = p_business_id
    and returned.operation_key = btrim(p_operation_key)
  limit 1;

  if found then
    if existing_return.original_operation_id = p_original_operation_id
      and existing_return.return_quantity = p_quantity
      and existing_return.origin = p_origin
      and existing_return.reference_id = btrim(p_reference_id) then
      return jsonb_build_object(
        'operation',
        to_jsonb(existing_return),
        'movements',
        coalesce(
          (
            select jsonb_agg(
              to_jsonb(movement)
              order by movement.created_at, movement.id
            )
            from public.stock_recipe_return_operation_movements as link
            join public.stock_movements as movement
              on movement.business_id = link.business_id
              and movement.id = link.return_stock_movement_id
            where link.business_id = p_business_id
              and link.return_operation_id = existing_return.id
          ),
          '[]'::jsonb
        )
      );
    end if;

    raise exception 'Recipe stock return operation key already exists with different data.'
      using errcode = '23505';
  end if;

  select operation.*
  into original_operation
  from public.stock_recipe_operations as operation
  where operation.business_id = p_business_id
    and operation.id = p_original_operation_id
  for update;

  if not found then
    raise exception 'Original recipe stock operation is not available.'
      using errcode = '23503';
  end if;

  if original_operation.origin <> p_origin
    or original_operation.reference_id <> btrim(p_reference_id) then
    raise exception 'Recipe stock return does not match its source operation.'
      using errcode = '23514';
  end if;

  select coalesce(sum(returned.return_quantity), 0)::integer
  into already_returned
  from public.stock_recipe_return_operations as returned
  where returned.business_id = p_business_id
    and returned.original_operation_id = original_operation.id;

  cumulative_returned := already_returned + p_quantity;

  if cumulative_returned > original_operation.sold_quantity then
    raise exception 'Recipe stock return exceeds original sold quantity.'
      using errcode = '23514';
  end if;

  insert into public.stock_recipe_return_operations (
    business_id,
    operation_key,
    original_operation_id,
    return_quantity,
    origin,
    reference_id,
    label,
    detail,
    created_by
  )
  values (
    p_business_id,
    btrim(p_operation_key),
    original_operation.id,
    p_quantity,
    p_origin,
    btrim(p_reference_id),
    btrim(p_label),
    coalesce(btrim(p_detail), ''),
    p_actor_user_id
  )
  returning *
  into saved_return;

  for source_movement in
    select movement.*
    from public.stock_recipe_operation_movements as link
    join public.stock_movements as movement
      on movement.business_id = link.business_id
      and movement.id = link.stock_movement_id
    where link.business_id = p_business_id
      and link.operation_id = original_operation.id
    order by movement.product_id, movement.id
  loop
    select coalesce(
      sum(returned_movement.quantity_delta),
      0
    )
    into already_returned_movement
    from public.stock_recipe_return_operation_movements as return_link
    join public.stock_movements as returned_movement
      on returned_movement.business_id = return_link.business_id
      and returned_movement.id = return_link.return_stock_movement_id
    join public.stock_recipe_return_operations as return_operation
      on return_operation.business_id = return_link.business_id
      and return_operation.id = return_link.return_operation_id
    where return_link.business_id = p_business_id
      and return_link.source_stock_movement_id = source_movement.id
      and return_operation.original_operation_id = original_operation.id;

    target_returned_movement :=
      round(
        abs(source_movement.quantity_delta)
        * cumulative_returned
        / original_operation.sold_quantity,
        3
      );

    delta_to_return :=
      target_returned_movement
      - already_returned_movement;

    if delta_to_return > 0 then
      insert into public.stock_movements (
        business_id,
        product_id,
        movement_type,
        origin,
        quantity_delta,
        product_name_snapshot,
        unit_snapshot,
        unit_cost_snapshot,
        operation_key,
        reference_id,
        label,
        detail,
        created_by
      )
      values (
        p_business_id,
        source_movement.product_id,
        'return',
        p_origin,
        delta_to_return,
        source_movement.product_name_snapshot,
        source_movement.unit_snapshot,
        source_movement.unit_cost_snapshot,
        'recipe-return:'
          || saved_return.id::text
          || ':'
          || source_movement.id::text,
        btrim(p_reference_id),
        btrim(p_label),
        coalesce(btrim(p_detail), ''),
        p_actor_user_id
      )
      returning *
      into saved_movement;

      insert into public.stock_recipe_return_operation_movements (
        business_id,
        return_operation_id,
        source_stock_movement_id,
        return_stock_movement_id
      )
      values (
        p_business_id,
        saved_return.id,
        source_movement.id,
        saved_movement.id
      );
    end if;
  end loop;

  return jsonb_build_object(
    'operation',
    to_jsonb(saved_return),
    'movements',
    coalesce(
      (
        select jsonb_agg(
          to_jsonb(movement)
          order by movement.created_at, movement.id
        )
        from public.stock_recipe_return_operation_movements as link
        join public.stock_movements as movement
          on movement.business_id = link.business_id
          and movement.id = link.return_stock_movement_id
        where link.business_id = p_business_id
          and link.return_operation_id = saved_return.id
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function private.apply_recipe_stock_return(
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

create or replace function private.guard_reservation_terminal_with_consumption()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.status is distinct from old.status
    and new.status in ('completed', 'cancelled', 'no_show')
    and exists (
      select 1
      from public.business_orders as order_row
      join public.business_order_items as item
        on item.business_id = order_row.business_id
        and item.order_id = order_row.id
      where order_row.business_id = new.business_id
        and order_row.reservation_id = new.id
        and order_row.order_kind = 'dine_in'
        and order_row.status = 'open'
    ) then
    raise exception 'Reservation has open persistent consumption.'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function private.guard_reservation_terminal_with_consumption()
  from public, anon, authenticated;

drop trigger if exists
  reservations_guard_terminal_with_consumption
on public.reservations;

create trigger reservations_guard_terminal_with_consumption
before update of status
on public.reservations
for each row
execute function private.guard_reservation_terminal_with_consumption();

create or replace function public.save_business_reservation_consumption(
  p_business_id uuid,
  p_reservation_id uuid,
  p_items jsonb,
  p_operation_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid;
  reservation_row public.reservations%rowtype;
  current_order public.business_orders%rowtype;
  existing_mutation public.business_order_mutations%rowtype;
  menu_item_row public.menu_items%rowtype;
  diff_record record;
  source_record record;
  normalized_items jsonb;
  saved_result jsonb;
  consume_result jsonb;
  remaining_return integer;
  source_available integer;
  quantity_to_return integer;
  item_count integer;
  subtotal_value numeric(12, 2);
  has_change boolean := false;
  order_was_created boolean := false;
begin
  actor_user_id := (select auth.uid());

  if actor_user_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not private.current_user_has_module_access(
    p_business_id,
    'reservations',
    'manage'
  ) then
    raise exception 'Insufficient reservation permission.'
      using errcode = '42501';
  end if;

  if p_business_id is null
    or p_reservation_id is null
    or p_items is null
    or jsonb_typeof(p_items) <> 'array'
    or p_operation_key is null
    or char_length(btrim(p_operation_key)) not between 8 and 120 then
    raise exception 'Reservation consumption input is invalid.'
      using errcode = '22023';
  end if;

  item_count := jsonb_array_length(p_items);

  if item_count > 100 then
    raise exception 'Reservation consumption contains too many items.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as entry(value)
    where jsonb_typeof(entry.value) <> 'object'
  ) then
    raise exception 'Reservation consumption items must be objects.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as entry(value)
    cross join lateral jsonb_object_keys(entry.value) as field(key)
    where field.key not in ('menu_item_id', 'quantity')
  ) then
    raise exception 'Reservation consumption item contains unknown fields.'
      using errcode = '22023';
  end if;

  if exists (
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
    raise exception 'Reservation consumption item is invalid.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as entry(value)
    group by lower(entry.value ->> 'menu_item_id')
    having count(*) > 1
  ) then
    raise exception 'Reservation consumption contains duplicate menu items.'
      using errcode = '22023';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'menu_item_id',
        normalized.menu_item_id::text,
        'quantity',
        normalized.quantity
      )
      order by normalized.menu_item_id
    ),
    '[]'::jsonb
  )
  into normalized_items
  from (
    select
      (entry.value ->> 'menu_item_id')::uuid as menu_item_id,
      (entry.value ->> 'quantity')::integer as quantity
    from jsonb_array_elements(p_items) as entry(value)
  ) as normalized;

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text, 0)
  );

  select mutation.*
  into existing_mutation
  from public.business_order_mutations as mutation
  where mutation.business_id = p_business_id
    and mutation.operation_key = btrim(p_operation_key)
  limit 1;

  if found then
    if existing_mutation.reservation_id = p_reservation_id
      and existing_mutation.request_payload = normalized_items then
      return existing_mutation.result_snapshot;
    end if;

    raise exception 'Reservation consumption operation key already exists with different data.'
      using errcode = '23505';
  end if;

  select reservation.*
  into reservation_row
  from public.reservations as reservation
  where reservation.business_id = p_business_id
    and reservation.id = p_reservation_id
  for update;

  if not found then
    raise exception 'Reservation is not available for this business.'
      using errcode = '42501';
  end if;

  if reservation_row.status <> 'confirmed' then
    raise exception 'Reservation must be confirmed before recording consumption.'
      using errcode = 'P0001';
  end if;

  if not exists (
    select 1
    from public.reservation_table_assignments as assignment
    where assignment.business_id = p_business_id
      and assignment.reservation_id = p_reservation_id
  ) then
    raise exception 'Reservation requires an assigned table before recording consumption.'
      using errcode = 'P0001';
  end if;

  select order_row.*
  into current_order
  from public.business_orders as order_row
  where order_row.business_id = p_business_id
    and order_row.reservation_id = p_reservation_id
  for update;

  if not found then
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
      'dine_in',
      p_reservation_id,
      'open',
      1,
      0,
      actor_user_id,
      actor_user_id
    )
    returning *
    into current_order;

    order_was_created := true;
  elsif current_order.order_kind <> 'dine_in'
    or current_order.status <> 'open' then
    raise exception 'Reservation order is not open for consumption.'
      using errcode = 'P0001';
  end if;

  for diff_record in
    select
      current_item.menu_item_id,
      current_item.name_snapshot,
      current_item.quantity
        - coalesce(target.quantity, 0) as quantity_to_remove
    from public.business_order_items as current_item
    left join jsonb_to_recordset(normalized_items)
      as target(menu_item_id text, quantity integer)
      on target.menu_item_id::uuid = current_item.menu_item_id
    where current_item.business_id = p_business_id
      and current_item.order_id = current_order.id
      and current_item.quantity > coalesce(target.quantity, 0)
    order by current_item.menu_item_id
  loop
    has_change := true;
    remaining_return := diff_record.quantity_to_remove;

    for source_record in
      select
        operation.id,
        operation.sold_quantity,
        operation.created_at,
        coalesce(
          sum(returned.return_quantity),
          0
        )::integer as returned_quantity
      from public.business_order_stock_operations as order_link
      join public.stock_recipe_operations as operation
        on operation.business_id = order_link.business_id
        and operation.id = order_link.stock_recipe_operation_id
      left join public.stock_recipe_return_operations as returned
        on returned.business_id = operation.business_id
        and returned.original_operation_id = operation.id
      where order_link.business_id = p_business_id
        and order_link.order_id = current_order.id
        and order_link.menu_item_id = diff_record.menu_item_id
      group by
        operation.id,
        operation.sold_quantity,
        operation.created_at
      having operation.sold_quantity
        > coalesce(sum(returned.return_quantity), 0)
      order by operation.created_at desc, operation.id desc
    loop
      exit when remaining_return <= 0;

      source_available :=
        source_record.sold_quantity
        - source_record.returned_quantity;
      quantity_to_return :=
        least(
          remaining_return,
          source_available
        );

      perform private.apply_recipe_stock_return(
        p_business_id,
        source_record.id,
        quantity_to_return,
        'reservation',
        p_reservation_id::text,
        'order-return:'
          || md5(
            btrim(p_operation_key)
            || ':'
            || source_record.id::text
          ),
        'Devolución de consumo de mesa',
        diff_record.name_snapshot,
        actor_user_id
      );

      remaining_return :=
        remaining_return - quantity_to_return;
    end loop;

    if remaining_return <> 0 then
      raise exception 'Reservation consumption return history is incomplete.'
        using errcode = '23514';
    end if;
  end loop;

  for diff_record in
    select
      target.menu_item_id::uuid as menu_item_id,
      target.quantity
        - coalesce(current_item.quantity, 0) as quantity_to_add
    from jsonb_to_recordset(normalized_items)
      as target(menu_item_id text, quantity integer)
    left join public.business_order_items as current_item
      on current_item.business_id = p_business_id
      and current_item.order_id = current_order.id
      and current_item.menu_item_id = target.menu_item_id::uuid
    where target.quantity > coalesce(current_item.quantity, 0)
    order by target.menu_item_id::uuid
  loop
    has_change := true;

    select item.*
    into menu_item_row
    from public.menu_items as item
    where item.business_id = p_business_id
      and item.id = diff_record.menu_item_id
      and item.archived_at is null
      and item.status = 'available'
    for share;

    if not found then
      raise exception 'Menu item is not available for reservation consumption.'
        using errcode = '23503';
    end if;

    consume_result :=
      private.apply_recipe_stock_consumption(
        p_business_id,
        diff_record.menu_item_id,
        diff_record.quantity_to_add,
        'reservation',
        p_reservation_id::text,
        'order-consume:'
          || md5(
            btrim(p_operation_key)
            || ':'
            || diff_record.menu_item_id::text
          ),
        'Consumo de mesa',
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
      current_order.id,
      diff_record.menu_item_id,
      (consume_result -> 'operation' ->> 'id')::uuid
    );
  end loop;

  delete from public.business_order_items as existing_item
  where existing_item.business_id = p_business_id
    and existing_item.order_id = current_order.id
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
    and existing_item.order_id = current_order.id
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
    current_order.id,
    'dine_in',
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
  where not exists (
    select 1
    from public.business_order_items as existing_item
    where existing_item.business_id = p_business_id
      and existing_item.order_id = current_order.id
      and existing_item.menu_item_id = target.menu_item_id::uuid
  );

  select coalesce(
    sum(
      item.unit_price_snapshot
      * item.quantity
    ),
    0
  )::numeric(12, 2)
  into subtotal_value
  from public.business_order_items as item
  where item.business_id = p_business_id
    and item.order_id = current_order.id;

  if has_change then
    update public.business_orders
    set
      subtotal = subtotal_value,
      revision = case
        when order_was_created then revision
        else revision + 1
      end,
      updated_by = actor_user_id,
      updated_at = now()
    where business_id = p_business_id
      and id = current_order.id
    returning *
    into current_order;
  else
    update public.business_orders
    set
      subtotal = subtotal_value,
      updated_by = actor_user_id,
      updated_at = now()
    where business_id = p_business_id
      and id = current_order.id
    returning *
    into current_order;
  end if;

  if jsonb_array_length(normalized_items) > 0
    and reservation_row.consumption_started_at is null then
    update public.reservations
    set
      consumption_started_at = now(),
      updated_at = now()
    where business_id = p_business_id
      and id = p_reservation_id;
  end if;

  saved_result := jsonb_build_object(
    'order',
    to_jsonb(current_order),
    'items',
    coalesce(
      (
        select jsonb_agg(
          to_jsonb(item)
          order by item.name_snapshot, item.id
        )
        from public.business_order_items as item
        where item.business_id = p_business_id
          and item.order_id = current_order.id
      ),
      '[]'::jsonb
    )
  );

  insert into public.business_order_mutations (
    business_id,
    operation_key,
    order_id,
    reservation_id,
    request_payload,
    result_snapshot,
    created_by
  )
  values (
    p_business_id,
    btrim(p_operation_key),
    current_order.id,
    p_reservation_id,
    normalized_items,
    saved_result,
    actor_user_id
  );

  return saved_result;
end;
$$;

revoke all on function public.save_business_reservation_consumption(
  uuid,
  uuid,
  jsonb,
  text
) from public, anon, authenticated;

grant execute on function public.save_business_reservation_consumption(
  uuid,
  uuid,
  jsonb,
  text
) to authenticated;

commit;
