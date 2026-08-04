do $$
declare
  settings_oid oid;
  table_oid oid;
  active_oid oid;
  assignment_oid oid;
  helper_oid oid;
  function_count integer;
  secure_function_count integer;
  required_table_count integer;
  rls_table_count integer;
  select_policy_count integer;
  unsafe_policy_count integer;
  direct_dml_count integer;
  required_constraint_count integer;
  trigger_count integer;
begin
  settings_oid := to_regprocedure(
    'public.save_business_floor_plan_settings(uuid,jsonb)'
  );
  table_oid := to_regprocedure(
    'public.save_business_floor_table(uuid,uuid,jsonb)'
  );
  active_oid := to_regprocedure(
    'public.set_business_floor_table_active(uuid,uuid,boolean)'
  );
  assignment_oid := to_regprocedure(
    'public.set_business_reservation_tables(uuid,uuid,uuid[])'
  );
  helper_oid := to_regprocedure(
    'private.validate_reservation_table_selection(uuid,uuid,uuid[])'
  );

  select count(*)
  into function_count
  from unnest(
    array[
      settings_oid,
      table_oid,
      active_oid,
      assignment_oid,
      helper_oid,
      to_regprocedure(
        'private.enforce_reservation_table_assignments()'
      ),
      to_regprocedure(
        'private.enforce_floor_table_assignments()'
      ),
      to_regprocedure(
        'private.enforce_reservation_rule_table_assignments()'
      )
    ]
  ) as required_function(oid)
  where oid is not null;

  if function_count <> 8 then
    raise exception
      'floor plan functions are incomplete';
  end if;

  select count(*)
  into secure_function_count
  from pg_proc
  where oid in (
    settings_oid,
    table_oid,
    active_oid,
    assignment_oid,
    helper_oid,
    to_regprocedure(
      'private.enforce_reservation_table_assignments()'
    ),
    to_regprocedure(
      'private.enforce_floor_table_assignments()'
    ),
    to_regprocedure(
      'private.enforce_reservation_rule_table_assignments()'
    )
  )
    and prosecdef
    and (
      'search_path=""' = any(proconfig)
      or 'search_path=' = any(proconfig)
    );

  if secure_function_count <> 8 then
    raise exception
      'floor plan functions are not hardened';
  end if;

  if has_function_privilege(
    'anon',
    'public.save_business_floor_plan_settings(uuid,jsonb)',
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.save_business_floor_table(uuid,uuid,jsonb)',
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.set_business_floor_table_active(uuid,uuid,boolean)',
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.set_business_reservation_tables(uuid,uuid,uuid[])',
    'EXECUTE'
  ) then
    raise exception
      'anon can execute a floor plan write function';
  end if;

  if has_function_privilege(
    'authenticated',
    'private.validate_reservation_table_selection(uuid,uuid,uuid[])',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'private.enforce_reservation_table_assignments()',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'private.enforce_floor_table_assignments()',
    'EXECUTE'
  ) or has_function_privilege(
    'authenticated',
    'private.enforce_reservation_rule_table_assignments()',
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'private.validate_reservation_table_selection(uuid,uuid,uuid[])',
    'EXECUTE'
  ) then
    raise exception
      'private floor plan functions are executable by API roles';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.save_business_floor_plan_settings(uuid,jsonb)',
    'EXECUTE'
  ) or not has_function_privilege(
    'authenticated',
    'public.save_business_floor_table(uuid,uuid,jsonb)',
    'EXECUTE'
  ) or not has_function_privilege(
    'authenticated',
    'public.set_business_floor_table_active(uuid,uuid,boolean)',
    'EXECUTE'
  ) or not has_function_privilege(
    'authenticated',
    'public.set_business_reservation_tables(uuid,uuid,uuid[])',
    'EXECUTE'
  ) then
    raise exception
      'authenticated cannot execute floor plan functions';
  end if;

  select count(*)
  into required_table_count
  from pg_class as table_class
  join pg_namespace as namespace
    on namespace.oid = table_class.relnamespace
  where namespace.nspname = 'public'
    and table_class.relkind = 'r'
    and table_class.relname in (
      'floor_plan_settings',
      'floor_tables',
      'reservation_table_assignments'
    );

  if required_table_count <> 3 then
    raise exception
      'floor plan tables are incomplete';
  end if;

  select count(*)
  into rls_table_count
  from pg_class as table_class
  join pg_namespace as namespace
    on namespace.oid = table_class.relnamespace
  where namespace.nspname = 'public'
    and table_class.relname in (
      'floor_plan_settings',
      'floor_tables',
      'reservation_table_assignments'
    )
    and table_class.relrowsecurity
    and table_class.relforcerowsecurity;

  if rls_table_count <> 3 then
    raise exception
      'floor plan tables do not force RLS';
  end if;

  select count(*)
  into select_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename in (
      'floor_plan_settings',
      'floor_tables',
      'reservation_table_assignments'
    )
    and cmd = 'SELECT'
    and policyname in (
      'floor_plan_settings_select_active_member',
      'floor_tables_select_active_member',
      'reservation_table_assignments_select_active_member'
    );

  if select_policy_count <> 3 then
    raise exception
      'floor plan SELECT policies are incomplete';
  end if;

  select count(*)
  into unsafe_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename in (
      'floor_plan_settings',
      'floor_tables',
      'reservation_table_assignments'
    )
    and cmd <> 'SELECT';

  if unsafe_policy_count <> 0 then
    raise exception
      'floor plan tables have unsafe write policies';
  end if;

  select count(*)
  into direct_dml_count
  from (
    values
      ('floor_plan_settings'),
      ('floor_tables'),
      ('reservation_table_assignments')
  ) as target(table_name)
  where has_table_privilege(
    'authenticated',
    format('public.%I', target.table_name),
    'INSERT'
  )
    or has_table_privilege(
      'authenticated',
      format('public.%I', target.table_name),
      'UPDATE'
    )
    or has_table_privilege(
      'authenticated',
      format('public.%I', target.table_name),
      'DELETE'
    );

  if direct_dml_count <> 0 then
    raise exception
      'authenticated has direct floor plan DML';
  end if;

  if has_table_privilege(
    'anon',
    'public.floor_plan_settings',
    'SELECT'
  ) or has_table_privilege(
    'anon',
    'public.floor_tables',
    'SELECT'
  ) or has_table_privilege(
    'anon',
    'public.reservation_table_assignments',
    'SELECT'
  ) then
    raise exception
      'anon can read floor plan tables';
  end if;

  if not has_table_privilege(
    'authenticated',
    'public.floor_plan_settings',
    'SELECT'
  ) or not has_table_privilege(
    'authenticated',
    'public.floor_tables',
    'SELECT'
  ) or not has_table_privilege(
    'authenticated',
    'public.reservation_table_assignments',
    'SELECT'
  ) then
    raise exception
      'authenticated cannot read floor plan tables';
  end if;

  select count(*)
  into required_constraint_count
  from pg_constraint
  where (
    conrelid = 'public.floor_plan_settings'::regclass
    and conname in (
      'floor_plan_settings_image_length_check',
      'floor_plan_settings_geometry_check',
      'floor_plan_settings_filters_check'
    )
  ) or (
    conrelid = 'public.floor_tables'::regclass
    and conname in (
      'floor_tables_business_id_id_key',
      'floor_tables_label_length_check',
      'floor_tables_seats_check',
      'floor_tables_position_check',
      'floor_tables_dimensions_check',
      'floor_tables_rotation_check',
      'floor_tables_corner_radius_check',
      'floor_tables_archive_state_check'
    )
  ) or (
    conrelid =
      'public.reservation_table_assignments'::regclass
    and conname in (
      'reservation_table_assignments_reservation_fkey',
      'reservation_table_assignments_table_fkey'
    )
  );

  if required_constraint_count <> 13 then
    raise exception
      'floor plan constraints are incomplete';
  end if;

  select count(*)
  into trigger_count
  from pg_trigger
  where not tgisinternal
    and (
      (
        tgrelid = 'public.reservations'::regclass
        and tgname =
          'reservations_validate_table_assignments'
      ) or (
        tgrelid = 'public.floor_tables'::regclass
        and tgname =
          'floor_tables_validate_assignments'
      ) or (
        tgrelid = 'public.reservation_rules'::regclass
        and tgname =
          'reservation_rules_validate_table_assignments'
      )
    );

  if trigger_count <> 3 then
    raise exception
      'floor plan consistency triggers are incomplete';
  end if;

  if to_regclass(
    'public.floor_tables_business_active_label_key'
  ) is null or to_regclass(
    'public.floor_tables_business_active_idx'
  ) is null or to_regclass(
    'public.reservation_table_assignments_business_idx'
  ) is null or to_regclass(
    'public.reservation_table_assignments_table_idx'
  ) is null then
    raise exception
      'floor plan indexes are incomplete';
  end if;
end;
$$;

select
  'floor_plan_write_rpc_postflight_ok'
  as result;
