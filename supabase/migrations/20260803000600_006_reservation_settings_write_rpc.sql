begin;

alter table public.reservation_rules
  add column if not exists reservations_enabled boolean not null default true,
  add column if not exists default_reservation_duration_minutes integer not null default 120,
  add column if not exists max_people_per_slot integer not null default 40,
  add column if not exists allow_reservations_without_table boolean not null default false,
  add column if not exists auto_assign_reservation_tables boolean not null default true,
  add column if not exists allow_table_combinations boolean not null default true;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reservation_rules'::regclass
      and conname = 'reservation_rules_default_duration_check'
  ) then
    alter table public.reservation_rules
      add constraint reservation_rules_default_duration_check
      check (
        default_reservation_duration_minutes in (60, 90, 120, 150)
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reservation_rules'::regclass
      and conname = 'reservation_rules_min_notice_range_check'
  ) then
    alter table public.reservation_rules
      add constraint reservation_rules_min_notice_range_check
      check (
        min_notice_minutes between 0 and 10080
        and mod(min_notice_minutes, 30) = 0
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reservation_rules'::regclass
      and conname = 'reservation_rules_max_days_range_check'
  ) then
    alter table public.reservation_rules
      add constraint reservation_rules_max_days_range_check
      check (max_days_ahead between 1 and 365);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reservation_rules'::regclass
      and conname = 'reservation_rules_max_people_check'
  ) then
    alter table public.reservation_rules
      add constraint reservation_rules_max_people_check
      check (max_people_per_slot between 1 and 1000);
  end if;
end;
$$;

create or replace function public.save_reservation_configuration(
  p_business_id uuid,
  p_hours jsonb,
  p_settings jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  reservations_enabled_value boolean;
  duration_value integer;
  requires_confirmation_value boolean;
  min_notice_value integer;
  max_days_value integer;
  max_people_value integer;
  allow_without_table_value boolean;
  auto_assign_tables_value boolean;
  allow_table_combinations_value boolean;
  hours_result jsonb;
  settings_result jsonb;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not private.has_business_role(
    p_business_id,
    array['owner', 'admin']::text[]
  ) then
    raise exception 'Insufficient business role.'
      using errcode = '42501';
  end if;

  if jsonb_typeof(p_settings) <> 'object' then
    raise exception 'Reservation settings must be an object.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_settings -> 'reservations_enabled')
      is distinct from 'boolean'
    or jsonb_typeof(p_settings -> 'requires_confirmation')
      is distinct from 'boolean'
    or jsonb_typeof(p_settings -> 'allow_reservations_without_table')
      is distinct from 'boolean'
    or jsonb_typeof(p_settings -> 'auto_assign_reservation_tables')
      is distinct from 'boolean'
    or jsonb_typeof(p_settings -> 'allow_table_combinations')
      is distinct from 'boolean' then
    raise exception 'Reservation boolean settings are invalid.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(
      p_settings -> 'default_reservation_duration_minutes'
    ) is distinct from 'number'
    or jsonb_typeof(p_settings -> 'min_notice_minutes')
      is distinct from 'number'
    or jsonb_typeof(p_settings -> 'max_days_ahead')
      is distinct from 'number'
    or jsonb_typeof(p_settings -> 'max_people_per_slot')
      is distinct from 'number' then
    raise exception 'Reservation numeric settings are invalid.'
      using errcode = '22023';
  end if;

  reservations_enabled_value :=
    (p_settings ->> 'reservations_enabled')::boolean;
  duration_value :=
    (p_settings ->> 'default_reservation_duration_minutes')::integer;
  requires_confirmation_value :=
    (p_settings ->> 'requires_confirmation')::boolean;
  min_notice_value :=
    (p_settings ->> 'min_notice_minutes')::integer;
  max_days_value :=
    (p_settings ->> 'max_days_ahead')::integer;
  max_people_value :=
    (p_settings ->> 'max_people_per_slot')::integer;
  allow_without_table_value :=
    (p_settings ->> 'allow_reservations_without_table')::boolean;
  auto_assign_tables_value :=
    (p_settings ->> 'auto_assign_reservation_tables')::boolean;
  allow_table_combinations_value :=
    (p_settings ->> 'allow_table_combinations')::boolean;

  if duration_value not in (60, 90, 120, 150) then
    raise exception 'Reservation duration is invalid.'
      using errcode = '22023';
  end if;

  if min_notice_value < 0
    or min_notice_value > 10080
    or mod(min_notice_value, 30) <> 0 then
    raise exception 'Minimum notice is invalid.'
      using errcode = '22023';
  end if;

  if max_days_value < 1 or max_days_value > 365 then
    raise exception 'Booking window is invalid.'
      using errcode = '22023';
  end if;

  if max_people_value < 1 or max_people_value > 1000 then
    raise exception 'Slot capacity is invalid.'
      using errcode = '22023';
  end if;

  hours_result := public.replace_business_hours(
    p_business_id,
    p_hours
  );

  insert into public.reservation_rules (
    business_id,
    reservations_enabled,
    default_reservation_duration_minutes,
    requires_confirmation,
    min_notice_minutes,
    max_days_ahead,
    max_people_per_slot,
    allow_reservations_without_table,
    auto_assign_reservation_tables,
    allow_table_combinations,
    updated_at
  )
  values (
    p_business_id,
    reservations_enabled_value,
    duration_value,
    requires_confirmation_value,
    min_notice_value,
    max_days_value,
    max_people_value,
    allow_without_table_value,
    auto_assign_tables_value,
    allow_table_combinations_value,
    now()
  )
  on conflict (business_id)
  do update set
    reservations_enabled = excluded.reservations_enabled,
    default_reservation_duration_minutes =
      excluded.default_reservation_duration_minutes,
    requires_confirmation = excluded.requires_confirmation,
    min_notice_minutes = excluded.min_notice_minutes,
    max_days_ahead = excluded.max_days_ahead,
    max_people_per_slot = excluded.max_people_per_slot,
    allow_reservations_without_table =
      excluded.allow_reservations_without_table,
    auto_assign_reservation_tables =
      excluded.auto_assign_reservation_tables,
    allow_table_combinations = excluded.allow_table_combinations,
    updated_at = now();

  select jsonb_build_object(
    'business_id', rules.business_id,
    'reservations_enabled', rules.reservations_enabled,
    'default_reservation_duration_minutes',
      rules.default_reservation_duration_minutes,
    'requires_confirmation', rules.requires_confirmation,
    'min_notice_minutes', rules.min_notice_minutes,
    'max_days_ahead', rules.max_days_ahead,
    'max_people_per_slot', rules.max_people_per_slot,
    'allow_reservations_without_table',
      rules.allow_reservations_without_table,
    'auto_assign_reservation_tables',
      rules.auto_assign_reservation_tables,
    'allow_table_combinations', rules.allow_table_combinations,
    'updated_at', rules.updated_at
  )
  into settings_result
  from public.reservation_rules as rules
  where rules.business_id = p_business_id;

  return jsonb_build_object(
    'business_hours', hours_result,
    'reservation_settings', settings_result
  );
end;
$$;

revoke all on function public.save_reservation_configuration(
  uuid,
  jsonb,
  jsonb
) from public, anon, authenticated;

grant execute on function public.save_reservation_configuration(
  uuid,
  jsonb,
  jsonb
) to authenticated;

revoke insert, update, delete on table public.reservation_rules
  from authenticated;
revoke insert, update, delete on table public.business_hours
  from authenticated;

commit;
