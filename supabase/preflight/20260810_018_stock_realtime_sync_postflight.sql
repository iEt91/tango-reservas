do $$
declare
  unsafe_grants integer;
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'stock_movements'
  ) then
    raise exception 'stock_movements is not published to Supabase Realtime.';
  end if;

  if exists (
    select 1
    from pg_class as relation
    where relation.oid = 'public.stock_movements'::regclass
      and (
        not relation.relrowsecurity
        or not relation.relforcerowsecurity
      )
  ) then
    raise exception 'stock_movements must keep forced RLS.';
  end if;

  if not exists (
    select 1
    from pg_policies
    where schemaname = 'public'
      and tablename = 'stock_movements'
      and policyname = 'stock_movements_select_module_member'
      and cmd = 'SELECT'
      and 'authenticated' = any(roles)
  ) then
    raise exception 'stock_movements tenant SELECT policy is missing.';
  end if;

  if not has_table_privilege(
    'authenticated',
    'public.stock_movements',
    'SELECT'
  ) then
    raise exception 'Authenticated Stock SELECT grant is missing.';
  end if;

  if has_table_privilege(
    'anon',
    'public.stock_movements',
    'SELECT'
  ) then
    raise exception 'Anon must not read stock_movements.';
  end if;

  select count(*)
  into unsafe_grants
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name = 'stock_movements'
    and grantee in ('anon', 'authenticated')
    and privilege_type in (
      'INSERT',
      'UPDATE',
      'DELETE',
      'TRUNCATE',
      'REFERENCES',
      'TRIGGER'
    );

  if unsafe_grants <> 0 then
    raise exception 'Realtime must not introduce direct Stock DML grants.';
  end if;
end;
$$;

select 'PASS' as stock_realtime_sync_postflight;
