do $$
declare
  anon_table_grants integer;
  anon_service_exec integer;
  auth_service_exec integer;
  service_exec integer;
  forced_rls boolean;
  operation_constraint text;
begin
  select count(*)
  into anon_table_grants
  from information_schema.role_table_grants
  where table_schema = 'public'
    and table_name in (
      'businesses',
      'menu_categories',
      'menu_category_products',
      'menu_items',
      'business_orders',
      'business_order_items',
      'business_shipping_orders',
      'business_shipping_operations',
      'business_public_request_limits'
    )
    and grantee = 'anon';

  if anon_table_grants <> 0 then
    raise exception 'Anonymous table grants were introduced.';
  end if;

  select
    c.relrowsecurity and c.relforcerowsecurity
  into forced_rls
  from pg_class as c
  where c.oid =
    'public.business_public_request_limits'::regclass;

  if forced_rls is distinct from true then
    raise exception 'Public request limits require forced RLS.';
  end if;

  select pg_get_constraintdef(oid)
  into operation_constraint
  from pg_constraint
  where conrelid =
    'public.business_shipping_operations'::regclass
    and conname =
      'business_shipping_operations_type_check';

  if operation_constraint is null
    or position(
      'public_create'
      in operation_constraint
    ) = 0 then
    raise exception 'public_create operation evidence is not allowed.';
  end if;

  select count(*)
  into anon_service_exec
  from (
    values
      ('public.service_consume_business_public_request_limit(uuid,text,text,integer,integer)'::regprocedure),
      ('public.service_get_public_business_ordering_snapshot(text)'::regprocedure),
      ('public.service_create_public_shipping_order(text,text,text,text,text,text,text,jsonb,text,text)'::regprocedure),
      ('public.service_get_public_shipping_tracking(text,text,text)'::regprocedure)
  ) as functions(oid)
  where has_function_privilege(
    'anon',
    functions.oid,
    'EXECUTE'
  );

  if anon_service_exec <> 0 then
    raise exception 'Anonymous can execute service-only public Shipping RPCs.';
  end if;

  select count(*)
  into auth_service_exec
  from (
    values
      ('public.service_consume_business_public_request_limit(uuid,text,text,integer,integer)'::regprocedure),
      ('public.service_get_public_business_ordering_snapshot(text)'::regprocedure),
      ('public.service_create_public_shipping_order(text,text,text,text,text,text,text,jsonb,text,text)'::regprocedure),
      ('public.service_get_public_shipping_tracking(text,text,text)'::regprocedure)
  ) as functions(oid)
  where has_function_privilege(
    'authenticated',
    functions.oid,
    'EXECUTE'
  );

  if auth_service_exec <> 0 then
    raise exception 'Authenticated can execute service-only public Shipping RPCs.';
  end if;

  select count(*)
  into service_exec
  from (
    values
      ('public.service_consume_business_public_request_limit(uuid,text,text,integer,integer)'::regprocedure),
      ('public.service_get_public_business_ordering_snapshot(text)'::regprocedure),
      ('public.service_create_public_shipping_order(text,text,text,text,text,text,text,jsonb,text,text)'::regprocedure),
      ('public.service_get_public_shipping_tracking(text,text,text)'::regprocedure)
  ) as functions(oid)
  where has_function_privilege(
    'service_role',
    functions.oid,
    'EXECUTE'
  );

  if service_exec <> 4 then
    raise exception 'service_role is missing E34C execute grants.';
  end if;

  if not exists (
    select 1
    from pg_proc
    where oid =
      'public.service_consume_business_public_request_limit(uuid,text,text,integer,integer)'::regprocedure
  ) then
    raise exception 'Public Shipping rate-limit helper is missing.';
  end if;

  if not exists (
    select 1
    from pg_proc
    where oid =
      'public.accept_business_shipping_order(uuid,uuid,integer,text)'::regprocedure
  ) then
    raise exception 'E34A acceptance RPC was lost.';
  end if;

  raise notice 'public_shipping_ordering_postflight: ok';
end;
$$;
