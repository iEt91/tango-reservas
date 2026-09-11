begin;

create table if not exists public.cash_sessions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  business_date date not null,
  status text not null default 'open',
  opening_amount numeric(12, 2) not null default 0,
  open_operation_key text not null,
  opened_by uuid
    references auth.users(id) on delete set null,
  opened_at timestamptz not null default now(),
  closed_by uuid
    references auth.users(id) on delete set null,
  closed_at timestamptz,
  actual_cash numeric(12, 2),
  expected_cash numeric(12, 2),
  difference numeric(12, 2),
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cash_sessions_business_id_id_key
    unique (business_id, id),
  constraint cash_sessions_business_date_key
    unique (business_id, business_date),
  constraint cash_sessions_open_operation_key
    unique (business_id, open_operation_key),
  constraint cash_sessions_status_check
    check (status in ('open', 'closed')),
  constraint cash_sessions_opening_amount_check
    check (opening_amount between 0 and 9999999999.99),
  constraint cash_sessions_actual_cash_check
    check (
      actual_cash is null
      or actual_cash between 0 and 9999999999.99
    ),
  constraint cash_sessions_expected_cash_check
    check (
      expected_cash is null
      or expected_cash between -9999999999.99 and 9999999999.99
    ),
  constraint cash_sessions_difference_check
    check (
      difference is null
      or difference between -9999999999.99 and 9999999999.99
    ),
  constraint cash_sessions_open_key_length_check
    check (char_length(btrim(open_operation_key)) between 8 and 120),
  constraint cash_sessions_notes_length_check
    check (char_length(notes) <= 4000),
  constraint cash_sessions_close_shape_check
    check (
      (
        status = 'open'
        and closed_at is null
        and closed_by is null
        and actual_cash is null
        and expected_cash is null
        and difference is null
      )
      or (
        status = 'closed'
        and closed_at is not null
        and actual_cash is not null
        and expected_cash is not null
        and difference is not null
      )
    )
);

create index if not exists cash_sessions_business_status_date_idx
  on public.cash_sessions (
    business_id,
    status,
    business_date desc
  );

create table if not exists public.business_payment_operations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  operation_key text not null,
  order_id uuid not null,
  reservation_id uuid not null,
  cash_session_id uuid not null,
  request_payload jsonb not null,
  result_snapshot jsonb not null default '{}'::jsonb,
  total_amount numeric(12, 2) not null,
  created_by uuid
    references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint business_payment_operations_business_id_id_key
    unique (business_id, id),
  constraint business_payment_operations_business_key
    unique (business_id, operation_key),
  constraint business_payment_operations_order_tenant_fk
    foreign key (business_id, order_id)
    references public.business_orders(business_id, id)
    on delete restrict,
  constraint business_payment_operations_reservation_tenant_fk
    foreign key (business_id, reservation_id)
    references public.reservations(business_id, id)
    on delete restrict,
  constraint business_payment_operations_session_tenant_fk
    foreign key (business_id, cash_session_id)
    references public.cash_sessions(business_id, id)
    on delete restrict,
  constraint business_payment_operations_key_length_check
    check (char_length(btrim(operation_key)) between 8 and 120),
  constraint business_payment_operations_payload_array_check
    check (jsonb_typeof(request_payload) = 'array'),
  constraint business_payment_operations_result_object_check
    check (jsonb_typeof(result_snapshot) = 'object'),
  constraint business_payment_operations_total_check
    check (total_amount between 0 and 9999999999.99)
);

create index if not exists business_payment_operations_order_idx
  on public.business_payment_operations (
    business_id,
    order_id,
    created_at desc
  );

create table if not exists public.business_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  operation_id uuid not null,
  order_id uuid not null,
  reservation_id uuid not null,
  cash_session_id uuid not null,
  payment_method text not null,
  amount numeric(12, 2) not null,
  created_by uuid
    references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint business_payments_business_id_id_key
    unique (business_id, id),
  constraint business_payments_operation_method_key
    unique (business_id, operation_id, payment_method),
  constraint business_payments_operation_tenant_fk
    foreign key (business_id, operation_id)
    references public.business_payment_operations(business_id, id)
    on delete restrict,
  constraint business_payments_order_tenant_fk
    foreign key (business_id, order_id)
    references public.business_orders(business_id, id)
    on delete restrict,
  constraint business_payments_reservation_tenant_fk
    foreign key (business_id, reservation_id)
    references public.reservations(business_id, id)
    on delete restrict,
  constraint business_payments_session_tenant_fk
    foreign key (business_id, cash_session_id)
    references public.cash_sessions(business_id, id)
    on delete restrict,
  constraint business_payments_method_check
    check (
      payment_method in (
        'cash',
        'card',
        'mercado_pago',
        'transfer'
      )
    ),
  constraint business_payments_amount_check
    check (amount > 0 and amount <= 9999999999.99)
);

create index if not exists business_payments_session_created_idx
  on public.business_payments (
    business_id,
    cash_session_id,
    created_at
  );

create index if not exists business_payments_reservation_idx
  on public.business_payments (
    business_id,
    reservation_id,
    created_at
  );

drop trigger if exists cash_sessions_set_updated_at
  on public.cash_sessions;

create trigger cash_sessions_set_updated_at
before update on public.cash_sessions
for each row
execute function private.tango_set_updated_at();

alter table public.cash_sessions
  enable row level security;
alter table public.cash_sessions
  force row level security;

alter table public.business_payment_operations
  enable row level security;
alter table public.business_payment_operations
  force row level security;

alter table public.business_payments
  enable row level security;
alter table public.business_payments
  force row level security;

drop policy if exists cash_sessions_select_cash_member
  on public.cash_sessions;

create policy cash_sessions_select_cash_member
on public.cash_sessions
for select
to authenticated
using (
  (
    select private.current_user_has_module_access(
      business_id,
      'cash',
      'view'
    )
  )
);

drop policy if exists business_payments_select_cash_member
  on public.business_payments;

create policy business_payments_select_cash_member
on public.business_payments
for select
to authenticated
using (
  (
    select private.current_user_has_module_access(
      business_id,
      'cash',
      'view'
    )
  )
);

revoke all on table public.cash_sessions
  from public, anon, authenticated;
revoke all on table public.business_payment_operations
  from public, anon, authenticated;
revoke all on table public.business_payments
  from public, anon, authenticated;

grant select on table public.cash_sessions
  to authenticated;
grant select on table public.business_payments
  to authenticated;

create or replace function public.open_business_cash_session(
  p_business_id uuid,
  p_business_date date,
  p_opening_amount numeric,
  p_operation_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  normalized_amount numeric(12, 2);
  normalized_key text := btrim(coalesce(p_operation_key, ''));
  existing_by_key public.cash_sessions%rowtype;
  existing_by_date public.cash_sessions%rowtype;
  saved_session public.cash_sessions%rowtype;
begin
  if actor_user_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not private.current_user_has_module_access(
    p_business_id,
    'cash',
    'manage'
  ) then
    raise exception 'Insufficient cash permission.'
      using errcode = '42501';
  end if;

  if p_business_id is null
    or p_business_date is null
    or p_opening_amount is null
    or p_opening_amount < 0
    or p_opening_amount > 9999999999.99
    or p_opening_amount <> round(p_opening_amount, 2)
    or char_length(normalized_key) not between 8 and 120 then
    raise exception 'Cash session input is invalid.'
      using errcode = '22023';
  end if;

  normalized_amount := round(p_opening_amount, 2);

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text, 0)
  );

  select session_row.*
  into existing_by_key
  from public.cash_sessions as session_row
  where session_row.business_id = p_business_id
    and session_row.open_operation_key = normalized_key
  limit 1;

  if found then
    if existing_by_key.business_date = p_business_date
      and existing_by_key.opening_amount = normalized_amount then
      return to_jsonb(existing_by_key);
    end if;

    raise exception 'Cash session operation key already exists with different data.'
      using errcode = '23505';
  end if;

  select session_row.*
  into existing_by_date
  from public.cash_sessions as session_row
  where session_row.business_id = p_business_id
    and session_row.business_date = p_business_date
  for update;

  if found then
    if existing_by_date.status = 'open'
      and existing_by_date.opening_amount = normalized_amount then
      return to_jsonb(existing_by_date);
    end if;

    if existing_by_date.status = 'closed' then
      raise exception 'Cash session is already closed for this date.'
        using errcode = 'P0001';
    end if;

    raise exception 'Cash session already exists with a different opening amount.'
      using errcode = '23505';
  end if;

  insert into public.cash_sessions (
    business_id,
    business_date,
    status,
    opening_amount,
    open_operation_key,
    opened_by
  )
  values (
    p_business_id,
    p_business_date,
    'open',
    normalized_amount,
    normalized_key,
    actor_user_id
  )
  returning *
  into saved_session;

  return to_jsonb(saved_session);
end;
$$;

create or replace function public.complete_business_reservation_payment(
  p_business_id uuid,
  p_reservation_id uuid,
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
  reservation_row public.reservations%rowtype;
  order_row public.business_orders%rowtype;
  cash_session_row public.cash_sessions%rowtype;
  existing_operation public.business_payment_operations%rowtype;
  saved_operation public.business_payment_operations%rowtype;
  saved_result jsonb;
begin
  if actor_user_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not private.current_user_has_module_access(
    p_business_id,
    'cash',
    'manage'
  ) then
    raise exception 'Insufficient cash permission.'
      using errcode = '42501';
  end if;

  if p_business_id is null
    or p_reservation_id is null
    or p_payments is null
    or jsonb_typeof(p_payments) <> 'array'
    or char_length(normalized_key) not between 8 and 120 then
    raise exception 'Reservation payment input is invalid.'
      using errcode = '22023';
  end if;

  payment_count := jsonb_array_length(p_payments);

  if payment_count > 4 then
    raise exception 'Reservation payment contains too many methods.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_payments) as entry(value)
    where jsonb_typeof(entry.value) <> 'object'
  ) then
    raise exception 'Reservation payment entries must be objects.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_payments) as entry(value)
    cross join lateral jsonb_object_keys(entry.value) as field(key)
    where field.key not in ('method', 'amount')
  ) then
    raise exception 'Reservation payment entry contains unknown fields.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_payments) as entry(value)
    where jsonb_typeof(entry.value -> 'method') is distinct from 'string'
      or jsonb_typeof(entry.value -> 'amount') is distinct from 'number'
      or (entry.value ->> 'method') not in (
        'cash',
        'card',
        'mercado_pago',
        'transfer'
      )
      or (entry.value ->> 'amount')::numeric <= 0
      or (entry.value ->> 'amount')::numeric > 9999999999.99
      or (entry.value ->> 'amount')::numeric
        <> round((entry.value ->> 'amount')::numeric, 2)
  ) then
    raise exception 'Reservation payment entry is invalid.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_payments) as entry(value)
    group by entry.value ->> 'method'
    having count(*) > 1
  ) then
    raise exception 'Reservation payment contains duplicate methods.'
      using errcode = '22023';
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'method',
        normalized.method,
        'amount',
        normalized.amount
      )
      order by normalized.method
    ),
    '[]'::jsonb
  )
  into normalized_payments
  from (
    select
      entry.value ->> 'method' as method,
      round(
        (entry.value ->> 'amount')::numeric,
        2
      )::numeric(12, 2) as amount
    from jsonb_array_elements(p_payments) as entry(value)
  ) as normalized;

  select coalesce(
    sum((entry.value ->> 'amount')::numeric),
    0
  )::numeric(12, 2)
  into payment_total
  from jsonb_array_elements(normalized_payments) as entry(value);

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text, 0)
  );

  select operation.*
  into existing_operation
  from public.business_payment_operations as operation
  where operation.business_id = p_business_id
    and operation.operation_key = normalized_key
  limit 1;

  if found then
    if existing_operation.reservation_id = p_reservation_id
      and existing_operation.request_payload = normalized_payments then
      return existing_operation.result_snapshot;
    end if;

    raise exception 'Reservation payment operation key already exists with different data.'
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
    raise exception 'Reservation must be confirmed before payment.'
      using errcode = 'P0001';
  end if;

  select business_order.*
  into order_row
  from public.business_orders as business_order
  where business_order.business_id = p_business_id
    and business_order.reservation_id = p_reservation_id
    and business_order.order_kind = 'dine_in'
  for update;

  if not found then
    raise exception 'Reservation order is not available.'
      using errcode = 'P0001';
  end if;

  if order_row.status <> 'open' then
    raise exception 'Reservation order is not open for payment.'
      using errcode = 'P0001';
  end if;

  select session_row.*
  into cash_session_row
  from public.cash_sessions as session_row
  where session_row.business_id = p_business_id
    and session_row.business_date = reservation_row.reservation_date
  for update;

  if not found then
    raise exception 'Cash session is not open for reservation date.'
      using errcode = 'P0001';
  end if;

  if cash_session_row.status <> 'open' then
    raise exception 'Cash session is closed for reservation date.'
      using errcode = 'P0001';
  end if;

  if order_row.subtotal = 0 then
    if payment_count <> 0 or payment_total <> 0 then
      raise exception 'Zero-total order must not contain payment entries.'
        using errcode = '23514';
    end if;
  elsif payment_count = 0
    or payment_total <> order_row.subtotal then
    raise exception 'Payment total must match canonical order subtotal.'
      using errcode = '23514';
  end if;

  insert into public.business_payment_operations (
    business_id,
    operation_key,
    order_id,
    reservation_id,
    cash_session_id,
    request_payload,
    result_snapshot,
    total_amount,
    created_by
  )
  values (
    p_business_id,
    normalized_key,
    order_row.id,
    reservation_row.id,
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
    cash_session_id,
    payment_method,
    amount,
    created_by
  )
  select
    p_business_id,
    saved_operation.id,
    order_row.id,
    reservation_row.id,
    cash_session_row.id,
    entry.value ->> 'method',
    (entry.value ->> 'amount')::numeric(12, 2),
    actor_user_id
  from jsonb_array_elements(normalized_payments) as entry(value);

  update public.business_orders
  set status = 'completed',
      revision = revision + 1,
      updated_by = actor_user_id,
      updated_at = now()
  where business_id = p_business_id
    and id = order_row.id
  returning *
  into order_row;

  update public.reservations
  set status = 'completed',
      completed_at = coalesce(completed_at, now()),
      updated_at = now()
  where business_id = p_business_id
    and id = reservation_row.id
  returning *
  into reservation_row;

  saved_result := jsonb_build_object(
    'operation_id',
    saved_operation.id,
    'cash_session',
    jsonb_build_object(
      'id',
      cash_session_row.id,
      'business_date',
      cash_session_row.business_date,
      'status',
      cash_session_row.status,
      'opening_amount',
      cash_session_row.opening_amount,
      'opened_at',
      cash_session_row.opened_at
    ),
    'order',
    jsonb_build_object(
      'id',
      order_row.id,
      'reservation_id',
      order_row.reservation_id,
      'status',
      order_row.status,
      'revision',
      order_row.revision,
      'subtotal',
      order_row.subtotal,
      'created_at',
      order_row.created_at,
      'updated_at',
      order_row.updated_at
    ),
    'reservation',
    jsonb_build_object(
      'id',
      reservation_row.id,
      'status',
      reservation_row.status,
      'completed_at',
      reservation_row.completed_at
    ),
    'payments',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id',
            payment.id,
            'method',
            payment.payment_method,
            'amount',
            payment.amount,
            'created_at',
            payment.created_at
          )
          order by payment.payment_method
        )
        from public.business_payments as payment
        where payment.business_id = p_business_id
          and payment.operation_id = saved_operation.id
      ),
      '[]'::jsonb
    ),
    'total_amount',
    payment_total
  );

  update public.business_payment_operations
  set result_snapshot = saved_result
  where business_id = p_business_id
    and id = saved_operation.id;

  return saved_result;
end;
$$;

revoke all on function public.open_business_cash_session(
  uuid,
  date,
  numeric,
  text
) from public, anon;

revoke all on function public.complete_business_reservation_payment(
  uuid,
  uuid,
  jsonb,
  text
) from public, anon;

grant execute on function public.open_business_cash_session(
  uuid,
  date,
  numeric,
  text
) to authenticated;

grant execute on function public.complete_business_reservation_payment(
  uuid,
  uuid,
  jsonb,
  text
) to authenticated;

commit;
