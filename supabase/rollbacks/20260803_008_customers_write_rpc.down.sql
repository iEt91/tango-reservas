begin;

revoke all on function public.save_business_customer(
  uuid, uuid, jsonb
) from public, anon, authenticated;
revoke all on function public.set_business_customer_active(
  uuid, uuid, boolean
) from public, anon, authenticated;

drop function if exists public.save_business_customer(
  uuid, uuid, jsonb
);
drop function if exists public.set_business_customer_active(
  uuid, uuid, boolean
);

drop policy if exists customers_select_active_member
  on public.customers;
revoke select on table public.customers from authenticated;

drop index if exists
  public.customers_business_normalized_phone_key;
drop index if exists
  public.customers_business_normalized_email_key;

alter table public.customers
  drop constraint if exists customers_full_name_length_check,
  drop constraint if exists customers_email_length_check,
  drop constraint if exists customers_phone_length_check,
  drop constraint if exists customers_notes_length_check,
  drop constraint if exists customers_preferences_length_check,
  drop constraint if exists customers_birth_date_check,
  drop constraint if exists customers_tags_check;

alter table public.customers
  drop column if exists birth_date,
  drop column if exists preferences,
  drop column if exists tags,
  drop column if exists is_active;

commit;
