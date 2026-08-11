do $$
declare
  missing_count integer;
  unsafe_count integer;
begin
  select count(*)
  into missing_count
  from (
    values
      ('kitchen_status'),
      ('kitchen_started_at'),
      ('kitchen_ready_at'),
      ('kitchen_completed_at'),
      ('kitchen_target_seconds')
  ) as expected(column_name)
  where not exists (
    select 1
    from information_schema.columns as column_info
    where column_info.table_schema = 'public'
      and column_info.table_name = 'business_orders'
      and column_info.column_name = expected.column_name
  );

  if missing_count <> 0 then
    raise exception 'Kitchen columns are incomplete.';
  end if;

  select count(*)
  into missing_count
  from (
    values
      ('business_kitchen_tickets'),
      ('business_kitchen_ticket_items'),
      ('business_kitchen_operations')
  ) as expected(table_name)
  where to_regclass(
    'public.' || expected.table_name
  ) is null;

  if missing_count <> 0 then
    raise exception 'Kitchen tables are incomplete.';
  end if;

  select count(*)
  into unsafe_count
  from pg_class as relation
  join pg_namespace as namespace
    on namespace.oid = relation.relnamespace
  where namespace.nspname = 'public'
    and relation.relname in (
      'business_kitchen_tickets',
      'business_kitchen_ticket_items',
      'business_kitchen_operations'
    )
    and (
      not relation.relrowsecurity
      or not relation.relforcerowsecurity
    );

  if unsafe_count <> 0 then
    raise exception 'Kitchen tables require forced RLS.';
  end if;

  select count(*)
  into unsafe_count
  from information_schema.role_table_grants as grant_row
  where grant_row.table_schema = 'public'
    and grant_row.table_name in (
      'business_kitchen_tickets',
      'business_kitchen_ticket_items',
      'business_kitchen_operations'
    )
    and grant_row.grantee in (
      'anon',
      'authenticated'
    )
    and grant_row.privilege_type in (
      'SELECT',
      'INSERT',
      'UPDATE',
      'DELETE',
      'TRUNCATE',
      'REFERENCES',
      'TRIGGER'
    );

  if unsafe_count <> 0 then
    raise exception 'Kitchen technical tables expose direct grants.';
  end if;

  if not has_table_privilege(
    'service_role',
    'public.business_kitchen_tickets',
    'SELECT'
  )
    or not has_table_privilege(
      'service_role',
      'public.business_kitchen_operations',
      'DELETE'
    ) then
    raise exception 'service_role Kitchen maintenance grants are incomplete.';
  end if;

  if to_regprocedure(
    'public.get_business_kitchen_snapshot(uuid,date)'
  ) is null then
    raise exception 'Kitchen snapshot RPC is missing.';
  end if;

  if to_regprocedure(
    'public.set_business_kitchen_command_status(uuid,uuid,uuid,text,text)'
  ) is null then
    raise exception 'Kitchen status RPC is missing.';
  end if;

  if to_regprocedure(
    'private.sync_business_order_item_kitchen_delta()'
  ) is null then
    raise exception 'Kitchen delta trigger helper is missing.';
  end if;

  if not exists (
    select 1
    from pg_trigger as trigger_row
    where trigger_row.tgrelid =
      'public.business_order_items'::regclass
      and trigger_row.tgname =
        'business_order_items_sync_kitchen_delta'
      and not trigger_row.tgisinternal
  ) then
    raise exception 'Kitchen order item trigger is missing.';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.get_business_kitchen_snapshot(uuid,date)',
    'EXECUTE'
  ) then
    raise exception 'Authenticated cannot execute Kitchen snapshot.';
  end if;

  if not has_function_privilege(
    'authenticated',
    'public.set_business_kitchen_command_status(uuid,uuid,uuid,text,text)',
    'EXECUTE'
  ) then
    raise exception 'Authenticated cannot execute Kitchen status mutation.';
  end if;

  if has_function_privilege(
    'anon',
    'public.get_business_kitchen_snapshot(uuid,date)',
    'EXECUTE'
  )
    or has_function_privilege(
      'anon',
      'public.set_business_kitchen_command_status(uuid,uuid,uuid,text,text)',
      'EXECUTE'
    ) then
    raise exception 'Kitchen RPC EXECUTE is exposed to anon or PUBLIC.';
  end if;

  if has_function_privilege(
    'authenticated',
    'private.sync_business_order_item_kitchen_delta()',
    'EXECUTE'
  )
    or has_function_privilege(
      'anon',
      'private.sync_business_order_item_kitchen_delta()',
      'EXECUTE'
    ) then
    raise exception 'Kitchen private trigger helper is executable by API roles.';
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.business_orders'::regclass
      and conname = 'business_orders_kitchen_status_check'
  ) then
    raise exception 'Kitchen status constraint is missing.';
  end if;

end;
$$;

select 'PASS' as kitchen_operational_write_postflight;
