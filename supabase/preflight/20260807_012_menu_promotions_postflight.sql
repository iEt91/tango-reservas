do $$
declare
  column_count integer;
  table_count integer;
  rls_count integer;
  policy_count integer;
  constraint_count integer;
  function_count integer;
begin
  select count(*)
  into column_count
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'menu_categories'
    and column_name in (
      'is_promotion',
      'fixed_price',
      'discount_percent'
    );

  if column_count <> 3 then
    raise exception 'Menu promotion columns are incomplete.';
  end if;

  select count(*)
  into table_count
  from pg_class as relation
  join pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relname = 'menu_category_products'
    and relation.relkind = 'r';

  if table_count <> 1 then
    raise exception 'Menu promotion composition table is missing.';
  end if;

  select count(*)
  into rls_count
  from pg_class as relation
  join pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relname = 'menu_category_products'
    and relation.relrowsecurity
    and relation.relforcerowsecurity;

  if rls_count <> 1 then
    raise exception 'Menu promotion RLS is incomplete.';
  end if;

  select count(*)
  into policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'menu_category_products'
    and policyname = 'menu_category_products_select_active_member'
    and cmd = 'SELECT';

  if policy_count <> 1 then
    raise exception 'Menu promotion SELECT policy is incomplete.';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'menu_category_products'
      and cmd <> 'SELECT'
  ) then
    raise exception 'Menu promotion table has an unsafe write policy.';
  end if;

  if not has_table_privilege(
    'authenticated',
    'public.menu_category_products',
    'SELECT'
  ) then
    raise exception 'Authenticated promotion SELECT is missing.';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.menu_category_products',
    'INSERT,UPDATE,DELETE'
  ) then
    raise exception 'Authenticated has direct promotion DML.';
  end if;

  if has_table_privilege(
    'anon',
    'public.menu_category_products',
    'SELECT'
  ) then
    raise exception 'Anon has private promotion access.';
  end if;

  select count(*)
  into constraint_count
  from pg_constraint
  where conname in (
    'menu_categories_fixed_price_check',
    'menu_categories_discount_percent_check',
    'menu_category_products_category_tenant_fk',
    'menu_category_products_item_tenant_fk',
    'menu_category_products_quantity_check'
  );

  if constraint_count <> 5 then
    raise exception 'Menu promotion constraints are incomplete.';
  end if;

  select count(*)
  into function_count
  from pg_proc as procedure
  join pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname = 'save_business_menu_category_details'
    and procedure.prosecdef
    and pg_get_functiondef(procedure.oid)
      like '%private.has_business_role%'
    and pg_get_functiondef(procedure.oid)
      like '%pg_advisory_xact_lock%'
    and pg_get_functiondef(procedure.oid)
      like '%menu_category_products%'
    and has_function_privilege(
      'authenticated',
      procedure.oid,
      'EXECUTE'
    )
    and not has_function_privilege(
      'anon',
      procedure.oid,
      'EXECUTE'
    );

  if function_count <> 1 then
    raise exception 'Menu promotion RPC security is incomplete.';
  end if;
end;
$$;
