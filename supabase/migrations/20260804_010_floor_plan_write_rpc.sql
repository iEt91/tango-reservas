begin;

create unique index if not exists
  reservations_business_id_id_key
on public.reservations (business_id, id);

create table if not exists public.floor_plan_settings (
  business_id uuid primary key
    references public.businesses(id) on delete cascade,
  background_image_url text,
  background_fit text not null default 'stretch'
    check (
      background_fit in (
        'contain',
        'cover',
        'stretch'
      )
    ),
  background_x numeric(10, 2) not null default 0,
  background_y numeric(10, 2) not null default 0,
  background_width numeric(10, 2) not null default 1000,
  background_height numeric(10, 2) not null default 600,
  background_opacity numeric(5, 2) not null default 50,
  background_brightness numeric(5, 2) not null default 100,
  background_contrast numeric(5, 2) not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint floor_plan_settings_image_length_check
    check (
      background_image_url is null
      or char_length(background_image_url) <= 2048
    ),
  constraint floor_plan_settings_geometry_check
    check (
      background_x between -10000 and 10000
      and background_y between -10000 and 10000
      and background_width between 100 and 10000
      and background_height between 100 and 10000
    ),
  constraint floor_plan_settings_filters_check
    check (
      background_opacity between 0 and 100
      and background_brightness between 0 and 100
      and background_contrast between 0 and 100
    )
);

create table if not exists public.floor_tables (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  label text not null,
  seats integer not null default 4,
  x numeric(10, 2) not null default 80,
  y numeric(10, 2) not null default 80,
  width numeric(10, 2) not null default 130,
  height numeric(10, 2) not null default 90,
  rotation numeric(8, 2) not null default 0,
  shape text not null default 'square'
    check (
      shape in (
        'square',
        'rectangle',
        'round'
      )
    ),
  corner_radius numeric(6, 2) not null default 16,
  status text not null default 'available'
    check (
      status in (
        'available',
        'blocked',
        'out_of_service'
      )
    ),
  can_join boolean not null default true,
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint floor_tables_business_id_id_key
    unique (business_id, id),
  constraint floor_tables_label_length_check
    check (
      char_length(btrim(label))
      between 1 and 80
    ),
  constraint floor_tables_seats_check
    check (seats between 1 and 100),
  constraint floor_tables_position_check
    check (
      x between -10000 and 10000
      and y between -10000 and 10000
    ),
  constraint floor_tables_dimensions_check
    check (
      width between 24 and 1000
      and height between 24 and 1000
    ),
  constraint floor_tables_rotation_check
    check (rotation between -360 and 360),
  constraint floor_tables_corner_radius_check
    check (corner_radius between 0 and 100),
  constraint floor_tables_archive_state_check
    check (
      (
        is_active = true
        and archived_at is null
      )
      or (
        is_active = false
        and archived_at is not null
        and status = 'out_of_service'
      )
    )
);

create unique index if not exists
  floor_tables_business_active_label_key
on public.floor_tables (
  business_id,
  lower(btrim(label))
)
where is_active = true;

create index if not exists
  floor_tables_business_active_idx
on public.floor_tables (
  business_id,
  is_active,
  label
);

create table if not exists
  public.reservation_table_assignments (
    business_id uuid not null,
    reservation_id uuid not null,
    table_id uuid not null,
    assigned_at timestamptz not null default now(),
    assigned_by uuid
      references auth.users(id) on delete set null,
    primary key (reservation_id, table_id),
    constraint reservation_table_assignments_reservation_fkey
      foreign key (business_id, reservation_id)
      references public.reservations(business_id, id)
      on delete cascade,
    constraint reservation_table_assignments_table_fkey
      foreign key (business_id, table_id)
      references public.floor_tables(business_id, id)
      on delete restrict
  );

create index if not exists
  reservation_table_assignments_business_idx
on public.reservation_table_assignments (
  business_id,
  reservation_id
);

create index if not exists
  reservation_table_assignments_table_idx
on public.reservation_table_assignments (
  business_id,
  table_id
);

alter table public.floor_plan_settings
  enable row level security;
alter table public.floor_plan_settings
  force row level security;
alter table public.floor_tables
  enable row level security;
alter table public.floor_tables
  force row level security;
alter table public.reservation_table_assignments
  enable row level security;
alter table public.reservation_table_assignments
  force row level security;

revoke all on table public.floor_plan_settings
  from anon, authenticated;
revoke all on table public.floor_tables
  from anon, authenticated;
revoke all on table public.reservation_table_assignments
  from anon, authenticated;

drop policy if exists
  floor_plan_settings_select_active_member
on public.floor_plan_settings;

create policy floor_plan_settings_select_active_member
on public.floor_plan_settings
for select
to authenticated
using (
  private.has_business_role(
    business_id,
    array['owner', 'admin', 'staff']::text[]
  )
);

drop policy if exists
  floor_tables_select_active_member
on public.floor_tables;

create policy floor_tables_select_active_member
on public.floor_tables
for select
to authenticated
using (
  private.has_business_role(
    business_id,
    array['owner', 'admin', 'staff']::text[]
  )
);

drop policy if exists
  reservation_table_assignments_select_active_member
on public.reservation_table_assignments;

create policy
  reservation_table_assignments_select_active_member
on public.reservation_table_assignments
for select
to authenticated
using (
  private.has_business_role(
    business_id,
    array['owner', 'admin', 'staff']::text[]
  )
);

grant select on table public.floor_plan_settings
  to authenticated;
grant select on table public.floor_tables
  to authenticated;
grant select on table
  public.reservation_table_assignments
  to authenticated;

create or replace function
  private.validate_reservation_table_selection(
    p_business_id uuid,
    p_reservation_id uuid,
    p_table_ids uuid[]
  )
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  table_ids_value uuid[];
  reservation_row public.reservations%rowtype;
  hour_row public.business_hours%rowtype;
  expected_count integer;
  available_count integer;
  joinable_count integer;
  total_seats integer;
  day_name_value text;
  rule_row public.reservation_rules%rowtype;
  starts_at timestamp;
  ends_at timestamp;
  opens_at timestamp;
  closes_at timestamp;
begin
  select coalesce(
    array_agg(distinct value order by value),
    array[]::uuid[]
  )
  into table_ids_value
  from unnest(
    coalesce(p_table_ids, array[]::uuid[])
  ) as requested(value)
  where value is not null;

  expected_count := cardinality(table_ids_value);

  if expected_count < 1 or expected_count > 20 then
    raise exception
      'Reservation table selection must contain between 1 and 20 tables.'
      using errcode = '22023';
  end if;

  select reservation.*
  into reservation_row
  from public.reservations as reservation
  where reservation.id = p_reservation_id
    and reservation.business_id = p_business_id
  for share;

  if not found then
    raise exception
      'Reservation is not available for this business.'
      using errcode = '42501';
  end if;

  if reservation_row.status not in (
    'pending',
    'confirmed'
  ) then
    raise exception
      'Only active reservations can receive tables.'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(
      p_business_id::text
      || ':reservation-date:'
      || reservation_row.reservation_date::text,
      0
    )
  );

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

  select
    count(*)::integer,
    count(*) filter (
      where floor_table.can_join = true
    )::integer,
    coalesce(sum(floor_table.seats), 0)::integer
  into
    available_count,
    joinable_count,
    total_seats
  from public.floor_tables as floor_table
  where floor_table.business_id = p_business_id
    and floor_table.id = any(table_ids_value)
    and floor_table.is_active = true
    and floor_table.status = 'available';

  if available_count <> expected_count then
    raise exception
      'One or more tables are unavailable.'
      using errcode = 'P0001';
  end if;

  if expected_count > 1
    and rule_row.allow_table_combinations is not true then
    raise exception
      'Table combinations are disabled.'
      using errcode = 'P0001';
  end if;

  if expected_count > 1
    and joinable_count <> expected_count then
    raise exception
      'One or more selected tables cannot be joined.'
      using errcode = 'P0001';
  end if;

  if total_seats < reservation_row.party_size then
    raise exception
      'Selected tables do not have enough seats.'
      using errcode = 'P0001';
  end if;

  day_name_value := case
    extract(dow from reservation_row.reservation_date)
    when 0 then 'sunday'
    when 1 then 'monday'
    when 2 then 'tuesday'
    when 3 then 'wednesday'
    when 4 then 'thursday'
    when 5 then 'friday'
    else 'saturday'
  end;

  select business_hour.*
  into hour_row
  from public.business_hours as business_hour
  where business_hour.business_id = p_business_id
    and business_hour.day_of_week = day_name_value
    and business_hour.is_open = true
  limit 1
  for share;

  if not found then
    raise exception
      'Business hours are missing for the reservation date.'
      using errcode = 'P0001';
  end if;

  opens_at :=
    reservation_row.reservation_date
    + hour_row.open_time;
  closes_at :=
    reservation_row.reservation_date
    + hour_row.close_time;

  if hour_row.close_time <= hour_row.open_time then
    closes_at := closes_at + interval '1 day';
  end if;

  starts_at :=
    reservation_row.reservation_date
    + reservation_row.reservation_time;

  if hour_row.close_time <= hour_row.open_time
    and reservation_row.reservation_time
      < hour_row.open_time then
    starts_at := starts_at + interval '1 day';
  end if;

  ends_at := starts_at
    + make_interval(
      mins => reservation_row.duration_minutes
    );

  if exists (
    select 1
    from public.reservation_table_assignments
      as assignment
    join public.reservations as other_reservation
      on other_reservation.id =
        assignment.reservation_id
      and other_reservation.business_id =
        assignment.business_id
    where assignment.business_id = p_business_id
      and assignment.table_id = any(table_ids_value)
      and assignment.reservation_id
        <> p_reservation_id
      and other_reservation.status in (
        'pending',
        'confirmed'
      )
      and other_reservation.reservation_date =
        reservation_row.reservation_date
      and (
        (
          other_reservation.reservation_date
          + other_reservation.reservation_time
          + case
              when hour_row.close_time
                  <= hour_row.open_time
                and other_reservation.reservation_time
                  < hour_row.open_time
              then interval '1 day'
              else interval '0 day'
            end
        ) < ends_at
        and starts_at < (
          other_reservation.reservation_date
          + other_reservation.reservation_time
          + case
              when hour_row.close_time
                  <= hour_row.open_time
                and other_reservation.reservation_time
                  < hour_row.open_time
              then interval '1 day'
              else interval '0 day'
            end
          + make_interval(
              mins =>
                other_reservation.duration_minutes
            )
        )
      )
  ) then
    raise exception
      'One or more tables already have an overlapping reservation.'
      using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'table_ids',
    to_jsonb(table_ids_value),
    'total_seats',
    total_seats,
    'starts_at',
    starts_at,
    'ends_at',
    ends_at,
    'opens_at',
    opens_at,
    'closes_at',
    closes_at
  );
end;
$$;

create or replace function
  public.save_business_floor_plan_settings(
    p_business_id uuid,
    p_settings jsonb
  )
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  image_url_value text;
  fit_value text;
  x_value numeric;
  y_value numeric;
  width_value numeric;
  height_value numeric;
  opacity_value numeric;
  brightness_value numeric;
  contrast_value numeric;
  saved public.floor_plan_settings%rowtype;
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

  if p_settings is null
    or jsonb_typeof(p_settings) <> 'object' then
    raise exception
      'Floor plan settings payload must be an object.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_settings)
      as fields(key)
    where fields.key not in (
      'background_image_url',
      'background_fit',
      'background_x',
      'background_y',
      'background_width',
      'background_height',
      'background_opacity',
      'background_brightness',
      'background_contrast'
    )
  ) then
    raise exception
      'Floor plan settings payload contains unknown fields.'
      using errcode = '22023';
  end if;

  for fit_value in
    select required.key
    from (
      values
        ('background_fit'),
        ('background_x'),
        ('background_y'),
        ('background_width'),
        ('background_height'),
        ('background_opacity'),
        ('background_brightness'),
        ('background_contrast')
    ) as required(key)
    where not (p_settings ? required.key)
  loop
    raise exception
      'Floor plan settings payload is missing required field: %.',
      fit_value
      using errcode = '22023';
  end loop;

  if jsonb_typeof(
      p_settings -> 'background_fit'
    ) is distinct from 'string'
    or jsonb_typeof(
      p_settings -> 'background_x'
    ) is distinct from 'number'
    or jsonb_typeof(
      p_settings -> 'background_y'
    ) is distinct from 'number'
    or jsonb_typeof(
      p_settings -> 'background_width'
    ) is distinct from 'number'
    or jsonb_typeof(
      p_settings -> 'background_height'
    ) is distinct from 'number'
    or jsonb_typeof(
      p_settings -> 'background_opacity'
    ) is distinct from 'number'
    or jsonb_typeof(
      p_settings -> 'background_brightness'
    ) is distinct from 'number'
    or jsonb_typeof(
      p_settings -> 'background_contrast'
    ) is distinct from 'number' then
    raise exception
      'Floor plan settings fields are invalid.'
      using errcode = '22023';
  end if;

  if p_settings ? 'background_image_url'
    and jsonb_typeof(
      p_settings -> 'background_image_url'
    ) not in ('string', 'null') then
    raise exception
      'Floor plan background image is invalid.'
      using errcode = '22023';
  end if;

  image_url_value := nullif(
    btrim(p_settings ->> 'background_image_url'),
    ''
  );
  fit_value := lower(
    btrim(p_settings ->> 'background_fit')
  );

  begin
    x_value := (p_settings ->> 'background_x')::numeric;
    y_value := (p_settings ->> 'background_y')::numeric;
    width_value :=
      (p_settings ->> 'background_width')::numeric;
    height_value :=
      (p_settings ->> 'background_height')::numeric;
    opacity_value :=
      (p_settings ->> 'background_opacity')::numeric;
    brightness_value :=
      (p_settings ->> 'background_brightness')::numeric;
    contrast_value :=
      (p_settings ->> 'background_contrast')::numeric;
  exception
    when others then
      raise exception
        'Floor plan settings numbers are invalid.'
        using errcode = '22023';
  end;

  if image_url_value is not null
    and char_length(image_url_value) > 2048 then
    raise exception
      'Floor plan background image is too long.'
      using errcode = '22023';
  end if;

  if fit_value not in (
    'contain',
    'cover',
    'stretch'
  ) then
    raise exception
      'Floor plan background fit is invalid.'
      using errcode = '22023';
  end if;

  if x_value not between -10000 and 10000
    or y_value not between -10000 and 10000
    or width_value not between 100 and 10000
    or height_value not between 100 and 10000
    or opacity_value not between 0 and 100
    or brightness_value not between 0 and 100
    or contrast_value not between 0 and 100 then
    raise exception
      'Floor plan settings are outside allowed ranges.'
      using errcode = '22023';
  end if;

  insert into public.floor_plan_settings (
    business_id,
    background_image_url,
    background_fit,
    background_x,
    background_y,
    background_width,
    background_height,
    background_opacity,
    background_brightness,
    background_contrast,
    updated_at
  )
  values (
    p_business_id,
    image_url_value,
    fit_value,
    x_value,
    y_value,
    width_value,
    height_value,
    opacity_value,
    brightness_value,
    contrast_value,
    now()
  )
  on conflict (business_id)
  do update
  set
    background_image_url =
      excluded.background_image_url,
    background_fit = excluded.background_fit,
    background_x = excluded.background_x,
    background_y = excluded.background_y,
    background_width = excluded.background_width,
    background_height = excluded.background_height,
    background_opacity =
      excluded.background_opacity,
    background_brightness =
      excluded.background_brightness,
    background_contrast =
      excluded.background_contrast,
    updated_at = now()
  returning * into saved;

  return to_jsonb(saved);
end;
$$;

create or replace function
  public.save_business_floor_table(
    p_business_id uuid,
    p_table_id uuid,
    p_table jsonb
  )
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  label_value text;
  seats_value integer;
  x_value numeric;
  y_value numeric;
  width_value numeric;
  height_value numeric;
  rotation_value numeric;
  shape_value text;
  corner_radius_value numeric;
  status_value text;
  can_join_value boolean;
  current_row public.floor_tables%rowtype;
  saved public.floor_tables%rowtype;
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

  if p_table is null
    or jsonb_typeof(p_table) <> 'object' then
    raise exception
      'Floor table payload must be an object.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_table)
      as fields(key)
    where fields.key not in (
      'label',
      'seats',
      'x',
      'y',
      'width',
      'height',
      'rotation',
      'shape',
      'corner_radius',
      'status',
      'can_join'
    )
  ) then
    raise exception
      'Floor table payload contains unknown fields.'
      using errcode = '22023';
  end if;

  for label_value in
    select required.key
    from (
      values
        ('label'),
        ('seats'),
        ('x'),
        ('y'),
        ('width'),
        ('height'),
        ('rotation'),
        ('shape'),
        ('corner_radius'),
        ('status'),
        ('can_join')
    ) as required(key)
    where not (p_table ? required.key)
  loop
    raise exception
      'Floor table payload is missing required field: %.',
      label_value
      using errcode = '22023';
  end loop;

  if jsonb_typeof(
      p_table -> 'label'
    ) is distinct from 'string'
    or jsonb_typeof(
      p_table -> 'seats'
    ) is distinct from 'number'
    or jsonb_typeof(
      p_table -> 'x'
    ) is distinct from 'number'
    or jsonb_typeof(
      p_table -> 'y'
    ) is distinct from 'number'
    or jsonb_typeof(
      p_table -> 'width'
    ) is distinct from 'number'
    or jsonb_typeof(
      p_table -> 'height'
    ) is distinct from 'number'
    or jsonb_typeof(
      p_table -> 'rotation'
    ) is distinct from 'number'
    or jsonb_typeof(
      p_table -> 'shape'
    ) is distinct from 'string'
    or jsonb_typeof(
      p_table -> 'corner_radius'
    ) is distinct from 'number'
    or jsonb_typeof(
      p_table -> 'status'
    ) is distinct from 'string'
    or jsonb_typeof(
      p_table -> 'can_join'
    ) is distinct from 'boolean' then
    raise exception
      'Floor table fields are invalid.'
      using errcode = '22023';
  end if;

  label_value := btrim(p_table ->> 'label');
  shape_value := lower(
    btrim(p_table ->> 'shape')
  );
  status_value := lower(
    btrim(p_table ->> 'status')
  );

  begin
    seats_value := (p_table ->> 'seats')::integer;
    x_value := (p_table ->> 'x')::numeric;
    y_value := (p_table ->> 'y')::numeric;
    width_value := (p_table ->> 'width')::numeric;
    height_value := (p_table ->> 'height')::numeric;
    rotation_value :=
      (p_table ->> 'rotation')::numeric;
    corner_radius_value :=
      (p_table ->> 'corner_radius')::numeric;
    can_join_value :=
      (p_table ->> 'can_join')::boolean;
  exception
    when others then
      raise exception
        'Floor table values are invalid.'
        using errcode = '22023';
  end;

  if char_length(label_value) not between 1 and 80
    or seats_value not between 1 and 100
    or x_value not between -10000 and 10000
    or y_value not between -10000 and 10000
    or width_value not between 24 and 1000
    or height_value not between 24 and 1000
    or rotation_value not between -360 and 360
    or corner_radius_value not between 0 and 100 then
    raise exception
      'Floor table values are outside allowed ranges.'
      using errcode = '22023';
  end if;

  if shape_value not in (
    'square',
    'rectangle',
    'round'
  ) then
    raise exception
      'Floor table shape is invalid.'
      using errcode = '22023';
  end if;

  if status_value not in (
    'available',
    'blocked',
    'out_of_service'
  ) then
    raise exception
      'Floor table status is invalid.'
      using errcode = '22023';
  end if;

  if p_table_id is null then
    insert into public.floor_tables (
      business_id,
      label,
      seats,
      x,
      y,
      width,
      height,
      rotation,
      shape,
      corner_radius,
      status,
      can_join,
      updated_at
    )
    values (
      p_business_id,
      label_value,
      seats_value,
      x_value,
      y_value,
      width_value,
      height_value,
      rotation_value,
      shape_value,
      corner_radius_value,
      status_value,
      can_join_value,
      now()
    )
    returning * into saved;
  else
    select floor_table.*
    into current_row
    from public.floor_tables as floor_table
    where floor_table.id = p_table_id
      and floor_table.business_id = p_business_id
    for update;

    if not found then
      raise exception
        'Floor table is not available for this business.'
        using errcode = '42501';
    end if;

    if current_row.is_active is not true then
      raise exception
        'Archived floor tables cannot be edited.'
        using errcode = '22023';
    end if;

    update public.floor_tables
    set
      label = label_value,
      seats = seats_value,
      x = x_value,
      y = y_value,
      width = width_value,
      height = height_value,
      rotation = rotation_value,
      shape = shape_value,
      corner_radius = corner_radius_value,
      status = status_value,
      can_join = can_join_value,
      updated_at = now()
    where id = p_table_id
      and business_id = p_business_id
    returning * into saved;
  end if;

  return to_jsonb(saved);
exception
  when unique_violation then
    raise exception
      'Floor table label already exists.'
      using errcode = '23505';
end;
$$;

create or replace function
  public.set_business_floor_table_active(
    p_business_id uuid,
    p_table_id uuid,
    p_is_active boolean
  )
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  current_row public.floor_tables%rowtype;
  saved public.floor_tables%rowtype;
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

  select floor_table.*
  into current_row
  from public.floor_tables as floor_table
  where floor_table.id = p_table_id
    and floor_table.business_id = p_business_id
  for update;

  if not found then
    raise exception
      'Floor table is not available for this business.'
      using errcode = '42501';
  end if;

  if current_row.is_active = p_is_active then
    return to_jsonb(current_row);
  end if;

  if p_is_active is false
    and exists (
      select 1
      from public.reservation_table_assignments
        as assignment
      join public.reservations as reservation
        on reservation.id =
          assignment.reservation_id
        and reservation.business_id =
          assignment.business_id
      where assignment.business_id = p_business_id
        and assignment.table_id = p_table_id
        and reservation.status in (
          'pending',
          'confirmed'
        )
    ) then
    raise exception
      'Floor table has an active reservation assignment.'
      using errcode = 'P0001';
  end if;

  update public.floor_tables
  set
    is_active = p_is_active,
    archived_at = case
      when p_is_active then null
      else now()
    end,
    status = case
      when p_is_active then 'available'
      else 'out_of_service'
    end,
    updated_at = now()
  where id = p_table_id
    and business_id = p_business_id
  returning * into saved;

  return to_jsonb(saved);
end;
$$;

create or replace function
  public.set_business_reservation_tables(
    p_business_id uuid,
    p_reservation_id uuid,
    p_table_ids uuid[]
  )
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  table_ids_value uuid[];
  existing_table_ids uuid[];
  reservation_row public.reservations%rowtype;
  validation jsonb;
  assigned_at_value timestamptz;
  assigned_by_value uuid;
  total_seats_value integer;
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

  select coalesce(
    array_agg(distinct value order by value),
    array[]::uuid[]
  )
  into table_ids_value
  from unnest(
    coalesce(p_table_ids, array[]::uuid[])
  ) as requested(value)
  where value is not null;

  if cardinality(table_ids_value) > 20 then
    raise exception
      'Reservation cannot use more than 20 tables.'
      using errcode = '22023';
  end if;

  select reservation.*
  into reservation_row
  from public.reservations as reservation
  where reservation.id = p_reservation_id
    and reservation.business_id = p_business_id
  for update;

  if not found then
    raise exception
      'Reservation is not available for this business.'
      using errcode = '42501';
  end if;

  if reservation_row.status not in (
    'pending',
    'confirmed'
  ) then
    raise exception
      'Closed reservation table assignments are immutable.'
      using errcode = '22023';
  end if;

  if cardinality(table_ids_value) = 0 then
    delete from public.reservation_table_assignments
    where business_id = p_business_id
      and reservation_id = p_reservation_id;

    return jsonb_build_object(
      'business_id',
      p_business_id,
      'reservation_id',
      p_reservation_id,
      'table_ids',
      '[]'::jsonb,
      'assigned_at',
      null,
      'assigned_by',
      null,
      'total_seats',
      0
    );
  end if;

  select coalesce(
    array_agg(
      assignment.table_id
      order by assignment.table_id
    ),
    array[]::uuid[]
  )
  into existing_table_ids
  from public.reservation_table_assignments
    as assignment
  where assignment.business_id = p_business_id
    and assignment.reservation_id =
      p_reservation_id;

  if existing_table_ids = table_ids_value then
    select
      max(assignment.assigned_at),
      (
        array_agg(
          assignment.assigned_by
          order by assignment.assigned_at desc
        )
      )[1],
      coalesce(sum(floor_table.seats), 0)::integer
    into
      assigned_at_value,
      assigned_by_value,
      total_seats_value
    from public.reservation_table_assignments
      as assignment
    join public.floor_tables as floor_table
      on floor_table.id = assignment.table_id
      and floor_table.business_id =
        assignment.business_id
    where assignment.business_id = p_business_id
      and assignment.reservation_id =
        p_reservation_id;

    return jsonb_build_object(
      'business_id',
      p_business_id,
      'reservation_id',
      p_reservation_id,
      'table_ids',
      to_jsonb(table_ids_value),
      'assigned_at',
      assigned_at_value,
      'assigned_by',
      assigned_by_value,
      'total_seats',
      total_seats_value
    );
  end if;

  validation :=
    private.validate_reservation_table_selection(
      p_business_id,
      p_reservation_id,
      table_ids_value
    );

  delete from public.reservation_table_assignments
  where business_id = p_business_id
    and reservation_id = p_reservation_id;

  insert into public.reservation_table_assignments (
    business_id,
    reservation_id,
    table_id,
    assigned_at,
    assigned_by
  )
  select
    p_business_id,
    p_reservation_id,
    requested_table_id,
    now(),
    (select auth.uid())
  from unnest(table_ids_value)
    as requested(requested_table_id);

  return jsonb_build_object(
    'business_id',
    p_business_id,
    'reservation_id',
    p_reservation_id,
    'table_ids',
    to_jsonb(table_ids_value),
    'assigned_at',
    now(),
    'assigned_by',
    (select auth.uid()),
    'total_seats',
    (validation ->> 'total_seats')::integer
  );
end;
$$;

create or replace function
  private.enforce_reservation_table_assignments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  assigned_table_ids uuid[];
begin
  if new.status not in (
    'pending',
    'confirmed'
  ) then
    return new;
  end if;

  select coalesce(
    array_agg(
      assignment.table_id
      order by assignment.table_id
    ),
    array[]::uuid[]
  )
  into assigned_table_ids
  from public.reservation_table_assignments
    as assignment
  where assignment.business_id = new.business_id
    and assignment.reservation_id = new.id;

  if cardinality(assigned_table_ids) > 0 then
    perform
      private.validate_reservation_table_selection(
        new.business_id,
        new.id,
        assigned_table_ids
      );
  end if;

  return new;
end;
$$;

create or replace function
  private.enforce_floor_table_assignments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reservation_id_value uuid;
  assigned_table_ids uuid[];
begin
  for reservation_id_value in
    select distinct assignment.reservation_id
    from public.reservation_table_assignments
      as assignment
    join public.reservations as reservation
      on reservation.id =
        assignment.reservation_id
      and reservation.business_id =
        assignment.business_id
    where assignment.business_id = new.business_id
      and assignment.table_id = new.id
      and reservation.status in (
        'pending',
        'confirmed'
      )
  loop
    select coalesce(
      array_agg(
        assignment.table_id
        order by assignment.table_id
      ),
      array[]::uuid[]
    )
    into assigned_table_ids
    from public.reservation_table_assignments
      as assignment
    where assignment.business_id =
        new.business_id
      and assignment.reservation_id =
        reservation_id_value;

    perform
      private.validate_reservation_table_selection(
        new.business_id,
        reservation_id_value,
        assigned_table_ids
      );
  end loop;

  return new;
end;
$$;

create or replace function
  private.enforce_reservation_rule_table_assignments()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  reservation_id_value uuid;
  assigned_table_ids uuid[];
begin
  for reservation_id_value in
    select assignment.reservation_id
    from public.reservation_table_assignments
      as assignment
    join public.reservations as reservation
      on reservation.id =
        assignment.reservation_id
      and reservation.business_id =
        assignment.business_id
    where assignment.business_id = new.business_id
      and reservation.status in (
        'pending',
        'confirmed'
      )
    group by assignment.reservation_id
    having count(*) > 1
  loop
    select array_agg(
      assignment.table_id
      order by assignment.table_id
    )
    into assigned_table_ids
    from public.reservation_table_assignments
      as assignment
    where assignment.business_id =
        new.business_id
      and assignment.reservation_id =
        reservation_id_value;

    perform
      private.validate_reservation_table_selection(
        new.business_id,
        reservation_id_value,
        assigned_table_ids
      );
  end loop;

  return new;
end;
$$;

drop trigger if exists
  floor_tables_validate_assignments
on public.floor_tables;

create trigger floor_tables_validate_assignments
after update of
  seats,
  status,
  can_join,
  is_active
on public.floor_tables
for each row
execute function
  private.enforce_floor_table_assignments();

drop trigger if exists
  reservation_rules_validate_table_assignments
on public.reservation_rules;

create trigger
  reservation_rules_validate_table_assignments
after update of
  allow_table_combinations
on public.reservation_rules
for each row
execute function
  private.enforce_reservation_rule_table_assignments();

drop trigger if exists
  reservations_validate_table_assignments
on public.reservations;

create trigger reservations_validate_table_assignments
after update of
  reservation_date,
  reservation_time,
  duration_minutes,
  party_size,
  status
on public.reservations
for each row
execute function
  private.enforce_reservation_table_assignments();

revoke all on function
  private.validate_reservation_table_selection(
    uuid,
    uuid,
    uuid[]
  )
from public, anon, authenticated;

revoke all on function
  private.enforce_reservation_table_assignments()
from public, anon, authenticated;

revoke all on function
  private.enforce_floor_table_assignments()
from public, anon, authenticated;

revoke all on function
  private.enforce_reservation_rule_table_assignments()
from public, anon, authenticated;

revoke all on function
  public.save_business_floor_plan_settings(
    uuid,
    jsonb
  )
from public, anon, authenticated;

revoke all on function
  public.save_business_floor_table(
    uuid,
    uuid,
    jsonb
  )
from public, anon, authenticated;

revoke all on function
  public.set_business_floor_table_active(
    uuid,
    uuid,
    boolean
  )
from public, anon, authenticated;

revoke all on function
  public.set_business_reservation_tables(
    uuid,
    uuid,
    uuid[]
  )
from public, anon, authenticated;

grant execute on function
  public.save_business_floor_plan_settings(
    uuid,
    jsonb
  )
to authenticated;

grant execute on function
  public.save_business_floor_table(
    uuid,
    uuid,
    jsonb
  )
to authenticated;

grant execute on function
  public.set_business_floor_table_active(
    uuid,
    uuid,
    boolean
  )
to authenticated;

grant execute on function
  public.set_business_reservation_tables(
    uuid,
    uuid,
    uuid[]
  )
to authenticated;

revoke insert, update, delete
on table public.floor_plan_settings
from authenticated;

revoke insert, update, delete
on table public.floor_tables
from authenticated;

revoke insert, update, delete
on table public.reservation_table_assignments
from authenticated;

commit;
