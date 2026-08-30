begin;

revoke all on function public.service_create_public_reservation(
  text,
  text,
  text,
  text,
  date,
  time,
  integer,
  text,
  text,
  text
) from public, anon, authenticated, service_role;

drop function if exists public.service_create_public_reservation(
  text,
  text,
  text,
  text,
  date,
  time,
  integer,
  text,
  text,
  text
);

delete from public.business_public_request_limits
where action = 'reservation_create';

alter table public.business_public_request_limits
  drop constraint if exists business_public_request_limits_action_check;

alter table public.business_public_request_limits
  add constraint business_public_request_limits_action_check
  check (action in ('shipping_create', 'shipping_track'));

commit;
