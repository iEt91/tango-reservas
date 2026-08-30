begin;

alter table public.businesses
  add column if not exists hero_eyebrow text not null default '',
  add column if not exists secondary_cta_label text not null default 'Ver men\u00fa',
  add column if not exists show_delivery boolean not null default true;

commit;
