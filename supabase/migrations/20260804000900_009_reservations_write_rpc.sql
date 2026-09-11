begin;

alter table public.reservations
  add column if not exists customer_id uuid,
  add column if not exists duration_minutes integer not null default 120,
  add column if not exists public_code text,
  add column if not exists idempotency_key text,
  add column if not exists confirmed_at timestamptz,
  add column if not exists completed_at timestamptz,
  add column if not exists cancelled_at timestamptz,
  add column if not exists no_show_at timestamptz;

update public.reservations
set public_code =
  'RES-' || upper(
    substr(
      replace(gen_random_uuid()::text, '-', ''),
      1,
      12
    )
  )
where public_code is null
   or btrim(public_code) = '';

alter table public.reservations
  alter column public_code set not null,
  alter column public_code set default (
    'RES-' || upper(
      substr(
        replace(gen_random_uuid()::text, '-', ''),
        1,
        12
      )
    )
  );

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reservations'::regclass
      and conname = 'reservations_customer_id_fkey'
  ) then
    alter table public.reservations
      add constraint reservations_customer_id_fkey
      foreign key (customer_id)
      references public.customers(id)
      on delete set null;
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reservations'::regclass
      and conname = 'reservations_customer_name_length_check'
  ) then
    alter table public.reservations
      add constraint reservations_customer_name_length_check
      check (
        char_length(btrim(customer_name))
        between 1 and 160
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reservations'::regclass
      and conname = 'reservations_customer_phone_length_check'
  ) then
    alter table public.reservations
      add constraint reservations_customer_phone_length_check
      check (
        char_length(customer_phone)
        between 6 and 40
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reservations'::regclass
      and conname = 'reservations_customer_email_length_check'
  ) then
    alter table public.reservations
      add constraint reservations_customer_email_length_check
      check (
        customer_email is null
        or char_length(customer_email) <= 320
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reservations'::regclass
      and conname = 'reservations_notes_length_check'
  ) then
    alter table public.reservations
      add constraint reservations_notes_length_check
      check (
        notes is null
        or char_length(notes) <= 4000
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reservations'::regclass
      and conname = 'reservations_party_size_check'
  ) then
    alter table public.reservations
      add constraint reservations_party_size_check
      check (party_size between 1 and 200);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reservations'::regclass
      and conname = 'reservations_duration_minutes_check'
  ) then
    alter table public.reservations
      add constraint reservations_duration_minutes_check
      check (
        duration_minutes between 15 and 720
        and duration_minutes % 15 = 0
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reservations'::regclass
      and conname = 'reservations_public_code_check'
  ) then
    alter table public.reservations
      add constraint reservations_public_code_check
      check (
        public_code ~ '^RES-[A-Z0-9]{12}$'
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.reservations'::regclass
      and conname = 'reservations_idempotency_key_length_check'
  ) then
    alter table public.reservations
      add constraint reservations_idempotency_key_length_check
      check (
        idempotency_key is null
        or char_length(idempotency_key)
          between 8 and 120
      );
  end if;
end;
$$;

alter table public.reservations
  drop constraint if exists reservations_source_check;

alter table public.reservations
  add constraint reservations_source_check
  check (
    source = any (
      array[
        'web'::text,
        'whatsapp'::text,
        'phone'::text,
        'instagram'::text,
        'manual'::text,
        'admin'::text
      ]
    )
  );

create unique index if not exists
  reservations_public_code_key
on public.reservations (public_code);

create unique index if not exists
  reservations_business_idempotency_key
on public.reservations (
  business_id,
  idempotency_key
)
where idempotency_key is not null;

create index if not exists
  reservations_business_status_date_time_idx
on public.reservations (
  business_id,
  status,
  reservation_date,
  reservation_time
);

create index if not exists
  reservations_business_customer_date_idx
on public.reservations (
  business_id,
  customer_id,
  reservation_date
)
where customer_id is not null;

drop policy if exists reservations_select_active_member
  on public.reservations;

create policy reservations_select_active_member
on public.reservations
for select
to authenticated
using (
  private.has_business_role(
    business_id,
    array['owner', 'admin', 'staff']::text[]
  )
);

grant select on table public.reservations
  to authenticated;

create or replace function public.save_business_reservation(
  p_business_id uuid,
  p_reservation_id uuid,
  p_reservation jsonb,
  p_idempotency_key text default null
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  required_field text;
  service_id_value uuid;
  customer_id_value uuid;
  customer_name_value text;
  customer_phone_value text;
  customer_email_value text;
  reservation_date_value date;
  reservation_time_value time;
  party_size_value integer;
  notes_value text;
  source_value text;
  duration_minutes_value integer;
  idempotency_key_value text;
  day_name_value text;
  starts_at timestamp;
  ends_at timestamp;
  opens_at timestamp;
  closes_at timestamp;
  break_starts_at timestamp;
  break_ends_at timestamp;
  active_count integer;
  active_people integer;
  service_row public.services%rowtype;
  customer_row public.customers%rowtype;
  rule_row public.reservation_rules%rowtype;
  hour_row public.business_hours%rowtype;
  current_row public.reservations%rowtype;
  saved public.reservations%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not private.has_business_role(
    p_business_id,
    array['owner', 'admin', 'staff']::text[]
  ) then
    raise exception 'Insufficient business role.'
      using errcode = '42501';
  end if;

  if p_reservation is null
    or jsonb_typeof(p_reservation) <> 'object' then
    raise exception 'Reservation payload must be an object.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_reservation)
      as fields(key)
    where fields.key not in (
      'service_id',
      'customer_id',
      'customer_name',
      'customer_phone',
      'customer_email',
      'reservation_date',
      'reservation_time',
      'party_size',
      'notes',
      'source',
      'duration_minutes'
    )
  ) then
    raise exception
      'Reservation payload contains unknown fields.'
      using errcode = '22023';
  end if;

  for required_field in
    select required.key
    from (
      values
        ('service_id'),
        ('customer_name'),
        ('customer_phone'),
        ('reservation_date'),
        ('reservation_time'),
        ('party_size'),
        ('source')
    ) as required(key)
    where not (p_reservation ? required.key)
  loop
    raise exception
      'Reservation payload is missing required field: %.',
      required_field
      using errcode = '22023';
  end loop;

  if jsonb_typeof(p_reservation -> 'service_id')
      is distinct from 'string'
    or jsonb_typeof(
      p_reservation -> 'customer_name'
    ) is distinct from 'string'
    or jsonb_typeof(
      p_reservation -> 'customer_phone'
    ) is distinct from 'string'
    or jsonb_typeof(
      p_reservation -> 'reservation_date'
    ) is distinct from 'string'
    or jsonb_typeof(
      p_reservation -> 'reservation_time'
    ) is distinct from 'string'
    or jsonb_typeof(
      p_reservation -> 'party_size'
    ) is distinct from 'number'
    or jsonb_typeof(
      p_reservation -> 'source'
    ) is distinct from 'string' then
    raise exception
      'Reservation required fields are invalid.'
      using errcode = '22023';
  end if;

  if p_reservation ? 'customer_id'
    and jsonb_typeof(
      p_reservation -> 'customer_id'
    ) not in ('string', 'null') then
    raise exception 'Reservation customer is invalid.'
      using errcode = '22023';
  end if;

  if p_reservation ? 'customer_email'
    and jsonb_typeof(
      p_reservation -> 'customer_email'
    ) not in ('string', 'null') then
    raise exception 'Reservation email is invalid.'
      using errcode = '22023';
  end if;

  if p_reservation ? 'notes'
    and jsonb_typeof(
      p_reservation -> 'notes'
    ) not in ('string', 'null') then
    raise exception 'Reservation notes are invalid.'
      using errcode = '22023';
  end if;

  if p_reservation ? 'duration_minutes'
    and jsonb_typeof(
      p_reservation -> 'duration_minutes'
    ) not in ('number', 'null') then
    raise exception 'Reservation duration is invalid.'
      using errcode = '22023';
  end if;

  begin
    service_id_value :=
      (p_reservation ->> 'service_id')::uuid;
  exception
    when others then
      raise exception 'Reservation service is invalid.'
        using errcode = '22023';
  end;

  if jsonb_typeof(
    p_reservation -> 'customer_id'
  ) = 'string'
    and btrim(
      p_reservation ->> 'customer_id'
    ) <> '' then
    begin
      customer_id_value :=
        (p_reservation ->> 'customer_id')::uuid;
    exception
      when others then
        raise exception 'Reservation customer is invalid.'
          using errcode = '22023';
    end;
  else
    customer_id_value := null;
  end if;

  begin
    reservation_date_value :=
      (p_reservation ->> 'reservation_date')::date;
  exception
    when others then
      raise exception 'Reservation date is invalid.'
        using errcode = '22023';
  end;

  begin
    reservation_time_value :=
      (p_reservation ->> 'reservation_time')::time;
  exception
    when others then
      raise exception 'Reservation time is invalid.'
        using errcode = '22023';
  end;

  begin
    party_size_value :=
      (p_reservation ->> 'party_size')::integer;
  exception
    when others then
      raise exception 'Reservation party size is invalid.'
        using errcode = '22023';
  end;

  customer_name_value :=
    btrim(p_reservation ->> 'customer_name');
  customer_phone_value := regexp_replace(
    coalesce(
      p_reservation ->> 'customer_phone',
      ''
    ),
    '[^0-9]',
    '',
    'g'
  );
  customer_email_value := nullif(
    lower(
      btrim(
        p_reservation ->> 'customer_email'
      )
    ),
    ''
  );
  notes_value := nullif(
    btrim(p_reservation ->> 'notes'),
    ''
  );
  source_value := lower(
    btrim(p_reservation ->> 'source')
  );
  idempotency_key_value := nullif(
    btrim(p_idempotency_key),
    ''
  );

  if char_length(customer_name_value)
      not between 1 and 160 then
    raise exception 'Reservation customer name is invalid.'
      using errcode = '22023';
  end if;

  if char_length(customer_phone_value)
      not between 6 and 40 then
    raise exception 'Reservation phone is invalid.'
      using errcode = '22023';
  end if;

  if customer_email_value is not null
    and (
      char_length(customer_email_value) > 320
      or customer_email_value
        !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ) then
    raise exception 'Reservation email is invalid.'
      using errcode = '22023';
  end if;

  if notes_value is not null
    and char_length(notes_value) > 4000 then
    raise exception 'Reservation notes are too long.'
      using errcode = '22023';
  end if;

  if party_size_value not between 1 and 200 then
    raise exception 'Reservation party size is invalid.'
      using errcode = '22023';
  end if;

  if source_value not in (
    'web',
    'whatsapp',
    'phone',
    'instagram',
    'manual',
    'admin'
  ) then
    raise exception 'Reservation source is invalid.'
      using errcode = '22023';
  end if;

  if idempotency_key_value is not null
    and char_length(idempotency_key_value)
      not between 8 and 120 then
    raise exception 'Reservation idempotency key is invalid.'
      using errcode = '22023';
  end if;

  if p_reservation_id is null
    and idempotency_key_value is not null then
    perform pg_advisory_xact_lock(
      hashtextextended(
        p_business_id::text
        || ':reservation-idempotency:'
        || idempotency_key_value,
        0
      )
    );

    select reservation.*
    into saved
    from public.reservations as reservation
    where reservation.business_id = p_business_id
      and reservation.idempotency_key =
        idempotency_key_value;

    if found then
      return to_jsonb(saved);
    end if;
  end if;

  select service.*
  into service_row
  from public.services as service
  where service.id = service_id_value
    and service.business_id = p_business_id
    and service.is_active = true
  for share;

  if not found then
    raise exception
      'Reservation service is not available.'
      using errcode = '42501';
  end if;

  select rules.*
  into rule_row
  from public.reservation_rules as rules
  where rules.business_id = p_business_id
  for share;

  if not found then
    raise exception
      'Reservation configuration is missing.'
      using errcode = '22023';
  end if;

  if rule_row.reservations_enabled is not true then
    raise exception 'Reservations are disabled.'
      using errcode = 'P0001';
  end if;

  if customer_id_value is not null then
    select customer.*
    into customer_row
    from public.customers as customer
    where customer.id = customer_id_value
      and customer.business_id = p_business_id
      and customer.is_active = true
    for share;

    if not found then
      raise exception
        'Reservation customer is not available.'
        using errcode = '42501';
    end if;
  end if;

  if jsonb_typeof(
    p_reservation -> 'duration_minutes'
  ) = 'number' then
    begin
      duration_minutes_value :=
        (
          p_reservation
          ->> 'duration_minutes'
        )::integer;
    exception
      when others then
        raise exception 'Reservation duration is invalid.'
          using errcode = '22023';
    end;
  else
    duration_minutes_value := coalesce(
      service_row.duration_minutes,
      rule_row.default_reservation_duration_minutes,
      120
    );
  end if;

  if duration_minutes_value not between 15 and 720
    or duration_minutes_value % 15 <> 0 then
    raise exception 'Reservation duration is invalid.'
      using errcode = '22023';
  end if;

  if party_size_value > service_row.capacity then
    raise exception
      'Reservation exceeds service capacity.'
      using errcode = 'P0001';
  end if;

  day_name_value := case
    extract(dow from reservation_date_value)
    when 0 then 'sunday'
    when 1 then 'monday'
    when 2 then 'tuesday'
    when 3 then 'wednesday'
    when 4 then 'thursday'
    when 5 then 'friday'
    else 'saturday'
  end;

  select hours.*
  into hour_row
  from public.business_hours as hours
  where hours.business_id = p_business_id
    and hours.day_of_week = day_name_value
    and hours.is_open = true
  limit 1
  for share;

  if not found then
    raise exception
      'Business is closed on the reservation date.'
      using errcode = 'P0001';
  end if;

  opens_at :=
    reservation_date_value + hour_row.open_time;
  closes_at :=
    reservation_date_value + hour_row.close_time;

  if hour_row.close_time <= hour_row.open_time then
    closes_at := closes_at + interval '1 day';
  end if;

  starts_at :=
    reservation_date_value + reservation_time_value;

  if hour_row.close_time <= hour_row.open_time
    and reservation_time_value < hour_row.open_time then
    starts_at := starts_at + interval '1 day';
  end if;

  ends_at := starts_at
    + make_interval(
      mins => duration_minutes_value
    );

  if starts_at < opens_at
    or starts_at >= closes_at
    or ends_at > closes_at then
    raise exception
      'Reservation is outside business hours.'
      using errcode = 'P0001';
  end if;

  if hour_row.break_start_time is not null
    and hour_row.break_end_time is not null then
    break_starts_at :=
      reservation_date_value
      + hour_row.break_start_time;
    break_ends_at :=
      reservation_date_value
      + hour_row.break_end_time;

    if hour_row.close_time <= hour_row.open_time
      and hour_row.break_start_time
        < hour_row.open_time then
      break_starts_at :=
        break_starts_at + interval '1 day';
    end if;

    if hour_row.close_time <= hour_row.open_time
      and hour_row.break_end_time
        < hour_row.open_time then
      break_ends_at :=
        break_ends_at + interval '1 day';
    end if;

    if break_ends_at <= break_starts_at then
      break_ends_at :=
        break_ends_at + interval '1 day';
    end if;

    if starts_at < break_ends_at
      and break_starts_at < ends_at then
      raise exception
        'Reservation overlaps the configured break.'
        using errcode = 'P0001';
    end if;
  end if;

  if p_reservation_id is not null then
    select reservation.*
    into current_row
    from public.reservations as reservation
    where reservation.id = p_reservation_id
      and reservation.business_id = p_business_id
    for update;

    if not found then
      raise exception
        'Reservation is not available for this business.'
        using errcode = '42501';
    end if;

    if current_row.status in (
      'cancelled',
      'completed',
      'no_show'
    ) then
      raise exception
        'Closed reservations cannot be edited.'
        using errcode = '22023';
    end if;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      p_business_id::text
      || ':reservation-date:'
      || reservation_date_value::text,
      0
    )
  );

  select
    count(*)::integer,
    coalesce(sum(reservation.party_size), 0)::integer
  into active_count, active_people
  from public.reservations as reservation
  where reservation.business_id = p_business_id
    and reservation.id
      is distinct from p_reservation_id
    and reservation.status in (
      'pending',
      'confirmed'
    )
    and reservation.reservation_date =
      reservation_date_value
    and (
      (
        reservation.reservation_date
        + reservation.reservation_time
        + case
            when hour_row.close_time
                <= hour_row.open_time
              and reservation.reservation_time
                < hour_row.open_time
            then interval '1 day'
            else interval '0 day'
          end
      ) < ends_at
      and starts_at < (
        reservation.reservation_date
        + reservation.reservation_time
        + case
            when hour_row.close_time
                <= hour_row.open_time
              and reservation.reservation_time
                < hour_row.open_time
            then interval '1 day'
            else interval '0 day'
          end
        + make_interval(
            mins =>
              reservation.duration_minutes
          )
      )
    );

  if active_count
      >= rule_row.max_reservations_per_slot then
    raise exception
      'Reservation slot has reached its reservation limit.'
      using errcode = 'P0001';
  end if;

  if active_people + party_size_value
      > rule_row.max_people_per_slot then
    raise exception
      'Reservation slot has reached its people limit.'
      using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.reservations as reservation
    where reservation.business_id = p_business_id
      and reservation.id
        is distinct from p_reservation_id
      and reservation.status in (
        'pending',
        'confirmed'
      )
      and reservation.reservation_date =
        reservation_date_value
      and regexp_replace(
        reservation.customer_phone,
        '[^0-9]',
        '',
        'g'
      ) = customer_phone_value
      and (
        (
          reservation.reservation_date
          + reservation.reservation_time
          + case
              when hour_row.close_time
                  <= hour_row.open_time
                and reservation.reservation_time
                  < hour_row.open_time
              then interval '1 day'
              else interval '0 day'
            end
        ) < ends_at
        and starts_at < (
          reservation.reservation_date
          + reservation.reservation_time
          + case
              when hour_row.close_time
                  <= hour_row.open_time
                and reservation.reservation_time
                  < hour_row.open_time
              then interval '1 day'
              else interval '0 day'
            end
          + make_interval(
              mins =>
                reservation.duration_minutes
            )
        )
      )
  ) then
    raise exception
      'Customer already has an overlapping active reservation.'
      using errcode = 'P0001';
  end if;

  if p_reservation_id is null then
    insert into public.reservations (
      business_id,
      service_id,
      customer_id,
      customer_name,
      customer_phone,
      customer_email,
      reservation_date,
      reservation_time,
      party_size,
      status,
      notes,
      source,
      duration_minutes,
      idempotency_key,
      confirmed_at,
      updated_at
    )
    values (
      p_business_id,
      service_id_value,
      customer_id_value,
      customer_name_value,
      customer_phone_value,
      customer_email_value,
      reservation_date_value,
      reservation_time_value,
      party_size_value,
      case
        when rule_row.requires_confirmation
          then 'pending'
        else 'confirmed'
      end,
      notes_value,
      source_value,
      duration_minutes_value,
      idempotency_key_value,
      case
        when rule_row.requires_confirmation
          then null
        else now()
      end,
      now()
    )
    returning * into saved;
  else
    update public.reservations
    set
      service_id = service_id_value,
      customer_id = customer_id_value,
      customer_name = customer_name_value,
      customer_phone = customer_phone_value,
      customer_email = customer_email_value,
      reservation_date = reservation_date_value,
      reservation_time = reservation_time_value,
      party_size = party_size_value,
      notes = notes_value,
      source = source_value,
      duration_minutes = duration_minutes_value,
      updated_at = now()
    where id = p_reservation_id
      and business_id = p_business_id
    returning * into saved;
  end if;

  return to_jsonb(saved);
exception
  when unique_violation then
    raise exception
      'Reservation identifier already exists.'
      using errcode = '23505';
end;
$$;

create or replace function public.set_business_reservation_status(
  p_business_id uuid,
  p_reservation_id uuid,
  p_status text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_row public.reservations%rowtype;
  saved public.reservations%rowtype;
  status_value text;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not private.has_business_role(
    p_business_id,
    array['owner', 'admin', 'staff']::text[]
  ) then
    raise exception 'Insufficient business role.'
      using errcode = '42501';
  end if;

  status_value := lower(btrim(p_status));

  if status_value not in (
    'pending',
    'confirmed',
    'cancelled',
    'completed',
    'no_show'
  ) then
    raise exception 'Reservation status is invalid.'
      using errcode = '22023';
  end if;

  select reservation.*
  into current_row
  from public.reservations as reservation
  where reservation.id = p_reservation_id
    and reservation.business_id = p_business_id
  for update;

  if not found then
    raise exception
      'Reservation is not available for this business.'
      using errcode = '42501';
  end if;

  if current_row.status = status_value then
    return to_jsonb(current_row);
  end if;

  if not (
    (
      current_row.status = 'pending'
      and status_value in (
        'confirmed',
        'cancelled'
      )
    )
    or (
      current_row.status = 'confirmed'
      and status_value in (
        'completed',
        'cancelled',
        'no_show'
      )
    )
  ) then
    raise exception
      'Reservation status transition is not allowed.'
      using errcode = '22023';
  end if;

  update public.reservations
  set
    status = status_value,
    confirmed_at = case
      when status_value = 'confirmed'
        then coalesce(confirmed_at, now())
      else confirmed_at
    end,
    completed_at = case
      when status_value = 'completed'
        then coalesce(completed_at, now())
      else completed_at
    end,
    cancelled_at = case
      when status_value = 'cancelled'
        then coalesce(cancelled_at, now())
      else cancelled_at
    end,
    no_show_at = case
      when status_value = 'no_show'
        then coalesce(no_show_at, now())
      else no_show_at
    end,
    updated_at = now()
  where id = p_reservation_id
    and business_id = p_business_id
  returning * into saved;

  return to_jsonb(saved);
end;
$$;

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

grant execute on function
  public.save_business_reservation(
    uuid,
    uuid,
    jsonb,
    text
  )
to authenticated;

grant execute on function
  public.set_business_reservation_status(
    uuid,
    uuid,
    text
  )
to authenticated;

revoke insert, update, delete
on table public.reservations
from authenticated;

commit;
