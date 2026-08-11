do $$
declare
  direct_api_grants integer;
  forced_rls_tables integer;
  authenticated_rpc_count integer;
  anonymous_rpc_count integer;
  private_helper_api_count integer;
begin
  if not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'business_shipping_orders'
  ) or not exists (
    select 1
    from information_schema.tables
    where table_schema = 'public'
      and table_name = 'business_shipping_operations'
  ) then
    raise exception 'Shipping tables are missing.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'business_payment_operations'
      and column_name = 'shipping_id'
      and is_nullable = 'YES'
  ) or not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'business_payments'
      and column_name = 'shipping_id'
      and is_nullable = 'YES'
  ) or exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name in ('business_payment_operations', 'business_payments')
      and column_name = 'reservation_id'
      and is_nullable <> 'YES'
  ) then
    raise exception 'Payment source columns are incomplete.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.business_payment_operations'::regclass
      and conname = 'business_payment_operations_source_check'
  ) or not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.business_payments'::regclass
      and conname = 'business_payments_source_check'
  ) then
    raise exception 'Payment source constraints are missing.';
  end if;

  select count(*)
  into forced_rls_tables
  from pg_class as relation
  join pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relname in (
      'business_shipping_orders',
      'business_shipping_operations'
    )
    and relation.relrowsecurity
    and relation.relforcerowsecurity;

  if forced_rls_tables <> 2 then
    raise exception 'Shipping tables require forced RLS.';
  end if;

  select count(*)
  into direct_api_grants
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in (
      'business_shipping_orders',
      'business_shipping_operations'
    )
    and grantee in ('anon', 'authenticated')
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE');

  if direct_api_grants <> 0 then
    raise exception 'Shipping technical tables expose direct write grants.';
  end if;

  if not has_table_privilege(
    'authenticated',
    'public.business_shipping_orders',
    'SELECT'
  ) or has_table_privilege(
    'authenticated',
    'public.business_shipping_operations',
    'SELECT'
  ) then
    raise exception 'Shipping read grants are invalid.';
  end if;

  if not has_table_privilege(
    'service_role',
    'public.business_shipping_orders',
    'SELECT'
  ) or not has_table_privilege(
    'service_role',
    'public.business_shipping_orders',
    'INSERT'
  ) or not has_table_privilege(
    'service_role',
    'public.business_shipping_orders',
    'UPDATE'
  ) or not has_table_privilege(
    'service_role',
    'public.business_shipping_orders',
    'DELETE'
  ) or not has_table_privilege(
    'service_role',
    'public.business_shipping_operations',
    'SELECT'
  ) or not has_table_privilege(
    'service_role',
    'public.business_shipping_operations',
    'INSERT'
  ) or not has_table_privilege(
    'service_role',
    'public.business_shipping_operations',
    'UPDATE'
  ) or not has_table_privilege(
    'service_role',
    'public.business_shipping_operations',
    'DELETE'
  ) then
    raise exception 'service_role shipping maintenance grants are incomplete.';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'business_shipping_orders'
      and policyname = 'business_shipping_orders_select_shipping_member'
      and roles = '{authenticated}'::name[]
  ) then
    raise exception 'Shipping SELECT policy is missing.';
  end if;

  select count(*)
  into authenticated_rpc_count
  from (
    values
      ('get_business_shipping_snapshot(uuid,date,date)'),
      ('save_business_shipping_order(uuid,uuid,date,time without time zone,text,text,text,text,text,text,boolean,text,jsonb,text)'),
      ('accept_business_shipping_order(uuid,uuid,integer,text)'),
      ('set_business_shipping_milestone(uuid,uuid,text,text)'),
      ('cancel_business_shipping_order(uuid,uuid,boolean,text)'),
      ('complete_business_shipping_payment(uuid,uuid,jsonb,text)'),
      ('get_business_shipping_kitchen_snapshot(uuid,date)'),
      ('set_business_shipping_kitchen_command_status(uuid,uuid,uuid,text,text)')
  ) as function_name(signature)
  where has_function_privilege(
    'authenticated',
    'public.' || function_name.signature,
    'EXECUTE'
  );

  if authenticated_rpc_count <> 8 then
    raise exception 'Authenticated shipping RPC grants are incomplete.';
  end if;

  select count(*)
  into anonymous_rpc_count
  from (
    values
      ('get_business_shipping_snapshot(uuid,date,date)'),
      ('save_business_shipping_order(uuid,uuid,date,time without time zone,text,text,text,text,text,text,boolean,text,jsonb,text)'),
      ('accept_business_shipping_order(uuid,uuid,integer,text)'),
      ('set_business_shipping_milestone(uuid,uuid,text,text)'),
      ('cancel_business_shipping_order(uuid,uuid,boolean,text)'),
      ('complete_business_shipping_payment(uuid,uuid,jsonb,text)'),
      ('get_business_shipping_kitchen_snapshot(uuid,date)'),
      ('set_business_shipping_kitchen_command_status(uuid,uuid,uuid,text,text)')
  ) as function_name(signature)
  where has_function_privilege(
    'anon',
    'public.' || function_name.signature,
    'EXECUTE'
  );

  if anonymous_rpc_count <> 0 then
    raise exception 'Anonymous can execute Shipping RPCs.';
  end if;

  select count(*)
  into private_helper_api_count
  from (
    values
      ('build_business_shipping_result(uuid,uuid)')
  ) as function_name(signature)
  where has_function_privilege(
    'authenticated',
    'private.' || function_name.signature,
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'private.' || function_name.signature,
    'EXECUTE'
  );

  if private_helper_api_count <> 0 then
    raise exception 'Private Shipping helper is API-executable.';
  end if;

  if not exists (
    select 1
    from pg_proc as procedure
    join pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'complete_business_reservation_payment'
  ) then
    raise exception 'Reservation payment RPC was lost.';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.business_order_items'::regclass
      and tgname = 'business_order_items_sync_kitchen_delta'
      and not tgisinternal
  ) then
    raise exception 'Kitchen delta trigger was lost.';
  end if;
end;
$$;

select 'PASS' as shipping_orders_write_postflight;
