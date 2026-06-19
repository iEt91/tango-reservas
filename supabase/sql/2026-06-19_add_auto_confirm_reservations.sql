alter table if exists public.businesses
  add column if not exists auto_confirm_reservations boolean not null default true;
