begin;

revoke all on function public.complete_business_reservation_payment(
  uuid,
  uuid,
  jsonb,
  text
) from public, anon, authenticated;

revoke all on function public.open_business_cash_session(
  uuid,
  date,
  numeric,
  text
) from public, anon, authenticated;

drop function if exists public.complete_business_reservation_payment(
  uuid,
  uuid,
  jsonb,
  text
);

drop function if exists public.open_business_cash_session(
  uuid,
  date,
  numeric,
  text
);

drop policy if exists business_payments_select_cash_member
  on public.business_payments;

drop policy if exists cash_sessions_select_cash_member
  on public.cash_sessions;

revoke all on table public.business_payments
  from public, anon, authenticated;
revoke all on table public.business_payment_operations
  from public, anon, authenticated;
revoke all on table public.cash_sessions
  from public, anon, authenticated;

alter table public.business_payments
  enable row level security;
alter table public.business_payments
  force row level security;

alter table public.business_payment_operations
  enable row level security;
alter table public.business_payment_operations
  force row level security;

alter table public.cash_sessions
  enable row level security;
alter table public.cash_sessions
  force row level security;

commit;
