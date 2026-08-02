-- Postflight de solo lectura. Ejecutar en STAGING después de la migración.

do $$
begin
  if to_regclass('public.business_members') is null then
    raise exception 'business_members no existe';
  end if;

  if not exists (
    select 1
    from pg_class as class
    join pg_namespace as namespace
      on namespace.oid = class.relnamespace
    where namespace.nspname = 'public'
      and class.relname = 'business_members'
      and class.relrowsecurity
      and class.relforcerowsecurity
  ) then
    raise exception 'business_members no tiene RLS + FORCE RLS';
  end if;

  if to_regprocedure('private.has_business_role(uuid,text[])') is null then
    raise exception 'private.has_business_role no existe';
  end if;

  if to_regprocedure('public.has_business_role(uuid,text[])') is not null then
    raise exception 'existe un helper SECURITY DEFINER en public';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'business_members'
      and policyname = 'business_members_select_own_or_manager'
  ) then
    raise exception 'falta la política de lectura';
  end if;

  if has_table_privilege('anon', 'public.business_members', 'select') then
    raise exception 'anon conserva SELECT sobre business_members';
  end if;

  if has_table_privilege('authenticated', 'public.business_members', 'insert')
    or has_table_privilege('authenticated', 'public.business_members', 'update')
    or has_table_privilege('authenticated', 'public.business_members', 'delete')
  then
    raise exception 'authenticated conserva permisos de escritura';
  end if;
end;
$$;

select
  'PASS' as result,
  count(*) as active_memberships
from public.business_members
where status = 'active';

select
  business_id,
  role,
  status,
  count(*) as membership_count
from public.business_members
group by business_id, role, status
order by business_id, role, status;
