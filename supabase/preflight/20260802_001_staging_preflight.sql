-- Preflight de solo lectura. Ejecutar en el SQL Editor de STAGING antes de la migración.

select
  current_database() as database_name,
  current_user as execution_role,
  version() as postgres_version;

select
  to_regclass('public.businesses') as businesses_table,
  to_regclass('public.profiles') as profiles_table,
  to_regclass('public.business_members') as existing_membership_table;

select
  count(*) filter (
    where business_id is not null and auth_user_id is null
  ) as profiles_without_user,
  count(*) filter (
    where auth_user_id is not null and business_id is null
  ) as profiles_without_business
from public.profiles;

select count(*) as profiles_with_unknown_auth_user
from public.profiles as profile
left join auth.users as auth_user
  on auth_user.id = profile.auth_user_id
where profile.auth_user_id is not null
  and auth_user.id is null;

select
  business_id,
  auth_user_id,
  count(*) as duplicate_count
from public.profiles
where business_id is not null
  and auth_user_id is not null
group by business_id, auth_user_id
having count(*) > 1;

select role, count(*)
from public.profiles
group by role
order by role;

select
  namespace.nspname as table_schema,
  class.relname as table_name,
  class.relrowsecurity as row_security_active,
  class.relforcerowsecurity as force_row_security
from pg_class as class
join pg_namespace as namespace
  on namespace.oid = class.relnamespace
where namespace.nspname = 'public'
  and class.relkind = 'r'
  and class.relname in (
    'businesses',
    'profiles',
    'business_members',
    'customers',
    'reservations',
    'services'
  )
order by class.relname;

select
  namespace.nspname as function_schema,
  procedure.proname as function_name,
  procedure.prosecdef as security_definer
from pg_proc as procedure
join pg_namespace as namespace
  on namespace.oid = procedure.pronamespace
where procedure.proname in (
  'current_business_role',
  'is_business_member',
  'has_business_role',
  'tango_set_updated_at'
)
order by function_schema, function_name;
