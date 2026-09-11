begin;

-- La web pública sólo puede leer esta proyección de negocios activos. Las
-- columnas no concedidas permanecen inaccesibles para el rol anon.
grant select (
  name,
  slug,
  description,
  address,
  phone,
  whatsapp,
  instagram_url,
  hero_eyebrow,
  hero_title,
  hero_subtitle,
  cta_label,
  secondary_cta_label,
  show_menu,
  show_reservation,
  show_whatsapp_button,
  show_gallery,
  show_location,
  show_delivery
) on table public.businesses to anon;

drop policy if exists businesses_select_active_public_site
  on public.businesses;

create policy businesses_select_active_public_site
on public.businesses
for select
to anon
using (status = 'active');

-- El snapshot de menú es una proyección read-only de entidades activas. La
-- función no acepta IDs de negocio, valida el slug y no devuelve datos PII.
alter function public.service_get_public_business_ordering_snapshot(text)
  security definer;

alter function public.service_get_public_business_ordering_snapshot(text)
  set search_path = '';

revoke all on function public.service_get_public_business_ordering_snapshot(
  text
) from public, anon, authenticated;

grant execute on function public.service_get_public_business_ordering_snapshot(
  text
) to anon, service_role;

commit;
