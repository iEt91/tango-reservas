begin;

do $$
begin
  if exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'stock_movements'
  ) then
    alter publication supabase_realtime
      drop table public.stock_movements;
  end if;
end;
$$;

commit;
