"use client";

import { useEffect, useState } from "react";
import { getMenuCategoriesByBusinessId, getMenuItemsByBusinessId, subscribeMenu } from "@/data/menu";
import type { MenuCategory, MenuItem } from "@/data/types";

export function useBusinessMenu(businessId?: string | null) {
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);

  useEffect(() => {
    if (!businessId) {
      setCategories([]);
      setItems([]);
      return;
    }

    const syncMenu = () => {
      setCategories(getMenuCategoriesByBusinessId(businessId));
      setItems(getMenuItemsByBusinessId(businessId));
    };

    syncMenu();
    const unsubscribe = subscribeMenu(syncMenu);
    return unsubscribe;
  }, [businessId]);

  return { categories, items };
}

