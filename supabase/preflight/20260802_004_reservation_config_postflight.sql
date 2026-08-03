do $$
declare
  target_table text;
  has_rls boolean;
  has_force_rls boolean;
begin
  foreach target_table in array array[
    'business_hours',
    'reservation_rules',
    'services'
  ]
  loop
    select
      class.relrowsecurity,
      class.relforcerowsecurity
    into
      has_rls,
      has_force_rls
    from pg_catalog.pg_class as class
    join pg_catalog.pg_namespace as namespace
      on namespace.oid = class.relnamespace
    where namespace.nspname = 'public'
      and class.relname = target_table
      and class.relkind = 'r';

    if coalesce(has_rls, false) is not true then
      raise exception 'RLS no está activo en public.%', target_table;
    end if;

    if coalesce(has_force_rls, false) is not true then
      raise exception 'FORCE RLS no está activo en public.%', target_table;
    end if;
  end loop;

  if (
    select count(*)
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in (
        'business_hours',
        'reservation_rules',
        'services'
      )
      and policyname in (
        'business_hours_select_active_member',
        'reservation_rules_select_active_member',
        'services_select_active_member'
      )
      and cmd = 'SELECT'
  ) <> 3 then
    raise exception 'No existen exactamente tres políticas SELECT esperadas';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in (
        'business_hours',
        'reservation_rules',
        'services'
      )
      and cmd <> 'SELECT'
  ) then
    raise exception 'Existe una política de escritura no autorizada';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in (
        'business_hours',
        'reservation_rules',
        'services'
      )
      and grantee = 'anon'
  ) then
    raise exception 'anon conserva privilegios de configuración';
  end if;

  if (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in (
        'business_hours',
        'reservation_rules',
        'services'
      )
      and grantee = 'authenticated'
      and privilege_type = 'SELECT'
  ) <> 3 then
    raise exception 'authenticated no tiene exactamente tres grants SELECT';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in (
        'business_hours',
        'reservation_rules',
        'services'
      )
      and grantee = 'authenticated'
      and privilege_type in (
        'INSERT',
        'UPDATE',
        'DELETE',
        'TRUNCATE',
        'REFERENCES',
        'TRIGGER'
      )
  ) then
    raise exception 'authenticated conserva privilegios de escritura';
  end if;
end;
$$;

select
  'PASS' as result,
  'configuración de reservas: SELECT multiempresa, escrituras bloqueadas'
    as control;
