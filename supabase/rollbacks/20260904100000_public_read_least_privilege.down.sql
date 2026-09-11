begin;

revoke select (
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
) on table public.businesses from anon;

drop policy if exists businesses_select_active_public_site
  on public.businesses;

alter function public.service_get_public_business_ordering_snapshot(text)
  security invoker;

revoke all on function public.service_get_public_business_ordering_snapshot(
  text
) from public, anon, authenticated;

grant execute on function public.service_get_public_business_ordering_snapshot(
  text
) to service_role;

commit;
