begin;

revoke all on function public.save_business_menu_category(
  uuid,
  uuid,
  jsonb
) from public, anon, authenticated;
revoke all on function public.archive_business_menu_category(
  uuid,
  uuid
) from public, anon, authenticated;
revoke all on function public.reorder_business_menu_categories(
  uuid,
  uuid[]
) from public, anon, authenticated;
revoke all on function public.save_business_menu_item(
  uuid,
  uuid,
  jsonb
) from public, anon, authenticated;
revoke all on function public.archive_business_menu_item(
  uuid,
  uuid
) from public, anon, authenticated;
revoke all on function public.save_business_menu_item_quick_changes(
  uuid,
  jsonb
) from public, anon, authenticated;

drop function if exists public.save_business_menu_category(
  uuid,
  uuid,
  jsonb
);
drop function if exists public.archive_business_menu_category(
  uuid,
  uuid
);
drop function if exists public.reorder_business_menu_categories(
  uuid,
  uuid[]
);
drop function if exists public.save_business_menu_item(
  uuid,
  uuid,
  jsonb
);
drop function if exists public.archive_business_menu_item(
  uuid,
  uuid
);
drop function if exists public.save_business_menu_item_quick_changes(
  uuid,
  jsonb
);

drop policy if exists
  menu_categories_select_active_member
on public.menu_categories;
drop policy if exists
  menu_items_select_active_member
on public.menu_items;

revoke all on table public.menu_categories
  from public, anon, authenticated;
revoke all on table public.menu_items
  from public, anon, authenticated;

alter table public.menu_categories enable row level security;
alter table public.menu_categories force row level security;
alter table public.menu_items enable row level security;
alter table public.menu_items force row level security;

commit;
