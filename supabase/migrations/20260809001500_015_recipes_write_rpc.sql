begin;

create table if not exists public.menu_recipes (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  menu_item_id uuid not null,
  name text not null,
  preparation_time_seconds integer not null default 900,
  revision integer not null default 1,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_recipes_business_id_id_key
    unique (business_id, id),
  constraint menu_recipes_business_menu_item_key
    unique (business_id, menu_item_id),
  constraint menu_recipes_menu_item_tenant_fk
    foreign key (business_id, menu_item_id)
    references public.menu_items(business_id, id)
    on delete cascade,
  constraint menu_recipes_name_length_check
    check (char_length(btrim(name)) between 1 and 160),
  constraint menu_recipes_preparation_time_check
    check (preparation_time_seconds between 1 and 86400),
  constraint menu_recipes_revision_check
    check (revision between 1 and 2147483647)
);

create index if not exists menu_recipes_business_updated_idx
  on public.menu_recipes (
    business_id,
    updated_at desc
  );

create table if not exists public.menu_recipe_ingredients (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  recipe_id uuid not null,
  stock_product_id uuid not null,
  quantity numeric(14, 3) not null,
  unit text not null,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  constraint menu_recipe_ingredients_business_id_id_key
    unique (business_id, id),
  constraint menu_recipe_ingredients_recipe_product_key
    unique (
      business_id,
      recipe_id,
      stock_product_id
    ),
  constraint menu_recipe_ingredients_recipe_tenant_fk
    foreign key (business_id, recipe_id)
    references public.menu_recipes(business_id, id)
    on delete cascade,
  constraint menu_recipe_ingredients_stock_product_tenant_fk
    foreign key (business_id, stock_product_id)
    references public.stock_products(business_id, id)
    on delete restrict,
  constraint menu_recipe_ingredients_quantity_check
    check (
      quantity > 0
      and quantity <= 99999999999.999
    ),
  constraint menu_recipe_ingredients_unit_check
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
  constraint menu_recipe_ingredients_sort_order_check
    check (sort_order between 0 and 499)
);

create index if not exists
  menu_recipe_ingredients_business_recipe_idx
on public.menu_recipe_ingredients (
  business_id,
  recipe_id,
  sort_order
);

create index if not exists
  menu_recipe_ingredients_business_stock_idx
on public.menu_recipe_ingredients (
  business_id,
  stock_product_id
);

drop trigger if exists menu_recipes_set_updated_at
  on public.menu_recipes;

create trigger menu_recipes_set_updated_at
before update on public.menu_recipes
for each row
execute function private.tango_set_updated_at();

create or replace function private.recipe_quantity_in_stock_unit(
  p_quantity numeric,
  p_recipe_unit text,
  p_stock_unit text
)
returns numeric
language sql
immutable
strict
set search_path = ''
as $$
  select case
    when p_quantity <= 0 then null
    when p_recipe_unit = p_stock_unit then p_quantity
    when p_recipe_unit = 'g'
      and p_stock_unit = 'kg' then p_quantity / 1000
    when p_recipe_unit = 'kg'
      and p_stock_unit = 'g' then p_quantity * 1000
    when p_recipe_unit = 'ml'
      and p_stock_unit = 'l' then p_quantity / 1000
    when p_recipe_unit = 'l'
      and p_stock_unit = 'ml' then p_quantity * 1000
    else null
  end;
$$;

revoke all on function private.recipe_quantity_in_stock_unit(
  numeric,
  text,
  text
) from public, anon, authenticated;

create or replace function private.validate_stock_product_recipe_references()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (
    (
      new.archived_at is not null
      or new.is_active = false
    )
    and (
      old.archived_at is null
      and old.is_active = true
    )
    and exists (
      select 1
      from public.menu_recipe_ingredients as ingredient
      join public.menu_recipes as recipe
        on recipe.business_id = ingredient.business_id
        and recipe.id = ingredient.recipe_id
      join public.menu_items as item
        on item.business_id = recipe.business_id
        and item.id = recipe.menu_item_id
      where ingredient.business_id = new.business_id
        and ingredient.stock_product_id = new.id
        and item.archived_at is null
    )
  ) then
    raise exception 'Stock product is used by an active recipe.'
      using errcode = '23503';
  end if;

  if new.unit is distinct from old.unit
    and exists (
      select 1
      from public.menu_recipe_ingredients as ingredient
      join public.menu_recipes as recipe
        on recipe.business_id = ingredient.business_id
        and recipe.id = ingredient.recipe_id
      join public.menu_items as item
        on item.business_id = recipe.business_id
        and item.id = recipe.menu_item_id
      where ingredient.business_id = new.business_id
        and ingredient.stock_product_id = new.id
        and item.archived_at is null
        and private.recipe_quantity_in_stock_unit(
          ingredient.quantity,
          ingredient.unit,
          new.unit
        ) is null
    ) then
    raise exception 'Stock unit is incompatible with an active recipe.'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_stock_product_recipe_references()
  from public, anon, authenticated;

drop trigger if exists stock_products_validate_recipe_references
  on public.stock_products;

create trigger stock_products_validate_recipe_references
before update of unit, is_active, archived_at
on public.stock_products
for each row
execute function private.validate_stock_product_recipe_references();

alter table public.menu_recipes enable row level security;
alter table public.menu_recipes force row level security;

alter table public.menu_recipe_ingredients enable row level security;
alter table public.menu_recipe_ingredients force row level security;

drop policy if exists menu_recipes_select_module_member
  on public.menu_recipes;

create policy menu_recipes_select_module_member
on public.menu_recipes
for select
to authenticated
using (
  (
    select private.current_user_has_module_access(
      business_id,
      'recipes',
      'view'
    )
  )
);

drop policy if exists menu_recipe_ingredients_select_module_member
  on public.menu_recipe_ingredients;

create policy menu_recipe_ingredients_select_module_member
on public.menu_recipe_ingredients
for select
to authenticated
using (
  (
    select private.current_user_has_module_access(
      business_id,
      'recipes',
      'view'
    )
  )
);

revoke all on table public.menu_recipes
  from public, anon, authenticated;
revoke all on table public.menu_recipe_ingredients
  from public, anon, authenticated;

grant select on table public.menu_recipes
  to authenticated;
grant select on table public.menu_recipe_ingredients
  to authenticated;

create or replace function public.save_business_menu_recipe(
  p_business_id uuid,
  p_menu_item_id uuid,
  p_recipe jsonb,
  p_ingredients jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipe_name_value text;
  preparation_time_value integer;
  ingredient_entry jsonb;
  ingredient_ordinality bigint;
  stock_product_id_value uuid;
  quantity_value numeric(14, 3);
  recipe_unit_value text;
  stock_unit_value text;
  converted_quantity numeric;
  seen_product_ids uuid[] := array[]::uuid[];
  saved public.menu_recipes%rowtype;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication required.'
      using errcode = '42501';
  end if;

  if not (
    select private.current_user_has_module_access(
      p_business_id,
      'recipes',
      'manage'
    )
  ) then
    raise exception 'Insufficient recipes permission.'
      using errcode = '42501';
  end if;

  if p_menu_item_id is null then
    raise exception 'Menu item is required.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_recipe) is distinct from 'object' then
    raise exception 'Recipe payload must be an object.'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_object_keys(p_recipe) as fields(key)
    where fields.key not in (
      'name',
      'preparation_time_seconds'
    )
  ) then
    raise exception 'Recipe payload contains unknown fields.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_recipe -> 'name')
      is distinct from 'string'
    or jsonb_typeof(p_recipe -> 'preparation_time_seconds')
      not in ('number', 'string') then
    raise exception 'Recipe required fields are invalid.'
      using errcode = '22023';
  end if;

  recipe_name_value := btrim(p_recipe ->> 'name');

  begin
    preparation_time_value :=
      (p_recipe ->> 'preparation_time_seconds')::integer;
  exception
    when invalid_text_representation
      or numeric_value_out_of_range then
      raise exception 'Recipe preparation time is invalid.'
        using errcode = '22023';
  end;

  if char_length(recipe_name_value) < 1
    or char_length(recipe_name_value) > 160
    or preparation_time_value < 1
    or preparation_time_value > 86400 then
    raise exception 'Recipe values are invalid.'
      using errcode = '22023';
  end if;

  if jsonb_typeof(p_ingredients) is distinct from 'array'
    or jsonb_array_length(p_ingredients) > 500 then
    raise exception 'Recipe ingredients payload is invalid.'
      using errcode = '22023';
  end if;

  perform pg_advisory_xact_lock(
    hashtextextended(p_business_id::text, 0)
  );

  perform 1
  from public.menu_items as item
  where item.id = p_menu_item_id
    and item.business_id = p_business_id
    and item.archived_at is null
  for update;

  if not found then
    raise exception 'Menu item is not available for this business.'
      using errcode = '23503';
  end if;

  insert into public.menu_recipes as recipe (
    business_id,
    menu_item_id,
    name,
    preparation_time_seconds,
    revision
  )
  values (
    p_business_id,
    p_menu_item_id,
    recipe_name_value,
    preparation_time_value,
    1
  )
  on conflict (business_id, menu_item_id)
  do update
  set
    name = excluded.name,
    preparation_time_seconds =
      excluded.preparation_time_seconds,
    revision = recipe.revision + 1,
    updated_at = now()
  returning *
  into saved;

  delete from public.menu_recipe_ingredients
  where business_id = p_business_id
    and recipe_id = saved.id;

  for ingredient_entry, ingredient_ordinality in
    select ingredient.value, ingredient.ordinality
    from jsonb_array_elements(p_ingredients)
      with ordinality as ingredient(value, ordinality)
  loop
    if jsonb_typeof(ingredient_entry) <> 'object'
      or exists (
        select 1
        from jsonb_object_keys(ingredient_entry) as fields(key)
        where fields.key not in (
          'stock_product_id',
          'quantity',
          'unit'
        )
      )
      or jsonb_typeof(ingredient_entry -> 'stock_product_id')
        is distinct from 'string'
      or jsonb_typeof(ingredient_entry -> 'quantity')
        not in ('number', 'string')
      or jsonb_typeof(ingredient_entry -> 'unit')
        is distinct from 'string' then
      raise exception 'Recipe ingredient is invalid.'
        using errcode = '22023';
    end if;

    if (ingredient_entry ->> 'stock_product_id')
      !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' then
      raise exception 'Recipe stock product is invalid.'
        using errcode = '22023';
    end if;

    stock_product_id_value :=
      (ingredient_entry ->> 'stock_product_id')::uuid;

    if stock_product_id_value = any(seen_product_ids) then
      raise exception 'Recipe contains duplicate stock products.'
        using errcode = '22023';
    end if;

    begin
      quantity_value :=
        round(
          (ingredient_entry ->> 'quantity')::numeric,
          3
        );
    exception
      when invalid_text_representation
        or numeric_value_out_of_range then
        raise exception 'Recipe ingredient quantity is invalid.'
          using errcode = '22023';
    end;

    recipe_unit_value :=
      btrim(ingredient_entry ->> 'unit');

    if quantity_value <= 0
      or quantity_value > 99999999999.999
      or recipe_unit_value not in (
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
      ) then
      raise exception 'Recipe ingredient values are invalid.'
        using errcode = '22023';
    end if;

    select product.unit
    into stock_unit_value
    from public.stock_products as product
    where product.id = stock_product_id_value
      and product.business_id = p_business_id
      and product.archived_at is null
      and product.is_active = true
    for share;

    if not found then
      raise exception 'Recipe stock product is not active for this business.'
        using errcode = '23503';
    end if;

    converted_quantity :=
      private.recipe_quantity_in_stock_unit(
        quantity_value,
        recipe_unit_value,
        stock_unit_value
      );

    if converted_quantity is null
      or round(converted_quantity, 3) <= 0
      or round(converted_quantity, 3) > 99999999999.999 then
      raise exception 'Recipe ingredient unit is incompatible with stock.'
        using errcode = '23514';
    end if;

    seen_product_ids :=
      array_append(
        seen_product_ids,
        stock_product_id_value
      );

    insert into public.menu_recipe_ingredients (
      business_id,
      recipe_id,
      stock_product_id,
      quantity,
      unit,
      sort_order
    )
    values (
      p_business_id,
      saved.id,
      stock_product_id_value,
      quantity_value,
      recipe_unit_value,
      ingredient_ordinality - 1
    );
  end loop;

  return jsonb_build_object(
    'recipe',
    to_jsonb(saved),
    'ingredients',
    coalesce(
      (
        select jsonb_agg(
          to_jsonb(ingredient)
          order by ingredient.sort_order
        )
        from public.menu_recipe_ingredients as ingredient
        where ingredient.business_id = p_business_id
          and ingredient.recipe_id = saved.id
      ),
      '[]'::jsonb
    )
  );
end;
$$;

revoke all on function public.save_business_menu_recipe(
  uuid,
  uuid,
  jsonb,
  jsonb
) from public, anon, authenticated;

grant execute on function public.save_business_menu_recipe(
  uuid,
  uuid,
  jsonb,
  jsonb
) to authenticated;

commit;
