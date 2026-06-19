-- Tango Reservas - esquema inicial para Supabase/Postgres
-- La app sigue en modo local/mock. Este SQL deja preparada la migración futura.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  description text,
  category text,
  city text,
  address text,
  phone text,
  whatsapp text,
  email text,
  instagram_url text,
  facebook_url text,
  website_url text,
  google_maps_url text,
  google_maps_embed_url text,
  status text not null default 'draft',
  auto_confirm_reservations boolean not null default true,
  public_template_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint businesses_status_check check (status in ('active', 'draft', 'inactive'))
);

alter table if exists public.businesses
  add column if not exists auto_confirm_reservations boolean not null default true;

create table if not exists public.business_web_content (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  hero_title text,
  hero_subtitle text,
  hero_badge text,
  about_title text,
  about_text text,
  about_secondary_text text,
  public_tags jsonb not null default '[]'::jsonb,
  hero_image_url text,
  show_hero boolean not null default true,
  show_about boolean not null default true,
  show_featured_menu boolean not null default true,
  show_full_menu boolean not null default true,
  show_gallery boolean not null default true,
  show_location boolean not null default true,
  show_reservations boolean not null default true,
  show_whatsapp boolean not null default true,
  show_email boolean not null default true,
  show_socials boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint business_web_content_business_id_unique unique (business_id)
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  duration_minutes integer,
  capacity integer,
  price numeric,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint services_duration_minutes_check check (duration_minutes is null or duration_minutes > 0),
  constraint services_capacity_check check (capacity is null or capacity >= 0),
  constraint services_price_check check (price is null or price >= 0)
);

create table if not exists public.menu_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  description text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.menu_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  category_id uuid not null references public.menu_categories(id) on delete cascade,
  name text not null,
  description text,
  price numeric,
  image_url text,
  placeholder text,
  tags jsonb not null default '[]'::jsonb,
  is_active boolean not null default true,
  is_featured boolean not null default false,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint menu_items_price_check check (price is null or price >= 0)
);

create table if not exists public.gallery_images (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text,
  image_url text not null,
  alt_text text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  phone text not null,
  email text,
  internal_notes text,
  preferences text,
  tags jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint customers_business_phone_unique unique (business_id, phone)
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  service_id uuid references public.services(id) on delete set null,
  customer_id uuid references public.customers(id) on delete set null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  notes text,
  reservation_date date not null,
  reservation_time time not null,
  party_size integer not null,
  status text not null default 'pending',
  source text not null default 'manual',
  assigned_table_ids jsonb not null default '[]'::jsonb,
  deposit_status text not null default 'none',
  deposit_amount numeric,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint reservations_status_check check (status in ('pending', 'confirmed', 'cancelled', 'completed', 'no_show')),
  constraint reservations_source_check check (source in ('web', 'manual', 'admin')),
  constraint reservations_deposit_status_check check (deposit_status in ('none', 'pending', 'paid', 'refunded')),
  constraint reservations_party_size_check check (party_size > 0),
  constraint reservations_deposit_amount_check check (deposit_amount is null or deposit_amount >= 0)
);

create table if not exists public.floor_tables (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  label text not null,
  seats integer not null default 0,
  x numeric not null default 0,
  y numeric not null default 0,
  width numeric not null default 0,
  height numeric not null default 0,
  rotation numeric not null default 0,
  shape text not null default 'square',
  corner_radius numeric not null default 0,
  status text not null default 'available',
  can_join boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint floor_tables_seats_check check (seats >= 0),
  constraint floor_tables_width_check check (width >= 0),
  constraint floor_tables_height_check check (height >= 0),
  constraint floor_tables_corner_radius_check check (corner_radius >= 0),
  constraint floor_tables_shape_check check (shape in ('rectangular', 'square', 'round')),
  constraint floor_tables_status_check check (status in ('available', 'occupied', 'reserved', 'blocked', 'out_of_service'))
);

create table if not exists public.table_combinations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  label text not null,
  table_ids jsonb not null,
  seats_total integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint table_combinations_seats_total_check check (seats_total >= 0)
);

create table if not exists public.floor_plan_settings (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  background_image_url text,
  background_x numeric not null default 0,
  background_y numeric not null default 0,
  background_width numeric not null default 1000,
  background_height numeric not null default 600,
  background_opacity numeric not null default 50,
  background_brightness numeric not null default 100,
  background_contrast numeric not null default 100,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint floor_plan_settings_business_id_unique unique (business_id),
  constraint floor_plan_settings_background_width_check check (background_width >= 0),
  constraint floor_plan_settings_background_height_check check (background_height >= 0),
  constraint floor_plan_settings_background_opacity_check check (background_opacity >= 0 and background_opacity <= 100),
  constraint floor_plan_settings_background_brightness_check check (background_brightness >= 0 and background_brightness <= 100),
  constraint floor_plan_settings_background_contrast_check check (background_contrast >= 0 and background_contrast <= 100)
);

create table if not exists public.customer_notes (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references public.customers(id) on delete cascade,
  note text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists businesses_slug_idx on public.businesses (slug);

create index if not exists reservations_business_id_idx on public.reservations (business_id);
create index if not exists reservations_date_idx on public.reservations (reservation_date);
create index if not exists reservations_time_idx on public.reservations (reservation_time);
create index if not exists reservations_customer_phone_idx on public.reservations (customer_phone);
create index if not exists reservations_customer_id_idx on public.reservations (customer_id);

create index if not exists services_business_id_idx on public.services (business_id);

create index if not exists menu_items_business_id_idx on public.menu_items (business_id);
create index if not exists menu_items_category_id_idx on public.menu_items (category_id);

create index if not exists floor_tables_business_id_idx on public.floor_tables (business_id);

create index if not exists customers_business_id_idx on public.customers (business_id);
create index if not exists customers_phone_idx on public.customers (phone);

create index if not exists menu_categories_business_id_idx on public.menu_categories (business_id);
create index if not exists gallery_images_business_id_idx on public.gallery_images (business_id);
create index if not exists table_combinations_business_id_idx on public.table_combinations (business_id);
create index if not exists floor_plan_settings_business_id_idx on public.floor_plan_settings (business_id);
create index if not exists business_web_content_business_id_idx on public.business_web_content (business_id);
create index if not exists customer_notes_customer_id_idx on public.customer_notes (customer_id);

drop trigger if exists businesses_set_updated_at on public.businesses;
create trigger businesses_set_updated_at
before update on public.businesses
for each row execute function public.set_updated_at();

drop trigger if exists business_web_content_set_updated_at on public.business_web_content;
create trigger business_web_content_set_updated_at
before update on public.business_web_content
for each row execute function public.set_updated_at();

drop trigger if exists services_set_updated_at on public.services;
create trigger services_set_updated_at
before update on public.services
for each row execute function public.set_updated_at();

drop trigger if exists reservations_set_updated_at on public.reservations;
create trigger reservations_set_updated_at
before update on public.reservations
for each row execute function public.set_updated_at();

drop trigger if exists floor_tables_set_updated_at on public.floor_tables;
create trigger floor_tables_set_updated_at
before update on public.floor_tables
for each row execute function public.set_updated_at();

drop trigger if exists table_combinations_set_updated_at on public.table_combinations;
create trigger table_combinations_set_updated_at
before update on public.table_combinations
for each row execute function public.set_updated_at();

drop trigger if exists floor_plan_settings_set_updated_at on public.floor_plan_settings;
create trigger floor_plan_settings_set_updated_at
before update on public.floor_plan_settings
for each row execute function public.set_updated_at();

drop trigger if exists menu_categories_set_updated_at on public.menu_categories;
create trigger menu_categories_set_updated_at
before update on public.menu_categories
for each row execute function public.set_updated_at();

drop trigger if exists menu_items_set_updated_at on public.menu_items;
create trigger menu_items_set_updated_at
before update on public.menu_items
for each row execute function public.set_updated_at();

drop trigger if exists gallery_images_set_updated_at on public.gallery_images;
create trigger gallery_images_set_updated_at
before update on public.gallery_images
for each row execute function public.set_updated_at();

drop trigger if exists customers_set_updated_at on public.customers;
create trigger customers_set_updated_at
before update on public.customers
for each row execute function public.set_updated_at();

drop trigger if exists customer_notes_set_updated_at on public.customer_notes;
create trigger customer_notes_set_updated_at
before update on public.customer_notes
for each row execute function public.set_updated_at();
