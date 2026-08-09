do $$
declare
  unsafe_count integer;
begin
  if to_regclass('public.menu_recipes') is null
    or to_regclass('public.menu_recipe_ingredients') is null then
    raise exception 'Recipe tables are missing.';
  end if;

  if to_regprocedure(
    'public.save_business_menu_recipe(uuid,uuid,jsonb,jsonb)'
  ) is null then
    raise exception 'Recipe save RPC is missing.';
  end if;

  if to_regprocedure(
    'private.recipe_quantity_in_stock_unit(numeric,text,text)'
  ) is null then
    raise exception 'Recipe unit conversion helper is missing.';
  end if;

  if to_regprocedure(
    'private.validate_stock_product_recipe_references()'
  ) is null then
    raise exception 'Recipe stock reference guard is missing.';
  end if;

  if exists (
    select 1
    from pg_class as relation
    join pg_namespace as namespace
      on namespace.oid = relation.relnamespace
    where namespace.nspname = 'public'
      and relation.relname in (
        'menu_recipes',
        'menu_recipe_ingredients'
      )
      and (
        not relation.relrowsecurity
        or not relation.relforcerowsecurity
      )
  ) then
    raise exception 'Recipe tables must have forced RLS.';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'menu_recipes'
      and policyname = 'menu_recipes_select_module_member'
      and cmd = 'SELECT'
  ) then
    raise exception 'Recipe SELECT policy is missing.';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'menu_recipe_ingredients'
      and policyname = 'menu_recipe_ingredients_select_module_member'
      and cmd = 'SELECT'
  ) then
    raise exception 'Recipe ingredient SELECT policy is missing.';
  end if;

  select count(*)
  into unsafe_count
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in (
      'menu_recipes',
      'menu_recipe_ingredients'
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
    raise exception 'Direct recipe DML grant detected.';
  end if;

  if not has_table_privilege(
    'authenticated',
    'public.menu_recipes',
    'SELECT'
  ) or not has_table_privilege(
    'authenticated',
    'public.menu_recipe_ingredients',
    'SELECT'
  ) then
    raise exception 'Authenticated recipe SELECT grant is missing.';
  end if;

  if has_table_privilege(
    'anon',
    'public.menu_recipes',
    'SELECT'
  ) or has_table_privilege(
    'anon',
    'public.menu_recipe_ingredients',
    'SELECT'
  ) then
    raise exception 'Anon must not read recipe tables.';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.save_business_menu_recipe(uuid,uuid,jsonb,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'Authenticated recipe RPC grant is missing.';
  end if;

  if has_function_privilege(
    'anon',
    'public.save_business_menu_recipe(uuid,uuid,jsonb,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'Anon must not execute recipe RPC.';
  end if;

  if has_function_privilege(
    'authenticated',
    'private.recipe_quantity_in_stock_unit(numeric,text,text)',
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'private.recipe_quantity_in_stock_unit(numeric,text,text)',
    'EXECUTE'
  ) then
    raise exception 'Recipe conversion helper must stay private.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'menu_recipes_menu_item_tenant_fk'
      and contype = 'f'
  ) then
    raise exception 'Tenant-safe recipe menu item FK is missing.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'menu_recipe_ingredients_recipe_tenant_fk'
      and contype = 'f'
  ) or not exists (
    select 1
    from pg_constraint
    where conname = 'menu_recipe_ingredients_stock_product_tenant_fk'
      and contype = 'f'
  ) then
    raise exception 'Tenant-safe recipe ingredient FKs are missing.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'menu_recipes_business_menu_item_key'
      and contype = 'u'
  ) then
    raise exception 'Recipe one-per-menu-item constraint is missing.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'menu_recipe_ingredients_recipe_product_key'
      and contype = 'u'
  ) then
    raise exception 'Recipe duplicate-product guard is missing.';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgname = 'stock_products_validate_recipe_references'
      and not tgisinternal
  ) then
    raise exception 'Stock recipe reference trigger is missing.';
  end if;

  if not exists (
    select 1
    from pg_proc as procedure
    join pg_namespace as namespace
      on namespace.oid = procedure.pronamespace
    where namespace.nspname = 'public'
      and procedure.proname = 'save_business_menu_recipe'
      and procedure.prosecdef = true
  ) then
    raise exception 'Recipe RPC must remain SECURITY DEFINER.';
  end if;
end;
$$;

select 'PASS' as recipes_write_postflight;
