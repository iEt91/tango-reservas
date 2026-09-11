begin;

create extension if not exists "pgcrypto";

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  category text not null,
  city text not null,
  description text not null default '',
  phone text not null default '',
  whatsapp text not null default '',
  email text not null default '',
  address text not null default '',
  google_maps_url text not null default '',
  instagram_url text not null default '',
  facebook_url text not null default '',
  website_url text not null default '',
  logo_url text not null default '',
  cover_image_url text not null default '',
  primary_color text not null default '#06b6d4',
  secondary_color text not null default '#0f172a',
  theme_id text not null default 'restaurant_elegant',
  hero_title text not null default '',
  hero_subtitle text not null default '',
  about_title text not null default '',
  about_text text not null default '',
  menu_title text not null default '',
  reservation_title text not null default '',
  cta_label text not null default 'Reservar ahora',
  show_hero boolean not null default true,
  show_about boolean not null default true,
  show_gallery boolean not null default true,
  show_menu boolean not null default true,
  show_location boolean not null default true,
  show_reservation boolean not null default true,
  show_whatsapp_button boolean not null default true,
  status text not null default 'draft'
    check (status in ('active', 'draft', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_profiles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique
    references public.businesses(id) on delete cascade,
  subtitle text,
  description text,
  hero_image_url text,
  seo_title text,
  seo_description text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_sections (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  section_key text not null,
  section_title text not null,
  section_order integer not null default 0,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, section_key)
);

create table if not exists public.business_images (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  image_url text not null,
  alt_text text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  business_id uuid
    references public.businesses(id) on delete cascade,
  auth_user_id uuid unique
    references auth.users(id) on delete cascade,
  full_name text not null,
  role text not null default 'owner'
    check (role in ('owner', 'admin', 'staff')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_hours (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  day_of_week text not null
    check (
      day_of_week in (
        'monday',
        'tuesday',
        'wednesday',
        'thursday',
        'friday',
        'saturday',
        'sunday'
      )
    ),
  is_open boolean not null default true,
  open_time time not null default '00:00',
  close_time time not null default '00:00',
  break_start_time time,
  break_end_time time,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, day_of_week)
);

create table if not exists public.reservation_rules (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null unique
    references public.businesses(id) on delete cascade,
  slot_duration_minutes integer not null default 30,
  max_reservations_per_slot integer not null default 4,
  min_notice_minutes integer not null default 30,
  max_days_ahead integer not null default 14,
  requires_confirmation boolean not null default true,
  allow_cancellation boolean not null default true,
  cancellation_limit_hours integer not null default 4,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  name text not null,
  description text not null default '',
  duration_minutes integer not null default 60,
  capacity integer not null default 1,
  price numeric(10, 2),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  full_name text not null,
  email text,
  phone text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null
    references public.businesses(id) on delete cascade,
  service_id uuid not null
    references public.services(id) on delete restrict,
  customer_name text not null,
  customer_phone text not null,
  customer_email text,
  reservation_date date not null,
  reservation_time time not null,
  party_size integer not null default 2,
  status text not null default 'pending'
    check (
      status in (
        'pending',
        'confirmed',
        'cancelled',
        'completed',
        'no_show'
      )
    ),
  notes text,
  source text not null default 'web'
    check (
      source in (
        'web',
        'whatsapp',
        'instagram',
        'manual',
        'admin'
      )
    ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists businesses_slug_idx
  on public.businesses (slug);
create index if not exists business_profiles_business_idx
  on public.business_profiles (business_id);
create index if not exists business_sections_business_idx
  on public.business_sections (business_id);
create index if not exists business_images_business_idx
  on public.business_images (business_id);
create index if not exists profiles_business_idx
  on public.profiles (business_id);
create index if not exists business_hours_business_idx
  on public.business_hours (business_id);
create index if not exists services_business_idx
  on public.services (business_id);
create index if not exists customers_business_idx
  on public.customers (business_id);
create index if not exists reservations_business_date_idx
  on public.reservations (business_id, reservation_date);
create index if not exists reservations_status_idx
  on public.reservations (status);
create index if not exists reservations_business_time_idx
  on public.reservations (
    business_id,
    reservation_date,
    reservation_time
  );

alter table public.businesses enable row level security;
alter table public.businesses force row level security;
alter table public.business_profiles enable row level security;
alter table public.business_profiles force row level security;
alter table public.business_sections enable row level security;
alter table public.business_sections force row level security;
alter table public.business_images enable row level security;
alter table public.business_images force row level security;
alter table public.profiles enable row level security;
alter table public.profiles force row level security;
alter table public.business_hours enable row level security;
alter table public.business_hours force row level security;
alter table public.reservation_rules enable row level security;
alter table public.reservation_rules force row level security;
alter table public.services enable row level security;
alter table public.services force row level security;
alter table public.customers enable row level security;
alter table public.customers force row level security;
alter table public.reservations enable row level security;
alter table public.reservations force row level security;

revoke all on table public.businesses from anon, authenticated;
revoke all on table public.business_profiles from anon, authenticated;
revoke all on table public.business_sections from anon, authenticated;
revoke all on table public.business_images from anon, authenticated;
revoke all on table public.profiles from anon, authenticated;
revoke all on table public.business_hours from anon, authenticated;
revoke all on table public.reservation_rules from anon, authenticated;
revoke all on table public.services from anon, authenticated;
revoke all on table public.customers from anon, authenticated;
revoke all on table public.reservations from anon, authenticated;

commit;
