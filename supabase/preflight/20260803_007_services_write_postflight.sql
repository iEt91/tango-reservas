do $$
declare
  save_oid oid;
  active_oid oid;
  save_definition text;
  active_definition text;
  save_config text[];
  active_config text[];
  required_constraints integer;
begin
  save_oid := to_regprocedure(
    'public.save_business_service(uuid,uuid,jsonb)'
  );
  active_oid := to_regprocedure(
    'public.set_business_service_active(uuid,uuid,boolean)'
  );

  if save_oid is null or active_oid is null then
    raise exception 'service write functions are incomplete';
  end if;

  select pg_get_functiondef(oid), proconfig
  into save_definition, save_config
  from pg_proc
  where oid = save_oid;

  select pg_get_functiondef(oid), proconfig
  into active_definition, active_config
  from pg_proc
  where oid = active_oid;

  if not exists (
    select 1
    from pg_proc
    where oid in (save_oid, active_oid)
      and prosecdef
    having count(*) = 2
  ) then
    raise exception 'service functions are not SECURITY DEFINER';
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
    raise exception 'service function search_path is not empty';
  end if;

  if save_definition not like '%private.has_business_role%'
    or save_definition not like '%owner%'
    or save_definition not like '%admin%'
    or save_definition not like '%business_id = p_business_id%'
    or active_definition not like '%private.has_business_role%'
    or active_definition not like '%business_id = p_business_id%' then
    raise exception 'service function authorization is incomplete';
  end if;

  if has_function_privilege(
    'anon',
    'public.save_business_service(uuid,uuid,jsonb)',
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.set_business_service_active(uuid,uuid,boolean)',
    'EXECUTE'
  ) then
    raise exception 'anon can execute a service write function';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.save_business_service(uuid,uuid,jsonb)',
    'EXECUTE'
  ) or not has_function_privilege(
    'authenticated',
    'public.set_business_service_active(uuid,uuid,boolean)',
    'EXECUTE'
  ) then
    raise exception 'authenticated cannot execute service functions';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.services',
    'INSERT'
  ) or has_table_privilege(
    'authenticated',
    'public.services',
    'UPDATE'
  ) or has_table_privilege(
    'authenticated',
    'public.services',
    'DELETE'
  ) then
    raise exception 'authenticated has direct services DML';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'services'
      and cmd <> 'SELECT'
  ) then
    raise exception 'services has a direct write policy';
  end if;

  if not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'services'
      and column_name = 'sort_order'
      and data_type = 'integer'
      and is_nullable = 'NO'
  ) then
    raise exception 'services.sort_order is incomplete';
  end if;

  select count(*)
  into required_constraints
  from pg_constraint
  where conrelid = 'public.services'::regclass
    and conname in (
      'services_name_length_check',
      'services_description_length_check',
      'services_duration_check',
      'services_capacity_check',
      'services_price_check',
      'services_sort_order_check'
    );

  if required_constraints <> 6 then
    raise exception 'service constraints are incomplete';
  end if;

  if to_regclass(
    'public.services_business_normalized_name_key'
  ) is null then
    raise exception 'normalized service name index is missing';
  end if;
end;
$$;

select 'services_write_rpc_postflight_ok' as result;
