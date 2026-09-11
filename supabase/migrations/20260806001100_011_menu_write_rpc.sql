begin;

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  name text not null,
  description text not null default '',
  sort_order integer not null default 0,
  is_visible boolean not null default true,
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint menu_categories_name_length_check
    check (char_length(btrim(name)) between 1 and 120),
  constraint menu_categories_description_length_check
    check (char_length(description) <= 2000),
  constraint menu_categories_sort_order_check
    check (sort_order between 0 and 1000000)
);

create unique index if not exists
  menu_categories_business_normalized_name_key
on public.menu_categories (
  business_id,
  lower(btrim(name))
)
where archived_at is null;

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  category_id uuid,
  name text not null,
  description text not null default '',
  price numeric(12, 2) not null default 0,
  status text not null default 'available'
    check (status in ('available', 'paused')),
  is_visible boolean not null default true,
  is_featured boolean not null default false,
  image_url text not null default '',
  sort_order integer not null default 0,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, id),
  constraint menu_items_category_tenant_fk
    foreign key (business_id, category_id)
    references public.menu_categories(business_id, id)
    on delete restrict,
  constraint menu_items_name_length_check
    check (char_length(btrim(name)) between 1 and 160),
  constraint menu_items_description_length_check
    check (char_length(description) <= 4000),
  constraint menu_items_price_check
    check (price between 0 and 9999999999.99),
  constraint menu_items_image_url_length_check
    check (char_length(image_url) <= 2048),
  constraint menu_items_sort_order_check
    check (sort_order between 0 and 1000000)
);

create unique index if not exists
  menu_items_business_normalized_name_key
on public.menu_items (
  business_id,
  lower(btrim(name))
)
where archived_at is null;

create index if not exists menu_items_business_category_idx
  on public.menu_items (
    business_id,
    category_id,
    sort_order
  )
  where archived_at is null;

alter table public.menu_categories enable row level security;
alter table public.menu_categories force row level security;
alter table public.menu_items enable row level security;
alter table public.menu_items force row level security;

drop policy if exists
  menu_categories_select_active_member
on public.menu_categories;

create policy menu_categories_select_active_member
on public.menu_categories
for select
to authenticated
using (
  private.has_business_role(
    business_id,
    array['owner', 'admin', 'staff']::text[]
  )
);

drop policy if exists
  menu_items_select_active_member
on public.menu_items;

create policy menu_items_select_active_member
on public.menu_items
for select
to authenticated
using (
  private.has_business_role(
    business_id,
    array['owner', 'admin', 'staff']::text[]
  )
);

revoke all on table public.menu_categories
  from public, anon, authenticated;
revoke all on table public.menu_items
  from public, anon, authenticated;

grant select on table public.menu_categories
  to authenticated;
grant select on table public.menu_items
  to authenticated;

create or replace function public.save_business_menu_category(
  p_business_id uuid,
  p_category_id uuid,
  p_category jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  name_value text;
  description_value text;
  visible_value boolean;
  active_value boolean;
  order_value integer;
  saved public.menu_categories%rowtype;
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

  if jsonb_typeof(p_category) is distinct from 'object' then
    raise exception 'Menu category payload must be an object.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_category) as fields(key)
    where fields.key not in (
      'name',
      'description',
      'is_visible',
      'is_active'
    )
  ) then
    raise exception 'Menu category payload contains unknown fields.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_category -> 'name')
      is distinct from 'string'
    or jsonb_typeof(p_category -> 'is_visible')
      is distinct from 'boolean'
    or jsonb_typeof(p_category -> 'is_active')
      is distinct from 'boolean' then
    raise exception 'Menu category required fields are invalid.'
      using errcode = '22023';
  end if;

  if p_category ? 'description'
    and jsonb_typeof(p_category -> 'description')
      not in ('string', 'null') then
    raise exception 'Menu category description is invalid.'
      using errcode = '22023';
  end if;

  name_value := btrim(p_category ->> 'name');
  description_value := coalesce(
    nullif(btrim(p_category ->> 'description'), ''),
    ''
  );
  visible_value := (p_category ->> 'is_visible')::boolean;
  active_value := (p_category ->> 'is_active')::boolean;

  if char_length(name_value) < 1
    or char_length(name_value) > 120
    or char_length(description_value) > 2000 then
    raise exception 'Menu category values are invalid.'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text, 0)
  );

  if p_category_id is null then
    select coalesce(max(category.sort_order), -1) + 1
    into order_value
    from public.menu_categories as category
    where category.business_id = p_business_id
      and category.archived_at is null;

    insert into public.menu_categories (
      business_id,
      name,
      description,
      sort_order,
      is_visible,
      is_active,
      updated_at
    )
    values (
      p_business_id,
      name_value,
      description_value,
      order_value,
      visible_value,
      active_value,
      now()
    )
    returning *
    into saved;
  else
    select category.*
    into saved
    from public.menu_categories as category
    where category.id = p_category_id
      and category.business_id = p_business_id
      and category.archived_at is null
    for update;

    if not found then
      raise exception 'Menu category is not available for this business.'
        using errcode = '42501';
    end if;

    update public.menu_categories
    set
      name = name_value,
      description = description_value,
      is_visible = visible_value,
      is_active = active_value,
      updated_at = now()
    where id = p_category_id
      and business_id = p_business_id
    returning *
    into saved;
  end if;

  return to_jsonb(saved);
exception
  when unique_violation then
    raise exception 'A menu category with this name already exists.'
      using errcode = '23505';
end;
$$;

create or replace function public.archive_business_menu_category(
  p_business_id uuid,
  p_category_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.menu_categories%rowtype;
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

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text, 0)
  );

  update public.menu_categories
  set
    is_visible = false,
    is_active = false,
    archived_at = coalesce(archived_at, now()),
    updated_at = now()
  where id = p_category_id
    and business_id = p_business_id
    and archived_at is null
  returning *
  into saved;

  if not found then
    raise exception 'Menu category is not available for this business.'
      using errcode = '42501';
  end if;

  update public.menu_items
  set
    category_id = null,
    updated_at = now()
  where business_id = p_business_id
    and category_id = p_category_id
    and archived_at is null;

  return to_jsonb(saved);
end;
$$;

create or replace function public.reorder_business_menu_categories(
  p_business_id uuid,
  p_category_ids uuid[]
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  active_count integer;
  requested_count integer;
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

  if p_category_ids is null then
    raise exception 'Menu category order is required.'
      using errcode = '22023';
  end if;

  requested_count := cardinality(p_category_ids);

  if requested_count > 500
    or requested_count <> (
      select count(distinct category_id)
      from unnest(p_category_ids) as ids(category_id)
    ) then
    raise exception 'Menu category order is invalid.'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text, 0)
  );

  select count(*)
  into active_count
  from public.menu_categories as category
  where category.business_id = p_business_id
    and category.archived_at is null;

  if active_count <> requested_count
    or exists (
      select 1
      from unnest(p_category_ids) as ids(category_id)
      where not exists (
        select 1
        from public.menu_categories as category
        where category.id = ids.category_id
          and category.business_id = p_business_id
          and category.archived_at is null
      )
    ) then
    raise exception 'Menu category order does not match this business.'
      using errcode = '42501';
  end if;

  update public.menu_categories as category
  set
    sort_order = ordered.ordinality - 1,
    updated_at = now()
  from unnest(p_category_ids)
    with ordinality as ordered(category_id, ordinality)
  where category.id = ordered.category_id
    and category.business_id = p_business_id
    and category.archived_at is null;

  return coalesce(
    (
      select jsonb_agg(to_jsonb(category)
        order by category.sort_order, category.name)
      from public.menu_categories as category
      where category.business_id = p_business_id
        and category.archived_at is null
    ),
    '[]'::jsonb
  );
end;
$$;

create or replace function public.save_business_menu_item(
  p_business_id uuid,
  p_menu_item_id uuid,
  p_menu_item jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  category_id_value uuid;
  name_value text;
  description_value text;
  price_value numeric(12, 2);
  status_value text;
  visible_value boolean;
  featured_value boolean;
  image_url_value text;
  order_value integer;
  saved public.menu_items%rowtype;
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

  if jsonb_typeof(p_menu_item) is distinct from 'object' then
    raise exception 'Menu item payload must be an object.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_menu_item) as fields(key)
    where fields.key not in (
      'category_id',
      'name',
      'description',
      'price',
      'status',
      'is_visible',
      'is_featured',
      'image_url'
    )
  ) then
    raise exception 'Menu item payload contains unknown fields.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_menu_item -> 'name')
      is distinct from 'string'
    or jsonb_typeof(p_menu_item -> 'price')
      is distinct from 'number'
    or jsonb_typeof(p_menu_item -> 'status')
      is distinct from 'string'
    or jsonb_typeof(p_menu_item -> 'is_visible')
      is distinct from 'boolean'
    or jsonb_typeof(p_menu_item -> 'is_featured')
      is distinct from 'boolean' then
    raise exception 'Menu item required fields are invalid.'
      using errcode = '22023';
  end if;

  if p_menu_item ? 'category_id'
    and jsonb_typeof(p_menu_item -> 'category_id')
      not in ('string', 'null') then
    raise exception 'Menu item category is invalid.'
      using errcode = '22023';
  end if;

  if p_menu_item ? 'description'
    and jsonb_typeof(p_menu_item -> 'description')
      not in ('string', 'null') then
    raise exception 'Menu item description is invalid.'
      using errcode = '22023';
  end if;

  if p_menu_item ? 'image_url'
    and jsonb_typeof(p_menu_item -> 'image_url')
      not in ('string', 'null') then
    raise exception 'Menu item image URL is invalid.'
      using errcode = '22023';
  end if;

  if nullif(p_menu_item ->> 'category_id', '') is not null then
    if (p_menu_item ->> 'category_id')
      !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception 'Menu item category is invalid.'
        using errcode = '22023';
    end if;

    category_id_value :=
      (p_menu_item ->> 'category_id')::uuid;

    if not exists (
      select 1
      from public.menu_categories as category
      where category.id = category_id_value
        and category.business_id = p_business_id
        and category.archived_at is null
        and category.is_active
    ) then
      raise exception 'Menu item category is not available.'
        using errcode = '23503';
    end if;
  else
    category_id_value := null;
  end if;

  name_value := btrim(p_menu_item ->> 'name');
  description_value := coalesce(
    nullif(btrim(p_menu_item ->> 'description'), ''),
    ''
  );
  price_value := round(
    (p_menu_item ->> 'price')::numeric,
    2
  );
  status_value := p_menu_item ->> 'status';
  visible_value := (p_menu_item ->> 'is_visible')::boolean;
  featured_value := (p_menu_item ->> 'is_featured')::boolean;
  image_url_value := coalesce(
    nullif(btrim(p_menu_item ->> 'image_url'), ''),
    ''
  );

  if char_length(name_value) < 1
    or char_length(name_value) > 160
    or char_length(description_value) > 4000
    or price_value < 0
    or price_value > 9999999999.99
    or status_value not in ('available', 'paused')
    or char_length(image_url_value) > 2048 then
    raise exception 'Menu item values are invalid.'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text, 0)
  );

  if p_menu_item_id is null then
    select coalesce(max(item.sort_order), -1) + 1
    into order_value
    from public.menu_items as item
    where item.business_id = p_business_id
      and item.archived_at is null;

    insert into public.menu_items (
      business_id,
      category_id,
      name,
      description,
      price,
      status,
      is_visible,
      is_featured,
      image_url,
      sort_order,
      updated_at
    )
    values (
      p_business_id,
      category_id_value,
      name_value,
      description_value,
      price_value,
      status_value,
      visible_value,
      featured_value,
      image_url_value,
      order_value,
      now()
    )
    returning *
    into saved;
  else
    select item.*
    into saved
    from public.menu_items as item
    where item.id = p_menu_item_id
      and item.business_id = p_business_id
      and item.archived_at is null
    for update;

    if not found then
      raise exception 'Menu item is not available for this business.'
        using errcode = '42501';
    end if;

    update public.menu_items
    set
      category_id = category_id_value,
      name = name_value,
      description = description_value,
      price = price_value,
      status = status_value,
      is_visible = visible_value,
      is_featured = featured_value,
      image_url = image_url_value,
      updated_at = now()
    where id = p_menu_item_id
      and business_id = p_business_id
    returning *
    into saved;
  end if;

  return to_jsonb(saved);
exception
  when unique_violation then
    raise exception 'A menu item with this name already exists.'
      using errcode = '23505';
end;
$$;

create or replace function public.archive_business_menu_item(
  p_business_id uuid,
  p_menu_item_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  saved public.menu_items%rowtype;
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

  update public.menu_items
  set
    status = 'paused',
    is_visible = false,
    archived_at = coalesce(archived_at, now()),
    updated_at = now()
  where id = p_menu_item_id
    and business_id = p_business_id
    and archived_at is null
  returning *
  into saved;

  if not found then
    raise exception 'Menu item is not available for this business.'
      using errcode = '42501';
  end if;

  return to_jsonb(saved);
end;
$$;

create or replace function public.save_business_menu_item_quick_changes(
  p_business_id uuid,
  p_items jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  entry jsonb;
  item_id_value uuid;
  category_id_value uuid;
  price_value numeric(12, 2);
  visible_value boolean;
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

  if jsonb_typeof(p_items) is distinct from 'array'
    or jsonb_array_length(p_items) > 500 then
    raise exception 'Menu quick changes payload is invalid.'
      using errcode = '22023';
  end if;

  if (
    select count(*)
    from jsonb_array_elements(p_items)
  ) <> (
    select count(distinct item ->> 'id')
    from jsonb_array_elements(p_items)
      as items(item)
  ) then
    raise exception 'Menu quick changes contain duplicates.'
      using errcode = '22023';
  end if;

  for entry in
    select item
    from jsonb_array_elements(p_items)
      as items(item)
  loop
    if jsonb_typeof(entry) <> 'object'
      or exists (
        select 1
        from jsonb_object_keys(entry) as fields(key)
        where fields.key not in (
          'id',
          'category_id',
          'price',
          'is_visible'
        )
      )
      or jsonb_typeof(entry -> 'id')
        is distinct from 'string'
      or jsonb_typeof(entry -> 'category_id')
        not in ('string', 'null')
      or jsonb_typeof(entry -> 'price')
        is distinct from 'number'
      or jsonb_typeof(entry -> 'is_visible')
        is distinct from 'boolean'
      or (entry ->> 'id')
        !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception 'Menu quick change entry is invalid.'
        using errcode = '22023';
    end if;

    item_id_value := (entry ->> 'id')::uuid;
    price_value := round((entry ->> 'price')::numeric, 2);
    visible_value := (entry ->> 'is_visible')::boolean;

    if price_value < 0
      or price_value > 9999999999.99
      or not exists (
        select 1
        from public.menu_items as item
        where item.id = item_id_value
          and item.business_id = p_business_id
          and item.archived_at is null
      ) then
      raise exception 'Menu quick change item is invalid.'
        using errcode = '42501';
    end if;

    if nullif(entry ->> 'category_id', '') is not null then
      if (entry ->> 'category_id')
        !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
        raise exception 'Menu quick change category is invalid.'
          using errcode = '22023';
      end if;

      category_id_value := (entry ->> 'category_id')::uuid;

      if not exists (
        select 1
        from public.menu_categories as category
        where category.id = category_id_value
          and category.business_id = p_business_id
          and category.archived_at is null
          and category.is_active
      ) then
        raise exception 'Menu quick change category is not available.'
          using errcode = '23503';
      end if;
    else
      category_id_value := null;
    end if;
  end loop;

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text, 0)
  );

  for entry in
    select item
    from jsonb_array_elements(p_items)
      as items(item)
  loop
    item_id_value := (entry ->> 'id')::uuid;
    price_value := round((entry ->> 'price')::numeric, 2);
    visible_value := (entry ->> 'is_visible')::boolean;

    if nullif(entry ->> 'category_id', '') is not null then
      category_id_value := (entry ->> 'category_id')::uuid;
    else
      category_id_value := null;
    end if;

    update public.menu_items
    set
      category_id = category_id_value,
      price = price_value,
      is_visible = visible_value,
      updated_at = now()
    where id = item_id_value
      and business_id = p_business_id
      and archived_at is null;
  end loop;

  return coalesce(
    (
      select jsonb_agg(to_jsonb(item)
        order by item.sort_order, item.name)
      from public.menu_items as item
      where item.business_id = p_business_id
        and item.archived_at is null
    ),
    '[]'::jsonb
  );
end;
$$;

revoke all on function public.save_business_menu_category(
  uuid,
  uuid,
  jsonb
) from public, anon, authenticated;
revoke all on function public.archive_business_menu_category(
  uuid,
  uuid
) from public, anon, authenticated;
revoke all on function public.reorder_business_menu_categories(
  uuid,
  uuid[]
) from public, anon, authenticated;
revoke all on function public.save_business_menu_item(
  uuid,
  uuid,
  jsonb
) from public, anon, authenticated;
revoke all on function public.archive_business_menu_item(
  uuid,
  uuid
) from public, anon, authenticated;
revoke all on function public.save_business_menu_item_quick_changes(
  uuid,
  jsonb
) from public, anon, authenticated;

grant execute on function public.save_business_menu_category(
  uuid,
  uuid,
  jsonb
) to authenticated;
grant execute on function public.archive_business_menu_category(
  uuid,
  uuid
) to authenticated;
grant execute on function public.reorder_business_menu_categories(
  uuid,
  uuid[]
) to authenticated;
grant execute on function public.save_business_menu_item(
  uuid,
  uuid,
  jsonb
) to authenticated;
grant execute on function public.archive_business_menu_item(
  uuid,
  uuid
) to authenticated;
grant execute on function public.save_business_menu_item_quick_changes(
  uuid,
  jsonb
) to authenticated;

revoke insert, update, delete
on table public.menu_categories
from authenticated;
revoke insert, update, delete
on table public.menu_items
from authenticated;

commit;
