begin;

alter table public.business_shipping_operations
  drop constraint if exists business_shipping_operations_type_check;

alter table public.business_shipping_operations
  add constraint business_shipping_operations_type_check
  check (
    operation_type in (
      'save',
      'accept',
      'cancel',
      'milestone',
      'public_create'
    )
  );

create table if not exists public.business_public_request_limits (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  action text not null,
  scope_hash text not null,
  bucket_started_at timestamptz not null,
  request_count integer not null default 1,
  updated_at timestamptz not null default now(),
  constraint business_public_request_limits_business_id_id_key
    unique (business_id, id),
  constraint business_public_request_limits_bucket_key
    unique (
      business_id,
      action,
      scope_hash,
      bucket_started_at
    ),
  constraint business_public_request_limits_action_check
    check (action in ('shipping_create', 'shipping_track')),
  constraint business_public_request_limits_scope_check
    check (char_length(btrim(scope_hash)) between 6 and 128),
  constraint business_public_request_limits_count_check
    check (request_count between 1 and 1000000)
);

create index if not exists
  business_public_request_limits_bucket_idx
on public.business_public_request_limits (
  bucket_started_at
);

alter table public.business_public_request_limits
  enable row level security;
alter table public.business_public_request_limits
  force row level security;

revoke all on table public.business_public_request_limits
  from public, anon, authenticated;
grant select, insert, update, delete
  on table public.business_public_request_limits
  to service_role;

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
    or p_action not in ('shipping_create', 'shipping_track')
    or char_length(btrim(coalesce(p_scope_hash, ''))) not between 6 and 128
    or p_bucket_seconds not between 10 and 86400
    or p_limit not between 1 and 100000 then
    raise exception 'Public request limit input is invalid.'
      using errcode = '22023';
  end if;

  bucket_value :=
    to_timestamp(
      floor(
        extract(epoch from clock_timestamp())
        / p_bucket_seconds
      )
      * p_bucket_seconds
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
    request_count =
      public.business_public_request_limits.request_count + 1,
    updated_at = now()
  where
    public.business_public_request_limits.request_count
      < p_limit
  returning request_count
  into current_count;

  if current_count is null then
    raise exception 'Public request rate limit exceeded.'
      using errcode = 'P0001';
  end if;

  delete from public.business_public_request_limits
  where bucket_started_at
    < now() - interval '24 hours';
end;
$$;

revoke all on function public.service_consume_business_public_request_limit(
  uuid,
  text,
  text,
  integer,
  integer
) from public, anon, authenticated;
grant execute on function public.service_consume_business_public_request_limit(
  uuid,
  text,
  text,
  integer,
  integer
) to service_role;

create or replace function public.service_get_public_business_ordering_snapshot(
  p_slug text
)
returns jsonb
language plpgsql
stable
security invoker
set search_path = ''
as $$
declare
  normalized_slug text :=
    lower(btrim(coalesce(p_slug, '')));
  business_row public.businesses%rowtype;
  result_value jsonb;
begin
  if char_length(normalized_slug) not between 1 and 120
    or normalized_slug !~ '^[a-z0-9][a-z0-9-]*$' then
    return null;
  end if;

  select business.*
  into business_row
  from public.businesses as business
  where lower(business.slug) = normalized_slug
    and business.status = 'active'
  limit 1;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'business',
    jsonb_build_object(
      'name', business_row.name,
      'address', business_row.address,
      'phone', business_row.phone,
      'whatsapp', business_row.whatsapp
    ),
    'categories',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', category.id,
            'name', category.name,
            'description', category.description,
            'order', category.sort_order,
            'visible', true,
            'active', true,
            'isPromotion', category.is_promotion,
            'fixedPrice', category.fixed_price,
            'discountPercent', category.discount_percent,
            'products',
            coalesce(
              (
                select jsonb_agg(
                  jsonb_build_object(
                    'productId', category_product.menu_item_id,
                    'quantity', category_product.quantity
                  )
                  order by
                    category_product.created_at,
                    category_product.menu_item_id
                )
                from public.menu_category_products
                  as category_product
                where category_product.business_id
                    = business_row.id
                  and category_product.category_id
                    = category.id
              ),
              '[]'::jsonb
            )
          )
          order by category.sort_order, category.name, category.id
        )
        from public.menu_categories as category
        where category.business_id = business_row.id
          and category.is_visible = true
          and category.is_active = true
          and category.archived_at is null
      ),
      '[]'::jsonb
    ),
    'items',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', item.id,
            'imageUrl', item.image_url,
            'name', item.name,
            'categoryId', coalesce(item.category_id::text, ''),
            'description', item.description,
            'price', item.price,
            'status', 'available',
            'visible', true,
            'featured', item.is_featured
          )
          order by item.sort_order, item.name, item.id
        )
        from public.menu_items as item
        where item.business_id = business_row.id
          and item.status = 'available'
          and item.is_visible = true
          and item.archived_at is null
          and (
            item.category_id is null
            or exists (
              select 1
              from public.menu_categories as category
              where category.business_id = item.business_id
                and category.id = item.category_id
                and category.is_visible = true
                and category.is_active = true
                and category.archived_at is null
            )
          )
      ),
      '[]'::jsonb
    )
  )
  into result_value;

  return result_value;
end;
$$;

create or replace function public.service_create_public_shipping_order(
  p_slug text,
  p_client_name text,
  p_client_phone text,
  p_order_kind text,
  p_address text,
  p_note text,
  p_preferred_payment_method text,
  p_items jsonb,
  p_request_key text,
  p_fingerprint text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_slug text :=
    lower(btrim(coalesce(p_slug, '')));
  normalized_key text :=
    btrim(coalesce(p_request_key, ''));
  normalized_fingerprint text :=
    lower(btrim(coalesce(p_fingerprint, '')));
  normalized_phone text :=
    regexp_replace(
      coalesce(p_client_phone, ''),
      '[^0-9]',
      '',
      'g'
    );
  normalized_items jsonb;
  request_value jsonb;
  existing_operation public.business_shipping_operations%rowtype;
  business_row public.businesses%rowtype;
  order_row public.business_orders%rowtype;
  shipping_row public.business_shipping_orders%rowtype;
  menu_item_row public.menu_items%rowtype;
  source_record record;
  item_count integer;
  subtotal_value numeric(12, 2) := 0;
  generated_tracking text;
  business_clock timestamp without time zone;
  result_value jsonb;
begin
  if char_length(normalized_slug) not between 1 and 120
    or normalized_slug !~ '^[a-z0-9][a-z0-9-]*$'
    or char_length(btrim(coalesce(p_client_name, ''))) not between 1 and 160
    or char_length(normalized_phone) not between 8 and 20
    or p_order_kind not in ('delivery', 'pickup')
    or char_length(coalesce(p_address, '')) > 500
    or (
      p_order_kind = 'delivery'
      and char_length(btrim(coalesce(p_address, ''))) < 1
    )
    or char_length(coalesce(p_note, '')) > 4000
    or p_preferred_payment_method not in (
      'cash',
      'card',
      'mercado_pago',
      'transfer'
    )
    or char_length(normalized_key) not between 8 and 120
    or normalized_key !~ '^web:[A-Za-z0-9_-]+$'
    or normalized_fingerprint !~ '^[a-f0-9]{64}$'
    or jsonb_typeof(p_items) <> 'array'
    or jsonb_array_length(p_items) not between 1 and 100 then
    raise exception 'Public shipping order input is invalid.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_array_elements(p_items) as item(value)
    where jsonb_typeof(item.value) <> 'object'
      or coalesce(item.value->>'menuItemId', '')
        !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$'
      or coalesce(item.value->>'quantity', '')
        !~ '^[1-9][0-9]{0,3}$'
  ) then
    raise exception 'Public shipping items are invalid.'
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

  select
    jsonb_agg(
      jsonb_build_object(
        'menuItemId', grouped.menu_item_id,
        'quantity', grouped.quantity
      )
      order by grouped.menu_item_id
    ),
    count(*)
  into
    normalized_items,
    item_count
  from (
    select
      (item.value->>'menuItemId')::uuid
        as menu_item_id,
      sum((item.value->>'quantity')::integer)::integer
        as quantity
    from jsonb_array_elements(p_items) as item(value)
    group by
      (item.value->>'menuItemId')::uuid
  ) as grouped;

  if item_count not between 1 and 100
    or exists (
      select 1
      from jsonb_to_recordset(normalized_items)
        as item("menuItemId" uuid, quantity integer)
      where item.quantity not between 1 and 9999
    ) then
    raise exception 'Public shipping item quantities are invalid.'
      using errcode = '22023';
  end if;

  request_value :=
    jsonb_build_object(
      'slug', normalized_slug,
      'client', btrim(p_client_name),
      'phone', normalized_phone,
      'deliveryType', p_order_kind,
      'address',
        case
          when p_order_kind = 'pickup' then ''
          else btrim(p_address)
        end,
      'note', coalesce(btrim(p_note), ''),
      'preferredPaymentMethod',
        p_preferred_payment_method,
      'items', normalized_items
    );

  perform pg_advisory_xact_lock(
    hashtextextended(
      business_row.id::text
      || ':public-shipping:'
      || normalized_key,
      0
    )
  );

  select operation.*
  into existing_operation
  from public.business_shipping_operations as operation
  where operation.business_id = business_row.id
    and operation.operation_key = normalized_key
  limit 1;

  if found then
    if existing_operation.operation_type <> 'public_create'
      or existing_operation.request_payload <> request_value then
      raise exception 'Public shipping operation key conflict.'
        using errcode = '23505';
    end if;

    return existing_operation.result_snapshot;
  end if;

  perform public.service_consume_business_public_request_limit(
    business_row.id,
    'shipping_create',
    normalized_fingerprint,
    600,
    5
  );

  perform public.service_consume_business_public_request_limit(
    business_row.id,
    'shipping_create',
    'global',
    600,
    120
  );

  for source_record in
    select *
    from jsonb_to_recordset(normalized_items)
      as item("menuItemId" uuid, quantity integer)
  loop
    select menu_item.*
    into menu_item_row
    from public.menu_items as menu_item
    where menu_item.business_id = business_row.id
      and menu_item.id = source_record."menuItemId"
      and menu_item.status = 'available'
      and menu_item.is_visible = true
      and menu_item.archived_at is null
      and (
        menu_item.category_id is null
        or exists (
          select 1
          from public.menu_categories as category
          where category.business_id = menu_item.business_id
            and category.id = menu_item.category_id
            and category.is_visible = true
            and category.is_active = true
            and category.archived_at is null
        )
      )
    limit 1;

    if not found then
      raise exception 'One or more menu items are not publicly available.'
        using errcode = '22023';
    end if;

    subtotal_value :=
      subtotal_value
      + (
        menu_item_row.price
        * source_record.quantity
      );
  end loop;

  if subtotal_value <= 0
    or subtotal_value > 9999999999.99 then
    raise exception 'Public shipping subtotal is invalid.'
      using errcode = '22023';
  end if;

  business_clock :=
    timezone(
      'America/Argentina/Buenos_Aires',
      clock_timestamp()
    );

  insert into public.business_orders (
    business_id,
    order_kind,
    reservation_id,
    status,
    revision,
    subtotal,
    created_by,
    updated_by
  )
  values (
    business_row.id,
    p_order_kind,
    null,
    'open',
    1,
    subtotal_value,
    null,
    null
  )
  returning *
  into order_row;

  for source_record in
    select *
    from jsonb_to_recordset(normalized_items)
      as item("menuItemId" uuid, quantity integer)
  loop
    select menu_item.*
    into strict menu_item_row
    from public.menu_items as menu_item
    where menu_item.business_id = business_row.id
      and menu_item.id = source_record."menuItemId"
      and menu_item.status = 'available'
      and menu_item.is_visible = true
      and menu_item.archived_at is null;

    insert into public.business_order_items (
      business_id,
      order_id,
      order_kind,
      menu_item_id,
      name_snapshot,
      unit_price_snapshot,
      quantity
    )
    values (
      business_row.id,
      order_row.id,
      p_order_kind,
      menu_item_row.id,
      menu_item_row.name,
      menu_item_row.price,
      source_record.quantity
    );
  end loop;

  generated_tracking :=
    'PED-'
    || upper(
      substr(
        replace(
          gen_random_uuid()::text,
          '-',
          ''
        ),
        1,
        16
      )
    );

  insert into public.business_shipping_orders (
    business_id,
    order_id,
    order_kind,
    business_date,
    scheduled_time,
    client_name,
    client_phone,
    address_snapshot,
    note,
    source,
    needs_acceptance,
    tracking_code,
    preferred_payment_method,
    shipping_status,
    eta_minutes,
    accepted_at,
    preparing_at,
    created_by,
    updated_by
  )
  values (
    business_row.id,
    order_row.id,
    p_order_kind,
    business_clock::date,
    business_clock::time(0),
    btrim(p_client_name),
    normalized_phone,
    case
      when p_order_kind = 'pickup' then ''
      else btrim(p_address)
    end,
    coalesce(btrim(p_note), ''),
    'web',
    true,
    generated_tracking,
    p_preferred_payment_method,
    'confirmed',
    null,
    null,
    null,
    null,
    null
  )
  returning *
  into shipping_row;

  select jsonb_build_object(
    'trackingId', shipping_row.tracking_code,
    'deliveryType', shipping_row.order_kind,
    'status', shipping_row.shipping_status,
    'needsAcceptance', shipping_row.needs_acceptance,
    'total', order_row.subtotal,
    'createdAt', shipping_row.created_at,
    'items',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'id', item.menu_item_id,
            'name', item.name_snapshot,
            'price', item.unit_price_snapshot,
            'quantity', item.quantity
          )
          order by item.name_snapshot, item.menu_item_id
        )
        from public.business_order_items as item
        where item.business_id = business_row.id
          and item.order_id = order_row.id
      ),
      '[]'::jsonb
    )
  )
  into result_value;

  insert into public.business_shipping_operations (
    business_id,
    operation_key,
    shipping_id,
    order_id,
    operation_type,
    request_payload,
    result_snapshot,
    created_by
  )
  values (
    business_row.id,
    normalized_key,
    shipping_row.id,
    order_row.id,
    'public_create',
    request_value,
    result_value,
    null
  );

  return result_value;
end;
$$;

create or replace function public.service_get_public_shipping_tracking(
  p_slug text,
  p_tracking_code text,
  p_fingerprint text
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  normalized_slug text :=
    lower(btrim(coalesce(p_slug, '')));
  normalized_tracking text :=
    upper(btrim(coalesce(p_tracking_code, '')));
  normalized_fingerprint text :=
    lower(btrim(coalesce(p_fingerprint, '')));
  business_row public.businesses%rowtype;
  shipping_row public.business_shipping_orders%rowtype;
  order_row public.business_orders%rowtype;
  closed_at timestamptz;
  result_value jsonb;
begin
  if char_length(normalized_slug) not between 1 and 120
    or normalized_slug !~ '^[a-z0-9][a-z0-9-]*$'
    or normalized_tracking !~ '^PED-[A-Z0-9]{10,32}$'
    or normalized_fingerprint !~ '^[a-f0-9]{64}$' then
    return null;
  end if;

  select business.*
  into business_row
  from public.businesses as business
  where lower(business.slug) = normalized_slug
    and business.status = 'active'
  limit 1;

  if not found then
    return null;
  end if;

  perform public.service_consume_business_public_request_limit(
    business_row.id,
    'shipping_track',
    normalized_fingerprint,
    60,
    120
  );

  perform public.service_consume_business_public_request_limit(
    business_row.id,
    'shipping_track',
    'global',
    60,
    3000
  );

  select shipping.*
  into shipping_row
  from public.business_shipping_orders as shipping
  where shipping.business_id = business_row.id
    and shipping.tracking_code = normalized_tracking
  limit 1;

  if not found then
    return null;
  end if;

  if shipping_row.shipping_status = 'completed' then
    closed_at := shipping_row.completed_at;
  elsif shipping_row.shipping_status = 'cancelled' then
    closed_at := shipping_row.cancelled_at;
  else
    closed_at := null;
  end if;

  if closed_at is not null
    and closed_at
      < now() - interval '1 minute' then
    return null;
  end if;

  select orders.*
  into order_row
  from public.business_orders as orders
  where orders.business_id = business_row.id
    and orders.id = shipping_row.order_id
  limit 1;

  if not found then
    return null;
  end if;

  select jsonb_build_object(
    'businessName', business_row.name,
    'trackingId', shipping_row.tracking_code,
    'deliveryType', shipping_row.order_kind,
    'status', shipping_row.shipping_status,
    'needsAcceptance', shipping_row.needs_acceptance,
    'etaMinutes', shipping_row.eta_minutes,
    'createdAt', shipping_row.created_at,
    'acceptedAt', shipping_row.accepted_at,
    'preparingAt', shipping_row.preparing_at,
    'readyAt', shipping_row.ready_at,
    'onTheWayAt', shipping_row.on_the_way_at,
    'completedAt', shipping_row.completed_at,
    'cancelledAt', shipping_row.cancelled_at,
    'total', order_row.subtotal,
    'items',
    coalesce(
      (
        select jsonb_agg(
          jsonb_build_object(
            'name', item.name_snapshot,
            'quantity', item.quantity
          )
          order by item.name_snapshot, item.menu_item_id
        )
        from public.business_order_items as item
        where item.business_id = business_row.id
          and item.order_id = order_row.id
      ),
      '[]'::jsonb
    )
  )
  into result_value;

  return result_value;
end;
$$;

revoke all on function public.service_get_public_business_ordering_snapshot(
  text
) from public, anon, authenticated;
revoke all on function public.service_create_public_shipping_order(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  text,
  text
) from public, anon, authenticated;
revoke all on function public.service_get_public_shipping_tracking(
  text,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.service_get_public_business_ordering_snapshot(
  text
) to service_role;
grant execute on function public.service_create_public_shipping_order(
  text,
  text,
  text,
  text,
  text,
  text,
  text,
  jsonb,
  text,
  text
) to service_role;
grant execute on function public.service_get_public_shipping_tracking(
  text,
  text,
  text
) to service_role;

commit;
