"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  getMenuCategoriesByBusinessId,
  getMenuItemsByBusinessId,
  subscribeMenu,
} from "@/data/menu";
import type { MenuCategory, MenuItem } from "@/data/types";

type PublicFeaturedMenuProps = {
  businessId: string;
  title: string;
  subtitle?: string;
  accentColor: string;
  variant?: "elegant" | "visual" | "minimal";
  emptyMessage?: string;
  categoriesOverride?: MenuCategory[];
  itemsOverride?: MenuItem[];
};

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

function buildSnapshot(businessId: string) {
  return JSON.stringify({
    categories: getMenuCategoriesByBusinessId(businessId),
    items: getMenuItemsByBusinessId(businessId),
  });
}

const EMPTY_CARDS = Array.from({ length: 4 }, (_, index) => index);

export function PublicFeaturedMenu({
  businessId,
  title,
  subtitle,
  accentColor,
  variant = "elegant",
  emptyMessage,
  categoriesOverride,
  itemsOverride,
}: PublicFeaturedMenuProps) {
  const [mounted, setMounted] = useState(false);
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

  const featuredItems = useMemo(() => {
    if (!resolvedData) {
      return [] as MenuItem[];
    }

    const activeCategories = resolvedData.categories.filter((category) => category.isActive);
    const activeItems = resolvedData.items.filter((item) => item.isActive);
    void activeCategories;

    const featured = activeItems.filter((item) => item.isFeatured);
    const base = featured.length > 0 ? featured : activeItems;
    const unique = new Map<string, MenuItem>();

    for (const item of base) {
      unique.set(item.id, item);
      if (unique.size >= 4) {
        break;
      }
    }

    if (unique.size < 4) {
      for (const item of activeItems) {
        if (!unique.has(item.id)) {
          unique.set(item.id, item);
        }
        if (unique.size >= 4) {
          break;
        }
      }
    }

    return [...unique.values()];
  }, [resolvedData]);

  const categoryById = useMemo(() => {
    if (!resolvedData) {
      return new Map<string, string>();
    }

    const activeCategories = resolvedData.categories.filter((category) => category.isActive);
    return new Map(activeCategories.map((category) => [category.id, category.name] as const));
  }, [resolvedData]);

  const hasItems = mounted && featuredItems.length > 0;

  return (
    <section
      id="platos"
      className={`rounded-[2rem] border border-white/10 p-6 shadow-2xl shadow-black/20 ${
        variant === "minimal" ? "bg-slate-950/60" : "bg-white/5"
      }`}
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Seleccion destacada</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
          {subtitle ? (
            <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{subtitle}</p>
          ) : null}
        </div>
        <div className="h-3 w-20 rounded-full" style={{ backgroundColor: accentColor }} />
      </div>

      {!mounted ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {EMPTY_CARDS.map((index) => (
            <article
              key={index}
              className={`overflow-hidden rounded-[1.35rem] border border-white/10 shadow-lg shadow-black/20 ${
                variant === "minimal" ? "bg-slate-950/60" : "bg-slate-950/75"
              }`}
            >
              <div className="h-36 animate-pulse bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" />
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-2">
                    <div className="h-3 w-20 rounded-full bg-white/10" />
                    <div className="h-4 w-32 rounded-full bg-white/10" />
                  </div>
                  <div className="h-6 w-16 rounded-full bg-white/10" />
                </div>
                <div className="space-y-2">
                  <div className="h-3 rounded-full bg-white/10" />
                  <div className="h-3 w-4/5 rounded-full bg-white/10" />
                </div>
                <div className="flex gap-2">
                  <div className="h-6 w-20 rounded-full bg-white/10" />
                  <div className="h-6 w-14 rounded-full bg-white/10" />
                </div>
              </div>
            </article>
          ))}
        </div>
      ) : hasItems ? (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {featuredItems.map((item) => {
            const imageSource = getItemImageSource(item);
            const initials = getInitials(item.name);
            const showImage = imageSource && !brokenImages[item.id];
            const price = formatCurrency(item.price);
            const categoryName = categoryById.get(item.categoryId) ?? "Menu";

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
                        {categoryName}
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
        <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-slate-950/60 px-4 py-8 text-sm text-slate-300">
          {emptyMessage || "El menu todavia no tiene productos cargados."}
        </div>
      )}
    </section>
  );
}
