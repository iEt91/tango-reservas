begin;

alter table public.services
  add column if not exists sort_order integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.services'::regclass
      and conname = 'services_name_length_check'
  ) then
    alter table public.services
      add constraint services_name_length_check
      check (char_length(btrim(name)) between 1 and 120);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.services'::regclass
      and conname = 'services_description_length_check'
  ) then
    alter table public.services
      add constraint services_description_length_check
      check (char_length(description) <= 1000);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.services'::regclass
      and conname = 'services_duration_check'
  ) then
    alter table public.services
      add constraint services_duration_check
      check (
        duration_minutes between 15 and 1440
        and mod(duration_minutes, 15) = 0
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.services'::regclass
      and conname = 'services_capacity_check'
  ) then
    alter table public.services
      add constraint services_capacity_check
      check (capacity between 1 and 1000);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.services'::regclass
      and conname = 'services_price_check'
  ) then
    alter table public.services
      add constraint services_price_check
      check (
        price is null
        or price between 0 and 99999999.99
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.services'::regclass
      and conname = 'services_sort_order_check'
  ) then
    alter table public.services
      add constraint services_sort_order_check
      check (sort_order between 0 and 1000000);
  end if;
end;
$$;

create unique index if not exists
  services_business_normalized_name_key
on public.services (
  business_id,
  lower(btrim(name))
);

create or replace function public.save_business_service(
  p_business_id uuid,
  p_service_id uuid,
  p_service jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  service_name text;
  service_description text;
  duration_value integer;
  capacity_value integer;
  price_value numeric(10, 2);
  active_value boolean;
  sort_order_value integer;
  saved public.services%rowtype;
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

  if jsonb_typeof(p_service) <> 'object' then
    raise exception 'Service payload must be an object.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_service) as fields(key)
    where fields.key not in (
      'name',
      'description',
      'duration_minutes',
      'capacity',
      'price',
      'is_active'
    )
  ) then
    raise exception 'Service payload contains unknown fields.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_service -> 'name')
      is distinct from 'string'
    or jsonb_typeof(p_service -> 'duration_minutes')
      is distinct from 'number'
    or jsonb_typeof(p_service -> 'capacity')
      is distinct from 'number'
    or jsonb_typeof(p_service -> 'is_active')
      is distinct from 'boolean' then
    raise exception 'Service required fields are invalid.'
      using errcode = '22023';
  end if;

  if p_service ? 'description'
    and jsonb_typeof(p_service -> 'description')
      not in ('string', 'null') then
    raise exception 'Service description is invalid.'
      using errcode = '22023';
  end if;

  if p_service ? 'price'
    and jsonb_typeof(p_service -> 'price')
      not in ('number', 'null') then
    raise exception 'Service price is invalid.'
      using errcode = '22023';
  end if;

  service_name := btrim(p_service ->> 'name');
  service_description := coalesce(
    nullif(btrim(p_service ->> 'description'), ''),
    ''
  );
  duration_value := (p_service ->> 'duration_minutes')::integer;
  capacity_value := (p_service ->> 'capacity')::integer;
  active_value := (p_service ->> 'is_active')::boolean;

  if jsonb_typeof(p_service -> 'price') = 'number' then
    price_value := round(
      (p_service ->> 'price')::numeric,
      2
    );
  else
    price_value := null;
  end if;

  if char_length(service_name) < 1
    or char_length(service_name) > 120 then
    raise exception 'Service name length is invalid.'
      using errcode = '22023';
  end if;

  if char_length(service_description) > 1000 then
    raise exception 'Service description is too long.'
      using errcode = '22023';
  end if;

  if duration_value < 15
    or duration_value > 1440
    or mod(duration_value, 15) <> 0 then
    raise exception 'Service duration is invalid.'
      using errcode = '22023';
  end if;

  if capacity_value < 1 or capacity_value > 1000 then
    raise exception 'Service capacity is invalid.'
      using errcode = '22023';
  end if;

  if price_value is not null
    and (
      price_value < 0
      or price_value > 99999999.99
    ) then
    raise exception 'Service price is invalid.'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text, 0)
  );

  if p_service_id is null then
    select coalesce(max(service.sort_order), -1) + 1
    into sort_order_value
    from public.services as service
    where service.business_id = p_business_id;

    insert into public.services (
      business_id,
      name,
      description,
      duration_minutes,
      capacity,
      price,
      is_active,
      sort_order,
      updated_at
    )
    values (
      p_business_id,
      service_name,
      service_description,
      duration_value,
      capacity_value,
      price_value,
      active_value,
      sort_order_value,
      now()
    )
    returning *
    into saved;
  else
    select service.*
    into saved
    from public.services as service
    where service.id = p_service_id
      and service.business_id = p_business_id
    for update;

    if not found then
      raise exception 'Service is not available for this business.'
        using errcode = '42501';
    end if;

    update public.services
    set
      name = service_name,
      description = service_description,
      duration_minutes = duration_value,
      capacity = capacity_value,
      price = price_value,
      is_active = active_value,
      updated_at = now()
    where id = p_service_id
      and business_id = p_business_id
    returning *
    into saved;
  end if;

  return jsonb_build_object(
    'id', saved.id,
    'business_id', saved.business_id,
    'name', saved.name,
    'description', saved.description,
    'duration_minutes', saved.duration_minutes,
    'capacity', saved.capacity,
    'price', saved.price,
    'is_active', saved.is_active,
    'sort_order', saved.sort_order,
    'created_at', saved.created_at,
    'updated_at', saved.updated_at
  );
exception
  when unique_violation then
    raise exception 'A service with this name already exists.'
      using errcode = '23505';
end;
$$;

create or replace function public.set_business_service_active(
  p_business_id uuid,
  p_service_id uuid,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.services%rowtype;
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

  update public.services
  set
    is_active = p_is_active,
    updated_at = now()
  where id = p_service_id
    and business_id = p_business_id
  returning *
  into saved;

  if not found then
    raise exception 'Service is not available for this business.'
      using errcode = '42501';
  end if;

  return jsonb_build_object(
    'id', saved.id,
    'business_id', saved.business_id,
    'name', saved.name,
    'description', saved.description,
    'duration_minutes', saved.duration_minutes,
    'capacity', saved.capacity,
    'price', saved.price,
    'is_active', saved.is_active,
    'sort_order', saved.sort_order,
    'created_at', saved.created_at,
    'updated_at', saved.updated_at
  );
end;
$$;

revoke all on function public.save_business_service(
  uuid,
  uuid,
  jsonb
) from public, anon, authenticated;

revoke all on function public.set_business_service_active(
  uuid,
  uuid,
  boolean
) from public, anon, authenticated;

grant execute on function public.save_business_service(
  uuid,
  uuid,
  jsonb
) to authenticated;

grant execute on function public.set_business_service_active(
  uuid,
  uuid,
  boolean
) to authenticated;

revoke insert, update, delete on table public.services
  from authenticated;

commit;
