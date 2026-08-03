do $$
declare
  target_table text;
  has_rls boolean;
  has_force_rls boolean;
begin
  foreach target_table in array array[
    'businesses',
    'profiles'
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

  if not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'businesses'
      and policyname = 'businesses_select_active_member'
      and cmd = 'SELECT'
  ) then
    raise exception 'Falta businesses_select_active_member';
  end if;

  if not exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename = 'profiles'
      and policyname = 'profiles_select_self_or_manager'
      and cmd = 'SELECT'
  ) then
    raise exception 'Falta profiles_select_self_or_manager';
  end if;

  if exists (
    select 1
    from pg_catalog.pg_policies
    where schemaname = 'public'
      and tablename in ('businesses', 'profiles')
      and cmd <> 'SELECT'
  ) then
    raise exception 'Existe una política de escritura no autorizada';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in ('businesses', 'profiles')
      and grantee = 'anon'
  ) then
    raise exception 'anon conserva privilegios operativos';
  end if;

  if (
    select count(*)
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in ('businesses', 'profiles')
      and grantee = 'authenticated'
      and privilege_type = 'SELECT'
  ) <> 2 then
    raise exception 'authenticated no tiene exactamente dos grants SELECT';
  end if;

  if exists (
    select 1
    from information_schema.role_table_grants
    where table_schema = 'public'
      and table_name in ('businesses', 'profiles')
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
  'businesses y profiles: SELECT multiempresa, escrituras bloqueadas'
    as control;
