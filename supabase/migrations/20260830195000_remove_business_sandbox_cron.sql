begin;

-- The sandbox is refreshed on access using the Buenos Aires clock. Keeping a
-- background job would write demo data even when nobody is looking at it.
do $$
declare
  v_job_id bigint;
begin
  if exists (select 1 from pg_namespace where nspname = 'cron') then
    execute $sql$
      select jobid from cron.job
      where jobname = 'refresh-business-sandbox-agendas'
    $sql$ into v_job_id;

    if v_job_id is not null then
      execute format('select cron.unschedule(%s)', v_job_id);
    end if;
  end if;
end;
$$;

drop function if exists private.refresh_all_business_sandbox_reservation_windows();

-- Recompile the access-time implementation for databases that previously had
-- the scheduled version installed.
create or replace function private.ensure_business_sandbox_reservation_window(
  p_sandbox_business_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_today date := (timezone('America/Argentina/Buenos_Aires', now()))::date;
  v_service_id uuid;
  v_table record;
  v_day_offset integer;
  v_table_index integer;
  v_status text;
begin
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_sandbox_business_id::text, 0)
  );

  select service.id into v_service_id
  from public.services as service
  where service.business_id = p_sandbox_business_id
    and service.is_active
  order by service.created_at
  limit 1;

  if v_service_id is null then
    return;
  end if;

  -- Preserve history, but make past demo reservations reach a terminal state.
  -- Reservations tied to an actual sandbox order keep their established status.
  update public.reservations as reservation
  set status = case ((extract(minute from reservation.reservation_time)::integer / 20) % 3)
    when 0 then 'completed'
    when 1 then 'cancelled'
    else 'no_show'
  end
  where reservation.business_id = p_sandbox_business_id
    and reservation.customer_email like 'demo%@example.invalid'
    and reservation.reservation_date < v_today
    and reservation.status in ('pending', 'confirmed')
    and not exists (
      select 1
      from public.business_orders as business_order
      where business_order.business_id = reservation.business_id
        and business_order.reservation_id = reservation.id
    );

  -- Only fills missing table slots. Existing records stay as auditable demo
  -- history, while a new seventh reservation is appended at the moving edge.
  for v_day_offset in -14..14 loop
    v_table_index := 0;
    for v_table in
      select floor_table.id, floor_table.seats
      from public.floor_tables as floor_table
      where floor_table.business_id = p_sandbox_business_id
        and floor_table.is_active
      order by floor_table.label
      limit 7
    loop
      v_table_index := v_table_index + 1;
      v_status := case
        when v_day_offset < 0 then case (abs(v_day_offset) + v_table_index) % 3
          when 0 then 'completed' when 1 then 'cancelled' else 'no_show' end
        when v_day_offset = 0 then case v_table_index % 3
          when 0 then 'confirmed' when 1 then 'pending' else 'completed' end
        else case v_table_index % 3 when 0 then 'confirmed' else 'pending' end
      end;

      if not exists (
        select 1
        from public.reservation_table_assignments as assignment
        join public.reservations as reservation
          on reservation.business_id = assignment.business_id
         and reservation.id = assignment.reservation_id
        where assignment.business_id = p_sandbox_business_id
          and assignment.table_id = v_table.id
          and reservation.reservation_date = v_today + v_day_offset
      ) then
        insert into public.reservations (
          business_id, service_id, customer_name, customer_phone, customer_email,
          reservation_date, reservation_time, party_size, status, notes, source
        )
        values (
          p_sandbox_business_id, v_service_id,
          (array['Ana', 'Bruno', 'Carla', 'Diego', 'Elena', 'Franco', 'Gabriela'])[((v_day_offset + v_table_index + 28) % 7) + 1] || ' Demo',
          '11' || lpad(((abs(v_day_offset) * 10) + v_table_index)::text, 8, '0'),
          'demo' || v_day_offset::text || '-' || v_table_index::text || '@example.invalid',
          v_today + v_day_offset,
          ('19:00'::time + ((v_table_index - 1) * interval '20 minutes'))::time,
          least(v_table.seats, 2 + ((abs(v_day_offset) + v_table_index) % 4)),
          v_status,
          case v_status
            when 'completed' then 'Servicio finalizado.'
            when 'cancelled' then 'Cancelada por el cliente.'
            when 'no_show' then 'El cliente no asistió.'
            when 'confirmed' then 'Confirmada por WhatsApp.'
            else 'Pendiente de confirmación.'
          end,
          'manual'
        );

        insert into public.reservation_table_assignments (
          business_id, reservation_id, table_id
        )
        select p_sandbox_business_id, reservation.id, v_table.id
        from public.reservations as reservation
        where reservation.business_id = p_sandbox_business_id
          and reservation.customer_email = 'demo' || v_day_offset::text || '-' || v_table_index::text || '@example.invalid'
          and reservation.reservation_date = v_today + v_day_offset
        order by reservation.created_at desc
        limit 1;
      end if;
    end loop;
  end loop;
end;
$$;

revoke all on function private.ensure_business_sandbox_reservation_window(uuid)
  from public, anon, authenticated;

create or replace function public.refresh_business_sandbox_reservation_window(
  p_sandbox_business_id uuid
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_source_business_id uuid;
begin
  if (select auth.uid()) is null then
    raise exception 'Se requiere una sesión autenticada.' using errcode = '42501';
  end if;

  select sandbox.source_business_id into v_source_business_id
  from public.business_sandboxes as sandbox
  where sandbox.sandbox_business_id = p_sandbox_business_id;

  if v_source_business_id is null then
    return;
  end if;

  if not (select private.has_business_role(v_source_business_id, array['owner']::text[])) then
    return;
  end if;

  perform private.ensure_business_sandbox_reservation_window(p_sandbox_business_id);
end;
$$;

revoke all on function public.refresh_business_sandbox_reservation_window(uuid)
  from public, anon, authenticated;
grant execute on function public.refresh_business_sandbox_reservation_window(uuid)
  to authenticated;


commit;
