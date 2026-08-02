begin;

drop policy if exists business_members_select_own_or_manager
  on public.business_members;

alter table if exists public.business_members disable row level security;

drop function if exists public.has_business_role(uuid, text[]);
drop function if exists public.is_business_member(uuid);
drop function if exists public.current_business_role(uuid);

drop trigger if exists business_members_set_updated_at
  on public.business_members;

drop table if exists public.business_members;

drop function if exists public.tango_set_updated_at();

commit;
