begin;

drop policy if exists business_members_select_own_or_manager
  on public.business_members;

alter table if exists public.business_members
  no force row level security;

alter table if exists public.business_members
  disable row level security;

drop trigger if exists business_members_set_updated_at
  on public.business_members;

drop table if exists public.business_members;

drop function if exists private.has_business_role(uuid, text[]);
drop function if exists private.tango_set_updated_at();

drop schema if exists private;

commit;
