"use client";

import { useEffect, useState } from "react";
import type { PublicWebGalleryItem } from "@/data/types";

type PublicGalleryProps = {
  title: string;
  items: PublicWebGalleryItem[];
  accentColor: string;
  variant?: "elegant" | "visual" | "minimal";
  compact?: boolean;
  hideWhenEmpty?: boolean;
};

function getItemImageSource(item: PublicWebGalleryItem) {
  if (item.imageDataUrl?.trim()) {
    return item.imageDataUrl.trim();
  }

  if (item.imageUrl?.trim()) {
    return item.imageUrl.trim();
  }

  return "";
}

function getItemAltText(item: PublicWebGalleryItem) {
  return item.altText?.trim() || item.description?.trim() || item.title;
}

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0] ?? "").join("").toUpperCase() || "GA";
}

export function PublicGallery({
  title,
  items,
  accentColor,
  variant = "elegant",
  compact = false,
  hideWhenEmpty = false,
}: PublicGalleryProps) {
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const columns =
    variant === "minimal"
      ? "grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      : variant === "visual"
        ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-4"
        : "grid gap-4 sm:grid-cols-2 xl:grid-cols-4";

  const activeItems = items.filter((item) => item.isActive);

  if (hideWhenEmpty && activeItems.length === 0) {
    return null;
  }

  return (
    <section
      id="galeria"
      className="rounded-[2rem] border border-white/10 bg-white/5 p-6 shadow-2xl shadow-black/20 xl:p-8"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">Galeria</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">{title}</h2>
        </div>
        <div className="h-3 w-24 rounded-full" style={{ backgroundColor: accentColor }} />
      </div>

      <div className={`mt-6 ${columns}`}>
        {activeItems.length > 0 ? (
          activeItems.map((item) => {
            const imageSource = isMounted ? getItemImageSource(item) : "";
            const initials = item.imagePlaceholder?.trim() || getInitials(item.title);
            const showImage = isMounted && imageSource && !brokenImages[item.id];

            return (
              <article
                key={item.id}
                className={`overflow-hidden rounded-2xl border border-white/10 shadow-lg shadow-black/20 ${
                  compact ? "bg-slate-950/70" : "bg-slate-950/60"
                }`}
              >
                <div className="h-40 bg-gradient-to-br from-cyan-500/20 via-slate-900 to-slate-950">
                  {showImage ? (
                    <img
                      src={imageSource}
                      alt={getItemAltText(item)}
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
                <div className="space-y-2 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                    <span className="shrink-0 rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-slate-300">
                      Activa
                    </span>
                  </div>
                  {item.description ? (
                    <p className="line-clamp-2 text-xs leading-5 text-slate-300">
                      {item.description}
                    </p>
                  ) : null}
                </div>
              </article>
            );
          })
        ) : hideWhenEmpty ? null : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 px-4 py-8 text-sm text-slate-300">
            Todavia no hay imagenes activas en esta galeria.
          </div>
        )}
      </div>
    </section>
  );
}
