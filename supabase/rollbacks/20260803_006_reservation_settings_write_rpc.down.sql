begin;

revoke all on function public.save_reservation_configuration(
  uuid,
  jsonb,
  jsonb
) from public, anon, authenticated;

drop function if exists public.save_reservation_configuration(
  uuid,
  jsonb,
  jsonb
);

alter table public.reservation_rules
  drop constraint if exists reservation_rules_default_duration_check,
  drop constraint if exists reservation_rules_min_notice_range_check,
  drop constraint if exists reservation_rules_max_days_range_check,
  drop constraint if exists reservation_rules_max_people_check;

alter table public.reservation_rules
  drop column if exists reservations_enabled,
  drop column if exists default_reservation_duration_minutes,
  drop column if exists max_people_per_slot,
  drop column if exists allow_reservations_without_table,
  drop column if exists auto_assign_reservation_tables,
  drop column if exists allow_table_combinations;

commit;
