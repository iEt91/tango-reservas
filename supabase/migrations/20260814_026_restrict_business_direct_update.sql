begin;

drop policy if exists businesses_update_owner on public.businesses;
revoke update on table public.businesses from authenticated;

commit;
