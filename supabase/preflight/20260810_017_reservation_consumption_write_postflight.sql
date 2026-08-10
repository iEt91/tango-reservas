do $$
declare
  unsafe_count integer;
begin
  if to_regclass('public.business_orders') is null
    or to_regclass('public.business_order_items') is null
    or to_regclass('public.business_order_mutations') is null
    or to_regclass('public.business_order_stock_operations') is null
    or to_regclass('public.stock_recipe_return_operations') is null
    or to_regclass('public.stock_recipe_return_operation_movements') is null then
    raise exception 'Reservation consumption tables are missing.';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'reservations'
      and column_name = 'consumption_started_at'
  ) then
    raise exception 'Reservation consumption timestamp is missing.';
  end if;

  if to_regprocedure(
    'public.save_business_reservation_consumption(uuid,uuid,jsonb,text)'
  ) is null then
    raise exception 'Reservation consumption public RPC is missing.';
  end if;

  if to_regprocedure(
    'private.apply_recipe_stock_return(uuid,uuid,integer,text,text,text,text,text,uuid)'
  ) is null then
    raise exception 'Recipe stock return private helper is missing.';
  end if;

  if to_regprocedure(
    'private.guard_reservation_terminal_with_consumption()'
  ) is null then
    raise exception 'Reservation consumption terminal guard is missing.';
  end if;

  if exists (
    select 1
    from pg_class as relation
    join pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'business_orders',
        'business_order_items',
        'business_order_mutations',
        'business_order_stock_operations',
        'stock_recipe_return_operations',
        'stock_recipe_return_operation_movements'
      )
      and (
        not relation.relrowsecurity
        or not relation.relforcerowsecurity
      )
  ) then
    raise exception 'Reservation consumption tables must have forced RLS.';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'business_orders'
      and policyname = 'business_orders_select_domain_member'
      and cmd = 'SELECT'
  ) or not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'business_order_items'
      and policyname = 'business_order_items_select_domain_member'
      and cmd = 'SELECT'
  ) then
    raise exception 'Reservation consumption SELECT policies are missing.';
  end if;

  select count(*)
  into unsafe_count
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in (
      'business_orders',
      'business_order_items',
      'business_order_mutations',
      'business_order_stock_operations',
      'stock_recipe_return_operations',
      'stock_recipe_return_operation_movements'
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
    raise exception 'Direct reservation consumption DML grant detected.';
  end if;

  if not has_table_privilege(
    'authenticated',
    'public.business_orders',
    'SELECT'
  ) or not has_table_privilege(
    'authenticated',
    'public.business_order_items',
    'SELECT'
  ) then
    raise exception 'Authenticated order SELECT grants are missing.';
  end if;

  if has_table_privilege(
    'anon',
    'public.business_orders',
    'SELECT'
  ) or has_table_privilege(
    'anon',
    'public.business_order_items',
    'SELECT'
  ) then
    raise exception 'Anon must not read persistent orders.';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.business_order_mutations',
    'SELECT'
  ) or has_table_privilege(
    'authenticated',
    'public.business_order_stock_operations',
    'SELECT'
  ) or has_table_privilege(
    'authenticated',
    'public.stock_recipe_return_operations',
    'SELECT'
  ) or has_table_privilege(
    'authenticated',
    'public.stock_recipe_return_operation_movements',
    'SELECT'
  ) then
    raise exception 'Technical reservation consumption tables must remain private.';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.save_business_reservation_consumption(uuid,uuid,jsonb,text)',
    'EXECUTE'
  ) then
    raise exception 'Authenticated reservation consumption RPC grant is missing.';
  end if;

  if has_function_privilege(
    'anon',
    'public.save_business_reservation_consumption(uuid,uuid,jsonb,text)',
    'EXECUTE'
  ) then
    raise exception 'Anon must not execute reservation consumption RPC.';
  end if;

  if has_function_privilege(
    'authenticated',
    'private.apply_recipe_stock_return(uuid,uuid,integer,text,text,text,text,text,uuid)',
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'private.apply_recipe_stock_return(uuid,uuid,integer,text,text,text,text,text,uuid)',
    'EXECUTE'
  ) then
    raise exception 'Recipe stock return helper must stay private.';
  end if;

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
    raise exception 'Reservation composite tenant unique index is missing.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_orders_reservation_tenant_fk'
      and contype = 'f'
  ) or not exists (
    select 1
    from pg_constraint
    where conname = 'business_order_items_order_tenant_fk'
      and contype = 'f'
  ) or not exists (
    select 1
    from pg_constraint
    where conname = 'business_order_items_menu_item_tenant_fk'
      and contype = 'f'
  ) or not exists (
    select 1
    from pg_constraint
    where conname = 'business_order_stock_operations_recipe_operation_tenant_fk'
      and contype = 'f'
  ) or not exists (
    select 1
    from pg_constraint
    where conname = 'stock_recipe_return_operations_original_tenant_fk'
      and contype = 'f'
  ) then
    raise exception 'Reservation consumption tenant FKs are missing.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'business_order_mutations_business_key'
      and contype = 'u'
  ) or not exists (
    select 1
    from pg_constraint
    where conname = 'stock_recipe_return_operations_business_key'
      and contype = 'u'
  ) then
    raise exception 'Reservation consumption idempotency keys are missing.';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.reservations'::regclass
      and tgname = 'reservations_guard_terminal_with_consumption'
      and not tgisinternal
  ) then
    raise exception 'Reservation terminal guard trigger is missing.';
  end if;

  if not exists (
    select 1
    from pg_proc as procedure
    join pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'save_business_reservation_consumption'
      and procedure.prosecdef = true
  ) then
    raise exception 'Reservation consumption RPC must remain SECURITY DEFINER.';
  end if;

  if not exists (
    select 1
    from pg_proc as procedure
    join pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private'
      and procedure.proname = 'apply_recipe_stock_return'
      and procedure.prosecdef = true
  ) then
    raise exception 'Recipe stock return helper must remain SECURITY DEFINER.';
  end if;
end;
$$;

select 'PASS' as reservation_consumption_write_postflight;
