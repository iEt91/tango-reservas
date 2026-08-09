do $$
declare
  missing text[];
  unsafe_count integer;
begin
  select array_agg(required.object_name order by required.object_name)
  into missing
  from (
    values
      ('table public.stock_products'),
      ('table public.stock_movements'),
      ('function public.save_business_stock_product(uuid,uuid,jsonb)'),
      ('function public.record_business_stock_movement(uuid,uuid,jsonb)'),
      ('function public.archive_business_stock_product(uuid,uuid)'),
      ('function private.current_user_has_module_access(uuid,text,text)')
  ) as required(object_name)
  where case required.object_name
    when 'table public.stock_products' then
      to_regclass('public.stock_products') is null
    when 'table public.stock_movements' then
      to_regclass('public.stock_movements') is null
    when 'function public.save_business_stock_product(uuid,uuid,jsonb)' then
      to_regprocedure(
        'public.save_business_stock_product(uuid,uuid,jsonb)'
      ) is null
    when 'function public.record_business_stock_movement(uuid,uuid,jsonb)' then
      to_regprocedure(
        'public.record_business_stock_movement(uuid,uuid,jsonb)'
      ) is null
    when 'function public.archive_business_stock_product(uuid,uuid)' then
      to_regprocedure(
        'public.archive_business_stock_product(uuid,uuid)'
      ) is null
    when 'function private.current_user_has_module_access(uuid,text,text)' then
      to_regprocedure(
        'private.current_user_has_module_access(uuid,text,text)'
      ) is null
    else true
  end;

  if missing is not null then
    raise exception 'Stock postflight missing objects: %', missing;
  end if;

  if exists (
    select 1
    from pg_class as relation
    join pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'stock_products',
        'stock_movements'
      )
      and (
        not relation.relrowsecurity
        or not relation.relforcerowsecurity
      )
  ) then
    raise exception 'Stock tables must have forced RLS.';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stock_products'
      and policyname = 'stock_products_select_module_member'
      and cmd = 'SELECT'
  ) then
    raise exception 'Stock product SELECT policy is missing.';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stock_movements'
      and policyname = 'stock_movements_select_module_member'
      and cmd = 'SELECT'
  ) then
    raise exception 'Stock movement SELECT policy is missing.';
  end if;

  select count(*)
  into unsafe_count
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in (
      'stock_products',
      'stock_movements'
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
    raise exception 'Direct stock DML grant detected.';
  end if;

  if not has_table_privilege(
    'authenticated',
    'public.stock_products',
    'SELECT'
  ) or not has_table_privilege(
    'authenticated',
    'public.stock_movements',
    'SELECT'
  ) then
    raise exception 'Authenticated stock SELECT grant is missing.';
  end if;

  if has_table_privilege(
    'anon',
    'public.stock_products',
    'SELECT'
  ) or has_table_privilege(
    'anon',
    'public.stock_movements',
    'SELECT'
  ) then
    raise exception 'Anon must not read stock tables.';
  end if;

  if not has_function_privilege(
    'authenticated',
    'private.current_user_has_module_access(uuid,text,text)',
    'EXECUTE'
  ) then
    raise exception 'Module access helper grant is missing.';
  end if;

  if has_function_privilege(
    'anon',
    'private.current_user_has_module_access(uuid,text,text)',
    'EXECUTE'
  ) then
    raise exception 'Anon must not execute module access helper.';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.save_business_stock_product(uuid,uuid,jsonb)',
    'EXECUTE'
  ) or not has_function_privilege(
    'authenticated',
    'public.record_business_stock_movement(uuid,uuid,jsonb)',
    'EXECUTE'
  ) or not has_function_privilege(
    'authenticated',
    'public.archive_business_stock_product(uuid,uuid)',
    'EXECUTE'
  ) then
    raise exception 'Authenticated stock RPC grants are incomplete.';
  end if;

  if has_function_privilege(
    'anon',
    'public.save_business_stock_product(uuid,uuid,jsonb)',
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.record_business_stock_movement(uuid,uuid,jsonb)',
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.archive_business_stock_product(uuid,uuid)',
    'EXECUTE'
  ) then
    raise exception 'Anon must not execute stock RPCs.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'stock_movements_product_tenant_fk'
      and contype = 'f'
  ) then
    raise exception 'Tenant-safe stock movement foreign key is missing.';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'stock_movements'
      and indexname = 'stock_movements_operation_key_key'
      and indexdef ilike '%unique%'
  ) then
    raise exception 'Stock idempotency index is missing.';
  end if;

  if not exists (
    select 1
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'stock_movements'
      and indexname = 'stock_movements_opening_product_key'
      and indexdef ilike '%unique%'
  ) then
    raise exception 'Opening-stock uniqueness is missing.';
  end if;

  if not exists (
    select 1
    from pg_proc as procedure
    join pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname in (
        'save_business_stock_product',
        'record_business_stock_movement',
        'archive_business_stock_product'
      )
      and procedure.prosecdef = true
    group by namespace.nspname
    having count(*) = 3
  ) then
    raise exception 'Stock RPCs must remain SECURITY DEFINER.';
  end if;
end;
$$;

select 'PASS' as stock_write_postflight;
