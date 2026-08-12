begin;

revoke all on function public.service_get_public_business_ordering_snapshot(
  text
) from public, anon, authenticated, service_role;
revoke all on function public.service_create_public_shipping_order(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  text,
  text
) from public, anon, authenticated, service_role;
revoke all on function public.service_get_public_shipping_tracking(
  text,
  text,
  text
) from public, anon, authenticated, service_role;

drop function if exists public.service_get_public_shipping_tracking(
  text,
  text,
  text
);
drop function if exists public.service_create_public_shipping_order(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  text,
  text
);
drop function if exists public.service_get_public_business_ordering_snapshot(
  text
);

revoke all on function public.service_consume_business_public_request_limit(
  uuid,
  text,
  text,
  integer,
  integer
) from public, anon, authenticated, service_role;

drop function if exists public.service_consume_business_public_request_limit(
  uuid,
  text,
  text,
  integer,
  integer
);

revoke all on table public.business_public_request_limits
  from public, anon, authenticated;

-- Deliberately preserve the technical rate-limit table and the
-- 'public_create' operation type. Public orders created by E34C are
-- valid Shipping evidence and must remain representable after rollback.

commit;
