do $$
declare
  function_definition text;
  function_config text[];
begin
  if to_regprocedure(
    'public.replace_business_hours(uuid,jsonb)'
  ) is null then
    raise exception 'replace_business_hours is missing';
  end if;

  select
    pg_get_functiondef(oid),
    proconfig
  into
    function_definition,
    function_config
  from pg_proc
  where oid = to_regprocedure(
    'public.replace_business_hours(uuid,jsonb)'
  );

  if function_definition not ilike '%security definer%' then
    raise exception 'replace_business_hours is not SECURITY DEFINER';
  end if;

  if not coalesce(
    'search_path=""' = any(function_config)
    or 'search_path=' = any(function_config),
    false
  ) then
    raise exception 'replace_business_hours search_path is not empty';
  end if;

  if function_definition not like '%private.has_business_role%'
    or function_definition not like '%owner%'
    or function_definition not like '%admin%' then
    raise exception 'replace_business_hours role check is incomplete';
  end if;

  if has_function_privilege(
    'anon',
    'public.replace_business_hours(uuid,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'anon can execute replace_business_hours';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.replace_business_hours(uuid,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'authenticated cannot execute replace_business_hours';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.business_hours',
    'INSERT'
  ) or has_table_privilege(
    'authenticated',
    'public.business_hours',
    'UPDATE'
  ) or has_table_privilege(
    'authenticated',
    'public.business_hours',
    'DELETE'
  ) then
    raise exception 'authenticated has direct business_hours DML';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'business_hours'
      and cmd <> 'SELECT'
  ) then
    raise exception 'business_hours has a direct write policy';
  end if;
end;
$$;

select
  'business_hours_write_rpc_postflight_ok' as result;
