begin;

create or replace function public.seed_business_sandbox_reservation_grid(p_sandbox_business_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  source_business_id uuid;
  service_id uuid;
  table_row record;
  day_offset integer;
  seat_index integer;
  reservation_id uuid;
  reservation_status text;
begin
  if (select auth.uid()) is null then raise exception 'Se requiere una sesión autenticada.' using errcode = '42501'; end if;
  select sandbox.source_business_id into source_business_id
  from public.business_sandboxes as sandbox
  where sandbox.sandbox_business_id = p_sandbox_business_id;
  if source_business_id is null or not (select private.has_business_role(source_business_id, array['owner']::text[])) then
    raise exception 'Solo el dueño puede preparar esta simulación.' using errcode = '42501';
  end if;

  insert into public.floor_tables (business_id, label, seats, x, y, width, height, shape)
  select p_sandbox_business_id, item.label, item.seats, item.x, item.y, item.width, 90, item.shape
  from (values
    ('Mesa demo 3', 2, 72::numeric, 20::numeric, 110::numeric, 'round'),
    ('Mesa demo 4', 4, 16::numeric, 52::numeric, 130::numeric, 'square'),
    ('Mesa demo 5', 4, 42::numeric, 52::numeric, 130::numeric, 'square'),
    ('Mesa demo 6', 6, 68::numeric, 52::numeric, 160::numeric, 'rectangle'),
    ('Mesa demo 7', 8, 38::numeric, 76::numeric, 190::numeric, 'rectangle')
  ) as item(label, seats, x, y, width, shape)
  where not exists (select 1 from public.floor_tables t where t.business_id = p_sandbox_business_id and t.label = item.label);

  select id into service_id from public.services where business_id = p_sandbox_business_id and is_active order by created_at limit 1;
  if service_id is null then raise exception 'La simulación no tiene un servicio de reserva.'; end if;

  delete from public.reservations where business_id = p_sandbox_business_id;

  for day_offset in -14..14 loop
    seat_index := 0;
    for table_row in select id, seats from public.floor_tables where business_id = p_sandbox_business_id and is_active order by label limit 7 loop
      seat_index := seat_index + 1;
      reservation_status := case
        when day_offset < 0 then case (abs(day_offset) + seat_index) % 3 when 0 then 'completed' when 1 then 'cancelled' else 'no_show' end
        when day_offset = 0 then case seat_index % 3 when 0 then 'confirmed' when 1 then 'pending' else 'completed' end
        else case seat_index % 3 when 0 then 'confirmed' else 'pending' end
      end;
      insert into public.reservations (business_id, service_id, customer_name, customer_phone, customer_email, reservation_date, reservation_time, party_size, status, notes, source)
      values (
        p_sandbox_business_id, service_id,
        (array['Ana','Bruno','Carla','Diego','Elena','Franco','Gabriela'])[((day_offset + seat_index + 28) % 7) + 1] || ' Demo',
        '11' || lpad(((abs(day_offset) * 10) + seat_index)::text, 8, '0'),
        'demo' || day_offset::text || '-' || seat_index::text || '@example.invalid',
        current_date + day_offset, ('19:00'::time + ((seat_index - 1) * interval '20 minutes'))::time,
        least(table_row.seats, 2 + ((abs(day_offset) + seat_index) % 4)), reservation_status,
        case reservation_status when 'completed' then 'Servicio finalizado.' when 'cancelled' then 'Cancelada por el cliente.' when 'no_show' then 'El cliente no asistió.' when 'confirmed' then 'Confirmada por WhatsApp.' else 'Pendiente de confirmación.' end,
        'manual'
      ) returning id into reservation_id;
      insert into public.reservation_table_assignments (business_id, reservation_id, table_id, assigned_by)
      values (p_sandbox_business_id, reservation_id, table_row.id, (select auth.uid()));
    end loop;
  end loop;

  update public.business_sandboxes set seed_version = 'v3', last_reset_at = now() where sandbox_business_id = p_sandbox_business_id;
end;
$$;

revoke all on function public.seed_business_sandbox_reservation_grid(uuid) from public, anon, authenticated;
grant execute on function public.seed_business_sandbox_reservation_grid(uuid) to authenticated;

commit;
