begin;

create table if not exists public.staff_roles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  preset_key text,
  name text not null,
  is_preset boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint staff_roles_business_id_id_key
    unique (business_id, id),
  constraint staff_roles_name_check
    check (char_length(btrim(name)) between 2 and 80),
  constraint staff_roles_preset_check
    check (
      (is_preset and preset_key is not null)
      or (not is_preset and preset_key is null)
    )
);

create unique index if not exists staff_roles_active_name_key
  on public.staff_roles (business_id, lower(name))
  where archived_at is null;

create unique index if not exists staff_roles_preset_key
  on public.staff_roles (business_id, preset_key)
  where preset_key is not null;

create table if not exists public.staff_role_permissions (
  business_id uuid not null,
  role_id uuid not null,
  module_key text not null,
  access_level text not null default 'none',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, role_id, module_key),
  constraint staff_role_permissions_role_fk
    foreign key (business_id, role_id)
    references public.staff_roles(business_id, id)
    on delete cascade,
  constraint staff_role_permissions_module_check
    check (
      module_key in (
        'home',
        'reservations',
        'floor_plan',
        'customers',
        'shipping',
        'kitchen',
        'menu',
        'recipes',
        'products',
        'stock',
        'stock_history',
        'cash',
        'expenses',
        'history',
        'reports',
        'web'
      )
    ),
  constraint staff_role_permissions_access_check
    check (
      access_level in ('none', 'view', 'manage', 'full')
    )
);

create table if not exists public.staff_member_notes (
  business_id uuid not null,
  member_id uuid not null,
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, member_id),
  constraint staff_member_notes_length_check
    check (char_length(notes) <= 2000)
);

alter table public.business_members
  drop constraint if exists business_members_business_id_id_key;

alter table public.business_members
  add constraint business_members_business_id_id_key
  unique (business_id, id);

alter table public.staff_member_notes
  drop constraint if exists staff_member_notes_member_fk;

alter table public.staff_member_notes
  add constraint staff_member_notes_member_fk
  foreign key (business_id, member_id)
  references public.business_members(business_id, id)
  on delete cascade;

alter table public.business_members
  add column if not exists email text,
  add column if not exists display_name text not null default '',
  add column if not exists phone text not null default '',
  add column if not exists staff_role_id uuid;

update public.business_members as member
set email = lower(coalesce(member.invited_email, auth_user.email))
from auth.users as auth_user
where member.user_id = auth_user.id
  and member.email is null
  and auth_user.email is not null;

update public.business_members
set email = lower(invited_email)
where email is null
  and invited_email is not null;

update public.business_members as member
set display_name = profile.full_name
from public.profiles as profile
where member.user_id = profile.auth_user_id
  and member.display_name = ''
  and profile.full_name <> '';

alter table public.business_members
  drop constraint if exists business_members_staff_role_fk;

alter table public.business_members
  add constraint business_members_staff_role_fk
  foreign key (business_id, staff_role_id)
  references public.staff_roles(business_id, id)
  on delete restrict;

alter table public.business_members
  drop constraint if exists business_members_status_check;

alter table public.business_members
  add constraint business_members_status_check
  check (status in ('active', 'invited', 'disabled', 'removed'));

alter table public.business_members
  drop constraint if exists business_members_identity_check;

alter table public.business_members
  add constraint business_members_identity_check
  check (
    (
      status = 'invited'
      and email is not null
    )
    or (
      status in ('active', 'disabled')
      and user_id is not null
    )
    or (
      status = 'removed'
      and email is not null
    )
  );

drop index if exists public.business_members_pending_email_key;

create unique index if not exists business_members_active_email_key
  on public.business_members (business_id, lower(email))
  where status <> 'removed'
    and email is not null;

create index if not exists business_members_staff_role_idx
  on public.business_members (business_id, staff_role_id, status);

create table if not exists public.user_access_controls (
  user_id uuid primary key
    references auth.users(id) on delete cascade,
  reauth_after timestamptz,
  updated_at timestamptz not null default now()
);

insert into public.user_access_controls (user_id)
select distinct member.user_id
from public.business_members as member
where member.user_id is not null
on conflict (user_id) do nothing;

drop trigger if exists staff_roles_set_updated_at
  on public.staff_roles;

create trigger staff_roles_set_updated_at
before update on public.staff_roles
for each row
execute function private.tango_set_updated_at();

drop trigger if exists staff_role_permissions_set_updated_at
  on public.staff_role_permissions;

create trigger staff_role_permissions_set_updated_at
before update on public.staff_role_permissions
for each row
execute function private.tango_set_updated_at();

drop trigger if exists staff_member_notes_set_updated_at
  on public.staff_member_notes;

create trigger staff_member_notes_set_updated_at
before update on public.staff_member_notes
for each row
execute function private.tango_set_updated_at();

drop trigger if exists user_access_controls_set_updated_at
  on public.user_access_controls;

create trigger user_access_controls_set_updated_at
before update on public.user_access_controls
for each row
execute function private.tango_set_updated_at();

create or replace function private.bump_staff_user_reauth(
  target_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if target_user_id is null then
    return;
  end if;

  insert into public.user_access_controls (
    user_id,
    reauth_after
  )
  values (
    target_user_id,
    clock_timestamp()
  )
  on conflict (user_id)
  do update
  set reauth_after = excluded.reauth_after,
      updated_at = now();
end;
$$;

create or replace function private.current_user_uses_staff_role(
  target_business_id uuid,
  target_role_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.business_members as member
    where member.business_id = target_business_id
      and member.user_id = (select auth.uid())
      and member.status = 'active'
      and member.staff_role_id = target_role_id
  );
$$;

create or replace function private.seed_business_staff_roles(
  target_business_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  module_keys constant text[] := array[
    'home',
    'reservations',
    'floor_plan',
    'customers',
    'shipping',
    'kitchen',
    'menu',
    'recipes',
    'products',
    'stock',
    'stock_history',
    'cash',
    'expenses',
    'history',
    'reports',
    'web'
  ]::text[];
begin
  insert into public.staff_roles (
    business_id,
    preset_key,
    name,
    is_preset
  )
  values
    (target_business_id, 'manager', 'Encargado', true),
    (target_business_id, 'kitchen', 'Cocina', true),
    (target_business_id, 'cashier', 'Cajero', true),
    (target_business_id, 'waiter', 'Mozo', true),
    (target_business_id, 'delivery', 'Delivery', true)
  on conflict (business_id, preset_key)
    where preset_key is not null
  do nothing;

  insert into public.staff_role_permissions (
    business_id,
    role_id,
    module_key,
    access_level
  )
  select
    role.business_id,
    role.id,
    module_key,
    case
      when role.preset_key = 'manager'
        and module_key = 'home'
        then 'view'
      when role.preset_key = 'manager'
        and module_key = 'reservations'
        then 'full'
      when role.preset_key = 'manager'
        and module_key in (
          'floor_plan',
          'customers',
          'shipping',
          'web'
        )
        then 'manage'
      when role.preset_key = 'manager'
        and module_key in (
          'kitchen',
          'menu',
          'stock',
          'stock_history',
          'history',
          'reports'
        )
        then 'view'
      when role.preset_key = 'kitchen'
        and module_key = 'home'
        then 'view'
      when role.preset_key = 'kitchen'
        and module_key = 'kitchen'
        then 'manage'
      when role.preset_key = 'kitchen'
        and module_key in (
          'menu',
          'recipes',
          'products',
          'stock',
          'stock_history'
        )
        then 'view'
      when role.preset_key = 'cashier'
        and module_key = 'home'
        then 'view'
      when role.preset_key = 'cashier'
        and module_key = 'cash'
        then 'manage'
      when role.preset_key = 'cashier'
        and module_key = 'history'
        then 'view'
      when role.preset_key = 'waiter'
        and module_key = 'home'
        then 'view'
      when role.preset_key = 'waiter'
        and module_key in (
          'reservations',
          'floor_plan'
        )
        then 'manage'
      when role.preset_key = 'waiter'
        and module_key in (
          'customers',
          'kitchen',
          'menu'
        )
        then 'view'
      when role.preset_key = 'delivery'
        and module_key = 'home'
        then 'view'
      when role.preset_key = 'delivery'
        and module_key = 'shipping'
        then 'manage'
      when role.preset_key = 'delivery'
        and module_key in (
          'customers',
          'menu'
        )
        then 'view'
      else 'none'
    end
  from public.staff_roles as role
  cross join unnest(module_keys) as module_key
  where role.business_id = target_business_id
    and role.is_preset = true
    and role.archived_at is null
  on conflict (business_id, role_id, module_key)
  do nothing;
end;
$$;

select private.seed_business_staff_roles(business.id)
from public.businesses as business;

create or replace function private.seed_staff_roles_after_business_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform private.seed_business_staff_roles(new.id);
  return new;
end;
$$;

drop trigger if exists business_seed_staff_roles
  on public.businesses;

create trigger business_seed_staff_roles
after insert on public.businesses
for each row
execute function private.seed_staff_roles_after_business_insert();

create or replace function private.sync_staff_membership_from_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_access_controls (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  if new.email is not null then
    update public.business_members
    set user_id = coalesce(user_id, new.id),
        email = lower(new.email),
        invited_email = case
          when status = 'invited' then lower(new.email)
          else null
        end
    where lower(email) = lower(new.email)
      and status in ('invited', 'active', 'disabled')
      and (user_id is null or user_id = new.id);
  end if;

  if new.email_confirmed_at is not null then
    update public.business_members
    set status = 'active',
        invited_email = null
    where user_id = new.id
      and status = 'invited';
  end if;

  return new;
end;
$$;

drop trigger if exists tango_sync_staff_membership
  on auth.users;

create trigger tango_sync_staff_membership
after insert or update of email, email_confirmed_at
on auth.users
for each row
execute function private.sync_staff_membership_from_auth_user();

alter table public.staff_roles enable row level security;
alter table public.staff_roles force row level security;

alter table public.staff_role_permissions enable row level security;
alter table public.staff_role_permissions force row level security;

alter table public.staff_member_notes enable row level security;
alter table public.staff_member_notes force row level security;

alter table public.user_access_controls enable row level security;
alter table public.user_access_controls force row level security;

drop policy if exists staff_roles_select_owner_or_assigned
  on public.staff_roles;

create policy staff_roles_select_owner_or_assigned
on public.staff_roles
for select
to authenticated
using (
  archived_at is null
  and (
    (
      select private.has_business_role(
        business_id,
        array['owner']::text[]
      )
    )
    or (
      select private.current_user_uses_staff_role(
        business_id,
        id
      )
    )
  )
);

drop policy if exists staff_role_permissions_select_owner_or_assigned
  on public.staff_role_permissions;

create policy staff_role_permissions_select_owner_or_assigned
on public.staff_role_permissions
for select
to authenticated
using (
  (
    select private.has_business_role(
      business_id,
      array['owner']::text[]
    )
  )
  or (
    select private.current_user_uses_staff_role(
      business_id,
      role_id
    )
  )
);

drop policy if exists staff_member_notes_select_owner
  on public.staff_member_notes;

create policy staff_member_notes_select_owner
on public.staff_member_notes
for select
to authenticated
using (
  (select private.has_business_role(
    business_id,
    array['owner']::text[]
  ))
);

drop policy if exists user_access_controls_select_self
  on public.user_access_controls;

create policy user_access_controls_select_self
on public.user_access_controls
for select
to authenticated
using (
  user_id = (select auth.uid())
);

drop policy if exists business_members_select_own_or_manager
  on public.business_members;

drop policy if exists business_members_select_own_or_owner
  on public.business_members;

create policy business_members_select_own_or_owner
on public.business_members
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (
    user_id = (select auth.uid())
    or (
      select private.has_business_role(
        business_id,
        array['owner']::text[]
      )
    )
  )
);

revoke all on table public.staff_roles
  from public, anon, authenticated;
grant select on table public.staff_roles
  to authenticated;

revoke all on table public.staff_role_permissions
  from public, anon, authenticated;
grant select on table public.staff_role_permissions
  to authenticated;

revoke all on table public.staff_member_notes
  from public, anon, authenticated;
grant select on table public.staff_member_notes
  to authenticated;

revoke all on table public.user_access_controls
  from public, anon, authenticated;
grant select on table public.user_access_controls
  to authenticated;

create or replace function public.save_business_staff_role(
  p_business_id uuid,
  p_role_id uuid,
  p_name text,
  p_permissions jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  normalized_name text := btrim(coalesce(p_name, ''));
  target_role public.staff_roles%rowtype;
  module_keys constant text[] := array[
    'home',
    'reservations',
    'floor_plan',
    'customers',
    'shipping',
    'kitchen',
    'menu',
    'recipes',
    'products',
    'stock',
    'stock_history',
    'cash',
    'expenses',
    'history',
    'reports',
    'web'
  ]::text[];
  permission_key text;
  permission_value text;
  result_permissions jsonb;
begin
  if actor_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication required.';
  end if;

  if not (
    select private.has_business_role(
      p_business_id,
      array['owner']::text[]
    )
  ) then
    raise exception using
      errcode = '42501',
      message = 'Only the business owner can manage staff roles.';
  end if;

  if char_length(normalized_name) < 2
    or char_length(normalized_name) > 80 then
    raise exception using
      errcode = '22023',
      message = 'Invalid staff role name.';
  end if;

  if p_permissions is null
    or jsonb_typeof(p_permissions) <> 'object' then
    raise exception using
      errcode = '22023',
      message = 'Staff permissions must be a JSON object.';
  end if;

  for permission_key, permission_value
  in select key, value
     from jsonb_each_text(p_permissions)
  loop
    if not (permission_key = any(module_keys))
      or permission_value not in (
        'none',
        'view',
        'manage',
        'full'
      ) then
      raise exception using
        errcode = '22023',
        message = 'Invalid staff permission.';
    end if;
  end loop;

  if p_role_id is null then
    insert into public.staff_roles (
      business_id,
      name,
      is_preset,
      preset_key
    )
    values (
      p_business_id,
      normalized_name,
      false,
      null
    )
    returning * into target_role;
  else
    select *
    into target_role
    from public.staff_roles as role
    where role.id = p_role_id
      and role.business_id = p_business_id
      and role.archived_at is null
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'Staff role not found.';
    end if;

    if target_role.is_preset then
      raise exception using
        errcode = '42501',
        message = 'Preset staff roles cannot be edited.';
    end if;

    update public.staff_roles
    set name = normalized_name
    where id = target_role.id
      and business_id = p_business_id
    returning * into target_role;
  end if;

  delete from public.staff_role_permissions
  where business_id = p_business_id
    and role_id = target_role.id;

  insert into public.staff_role_permissions (
    business_id,
    role_id,
    module_key,
    access_level
  )
  select
    p_business_id,
    target_role.id,
    module_key,
    coalesce(p_permissions ->> module_key, 'none')
  from unnest(module_keys) as module_key;

  if p_role_id is not null then
    perform private.bump_staff_user_reauth(member.user_id)
    from public.business_members as member
    where member.business_id = p_business_id
      and member.staff_role_id = target_role.id
      and member.status = 'active'
      and member.user_id is not null;
  end if;

  select jsonb_object_agg(
    permission.module_key,
    permission.access_level
  )
  into result_permissions
  from public.staff_role_permissions as permission
  where permission.business_id = p_business_id
    and permission.role_id = target_role.id;

  return jsonb_build_object(
    'id', target_role.id,
    'business_id', target_role.business_id,
    'name', target_role.name,
    'preset_key', target_role.preset_key,
    'is_preset', target_role.is_preset,
    'permissions', coalesce(result_permissions, '{}'::jsonb)
  );
end;
$$;

create or replace function public.archive_business_staff_role(
  p_business_id uuid,
  p_role_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  target_role public.staff_roles%rowtype;
begin
  if actor_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication required.';
  end if;

  if not (
    select private.has_business_role(
      p_business_id,
      array['owner']::text[]
    )
  ) then
    raise exception using
      errcode = '42501',
      message = 'Only the business owner can manage staff roles.';
  end if;

  select *
  into target_role
  from public.staff_roles as role
  where role.id = p_role_id
    and role.business_id = p_business_id
    and role.archived_at is null
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Staff role not found.';
  end if;

  if target_role.is_preset then
    raise exception using
      errcode = '42501',
      message = 'Preset staff roles cannot be removed.';
  end if;

  if exists (
    select 1
    from public.business_members as member
    where member.business_id = p_business_id
      and member.staff_role_id = target_role.id
      and member.status <> 'removed'
  ) then
    raise exception using
      errcode = '23503',
      message = 'Staff role is still assigned.';
  end if;

  update public.staff_roles
  set archived_at = now()
  where business_id = p_business_id
    and id = target_role.id
  returning * into target_role;

  return jsonb_build_object(
    'id', target_role.id,
    'business_id', target_role.business_id,
    'name', target_role.name,
    'archived_at', target_role.archived_at
  );
end;
$$;

create or replace function public.resolve_staff_auth_user(
  p_business_id uuid,
  p_email text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  normalized_email text := lower(btrim(coalesce(p_email, '')));
  target_user auth.users%rowtype;
begin
  if actor_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication required.';
  end if;

  if not (
    select private.has_business_role(
      p_business_id,
      array['owner']::text[]
    )
  ) then
    raise exception using
      errcode = '42501',
      message = 'Only the business owner can resolve staff users.';
  end if;

  select *
  into target_user
  from auth.users as auth_user
  where lower(auth_user.email) = normalized_email
  limit 1;

  if not found then
    return null;
  end if;

  return jsonb_build_object(
    'user_id', target_user.id,
    'confirmed', target_user.email_confirmed_at is not null
  );
end;
$$;

create or replace function public.save_business_staff_member(
  p_business_id uuid,
  p_member_id uuid,
  p_user_id uuid,
  p_email text,
  p_display_name text,
  p_phone text,
  p_notes text,
  p_staff_role_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  normalized_email text := lower(btrim(coalesce(p_email, '')));
  normalized_name text := btrim(coalesce(p_display_name, ''));
  normalized_phone text := btrim(coalesce(p_phone, ''));
  normalized_notes text := btrim(coalesce(p_notes, ''));
  target_member public.business_members%rowtype;
  previous_role_id uuid;
  previous_status text;
  effective_user_id uuid;
begin
  if actor_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication required.';
  end if;

  if not (
    select private.has_business_role(
      p_business_id,
      array['owner']::text[]
    )
  ) then
    raise exception using
      errcode = '42501',
      message = 'Only the business owner can manage staff.';
  end if;

  if char_length(normalized_email) < 3
    or char_length(normalized_email) > 254
    or position('@' in normalized_email) <= 1 then
    raise exception using
      errcode = '22023',
      message = 'Invalid staff email.';
  end if;

  if char_length(normalized_name) < 2
    or char_length(normalized_name) > 120 then
    raise exception using
      errcode = '22023',
      message = 'Invalid staff display name.';
  end if;

  if char_length(normalized_phone) > 60
    or char_length(normalized_notes) > 2000 then
    raise exception using
      errcode = '22023',
      message = 'Invalid staff metadata.';
  end if;

  if p_status not in ('active', 'invited', 'disabled') then
    raise exception using
      errcode = '22023',
      message = 'Invalid staff status.';
  end if;

  if p_status in ('active', 'disabled')
    and p_user_id is null
    and p_member_id is null then
    raise exception using
      errcode = '22023',
      message = 'Active staff requires an auth user.';
  end if;

  if not exists (
    select 1
    from public.staff_roles as role
    where role.business_id = p_business_id
      and role.id = p_staff_role_id
      and role.archived_at is null
  ) then
    raise exception using
      errcode = '23503',
      message = 'Staff role not found.';
  end if;

  if p_member_id is null then
    select *
    into target_member
    from public.business_members as member
    where member.business_id = p_business_id
      and member.status = 'removed'
      and (
        (p_user_id is not null and member.user_id = p_user_id)
        or lower(member.email) = normalized_email
      )
    order by member.updated_at desc, member.id
    limit 1
    for update;

    if found then
      if target_member.role = 'owner' then
        raise exception using
          errcode = '42501',
          message = 'The owner membership cannot be reused as staff.';
      end if;

      update public.business_members
      set user_id = coalesce(p_user_id, target_member.user_id),
          invited_email = case
            when p_status = 'invited'
              then normalized_email
            else null
          end,
          email = normalized_email,
          display_name = normalized_name,
          phone = normalized_phone,
          staff_role_id = p_staff_role_id,
          role = 'staff',
          status = p_status
      where business_id = p_business_id
        and id = target_member.id
      returning * into target_member;
    else
      insert into public.business_members (
        business_id,
        user_id,
        invited_email,
        email,
        display_name,
        phone,
        staff_role_id,
        role,
        status
      )
      values (
        p_business_id,
        p_user_id,
        case
          when p_status = 'invited'
            then normalized_email
          else null
        end,
        normalized_email,
        normalized_name,
        normalized_phone,
        p_staff_role_id,
        'staff',
        p_status
      )
      returning * into target_member;
    end if;

    if target_member.user_id is not null then
      perform private.bump_staff_user_reauth(
        target_member.user_id
      );
    end if;
  else
    select *
    into target_member
    from public.business_members as member
    where member.business_id = p_business_id
      and member.id = p_member_id
      and member.status <> 'removed'
    for update;

    if not found then
      raise exception using
        errcode = 'P0002',
        message = 'Staff member not found.';
    end if;

    if target_member.role = 'owner' then
      raise exception using
        errcode = '42501',
        message = 'The owner membership cannot be edited as staff.';
    end if;

    if lower(target_member.email) <> normalized_email then
      raise exception using
        errcode = '22023',
        message = 'Staff email cannot be changed.';
    end if;

    previous_role_id := target_member.staff_role_id;
    previous_status := target_member.status;
    effective_user_id := coalesce(
      p_user_id,
      target_member.user_id
    );

    if p_status in ('active', 'disabled')
      and effective_user_id is null then
      raise exception using
        errcode = '22023',
        message = 'Active staff requires an auth user.';
    end if;

    update public.business_members
    set user_id = effective_user_id,
        invited_email = case
          when p_status = 'invited'
            then normalized_email
          else null
        end,
        display_name = normalized_name,
        phone = normalized_phone,
        staff_role_id = p_staff_role_id,
        role = 'staff',
        status = p_status
    where business_id = p_business_id
      and id = target_member.id
    returning * into target_member;

    if target_member.user_id is not null
      and (
        previous_role_id is distinct from target_member.staff_role_id
        or previous_status is distinct from target_member.status
      ) then
      perform private.bump_staff_user_reauth(
        target_member.user_id
      );
    end if;
  end if;

  insert into public.staff_member_notes (
    business_id,
    member_id,
    notes
  )
  values (
    p_business_id,
    target_member.id,
    normalized_notes
  )
  on conflict (business_id, member_id)
  do update
  set notes = excluded.notes,
      updated_at = now();

  return jsonb_build_object(
    'id', target_member.id,
    'business_id', target_member.business_id,
    'user_id', target_member.user_id,
    'email', target_member.email,
    'display_name', target_member.display_name,
    'phone', target_member.phone,
    'notes', normalized_notes,
    'staff_role_id', target_member.staff_role_id,
    'status', target_member.status
  );
end;
$$;

create or replace function public.set_business_staff_member_status(
  p_business_id uuid,
  p_member_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  target_member public.business_members%rowtype;
begin
  if actor_user_id is null then
    raise exception using
      errcode = '42501',
      message = 'Authentication required.';
  end if;

  if not (
    select private.has_business_role(
      p_business_id,
      array['owner']::text[]
    )
  ) then
    raise exception using
      errcode = '42501',
      message = 'Only the business owner can manage staff.';
  end if;

  if p_status not in ('active', 'disabled', 'removed') then
    raise exception using
      errcode = '22023',
      message = 'Invalid staff status.';
  end if;

  select *
  into target_member
  from public.business_members as member
  where member.business_id = p_business_id
    and member.id = p_member_id
    and member.status <> 'removed'
  for update;

  if not found then
    raise exception using
      errcode = 'P0002',
      message = 'Staff member not found.';
  end if;

  if target_member.role = 'owner' then
    raise exception using
      errcode = '42501',
      message = 'The owner membership cannot be changed.';
  end if;

  if p_status = 'active'
    and target_member.user_id is null then
    raise exception using
      errcode = '22023',
      message = 'An invitation must be accepted before activation.';
  end if;

  update public.business_members
  set status = p_status,
      invited_email = case
        when p_status = 'active'
          then null
        else invited_email
      end
  where business_id = p_business_id
    and id = target_member.id
  returning * into target_member;

  if target_member.user_id is not null then
    perform private.bump_staff_user_reauth(
      target_member.user_id
    );
  end if;

  return jsonb_build_object(
    'id', target_member.id,
    'business_id', target_member.business_id,
    'user_id', target_member.user_id,
    'email', target_member.email,
    'display_name', target_member.display_name,
    'phone', target_member.phone,
    'notes', coalesce((
      select note.notes
      from public.staff_member_notes as note
      where note.business_id = target_member.business_id
        and note.member_id = target_member.id
    ), ''),
    'staff_role_id', target_member.staff_role_id,
    'status', target_member.status
  );
end;
$$;

revoke all on function public.save_business_staff_role(
  uuid,
  uuid,
  text,
  jsonb
) from public, anon;

revoke all on function public.archive_business_staff_role(
  uuid,
  uuid
) from public, anon;

revoke all on function public.resolve_staff_auth_user(
  uuid,
  text
) from public, anon;

revoke all on function public.save_business_staff_member(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  text
) from public, anon;

revoke all on function public.set_business_staff_member_status(
  uuid,
  uuid,
  text
) from public, anon;

grant execute on function public.save_business_staff_role(
  uuid,
  uuid,
  text,
  jsonb
) to authenticated;

grant execute on function public.archive_business_staff_role(
  uuid,
  uuid
) to authenticated;

grant execute on function public.resolve_staff_auth_user(
  uuid,
  text
) to authenticated;

grant execute on function public.save_business_staff_member(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  text
) to authenticated;

grant execute on function public.set_business_staff_member_status(
  uuid,
  uuid,
  text
) to authenticated;

revoke all on function private.bump_staff_user_reauth(uuid)
  from public, anon, authenticated;
revoke all on function private.current_user_uses_staff_role(uuid, uuid)
  from public, anon, authenticated;
revoke all on function private.seed_business_staff_roles(uuid)
  from public, anon, authenticated;
revoke all on function private.seed_staff_roles_after_business_insert()
  from public, anon, authenticated;
revoke all on function private.sync_staff_membership_from_auth_user()
  from public, anon, authenticated;

grant execute on function private.current_user_uses_staff_role(
  uuid,
  uuid
) to authenticated;

commit;
