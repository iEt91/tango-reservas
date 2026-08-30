begin;

drop function if exists public.create_or_reset_business_sandbox(uuid, text);

delete from public.businesses
where id in (select sandbox_business_id from public.business_sandboxes);

drop table if exists public.business_sandboxes;

commit;
