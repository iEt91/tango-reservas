begin;

-- Los datos p\u00fablicos del local los modifica exclusivamente su due\u00f1o autenticado.
-- La pol\u00edtica no habilita acceso an\u00f3nimo ni acceso entre negocios.
drop policy if exists businesses_update_owner on public.businesses;

create policy businesses_update_owner
on public.businesses
for update
to authenticated
using (
  (select auth.uid()) is not null
  and (
    select private.has_business_role(
      id,
      array['owner']::text[]
    )
  )
)
with check (
  (select auth.uid()) is not null
  and (
    select private.has_business_role(
      id,
      array['owner']::text[]
    )
  )
);

grant update on table public.businesses to authenticated;

commit;
