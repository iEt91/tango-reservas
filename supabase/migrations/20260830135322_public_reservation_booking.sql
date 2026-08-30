begin;

-- Las reservas públicas pasan únicamente por el Route Handler de Next.js.
-- Esta RPC es SECURITY INVOKER y sólo puede ser llamada por service_role.
alter table public.business_public_request_limits
  drop constraint if exists business_public_request_limits_action_check;

alter table public.business_public_request_limits
  add constraint business_public_request_limits_action_check
  check (
    action in (
      'shipping_create',
      'shipping_track',
      'reservation_create'
    )
  );

create or replace function public.service_consume_business_public_request_limit(
  p_business_id uuid,
  p_action text,
  p_scope_hash text,
  p_bucket_seconds integer,
  p_limit integer
)
returns void
language plpgsql
security invoker
set search_path = ''
as $$
declare
  bucket_value timestamptz;
  current_count integer;
begin
  if p_business_id is null
    or p_action not in (
      'shipping_create',
      'shipping_track',
      'reservation_create'
    )
    or char_length(btrim(coalesce(p_scope_hash, ''))) not between 6 and 128
    or p_bucket_seconds not between 10 and 86400
    or p_limit not between 1 and 100000 then
    raise exception 'Public request limit input is invalid.'
      using errcode = '22023';
  end if;

  bucket_value := to_timestamp(
    floor(
      extract(epoch from clock_timestamp()) / p_bucket_seconds
    ) * p_bucket_seconds
  );

  insert into public.business_public_request_limits (
    business_id,
    action,
    scope_hash,
    bucket_started_at,
    request_count
  )
  values (
    p_business_id,
    p_action,
    btrim(p_scope_hash),
    bucket_value,
    1
  )
  on conflict (
    business_id,
    action,
    scope_hash,
    bucket_started_at
  )
  do update
  set
    request_count = public.business_public_request_limits.request_count + 1,
    updated_at = now()
  where public.business_public_request_limits.request_count < p_limit
  returning request_count
  into current_count;

  if current_count is null then
    raise exception 'Public request rate limit exceeded.'
      using errcode = 'P0001';
  end if;

  delete from public.business_public_request_limits
  where bucket_started_at < now() - interval '24 hours';
end;
$$;

create or replace function public.service_create_public_reservation(
  p_slug text,
  p_client_name text,
  p_client_phone text,
  p_client_email text,
  p_reservation_date date,
  p_reservation_time time,
  p_party_size integer,
  p_note text,
  p_request_key text,
  p_fingerprint text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_slug text := lower(btrim(coalesce(p_slug, '')));
  client_name_value text := btrim(coalesce(p_client_name, ''));
  client_phone_value text := regexp_replace(
    coalesce(p_client_phone, ''),
    '[^0-9]',
    '',
    'g'
  );
  client_email_value text := nullif(lower(btrim(coalesce(p_client_email, ''))), '');
  note_value text := nullif(btrim(coalesce(p_note, '')), '');
  request_key_value text := nullif(btrim(coalesce(p_request_key, '')), '');
  fingerprint_value text := btrim(coalesce(p_fingerprint, ''));
  day_name_value text;
  starts_at timestamp;
  ends_at timestamp;
  opens_at timestamp;
  closes_at timestamp;
  break_starts_at timestamp;
  break_ends_at timestamp;
  active_count integer;
  active_people integer;
  business_row public.businesses%rowtype;
  service_row public.services%rowtype;
  rule_row public.reservation_rules%rowtype;
  hour_row public.business_hours%rowtype;
  saved public.reservations%rowtype;
begin
  if char_length(normalized_slug) not between 1 and 120
    or normalized_slug !~ '^[a-z0-9][a-z0-9-]*$' then
    raise exception 'Public business is invalid.'
      using errcode = '22023';
  end if;

  if char_length(client_name_value) not between 1 and 160
    or char_length(client_phone_value) not between 6 and 40
    or p_party_size not between 1 and 200
    or char_length(request_key_value) not between 8 and 120
    or char_length(fingerprint_value) not between 6 and 128 then
    raise exception 'Reservation input is invalid.'
      using errcode = '22023';
  end if;

  if client_email_value is not null
    and (
      char_length(client_email_value) > 320
      or client_email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ) then
    raise exception 'Reservation email is invalid.'
      using errcode = '22023';
  end if;

  if note_value is not null and char_length(note_value) > 4000 then
    raise exception 'Reservation note is too long.'
      using errcode = '22023';
  end if;

  select business.*
  into business_row
  from public.businesses as business
  where lower(business.slug) = normalized_slug
    and business.status = 'active'
  limit 1;

  if not found then
    raise exception 'Public business is not available.'
      using errcode = 'P0002';
  end if;

  perform public.service_consume_business_public_request_limit(
    business_row.id,
    'reservation_create',
    fingerprint_value,
    600,
    5
  );

  perform pg_advisory_xact_lock(
    hashtextextended(
      business_row.id::text || ':reservation-idempotency:' || request_key_value,
      0
    )
  );

  select reservation.*
  into saved
  from public.reservations as reservation
  where reservation.business_id = business_row.id
    and reservation.idempotency_key = request_key_value;

  if found then
    return jsonb_build_object(
      'reservationCode', saved.public_code,
      'status', saved.status,
      'date', saved.reservation_date,
      'time', saved.reservation_time,
      'people', saved.party_size
    );
  end if;

  select rules.*
  into rule_row
  from public.reservation_rules as rules
  where rules.business_id = business_row.id
  for share;

  if not found or rule_row.reservations_enabled is not true then
    raise exception 'Public reservations are not available.'
      using errcode = 'P0001';
  end if;

  if p_reservation_date < current_date
    or p_reservation_date > current_date + rule_row.max_days_ahead
    or (
      p_reservation_date + p_reservation_time
      < localtimestamp + make_interval(mins => rule_row.min_notice_minutes)
    ) then
    raise exception 'Reservation date is not available.'
      using errcode = 'P0001';
  end if;

  -- La web actual no ofrece selector de servicio: se usa el primer servicio
  -- activo con capacidad suficiente, según el orden configurado por el local.
  select service.*
  into service_row
  from public.services as service
  where service.business_id = business_row.id
    and service.is_active = true
    and service.capacity >= p_party_size
    and service.duration_minutes between 15 and 720
  order by service.sort_order, service.created_at, service.id
  limit 1
  for share;

  if not found then
    raise exception 'No reservation service is available for this party size.'
      using errcode = 'P0001';
  end if;

  day_name_value := case extract(dow from p_reservation_date)
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
  where hours.business_id = business_row.id
    and hours.day_of_week = day_name_value
    and hours.is_open = true
  limit 1
  for share;

  if not found then
    raise exception 'Business is closed on the reservation date.'
      using errcode = 'P0001';
  end if;

  opens_at := p_reservation_date + hour_row.open_time;
  closes_at := p_reservation_date + hour_row.close_time;
  if hour_row.close_time <= hour_row.open_time then
    closes_at := closes_at + interval '1 day';
  end if;

  starts_at := p_reservation_date + p_reservation_time;
  if hour_row.close_time <= hour_row.open_time
    and p_reservation_time < hour_row.open_time then
    starts_at := starts_at + interval '1 day';
  end if;
  ends_at := starts_at + make_interval(
    mins => coalesce(service_row.duration_minutes, rule_row.default_reservation_duration_minutes)
  );

  if starts_at < opens_at
    or starts_at >= closes_at
    or ends_at > closes_at then
    raise exception 'Reservation is outside business hours.'
      using errcode = 'P0001';
  end if;

  if hour_row.break_start_time is not null
    and hour_row.break_end_time is not null then
    break_starts_at := p_reservation_date + hour_row.break_start_time;
    break_ends_at := p_reservation_date + hour_row.break_end_time;
    if hour_row.close_time <= hour_row.open_time
      and hour_row.break_start_time < hour_row.open_time then
      break_starts_at := break_starts_at + interval '1 day';
    end if;
    if hour_row.close_time <= hour_row.open_time
      and hour_row.break_end_time < hour_row.open_time then
      break_ends_at := break_ends_at + interval '1 day';
    end if;
    if break_ends_at <= break_starts_at then
      break_ends_at := break_ends_at + interval '1 day';
    end if;
    if starts_at < break_ends_at and break_starts_at < ends_at then
      raise exception 'Reservation overlaps the configured break.'
        using errcode = 'P0001';
    end if;
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      business_row.id::text || ':reservation-date:' || p_reservation_date::text,
      0
    )
  );

  select
    count(*)::integer,
    coalesce(sum(reservation.party_size), 0)::integer
  into active_count, active_people
  from public.reservations as reservation
  where reservation.business_id = business_row.id
    and reservation.status in ('pending', 'confirmed')
    and reservation.reservation_date = p_reservation_date
    and (
      reservation.reservation_date + reservation.reservation_time
        + make_interval(mins => reservation.duration_minutes) > starts_at
      and ends_at > reservation.reservation_date + reservation.reservation_time
    );

  if active_count >= rule_row.max_reservations_per_slot
    or active_people + p_party_size > rule_row.max_people_per_slot then
    raise exception 'Reservation slot is no longer available.'
      using errcode = 'P0001';
  end if;

  if exists (
    select 1
    from public.reservations as reservation
    where reservation.business_id = business_row.id
      and reservation.status in ('pending', 'confirmed')
      and reservation.reservation_date = p_reservation_date
      and regexp_replace(reservation.customer_phone, '[^0-9]', '', 'g') = client_phone_value
      and (
        reservation.reservation_date + reservation.reservation_time
          + make_interval(mins => reservation.duration_minutes) > starts_at
        and ends_at > reservation.reservation_date + reservation.reservation_time
      )
  ) then
    raise exception 'Customer already has an overlapping active reservation.'
      using errcode = 'P0001';
  end if;

  insert into public.reservations (
    business_id,
    service_id,
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
    business_row.id,
    service_row.id,
    client_name_value,
    client_phone_value,
    client_email_value,
    p_reservation_date,
    p_reservation_time,
    p_party_size,
    case when rule_row.requires_confirmation then 'pending' else 'confirmed' end,
    note_value,
    'web',
    service_row.duration_minutes,
    request_key_value,
    case when rule_row.requires_confirmation then null else now() end,
    now()
  )
  returning * into saved;

  return jsonb_build_object(
    'reservationCode', saved.public_code,
    'status', saved.status,
    'date', saved.reservation_date,
    'time', saved.reservation_time,
    'people', saved.party_size
  );
end;
$$;

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
) from public, anon, authenticated;

grant execute on function public.service_create_public_reservation(
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
) to service_role;

commit;
