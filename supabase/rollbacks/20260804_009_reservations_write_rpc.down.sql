begin;

revoke all on function
  public.save_business_reservation(
    uuid,
    uuid,
    jsonb,
    text
  )
from public, anon, authenticated;

revoke all on function
  public.set_business_reservation_status(
    uuid,
    uuid,
    text
  )
from public, anon, authenticated;

drop function if exists
  public.save_business_reservation(
    uuid,
    uuid,
    jsonb,
    text
  );

drop function if exists
  public.set_business_reservation_status(
    uuid,
    uuid,
    text
  );

revoke select on table public.reservations
  from authenticated;

drop policy if exists
  reservations_select_active_member
on public.reservations;

revoke insert, update, delete
on table public.reservations
from authenticated;

commit;
