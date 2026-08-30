begin;

-- Each stock movement has an idempotency key. Recompile the showcase seed so
-- every stocked ingredient receives its own key instead of sharing one batch key.
create or replace function public.seed_business_sandbox_showcase(p_sandbox_business_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_business_id uuid;
  v_completed_reservation uuid;
  v_active_reservation uuid;
  v_cash_session uuid;
  v_dine_completed uuid;
  v_dine_active uuid;
  v_delivery uuid;
  v_pickup uuid;
  v_cancelled_delivery uuid;
  v_operation uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Se requiere una sesión autenticada.' using errcode = '42501';
  end if;

  select sandbox.source_business_id
    into source_business_id
  from public.business_sandboxes as sandbox
  where sandbox.sandbox_business_id = p_sandbox_business_id;

  if source_business_id is null
    or not (select private.has_business_role(source_business_id, array['owner']::text[])) then
    raise exception 'Solo el dueño puede preparar esta simulación.' using errcode = '42501';
  end if;

  -- The showcase is appended only to a newly generated v3 sandbox. Keeping it
  -- idempotent prevents an accidental second RPC call from duplicating data.
  if exists (
    select 1 from public.business_sandboxes
    where sandbox_business_id = p_sandbox_business_id and seed_version = 'v4'
  ) then
    return;
  end if;

  delete from public.menu_recipe_ingredients where business_id = p_sandbox_business_id;
  delete from public.menu_recipes where business_id = p_sandbox_business_id;
  delete from public.menu_items where business_id = p_sandbox_business_id;
  delete from public.menu_categories where business_id = p_sandbox_business_id;

  insert into public.menu_categories (business_id, name, description, sort_order)
  values
    (p_sandbox_business_id, 'Para compartir', 'Platos para abrir la mesa y compartir.', 10),
    (p_sandbox_business_id, 'Principales', 'Cocina de producto con porciones claras.', 20),
    (p_sandbox_business_id, 'Postres', 'Cierre de carta hecho en casa.', 30),
    (p_sandbox_business_id, 'Bebidas', 'Vinos y bebidas para acompañar.', 40);

  insert into public.stock_products (business_id, name, category, supplier, unit, unit_cost, alert_below, note)
  values
    (p_sandbox_business_id, 'Papa blanca', 'Verdulería', 'Huerta Atlántica', 'kg', 1200, 8, 'Lavada y lista para cocina.'),
    (p_sandbox_business_id, 'Huevo de campo', 'Granja', 'Granja La Loma', 'unidad', 180, 30, 'Calibre XL.'),
    (p_sandbox_business_id, 'Cebolla', 'Verdulería', 'Huerta Atlántica', 'kg', 550, 4, ''),
    (p_sandbox_business_id, 'Aceite de oliva extra virgen', 'Almacén', 'Oliva Sur', 'l', 12000, 2, 'Botella de trabajo.'),
    (p_sandbox_business_id, 'Sal marina', 'Almacén', 'Salinas', 'kg', 1800, 1, ''),
    (p_sandbox_business_id, 'Ojo de bife', 'Carnes', 'Carnes del Plata', 'kg', 21000, 6, 'Porcionado en cortes de 350 g.'),
    (p_sandbox_business_id, 'Manteca', 'Lácteos', 'Lácteos La Costa', 'kg', 9500, 2, ''),
    (p_sandbox_business_id, 'Mix de hojas verdes', 'Verdulería', 'Huerta Atlántica', 'kg', 6500, 2, ''),
    (p_sandbox_business_id, 'Limón', 'Verdulería', 'Huerta Atlántica', 'kg', 2200, 2, ''),
    (p_sandbox_business_id, 'Sorrentinos de calabaza', 'Pastas', 'Pasta Fresca', 'unidad', 1800, 20, 'Pieza individual de 110 g.'),
    (p_sandbox_business_id, 'Crema de leche', 'Lácteos', 'Lácteos La Costa', 'l', 6500, 2, ''),
    (p_sandbox_business_id, 'Salsa de tomate', 'Almacén', 'Tomates del Sur', 'l', 3800, 2, ''),
    (p_sandbox_business_id, 'Filet de merluza', 'Pescadería', 'Puerto Fresco', 'kg', 14500, 4, 'Porción de 280 g.'),
    (p_sandbox_business_id, 'Burrata 125 g', 'Lácteos', 'Caseificio Italiano', 'unidad', 4200, 8, ''),
    (p_sandbox_business_id, 'Tomate perita', 'Verdulería', 'Huerta Atlántica', 'kg', 1800, 3, ''),
    (p_sandbox_business_id, 'Pan de masa madre', 'Panadería', 'Pan de Barrio', 'unidad', 2200, 8, 'Hogaza de 600 g.'),
    (p_sandbox_business_id, 'Café de especialidad', 'Bebidas', 'Tostadores del Mar', 'kg', 22000, 1, ''),
    (p_sandbox_business_id, 'Mascarpone', 'Lácteos', 'Caseificio Italiano', 'kg', 11500, 1, ''),
    (p_sandbox_business_id, 'Espumante brut 750 ml', 'Bebidas', 'Bodega Costa', 'botella', 8200, 6, 'Servicio a 6 copas.');

  insert into public.stock_movements (
    business_id, product_id, movement_type, origin, quantity_delta,
    product_name_snapshot, unit_snapshot, unit_cost_snapshot, operation_key, label, detail, created_by
  )
  select
    p_sandbox_business_id, product.id, 'opening', 'import', opening.quantity,
    product.name, product.unit, product.unit_cost, ('sandbox-opening-v4-' || product.id::text), 'Stock inicial de simulación',
    'Inventario inicial para practicar recetas, cocina y reposición.', (select auth.uid())
  from public.stock_products product
  join (values
    ('Papa blanca', 45::numeric), ('Huevo de campo', 320::numeric), ('Cebolla', 18::numeric),
    ('Aceite de oliva extra virgen', 9::numeric), ('Sal marina', 5::numeric), ('Ojo de bife', 18::numeric),
    ('Manteca', 8::numeric), ('Mix de hojas verdes', 9::numeric), ('Limón', 14::numeric),
    ('Sorrentinos de calabaza', 90::numeric), ('Crema de leche', 7::numeric), ('Salsa de tomate', 10::numeric),
    ('Filet de merluza', 14::numeric), ('Burrata 125 g', 24::numeric), ('Tomate perita', 16::numeric),
    ('Pan de masa madre', 16::numeric), ('Café de especialidad', 3::numeric), ('Mascarpone', 4::numeric),
    ('Espumante brut 750 ml', 18::numeric)
  ) as opening(name, quantity) on opening.name = product.name
  where product.business_id = p_sandbox_business_id;

  insert into public.menu_items (business_id, category_id, name, description, price, is_featured, sort_order)
  select p_sandbox_business_id, category.id, item.name, item.description, item.price, item.featured, item.sort_order
  from (values
    ('Para compartir', 'Tortilla de papa al hierro', 'Tortilla babé: papa confitada, cebolla dorada y huevo de campo. Porción para compartir.', 12500::numeric, true, 10),
    ('Para compartir', 'Burrata, tomates asados y masa madre', 'Burrata de 125 g, tomate perita asado, aceite de oliva y pan de masa madre tostado.', 14500::numeric, true, 20),
    ('Principales', 'Ojo de bife, papas crocantes y demi-glace', 'Corte de 350 g, papas crocantes y salsa reducida. Cocción a elección.', 32500::numeric, true, 10),
    ('Principales', 'Sorrentinos de calabaza y manteca de salvia', 'Cinco piezas de pasta fresca con crema, manteca y parmesano.', 21500::numeric, false, 20),
    ('Principales', 'Pesca del día, hojas verdes y limón', 'Filet de merluza de 280 g, ensalada fresca y limón quemado.', 24000::numeric, false, 30),
    ('Postres', 'Tiramisú de café de especialidad', 'Mascarpone, café de especialidad y cacao. Elaboración diaria.', 9500::numeric, false, 10),
    ('Bebidas', 'Espumante brut 750 ml', 'Bodega Costa. Botella de 750 ml, servicio sugerido para seis copas.', 18500::numeric, false, 10)
  ) as item(category_name, name, description, price, featured, sort_order)
  join public.menu_categories category
    on category.business_id = p_sandbox_business_id and category.name = item.category_name;

  insert into public.menu_recipes (business_id, menu_item_id, name, preparation_time_seconds)
  select p_sandbox_business_id, item.id, item.name || ' — ficha técnica', recipe.prep_seconds
  from public.menu_items item
  join (values
    ('Tortilla de papa al hierro', 900), ('Burrata, tomates asados y masa madre', 480),
    ('Ojo de bife, papas crocantes y demi-glace', 1200), ('Sorrentinos de calabaza y manteca de salvia', 900),
    ('Pesca del día, hojas verdes y limón', 1080), ('Tiramisú de café de especialidad', 600),
    ('Espumante brut 750 ml', 60)
  ) as recipe(item_name, prep_seconds) on recipe.item_name = item.name
  where item.business_id = p_sandbox_business_id;

  insert into public.menu_recipe_ingredients (business_id, recipe_id, stock_product_id, quantity, unit, sort_order)
  select p_sandbox_business_id, recipe.id, product.id, ingredient.quantity, ingredient.unit, ingredient.sort_order
  from (values
    ('Tortilla de papa al hierro', 'Papa blanca', 450::numeric, 'g', 10),
    ('Tortilla de papa al hierro', 'Huevo de campo', 5::numeric, 'unidad', 20),
    ('Tortilla de papa al hierro', 'Cebolla', 120::numeric, 'g', 30),
    ('Tortilla de papa al hierro', 'Aceite de oliva extra virgen', 45::numeric, 'ml', 40),
    ('Tortilla de papa al hierro', 'Sal marina', 8::numeric, 'g', 50),
    ('Burrata, tomates asados y masa madre', 'Burrata 125 g', 1::numeric, 'unidad', 10),
    ('Burrata, tomates asados y masa madre', 'Tomate perita', 220::numeric, 'g', 20),
    ('Burrata, tomates asados y masa madre', 'Pan de masa madre', 0.33::numeric, 'unidad', 30),
    ('Burrata, tomates asados y masa madre', 'Aceite de oliva extra virgen', 25::numeric, 'ml', 40),
    ('Ojo de bife, papas crocantes y demi-glace', 'Ojo de bife', 350::numeric, 'g', 10),
    ('Ojo de bife, papas crocantes y demi-glace', 'Papa blanca', 250::numeric, 'g', 20),
    ('Ojo de bife, papas crocantes y demi-glace', 'Manteca', 25::numeric, 'g', 30),
    ('Ojo de bife, papas crocantes y demi-glace', 'Sal marina', 6::numeric, 'g', 40),
    ('Sorrentinos de calabaza y manteca de salvia', 'Sorrentinos de calabaza', 5::numeric, 'unidad', 10),
    ('Sorrentinos de calabaza y manteca de salvia', 'Manteca', 35::numeric, 'g', 20),
    ('Sorrentinos de calabaza y manteca de salvia', 'Crema de leche', 90::numeric, 'ml', 30),
    ('Pesca del día, hojas verdes y limón', 'Filet de merluza', 280::numeric, 'g', 10),
    ('Pesca del día, hojas verdes y limón', 'Mix de hojas verdes', 120::numeric, 'g', 20),
    ('Pesca del día, hojas verdes y limón',  'Limón', 45::numeric, 'g', 30),
    ('Tiramisú de café de especialidad', 'Mascarpone', 120::numeric, 'g', 10),
    ('Tiramisú de café de especialidad', 'Café de especialidad', 18::numeric, 'g', 20),
    ('Espumante brut 750 ml', 'Espumante brut 750 ml', 1::numeric, 'botella', 10)
  ) as ingredient(recipe_item_name, product_name, quantity, unit, sort_order)
  join public.menu_items item on item.business_id = p_sandbox_business_id and item.name = ingredient.recipe_item_name
  join public.menu_recipes recipe on recipe.business_id = p_sandbox_business_id and recipe.menu_item_id = item.id
  join public.stock_products product on product.business_id = p_sandbox_business_id and product.name = ingredient.product_name;

  select id into v_completed_reservation from public.reservations
  where business_id = p_sandbox_business_id and reservation_date = current_date and status = 'completed'
  order by reservation_time limit 1;
  select id into v_active_reservation from public.reservations
  where business_id = p_sandbox_business_id and reservation_date = current_date and status = 'confirmed'
  order by reservation_time limit 1;

  insert into public.cash_sessions (business_id, business_date, status, opening_amount, open_operation_key, opened_by, notes)
  values (p_sandbox_business_id, current_date, 'open', 50000, 'sandbox-cash-v4', (select auth.uid()), 'Caja de práctica abierta con fondo inicial.')
  returning id into v_cash_session;

  insert into public.business_orders (business_id, order_kind, reservation_id, status, subtotal, kitchen_status, kitchen_completed_at, kitchen_target_seconds, created_by, updated_by)
  values (p_sandbox_business_id, 'dine_in', v_completed_reservation, 'completed', 45000, 'completed', now() - interval '30 minutes', 1200, (select auth.uid()), (select auth.uid()))
  returning id into v_dine_completed;
  insert into public.business_orders (business_id, order_kind, reservation_id, status, subtotal, kitchen_status, kitchen_started_at, kitchen_target_seconds, created_by, updated_by)
  values (p_sandbox_business_id, 'dine_in', v_active_reservation, 'open', 36500, 'preparing', now() - interval '8 minutes', 1080, (select auth.uid()), (select auth.uid()))
  returning id into v_dine_active;
  insert into public.business_orders (business_id, order_kind, status, subtotal, kitchen_status, kitchen_target_seconds, created_by, updated_by)
  values (p_sandbox_business_id, 'delivery', 'open', 36500, 'pending', 1200, (select auth.uid()), (select auth.uid()))
  returning id into v_delivery;
  insert into public.business_orders (business_id, order_kind, status, subtotal, kitchen_status, kitchen_completed_at, kitchen_target_seconds, created_by, updated_by)
  values (p_sandbox_business_id, 'pickup', 'completed', 21500, 'completed', now() - interval '50 minutes', 900, (select auth.uid()), (select auth.uid()))
  returning id into v_pickup;
  insert into public.business_orders (business_id, order_kind, status, subtotal, kitchen_status, kitchen_target_seconds, created_by, updated_by)
  values (p_sandbox_business_id, 'delivery', 'cancelled', 14500, 'pending', 600, (select auth.uid()), (select auth.uid()))
  returning id into v_cancelled_delivery;

  insert into public.business_order_items (business_id, order_id, order_kind, menu_item_id, name_snapshot, unit_price_snapshot, quantity)
  select p_sandbox_business_id, orders.order_id, orders.order_kind, item.id, item.name, item.price, orders.quantity
  from (values
    (v_dine_completed, 'dine_in', 'Ojo de bife, papas crocantes y demi-glace', 1),
    (v_dine_completed, 'dine_in', 'Tortilla de papa al hierro', 1),
    (v_dine_active, 'dine_in', 'Pesca del día, hojas verdes y limón', 1),
    (v_dine_active, 'dine_in', 'Tortilla de papa al hierro', 1),
    (v_delivery, 'delivery', 'Ojo de bife, papas crocantes y demi-glace', 1),
    (v_delivery, 'delivery', 'Burrata, tomates asados y masa madre', 1),
    (v_pickup, 'pickup', 'Sorrentinos de calabaza y manteca de salvia', 1),
    (v_cancelled_delivery, 'delivery', 'Burrata, tomates asados y masa madre', 1)
  ) as orders(order_id, order_kind, item_name, quantity)
  join public.menu_items item on item.business_id = p_sandbox_business_id and item.name = orders.item_name;

  -- Order-item triggers create the corresponding kitchen ticket and its items.
  -- Here we only place those tickets in representative operational states.
  update public.business_kitchen_tickets
  set
    status = case order_id
      when v_dine_completed then 'completed'
      when v_dine_active then 'preparing'
      when v_pickup then 'completed'
      else 'pending'
    end,
    started_at = case
      when order_id = v_dine_completed then now() - interval '45 minutes'
      when order_id = v_dine_active then now() - interval '8 minutes'
      when order_id = v_pickup then now() - interval '70 minutes'
      else null
    end,
    completed_at = case
      when order_id = v_dine_completed then now() - interval '30 minutes'
      when order_id = v_pickup then now() - interval '50 minutes'
      else null
    end,
    updated_by = (select auth.uid()),
    updated_at = now()
  where business_id = p_sandbox_business_id
    and order_id in (v_dine_completed, v_dine_active, v_delivery, v_pickup);

  insert into public.business_shipping_orders (business_id, order_id, order_kind, business_date, scheduled_time, client_name, client_phone, address_snapshot, note, source, needs_acceptance, tracking_code, preferred_payment_method, shipping_status, eta_minutes, accepted_at, preparing_at, ready_at, completed_at, cancelled_at, created_by, updated_by)
  values
    (p_sandbox_business_id, v_delivery, 'delivery', current_date, (current_time + interval '35 minutes')::time, 'Lucía Demo', '1112345678', 'Av. Bunge 580, Pinamar', 'Sin cebolla en la guarnición.', 'web', true, 'PED-DEMO000001', 'mercado_pago', 'confirmed', 45, null, null, null, null, null, (select auth.uid()), (select auth.uid())),
    (p_sandbox_business_id, v_pickup, 'pickup', current_date, (current_time - interval '50 minutes')::time, 'Mateo Demo', '1112345679', '', 'Retira por mostrador.', 'manual', false, 'PED-DEMO000002', 'card', 'completed', 20, now() - interval '75 minutes', now() - interval '70 minutes', now() - interval '55 minutes', now() - interval '50 minutes', null, (select auth.uid()), (select auth.uid())),
    (p_sandbox_business_id, v_cancelled_delivery, 'delivery', current_date, (current_time + interval '55 minutes')::time, 'Sofía Demo', '1112345680', 'Shaw 311, Pinamar', 'Cancelado antes de cocina.', 'web', true, 'PED-DEMO000003', 'transfer', 'cancelled', 35, null, null, null, null, now() - interval '10 minutes', (select auth.uid()), (select auth.uid()));

  insert into public.business_payment_operations (business_id, operation_key, order_id, reservation_id, cash_session_id, request_payload, result_snapshot, total_amount, created_by)
  values (p_sandbox_business_id, 'sandbox-payment-v4', v_dine_completed, v_completed_reservation, v_cash_session,
    '[{"method":"cash","amount":20000},{"method":"card","amount":25000}]'::jsonb,
    '{"status":"paid","source":"sandbox"}'::jsonb, 45000, (select auth.uid()))
  returning id into v_operation;
  insert into public.business_payments (business_id, operation_id, order_id, reservation_id, cash_session_id, payment_method, amount, created_by)
  values
    (p_sandbox_business_id, v_operation, v_dine_completed, v_completed_reservation, v_cash_session, 'cash', 20000, (select auth.uid())),
    (p_sandbox_business_id, v_operation, v_dine_completed, v_completed_reservation, v_cash_session, 'card', 25000, (select auth.uid()));

  insert into public.stock_movements (business_id, product_id, movement_type, origin, quantity_delta, product_name_snapshot, unit_snapshot, unit_cost_snapshot, operation_key, reference_id, label, detail, created_by)
  select p_sandbox_business_id, product.id, 'consumption', 'recipe', consumed.quantity_delta, product.name, product.unit, product.unit_cost,
    ('sandbox-consumption-v4-' || product.id::text), v_dine_completed::text, 'Consumo de receta de práctica', consumed.detail, (select auth.uid())
  from (values
    ('Papa blanca', -0.70::numeric, 'Dos porciones entre tortilla y guarnición.'),
    ('Huevo de campo', -10::numeric, 'Dos tortillas de práctica.'),
    ('Cebolla', -0.24::numeric, 'Dos tortillas de práctica.'),
    ('Aceite de oliva extra virgen', -0.09::numeric, 'Tortilla y preparación.'),
    ('Ojo de bife', -0.35::numeric, 'Una porción de 350 g.'),
    ('Manteca', -0.025::numeric, 'Terminación del bife.'),
    ('Filet de merluza', -0.28::numeric, 'Una porción de 280 g.'),
    ('Mix de hojas verdes', -0.12::numeric, 'Guarnición de pesca.'),
    ('Limón', -0.045::numeric, 'Terminación de pesca.')
  ) as consumed(name, quantity_delta, detail)
  join public.stock_products product on product.business_id = p_sandbox_business_id and product.name = consumed.name;

  update public.business_sandboxes
  set seed_version = 'v4', last_reset_at = now()
  where sandbox_business_id = p_sandbox_business_id;
end;
$$;

revoke all on function public.seed_business_sandbox_showcase(uuid) from public, anon, authenticated;
grant execute on function public.seed_business_sandbox_showcase(uuid) to authenticated;

commit;
