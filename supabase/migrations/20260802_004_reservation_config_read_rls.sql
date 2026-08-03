begin;

drop policy if exists business_hours_select_active_member
  on public.business_hours;

create policy business_hours_select_active_member
on public.business_hours
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (
    select private.has_business_role(
      business_id,
      array['owner', 'admin', 'staff']::text[]
    )
  )
);

drop policy if exists reservation_rules_select_active_member
  on public.reservation_rules;

create policy reservation_rules_select_active_member
on public.reservation_rules
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (
    select private.has_business_role(
      business_id,
      array['owner', 'admin', 'staff']::text[]
    )
  )
);

drop policy if exists services_select_active_member
  on public.services;

create policy services_select_active_member
on public.services
for select
to authenticated
using (
  (select auth.uid()) is not null
  and (
    select private.has_business_role(
      business_id,
      array['owner', 'admin', 'staff']::text[]
    )
  )
);

revoke all on table public.business_hours from anon;
revoke all on table public.business_hours from authenticated;
grant select on table public.business_hours to authenticated;

revoke all on table public.reservation_rules from anon;
revoke all on table public.reservation_rules from authenticated;
grant select on table public.reservation_rules to authenticated;

revoke all on table public.services from anon;
revoke all on table public.services from authenticated;
grant select on table public.services to authenticated;

commit;
