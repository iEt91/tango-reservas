begin;

revoke all on function public.replace_business_hours(uuid, jsonb)
  from public, anon, authenticated;

drop function if exists public.replace_business_hours(uuid, jsonb);

commit;
