begin;

alter table public.menu_categories
  add column if not exists is_promotion boolean not null default false;

alter table public.menu_categories
  add column if not exists fixed_price numeric(12, 2);

alter table public.menu_categories
  add column if not exists discount_percent numeric(5, 2);

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'menu_categories_fixed_price_check'
      and conrelid = 'public.menu_categories'::regclass
  ) then
    alter table public.menu_categories
      add constraint menu_categories_fixed_price_check
      check (
        fixed_price is null
        or fixed_price between 0 and 9999999999.99
      );
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'menu_categories_discount_percent_check'
      and conrelid = 'public.menu_categories'::regclass
  ) then
    alter table public.menu_categories
      add constraint menu_categories_discount_percent_check
      check (
        discount_percent is null
        or discount_percent between 0 and 100
      );
  end if;
end;
$$;

create table if not exists public.menu_category_products (
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  category_id uuid not null,
  menu_item_id uuid not null,
  quantity integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, category_id, menu_item_id),
  constraint menu_category_products_category_tenant_fk
    foreign key (business_id, category_id)
    references public.menu_categories(business_id, id)
    on delete cascade,
  constraint menu_category_products_item_tenant_fk
    foreign key (business_id, menu_item_id)
    references public.menu_items(business_id, id)
    on delete cascade,
  constraint menu_category_products_quantity_check
    check (quantity between 1 and 9999)
);

create index if not exists menu_category_products_category_idx
  on public.menu_category_products (
    business_id,
    category_id,
    menu_item_id
  );

create index if not exists menu_category_products_item_idx
  on public.menu_category_products (
    business_id,
    menu_item_id,
    category_id
  );

alter table public.menu_category_products enable row level security;
alter table public.menu_category_products force row level security;

drop policy if exists
  menu_category_products_select_active_member
on public.menu_category_products;

create policy menu_category_products_select_active_member
on public.menu_category_products
for select
to authenticated
using (
  private.has_business_role(
    business_id,
    array['owner', 'admin', 'staff']::text[]
  )
);

revoke all on table public.menu_category_products
  from public, anon, authenticated;

grant select on table public.menu_category_products
  to authenticated;

create or replace function public.save_business_menu_category_details(
  p_business_id uuid,
  p_category_id uuid,
  p_category jsonb,
  p_products jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  is_promotion_value boolean := false;
  fixed_price_value numeric(12, 2);
  discount_percent_value numeric(5, 2);
  product_count integer := 0;
  saved_base jsonb;
  saved_id uuid;
  saved public.menu_categories%rowtype;
  product_rows jsonb;
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
      'is_active',
      'is_promotion',
      'fixed_price',
      'discount_percent'
    )
  ) then
    raise exception 'Menu category payload contains unknown fields.'
      using errcode = '22023';
  end if;

  if p_category ? 'is_promotion'
    and jsonb_typeof(p_category -> 'is_promotion')
      is distinct from 'boolean' then
    raise exception 'Menu category promotion flag is invalid.'
      using errcode = '22023';
  end if;

  if p_category ? 'fixed_price'
    and jsonb_typeof(p_category -> 'fixed_price')
      not in ('number', 'null') then
    raise exception 'Menu category fixed price is invalid.'
      using errcode = '22023';
  end if;

  if p_category ? 'discount_percent'
    and jsonb_typeof(p_category -> 'discount_percent')
      not in ('number', 'null') then
    raise exception 'Menu category discount is invalid.'
      using errcode = '22023';
  end if;

  is_promotion_value := coalesce(
    (p_category ->> 'is_promotion')::boolean,
    false
  );

  if p_category -> 'fixed_price' is not null
    and jsonb_typeof(p_category -> 'fixed_price') <> 'null' then
    fixed_price_value :=
      (p_category ->> 'fixed_price')::numeric(12, 2);
  end if;

  if p_category -> 'discount_percent' is not null
    and jsonb_typeof(p_category -> 'discount_percent') <> 'null' then
    discount_percent_value :=
      (p_category ->> 'discount_percent')::numeric(5, 2);
  end if;

  if fixed_price_value is not null
    and (
      fixed_price_value < 0
      or fixed_price_value > 9999999999.99
    ) then
    raise exception 'Menu category fixed price is invalid.'
      using errcode = '22023';
  end if;

  if discount_percent_value is not null
    and (
      discount_percent_value < 0
      or discount_percent_value > 100
    ) then
    raise exception 'Menu category discount is invalid.'
      using errcode = '22023';
  end if;

  if p_products is null then
    p_products := '[]'::jsonb;
  end if;

  if jsonb_typeof(p_products) is distinct from 'array' then
    raise exception 'Menu category products must be an array.'
      using errcode = '22023';
  end if;

  product_count := jsonb_array_length(p_products);

  if product_count > 500 then
    raise exception 'Menu category has too many products.'
      using errcode = '22023';
  end if;

  if not is_promotion_value and product_count > 0 then
    raise exception 'Only promotions can persist product quantities.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_products) as product(entry)
    where jsonb_typeof(product.entry) is distinct from 'object'
  ) then
    raise exception 'Menu category product entry is invalid.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_products) as product(entry)
    cross join lateral jsonb_object_keys(product.entry) as fields(key)
    where fields.key not in ('product_id', 'quantity')
  ) then
    raise exception 'Menu category product entry contains unknown fields.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_products) as product(entry)
    where jsonb_typeof(product.entry -> 'product_id')
        is distinct from 'string'
      or jsonb_typeof(product.entry -> 'quantity')
        is distinct from 'number'
  ) then
    raise exception 'Menu category product entry is invalid.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_products) as product(entry)
    where (product.entry ->> 'product_id')
        !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or (product.entry ->> 'quantity')
        !~ '^[0-9]+$'
  ) then
    raise exception 'Menu category product entry is invalid.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_products) as product(entry)
    where (product.entry ->> 'quantity')::bigint
      not between 1 and 9999
  ) then
    raise exception 'Menu category product quantity is invalid.'
      using errcode = '22023';
  end if;

  if product_count <> (
    select count(distinct product.entry ->> 'product_id')
    from jsonb_array_elements(p_products) as product(entry)
  ) then
    raise exception 'Menu category products contain duplicates.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_products) as product(entry)
    where not exists (
      select 1
      from public.menu_items as item
      where item.id = (product.entry ->> 'product_id')::uuid
        and item.business_id = p_business_id
        and item.archived_at is null
    )
  ) then
    raise exception 'Menu category product is not available.'
      using errcode = '42501';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text, 0)
  );

  saved_base := public.save_business_menu_category(
    p_business_id,
    p_category_id,
    jsonb_build_object(
      'name', p_category -> 'name',
      'description', coalesce(
        p_category -> 'description',
        '""'::jsonb
      ),
      'is_visible', p_category -> 'is_visible',
      'is_active', p_category -> 'is_active'
    )
  );

  saved_id := (saved_base ->> 'id')::uuid;

  update public.menu_categories
  set
    is_promotion = is_promotion_value,
    fixed_price = fixed_price_value,
    discount_percent = discount_percent_value,
    updated_at = now()
  where id = saved_id
    and business_id = p_business_id
    and archived_at is null
  returning *
  into saved;

  if not found then
    raise exception 'Menu category is not available for this business.'
      using errcode = '42501';
  end if;

  delete from public.menu_category_products
  where business_id = p_business_id
    and category_id = saved_id;

  if is_promotion_value and product_count > 0 then
    insert into public.menu_category_products (
      business_id,
      category_id,
      menu_item_id,
      quantity,
      updated_at
    )
    select
      p_business_id,
      saved_id,
      (product.entry ->> 'product_id')::uuid,
      (product.entry ->> 'quantity')::integer,
      now()
    from jsonb_array_elements(p_products) as product(entry);
  end if;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'product_id', relation.menu_item_id,
        'quantity', relation.quantity
      )
      order by relation.menu_item_id
    ),
    '[]'::jsonb
  )
  into product_rows
  from public.menu_category_products as relation
  where relation.business_id = p_business_id
    and relation.category_id = saved_id;

  return to_jsonb(saved)
    || jsonb_build_object('products', product_rows);
end;
$$;

revoke all on function public.save_business_menu_category_details(
  uuid,
  uuid,
  jsonb,
  jsonb
) from public, anon, authenticated;

grant execute on function public.save_business_menu_category_details(
  uuid,
  uuid,
  jsonb,
  jsonb
) to authenticated;

revoke insert, update, delete
on table public.menu_category_products
from authenticated;

commit;
