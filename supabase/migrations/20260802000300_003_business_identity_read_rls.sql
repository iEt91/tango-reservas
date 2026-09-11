begin;

drop policy if exists businesses_select_active_member
  on public.businesses;

create policy businesses_select_active_member
on public.businesses
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (
    select private.has_business_role(
      id,
      array['owner', 'admin', 'staff']::text[]
    )
  )
);

drop policy if exists profiles_select_self_or_manager
  on public.profiles;

create policy profiles_select_self_or_manager
on public.profiles
for select
to authenticated
using (
  (select auth.uid()) is not null
  and business_id is not null
  and (
    (
      auth_user_id = (select auth.uid())
      and (
        select private.has_business_role(
          business_id,
          array['owner', 'admin', 'staff']::text[]
        )
      )
    )
    or (
      select private.has_business_role(
        business_id,
        array['owner', 'admin']::text[]
      )
    )
  )
);

revoke all on table public.businesses from anon;
revoke all on table public.businesses from authenticated;
grant select on table public.businesses to authenticated;

revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;
grant select on table public.profiles to authenticated;

commit;
