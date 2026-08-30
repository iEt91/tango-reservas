begin;

create or replace function public.create_or_reset_business_sandbox(p_source_business_id uuid, p_confirmation text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_business public.businesses%rowtype;
  resolved_source_business_id uuid;
  existing_sandbox_id uuid;
  new_sandbox_id uuid;
  sandbox_slug text;
  service_id uuid;
  category_id uuid;
  table_one_id uuid;
  table_two_id uuid;
  reservation_id uuid;
  seed_row record;
begin
  if (select auth.uid()) is null then
    raise exception 'Se requiere una sesión autenticada.' using errcode = '42501';
  end if;

  select link.source_business_id into resolved_source_business_id
  from public.business_sandboxes as link
  where link.sandbox_business_id = p_source_business_id;
  resolved_source_business_id := coalesce(resolved_source_business_id, p_source_business_id);

  select * into source_business from public.businesses where id = resolved_source_business_id;
  if not found then
    raise exception 'El negocio de origen no existe.' using errcode = 'P0002';
  end if;
  if not (select private.has_business_role(source_business.id, array['owner']::text[])) then
    raise exception 'Solo el dueño del negocio puede administrar su simulación.' using errcode = '42501';
  end if;
  if coalesce(p_confirmation, '') <> source_business.name then
    raise exception 'La confirmación no coincide con el nombre del negocio.' using errcode = '22023';
  end if;

  select sandbox_business_id into existing_sandbox_id
  from public.business_sandboxes where source_business_id = source_business.id for update;

  sandbox_slug := 'sandbox-' || replace(gen_random_uuid()::text, '-', '');
  insert into public.businesses (
    name, slug, category, city, description, primary_color, secondary_color, theme_id,
    hero_title, hero_subtitle, about_title, about_text, menu_title, reservation_title,
    cta_label, status, show_hero, show_about, show_gallery, show_menu, show_location,
    show_reservation, show_whatsapp_button
  ) values (
    source_business.name || ' — Simulación', sandbox_slug, source_business.category, source_business.city,
    'Entorno aislado para practicar operaciones. Los datos no afectan al local real.',
    source_business.primary_color, source_business.secondary_color, source_business.theme_id,
    'Local de simulación', 'Practicá sin afectar la operación real.', 'Datos de práctica',
    'Este entorno contiene únicamente información ficticia.', 'Menú de práctica',
    'Reservar en simulación', 'Reservar', 'draft', false, false, false, true, false, false, false
  ) returning id into new_sandbox_id;

  insert into public.business_members (business_id, user_id, role, status, display_name, phone)
  values (new_sandbox_id, (select auth.uid()), 'owner', 'active', 'Dueño de simulación', '');
  insert into public.business_hours (business_id, day_of_week, is_open, open_time, close_time) values
    (new_sandbox_id, 'monday', true, '19:00', '02:00'), (new_sandbox_id, 'tuesday', true, '19:00', '02:00'),
    (new_sandbox_id, 'wednesday', true, '19:00', '02:00'), (new_sandbox_id, 'thursday', true, '19:00', '02:00'),
    (new_sandbox_id, 'friday', true, '19:00', '02:00'), (new_sandbox_id, 'saturday', true, '19:00', '02:00'),
    (new_sandbox_id, 'sunday', true, '19:00', '02:00');
  insert into public.reservation_rules (business_id, slot_duration_minutes, max_reservations_per_slot, min_notice_minutes, max_days_ahead, requires_confirmation, allow_cancellation, cancellation_limit_hours)
  values (new_sandbox_id, 30, 6, 30, 14, true, true, 4);
  insert into public.services (business_id, name, description, duration_minutes, capacity, price, is_active)
  values (new_sandbox_id, 'Reserva general', 'Servicio de práctica.', 120, 40, null, true) returning id into service_id;

  -- Coordinates are percentages because the canvas positions tables with left/top percent.
  insert into public.floor_tables (business_id, label, seats, x, y, width, height, shape)
  values (new_sandbox_id, 'Mesa demo 1', 4, 16, 20, 130, 90, 'square') returning id into table_one_id;
  insert into public.floor_tables (business_id, label, seats, x, y, width, height, shape)
  values (new_sandbox_id, 'Mesa demo 2', 6, 48, 22, 160, 90, 'rectangle') returning id into table_two_id;

  insert into public.menu_categories (business_id, name, description, sort_order)
  values (new_sandbox_id, 'Práctica', 'Productos ficticios para pruebas.', 0) returning id into category_id;
  insert into public.menu_items (business_id, category_id, name, description, price, sort_order) values
    (new_sandbox_id, category_id, 'Plato demo', 'Producto ficticio.', 12000, 0),
    (new_sandbox_id, category_id, 'Bebida demo', 'Producto ficticio.', 3500, 1);

  insert into public.customers (business_id, full_name, email, phone, notes) values
    (new_sandbox_id, 'Ana Demo', 'ana.demo@example.invalid', '1100000001', 'Cliente ficticio.'),
    (new_sandbox_id, 'Bruno Demo', 'bruno.demo@example.invalid', '1100000002', 'Cliente ficticio.'),
    (new_sandbox_id, 'Carla Demo', 'carla.demo@example.invalid', '1100000003', 'Cliente ficticio.');

  -- The scenario is always rebuilt around today: 13 days back through 13 days ahead.
  for seed_row in
    select * from (values
      (-13, 'completed'::text, '20:00'::time, 'Ana Demo', '1100000001', 4, 'Cena completada de práctica.'),
      (-8, 'cancelled'::text, '21:00'::time, 'Bruno Demo', '1100000002', 2, 'Cancelación de práctica.'),
      (-3, 'no_show'::text, '20:30'::time, 'Carla Demo', '1100000003', 3, 'No-show de práctica.'),
      (0, 'pending'::text, '20:00'::time, 'Ana Demo', '1100000001', 4, 'Reserva creada para practicar.'),
      (1, 'confirmed'::text, '21:00'::time, 'Bruno Demo', '1100000002', 2, 'Reserva confirmada de práctica.'),
      (6, 'pending'::text, '20:30'::time, 'Carla Demo', '1100000003', 3, 'Pendiente por confirmar.'),
      (13, 'confirmed'::text, '21:30'::time, 'Ana Demo', '1100000001', 5, 'Reserva futura de práctica.')
    ) as scenario(day_offset, reservation_status, reservation_time, customer_name, customer_phone, party_size, notes)
  loop
    insert into public.reservations (business_id, service_id, customer_name, customer_phone, reservation_date, reservation_time, party_size, status, notes, source)
    values (new_sandbox_id, service_id, seed_row.customer_name, seed_row.customer_phone,
      current_date + seed_row.day_offset, seed_row.reservation_time, seed_row.party_size,
      seed_row.reservation_status, seed_row.notes, 'manual') returning id into reservation_id;
    insert into public.reservation_table_assignments (business_id, reservation_id, table_id, assigned_by)
    values (new_sandbox_id, reservation_id,
      case when seed_row.customer_name = 'Bruno Demo' then table_two_id else table_one_id end,
      (select auth.uid()));
  end loop;

  insert into public.business_sandboxes (source_business_id, sandbox_business_id, created_by, seed_version, last_reset_at)
  values (source_business.id, new_sandbox_id, (select auth.uid()), 'v2', now())
  on conflict (source_business_id) do update set sandbox_business_id = excluded.sandbox_business_id,
    created_by = excluded.created_by, seed_version = excluded.seed_version, last_reset_at = excluded.last_reset_at;
  if existing_sandbox_id is not null then
    delete from public.businesses where id = existing_sandbox_id;
  end if;

  return jsonb_build_object('sandboxBusinessId', new_sandbox_id, 'sandboxSlug', sandbox_slug,
    'sandboxName', source_business.name || ' — Simulación', 'seedVersion', 'v2', 'resetAt', now());
end;
$$;

commit;
