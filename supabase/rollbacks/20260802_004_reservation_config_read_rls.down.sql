begin;

drop policy if exists services_select_active_member
  on public.services;

drop policy if exists reservation_rules_select_active_member
  on public.reservation_rules;

drop policy if exists business_hours_select_active_member
  on public.business_hours;

revoke all on table public.services from anon;
revoke all on table public.services from authenticated;

revoke all on table public.reservation_rules from anon;
revoke all on table public.reservation_rules from authenticated;

revoke all on table public.business_hours from anon;
revoke all on table public.business_hours from authenticated;

commit;
