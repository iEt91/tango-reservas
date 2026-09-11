begin;

alter table public.stock_movements
  add constraint stock_movements_business_id_id_key
  unique (business_id, id);

create table if not exists public.stock_recipe_operations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  operation_key text not null,
  menu_item_id uuid not null,
  recipe_id uuid not null,
  recipe_revision integer not null,
  origin text not null,
  reference_id text not null,
  sold_quantity integer not null,
  label text not null,
  detail text not null default '',
  created_by uuid
    references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint stock_recipe_operations_business_id_id_key
    unique (business_id, id),
  constraint stock_recipe_operations_business_key
    unique (business_id, operation_key),
  constraint stock_recipe_operations_menu_item_tenant_fk
    foreign key (business_id, menu_item_id)
    references public.menu_items(business_id, id)
    on delete restrict,
  constraint stock_recipe_operations_recipe_tenant_fk
    foreign key (business_id, recipe_id)
    references public.menu_recipes(business_id, id)
    on delete restrict,
  constraint stock_recipe_operations_key_length_check
    check (char_length(operation_key) between 1 and 120),
  constraint stock_recipe_operations_origin_check
    check (origin in ('reservation', 'shipping', 'recipe')),
  constraint stock_recipe_operations_reference_length_check
    check (char_length(reference_id) between 1 and 160),
  constraint stock_recipe_operations_quantity_check
    check (sold_quantity between 1 and 9999),
  constraint stock_recipe_operations_revision_check
    check (recipe_revision between 1 and 2147483647),
  constraint stock_recipe_operations_label_length_check
    check (char_length(btrim(label)) between 1 and 160),
  constraint stock_recipe_operations_detail_length_check
    check (char_length(detail) <= 2000)
);

create index if not exists
  stock_recipe_operations_business_created_idx
on public.stock_recipe_operations (
  business_id,
  created_at desc
);

create index if not exists
  stock_recipe_operations_business_reference_idx
on public.stock_recipe_operations (
  business_id,
  origin,
  reference_id
);

create table if not exists public.stock_recipe_operation_movements (
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  operation_id uuid not null,
  stock_movement_id uuid not null,
  created_at timestamptz not null default now(),
  primary key (
    business_id,
    operation_id,
    stock_movement_id
  ),
  constraint stock_recipe_operation_movements_operation_tenant_fk
    foreign key (business_id, operation_id)
    references public.stock_recipe_operations(business_id, id)
    on delete cascade,
  constraint stock_recipe_operation_movements_movement_tenant_fk
    foreign key (business_id, stock_movement_id)
    references public.stock_movements(business_id, id)
    on delete restrict
);

create unique index if not exists
  stock_recipe_operation_movements_movement_key
on public.stock_recipe_operation_movements (
  business_id,
  stock_movement_id
);

alter table public.stock_recipe_operations
  enable row level security;
alter table public.stock_recipe_operations
  force row level security;

alter table public.stock_recipe_operation_movements
  enable row level security;
alter table public.stock_recipe_operation_movements
  force row level security;

drop policy if exists
  stock_recipe_operations_select_module_member
on public.stock_recipe_operations;

create policy stock_recipe_operations_select_module_member
on public.stock_recipe_operations
for select
to authenticated
using (
  (
    select private.current_user_has_module_access(
      business_id,
      'stock',
      'view'
    )
  )
  and (
    select private.current_user_has_module_access(
      business_id,
      'recipes',
      'view'
    )
  )
);

drop policy if exists
  stock_recipe_operation_movements_select_module_member
on public.stock_recipe_operation_movements;

create policy stock_recipe_operation_movements_select_module_member
on public.stock_recipe_operation_movements
for select
to authenticated
using (
  (
    select private.current_user_has_module_access(
      business_id,
      'stock',
      'view'
    )
  )
  and (
    select private.current_user_has_module_access(
      business_id,
      'recipes',
      'view'
    )
  )
);

revoke all on table public.stock_recipe_operations
  from public, anon, authenticated;
revoke all on table public.stock_recipe_operation_movements
  from public, anon, authenticated;

grant select on table public.stock_recipe_operations
  to authenticated;
grant select on table public.stock_recipe_operation_movements
  to authenticated;

create or replace function private.apply_recipe_stock_consumption(
  p_business_id uuid,
  p_menu_item_id uuid,
  p_quantity integer,
  p_origin text,
  p_reference_id text,
  p_operation_key text,
  p_label text,
  p_detail text,
  p_actor_user_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  menu_item public.menu_items%rowtype;
  recipe public.menu_recipes%rowtype;
  ingredient_record record;
  existing_operation public.stock_recipe_operations%rowtype;
  saved_operation public.stock_recipe_operations%rowtype;
  saved_movement public.stock_movements%rowtype;
  converted_quantity numeric;
  required_quantity numeric(14, 3);
  current_balance numeric(18, 3);
  ingredient_count integer;
  active_product_count integer;
begin
  if p_actor_user_id is null then
    raise exception 'Recipe stock consumption requires an actor.'
      using errcode = '42501';
  end if;

  if p_business_id is null
    or p_menu_item_id is null
    or p_quantity is null
    or p_quantity < 1
    or p_quantity > 9999
    or p_origin not in ('reservation', 'shipping', 'recipe')
    or p_reference_id is null
    or char_length(btrim(p_reference_id)) < 1
    or char_length(btrim(p_reference_id)) > 160
    or p_operation_key is null
    or char_length(btrim(p_operation_key)) < 1
    or char_length(btrim(p_operation_key)) > 120
    or p_label is null
    or char_length(btrim(p_label)) < 1
    or char_length(btrim(p_label)) > 160
    or char_length(coalesce(p_detail, '')) > 2000 then
    raise exception 'Recipe stock consumption input is invalid.'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text, 0)
  );

  select operation.*
  into existing_operation
  from public.stock_recipe_operations as operation
  where operation.business_id = p_business_id
    and operation.operation_key = btrim(p_operation_key)
  limit 1;

  if found then
    if existing_operation.menu_item_id = p_menu_item_id
      and existing_operation.sold_quantity = p_quantity
      and existing_operation.origin = p_origin
      and existing_operation.reference_id = btrim(p_reference_id) then
      return jsonb_build_object(
        'operation',
        to_jsonb(existing_operation),
        'movements',
        coalesce(
          (
            select jsonb_agg(
              to_jsonb(movement)
              order by movement.created_at, movement.id
            )
            from public.stock_recipe_operation_movements as link
            join public.stock_movements as movement
              on movement.business_id = link.business_id
              and movement.id = link.stock_movement_id
            where link.business_id = p_business_id
              and link.operation_id = existing_operation.id
          ),
          '[]'::jsonb
        )
      );
    end if;

    raise exception 'Recipe stock operation key already exists with different data.'
      using errcode = '23505';
  end if;

  select item.*
  into menu_item
  from public.menu_items as item
  where item.business_id = p_business_id
    and item.id = p_menu_item_id
    and item.archived_at is null
  for share;

  if not found then
    raise exception 'Menu item is not available for recipe consumption.'
      using errcode = '23503';
  end if;

  select candidate.*
  into recipe
  from public.menu_recipes as candidate
  where candidate.business_id = p_business_id
    and candidate.menu_item_id = p_menu_item_id
  limit 1;

  if not found then
    raise exception 'Menu item has no persistent recipe.'
      using errcode = '23514';
  end if;

  select count(*)
  into ingredient_count
  from public.menu_recipe_ingredients as ingredient
  where ingredient.business_id = p_business_id
    and ingredient.recipe_id = recipe.id;

  if ingredient_count < 1 then
    raise exception 'Recipe has no ingredients to consume.'
      using errcode = '23514';
  end if;

  perform product.id
  from public.menu_recipe_ingredients as ingredient
  join public.stock_products as product
    on product.business_id = ingredient.business_id
    and product.id = ingredient.stock_product_id
  where ingredient.business_id = p_business_id
    and ingredient.recipe_id = recipe.id
    and product.archived_at is null
    and product.is_active = true
  order by product.id
  for update of product;

  get diagnostics active_product_count = row_count;

  if active_product_count <> ingredient_count then
    raise exception 'Recipe references an unavailable stock product.'
      using errcode = '23503';
  end if;

  for ingredient_record in
    select
      ingredient.id as ingredient_id,
      ingredient.quantity as recipe_quantity,
      ingredient.unit as recipe_unit,
      product.id as product_id,
      product.name as product_name,
      product.unit as stock_unit,
      product.unit_cost as unit_cost
    from public.menu_recipe_ingredients as ingredient
    join public.stock_products as product
      on product.business_id = ingredient.business_id
      and product.id = ingredient.stock_product_id
    where ingredient.business_id = p_business_id
      and ingredient.recipe_id = recipe.id
      and product.archived_at is null
      and product.is_active = true
    order by product.id
  loop
    converted_quantity :=
      private.recipe_quantity_in_stock_unit(
        ingredient_record.recipe_quantity,
        ingredient_record.recipe_unit,
        ingredient_record.stock_unit
      );

    required_quantity :=
      round(
        converted_quantity * p_quantity,
        3
      );

    if converted_quantity is null
      or required_quantity <= 0 then
      raise exception 'Recipe ingredient cannot be converted to stock unit.'
        using errcode = '23514';
    end if;

    select coalesce(
      sum(movement.quantity_delta),
      0
    )
    into current_balance
    from public.stock_movements as movement
    where movement.business_id = p_business_id
      and movement.product_id = ingredient_record.product_id;

    if current_balance < required_quantity then
      raise exception 'Insufficient stock for recipe consumption.'
        using errcode = '23514';
    end if;
  end loop;

  insert into public.stock_recipe_operations (
    business_id,
    operation_key,
    menu_item_id,
    recipe_id,
    recipe_revision,
    origin,
    reference_id,
    sold_quantity,
    label,
    detail,
    created_by
  )
  values (
    p_business_id,
    btrim(p_operation_key),
    p_menu_item_id,
    recipe.id,
    recipe.revision,
    p_origin,
    btrim(p_reference_id),
    p_quantity,
    btrim(p_label),
    coalesce(btrim(p_detail), ''),
    p_actor_user_id
  )
  returning *
  into saved_operation;

  for ingredient_record in
    select
      ingredient.quantity as recipe_quantity,
      ingredient.unit as recipe_unit,
      product.id as product_id,
      product.name as product_name,
      product.unit as stock_unit,
      product.unit_cost as unit_cost
    from public.menu_recipe_ingredients as ingredient
    join public.stock_products as product
      on product.business_id = ingredient.business_id
      and product.id = ingredient.stock_product_id
    where ingredient.business_id = p_business_id
      and ingredient.recipe_id = recipe.id
      and product.archived_at is null
      and product.is_active = true
    order by product.id
  loop
    converted_quantity :=
      private.recipe_quantity_in_stock_unit(
        ingredient_record.recipe_quantity,
        ingredient_record.recipe_unit,
        ingredient_record.stock_unit
      );

    required_quantity :=
      round(
        converted_quantity * p_quantity,
        3
      );

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
      ingredient_record.product_id,
      'consumption',
      p_origin,
      -required_quantity,
      ingredient_record.product_name,
      ingredient_record.stock_unit,
      ingredient_record.unit_cost,
      'recipe-op:'
        || saved_operation.id::text
        || ':'
        || ingredient_record.product_id::text,
      btrim(p_reference_id),
      btrim(p_label),
      coalesce(btrim(p_detail), ''),
      p_actor_user_id
    )
    returning *
    into saved_movement;

    insert into public.stock_recipe_operation_movements (
      business_id,
      operation_id,
      stock_movement_id
    )
    values (
      p_business_id,
      saved_operation.id,
      saved_movement.id
    );
  end loop;

  return jsonb_build_object(
    'operation',
    to_jsonb(saved_operation),
    'movements',
    coalesce(
      (
        select jsonb_agg(
          to_jsonb(movement)
          order by movement.created_at, movement.id
        )
        from public.stock_recipe_operation_movements as link
        join public.stock_movements as movement
          on movement.business_id = link.business_id
          and movement.id = link.stock_movement_id
        where link.business_id = p_business_id
          and link.operation_id = saved_operation.id
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function private.apply_recipe_stock_consumption(
  uuid,
  uuid,
  integer,
  text,
  text,
  text,
  text,
  text,
  uuid
) from public, anon, authenticated;

create or replace function public.consume_business_menu_recipe_stock(
  p_business_id uuid,
  p_menu_item_id uuid,
  p_quantity integer,
  p_operation_key text,
  p_reference_id text,
  p_label text,
  p_detail text default ''
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  actor_user_id uuid := (select auth.uid());
begin
  if actor_user_id is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not (
    select private.current_user_has_module_access(
      p_business_id,
      'recipes',
      'manage'
    )
  ) or not (
    select private.current_user_has_module_access(
      p_business_id,
      'stock',
      'manage'
    )
  ) then
    raise exception 'Recipes and stock manage permissions are required.'
      using errcode = '42501';
  end if;

  return private.apply_recipe_stock_consumption(
    p_business_id,
    p_menu_item_id,
    p_quantity,
    'recipe',
    p_reference_id,
    p_operation_key,
    p_label,
    p_detail,
    actor_user_id
  );
end;
$$;

revoke all on function public.consume_business_menu_recipe_stock(
  uuid,
  uuid,
  integer,
  text,
  text,
  text,
  text
) from public, anon, authenticated;

grant execute on function public.consume_business_menu_recipe_stock(
  uuid,
  uuid,
  integer,
  text,
  text,
  text,
  text
) to authenticated;

commit;
