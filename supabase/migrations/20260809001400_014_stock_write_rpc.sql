begin;

create or replace function private.current_user_has_module_access(
  target_business_id uuid,
  target_module_key text,
  minimum_access text
)
returns boolean
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  actor_role text;
  actor_staff_role_id uuid;
  required_weight integer;
  actual_weight integer := 0;
begin
  if (select auth.uid()) is null then
    return false;
  end if;

  required_weight := case minimum_access
    when 'none' then 0
    when 'view' then 1
    when 'manage' then 2
    when 'full' then 3
    else -1
  end;

  if required_weight < 0
    or target_module_key not in (
      'home',
      'reservations',
      'floor_plan',
      'customers',
      'shipping',
      'kitchen',
      'menu',
      'recipes',
      'products',
      'stock',
      'stock_history',
      'cash',
      'expenses',
      'history',
      'reports',
      'web'
    ) then
    return false;
  end if;

  select
    member.role,
    member.staff_role_id
  into
    actor_role,
    actor_staff_role_id
  from public.business_members as member
  where member.business_id = target_business_id
    and member.user_id = (select auth.uid())
    and member.status = 'active'
  limit 1;

  if not found then
    return false;
  end if;

  if actor_role in ('owner', 'admin') then
    return true;
  end if;

  if actor_role <> 'staff'
    or actor_staff_role_id is null then
    return false;
  end if;

  select case permission.access_level
    when 'none' then 0
    when 'view' then 1
    when 'manage' then 2
    when 'full' then 3
    else 0
  end
  into actual_weight
  from public.staff_role_permissions as permission
  where permission.business_id = target_business_id
    and permission.role_id = actor_staff_role_id
    and permission.module_key = target_module_key
  limit 1;

  return coalesce(actual_weight, 0) >= required_weight;
end;
$$;

revoke all on function private.current_user_has_module_access(
  uuid,
  text,
  text
) from public, anon, authenticated;

grant execute on function private.current_user_has_module_access(
  uuid,
  text,
  text
) to authenticated;

create table if not exists public.stock_products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  name text not null,
  category text not null default 'Almacén',
  supplier text not null default '',
  unit text not null default 'unidad',
  unit_cost numeric(12, 2) not null default 0,
  alert_below numeric(14, 3) not null default 0,
  note text not null default '',
  is_active boolean not null default true,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint stock_products_business_id_id_key
    unique (business_id, id),
  constraint stock_products_name_length_check
    check (char_length(btrim(name)) between 1 and 160),
  constraint stock_products_category_length_check
    check (char_length(btrim(category)) between 1 and 120),
  constraint stock_products_supplier_length_check
    check (char_length(supplier) <= 160),
  constraint stock_products_unit_check
    check (
      unit in (
        'kg',
        'g',
        'l',
        'ml',
        'unidad',
        'botella',
        'caja',
        'paquete',
        'bolsa',
        'lata'
      )
    ),
  constraint stock_products_unit_cost_check
    check (unit_cost between 0 and 9999999999.99),
  constraint stock_products_alert_below_check
    check (alert_below between 0 and 99999999999.999),
  constraint stock_products_note_length_check
    check (char_length(note) <= 4000)
);

create unique index if not exists
  stock_products_business_normalized_name_key
on public.stock_products (
  business_id,
  lower(btrim(name))
)
where archived_at is null;

create index if not exists stock_products_business_active_idx
  on public.stock_products (
    business_id,
    is_active,
    name
  )
  where archived_at is null;

create table if not exists public.stock_movements (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  product_id uuid not null,
  movement_type text not null,
  origin text not null,
  quantity_delta numeric(14, 3) not null,
  product_name_snapshot text not null,
  unit_snapshot text not null,
  unit_cost_snapshot numeric(12, 2) not null default 0,
  operation_key text,
  reference_id text,
  label text not null,
  detail text not null default '',
  created_by uuid
    references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint stock_movements_product_tenant_fk
    foreign key (business_id, product_id)
    references public.stock_products(business_id, id)
    on delete restrict,
  constraint stock_movements_type_check
    check (
      movement_type in (
        'opening',
        'replenishment',
        'consumption',
        'return',
        'adjustment'
      )
    ),
  constraint stock_movements_origin_check
    check (
      origin in (
        'manual',
        'reservation',
        'shipping',
        'recipe',
        'import'
      )
    ),
  constraint stock_movements_quantity_check
    check (
      quantity_delta <> 0
      and abs(quantity_delta) <= 99999999999.999
    ),
  constraint stock_movements_direction_check
    check (
      (
        movement_type in ('opening', 'replenishment', 'return')
        and quantity_delta > 0
      )
      or (
        movement_type = 'consumption'
        and quantity_delta < 0
      )
      or movement_type = 'adjustment'
    ),
  constraint stock_movements_product_name_length_check
    check (
      char_length(btrim(product_name_snapshot))
      between 1 and 160
    ),
  constraint stock_movements_unit_check
    check (
      unit_snapshot in (
        'kg',
        'g',
        'l',
        'ml',
        'unidad',
        'botella',
        'caja',
        'paquete',
        'bolsa',
        'lata'
      )
    ),
  constraint stock_movements_unit_cost_check
    check (
      unit_cost_snapshot between 0 and 9999999999.99
    ),
  constraint stock_movements_operation_key_length_check
    check (
      operation_key is null
      or char_length(operation_key) between 1 and 160
    ),
  constraint stock_movements_reference_id_length_check
    check (
      reference_id is null
      or char_length(reference_id) <= 160
    ),
  constraint stock_movements_label_length_check
    check (char_length(btrim(label)) between 1 and 160),
  constraint stock_movements_detail_length_check
    check (char_length(detail) <= 2000)
);

create unique index if not exists stock_movements_operation_key_key
  on public.stock_movements (
    business_id,
    operation_key
  )
  where operation_key is not null;

create unique index if not exists stock_movements_opening_product_key
  on public.stock_movements (
    business_id,
    product_id
  )
  where movement_type = 'opening';

create index if not exists stock_movements_business_product_created_idx
  on public.stock_movements (
    business_id,
    product_id,
    created_at desc
  );

create index if not exists stock_movements_business_created_idx
  on public.stock_movements (
    business_id,
    created_at desc
  );

drop trigger if exists stock_products_set_updated_at
  on public.stock_products;

create trigger stock_products_set_updated_at
before update on public.stock_products
for each row
execute function private.tango_set_updated_at();

alter table public.stock_products enable row level security;
alter table public.stock_products force row level security;

alter table public.stock_movements enable row level security;
alter table public.stock_movements force row level security;

drop policy if exists stock_products_select_module_member
  on public.stock_products;

create policy stock_products_select_module_member
on public.stock_products
for select
to authenticated
using (
  archived_at is null
  and (
    select private.current_user_has_module_access(
      business_id,
      'stock',
      'view'
    )
  )
);

drop policy if exists stock_movements_select_module_member
  on public.stock_movements;

create policy stock_movements_select_module_member
on public.stock_movements
for select
to authenticated
using (
  (select private.current_user_has_module_access(
    business_id,
    'stock',
    'view'
  ))
);

revoke all on table public.stock_products
  from public, anon, authenticated;
revoke all on table public.stock_movements
  from public, anon, authenticated;

grant select on table public.stock_products
  to authenticated;
grant select on table public.stock_movements
  to authenticated;

create or replace function public.save_business_stock_product(
  p_business_id uuid,
  p_product_id uuid,
  p_product jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  name_value text;
  category_value text;
  supplier_value text;
  unit_value text;
  unit_cost_value numeric(12, 2);
  alert_below_value numeric(14, 3);
  note_value text;
  active_value boolean;
  saved public.stock_products%rowtype;
begin
  if actor_user_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not (
    select private.current_user_has_module_access(
      p_business_id,
      'stock',
      'manage'
    )
  ) then
    raise exception 'Insufficient stock permission.'
      using errcode = '42501';
  end if;

  if jsonb_typeof(p_product) is distinct from 'object' then
    raise exception 'Stock product payload must be an object.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_product) as fields(key)
    where fields.key not in (
      'name',
      'category',
      'supplier',
      'unit',
      'unit_cost',
      'alert_below',
      'note',
      'is_active'
    )
  ) then
    raise exception 'Stock product payload contains unknown fields.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_product -> 'name')
      is distinct from 'string'
    or jsonb_typeof(p_product -> 'category')
      is distinct from 'string'
    or jsonb_typeof(p_product -> 'unit')
      is distinct from 'string'
    or jsonb_typeof(p_product -> 'unit_cost')
      not in ('number', 'string')
    or jsonb_typeof(p_product -> 'alert_below')
      not in ('number', 'string')
    or jsonb_typeof(p_product -> 'is_active')
      is distinct from 'boolean' then
    raise exception 'Stock product required fields are invalid.'
      using errcode = '22023';
  end if;

  if p_product ? 'supplier'
    and jsonb_typeof(p_product -> 'supplier')
      not in ('string', 'null') then
    raise exception 'Stock product supplier is invalid.'
      using errcode = '22023';
  end if;

  if p_product ? 'note'
    and jsonb_typeof(p_product -> 'note')
      not in ('string', 'null') then
    raise exception 'Stock product note is invalid.'
      using errcode = '22023';
  end if;

  name_value := btrim(p_product ->> 'name');
  category_value := btrim(p_product ->> 'category');
  supplier_value := coalesce(
    nullif(btrim(p_product ->> 'supplier'), ''),
    ''
  );
  unit_value := btrim(p_product ->> 'unit');
  note_value := coalesce(
    nullif(btrim(p_product ->> 'note'), ''),
    ''
  );
  active_value := (p_product ->> 'is_active')::boolean;

  begin
    unit_cost_value := (p_product ->> 'unit_cost')::numeric;
    alert_below_value := (p_product ->> 'alert_below')::numeric;
  exception
    when invalid_text_representation
      or numeric_value_out_of_range then
      raise exception 'Stock product numeric values are invalid.'
        using errcode = '22023';
  end;

  if char_length(name_value) < 1
    or char_length(name_value) > 160
    or char_length(category_value) < 1
    or char_length(category_value) > 120
    or char_length(supplier_value) > 160
    or char_length(note_value) > 4000
    or unit_value not in (
      'kg',
      'g',
      'l',
      'ml',
      'unidad',
      'botella',
      'caja',
      'paquete',
      'bolsa',
      'lata'
    )
    or unit_cost_value < 0
    or unit_cost_value > 9999999999.99
    or alert_below_value < 0
    or alert_below_value > 99999999999.999 then
    raise exception 'Stock product values are invalid.'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text, 0)
  );

  if p_product_id is null then
    insert into public.stock_products (
      business_id,
      name,
      category,
      supplier,
      unit,
      unit_cost,
      alert_below,
      note,
      is_active
    )
    values (
      p_business_id,
      name_value,
      category_value,
      supplier_value,
      unit_value,
      unit_cost_value,
      alert_below_value,
      note_value,
      active_value
    )
    returning *
    into saved;
  else
    select product.*
    into saved
    from public.stock_products as product
    where product.id = p_product_id
      and product.business_id = p_business_id
      and product.archived_at is null
    for update;

    if not found then
      raise exception 'Stock product is not available for this business.'
        using errcode = '42501';
    end if;

    if saved.unit <> unit_value
      and exists (
        select 1
        from public.stock_movements as movement
        where movement.business_id = p_business_id
          and movement.product_id = p_product_id
      ) then
      raise exception 'The unit cannot change after stock movements exist.'
        using errcode = '22023';
    end if;

    update public.stock_products
    set
      name = name_value,
      category = category_value,
      supplier = supplier_value,
      unit = unit_value,
      unit_cost = unit_cost_value,
      alert_below = alert_below_value,
      note = note_value,
      is_active = active_value
    where id = p_product_id
      and business_id = p_business_id
      and archived_at is null
    returning *
    into saved;
  end if;

  return to_jsonb(saved);
exception
  when unique_violation then
    raise exception 'A stock product with this name already exists.'
      using errcode = '23505';
end;
$$;

create or replace function public.record_business_stock_movement(
  p_business_id uuid,
  p_product_id uuid,
  p_movement jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  movement_type_value text;
  origin_value text;
  quantity_delta_value numeric(14, 3);
  operation_key_value text;
  reference_id_value text;
  label_value text;
  detail_value text;
  unit_cost_value numeric(12, 2);
  current_balance numeric(18, 3);
  product public.stock_products%rowtype;
  existing public.stock_movements%rowtype;
  saved public.stock_movements%rowtype;
begin
  if actor_user_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not (
    select private.current_user_has_module_access(
      p_business_id,
      'stock',
      'manage'
    )
  ) then
    raise exception 'Insufficient stock permission.'
      using errcode = '42501';
  end if;

  if jsonb_typeof(p_movement) is distinct from 'object' then
    raise exception 'Stock movement payload must be an object.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_movement) as fields(key)
    where fields.key not in (
      'movement_type',
      'origin',
      'quantity_delta',
      'operation_key',
      'reference_id',
      'label',
      'detail',
      'unit_cost'
    )
  ) then
    raise exception 'Stock movement payload contains unknown fields.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_movement -> 'movement_type')
      is distinct from 'string'
    or jsonb_typeof(p_movement -> 'origin')
      is distinct from 'string'
    or jsonb_typeof(p_movement -> 'quantity_delta')
      not in ('number', 'string')
    or jsonb_typeof(p_movement -> 'label')
      is distinct from 'string' then
    raise exception 'Stock movement required fields are invalid.'
      using errcode = '22023';
  end if;

  movement_type_value := btrim(
    p_movement ->> 'movement_type'
  );
  origin_value := btrim(p_movement ->> 'origin');
  operation_key_value := nullif(
    btrim(p_movement ->> 'operation_key'),
    ''
  );
  reference_id_value := nullif(
    btrim(p_movement ->> 'reference_id'),
    ''
  );
  label_value := btrim(p_movement ->> 'label');
  detail_value := coalesce(
    nullif(btrim(p_movement ->> 'detail'), ''),
    ''
  );

  begin
    quantity_delta_value :=
      (p_movement ->> 'quantity_delta')::numeric;
  exception
    when invalid_text_representation
      or numeric_value_out_of_range then
      raise exception 'Stock movement quantity is invalid.'
        using errcode = '22023';
  end;

  select target.*
  into product
  from public.stock_products as target
  where target.id = p_product_id
    and target.business_id = p_business_id
    and target.archived_at is null
    and target.is_active = true
  for update;

  if not found then
    raise exception 'Stock product is not active for this business.'
      using errcode = '42501';
  end if;

  if p_movement ? 'unit_cost'
    and p_movement -> 'unit_cost' <> 'null'::jsonb then
    begin
      unit_cost_value := (p_movement ->> 'unit_cost')::numeric;
    exception
      when invalid_text_representation
        or numeric_value_out_of_range then
        raise exception 'Stock movement unit cost is invalid.'
          using errcode = '22023';
    end;
  else
    unit_cost_value := product.unit_cost;
  end if;

  if movement_type_value not in (
      'opening',
      'replenishment',
      'consumption',
      'return',
      'adjustment'
    )
    or origin_value not in (
      'manual',
      'reservation',
      'shipping',
      'recipe',
      'import'
    )
    or quantity_delta_value = 0
    or abs(quantity_delta_value) > 99999999999.999
    or (
      movement_type_value in (
        'opening',
        'replenishment',
        'return'
      )
      and quantity_delta_value <= 0
    )
    or (
      movement_type_value = 'consumption'
      and quantity_delta_value >= 0
    )
    or char_length(label_value) < 1
    or char_length(label_value) > 160
    or char_length(detail_value) > 2000
    or (
      operation_key_value is not null
      and char_length(operation_key_value) > 160
    )
    or (
      reference_id_value is not null
      and char_length(reference_id_value) > 160
    )
    or unit_cost_value < 0
    or unit_cost_value > 9999999999.99 then
    raise exception 'Stock movement values are invalid.'
      using errcode = '22023';
  end if;

  if origin_value in ('reservation', 'shipping')
    and operation_key_value is null then
    raise exception 'Operational stock movements require an idempotency key.'
      using errcode = '22023';
  end if;

  if operation_key_value is not null then
    select movement.*
    into existing
    from public.stock_movements as movement
    where movement.business_id = p_business_id
      and movement.operation_key = operation_key_value
    limit 1;

    if found then
      if existing.product_id = p_product_id
        and existing.movement_type = movement_type_value
        and existing.origin = origin_value
        and existing.quantity_delta = quantity_delta_value
        and existing.reference_id
          is not distinct from reference_id_value then
        return to_jsonb(existing);
      end if;

      raise exception 'Stock operation key already exists with different data.'
        using errcode = '23505';
    end if;
  end if;

  if movement_type_value = 'opening'
    and exists (
      select 1
      from public.stock_movements as movement
      where movement.business_id = p_business_id
        and movement.product_id = p_product_id
    ) then
    raise exception 'Opening stock must be the first movement.'
      using errcode = '22023';
  end if;

  select coalesce(sum(movement.quantity_delta), 0)
  into current_balance
  from public.stock_movements as movement
  where movement.business_id = p_business_id
    and movement.product_id = p_product_id;

  if current_balance + quantity_delta_value < 0 then
    raise exception 'Stock cannot become negative.'
      using errcode = '23514';
  end if;

  insert into public.stock_movements (
    business_id,
    product_id,
    movement_type,
    origin,
    quantity_delta,
    product_name_snapshot,
    unit_snapshot,
    unit_cost_snapshot,
    operation_key,
    reference_id,
    label,
    detail,
    created_by
  )
  values (
    p_business_id,
    p_product_id,
    movement_type_value,
    origin_value,
    quantity_delta_value,
    product.name,
    product.unit,
    unit_cost_value,
    operation_key_value,
    reference_id_value,
    label_value,
    detail_value,
    actor_user_id
  )
  returning *
  into saved;

  return to_jsonb(saved);
exception
  when unique_violation then
    raise exception 'The stock movement conflicts with an existing operation.'
      using errcode = '23505';
end;
$$;

create or replace function public.archive_business_stock_product(
  p_business_id uuid,
  p_product_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
  current_balance numeric(18, 3);
  saved public.stock_products%rowtype;
begin
  if actor_user_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not (
    select private.current_user_has_module_access(
      p_business_id,
      'stock',
      'full'
    )
  ) then
    raise exception 'Full stock access is required.'
      using errcode = '42501';
  end if;

  select product.*
  into saved
  from public.stock_products as product
  where product.id = p_product_id
    and product.business_id = p_business_id
    and product.archived_at is null
  for update;

  if not found then
    raise exception 'Stock product is not available for this business.'
      using errcode = '42501';
  end if;

  select coalesce(sum(movement.quantity_delta), 0)
  into current_balance
  from public.stock_movements as movement
  where movement.business_id = p_business_id
    and movement.product_id = p_product_id;

  if current_balance <> 0 then
    raise exception 'A stock product with remaining stock cannot be removed.'
      using errcode = '23514';
  end if;

  update public.stock_products
  set
    is_active = false,
    archived_at = now()
  where business_id = p_business_id
    and id = p_product_id
    and archived_at is null
  returning *
  into saved;

  return to_jsonb(saved);
end;
$$;

revoke all on function public.save_business_stock_product(
  uuid,
  uuid,
  jsonb
) from public, anon, authenticated;

revoke all on function public.record_business_stock_movement(
  uuid,
  uuid,
  jsonb
) from public, anon, authenticated;

revoke all on function public.archive_business_stock_product(
  uuid,
  uuid
) from public, anon, authenticated;

grant execute on function public.save_business_stock_product(
  uuid,
  uuid,
  jsonb
) to authenticated;

grant execute on function public.record_business_stock_movement(
  uuid,
  uuid,
  jsonb
) to authenticated;

grant execute on function public.archive_business_stock_product(
  uuid,
  uuid
) to authenticated;

commit;
