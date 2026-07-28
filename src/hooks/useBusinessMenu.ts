"use client";

import { useMemo, useSyncExternalStore } from "react";
import { getMenuCategoriesByBusinessId, getMenuItemsByBusinessId, subscribeMenu } from "@/data/menu";
import type { MenuCategory, MenuItem } from "@/data/types";

export function useBusinessMenu(businessId?: string | null) {
  const getSnapshot = () =>
    JSON.stringify({
      categories: businessId ? getMenuCategoriesByBusinessId(businessId) : [],
      items: businessId ? getMenuItemsByBusinessId(businessId) : [],
    });
  const snapshot = useSyncExternalStore(
    businessId ? subscribeMenu : () => () => {},
    getSnapshot,
    () => '{"categories":[],"items":[]}',
  );

  return useMemo(() => {
    try {
      return JSON.parse(snapshot) as { categories: MenuCategory[]; items: MenuItem[] };
    } catch {
      return { categories: [], items: [] };
    }
  }, [snapshot]);
}
