begin;

-- A sandbox is a separate tenant. Demo rows never share the real business_id.
create table if not exists public.business_sandboxes (
  id uuid primary key default gen_random_uuid(),
  source_business_id uuid not null unique references public.businesses(id) on delete cascade,
  sandbox_business_id uuid not null unique references public.businesses(id) on delete cascade,
  created_by uuid not null references auth.users(id) on delete restrict,
  seed_version text not null default 'v1',
  last_reset_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_sandboxes_distinct_businesses_check check (source_business_id <> sandbox_business_id)
);

alter table public.business_sandboxes enable row level security;
alter table public.business_sandboxes force row level security;

drop policy if exists business_sandboxes_select_owner on public.business_sandboxes;
create policy business_sandboxes_select_owner on public.business_sandboxes for select to authenticated using (
  (select auth.uid()) is not null
  and (select private.has_business_role(source_business_id, array['owner']::text[]))
);

revoke all on table public.business_sandboxes from public, anon, authenticated;
grant select on table public.business_sandboxes to authenticated;

drop trigger if exists tango_set_business_sandboxes_updated_at on public.business_sandboxes;
create trigger tango_set_business_sandboxes_updated_at before update on public.business_sandboxes
for each row execute function private.tango_set_updated_at();

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
  table_id uuid;
  reservation_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Se requiere una sesión autenticada.' using errcode = '42501';
  end if;

  select link.source_business_id
  into resolved_source_business_id
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
    (new_sandbox_id, 'monday', true, '19:00', '02:00'),
    (new_sandbox_id, 'tuesday', true, '19:00', '02:00'),
    (new_sandbox_id, 'wednesday', true, '19:00', '02:00'),
    (new_sandbox_id, 'thursday', true, '19:00', '02:00'),
    (new_sandbox_id, 'friday', true, '19:00', '02:00'),
    (new_sandbox_id, 'saturday', true, '19:00', '02:00'),
    (new_sandbox_id, 'sunday', true, '19:00', '02:00');

  insert into public.reservation_rules (business_id, slot_duration_minutes, max_reservations_per_slot, min_notice_minutes, max_days_ahead, requires_confirmation, allow_cancellation, cancellation_limit_hours)
  values (new_sandbox_id, 30, 6, 30, 14, true, true, 4);

  insert into public.services (business_id, name, description, duration_minutes, capacity, price, is_active)
  values (new_sandbox_id, 'Reserva general', 'Servicio de práctica.', 120, 40, null, true)
  returning id into service_id;

  insert into public.floor_tables (business_id, label, seats, x, y, width, height, shape)
  values (new_sandbox_id, 'Mesa demo 1', 4, 120, 120, 130, 90, 'square') returning id into table_id;
  insert into public.floor_tables (business_id, label, seats, x, y, width, height, shape)
  values (new_sandbox_id, 'Mesa demo 2', 6, 300, 120, 160, 90, 'rectangle');

  insert into public.menu_categories (business_id, name, description, sort_order)
  values (new_sandbox_id, 'Práctica', 'Productos ficticios para pruebas.', 0) returning id into category_id;
  insert into public.menu_items (business_id, category_id, name, description, price, sort_order) values
    (new_sandbox_id, category_id, 'Plato demo', 'Producto ficticio.', 12000, 0),
    (new_sandbox_id, category_id, 'Bebida demo', 'Producto ficticio.', 3500, 1);

  insert into public.customers (business_id, full_name, email, phone, notes)
  values (new_sandbox_id, 'Ana Demo', 'ana.demo@example.invalid', '1100000001', 'Cliente ficticio.');
  insert into public.reservations (business_id, service_id, customer_name, customer_phone, customer_email, reservation_date, reservation_time, party_size, status, notes, source)
  values (new_sandbox_id, service_id, 'Ana Demo', '1100000001', 'ana.demo@example.invalid', current_date, '20:00', 4, 'pending', 'Reserva creada para practicar.', 'manual')
  returning id into reservation_id;
  insert into public.reservation_table_assignments (business_id, reservation_id, table_id, assigned_by)
  values (new_sandbox_id, reservation_id, table_id, (select auth.uid()));

  insert into public.business_sandboxes (source_business_id, sandbox_business_id, created_by, seed_version, last_reset_at)
  values (source_business.id, new_sandbox_id, (select auth.uid()), 'v1', now())
  on conflict (source_business_id) do update set
    sandbox_business_id = excluded.sandbox_business_id,
    created_by = excluded.created_by,
    seed_version = excluded.seed_version,
    last_reset_at = excluded.last_reset_at;

  if existing_sandbox_id is not null then
    delete from public.businesses where id = existing_sandbox_id;
  end if;

  return jsonb_build_object('sandboxBusinessId', new_sandbox_id, 'sandboxSlug', sandbox_slug,
    'sandboxName', source_business.name || ' — Simulación', 'seedVersion', 'v1', 'resetAt', now());
end;
$$;

revoke all on function public.create_or_reset_business_sandbox(uuid, text) from public, anon, authenticated;
grant execute on function public.create_or_reset_business_sandbox(uuid, text) to authenticated;

commit;
