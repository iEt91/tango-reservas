do $$
declare
  function_definition text;
  function_is_security_definer boolean;
  function_config text[];
  required_columns integer;
begin
  if to_regprocedure(
    'public.save_reservation_configuration(uuid,jsonb,jsonb)'
  ) is null then
    raise exception 'save_reservation_configuration is missing';
  end if;

  select
    pg_get_functiondef(oid),
    prosecdef,
    proconfig
  into
    function_definition,
    function_is_security_definer,
    function_config
  from pg_proc
  where oid = to_regprocedure(
    'public.save_reservation_configuration(uuid,jsonb,jsonb)'
  );

  if not function_is_security_definer then
    raise exception 'save_reservation_configuration is not SECURITY DEFINER';
  end if;

  if not coalesce(
    'search_path=""' = any(function_config)
    or 'search_path=' = any(function_config),
    false
  ) then
    raise exception 'save_reservation_configuration search_path is not empty';
  end if;

  if function_definition not like '%private.has_business_role%'
    or function_definition not like '%replace_business_hours%'
    or function_definition not like '%reservation_rules%'
    or function_definition not like '%owner%'
    or function_definition not like '%admin%' then
    raise exception 'save_reservation_configuration authorization is incomplete';
  end if;

  if has_function_privilege(
    'anon',
    'public.save_reservation_configuration(uuid,jsonb,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'anon can execute save_reservation_configuration';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.save_reservation_configuration(uuid,jsonb,jsonb)',
    'EXECUTE'
  ) then
    raise exception 'authenticated cannot execute save_reservation_configuration';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.reservation_rules',
    'INSERT'
  ) or has_table_privilege(
    'authenticated',
    'public.reservation_rules',
    'UPDATE'
  ) or has_table_privilege(
    'authenticated',
    'public.reservation_rules',
    'DELETE'
  ) or has_table_privilege(
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
    raise exception 'authenticated has direct configuration DML';
  end if;

  if exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename in ('business_hours', 'reservation_rules')
      and cmd <> 'SELECT'
  ) then
    raise exception 'configuration tables have a direct write policy';
  end if;

  select count(*)
  into required_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'reservation_rules'
    and column_name in (
      'reservations_enabled',
      'default_reservation_duration_minutes',
      'max_people_per_slot',
      'allow_reservations_without_table',
      'auto_assign_reservation_tables',
      'allow_table_combinations'
    )
    and is_nullable = 'NO';

  if required_columns <> 6 then
    raise exception 'reservation settings columns are incomplete';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reservation_rules'::regclass
      and conname = 'reservation_rules_default_duration_check'
  ) or not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reservation_rules'::regclass
      and conname = 'reservation_rules_min_notice_range_check'
  ) or not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reservation_rules'::regclass
      and conname = 'reservation_rules_max_days_range_check'
  ) or not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reservation_rules'::regclass
      and conname = 'reservation_rules_max_people_check'
  ) then
    raise exception 'reservation settings constraints are incomplete';
  end if;
end;
$$;

select
  'reservation_settings_write_postflight_ok' as result;
