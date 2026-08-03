begin;

create or replace function public.replace_business_hours(
  p_business_id uuid,
  p_hours jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  item jsonb;
  day_key text;
  is_open_value boolean;
  open_text text;
  close_text text;
  break_start_text text;
  break_end_text text;
  open_minutes integer;
  close_minutes integer;
  break_start_minutes integer;
  break_end_minutes integer;
  result jsonb;
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

  if jsonb_typeof(p_hours) <> 'array'
    or jsonb_array_length(p_hours) <> 7 then
    raise exception 'Exactly seven business days are required.'
      using errcode = '22023';
  end if;

  if (
    select count(distinct value ->> 'day_of_week')
    from jsonb_array_elements(p_hours)
  ) <> 7 then
    raise exception 'Business days must be unique.'
      using errcode = '22023';
  end if;

  for item in
    select value
    from jsonb_array_elements(p_hours)
  loop
    day_key := item ->> 'day_of_week';

    if day_key is null or day_key not in (
      'monday',
      'tuesday',
      'wednesday',
      'thursday',
      'friday',
      'saturday',
      'sunday'
    ) then
      raise exception 'Invalid business day.'
        using errcode = '22023';
    end if;

    if item ->> 'is_open' not in ('true', 'false') then
      raise exception 'is_open must be boolean.'
        using errcode = '22023';
    end if;

    is_open_value := (item ->> 'is_open')::boolean;
    open_text := item ->> 'open_time';
    close_text := item ->> 'close_time';
    break_start_text := nullif(item ->> 'break_start_time', '');
    break_end_text := nullif(item ->> 'break_end_time', '');

    if open_text is null
      or close_text is null
      or open_text !~ '^(?:[01][0-9]|2[0-3]):(?:00|30)$'
      or close_text !~ '^(?:[01][0-9]|2[0-3]):(?:00|30)$' then
      raise exception 'Business times must use HH:00 or HH:30.'
        using errcode = '22023';
    end if;

    if (break_start_text is null and break_end_text is not null)
      or (break_start_text is not null and break_end_text is null) then
      raise exception 'Break times must be provided together.'
        using errcode = '22023';
    end if;

    if break_start_text is not null and (
      break_start_text !~ '^(?:[01][0-9]|2[0-3]):(?:00|30)$'
      or break_end_text !~ '^(?:[01][0-9]|2[0-3]):(?:00|30)$'
    ) then
      raise exception 'Break times must use HH:00 or HH:30.'
        using errcode = '22023';
    end if;

    if is_open_value then
      open_minutes :=
        split_part(open_text, ':', 1)::integer * 60
        + split_part(open_text, ':', 2)::integer;
      close_minutes :=
        split_part(close_text, ':', 1)::integer * 60
        + split_part(close_text, ':', 2)::integer;

      if close_minutes <= open_minutes then
        close_minutes := close_minutes + 1440;
      end if;

      if close_minutes - open_minutes > 1440 then
        raise exception 'Business hours exceed one day.'
          using errcode = '22023';
      end if;

      if break_start_text is not null then
        break_start_minutes :=
          split_part(break_start_text, ':', 1)::integer * 60
          + split_part(break_start_text, ':', 2)::integer;
        break_end_minutes :=
          split_part(break_end_text, ':', 1)::integer * 60
          + split_part(break_end_text, ':', 2)::integer;

        if break_start_minutes <= open_minutes then
          break_start_minutes := break_start_minutes + 1440;
        end if;

        if break_end_minutes <= break_start_minutes then
          break_end_minutes := break_end_minutes + 1440;
        end if;

        if not (
          open_minutes < break_start_minutes
          and break_start_minutes < break_end_minutes
          and break_end_minutes < close_minutes
        ) then
          raise exception 'Break must be inside business hours.'
            using errcode = '22023';
        end if;
      end if;
    end if;

    insert into public.business_hours (
      business_id,
      day_of_week,
      is_open,
      open_time,
      close_time,
      break_start_time,
      break_end_time,
      updated_at
    )
    values (
      p_business_id,
      day_key,
      is_open_value,
      open_text::time,
      close_text::time,
      break_start_text::time,
      break_end_text::time,
      now()
    )
    on conflict (business_id, day_of_week)
    do update set
      is_open = excluded.is_open,
      open_time = excluded.open_time,
      close_time = excluded.close_time,
      break_start_time = excluded.break_start_time,
      break_end_time = excluded.break_end_time,
      updated_at = now();
  end loop;

  select jsonb_agg(
    jsonb_build_object(
      'id', hours.id,
      'business_id', hours.business_id,
      'day_of_week', hours.day_of_week,
      'is_open', hours.is_open,
      'open_time', to_char(hours.open_time, 'HH24:MI'),
      'close_time', to_char(hours.close_time, 'HH24:MI'),
      'break_start_time', case
        when hours.break_start_time is null then null
        else to_char(hours.break_start_time, 'HH24:MI')
      end,
      'break_end_time', case
        when hours.break_end_time is null then null
        else to_char(hours.break_end_time, 'HH24:MI')
      end,
      'updated_at', hours.updated_at
    )
    order by case hours.day_of_week
      when 'monday' then 1
      when 'tuesday' then 2
      when 'wednesday' then 3
      when 'thursday' then 4
      when 'friday' then 5
      when 'saturday' then 6
      when 'sunday' then 7
    end
  )
  into result
  from public.business_hours as hours
  where hours.business_id = p_business_id;

  return coalesce(result, '[]'::jsonb);
end;
$$;

revoke all on function public.replace_business_hours(uuid, jsonb)
  from public, anon, authenticated;

grant execute on function public.replace_business_hours(uuid, jsonb)
  to authenticated;

revoke insert, update, delete on table public.business_hours
  from authenticated;

commit;
