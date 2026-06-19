"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { getMenuCategoriesByBusinessId, getMenuItemsByBusinessId, subscribeMenu } from "@/data/menu";
import type { MenuCategory, MenuItem } from "@/data/types";

type PublicMenuPreviewProps = {
  businessId: string;
  title: string;
  subtitle?: string;
  accentColor: string;
  variant?: "elegant" | "visual" | "minimal";
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

function initialsFromName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0] ?? "").join("").toUpperCase() || "MN";
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return null;
  }

  return `$ ${value.toLocaleString("es-AR")}`;
}

export function PublicMenuPreview({
  businessId,
  title,
  subtitle,
  accentColor,
  variant = "elegant",
}: PublicMenuPreviewProps) {
  const [mounted, setMounted] = useState(false);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  useEffect(() => {
    setMounted(true);
  }, []);
  const snapshot = useSyncExternalStore(
    subscribeMenu,
    () =>
      JSON.stringify({
        categories: getMenuCategoriesByBusinessId(businessId),
        items: getMenuItemsByBusinessId(businessId),
      }),
    () => "",
  );
  const [selectedCategoryId, setSelectedCategoryId] = useState("");
  const { categories, items } = useMemo(() => {
    if (!mounted || !snapshot) {
      return { categories: [] as MenuCategory[], items: [] as MenuItem[] };
    }

    try {
      return JSON.parse(snapshot) as { categories: MenuCategory[]; items: MenuItem[] };
    } catch {
      return { categories: [] as MenuCategory[], items: [] as MenuItem[] };
    }
  }, [mounted, snapshot]);

  if (!mounted) {
    return (
      <section
        id="menu"
        className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20"
      >
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Menu</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
            {subtitle ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{subtitle}</p> : null}
          </div>
          <div className="h-3 w-20 rounded-full" style={{ backgroundColor: accentColor }} />
        </div>
        <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-slate-950/60 px-4 py-8 text-sm text-slate-300">
          Cargando menu...
        </div>
      </section>
    );
  }

  const activeCategories = useMemo(
    () => categories.filter((category) => category.isActive),
    [categories],
  );
  const activeItems = useMemo(() => items.filter((item) => item.isActive), [items]);
  const visibleCategories = useMemo(
    () =>
      activeCategories.filter((category) =>
        activeItems.some((item) => item.categoryId === category.id),
      ),
    [activeCategories, activeItems],
  );
  const selectedCategory =
    visibleCategories.find((category) => category.id === selectedCategoryId) ??
    visibleCategories[0] ??
    null;
  const selectedItems = selectedCategory
    ? activeItems.filter((item) => item.categoryId === selectedCategory.id)
    : [];

  return (
    <section
      id="menu"
      className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20"
    >
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Menu</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
          {subtitle ? <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-300">{subtitle}</p> : null}
        </div>
        <div className="h-3 w-20 rounded-full" style={{ backgroundColor: accentColor }} />
      </div>

      {visibleCategories.length > 0 ? (
        <div className="mt-6 space-y-5">
          <div className="flex gap-2 overflow-x-auto pb-1">
            {visibleCategories.map((category) => {
              const isActive = selectedCategory?.id === category.id;
              return (
                <button
                  key={category.id}
                  type="button"
                  onClick={() => setSelectedCategoryId(category.id)}
                  className={`shrink-0 rounded-full border px-4 py-2 text-sm font-medium transition ${
                    isActive
                      ? "border-cyan-400/40 bg-cyan-400/15 text-cyan-100"
                      : "border-white/10 bg-slate-950/60 text-slate-300 hover:border-cyan-400/25 hover:text-white"
                  }`}
                >
                  {category.name}
                </button>
              );
            })}
          </div>

          {selectedCategory ? (
            <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4 sm:p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-lg font-semibold text-white">{selectedCategory.name}</h3>
                  {selectedCategory.description ? (
                    <p className="mt-1 text-sm leading-6 text-slate-400">
                      {selectedCategory.description}
                    </p>
                  ) : null}
                </div>
                <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] text-slate-300">
                  {selectedItems.length} items
                </span>
              </div>

              <div className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                {selectedItems.map((item) => {
                  const imageSource = getItemImageSource(item);
                  const price = formatCurrency(item.price);
                  const initials = item.imagePlaceholder?.trim() || initialsFromName(item.name);
                  const showImage = imageSource && !brokenImages[item.id];

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
                            <h4 className="text-sm font-semibold text-white">{item.name}</h4>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-300">
                              {item.description || "Descripcion del item"}
                            </p>
                          </div>
                          {price ? (
                            <span className="shrink-0 rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1 text-[11px] text-slate-100">
                              {price}
                            </span>
                          ) : null}
                        </div>

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
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 px-4 py-8 text-sm text-slate-300">
              Este negocio todavia no cargó su menu.
            </div>
          )}
        </div>
      ) : (
        <div className="mt-6 rounded-2xl border border-dashed border-white/10 bg-slate-950/60 px-4 py-8 text-sm text-slate-300">
          Este negocio todavia no cargó su menu.
        </div>
      )}
    </section>
  );
}
