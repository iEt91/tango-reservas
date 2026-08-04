do $$
declare
  save_oid oid;
  status_oid oid;
  save_definition text;
  status_definition text;
  save_config text[];
  status_config text[];
  required_columns integer;
  required_constraints integer;
  unsafe_policies integer;
begin
  save_oid := to_regprocedure(
    'public.save_business_reservation(uuid,uuid,jsonb,text)'
  );
  status_oid := to_regprocedure(
    'public.set_business_reservation_status(uuid,uuid,text)'
  );

  if save_oid is null or status_oid is null then
    raise exception
      'reservation write functions are incomplete';
  end if;

  select pg_get_functiondef(oid), proconfig
  into save_definition, save_config
  from pg_proc
  where oid = save_oid;

  select pg_get_functiondef(oid), proconfig
  into status_definition, status_config
  from pg_proc
  where oid = status_oid;

  if not exists (
    select 1
    from pg_proc
    where oid in (save_oid, status_oid)
      and prosecdef
    having count(*) = 2
  ) then
    raise exception
      'reservation functions are not SECURITY DEFINER';
  end if;

  if not coalesce(
    'search_path=""' = any(save_config)
    or 'search_path=' = any(save_config),
    false
  ) or not coalesce(
    'search_path=""' = any(status_config)
    or 'search_path=' = any(status_config),
    false
  ) then
    raise exception
      'reservation function search_path is not empty';
  end if;

  if save_definition not like
      '%private.has_business_role%'
    or save_definition not like
      '%business_id = p_business_id%'
    or save_definition not like
      '%pg_advisory_xact_lock%'
    or save_definition not like
      '%idempotency_key%'
    or status_definition not like
      '%private.has_business_role%'
    or status_definition not like
      '%business_id = p_business_id%'
    or status_definition not like
      '%status transition is not allowed%' then
    raise exception
      'reservation function authorization is incomplete';
  end if;

  if has_function_privilege(
    'anon',
    'public.save_business_reservation(uuid,uuid,jsonb,text)',
    'EXECUTE'
  ) or has_function_privilege(
    'anon',
    'public.set_business_reservation_status(uuid,uuid,text)',
    'EXECUTE'
  ) then
    raise exception
      'anon can execute a reservation write function';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.save_business_reservation(uuid,uuid,jsonb,text)',
    'EXECUTE'
  ) or not has_function_privilege(
    'authenticated',
    'public.set_business_reservation_status(uuid,uuid,text)',
    'EXECUTE'
  ) then
    raise exception
      'authenticated cannot execute reservation functions';
  end if;

  if has_table_privilege(
    'authenticated',
    'public.reservations',
    'INSERT'
  ) or has_table_privilege(
    'authenticated',
    'public.reservations',
    'UPDATE'
  ) or has_table_privilege(
    'authenticated',
    'public.reservations',
    'DELETE'
  ) then
    raise exception
      'authenticated has direct reservations DML';
  end if;

  if not has_table_privilege(
    'authenticated',
    'public.reservations',
    'SELECT'
  ) then
    raise exception
      'authenticated cannot select reservations';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'reservations'
      and policyname =
        'reservations_select_active_member'
      and cmd = 'SELECT'
  ) then
    raise exception
      'reservations SELECT policy is missing';
  end if;

  select count(*)
  into unsafe_policies
  from pg_policies
  where schemaname = 'public'
    and tablename = 'reservations'
    and cmd <> 'SELECT';

  if unsafe_policies <> 0 then
    raise exception
      'reservations has unsafe write policies';
  end if;

  select count(*)
  into required_columns
  from information_schema.columns
  where table_schema = 'public'
    and table_name = 'reservations'
    and column_name in (
      'customer_id',
      'duration_minutes',
      'public_code',
      'idempotency_key',
      'confirmed_at',
      'completed_at',
      'cancelled_at',
      'no_show_at'
    );

  if required_columns <> 8 then
    raise exception
      'reservations required columns are incomplete';
  end if;

  select count(*)
  into required_constraints
  from pg_constraint
  where conrelid = 'public.reservations'::regclass
    and conname in (
      'reservations_customer_id_fkey',
      'reservations_customer_name_length_check',
      'reservations_customer_phone_length_check',
      'reservations_customer_email_length_check',
      'reservations_notes_length_check',
      'reservations_party_size_check',
      'reservations_duration_minutes_check',
      'reservations_public_code_check',
      'reservations_idempotency_key_length_check',
      'reservations_source_check'
    );

  if required_constraints <> 10 then
    raise exception
      'reservations required constraints are incomplete';
  end if;

  if to_regclass(
    'public.reservations_public_code_key'
  ) is null or to_regclass(
    'public.reservations_business_idempotency_key'
  ) is null then
    raise exception
      'reservation unique indexes are missing';
  end if;
end;
$$;

select
  'reservations_write_rpc_postflight_ok'
  as result;
