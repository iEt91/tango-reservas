begin;

alter table public.cash_sessions
  add column if not exists cash_sales_snapshot numeric(12, 2),
  add column if not exists cash_expenses_snapshot numeric(12, 2),
  add column if not exists cash_movements_snapshot numeric(12, 2);

create table if not exists public.business_expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  expense_date date not null,
  due_date date,
  description text not null,
  provider text not null default '',
  category text not null,
  amount numeric(12, 2) not null,
  status text not null default 'pending',
  payment_method text not null default 'cash',
  paid_at timestamptz,
  archived_at timestamptz,
  created_by uuid
    references auth.users(id) on delete set null,
  updated_by uuid
    references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_expenses_business_id_id_key
    unique (business_id, id),
  constraint business_expenses_description_length_check
    check (char_length(btrim(description)) between 1 and 240),
  constraint business_expenses_provider_length_check
    check (char_length(provider) <= 160),
  constraint business_expenses_category_length_check
    check (char_length(btrim(category)) between 1 and 80),
  constraint business_expenses_amount_check
    check (amount > 0 and amount <= 9999999999.99),
  constraint business_expenses_status_check
    check (status in ('pending', 'paid')),
  constraint business_expenses_payment_method_check
    check (
      payment_method in (
        'cash',
        'card',
        'mercado_pago',
        'transfer'
      )
    ),
  constraint business_expenses_paid_shape_check
    check (
      (
        status = 'pending'
        and paid_at is null
      )
      or (
        status = 'paid'
        and paid_at is not null
      )
    )
);

create index if not exists business_expenses_business_date_idx
  on public.business_expenses (
    business_id,
    expense_date desc,
    created_at desc
  );

create index if not exists business_expenses_business_status_idx
  on public.business_expenses (
    business_id,
    status,
    expense_date desc
  )
  where archived_at is null;

create table if not exists public.business_expense_operations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  operation_key text not null,
  action text not null,
  expense_id uuid,
  request_payload jsonb not null,
  result_snapshot jsonb not null,
  created_by uuid
    references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint business_expense_operations_business_key
    unique (business_id, operation_key),
  constraint business_expense_operations_expense_tenant_fk
    foreign key (business_id, expense_id)
    references public.business_expenses(business_id, id)
    on delete cascade,
  constraint business_expense_operations_action_check
    check (action in ('save', 'archive')),
  constraint business_expense_operations_key_length_check
    check (char_length(btrim(operation_key)) between 8 and 120),
  constraint business_expense_operations_request_object_check
    check (jsonb_typeof(request_payload) = 'object'),
  constraint business_expense_operations_result_object_check
    check (jsonb_typeof(result_snapshot) = 'object')
);

create table if not exists public.cash_session_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  cash_session_id uuid not null,
  movement_type text not null,
  amount numeric(12, 2) not null,
  reason text not null,
  operation_key text not null,
  created_by uuid
    references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  voided_by uuid
    references auth.users(id) on delete set null,
  voided_at timestamptz,
  void_operation_key text,
  constraint cash_session_movements_business_id_id_key
    unique (business_id, id),
  constraint cash_session_movements_session_tenant_fk
    foreign key (business_id, cash_session_id)
    references public.cash_sessions(business_id, id)
    on delete cascade,
  constraint cash_session_movements_business_operation_key
    unique (business_id, operation_key),
  constraint cash_session_movements_type_check
    check (movement_type in ('income', 'withdrawal')),
  constraint cash_session_movements_amount_check
    check (amount > 0 and amount <= 9999999999.99),
  constraint cash_session_movements_reason_length_check
    check (char_length(btrim(reason)) between 1 and 240),
  constraint cash_session_movements_operation_key_length_check
    check (char_length(btrim(operation_key)) between 8 and 120),
  constraint cash_session_movements_void_shape_check
    check (
      (
        voided_at is null
        and voided_by is null
        and void_operation_key is null
      )
      or (
        voided_at is not null
        and void_operation_key is not null
        and char_length(btrim(void_operation_key)) between 8 and 120
      )
    )
);

create unique index if not exists cash_session_movements_void_operation_key
  on public.cash_session_movements (
    business_id,
    void_operation_key
  )
  where void_operation_key is not null;

create index if not exists cash_session_movements_session_created_idx
  on public.cash_session_movements (
    business_id,
    cash_session_id,
    created_at
  );

create table if not exists public.cash_session_operations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  cash_session_id uuid not null,
  operation_key text not null,
  operation_type text not null,
  request_payload jsonb not null,
  result_snapshot jsonb not null,
  created_by uuid
    references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint cash_session_operations_business_key
    unique (business_id, operation_key),
  constraint cash_session_operations_session_tenant_fk
    foreign key (business_id, cash_session_id)
    references public.cash_sessions(business_id, id)
    on delete cascade,
  constraint cash_session_operations_type_check
    check (operation_type in ('close', 'reopen')),
  constraint cash_session_operations_key_length_check
    check (char_length(btrim(operation_key)) between 8 and 120),
  constraint cash_session_operations_request_object_check
    check (jsonb_typeof(request_payload) = 'object'),
  constraint cash_session_operations_result_object_check
    check (jsonb_typeof(result_snapshot) = 'object')
);

drop trigger if exists business_expenses_set_updated_at
  on public.business_expenses;

create trigger business_expenses_set_updated_at
before update on public.business_expenses
for each row
execute function private.tango_set_updated_at();

alter table public.business_expenses
  enable row level security;
alter table public.business_expenses
  force row level security;

alter table public.business_expense_operations
  enable row level security;
alter table public.business_expense_operations
  force row level security;

alter table public.cash_session_movements
  enable row level security;
alter table public.cash_session_movements
  force row level security;

alter table public.cash_session_operations
  enable row level security;
alter table public.cash_session_operations
  force row level security;

drop policy if exists business_expenses_select_expenses_member
  on public.business_expenses;

create policy business_expenses_select_expenses_member
on public.business_expenses
for select
to authenticated
using (
  (
    select private.current_user_has_module_access(
      business_id,
      'expenses',
      'view'
    )
  )
);

drop policy if exists cash_session_movements_select_cash_member
  on public.cash_session_movements;

create policy cash_session_movements_select_cash_member
on public.cash_session_movements
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

revoke all on table public.business_expenses
  from public, anon, authenticated;
revoke all on table public.business_expense_operations
  from public, anon, authenticated;
revoke all on table public.cash_session_movements
  from public, anon, authenticated;
revoke all on table public.cash_session_operations
  from public, anon, authenticated;

grant select on table public.business_expenses
  to authenticated;
grant select on table public.cash_session_movements
  to authenticated;

create or replace function public.save_business_expense(
  p_business_id uuid,
  p_expense_id uuid,
  p_expense_date date,
  p_due_date date,
  p_description text,
  p_provider text,
  p_category text,
  p_amount numeric,
  p_status text,
  p_payment_method text,
  p_operation_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  normalized_description text := btrim(coalesce(p_description, ''));
  normalized_provider text := btrim(coalesce(p_provider, ''));
  normalized_category text := btrim(coalesce(p_category, ''));
  normalized_status text := btrim(coalesce(p_status, ''));
  normalized_method text := btrim(coalesce(p_payment_method, ''));
  normalized_key text := btrim(coalesce(p_operation_key, ''));
  normalized_amount numeric(12, 2);
  normalized_payload jsonb;
  existing_operation public.business_expense_operations%rowtype;
  existing_expense public.business_expenses%rowtype;
  saved_expense public.business_expenses%rowtype;
  old_cash_effect boolean := false;
  new_cash_effect boolean := false;
  financial_changed boolean := true;
  old_session public.cash_sessions%rowtype;
  new_session public.cash_sessions%rowtype;
  next_paid_at timestamptz;
begin
  if actor_user_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not private.current_user_has_module_access(
    p_business_id,
    'expenses',
    'manage'
  ) then
    raise exception 'Insufficient expenses permission.'
      using errcode = '42501';
  end if;

  if p_business_id is null
    or p_expense_date is null
    or char_length(normalized_description) not between 1 and 240
    or char_length(normalized_provider) > 160
    or char_length(normalized_category) not between 1 and 80
    or p_amount is null
    or p_amount <= 0
    or p_amount > 9999999999.99
    or p_amount <> round(p_amount, 2)
    or normalized_status not in ('pending', 'paid')
    or normalized_method not in (
      'cash',
      'card',
      'mercado_pago',
      'transfer'
    )
    or char_length(normalized_key) not between 8 and 120 then
    raise exception 'Expense input is invalid.'
      using errcode = '22023';
  end if;

  normalized_amount := round(p_amount, 2)::numeric(12, 2);

  normalized_payload := jsonb_build_object(
    'expenseId', p_expense_id,
    'expenseDate', p_expense_date,
    'dueDate', p_due_date,
    'description', normalized_description,
    'provider', normalized_provider,
    'category', normalized_category,
    'amount', normalized_amount,
    'status', normalized_status,
    'paymentMethod', normalized_method
  );

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text, 0)
  );

  select operation.*
  into existing_operation
  from public.business_expense_operations as operation
  where operation.business_id = p_business_id
    and operation.operation_key = normalized_key
  limit 1;

  if found then
    if existing_operation.action = 'save'
      and existing_operation.request_payload = normalized_payload then
      return existing_operation.result_snapshot;
    end if;

    raise exception 'Expense operation key already exists with different data.'
      using errcode = '23505';
  end if;

  if p_expense_id is not null then
    select expense.*
    into existing_expense
    from public.business_expenses as expense
    where expense.business_id = p_business_id
      and expense.id = p_expense_id
    for update;

    if not found then
      raise exception 'Expense not found.'
        using errcode = 'P0001';
    end if;

    if existing_expense.archived_at is not null then
      raise exception 'Archived expense cannot be modified.'
        using errcode = 'P0001';
    end if;

    old_cash_effect :=
      existing_expense.status = 'paid'
      and existing_expense.payment_method = 'cash';

    financial_changed :=
      existing_expense.expense_date is distinct from p_expense_date
      or existing_expense.amount is distinct from normalized_amount
      or existing_expense.status is distinct from normalized_status
      or existing_expense.payment_method is distinct from normalized_method;
  end if;

  new_cash_effect :=
    normalized_status = 'paid'
    and normalized_method = 'cash';

  if financial_changed
    and (old_cash_effect or new_cash_effect)
    and not private.current_user_has_module_access(
      p_business_id,
      'cash',
      'manage'
    ) then
    raise exception 'Cash permission required for cash expense mutation.'
      using errcode = '42501';
  end if;

  if financial_changed and old_cash_effect then
    select session_row.*
    into old_session
    from public.cash_sessions as session_row
    where session_row.business_id = p_business_id
      and session_row.business_date = existing_expense.expense_date
    for update;

    if not found or old_session.status <> 'open' then
      raise exception 'Cash session must be open before changing this paid cash expense.'
        using errcode = 'P0001';
    end if;
  end if;

  if financial_changed and new_cash_effect then
    select session_row.*
    into new_session
    from public.cash_sessions as session_row
    where session_row.business_id = p_business_id
      and session_row.business_date = p_expense_date
    for update;

    if not found or new_session.status <> 'open' then
      raise exception 'Cash session must be open before registering this paid cash expense.'
        using errcode = 'P0001';
    end if;
  end if;

  next_paid_at := case
    when normalized_status = 'pending' then null
    when p_expense_id is not null
      and existing_expense.status = 'paid'
      and existing_expense.paid_at is not null
      then existing_expense.paid_at
    else now()
  end;

  if p_expense_id is null then
    insert into public.business_expenses (
      business_id,
      expense_date,
      due_date,
      description,
      provider,
      category,
      amount,
      status,
      payment_method,
      paid_at,
      created_by,
      updated_by
    )
    values (
      p_business_id,
      p_expense_date,
      p_due_date,
      normalized_description,
      normalized_provider,
      normalized_category,
      normalized_amount,
      normalized_status,
      normalized_method,
      next_paid_at,
      actor_user_id,
      actor_user_id
    )
    returning *
    into saved_expense;
  else
    update public.business_expenses
    set
      expense_date = p_expense_date,
      due_date = p_due_date,
      description = normalized_description,
      provider = normalized_provider,
      category = normalized_category,
      amount = normalized_amount,
      status = normalized_status,
      payment_method = normalized_method,
      paid_at = next_paid_at,
      updated_by = actor_user_id
    where business_id = p_business_id
      and id = p_expense_id
    returning *
    into saved_expense;
  end if;

  insert into public.business_expense_operations (
    business_id,
    operation_key,
    action,
    expense_id,
    request_payload,
    result_snapshot,
    created_by
  )
  values (
    p_business_id,
    normalized_key,
    'save',
    saved_expense.id,
    normalized_payload,
    to_jsonb(saved_expense),
    actor_user_id
  );

  return to_jsonb(saved_expense);
end;
$$;

create or replace function public.archive_business_expense(
  p_business_id uuid,
  p_expense_id uuid,
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
  normalized_payload jsonb;
  existing_operation public.business_expense_operations%rowtype;
  expense_row public.business_expenses%rowtype;
  saved_expense public.business_expenses%rowtype;
  cash_session_row public.cash_sessions%rowtype;
begin
  if actor_user_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not private.current_user_has_module_access(
    p_business_id,
    'expenses',
    'full'
  ) then
    raise exception 'Full expenses permission required.'
      using errcode = '42501';
  end if;

  if p_business_id is null
    or p_expense_id is null
    or char_length(normalized_key) not between 8 and 120 then
    raise exception 'Expense archive input is invalid.'
      using errcode = '22023';
  end if;

  normalized_payload := jsonb_build_object(
    'expenseId', p_expense_id
  );

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text, 0)
  );

  select operation.*
  into existing_operation
  from public.business_expense_operations as operation
  where operation.business_id = p_business_id
    and operation.operation_key = normalized_key
  limit 1;

  if found then
    if existing_operation.action = 'archive'
      and existing_operation.request_payload = normalized_payload then
      return existing_operation.result_snapshot;
    end if;

    raise exception 'Expense operation key already exists with different data.'
      using errcode = '23505';
  end if;

  select expense.*
  into expense_row
  from public.business_expenses as expense
  where expense.business_id = p_business_id
    and expense.id = p_expense_id
  for update;

  if not found then
    raise exception 'Expense not found.'
      using errcode = 'P0001';
  end if;

  if expense_row.archived_at is not null then
    saved_expense := expense_row;
  else
    if expense_row.status = 'paid'
      and expense_row.payment_method = 'cash' then
      if not private.current_user_has_module_access(
        p_business_id,
        'cash',
        'manage'
      ) then
        raise exception 'Cash permission required for paid cash expense archive.'
          using errcode = '42501';
      end if;

      select session_row.*
      into cash_session_row
      from public.cash_sessions as session_row
      where session_row.business_id = p_business_id
        and session_row.business_date = expense_row.expense_date
      for update;

      if not found or cash_session_row.status <> 'open' then
        raise exception 'Cash session must be open before archiving this paid cash expense.'
          using errcode = 'P0001';
      end if;
    end if;

    update public.business_expenses
    set
      archived_at = now(),
      updated_by = actor_user_id
    where business_id = p_business_id
      and id = p_expense_id
    returning *
    into saved_expense;
  end if;

  insert into public.business_expense_operations (
    business_id,
    operation_key,
    action,
    expense_id,
    request_payload,
    result_snapshot,
    created_by
  )
  values (
    p_business_id,
    normalized_key,
    'archive',
    saved_expense.id,
    normalized_payload,
    to_jsonb(saved_expense),
    actor_user_id
  );

  return to_jsonb(saved_expense);
end;
$$;

create or replace function public.add_business_cash_movement(
  p_business_id uuid,
  p_cash_session_id uuid,
  p_movement_type text,
  p_amount numeric,
  p_reason text,
  p_operation_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  normalized_type text := btrim(coalesce(p_movement_type, ''));
  normalized_reason text := btrim(coalesce(p_reason, ''));
  normalized_key text := btrim(coalesce(p_operation_key, ''));
  normalized_amount numeric(12, 2);
  session_row public.cash_sessions%rowtype;
  existing_movement public.cash_session_movements%rowtype;
  saved_movement public.cash_session_movements%rowtype;
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
    or p_cash_session_id is null
    or normalized_type not in ('income', 'withdrawal')
    or p_amount is null
    or p_amount <= 0
    or p_amount > 9999999999.99
    or p_amount <> round(p_amount, 2)
    or char_length(normalized_reason) not between 1 and 240
    or char_length(normalized_key) not between 8 and 120 then
    raise exception 'Cash movement input is invalid.'
      using errcode = '22023';
  end if;

  normalized_amount := round(p_amount, 2)::numeric(12, 2);

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text, 0)
  );

  select movement.*
  into existing_movement
  from public.cash_session_movements as movement
  where movement.business_id = p_business_id
    and movement.operation_key = normalized_key
  limit 1;

  if found then
    if existing_movement.cash_session_id = p_cash_session_id
      and existing_movement.movement_type = normalized_type
      and existing_movement.amount = normalized_amount
      and existing_movement.reason = normalized_reason then
      return to_jsonb(existing_movement);
    end if;

    raise exception 'Cash movement operation key already exists with different data.'
      using errcode = '23505';
  end if;

  select session_candidate.*
  into session_row
  from public.cash_sessions as session_candidate
  where session_candidate.business_id = p_business_id
    and session_candidate.id = p_cash_session_id
  for update;

  if not found or session_row.status <> 'open' then
    raise exception 'Cash session must be open for movements.'
      using errcode = 'P0001';
  end if;

  insert into public.cash_session_movements (
    business_id,
    cash_session_id,
    movement_type,
    amount,
    reason,
    operation_key,
    created_by
  )
  values (
    p_business_id,
    p_cash_session_id,
    normalized_type,
    normalized_amount,
    normalized_reason,
    normalized_key,
    actor_user_id
  )
  returning *
  into saved_movement;

  return to_jsonb(saved_movement);
end;
$$;

create or replace function public.void_business_cash_movement(
  p_business_id uuid,
  p_movement_id uuid,
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
  movement_row public.cash_session_movements%rowtype;
  session_row public.cash_sessions%rowtype;
  saved_movement public.cash_session_movements%rowtype;
begin
  if actor_user_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not private.current_user_has_module_access(
    p_business_id,
    'cash',
    'full'
  ) then
    raise exception 'Full cash permission required.'
      using errcode = '42501';
  end if;

  if p_business_id is null
    or p_movement_id is null
    or char_length(normalized_key) not between 8 and 120 then
    raise exception 'Cash movement void input is invalid.'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text, 0)
  );

  select movement.*
  into movement_row
  from public.cash_session_movements as movement
  where movement.business_id = p_business_id
    and movement.id = p_movement_id
  for update;

  if not found then
    raise exception 'Cash movement not found.'
      using errcode = 'P0001';
  end if;

  if movement_row.voided_at is not null then
    if movement_row.void_operation_key = normalized_key then
      return to_jsonb(movement_row);
    end if;

    raise exception 'Cash movement is already voided.'
      using errcode = 'P0001';
  end if;

  select session_candidate.*
  into session_row
  from public.cash_sessions as session_candidate
  where session_candidate.business_id = p_business_id
    and session_candidate.id = movement_row.cash_session_id
  for update;

  if not found or session_row.status <> 'open' then
    raise exception 'Cash session must be open before voiding a movement.'
      using errcode = 'P0001';
  end if;

  update public.cash_session_movements
  set
    voided_by = actor_user_id,
    voided_at = now(),
    void_operation_key = normalized_key
  where business_id = p_business_id
    and id = p_movement_id
  returning *
  into saved_movement;

  return to_jsonb(saved_movement);
end;
$$;

create or replace function public.get_business_cash_reconciliation(
  p_business_id uuid,
  p_business_date date
)
returns jsonb
language plpgsql
security definer
stable
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  session_row public.cash_sessions%rowtype;
  cash_sales numeric(12, 2) := 0;
  card_sales numeric(12, 2) := 0;
  mercado_pago_sales numeric(12, 2) := 0;
  transfer_sales numeric(12, 2) := 0;
  cash_expenses numeric(12, 2) := 0;
  movement_net numeric(12, 2) := 0;
  live_expected numeric(12, 2) := 0;
  movements_json jsonb := '[]'::jsonb;
begin
  if actor_user_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not private.current_user_has_module_access(
    p_business_id,
    'cash',
    'view'
  ) then
    raise exception 'Insufficient cash permission.'
      using errcode = '42501';
  end if;

  if p_business_id is null or p_business_date is null then
    raise exception 'Cash reconciliation input is invalid.'
      using errcode = '22023';
  end if;

  select session_candidate.*
  into session_row
  from public.cash_sessions as session_candidate
  where session_candidate.business_id = p_business_id
    and session_candidate.business_date = p_business_date
  limit 1;

  if not found then
    return jsonb_build_object(
      'session', null,
      'paymentTotals', jsonb_build_object(
        'cash', 0,
        'card', 0,
        'mercadoPago', 0,
        'transfer', 0
      ),
      'cashExpenses', 0,
      'movementNet', 0,
      'expectedCash', 0,
      'liveExpectedCash', 0,
      'movements', '[]'::jsonb
    );
  end if;

  select
    coalesce(sum(payment.amount) filter (
      where payment.payment_method = 'cash'
    ), 0),
    coalesce(sum(payment.amount) filter (
      where payment.payment_method = 'card'
    ), 0),
    coalesce(sum(payment.amount) filter (
      where payment.payment_method = 'mercado_pago'
    ), 0),
    coalesce(sum(payment.amount) filter (
      where payment.payment_method = 'transfer'
    ), 0)
  into
    cash_sales,
    card_sales,
    mercado_pago_sales,
    transfer_sales
  from public.business_payments as payment
  where payment.business_id = p_business_id
    and payment.cash_session_id = session_row.id;

  select coalesce(sum(expense.amount), 0)
  into cash_expenses
  from public.business_expenses as expense
  where expense.business_id = p_business_id
    and expense.expense_date = p_business_date
    and expense.status = 'paid'
    and expense.payment_method = 'cash'
    and expense.archived_at is null;

  select
    coalesce(
      sum(
        case movement.movement_type
          when 'income' then movement.amount
          else -movement.amount
        end
      ) filter (
        where movement.voided_at is null
      ),
      0
    ),
    coalesce(
      jsonb_agg(
        to_jsonb(movement)
        order by movement.created_at, movement.id
      ),
      '[]'::jsonb
    )
  into movement_net, movements_json
  from public.cash_session_movements as movement
  where movement.business_id = p_business_id
    and movement.cash_session_id = session_row.id;

  live_expected := (
    session_row.opening_amount
    + cash_sales
    - cash_expenses
    + movement_net
  )::numeric(12, 2);

  return jsonb_build_object(
    'session', to_jsonb(session_row),
    'paymentTotals', jsonb_build_object(
      'cash', cash_sales,
      'card', card_sales,
      'mercadoPago', mercado_pago_sales,
      'transfer', transfer_sales
    ),
    'cashExpenses', cash_expenses,
    'movementNet', movement_net,
    'expectedCash',
      case
        when session_row.status = 'closed'
          then session_row.expected_cash
        else live_expected
      end,
    'liveExpectedCash', live_expected,
    'movements', movements_json
  );
end;
$$;

create or replace function public.close_business_cash_session(
  p_business_id uuid,
  p_cash_session_id uuid,
  p_actual_cash numeric,
  p_notes text,
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
  normalized_notes text := btrim(coalesce(p_notes, ''));
  normalized_actual numeric(12, 2);
  normalized_payload jsonb;
  existing_operation public.cash_session_operations%rowtype;
  session_row public.cash_sessions%rowtype;
  saved_session public.cash_sessions%rowtype;
  cash_sales numeric(12, 2) := 0;
  card_sales numeric(12, 2) := 0;
  mercado_pago_sales numeric(12, 2) := 0;
  transfer_sales numeric(12, 2) := 0;
  cash_expenses numeric(12, 2) := 0;
  movement_net numeric(12, 2) := 0;
  calculated_expected_cash numeric(12, 2);
  difference_amount numeric(12, 2);
  movements_json jsonb := '[]'::jsonb;
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
    or p_cash_session_id is null
    or p_actual_cash is null
    or p_actual_cash < 0
    or p_actual_cash > 9999999999.99
    or p_actual_cash <> round(p_actual_cash, 2)
    or char_length(normalized_notes) > 4000
    or char_length(normalized_key) not between 8 and 120 then
    raise exception 'Cash close input is invalid.'
      using errcode = '22023';
  end if;

  normalized_actual := round(p_actual_cash, 2)::numeric(12, 2);
  normalized_payload := jsonb_build_object(
    'actualCash', normalized_actual,
    'notes', normalized_notes
  );

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text, 0)
  );

  select operation.*
  into existing_operation
  from public.cash_session_operations as operation
  where operation.business_id = p_business_id
    and operation.operation_key = normalized_key
  limit 1;

  if found then
    if existing_operation.operation_type = 'close'
      and existing_operation.cash_session_id = p_cash_session_id
      and existing_operation.request_payload = normalized_payload then
      return existing_operation.result_snapshot;
    end if;

    raise exception 'Cash close operation key already exists with different data.'
      using errcode = '23505';
  end if;

  select session_candidate.*
  into session_row
  from public.cash_sessions as session_candidate
  where session_candidate.business_id = p_business_id
    and session_candidate.id = p_cash_session_id
  for update;

  if not found then
    raise exception 'Cash session not found.'
      using errcode = 'P0001';
  end if;

  if session_row.status <> 'open' then
    raise exception 'Cash session is not open.'
      using errcode = 'P0001';
  end if;

  select
    coalesce(sum(payment.amount) filter (
      where payment.payment_method = 'cash'
    ), 0),
    coalesce(sum(payment.amount) filter (
      where payment.payment_method = 'card'
    ), 0),
    coalesce(sum(payment.amount) filter (
      where payment.payment_method = 'mercado_pago'
    ), 0),
    coalesce(sum(payment.amount) filter (
      where payment.payment_method = 'transfer'
    ), 0)
  into
    cash_sales,
    card_sales,
    mercado_pago_sales,
    transfer_sales
  from public.business_payments as payment
  where payment.business_id = p_business_id
    and payment.cash_session_id = p_cash_session_id;

  select coalesce(sum(expense.amount), 0)
  into cash_expenses
  from public.business_expenses as expense
  where expense.business_id = p_business_id
    and expense.expense_date = session_row.business_date
    and expense.status = 'paid'
    and expense.payment_method = 'cash'
    and expense.archived_at is null;

  select
    coalesce(
      sum(
        case movement.movement_type
          when 'income' then movement.amount
          else -movement.amount
        end
      ) filter (
        where movement.voided_at is null
      ),
      0
    ),
    coalesce(
      jsonb_agg(
        to_jsonb(movement)
        order by movement.created_at, movement.id
      ),
      '[]'::jsonb
    )
  into movement_net, movements_json
  from public.cash_session_movements as movement
  where movement.business_id = p_business_id
    and movement.cash_session_id = p_cash_session_id;

  calculated_expected_cash := (
    session_row.opening_amount
    + cash_sales
    - cash_expenses
    + movement_net
  )::numeric(12, 2);

  difference_amount := (
    normalized_actual
    - calculated_expected_cash
  )::numeric(12, 2);

  update public.cash_sessions
  set
    status = 'closed',
    closed_by = actor_user_id,
    closed_at = now(),
    actual_cash = normalized_actual,
    expected_cash = calculated_expected_cash,
    difference = difference_amount,
    cash_sales_snapshot = cash_sales,
    cash_expenses_snapshot = cash_expenses,
    cash_movements_snapshot = movement_net,
    notes = normalized_notes
  where business_id = p_business_id
    and id = p_cash_session_id
  returning *
  into saved_session;

  saved_result := jsonb_build_object(
    'session', to_jsonb(saved_session),
    'paymentTotals', jsonb_build_object(
      'cash', cash_sales,
      'card', card_sales,
      'mercadoPago', mercado_pago_sales,
      'transfer', transfer_sales
    ),
    'cashExpenses', cash_expenses,
    'movementNet', movement_net,
    'expectedCash', calculated_expected_cash,
    'liveExpectedCash', calculated_expected_cash,
    'movements', movements_json
  );

  insert into public.cash_session_operations (
    business_id,
    cash_session_id,
    operation_key,
    operation_type,
    request_payload,
    result_snapshot,
    created_by
  )
  values (
    p_business_id,
    p_cash_session_id,
    normalized_key,
    'close',
    normalized_payload,
    saved_result,
    actor_user_id
  );

  return saved_result;
end;
$$;

create or replace function public.reopen_business_cash_session(
  p_business_id uuid,
  p_cash_session_id uuid,
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
  normalized_payload jsonb := '{}'::jsonb;
  existing_operation public.cash_session_operations%rowtype;
  session_row public.cash_sessions%rowtype;
  saved_session public.cash_sessions%rowtype;
  saved_result jsonb;
begin
  if actor_user_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not private.current_user_has_module_access(
    p_business_id,
    'cash',
    'full'
  ) then
    raise exception 'Full cash permission required.'
      using errcode = '42501';
  end if;

  if p_business_id is null
    or p_cash_session_id is null
    or char_length(normalized_key) not between 8 and 120 then
    raise exception 'Cash reopen input is invalid.'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text, 0)
  );

  select operation.*
  into existing_operation
  from public.cash_session_operations as operation
  where operation.business_id = p_business_id
    and operation.operation_key = normalized_key
  limit 1;

  if found then
    if existing_operation.operation_type = 'reopen'
      and existing_operation.cash_session_id = p_cash_session_id
      and existing_operation.request_payload = normalized_payload then
      return existing_operation.result_snapshot;
    end if;

    raise exception 'Cash reopen operation key already exists with different data.'
      using errcode = '23505';
  end if;

  select session_candidate.*
  into session_row
  from public.cash_sessions as session_candidate
  where session_candidate.business_id = p_business_id
    and session_candidate.id = p_cash_session_id
  for update;

  if not found then
    raise exception 'Cash session not found.'
      using errcode = 'P0001';
  end if;

  if session_row.status <> 'closed' then
    raise exception 'Cash session is not closed.'
      using errcode = 'P0001';
  end if;

  update public.cash_sessions
  set
    status = 'open',
    closed_by = null,
    closed_at = null,
    actual_cash = null,
    expected_cash = null,
    difference = null,
    cash_sales_snapshot = null,
    cash_expenses_snapshot = null,
    cash_movements_snapshot = null,
    notes = ''
  where business_id = p_business_id
    and id = p_cash_session_id
  returning *
  into saved_session;

  saved_result := jsonb_build_object(
    'session', to_jsonb(saved_session)
  );

  insert into public.cash_session_operations (
    business_id,
    cash_session_id,
    operation_key,
    operation_type,
    request_payload,
    result_snapshot,
    created_by
  )
  values (
    p_business_id,
    p_cash_session_id,
    normalized_key,
    'reopen',
    normalized_payload,
    saved_result,
    actor_user_id
  );

  return saved_result;
end;
$$;

revoke all on function public.save_business_expense(
  uuid,
  uuid,
  date,
  date,
  text,
  text,
  text,
  numeric,
  text,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.save_business_expense(
  uuid,
  uuid,
  date,
  date,
  text,
  text,
  text,
  numeric,
  text,
  text,
  text
) to authenticated;

revoke all on function public.archive_business_expense(
  uuid,
  uuid,
  text
) from public, anon, authenticated;

grant execute on function public.archive_business_expense(
  uuid,
  uuid,
  text
) to authenticated;

revoke all on function public.add_business_cash_movement(
  uuid,
  uuid,
  text,
  numeric,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.add_business_cash_movement(
  uuid,
  uuid,
  text,
  numeric,
  text,
  text
) to authenticated;

revoke all on function public.void_business_cash_movement(
  uuid,
  uuid,
  text
) from public, anon, authenticated;

grant execute on function public.void_business_cash_movement(
  uuid,
  uuid,
  text
) to authenticated;

revoke all on function public.get_business_cash_reconciliation(
  uuid,
  date
) from public, anon, authenticated;

grant execute on function public.get_business_cash_reconciliation(
  uuid,
  date
) to authenticated;

revoke all on function public.close_business_cash_session(
  uuid,
  uuid,
  numeric,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.close_business_cash_session(
  uuid,
  uuid,
  numeric,
  text,
  text
) to authenticated;

revoke all on function public.reopen_business_cash_session(
  uuid,
  uuid,
  text
) from public, anon, authenticated;

grant execute on function public.reopen_business_cash_session(
  uuid,
  uuid,
  text
) to authenticated;

commit;
