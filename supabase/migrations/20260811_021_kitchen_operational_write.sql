begin;

alter table public.business_orders
  add column if not exists kitchen_status text not null default 'pending',
  add column if not exists kitchen_started_at timestamptz,
  add column if not exists kitchen_ready_at timestamptz,
  add column if not exists kitchen_completed_at timestamptz,
  add column if not exists kitchen_target_seconds integer;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.business_orders'::regclass
      and conname = 'business_orders_kitchen_status_check'
  ) then
    alter table public.business_orders
      add constraint business_orders_kitchen_status_check
      check (
        kitchen_status in (
          'pending',
          'preparing',
          'ready',
          'completed'
        )
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.business_orders'::regclass
      and conname = 'business_orders_kitchen_target_check'
  ) then
    alter table public.business_orders
      add constraint business_orders_kitchen_target_check
      check (
        kitchen_target_seconds is null
        or kitchen_target_seconds between 1 and 86400
      );
  end if;
end;
$$;

create index if not exists
  business_orders_business_kitchen_status_idx
on public.business_orders (
  business_id,
  kitchen_status,
  updated_at desc
);

create table if not exists public.business_kitchen_tickets (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  order_id uuid not null,
  order_kind text not null,
  sequence integer not null,
  status text not null default 'pending',
  target_seconds integer not null default 900,
  entered_at timestamptz not null default now(),
  started_at timestamptz,
  ready_at timestamptz,
  completed_at timestamptz,
  voided_at timestamptz,
  created_by uuid
    references auth.users(id) on delete set null,
  updated_by uuid
    references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_kitchen_tickets_business_id_id_key
    unique (business_id, id),
  constraint business_kitchen_tickets_business_id_id_order_key
    unique (business_id, id, order_id),
  constraint business_kitchen_tickets_order_tenant_fk
    foreign key (business_id, order_id, order_kind)
    references public.business_orders(business_id, id, order_kind)
    on delete cascade,
  constraint business_kitchen_tickets_order_sequence_key
    unique (business_id, order_id, sequence),
  constraint business_kitchen_tickets_kind_check
    check (order_kind in ('dine_in', 'delivery', 'pickup')),
  constraint business_kitchen_tickets_status_check
    check (status in ('pending', 'preparing', 'ready', 'completed')),
  constraint business_kitchen_tickets_sequence_check
    check (sequence between 1 and 2147483647),
  constraint business_kitchen_tickets_target_check
    check (target_seconds between 1 and 86400)
);

create index if not exists
  business_kitchen_tickets_business_order_status_idx
on public.business_kitchen_tickets (
  business_id,
  order_id,
  status,
  sequence desc
)
where voided_at is null;

create table if not exists public.business_kitchen_ticket_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  ticket_id uuid not null,
  order_id uuid not null,
  menu_item_id uuid not null,
  name_snapshot text not null,
  quantity integer not null,
  preparation_time_seconds_snapshot integer not null default 900,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_kitchen_ticket_items_business_id_id_key
    unique (business_id, id),
  constraint business_kitchen_ticket_items_ticket_tenant_fk
    foreign key (business_id, ticket_id, order_id)
    references public.business_kitchen_tickets(business_id, id, order_id)
    on delete cascade,
  constraint business_kitchen_ticket_items_menu_tenant_fk
    foreign key (business_id, menu_item_id)
    references public.menu_items(business_id, id)
    on delete restrict,
  constraint business_kitchen_ticket_items_ticket_menu_key
    unique (business_id, ticket_id, menu_item_id),
  constraint business_kitchen_ticket_items_name_check
    check (char_length(btrim(name_snapshot)) between 1 and 160),
  constraint business_kitchen_ticket_items_quantity_check
    check (quantity between 1 and 9999),
  constraint business_kitchen_ticket_items_prep_check
    check (preparation_time_seconds_snapshot between 1 and 86400)
);

create index if not exists
  business_kitchen_ticket_items_order_menu_idx
on public.business_kitchen_ticket_items (
  business_id,
  order_id,
  menu_item_id,
  ticket_id
);

create table if not exists public.business_kitchen_operations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  operation_key text not null,
  order_id uuid not null,
  ticket_id uuid,
  requested_status text not null,
  result_snapshot jsonb not null,
  created_by uuid
    references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint business_kitchen_operations_business_id_id_key
    unique (business_id, id),
  constraint business_kitchen_operations_business_key
    unique (business_id, operation_key),
  constraint business_kitchen_operations_order_tenant_fk
    foreign key (business_id, order_id)
    references public.business_orders(business_id, id)
    on delete restrict,
  constraint business_kitchen_operations_ticket_tenant_fk
    foreign key (business_id, ticket_id, order_id)
    references public.business_kitchen_tickets(business_id, id, order_id)
    on delete restrict,
  constraint business_kitchen_operations_key_check
    check (char_length(operation_key) between 8 and 120),
  constraint business_kitchen_operations_status_check
    check (requested_status in ('pending', 'preparing', 'ready', 'completed')),
  constraint business_kitchen_operations_result_check
    check (jsonb_typeof(result_snapshot) = 'object')
);

alter table public.business_kitchen_tickets
  enable row level security;
alter table public.business_kitchen_tickets
  force row level security;
alter table public.business_kitchen_ticket_items
  enable row level security;
alter table public.business_kitchen_ticket_items
  force row level security;
alter table public.business_kitchen_operations
  enable row level security;
alter table public.business_kitchen_operations
  force row level security;

revoke all
on table
  public.business_kitchen_tickets,
  public.business_kitchen_ticket_items,
  public.business_kitchen_operations
from public, anon, authenticated;

grant select, insert, update, delete
on table
  public.business_kitchen_tickets,
  public.business_kitchen_ticket_items,
  public.business_kitchen_operations
to service_role;

create or replace function private.kitchen_recipe_target_seconds(
  p_business_id uuid,
  p_menu_item_id uuid
)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select greatest(
    1,
    least(
      86400,
      coalesce(
        (
          select recipe.preparation_time_seconds
          from public.menu_recipes as recipe
          where recipe.business_id = p_business_id
            and recipe.menu_item_id = p_menu_item_id
          limit 1
        ),
        900
      )
    )
  )::integer;
$$;

revoke all on function private.kitchen_recipe_target_seconds(
  uuid,
  uuid
) from public, anon, authenticated;

create or replace function private.add_business_kitchen_ticket_item(
  p_business_id uuid,
  p_order_id uuid,
  p_order_kind text,
  p_menu_item_id uuid,
  p_name_snapshot text,
  p_quantity integer,
  p_actor_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  ticket_row public.business_kitchen_tickets%rowtype;
  prep_seconds integer;
  next_sequence integer;
begin
  if p_quantity <= 0 then
    return;
  end if;

  prep_seconds :=
    private.kitchen_recipe_target_seconds(
      p_business_id,
      p_menu_item_id
    );

  select ticket.*
  into ticket_row
  from public.business_kitchen_tickets as ticket
  where ticket.business_id = p_business_id
    and ticket.order_id = p_order_id
    and ticket.status = 'pending'
    and ticket.voided_at is null
  order by ticket.sequence desc
  limit 1
  for update;

  if not found then
    select coalesce(max(ticket.sequence), 0) + 1
    into next_sequence
    from public.business_kitchen_tickets as ticket
    where ticket.business_id = p_business_id
      and ticket.order_id = p_order_id;

    insert into public.business_kitchen_tickets (
      business_id,
      order_id,
      order_kind,
      sequence,
      status,
      target_seconds,
      entered_at,
      created_by,
      updated_by
    )
    values (
      p_business_id,
      p_order_id,
      p_order_kind,
      next_sequence,
      'pending',
      prep_seconds,
      now(),
      p_actor_user_id,
      p_actor_user_id
    )
    returning *
    into ticket_row;
  else
    update public.business_kitchen_tickets
    set
      target_seconds = greatest(
        target_seconds,
        prep_seconds
      ),
      updated_by = p_actor_user_id,
      updated_at = now()
    where business_id = p_business_id
      and id = ticket_row.id
    returning *
    into ticket_row;
  end if;

  insert into public.business_kitchen_ticket_items as current_item (
    business_id,
    ticket_id,
    order_id,
    menu_item_id,
    name_snapshot,
    quantity,
    preparation_time_seconds_snapshot
  )
  values (
    p_business_id,
    ticket_row.id,
    p_order_id,
    p_menu_item_id,
    btrim(p_name_snapshot),
    p_quantity,
    prep_seconds
  )
  on conflict (
    business_id,
    ticket_id,
    menu_item_id
  )
  do update
  set
    name_snapshot = excluded.name_snapshot,
    quantity =
      current_item.quantity
      + excluded.quantity,
    preparation_time_seconds_snapshot = greatest(
      current_item.preparation_time_seconds_snapshot,
      excluded.preparation_time_seconds_snapshot
    ),
    updated_at = now();
end;
$$;

revoke all on function private.add_business_kitchen_ticket_item(
  uuid,
  uuid,
  text,
  uuid,
  text,
  integer,
  uuid
) from public, anon, authenticated;

create or replace function private.reduce_business_kitchen_ticket_item(
  p_business_id uuid,
  p_order_id uuid,
  p_menu_item_id uuid,
  p_quantity integer,
  p_actor_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  allocation record;
  remaining integer := p_quantity;
  remove_quantity integer;
  recalculated_target integer;
begin
  if p_quantity <= 0 then
    return;
  end if;

  for allocation in
    select
      item.id as item_id,
      item.ticket_id,
      item.quantity,
      ticket.status,
      ticket.sequence
    from public.business_kitchen_ticket_items as item
    join public.business_kitchen_tickets as ticket
      on ticket.business_id = item.business_id
      and ticket.id = item.ticket_id
      and ticket.order_id = item.order_id
    where item.business_id = p_business_id
      and item.order_id = p_order_id
      and item.menu_item_id = p_menu_item_id
      and ticket.voided_at is null
      and ticket.status in ('pending', 'preparing', 'ready')
    order by
      case ticket.status
        when 'pending' then 1
        when 'preparing' then 2
        when 'ready' then 3
        else 4
      end,
      ticket.sequence desc,
      item.id desc
    for update of item, ticket
  loop
    exit when remaining <= 0;

    remove_quantity :=
      least(
        allocation.quantity,
        remaining
      );

    if remove_quantity = allocation.quantity then
      delete from public.business_kitchen_ticket_items
      where business_id = p_business_id
        and id = allocation.item_id;
    else
      update public.business_kitchen_ticket_items
      set
        quantity = quantity - remove_quantity,
        updated_at = now()
      where business_id = p_business_id
        and id = allocation.item_id;
    end if;

    remaining :=
      remaining - remove_quantity;

    if not exists (
      select 1
      from public.business_kitchen_ticket_items as remaining_item
      where remaining_item.business_id = p_business_id
        and remaining_item.ticket_id = allocation.ticket_id
    ) then
      update public.business_kitchen_tickets
      set
        voided_at = coalesce(voided_at, now()),
        updated_by = p_actor_user_id,
        updated_at = now()
      where business_id = p_business_id
        and id = allocation.ticket_id;
    else
      select max(
        item.preparation_time_seconds_snapshot
      )
      into recalculated_target
      from public.business_kitchen_ticket_items as item
      where item.business_id = p_business_id
        and item.ticket_id = allocation.ticket_id;

      update public.business_kitchen_tickets
      set
        target_seconds =
          greatest(
            1,
            coalesce(
              recalculated_target,
              target_seconds
            )
          ),
        updated_by = p_actor_user_id,
        updated_at = now()
      where business_id = p_business_id
        and id = allocation.ticket_id;
    end if;
  end loop;
end;
$$;

revoke all on function private.reduce_business_kitchen_ticket_item(
  uuid,
  uuid,
  uuid,
  integer,
  uuid
) from public, anon, authenticated;

create or replace function private.sync_business_order_item_kitchen_delta()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  order_row public.business_orders%rowtype;
  delta integer;
  target_business_id uuid;
  target_order_id uuid;
  target_order_kind text;
  target_menu_item_id uuid;
  target_name text;
  actor_user_id uuid;
begin
  if tg_op = 'INSERT' then
    delta := new.quantity;
    target_business_id := new.business_id;
    target_order_id := new.order_id;
    target_order_kind := new.order_kind;
    target_menu_item_id := new.menu_item_id;
    target_name := new.name_snapshot;
  elsif tg_op = 'DELETE' then
    delta := -old.quantity;
    target_business_id := old.business_id;
    target_order_id := old.order_id;
    target_order_kind := old.order_kind;
    target_menu_item_id := old.menu_item_id;
    target_name := old.name_snapshot;
  else
    delta := new.quantity - old.quantity;
    target_business_id := new.business_id;
    target_order_id := new.order_id;
    target_order_kind := new.order_kind;
    target_menu_item_id := new.menu_item_id;
    target_name := new.name_snapshot;
  end if;

  if delta = 0 then
    if tg_op = 'DELETE' then
      return old;
    end if;

    return new;
  end if;

  select order_record.*
  into order_row
  from public.business_orders as order_record
  where order_record.business_id = target_business_id
    and order_record.id = target_order_id
  for update;

  if not found
    or order_row.kitchen_status = 'pending' then
    if tg_op = 'DELETE' then
      return old;
    end if;

    return new;
  end if;

  actor_user_id := (select auth.uid());

  if delta > 0 then
    perform private.add_business_kitchen_ticket_item(
      target_business_id,
      target_order_id,
      target_order_kind,
      target_menu_item_id,
      target_name,
      delta,
      actor_user_id
    );
  else
    perform private.reduce_business_kitchen_ticket_item(
      target_business_id,
      target_order_id,
      target_menu_item_id,
      abs(delta),
      actor_user_id
    );
  end if;

  if tg_op = 'DELETE' then
    return old;
  end if;

  return new;
end;
$$;

revoke all on function private.sync_business_order_item_kitchen_delta()
from public, anon, authenticated;

drop trigger if exists
  business_order_items_sync_kitchen_delta
on public.business_order_items;

create trigger business_order_items_sync_kitchen_delta
after insert or update of quantity or delete
on public.business_order_items
for each row
execute function private.sync_business_order_item_kitchen_delta();

create or replace function public.get_business_kitchen_snapshot(
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
  actor_user_id uuid;
  result_value jsonb;
begin
  actor_user_id := (select auth.uid());

  if actor_user_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if p_business_id is null
    or p_business_date is null then
    raise exception 'Kitchen snapshot input is invalid.'
      using errcode = '22023';
  end if;

  if not private.current_user_has_module_access(
    p_business_id,
    'kitchen',
    'view'
  ) then
    raise exception 'Insufficient kitchen permission.'
      using errcode = '42501';
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
    group by
      item.business_id,
      item.order_id,
      item.menu_item_id
  ),
  base_items as (
    select
      order_item.business_id,
      order_item.order_id,
      order_item.menu_item_id,
      order_item.name_snapshot,
      greatest(
        0,
        order_item.quantity
        - coalesce(
            allocation.allocated_quantity,
            0
          )
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
      and order_item.order_kind = 'dine_in'
  ),
  table_labels as (
    select
      assignment.business_id,
      assignment.reservation_id,
      string_agg(
        table_row.label,
        ' + '
        order by table_row.label
      ) as source_label
    from public.reservation_table_assignments as assignment
    join public.floor_tables as table_row
      on table_row.business_id = assignment.business_id
      and table_row.id = assignment.table_id
    where assignment.business_id = p_business_id
    group by
      assignment.business_id,
      assignment.reservation_id
  ),
  base_commands as (
    select
      'order:' || order_row.id::text as command_id,
      order_row.id as order_id,
      order_row.reservation_id,
      null::uuid as ticket_id,
      'reservation'::text as source,
      coalesce(
        table_label.source_label,
        'Mesa sin asignar'
      ) as source_label,
      reservation.customer_name as client,
      to_char(
        reservation.reservation_time,
        'HH24:MI'
      ) as service_time,
      coalesce(
        reservation.notes,
        ''
      ) as note,
      order_row.kitchen_status as kitchen_status,
      coalesce(
        order_row.kitchen_target_seconds,
        max(base_item.preparation_time_seconds)
      )::integer as target_seconds,
      coalesce(
        reservation.consumption_started_at,
        order_row.created_at
      ) as entered_at,
      order_row.kitchen_started_at as started_at,
      order_row.kitchen_ready_at as ready_at,
      order_row.kitchen_completed_at as completed_at,
      false as is_addition,
      jsonb_agg(
        jsonb_build_object(
          'menuItemId',
          base_item.menu_item_id,
          'name',
          base_item.name_snapshot,
          'quantity',
          base_item.quantity
        )
        order by
          base_item.name_snapshot,
          base_item.menu_item_id
      ) as items
    from public.business_orders as order_row
    join public.reservations as reservation
      on reservation.business_id = order_row.business_id
      and reservation.id = order_row.reservation_id
    join base_items as base_item
      on base_item.business_id = order_row.business_id
      and base_item.order_id = order_row.id
      and base_item.quantity > 0
    left join table_labels as table_label
      on table_label.business_id = reservation.business_id
      and table_label.reservation_id = reservation.id
    where order_row.business_id = p_business_id
      and order_row.order_kind = 'dine_in'
      and reservation.reservation_date = p_business_date
      and reservation.status in ('confirmed', 'completed')
    group by
      order_row.id,
      order_row.reservation_id,
      order_row.kitchen_status,
      order_row.kitchen_target_seconds,
      order_row.created_at,
      order_row.kitchen_started_at,
      order_row.kitchen_ready_at,
      order_row.kitchen_completed_at,
      reservation.id,
      reservation.customer_name,
      reservation.reservation_time,
      reservation.notes,
      reservation.consumption_started_at,
      table_label.source_label
  ),
  ticket_commands as (
    select
      'ticket:' || ticket.id::text as command_id,
      ticket.order_id,
      order_row.reservation_id,
      ticket.id as ticket_id,
      'reservation'::text as source,
      coalesce(
        table_label.source_label,
        'Mesa sin asignar'
      ) as source_label,
      reservation.customer_name as client,
      to_char(
        reservation.reservation_time,
        'HH24:MI'
      ) as service_time,
      coalesce(
        reservation.notes,
        ''
      ) as note,
      ticket.status as kitchen_status,
      ticket.target_seconds,
      ticket.entered_at,
      ticket.started_at,
      ticket.ready_at,
      ticket.completed_at,
      true as is_addition,
      jsonb_agg(
        jsonb_build_object(
          'menuItemId',
          item.menu_item_id,
          'name',
          item.name_snapshot,
          'quantity',
          item.quantity
        )
        order by
          item.name_snapshot,
          item.menu_item_id
      ) as items
    from public.business_kitchen_tickets as ticket
    join public.business_orders as order_row
      on order_row.business_id = ticket.business_id
      and order_row.id = ticket.order_id
      and order_row.order_kind = ticket.order_kind
    join public.reservations as reservation
      on reservation.business_id = order_row.business_id
      and reservation.id = order_row.reservation_id
    join public.business_kitchen_ticket_items as item
      on item.business_id = ticket.business_id
      and item.ticket_id = ticket.id
      and item.order_id = ticket.order_id
    left join table_labels as table_label
      on table_label.business_id = reservation.business_id
      and table_label.reservation_id = reservation.id
    where ticket.business_id = p_business_id
      and ticket.order_kind = 'dine_in'
      and ticket.voided_at is null
      and reservation.reservation_date = p_business_date
      and reservation.status in ('confirmed', 'completed')
    group by
      ticket.id,
      ticket.order_id,
      ticket.status,
      ticket.target_seconds,
      ticket.entered_at,
      ticket.started_at,
      ticket.ready_at,
      ticket.completed_at,
      order_row.reservation_id,
      reservation.id,
      reservation.customer_name,
      reservation.reservation_time,
      reservation.notes,
      table_label.source_label
  ),
  all_commands as (
    select * from base_commands
    union all
    select * from ticket_commands
  )
  select jsonb_build_object(
    'businessDate',
    p_business_date,
    'commands',
    coalesce(
      jsonb_agg(
        jsonb_build_object(
          'id',
          command.command_id,
          'orderId',
          command.order_id,
          'reservationId',
          command.reservation_id,
          'ticketId',
          command.ticket_id,
          'source',
          command.source,
          'sourceLabel',
          command.source_label,
          'client',
          command.client,
          'time',
          command.service_time,
          'note',
          command.note,
          'items',
          command.items,
          'status',
          command.kitchen_status,
          'targetSeconds',
          command.target_seconds,
          'enteredAt',
          command.entered_at,
          'startedAt',
          command.started_at,
          'readyAt',
          command.ready_at,
          'completedAt',
          command.completed_at,
          'isAddition',
          command.is_addition
        )
        order by
          command.entered_at,
          command.command_id
      ),
      '[]'::jsonb
    )
  )
  into result_value
  from all_commands as command;

  return coalesce(
    result_value,
    jsonb_build_object(
      'businessDate',
      p_business_date,
      'commands',
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function public.get_business_kitchen_snapshot(
  uuid,
  date
) from public, anon, authenticated;

grant execute on function public.get_business_kitchen_snapshot(
  uuid,
  date
) to authenticated;

create or replace function public.set_business_kitchen_command_status(
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
  actor_user_id uuid;
  order_row public.business_orders%rowtype;
  ticket_row public.business_kitchen_tickets%rowtype;
  existing_operation public.business_kitchen_operations%rowtype;
  current_status text;
  result_value jsonb;
  target_seconds integer;
begin
  actor_user_id := (select auth.uid());

  if actor_user_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not private.current_user_has_module_access(
    p_business_id,
    'kitchen',
    'manage'
  ) then
    raise exception 'Insufficient kitchen permission.'
      using errcode = '42501';
  end if;

  if p_business_id is null
    or p_order_id is null
    or p_status not in (
      'pending',
      'preparing',
      'ready',
      'completed'
    )
    or p_operation_key is null
    or char_length(btrim(p_operation_key)) not between 8 and 120 then
    raise exception 'Kitchen status input is invalid.'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      p_business_id::text,
      0
    )
  );

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

  select order_record.*
  into order_row
  from public.business_orders as order_record
  where order_record.business_id = p_business_id
    and order_record.id = p_order_id
  for update;

  if not found
    or order_row.order_kind <> 'dine_in'
    or order_row.reservation_id is null then
    raise exception 'Kitchen order is not available for this business.'
      using errcode = '42501';
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
      raise exception 'Kitchen status transition is not allowed.'
        using errcode = 'P0001';
    end if;

    if current_status = 'pending'
      and p_status = 'preparing'
      and order_row.kitchen_target_seconds is null then
      select coalesce(
        max(
          private.kitchen_recipe_target_seconds(
            item.business_id,
            item.menu_item_id
          )
        ),
        900
      )
      into target_seconds
      from public.business_order_items as item
      where item.business_id = p_business_id
        and item.order_id = p_order_id;
    else
      target_seconds :=
        coalesce(
          order_row.kitchen_target_seconds,
          900
        );
    end if;

    if current_status <> p_status then
      update public.business_orders
      set
        kitchen_status = p_status,
        kitchen_started_at = case
          when p_status = 'preparing' then
            coalesce(
              kitchen_started_at,
              now()
            )
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
        kitchen_target_seconds =
          coalesce(
            kitchen_target_seconds,
            target_seconds
          ),
        updated_by = actor_user_id,
        updated_at = now()
      where business_id = p_business_id
        and id = p_order_id
      returning *
      into order_row;
    end if;

    result_value := jsonb_build_object(
      'orderId',
      order_row.id,
      'ticketId',
      null,
      'status',
      order_row.kitchen_status,
      'targetSeconds',
      coalesce(
        order_row.kitchen_target_seconds,
        target_seconds,
        900
      ),
      'startedAt',
      order_row.kitchen_started_at,
      'readyAt',
      order_row.kitchen_ready_at,
      'completedAt',
      order_row.kitchen_completed_at
    );
  else
    select ticket.*
    into ticket_row
    from public.business_kitchen_tickets as ticket
    where ticket.business_id = p_business_id
      and ticket.order_id = p_order_id
      and ticket.id = p_ticket_id
      and ticket.voided_at is null
    for update;

    if not found then
      raise exception 'Kitchen ticket is not available for this business.'
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
      raise exception 'Kitchen status transition is not allowed.'
        using errcode = 'P0001';
    end if;

    if current_status <> p_status then
      update public.business_kitchen_tickets
      set
        status = p_status,
        started_at = case
          when p_status = 'preparing' then
            coalesce(
              started_at,
              now()
            )
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
      'orderId',
      ticket_row.order_id,
      'ticketId',
      ticket_row.id,
      'status',
      ticket_row.status,
      'targetSeconds',
      ticket_row.target_seconds,
      'startedAt',
      ticket_row.started_at,
      'readyAt',
      ticket_row.ready_at,
      'completedAt',
      ticket_row.completed_at
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
  )
  values (
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

revoke all on function public.set_business_kitchen_command_status(
  uuid,
  uuid,
  uuid,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.set_business_kitchen_command_status(
  uuid,
  uuid,
  uuid,
  text,
  text
) to authenticated;

commit;
