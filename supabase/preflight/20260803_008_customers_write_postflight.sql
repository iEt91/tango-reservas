do $$
declare
  save_oid oid;
  active_oid oid;
  save_definition text;
  active_definition text;
  save_config text[];
  active_config text[];
  required_constraints integer;
  required_columns integer;
begin
  save_oid := to_regprocedure(
    'public.save_business_customer(uuid,uuid,jsonb)'
  );
  active_oid := to_regprocedure(
    'public.set_business_customer_active(uuid,uuid,boolean)'
  );

  if save_oid is null or active_oid is null then
    raise exception 'customer write functions are incomplete';
  end if;

  select pg_get_functiondef(oid), proconfig
  into save_definition, save_config
  from pg_proc where oid = save_oid;
  select pg_get_functiondef(oid), proconfig
  into active_definition, active_config
  from pg_proc where oid = active_oid;

  if not exists (
    select 1 from pg_proc
    where oid in (save_oid, active_oid) and prosecdef
    having count(*) = 2
  ) then
    raise exception 'customer functions are not SECURITY DEFINER';
  end if;

  if not coalesce(
    'search_path=""' = any(save_config)
    or 'search_path=' = any(save_config),
    false
  ) or not coalesce(
    'search_path=""' = any(active_config)
    or 'search_path=' = any(active_config),
    false
  ) then
    raise exception 'customer function search_path is not empty';
  end if;

  if save_definition not like '%private.has_business_role%'
    or save_definition not like '%staff%'
    or save_definition not like '%business_id = p_business_id%'
    or active_definition not like '%private.has_business_role%'
    or active_definition not like '%business_id = p_business_id%' then
    raise exception 'customer function authorization is incomplete';
  end if;

  if has_function_privilege(
    'anon',
    'public.save_business_customer(uuid,uuid,jsonb)',
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.set_business_customer_active(uuid,uuid,boolean)',
    'EXECUTE'
  ) then
    raise exception 'anon can execute a customer write function';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.save_business_customer(uuid,uuid,jsonb)',
    'EXECUTE'
  ) or not has_function_privilege(
    'authenticated',
    'public.set_business_customer_active(uuid,uuid,boolean)',
    'EXECUTE'
  ) then
    raise exception 'authenticated cannot execute customer functions';
  end if;

  if has_table_privilege(
    'authenticated', 'public.customers', 'INSERT'
  ) or has_table_privilege(
    'authenticated', 'public.customers', 'UPDATE'
  ) or has_table_privilege(
    'authenticated', 'public.customers', 'DELETE'
  ) then
    raise exception 'authenticated has direct customers DML';
  end if;

  if not has_table_privilege(
    'authenticated', 'public.customers', 'SELECT'
  ) then
    raise exception 'authenticated cannot select customers';
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'customers'
      and policyname = 'customers_select_active_member'
      and cmd = 'SELECT'
  ) then
    raise exception 'customers SELECT policy is missing';
  end if;

  if exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'customers'
      and cmd <> 'SELECT'
  ) then
    raise exception 'customers has a direct write policy';
  end if;

  select count(*) into required_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'customers'
    and column_name in (
      'birth_date', 'preferences', 'tags', 'is_active'
    );

  if required_columns <> 4 then
    raise exception 'customer columns are incomplete';
  end if;

  select count(*) into required_constraints
  from pg_constraint
  where conrelid = 'public.customers'::regclass
    and conname in (
      'customers_full_name_length_check',
      'customers_email_length_check',
      'customers_phone_length_check',
      'customers_notes_length_check',
      'customers_preferences_length_check',
      'customers_birth_date_check',
      'customers_tags_check'
    );

  if required_constraints <> 7 then
    raise exception 'customer constraints are incomplete';
  end if;

  if to_regclass(
    'public.customers_business_normalized_phone_key'
  ) is null or to_regclass(
    'public.customers_business_normalized_email_key'
  ) is null then
    raise exception 'customer unique indexes are missing';
  end if;
end;
$$;

select 'customers_write_rpc_postflight_ok' as result;
