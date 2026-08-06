do $$
declare
  table_count integer;
  rls_count integer;
  policy_count integer;
  function_count integer;
  execute_count integer;
  constraint_count integer;
begin
  select count(*)
  into table_count
  from pg_class as relation
  join pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relname in (
      'menu_categories',
      'menu_items'
    )
    and relation.relkind = 'r';

  if table_count <> 2 then
    raise exception 'Menu tables are incomplete.';
  end if;

  select count(*)
  into rls_count
  from pg_class as relation
  join pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relname in (
      'menu_categories',
      'menu_items'
    )
    and relation.relrowsecurity
    and relation.relforcerowsecurity;

  if rls_count <> 2 then
    raise exception 'Menu RLS is incomplete.';
  end if;

  select count(*)
  into policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename in (
      'menu_categories',
      'menu_items'
    )
    and policyname in (
      'menu_categories_select_active_member',
      'menu_items_select_active_member'
    )
    and cmd = 'SELECT';

  if policy_count <> 2 then
    raise exception 'Menu SELECT policies are incomplete.';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in (
        'menu_categories',
        'menu_items'
      )
      and cmd <> 'SELECT'
  ) then
    raise exception 'Menu has an unsafe write policy.';
  end if;

  if not has_table_privilege(
    'authenticated',
    'public.menu_categories',
    'SELECT'
  ) or not has_table_privilege(
    'authenticated',
    'public.menu_items',
    'SELECT'
  ) then
    raise exception 'Authenticated menu SELECT is incomplete.';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.menu_categories',
    'INSERT,UPDATE,DELETE'
  ) or has_table_privilege(
    'authenticated',
    'public.menu_items',
    'INSERT,UPDATE,DELETE'
  ) then
    raise exception 'Authenticated has direct menu DML.';
  end if;

  if has_table_privilege(
    'anon',
    'public.menu_categories',
    'SELECT'
  ) or has_table_privilege(
    'anon',
    'public.menu_items',
    'SELECT'
  ) then
    raise exception 'Anon has private menu access.';
  end if;

  select count(*)
  into function_count
  from pg_proc as procedure
  join pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname in (
      'save_business_menu_category',
      'archive_business_menu_category',
      'reorder_business_menu_categories',
      'save_business_menu_item',
      'archive_business_menu_item',
      'save_business_menu_item_quick_changes'
    )
    and procedure.prosecdef
    and pg_get_functiondef(procedure.oid)
      like '%private.has_business_role%';

  if function_count <> 6 then
    raise exception 'Menu RPC security is incomplete.';
  end if;

  select count(*)
  into execute_count
  from pg_proc as procedure
  join pg_namespace as namespace
    on namespace.oid = procedure.pronamespace
  where namespace.nspname = 'public'
    and procedure.proname in (
      'save_business_menu_category',
      'archive_business_menu_category',
      'reorder_business_menu_categories',
      'save_business_menu_item',
      'archive_business_menu_item',
      'save_business_menu_item_quick_changes'
    )
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

  if execute_count <> 6 then
    raise exception 'Menu RPC grants are incomplete.';
  end if;

  select count(*)
  into constraint_count
  from pg_constraint
  where conname in (
    'menu_categories_name_length_check',
    'menu_categories_description_length_check',
    'menu_categories_sort_order_check',
    'menu_items_category_tenant_fk',
    'menu_items_name_length_check',
    'menu_items_description_length_check',
    'menu_items_price_check',
    'menu_items_image_url_length_check',
    'menu_items_sort_order_check'
  );

  if constraint_count <> 9 then
    raise exception 'Menu constraints are incomplete.';
  end if;
end;
$$;
