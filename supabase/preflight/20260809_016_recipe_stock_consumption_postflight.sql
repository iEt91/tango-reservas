do $$
declare
  unsafe_count integer;
begin
  if to_regclass(
    'public.stock_recipe_operations'
  ) is null
    or to_regclass(
      'public.stock_recipe_operation_movements'
    ) is null then
    raise exception 'Recipe stock operation tables are missing.';
  end if;

  if to_regprocedure(
    'public.consume_business_menu_recipe_stock(uuid,uuid,integer,text,text,text,text)'
  ) is null then
    raise exception 'Recipe stock public RPC is missing.';
  end if;

  if to_regprocedure(
    'private.apply_recipe_stock_consumption(uuid,uuid,integer,text,text,text,text,text,uuid)'
  ) is null then
    raise exception 'Recipe stock private helper is missing.';
  end if;

  if exists (
    select 1
    from pg_class as relation
    join pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'stock_recipe_operations',
        'stock_recipe_operation_movements'
      )
      and (
        not relation.relrowsecurity
        or not relation.relforcerowsecurity
      )
  ) then
    raise exception 'Recipe stock operation tables must have forced RLS.';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stock_recipe_operations'
      and policyname =
        'stock_recipe_operations_select_module_member'
      and cmd = 'SELECT'
  ) then
    raise exception 'Recipe stock operation SELECT policy is missing.';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename =
        'stock_recipe_operation_movements'
      and policyname =
        'stock_recipe_operation_movements_select_module_member'
      and cmd = 'SELECT'
  ) then
    raise exception 'Recipe stock movement link SELECT policy is missing.';
  end if;

  select count(*)
  into unsafe_count
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in (
      'stock_recipe_operations',
      'stock_recipe_operation_movements'
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
    raise exception 'Direct recipe stock operation DML grant detected.';
  end if;

  if not has_table_privilege(
    'authenticated',
    'public.stock_recipe_operations',
    'SELECT'
  ) or not has_table_privilege(
    'authenticated',
    'public.stock_recipe_operation_movements',
    'SELECT'
  ) then
    raise exception 'Authenticated recipe stock SELECT grant is missing.';
  end if;

  if has_table_privilege(
    'anon',
    'public.stock_recipe_operations',
    'SELECT'
  ) or has_table_privilege(
    'anon',
    'public.stock_recipe_operation_movements',
    'SELECT'
  ) then
    raise exception 'Anon must not read recipe stock operation tables.';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.consume_business_menu_recipe_stock(uuid,uuid,integer,text,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'Authenticated recipe stock RPC grant is missing.';
  end if;

  if has_function_privilege(
    'anon',
    'public.consume_business_menu_recipe_stock(uuid,uuid,integer,text,text,text,text)',
    'EXECUTE'
  ) then
    raise exception 'Anon must not execute recipe stock RPC.';
  end if;

  if has_function_privilege(
    'authenticated',
    'private.apply_recipe_stock_consumption(uuid,uuid,integer,text,text,text,text,text,uuid)',
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'private.apply_recipe_stock_consumption(uuid,uuid,integer,text,text,text,text,text,uuid)',
    'EXECUTE'
  ) then
    raise exception 'Recipe stock transaction helper must stay private.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'stock_movements_business_id_id_key'
      and contype = 'u'
  ) then
    raise exception 'Stock movement composite key is missing.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'stock_recipe_operations_menu_item_tenant_fk'
      and contype = 'f'
  ) or not exists (
    select 1
    from pg_constraint
    where conname =
      'stock_recipe_operations_recipe_tenant_fk'
      and contype = 'f'
  ) then
    raise exception 'Recipe stock operation tenant FKs are missing.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'stock_recipe_operation_movements_operation_tenant_fk'
      and contype = 'f'
  ) or not exists (
    select 1
    from pg_constraint
    where conname =
      'stock_recipe_operation_movements_movement_tenant_fk'
      and contype = 'f'
  ) then
    raise exception 'Recipe stock movement tenant FKs are missing.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname =
      'stock_recipe_operations_business_key'
      and contype = 'u'
  ) then
    raise exception 'Recipe stock operation idempotency key is missing.';
  end if;

  if not exists (
    select 1
    from pg_proc as procedure
    join pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname =
        'consume_business_menu_recipe_stock'
      and procedure.prosecdef = true
  ) then
    raise exception 'Recipe stock RPC must remain SECURITY DEFINER.';
  end if;

  if not exists (
    select 1
    from pg_proc as procedure
    join pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'private'
      and procedure.proname =
        'apply_recipe_stock_consumption'
      and procedure.prosecdef = true
  ) then
    raise exception 'Recipe stock private helper must remain SECURITY DEFINER.';
  end if;
end;
$$;

select 'PASS' as recipe_stock_consumption_postflight;
