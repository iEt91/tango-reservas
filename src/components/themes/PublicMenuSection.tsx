"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  getMenuCategoriesByBusinessId,
  getMenuItemsByBusinessId,
  subscribeMenu,
} from "@/data/menu";
import type { MenuCategory, MenuItem } from "@/data/types";

type PublicMenuSectionProps = {
  businessId: string;
  accentColor: string;
  variant?: "elegant" | "visual" | "minimal";
  showMenu?: boolean;
  emptyMessage?: string;
  categoriesOverride?: MenuCategory[];
  itemsOverride?: MenuItem[];
};

function buildSnapshot(businessId: string) {
  return JSON.stringify({
    categories: getMenuCategoriesByBusinessId(businessId),
    items: getMenuItemsByBusinessId(businessId),
  });
}

function getItemImageSource(item: MenuItem) {
  if (item.imageDataUrl?.trim()) {
    return item.imageDataUrl.trim();
  }

  if (item.imageUrl?.trim()) {
    return item.imageUrl.trim();
  }

  return "";
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0] ?? "").join("").toUpperCase() || "MN";
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return `$ ${value.toLocaleString("es-AR")}`;
}

const EMPTY_TABS = Array.from({ length: 4 }, (_, index) => index);

export function PublicMenuSection({
  businessId,
  accentColor,
  variant = "elegant",
  showMenu = true,
  emptyMessage,
  categoriesOverride,
  itemsOverride,
}: PublicMenuSectionProps) {
  const [mounted, setMounted] = useState(false);
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const useOverrides = Array.isArray(categoriesOverride) && Array.isArray(itemsOverride);
  const getSnapshotValue = () =>
    useOverrides
      ? JSON.stringify({
          categories: categoriesOverride ?? [],
          items: itemsOverride ?? [],
        })
      : buildSnapshot(businessId);
  const snapshot = useSyncExternalStore(
    useOverrides ? () => () => {} : subscribeMenu,
    getSnapshotValue,
    getSnapshotValue,
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const resolvedData = useMemo(() => {
    if (!mounted) {
      return null;
    }

    try {
      return JSON.parse(snapshot) as { categories: MenuCategory[]; items: MenuItem[] };
    } catch {
      return { categories: [] as MenuCategory[], items: [] as MenuItem[] };
    }
  }, [mounted, snapshot]);

  const activeCategories = useMemo(() => {
    if (!resolvedData) {
      return [] as MenuCategory[];
    }

    return resolvedData.categories.filter((category) => category.isActive);
  }, [resolvedData]);

  const activeItems = useMemo(() => {
    if (!resolvedData) {
      return [] as MenuItem[];
    }

    return resolvedData.items.filter((item) => item.isActive);
  }, [resolvedData]);

  useEffect(() => {
    if (!mounted) {
      return;
    }

    if (activeCategories.length === 0) {
      setSelectedCategoryId("");
      return;
    }

    const hasSelection = activeCategories.some((category) => category.id === selectedCategoryId);
    if (hasSelection) {
      return;
    }

    const defaultCategory =
      activeCategories.find((category) => activeItems.some((item) => item.categoryId === category.id)) ??
      activeCategories[0];

    setSelectedCategoryId(defaultCategory?.id ?? "");
  }, [activeCategories, activeItems, mounted, selectedCategoryId]);

  const selectedCategory =
    activeCategories.find((category) => category.id === selectedCategoryId) ?? activeCategories[0] ?? null;

  const selectedItems = useMemo(() => {
    if (!selectedCategory) {
      return [] as MenuItem[];
    }

    return activeItems.filter((item) => item.categoryId === selectedCategory.id);
  }, [activeItems, selectedCategory]);

  if (!showMenu) {
    return null;
  }

  return (
    <section
      id="menu"
      className={`rounded-[2rem] border border-white/10 p-6 shadow-2xl shadow-black/20 ${
        variant === "minimal" ? "bg-slate-950/60" : "bg-white/5"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Menu</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Menú</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">
            Explorá las opciones disponibles del local.
          </p>
        </div>
        <div className="h-3 w-20 rounded-full" style={{ backgroundColor: accentColor }} />
      </div>

      {!mounted ? (
        <div className="mt-6 space-y-4">
          <div className="flex gap-2 overflow-hidden">
            {EMPTY_TABS.map((index) => (
              <div
                key={index}
                className="h-10 w-28 flex-shrink-0 rounded-full bg-white/10 animate-pulse"
              />
            ))}
          </div>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }, (_, index) => (
              <article
                key={index}
                className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-slate-950/70 shadow-lg shadow-black/20"
              >
                <div className="h-40 animate-pulse bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" />
                <div className="space-y-3 p-4">
                  <div className="h-3 w-24 rounded-full bg-white/10" />
                  <div className="h-4 w-40 rounded-full bg-white/10" />
                  <div className="h-3 rounded-full bg-white/10" />
                  <div className="h-3 w-4/5 rounded-full bg-white/10" />
                </div>
              </article>
            ))}
          </div>
        </div>
      ) : activeCategories.length > 0 && selectedCategory ? (
        <div className="mt-6 space-y-5">
          <div className="flex gap-2 overflow-x-auto pb-2 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {activeCategories.map((category) => {
              const isSelected = category.id === selectedCategory.id;

              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm transition ${
                    isSelected
                      ? "border-cyan-400/30 bg-cyan-500/15 text-cyan-50"
                      : "border-white/10 bg-white/5 text-slate-300 hover:border-white/20 hover:text-white"
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>

          {selectedItems.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              {selectedItems.map((item) => {
                const imageSource = getItemImageSource(item);
                const initials = getInitials(item.name);
                const showImage = imageSource && !brokenImages[item.id];
                const price = formatCurrency(item.price);

                return (
                  <article
                    key={item.id}
                    className={`overflow-hidden rounded-[1.35rem] border border-white/10 shadow-lg shadow-black/20 ${
                      variant === "minimal" ? "bg-slate-950/60" : "bg-slate-950/75"
                    }`}
                  >
                    <div className="h-36 bg-gradient-to-br from-cyan-500/20 via-slate-900 to-slate-950">
                      {showImage ? (
                        <img
                          src={imageSource}
                          alt={item.name}
                          className="h-full w-full object-cover"
                          onError={() =>
                            setBrokenImages((current) => ({ ...current, [item.id]: true }))
                          }
                        />
                      ) : (
                        <div className="flex h-full w-full items-center justify-center">
                          <div className="flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-white/10 bg-white/10 text-2xl font-semibold text-white">
                            {initials}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="space-y-3 p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                            {selectedCategory.name}
                          </p>
                          <h3 className="mt-1 text-sm font-semibold text-white">{item.name}</h3>
                        </div>
                        {price ? (
                          <span className="shrink-0 rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1 text-[11px] text-slate-100">
                            {price}
                          </span>
                        ) : null}
                      </div>

                      <p className="line-clamp-2 text-xs leading-5 text-slate-300">
                        {item.description || "Descripcion del item"}
                      </p>

                      <div className="flex flex-wrap gap-2">
                        {item.isFeatured ? (
                          <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-100">
                            Destacado
                          </span>
                        ) : null}
                        {item.tags?.slice(0, 2).map((tag) => (
                          <span
                            key={tag}
                            className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 px-4 py-8 text-sm text-slate-300">
              {emptyMessage || "El menú todavía no está disponible."}
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-slate-950/60 px-4 py-8 text-sm text-slate-300">
          {emptyMessage || "El menú todavía no está disponible."}
        </div>
      )}
    </section>
  );
}
