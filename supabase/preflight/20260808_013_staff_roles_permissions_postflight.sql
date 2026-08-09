do $$
declare
  missing_columns text[];
  direct_write_count integer;
  auth_execute_count integer;
  anon_execute_count integer;
  role_policy_count integer;
  permission_policy_count integer;
  access_policy_count integer;
  notes_policy_count integer;
  member_policy_count integer;
  preset_count integer;
  invalid_preset_business_count integer;
begin
  select array_agg(column_name order by column_name)
  into missing_columns
  from (
    values
      ('email'),
      ('display_name'),
      ('phone'),
      ('staff_role_id')
  ) as expected(column_name)
  where not exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'business_members'
      and columns.column_name = expected.column_name
  );

  if missing_columns is not null then
    raise exception
      'Faltan columnas Staff en business_members: %',
      missing_columns;
  end if;

  if to_regclass('public.staff_roles') is null
    or to_regclass('public.staff_role_permissions') is null
    or to_regclass('public.staff_member_notes') is null
    or to_regclass('public.user_access_controls') is null then
    raise exception
      'Falta una tabla de Staff o revocación de sesión.';
  end if;

  if not exists (
    select 1
    from pg_class
    where oid = 'public.staff_roles'::regclass
      and relrowsecurity
      and relforcerowsecurity
  ) then
    raise exception
      'staff_roles no tiene RLS forzada.';
  end if;

  if not exists (
    select 1
    from pg_class
    where oid = 'public.staff_role_permissions'::regclass
      and relrowsecurity
      and relforcerowsecurity
  ) then
    raise exception
      'staff_role_permissions no tiene RLS forzada.';
  end if;

  if not exists (
    select 1
    from pg_class
    where oid = 'public.staff_member_notes'::regclass
      and relrowsecurity
      and relforcerowsecurity
  ) then
    raise exception
      'staff_member_notes no tiene RLS forzada.';
  end if;

  if not exists (
    select 1
    from pg_class
    where oid = 'public.user_access_controls'::regclass
      and relrowsecurity
      and relforcerowsecurity
  ) then
    raise exception
      'user_access_controls no tiene RLS forzada.';
  end if;

  select count(*)
  into role_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'staff_roles'
    and policyname = 'staff_roles_select_owner_or_assigned'
    and cmd = 'SELECT';

  if role_policy_count <> 1 then
    raise exception
      'La política SELECT de staff_roles no coincide.';
  end if;

  select count(*)
  into permission_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'staff_role_permissions'
    and policyname = 'staff_role_permissions_select_owner_or_assigned'
    and cmd = 'SELECT';

  if permission_policy_count <> 1 then
    raise exception
      'La política SELECT de permisos no coincide.';
  end if;

  select count(*)
  into notes_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'staff_member_notes'
    and policyname = 'staff_member_notes_select_owner'
    and cmd = 'SELECT';

  if notes_policy_count <> 1 then
    raise exception
      'Las notas internas no quedaron limitadas al dueño.';
  end if;

  select count(*)
  into access_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'user_access_controls'
    and policyname = 'user_access_controls_select_self'
    and cmd = 'SELECT';

  if access_policy_count <> 1 then
    raise exception
      'La política de revocación de sesión no coincide.';
  end if;

  select count(*)
  into member_policy_count
  from pg_policies
  where schemaname = 'public'
    and tablename = 'business_members'
    and policyname = 'business_members_select_own_or_owner'
    and cmd = 'SELECT';

  if member_policy_count <> 1 then
    raise exception
      'business_members no quedó limitado a usuario propio o dueño.';
  end if;

  select count(*)
  into direct_write_count
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in (
      'staff_roles',
      'staff_role_permissions',
      'staff_member_notes',
      'user_access_controls',
      'business_members'
    )
    and grantee in ('anon', 'authenticated')
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE');

  if direct_write_count <> 0 then
    raise exception
      'Hay privilegios de escritura directa sobre Staff.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.staff_role_permissions'::regclass
      and conname = 'staff_role_permissions_access_check'
      and pg_get_constraintdef(oid)
        like '%none%view%manage%full%'
  ) then
    raise exception
      'Falta el contrato de niveles de acceso.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.staff_role_permissions'::regclass
      and conname = 'staff_role_permissions_role_fk'
      and pg_get_constraintdef(oid)
        like '%FOREIGN KEY (business_id, role_id)%'
  ) then
    raise exception
      'La relación rol-permiso no está aislada por tenant.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.staff_member_notes'::regclass
      and conname = 'staff_member_notes_member_fk'
      and pg_get_constraintdef(oid)
        like '%FOREIGN KEY (business_id, member_id)%'
  ) then
    raise exception
      'Las notas internas no están aisladas por tenant.';
  end if;

  select count(distinct preset_key)
  into preset_count
  from public.staff_roles
  where is_preset
    and archived_at is null
    and preset_key in (
      'manager',
      'kitchen',
      'cashier',
      'waiter',
      'delivery'
    );

  if preset_count <> 5 then
    raise exception
      'No están los cinco roles predeterminados.';
  end if;

  select count(*)
  into invalid_preset_business_count
  from public.businesses as business
  where (
    select count(distinct role.preset_key)
    from public.staff_roles as role
    where role.business_id = business.id
      and role.is_preset
      and role.archived_at is null
      and role.preset_key in (
        'manager',
        'kitchen',
        'cashier',
        'waiter',
        'delivery'
      )
  ) <> 5;

  if invalid_preset_business_count <> 0 then
    raise exception
      'Algún local no tiene exactamente los cinco roles predeterminados.';
  end if;

  if not exists (
    select 1
    from pg_proc
    where oid = 'public.save_business_staff_role(uuid,uuid,text,jsonb)'::regprocedure
      and prosecdef
  ) then
    raise exception
      'save_business_staff_role no es SECURITY DEFINER.';
  end if;

  if not exists (
    select 1
    from pg_proc
    where oid = 'public.save_business_staff_member(uuid,uuid,uuid,text,text,text,text,uuid,text)'::regprocedure
      and prosecdef
  ) then
    raise exception
      'save_business_staff_member no es SECURITY DEFINER.';
  end if;

  if not exists (
    select 1
    from pg_proc
    where oid = 'public.set_business_staff_member_status(uuid,uuid,text)'::regprocedure
      and prosecdef
  ) then
    raise exception
      'set_business_staff_member_status no es SECURITY DEFINER.';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'auth.users'::regclass
      and tgname = 'tango_sync_staff_membership'
      and not tgisinternal
  ) then
    raise exception
      'Falta el trigger de aceptación de invitaciones.';
  end if;

  if not exists (
    select 1
    from pg_trigger
    where tgrelid = 'public.businesses'::regclass
      and tgname = 'business_seed_staff_roles'
      and not tgisinternal
  ) then
    raise exception
      'Falta el seed de roles para nuevos locales.';
  end if;

  select count(*)
  into auth_execute_count
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and grantee = 'authenticated'
    and privilege_type = 'EXECUTE'
    and routine_name in (
      'save_business_staff_role',
      'archive_business_staff_role',
      'resolve_staff_auth_user',
      'save_business_staff_member',
      'set_business_staff_member_status'
    );

  if auth_execute_count <> 5 then
    raise exception
      'authenticated no tiene exactamente cinco RPC de Staff.';
  end if;

  select count(*)
  into anon_execute_count
  from information_schema.routine_privileges
  where routine_schema = 'public'
    and grantee in ('anon', 'PUBLIC')
    and privilege_type = 'EXECUTE'
    and routine_name in (
      'save_business_staff_role',
      'archive_business_staff_role',
      'resolve_staff_auth_user',
      'save_business_staff_member',
      'set_business_staff_member_status'
    );

  if anon_execute_count <> 0 then
    raise exception
      'anon o PUBLIC pueden ejecutar RPC de Staff.';
  end if;

  if not exists (
    select 1
    from pg_proc
    where oid = 'private.bump_staff_user_reauth(uuid)'::regprocedure
      and prosecdef
  ) then
    raise exception
      'Falta la invalidación de sesiones por cambios de acceso.';
  end if;
end;
$$;

select 'PASS' as result;
