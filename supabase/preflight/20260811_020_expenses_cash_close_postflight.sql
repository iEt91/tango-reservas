do $$
declare
  missing text[] := array[]::text[];
begin
  if to_regclass('public.business_expenses') is null then
    missing := array_append(missing, 'business_expenses');
  end if;

  if to_regclass('public.business_expense_operations') is null then
    missing := array_append(missing, 'business_expense_operations');
  end if;

  if to_regclass('public.cash_session_movements') is null then
    missing := array_append(missing, 'cash_session_movements');
  end if;

  if to_regclass('public.cash_session_operations') is null then
    missing := array_append(missing, 'cash_session_operations');
  end if;

  if array_length(missing, 1) is not null then
    raise exception 'Missing E32C tables: %', array_to_string(missing, ', ');
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'cash_sessions'
      and column_name = 'cash_sales_snapshot'
  ) then
    raise exception 'cash_sessions.cash_sales_snapshot is missing';
  end if;

  if exists (
    select 1
    from pg_class as relation
    join pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'business_expenses',
        'business_expense_operations',
        'cash_session_movements',
        'cash_session_operations'
      )
      and (
        not relation.relrowsecurity
        or not relation.relforcerowsecurity
      )
  ) then
    raise exception 'E32C table without forced RLS';
  end if;

  if not has_table_privilege(
    'authenticated',
    'public.business_expenses',
    'SELECT'
  ) then
    raise exception 'authenticated must read business_expenses';
  end if;

  if not has_table_privilege(
    'authenticated',
    'public.cash_session_movements',
    'SELECT'
  ) then
    raise exception 'authenticated must read cash_session_movements';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.business_expenses',
    'INSERT'
  )
    or has_table_privilege(
      'authenticated',
      'public.business_expenses',
      'UPDATE'
    )
    or has_table_privilege(
      'authenticated',
      'public.business_expenses',
      'DELETE'
    ) then
    raise exception 'business_expenses exposes direct DML';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.business_expense_operations',
    'SELECT'
  )
    or has_table_privilege(
      'authenticated',
      'public.cash_session_operations',
      'SELECT'
    ) then
    raise exception 'E32C idempotency tables must remain private';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'business_expenses'
      and policyname = 'business_expenses_select_expenses_member'
  ) then
    raise exception 'Expense SELECT policy is missing';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cash_session_movements'
      and policyname = 'cash_session_movements_select_cash_member'
  ) then
    raise exception 'Cash movement SELECT policy is missing';
  end if;

  if has_function_privilege(
    'anon',
    'public.save_business_expense(uuid,uuid,date,date,text,text,text,numeric,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'anon must not execute expense RPCs';
  end if;

  if has_function_privilege(
    'anon',
    'public.close_business_cash_session(uuid,uuid,numeric,text,text)',
    'EXECUTE'
  ) then
    raise exception 'anon must not execute close RPC';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.save_business_expense(uuid,uuid,date,date,text,text,text,numeric,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'authenticated must execute expense RPC';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.get_business_cash_reconciliation(uuid,date)',
    'EXECUTE'
  ) then
    raise exception 'authenticated must execute reconciliation RPC';
  end if;
end;
$$;

select 'PASS' as expenses_cash_close_postflight;
