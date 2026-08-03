begin;

revoke all on function public.save_business_service(
  uuid,
  uuid,
  jsonb
) from public, anon, authenticated;

revoke all on function public.set_business_service_active(
  uuid,
  uuid,
  boolean
) from public, anon, authenticated;

drop function if exists public.save_business_service(
  uuid,
  uuid,
  jsonb
);

drop function if exists public.set_business_service_active(
  uuid,
  uuid,
  boolean
);

drop index if exists public.services_business_normalized_name_key;

alter table public.services
  drop constraint if exists services_name_length_check,
  drop constraint if exists services_description_length_check,
  drop constraint if exists services_duration_check,
  drop constraint if exists services_capacity_check,
  drop constraint if exists services_price_check,
  drop constraint if exists services_sort_order_check;

alter table public.services
  drop column if exists sort_order;

commit;
