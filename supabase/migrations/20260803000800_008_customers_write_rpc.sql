begin;

alter table public.customers
  add column if not exists birth_date date,
  add column if not exists preferences text not null default '',
  add column if not exists tags jsonb not null default '[]'::jsonb,
  add column if not exists is_active boolean not null default true;

update public.customers
set tags = '[]'::jsonb
where tags is null
   or jsonb_typeof(tags) is distinct from 'array';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.customers'::regclass
      and conname = 'customers_full_name_length_check'
  ) then
    alter table public.customers
      add constraint customers_full_name_length_check
      check (char_length(btrim(full_name)) between 1 and 160);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.customers'::regclass
      and conname = 'customers_email_length_check'
  ) then
    alter table public.customers
      add constraint customers_email_length_check
      check (email is null or char_length(email) <= 320);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.customers'::regclass
      and conname = 'customers_phone_length_check'
  ) then
    alter table public.customers
      add constraint customers_phone_length_check
      check (phone is null or char_length(phone) <= 40);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.customers'::regclass
      and conname = 'customers_notes_length_check'
  ) then
    alter table public.customers
      add constraint customers_notes_length_check
      check (notes is null or char_length(notes) <= 4000);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.customers'::regclass
      and conname = 'customers_preferences_length_check'
  ) then
    alter table public.customers
      add constraint customers_preferences_length_check
      check (char_length(preferences) <= 2000);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.customers'::regclass
      and conname = 'customers_birth_date_check'
  ) then
    alter table public.customers
      add constraint customers_birth_date_check
      check (
        birth_date is null
        or birth_date between date '1900-01-01' and date '2100-12-31'
      );
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.customers'::regclass
      and conname = 'customers_tags_check'
  ) then
    alter table public.customers
      add constraint customers_tags_check
      check (
        jsonb_typeof(tags) = 'array'
        and jsonb_array_length(tags) <= 30
      );
  end if;
end;
$$;

create unique index if not exists
  customers_business_normalized_phone_key
on public.customers (
  business_id,
  regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g')
)
where regexp_replace(coalesce(phone, ''), '[^0-9]', '', 'g') <> '';

create unique index if not exists
  customers_business_normalized_email_key
on public.customers (
  business_id,
  lower(btrim(email))
)
where email is not null and btrim(email) <> '';

drop policy if exists customers_select_active_member
  on public.customers;

create policy customers_select_active_member
on public.customers
for select
to authenticated
using (
  private.has_business_role(
    business_id,
    array['owner', 'admin', 'staff']::text[]
  )
);

grant select on table public.customers to authenticated;

create or replace function public.save_business_customer(
  p_business_id uuid,
  p_customer_id uuid,
  p_customer jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  full_name_value text;
  email_value text;
  phone_value text;
  birth_date_value date;
  notes_value text;
  preferences_value text;
  tags_value jsonb := '[]'::jsonb;
  tag_json jsonb;
  tag_text text;
  saved public.customers%rowtype;
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

  if jsonb_typeof(p_customer) <> 'object' then
    raise exception 'Customer payload must be an object.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_customer) as fields(key)
    where fields.key not in (
      'full_name', 'email', 'phone', 'birth_date',
      'notes', 'preferences', 'tags'
    )
  ) then
    raise exception 'Customer payload contains unknown fields.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_customer -> 'full_name')
      is distinct from 'string' then
    raise exception 'Customer full name is required.'
      using errcode = '22023';
  end if;

  if p_customer ? 'email'
    and jsonb_typeof(p_customer -> 'email') not in ('string', 'null') then
    raise exception 'Customer email is invalid.' using errcode = '22023';
  end if;
  if p_customer ? 'phone'
    and jsonb_typeof(p_customer -> 'phone') not in ('string', 'null') then
    raise exception 'Customer phone is invalid.' using errcode = '22023';
  end if;
  if p_customer ? 'birth_date'
    and jsonb_typeof(p_customer -> 'birth_date') not in ('string', 'null') then
    raise exception 'Customer birth date is invalid.' using errcode = '22023';
  end if;
  if p_customer ? 'notes'
    and jsonb_typeof(p_customer -> 'notes') not in ('string', 'null') then
    raise exception 'Customer notes are invalid.' using errcode = '22023';
  end if;
  if p_customer ? 'preferences'
    and jsonb_typeof(p_customer -> 'preferences') not in ('string', 'null') then
    raise exception 'Customer preferences are invalid.' using errcode = '22023';
  end if;
  if p_customer ? 'tags'
    and jsonb_typeof(p_customer -> 'tags') not in ('array', 'null') then
    raise exception 'Customer tags are invalid.' using errcode = '22023';
  end if;

  full_name_value := btrim(p_customer ->> 'full_name');
  email_value := nullif(lower(btrim(p_customer ->> 'email')), '');
  phone_value := nullif(
    regexp_replace(coalesce(p_customer ->> 'phone', ''), '[^0-9]', '', 'g'),
    ''
  );
  notes_value := nullif(btrim(p_customer ->> 'notes'), '');
  preferences_value := coalesce(
    nullif(btrim(p_customer ->> 'preferences'), ''),
    ''
  );

  if char_length(full_name_value) < 1
    or char_length(full_name_value) > 160 then
    raise exception 'Customer full name length is invalid.'
      using errcode = '22023';
  end if;

  if email_value is not null
    and (
      char_length(email_value) > 320
      or email_value !~ '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$'
    ) then
    raise exception 'Customer email is invalid.' using errcode = '22023';
  end if;

  if phone_value is not null and char_length(phone_value) > 40 then
    raise exception 'Customer phone is invalid.' using errcode = '22023';
  end if;
  if notes_value is not null and char_length(notes_value) > 4000 then
    raise exception 'Customer notes are too long.' using errcode = '22023';
  end if;
  if char_length(preferences_value) > 2000 then
    raise exception 'Customer preferences are too long.' using errcode = '22023';
  end if;

  if jsonb_typeof(p_customer -> 'birth_date') = 'string'
    and btrim(p_customer ->> 'birth_date') <> '' then
    begin
      birth_date_value := (p_customer ->> 'birth_date')::date;
    exception
      when others then
        raise exception 'Customer birth date is invalid.'
          using errcode = '22023';
    end;

    if birth_date_value < date '1900-01-01'
      or birth_date_value > current_date then
      raise exception 'Customer birth date is outside the allowed range.'
        using errcode = '22023';
    end if;
  else
    birth_date_value := null;
  end if;

  if jsonb_typeof(p_customer -> 'tags') = 'array' then
    if jsonb_array_length(p_customer -> 'tags') > 30 then
      raise exception 'Customer has too many tags.' using errcode = '22023';
    end if;

    for tag_json in
      select value from jsonb_array_elements(p_customer -> 'tags')
    loop
      if jsonb_typeof(tag_json) <> 'string' then
        raise exception 'Customer tag must be text.' using errcode = '22023';
      end if;

      tag_text := btrim(tag_json #>> '{}');
      if char_length(tag_text) < 1 or char_length(tag_text) > 60 then
        raise exception 'Customer tag length is invalid.'
          using errcode = '22023';
      end if;

      if not tags_value @> jsonb_build_array(tag_text) then
        tags_value := tags_value || jsonb_build_array(tag_text);
      end if;
    end loop;
  end if;

  if p_customer_id is null then
    insert into public.customers (
      business_id, full_name, email, phone, birth_date,
      notes, preferences, tags, is_active, updated_at
    )
    values (
      p_business_id, full_name_value, email_value, phone_value,
      birth_date_value, notes_value, preferences_value,
      tags_value, true, now()
    )
    returning * into saved;
  else
    select customer.*
    into saved
    from public.customers as customer
    where customer.id = p_customer_id
      and customer.business_id = p_business_id
    for update;

    if not found then
      raise exception 'Customer is not available for this business.'
        using errcode = '42501';
    end if;

    update public.customers
    set
      full_name = full_name_value,
      email = email_value,
      phone = phone_value,
      birth_date = birth_date_value,
      notes = notes_value,
      preferences = preferences_value,
      tags = tags_value,
      updated_at = now()
    where id = p_customer_id and business_id = p_business_id
    returning * into saved;
  end if;

  return jsonb_build_object(
    'id', saved.id,
    'business_id', saved.business_id,
    'full_name', saved.full_name,
    'email', saved.email,
    'phone', saved.phone,
    'birth_date', saved.birth_date,
    'notes', saved.notes,
    'preferences', saved.preferences,
    'tags', saved.tags,
    'is_active', saved.is_active,
    'created_at', saved.created_at,
    'updated_at', saved.updated_at
  );
exception
  when unique_violation then
    raise exception 'A customer with this phone or email already exists.'
      using errcode = '23505';
end;
$$;

create or replace function public.set_business_customer_active(
  p_business_id uuid,
  p_customer_id uuid,
  p_is_active boolean
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.customers%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.' using errcode = '42501';
  end if;

  if not private.has_business_role(
    p_business_id,
    array['owner', 'admin']::text[]
  ) then
    raise exception 'Insufficient business role.' using errcode = '42501';
  end if;

  update public.customers
  set is_active = p_is_active, updated_at = now()
  where id = p_customer_id and business_id = p_business_id
  returning * into saved;

  if not found then
    raise exception 'Customer is not available for this business.'
      using errcode = '42501';
  end if;

  return jsonb_build_object(
    'id', saved.id,
    'business_id', saved.business_id,
    'full_name', saved.full_name,
    'email', saved.email,
    'phone', saved.phone,
    'birth_date', saved.birth_date,
    'notes', saved.notes,
    'preferences', saved.preferences,
    'tags', saved.tags,
    'is_active', saved.is_active,
    'created_at', saved.created_at,
    'updated_at', saved.updated_at
  );
end;
$$;

revoke all on function public.save_business_customer(
  uuid, uuid, jsonb
) from public, anon, authenticated;
revoke all on function public.set_business_customer_active(
  uuid, uuid, boolean
) from public, anon, authenticated;

grant execute on function public.save_business_customer(
  uuid, uuid, jsonb
) to authenticated;
grant execute on function public.set_business_customer_active(
  uuid, uuid, boolean
) to authenticated;

revoke insert, update, delete on table public.customers
  from authenticated;

commit;
