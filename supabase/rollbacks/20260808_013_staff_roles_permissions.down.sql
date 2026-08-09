begin;

revoke all on function public.save_business_staff_role(
  uuid,
  uuid,
  text,
  jsonb
) from public, anon, authenticated;

revoke all on function public.archive_business_staff_role(
  uuid,
  uuid
) from public, anon, authenticated;

revoke all on function public.resolve_staff_auth_user(
  uuid,
  text
) from public, anon, authenticated;

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
) from public, anon, authenticated;

revoke all on function public.set_business_staff_member_status(
  uuid,
  uuid,
  text
) from public, anon, authenticated;

drop function if exists public.set_business_staff_member_status(
  uuid,
  uuid,
  text
);

drop function if exists public.save_business_staff_member(
  uuid,
  uuid,
  uuid,
  text,
  text,
  text,
  text,
  uuid,
  text
);

drop function if exists public.resolve_staff_auth_user(
  uuid,
  text
);

drop function if exists public.archive_business_staff_role(
  uuid,
  uuid
);

drop function if exists public.save_business_staff_role(
  uuid,
  uuid,
  text,
  jsonb
);

drop trigger if exists tango_sync_staff_membership
  on auth.users;

drop trigger if exists business_seed_staff_roles
  on public.businesses;

drop function if exists private.sync_staff_membership_from_auth_user();
drop function if exists private.seed_staff_roles_after_business_insert();
drop function if exists private.seed_business_staff_roles(uuid);
drop function if exists private.bump_staff_user_reauth(uuid);

drop policy if exists staff_role_permissions_select_owner_or_assigned
  on public.staff_role_permissions;

drop policy if exists staff_roles_select_owner_or_assigned
  on public.staff_roles;

drop policy if exists staff_member_notes_select_owner
  on public.staff_member_notes;

drop policy if exists user_access_controls_select_self
  on public.user_access_controls;

revoke all on table public.staff_role_permissions
  from public, anon, authenticated;
revoke all on table public.staff_roles
  from public, anon, authenticated;
revoke all on table public.staff_member_notes
  from public, anon, authenticated;
revoke all on table public.user_access_controls
  from public, anon, authenticated;

alter table public.staff_role_permissions
  enable row level security;
alter table public.staff_role_permissions
  force row level security;

alter table public.staff_roles
  enable row level security;
alter table public.staff_roles
  force row level security;

alter table public.staff_member_notes
  enable row level security;
alter table public.staff_member_notes
  force row level security;

alter table public.user_access_controls
  enable row level security;
alter table public.user_access_controls
  force row level security;

drop policy if exists business_members_select_own_or_owner
  on public.business_members;

drop policy if exists business_members_select_own_or_manager
  on public.business_members;

create policy business_members_select_own_or_manager
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
        array['owner', 'admin']::text[]
      )
    )
  )
);

drop function if exists private.current_user_uses_staff_role(
  uuid,
  uuid
);

grant select on table public.business_members
  to authenticated;

commit;
