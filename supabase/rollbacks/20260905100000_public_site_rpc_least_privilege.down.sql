begin;

revoke all on function public.public_get_business_site(text)
  from public, anon, authenticated;

drop function if exists public.public_get_business_site(text);

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

create policy businesses_select_active_public_site
on public.businesses
for select
to anon
using (status = 'active');

commit;
