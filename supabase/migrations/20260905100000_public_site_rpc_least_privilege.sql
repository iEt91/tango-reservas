begin;

-- PostgREST necesita privilegio SELECT de tabla para exponer una relación. No
-- se concede porque businesses también contiene datos internos. La web pública
-- usa una función de salida fija, sin IDs ni columnas privadas.
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

create or replace function public.public_get_business_site(
  p_slug text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  normalized_slug text := lower(btrim(coalesce(p_slug, '')));
  result_value jsonb;
begin
  if char_length(normalized_slug) not between 1 and 120
    or normalized_slug !~ '^[a-z0-9][a-z0-9-]*$' then
    return null;
  end if;

  select jsonb_build_object(
    'name', business.name,
    'slug', business.slug,
    'description', business.description,
    'address', business.address,
    'phone', business.phone,
    'whatsapp', business.whatsapp,
    'instagram_url', business.instagram_url,
    'hero_eyebrow', business.hero_eyebrow,
    'hero_title', business.hero_title,
    'hero_subtitle', business.hero_subtitle,
    'cta_label', business.cta_label,
    'secondary_cta_label', business.secondary_cta_label,
    'show_menu', business.show_menu,
    'show_reservation', business.show_reservation,
    'show_whatsapp_button', business.show_whatsapp_button,
    'show_gallery', business.show_gallery,
    'show_location', business.show_location,
    'show_delivery', business.show_delivery
  )
  into result_value
  from public.businesses as business
  where lower(business.slug) = normalized_slug
    and business.status = 'active'
  limit 1;

  return result_value;
end;
$$;

revoke all on function public.public_get_business_site(text)
  from public, anon, authenticated;

grant execute on function public.public_get_business_site(text)
  to anon, service_role;

commit;
