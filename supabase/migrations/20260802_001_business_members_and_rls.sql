begin;

create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  invited_email text,
  role text not null default 'staff'
    check (role in ('owner', 'admin', 'staff')),
  status text not null default 'active'
    check (status in ('active', 'invited', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_members_business_user_key unique (business_id, user_id),
  constraint business_members_identity_check check (
    (
      status = 'invited'
      and invited_email is not null
    )
    or (
      status in ('active', 'disabled')
      and user_id is not null
    )
  )
);

comment on table public.business_members is
  'Membresías y roles que autorizan a un usuario dentro de un negocio de Tango.';

comment on column public.business_members.user_id is
  'Usuario autenticado de Supabase. Puede ser null únicamente durante una invitación.';

comment on column public.business_members.role is
  'Rol interno del negocio: owner, admin o staff.';

create unique index if not exists business_members_pending_email_key
  on public.business_members (business_id, lower(invited_email))
  where status = 'invited' and invited_email is not null;

create index if not exists business_members_user_status_idx
  on public.business_members (user_id, status);

create index if not exists business_members_business_status_idx
  on public.business_members (business_id, status);

create or replace function public.tango_set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists business_members_set_updated_at
  on public.business_members;

create trigger business_members_set_updated_at
before update on public.business_members
for each row
execute function public.tango_set_updated_at();

insert into public.business_members (
  business_id,
  user_id,
  role,
  status
)
select
  profiles.business_id,
  profiles.auth_user_id,
  case lower(coalesce(profiles.role, ''))
    when 'owner' then 'owner'
    when 'admin' then 'admin'
    else 'staff'
  end,
  'active'
from public.profiles
where profiles.business_id is not null
  and profiles.auth_user_id is not null
on conflict (business_id, user_id) do nothing;

create or replace function public.current_business_role(
  target_business_id uuid
)
returns text
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select member.role
  from public.business_members as member
  where member.business_id = target_business_id
    and member.user_id = auth.uid()
    and member.status = 'active'
  limit 1;
$$;

create or replace function public.is_business_member(
  target_business_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.business_members as member
    where member.business_id = target_business_id
      and member.user_id = auth.uid()
      and member.status = 'active'
  );
$$;

create or replace function public.has_business_role(
  target_business_id uuid,
  allowed_roles text[]
)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.business_members as member
    where member.business_id = target_business_id
      and member.user_id = auth.uid()
      and member.status = 'active'
      and member.role = any (allowed_roles)
  );
$$;

revoke all on function public.current_business_role(uuid) from public;
revoke all on function public.is_business_member(uuid) from public;
revoke all on function public.has_business_role(uuid, text[]) from public;

grant execute on function public.current_business_role(uuid) to authenticated;
grant execute on function public.is_business_member(uuid) to authenticated;
grant execute on function public.has_business_role(uuid, text[]) to authenticated;

alter table public.business_members enable row level security;

drop policy if exists business_members_select_own_or_manager
  on public.business_members;

create policy business_members_select_own_or_manager
on public.business_members
for select
to authenticated
using (
  user_id = auth.uid()
  or public.has_business_role(
    business_id,
    array['owner', 'admin']::text[]
  )
);

revoke all on table public.business_members from anon;
revoke insert, update, delete on table public.business_members
  from authenticated;
grant select on table public.business_members to authenticated;

commit;
