do $$
declare
  unsafe_count integer;
begin
  if to_regclass('public.cash_sessions') is null
    or to_regclass('public.business_payment_operations') is null
    or to_regclass('public.business_payments') is null then
    raise exception 'Cash/payment tables are missing.';
  end if;

  if to_regprocedure(
    'public.open_business_cash_session(uuid,date,numeric,text)'
  ) is null then
    raise exception 'Open cash session RPC is missing.';
  end if;

  if to_regprocedure(
    'public.complete_business_reservation_payment(uuid,uuid,jsonb,text)'
  ) is null then
    raise exception 'Reservation payment RPC is missing.';
  end if;

  if exists (
    select 1
    from pg_class as relation
    join pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'cash_sessions',
        'business_payment_operations',
        'business_payments'
      )
      and (
        not relation.relrowsecurity
        or not relation.relforcerowsecurity
      )
  ) then
    raise exception 'Cash/payment tables must have forced RLS.';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'cash_sessions'
      and policyname = 'cash_sessions_select_cash_member'
      and cmd = 'SELECT'
  ) or not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'business_payments'
      and policyname = 'business_payments_select_cash_member'
      and cmd = 'SELECT'
  ) then
    raise exception 'Cash/payment SELECT policies are missing.';
  end if;

  select count(*)
  into unsafe_count
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in (
      'cash_sessions',
      'business_payment_operations',
      'business_payments'
    )
    and grantee in ('anon', 'authenticated')
    and privilege_type in (
      'INSERT',
      'UPDATE',
      'DELETE',
      'TRUNCATE',
      'REFERENCES',
      'TRIGGER'
    );

  if unsafe_count <> 0 then
    raise exception 'Direct cash/payment DML grant detected.';
  end if;

  if not has_table_privilege(
    'authenticated',
    'public.cash_sessions',
    'SELECT'
  ) or not has_table_privilege(
    'authenticated',
    'public.business_payments',
    'SELECT'
  ) then
    raise exception 'Authenticated cash/payment SELECT grants are missing.';
  end if;

  if has_table_privilege(
    'anon',
    'public.cash_sessions',
    'SELECT'
  ) or has_table_privilege(
    'anon',
    'public.business_payments',
    'SELECT'
  ) then
    raise exception 'Anon must not read cash/payment data.';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.business_payment_operations',
    'SELECT'
  ) then
    raise exception 'Payment operation idempotency table must remain private.';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.open_business_cash_session(uuid,date,numeric,text)',
    'EXECUTE'
  ) or not has_function_privilege(
    'authenticated',
    'public.complete_business_reservation_payment(uuid,uuid,jsonb,text)',
    'EXECUTE'
  ) then
    raise exception 'Authenticated cash/payment RPC grants are missing.';
  end if;

  if has_function_privilege(
    'anon',
    'public.open_business_cash_session(uuid,date,numeric,text)',
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.complete_business_reservation_payment(uuid,uuid,jsonb,text)',
    'EXECUTE'
  ) then
    raise exception 'Anon must not execute cash/payment RPCs.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'cash_sessions_business_date_key'
      and contype = 'u'
  ) or not exists (
    select 1
    from pg_constraint
    where conname = 'cash_sessions_open_operation_key'
      and contype = 'u'
  ) or not exists (
    select 1
    from pg_constraint
    where conname = 'business_payment_operations_business_key'
      and contype = 'u'
  ) or not exists (
    select 1
    from pg_constraint
    where conname = 'business_payments_operation_method_key'
      and contype = 'u'
  ) then
    raise exception 'Cash/payment idempotency constraints are missing.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_payment_operations_order_tenant_fk'
      and contype = 'f'
  ) or not exists (
    select 1
    from pg_constraint
    where conname = 'business_payment_operations_reservation_tenant_fk'
      and contype = 'f'
  ) or not exists (
    select 1
    from pg_constraint
    where conname = 'business_payment_operations_session_tenant_fk'
      and contype = 'f'
  ) or not exists (
    select 1
    from pg_constraint
    where conname = 'business_payments_order_tenant_fk'
      and contype = 'f'
  ) or not exists (
    select 1
    from pg_constraint
    where conname = 'business_payments_reservation_tenant_fk'
      and contype = 'f'
  ) or not exists (
    select 1
    from pg_constraint
    where conname = 'business_payments_session_tenant_fk'
      and contype = 'f'
  ) then
    raise exception 'Cash/payment tenant FKs are missing.';
  end if;

  if not exists (
    select 1
    from pg_proc as procedure
    join pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'open_business_cash_session'
      and procedure.prosecdef = true
  ) then
    raise exception 'Open cash session RPC security contract is incomplete.';
  end if;

  if not exists (
    select 1
    from pg_proc as procedure
    join pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'complete_business_reservation_payment'
      and procedure.prosecdef = true
  ) then
    raise exception 'Reservation payment RPC security contract is incomplete.';
  end if;
end;
$$;

select 'PASS' as cash_payments_write_postflight;
