begin;

revoke all on function public.save_business_expense(
  uuid,
  uuid,
  date,
  date,
  text,
  text,
  text,
  numeric,
  text,
  text,
  text
) from public, anon, authenticated;

revoke all on function public.archive_business_expense(
  uuid,
  uuid,
  text
) from public, anon, authenticated;

revoke all on function public.add_business_cash_movement(
  uuid,
  uuid,
  text,
  numeric,
  text,
  text
) from public, anon, authenticated;

revoke all on function public.void_business_cash_movement(
  uuid,
  uuid,
  text
) from public, anon, authenticated;

revoke all on function public.get_business_cash_reconciliation(
  uuid,
  date
) from public, anon, authenticated;

revoke all on function public.close_business_cash_session(
  uuid,
  uuid,
  numeric,
  text,
  text
) from public, anon, authenticated;

revoke all on function public.reopen_business_cash_session(
  uuid,
  uuid,
  text
) from public, anon, authenticated;

drop function if exists public.save_business_expense(
  uuid,
  uuid,
  date,
  date,
  text,
  text,
  text,
  numeric,
  text,
  text,
  text
);

drop function if exists public.archive_business_expense(
  uuid,
  uuid,
  text
);

drop function if exists public.add_business_cash_movement(
  uuid,
  uuid,
  text,
  numeric,
  text,
  text
);

drop function if exists public.void_business_cash_movement(
  uuid,
  uuid,
  text
);

drop function if exists public.get_business_cash_reconciliation(
  uuid,
  date
);

drop function if exists public.close_business_cash_session(
  uuid,
  uuid,
  numeric,
  text,
  text
);

drop function if exists public.reopen_business_cash_session(
  uuid,
  uuid,
  text
);

drop policy if exists business_expenses_select_expenses_member
  on public.business_expenses;
drop policy if exists cash_session_movements_select_cash_member
  on public.cash_session_movements;

revoke all on table public.business_expenses
  from public, anon, authenticated;
revoke all on table public.business_expense_operations
  from public, anon, authenticated;
revoke all on table public.cash_session_movements
  from public, anon, authenticated;
revoke all on table public.cash_session_operations
  from public, anon, authenticated;

alter table public.business_expenses
  enable row level security;
alter table public.business_expenses
  force row level security;
alter table public.business_expense_operations
  enable row level security;
alter table public.business_expense_operations
  force row level security;
alter table public.cash_session_movements
  enable row level security;
alter table public.cash_session_movements
  force row level security;
alter table public.cash_session_operations
  enable row level security;
alter table public.cash_session_operations
  force row level security;

commit;
