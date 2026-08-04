begin;

drop trigger if exists
  reservations_validate_table_assignments
on public.reservations;

drop trigger if exists
  floor_tables_validate_assignments
on public.floor_tables;

drop trigger if exists
  reservation_rules_validate_table_assignments
on public.reservation_rules;

drop function if exists
  public.set_business_reservation_tables(
    uuid,
    uuid,
    uuid[]
  );

drop function if exists
  public.set_business_floor_table_active(
    uuid,
    uuid,
    boolean
  );

drop function if exists
  public.save_business_floor_table(
    uuid,
    uuid,
    jsonb
  );

drop function if exists
  public.save_business_floor_plan_settings(
    uuid,
    jsonb
  );

drop function if exists
  private.enforce_floor_table_assignments();

drop function if exists
  private.enforce_reservation_rule_table_assignments();

drop function if exists
  private.enforce_reservation_table_assignments();

drop function if exists
  private.validate_reservation_table_selection(
    uuid,
    uuid,
    uuid[]
  );

drop policy if exists
  reservation_table_assignments_select_active_member
on public.reservation_table_assignments;

drop policy if exists
  floor_tables_select_active_member
on public.floor_tables;

drop policy if exists
  floor_plan_settings_select_active_member
on public.floor_plan_settings;

revoke all on table
  public.reservation_table_assignments
from anon, authenticated;

revoke all on table public.floor_tables
from anon, authenticated;

revoke all on table public.floor_plan_settings
from anon, authenticated;

alter table public.reservation_table_assignments
  enable row level security;
alter table public.reservation_table_assignments
  force row level security;
alter table public.floor_tables
  enable row level security;
alter table public.floor_tables
  force row level security;
alter table public.floor_plan_settings
  enable row level security;
alter table public.floor_plan_settings
  force row level security;

commit;
