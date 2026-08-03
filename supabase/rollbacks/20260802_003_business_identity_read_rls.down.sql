begin;

drop policy if exists profiles_select_self_or_manager
  on public.profiles;

drop policy if exists businesses_select_active_member
  on public.businesses;

revoke all on table public.profiles from anon;
revoke all on table public.profiles from authenticated;

revoke all on table public.businesses from anon;
revoke all on table public.businesses from authenticated;

commit;
