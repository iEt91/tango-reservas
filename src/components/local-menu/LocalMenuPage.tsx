"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LocalBusinessWarning } from "@/components/local/LocalBusinessWarning";
import { LocalNoActiveBusinessesState } from "@/components/local/LocalNoActiveBusinessesState";
import type { Business, MenuCategory, MenuItem } from "@/data/types";
import { useLocalBusinessSelection } from "@/hooks/useLocalBusinessSelection";
import { getBusinesses, subscribeBusinesses } from "@/lib/data/admin-businesses";
import {
  createMenuCategory,
  createMenuItem,
  deleteMenuCategory,
  deleteMenuItem,
  duplicateMenuItem,
  getMenuCategoriesByBusinessId,
  getMenuItemsByBusinessId,
  getMenuSummary,
  moveMenuCategory,
  resetMenuForBusiness,
  subscribeMenu,
  toggleMenuCategoryStatus,
  toggleMenuItemStatus,
  updateMenuCategory,
  updateMenuItem,
} from "@/data/menu";

type CategoryDraft = {
  name: string;
  description: string;
  isActive: boolean;
};

type ItemDraft = {
  name: string;
  categoryId: string;
  description: string;
  price: string;
  imageDataUrl: string;
  imageUrl: string;
  imagePlaceholder: string;
  isActive: boolean;
  isFeatured: boolean;
  tagsText: string;
};

type CategoryModalState = {
  mode: "create" | "edit";
  categoryId?: string;
  draft: CategoryDraft;
};

type ItemModalState = {
  mode: "create" | "edit";
  itemId?: string;
  draft: ItemDraft;
};

const emptyCategoryDraft: CategoryDraft = {
  name: "",
  description: "",
  isActive: true,
};

function createItemDraft(categoryId = "", item?: MenuItem): ItemDraft {
  return {
    name: item?.name ?? "",
    categoryId: item?.categoryId ?? categoryId,
    description: item?.description ?? "",
    price: item?.price == null ? "" : String(item.price),
    imageDataUrl: item?.imageDataUrl ?? "",
    imageUrl: item?.imageUrl ?? "",
    imagePlaceholder: item?.imagePlaceholder ?? "",
    isActive: item?.isActive ?? true,
    isFeatured: item?.isFeatured ?? false,
    tagsText: item?.tags?.join(", ") ?? "",
  };
}

function normalizeText(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function initialsFromName(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0] ?? "").join("").toUpperCase() || "MN";
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Consultar";
  }

  return `$ ${value.toLocaleString("es-AR")}`;
}

function readTags(value: string) {
  return value
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);
}

function getItemImageSource(
  item: Pick<MenuItem, "imageDataUrl" | "imageUrl" | "imagePlaceholder" | "name">,
) {
  if (item.imageDataUrl?.trim()) {
    return item.imageDataUrl.trim();
  }

  if (item.imageUrl?.trim()) {
    return item.imageUrl.trim();
  }

  return "";
}

function getDraftImageSource(draft: ItemDraft) {
  if (draft.imageDataUrl.trim()) {
    return draft.imageDataUrl.trim();
  }

  if (draft.imageUrl.trim()) {
    return draft.imageUrl.trim();
  }

  return "";
}

function getStatePillClass(active: boolean) {
  return active
    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
    : "border-slate-500/20 bg-slate-500/10 text-slate-200";
}

function getToneClass(tone: "cyan" | "emerald" | "amber" | "rose" | "default" = "default") {
  if (tone === "emerald") {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
  }

  if (tone === "cyan") {
    return "border-cyan-400/20 bg-cyan-500/10 text-cyan-100";
  }

  if (tone === "amber") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-100";
  }

  if (tone === "rose") {
    return "border-rose-400/20 bg-rose-500/10 text-rose-100";
  }

  return "border-white/10 bg-slate-900/70 text-slate-200";
}

function getToneTextClass(tone: "default" | "cyan" | "emerald" | "amber" | "rose") {
  if (tone === "emerald") {
    return "text-emerald-100";
  }

  if (tone === "cyan") {
    return "text-cyan-100";
  }

  if (tone === "amber") {
    return "text-amber-100";
  }

  if (tone === "rose") {
    return "text-rose-100";
  }

  return "text-white";
}

function SectionCard({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[1.35rem] border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 sm:p-5 ${className}`}
    >
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
          Menú
        </p>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {description ? (
          <p className="max-w-4xl text-xs leading-5 text-slate-300">{description}</p>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MetricCard({
  label,
  value,
  helper,
  tone = "default",
}: {
  label: string;
  value: number | string;
  helper?: string;
  tone?: "default" | "cyan" | "emerald" | "amber" | "rose";
}) {
  return (
    <article className="rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 shadow-2xl shadow-black/20">
      <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">{label}</p>
      <p className={`mt-1 text-[1.15rem] font-semibold tracking-tight ${getToneTextClass(tone)}`}>
        {value}
      </p>
      {helper ? <p className="mt-1 text-[10px] leading-4 text-slate-400">{helper}</p> : null}
    </article>
  );
}

function MenuStatePill({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "cyan" | "emerald" | "amber" | "rose";
}) {
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${tone === "default" ? getToneClass() : getToneClass(tone)}`}>
      {label}
    </span>
  );
}

function MenuModal({
  open,
  title,
  subtitle,
  onClose,
  children,
  footer,
  maxWidth = "max-w-4xl",
}: {
  open: boolean;
  title: string;
  subtitle: string;
  onClose: () => void;
  children: React.ReactNode;
  footer: React.ReactNode;
  maxWidth?: string;
}) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = original;
    };
  }, [onClose, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-3 backdrop-blur-sm sm:p-4"
      onClick={onClose}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="menu-modal-title"
        className={`flex max-h-[calc(100vh-32px)] w-full flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950 shadow-2xl shadow-black/40 ${maxWidth}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-5">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
              Menú del negocio
            </p>
            <h3 id="menu-modal-title" className="text-lg font-semibold text-white">
              {title}
            </h3>
            <p className="text-sm leading-6 text-slate-300">{subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:border-white/20 hover:text-white"
            aria-label="Cerrar modal"
          >
            ×
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>

        <footer className="border-t border-white/10 px-4 py-4 sm:px-5">{footer}</footer>
      </section>
    </div>
  );
}

function MenuCategoryModal({
  open,
  mode,
  draft,
  error,
  onChange,
  onClose,
  onSave,
}: {
  open: boolean;
  mode: "create" | "edit";
  draft: CategoryDraft;
  error: string;
  onChange: (draft: CategoryDraft) => void;
  onClose: () => void;
  onSave: () => void;
}) {
  return (
    <MenuModal
      open={open}
      title={mode === "create" ? "Nueva categoría" : "Editar categoría"}
      subtitle="Las categorías son dinámicas y cambian por negocio. No hay una lista fija."
      onClose={onClose}
      maxWidth="max-w-2xl"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Guardar categoría
          </button>
        </div>
      }
    >
      <div className="grid gap-4">
        <label className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
            Nombre
          </span>
          <input
            value={draft.name}
            onChange={(event) => onChange({ ...draft, name: event.target.value })}
            className="input-base"
            autoFocus
          />
        </label>

        <label className="space-y-1.5">
          <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
            Descripcion
          </span>
          <textarea
            value={draft.description}
            onChange={(event) => onChange({ ...draft, description: event.target.value })}
            className="input-base min-h-28"
            placeholder="Opcional"
          />
        </label>

        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={draft.isActive}
            onChange={(event) => onChange({ ...draft, isActive: event.target.checked })}
            className="h-4 w-4 rounded border-white/20 bg-slate-950 text-cyan-400"
          />
          <span>Categoria activa</span>
        </label>

        {error ? (
          <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
            {error}
          </div>
        ) : null}
      </div>
    </MenuModal>
  );
}

function MenuItemModal({
  open,
  mode,
  draft,
  categories,
  error,
  onChange,
  onClose,
  onSave,
  onError,
}: {
  open: boolean;
  mode: "create" | "edit";
  draft: ItemDraft;
  categories: MenuCategory[];
  error: string;
  onChange: (draft: ItemDraft) => void;
  onClose: () => void;
  onSave: () => void;
  onError: (message: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewCategory = categories.find((category) => category.id === draft.categoryId) ?? null;
  const previewTitle = draft.name.trim() || "Item de ejemplo";
  const previewInitials = draft.imagePlaceholder.trim() || initialsFromName(previewTitle);
  const previewCategoryName = previewCategory?.name ?? "Sin categoria";
  const previewImage = getDraftImageSource(draft);
  const hasUpload = draft.imageDataUrl.trim().length > 0;

  function openFilePicker() {
    fileInputRef.current?.click();
  }

  function handleFileSelected(event: { target: HTMLInputElement }) {
    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) {
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      onError("La imagen debe ser JPG, PNG o WEBP.");
      return;
    }

    const maxBytes = 2 * 1024 * 1024;
    if (file.size > maxBytes) {
      onError("La imagen no puede superar los 2 MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        onError("No se pudo leer la imagen seleccionada.");
        return;
      }

      onError("");
      onChange({
        ...draft,
        imageDataUrl: result,
      });
    };
    reader.onerror = () => {
      onError("No se pudo leer la imagen seleccionada.");
    };
    reader.readAsDataURL(file);
  }

  return (
    <MenuModal
      open={open}
      title={mode === "create" ? "Nuevo item" : "Editar item"}
      subtitle="El item puede usar URL de imagen o un placeholder elegante mientras no exista upload real."
      onClose={onClose}
      maxWidth="max-w-5xl"
      footer={
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:text-white"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onSave}
            className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Guardar item
          </button>
        </div>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Nombre
              </span>
              <input
                value={draft.name}
                onChange={(event) => onChange({ ...draft, name: event.target.value })}
                className="input-base"
                autoFocus
              />
            </label>

            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Categoria
              </span>
              <select
                value={draft.categoryId}
                onChange={(event) => onChange({ ...draft, categoryId: event.target.value })}
                className="input-base"
              >
                <option value="">Elegir categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="space-y-1.5 sm:col-span-2">
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Descripcion
              </span>
              <textarea
                value={draft.description}
                onChange={(event) => onChange({ ...draft, description: event.target.value })}
                className="input-base min-h-28"
                placeholder="Explica el plato, pack o servicio."
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Precio opcional
              </span>
              <input
                value={draft.price}
                onChange={(event) => onChange({ ...draft, price: event.target.value })}
                className="input-base"
                placeholder="Consultar"
                inputMode="decimal"
              />
            </label>

            <label className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Imagen URL
              </span>
              <input
                value={draft.imageUrl}
                onChange={(event) => {
                  onError("");
                  onChange({ ...draft, imageUrl: event.target.value });
                }}
                className="input-base"
                placeholder="https://..."
              />
            </label>

            <div className="space-y-2 sm:col-span-2">
              <div className="flex flex-wrap items-center gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleFileSelected}
                />
                <button
                  type="button"
                  onClick={openFilePicker}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
                >
                  Subir imagen
                </button>
                {hasUpload || draft.imageUrl.trim() ? (
                  <button
                    type="button"
                    onClick={() => {
                      onError("");
                      onChange({
                        ...draft,
                        imageDataUrl: "",
                        imageUrl: hasUpload ? draft.imageUrl : "",
                      });
                    }}
                    className="inline-flex h-12 items-center justify-center rounded-full border border-rose-400/30 bg-rose-500/10 px-4 text-xs font-medium text-rose-100 transition hover:border-rose-300/50 hover:bg-rose-500/15 hover:text-white"
                  >
                    Quitar imagen
                  </button>
                ) : null}
                <button
                  type="button"
                  onClick={() => {
                    onError("");
                    onChange({
                      ...draft,
                      imageDataUrl: "",
                      imageUrl: "",
                      imagePlaceholder: initialsFromName(draft.name || previewTitle),
                    });
                  }}
                  className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
                >
                  Usar placeholder
                </button>
              </div>
              <p className="text-[11px] leading-5 text-slate-400">
                Modo local. La imagen se guarda en este navegador hasta conectar storage real.
              </p>
            </div>

            <label className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Placeholder
              </span>
              <input
                value={draft.imagePlaceholder}
                onChange={(event) => {
                  onError("");
                  onChange({ ...draft, imagePlaceholder: event.target.value });
                }}
                className="input-base"
                placeholder="ME / BR / CO"
              />
            </label>
          </div>

          <label className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Tags
            </span>
            <input
              value={draft.tagsText}
              onChange={(event) => onChange({ ...draft, tagsText: event.target.value })}
              className="input-base"
              placeholder="destacado, vegetariano, promo"
            />
          </label>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={draft.isActive}
                onChange={(event) => onChange({ ...draft, isActive: event.target.checked })}
                className="h-4 w-4 rounded border-white/20 bg-slate-950 text-cyan-400"
              />
              <span>Item activo</span>
            </label>

            <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
              <input
                type="checkbox"
                checked={draft.isFeatured}
                onChange={(event) => onChange({ ...draft, isFeatured: event.target.checked })}
                className="h-4 w-4 rounded border-white/20 bg-slate-950 text-cyan-400"
              />
              <span>Destacado</span>
            </label>
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : (
            <p className="text-xs leading-5 text-slate-400">
              El precio puede quedar vacio. Si lo completas debe ser un numero valido.
            </p>
          )}
        </div>

        <div className="space-y-4">
          <div className="rounded-[1.35rem] border border-white/10 bg-slate-950/80 p-4 shadow-2xl shadow-black/20">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Preview
            </p>
            <div className="mt-4 overflow-hidden rounded-[1.35rem] border border-white/10 bg-slate-900/80">
              <div className="relative h-44 overflow-hidden bg-gradient-to-br from-cyan-500/20 via-slate-900 to-slate-950">
                {previewImage ? (
                  <img
                    src={previewImage}
                    alt={previewTitle}
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <div className="flex h-24 w-24 items-center justify-center rounded-[1.75rem] border border-white/10 bg-white/10 text-2xl font-semibold text-white">
                      {previewInitials}
                    </div>
                  </div>
                )}
                <div className="absolute left-4 top-4 rounded-full border border-white/10 bg-slate-950/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-slate-200">
                  {previewCategoryName}
                </div>
              </div>
              <div className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h4 className="text-lg font-semibold text-white">{previewTitle}</h4>
                    <p className="mt-1 text-sm leading-6 text-slate-300">
                      {draft.description.trim() || "Descripcion del item"}
                    </p>
                  </div>
                  <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-sm font-medium text-slate-100">
                    {formatCurrency(draft.price ? Number(draft.price) : null)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {draft.isActive ? (
                    <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-100">
                      Activo
                    </span>
                  ) : (
                    <span className="rounded-full border border-slate-500/20 bg-slate-500/10 px-2.5 py-1 text-[11px] text-slate-200">
                      Inactivo
                    </span>
                  )}
                  {draft.isFeatured ? (
                    <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-100">
                      Destacado
                    </span>
                  ) : null}
                  {readTags(draft.tagsText).length > 0 ? (
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[11px] text-cyan-100">
                      {readTags(draft.tagsText).length} tags
                    </span>
                  ) : null}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/5 p-4 text-sm leading-6 text-slate-300">
            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              A futuro
            </p>
            <p className="mt-2">
              Esta estructura ya queda preparada para la web publica. Mas adelante
              podremos mostrar las categorias como chips y los items como carrusel por
              categoria sin cambiar los datos del menu.
            </p>
          </div>
        </div>
      </div>
    </MenuModal>
  );
}

function MenuItemCard({
  item,
  categoryName,
  onEdit,
  onDuplicate,
  onToggle,
  onDelete,
}: {
  item: MenuItem;
  categoryName: string;
  onEdit: (itemId: string) => void;
  onDuplicate: (itemId: string) => void;
  onToggle: (itemId: string) => void;
  onDelete: (itemId: string) => void;
}) {
  const price = formatCurrency(item.price);
  const tags = item.tags ?? [];
  const initials = item.imagePlaceholder?.trim() || initialsFromName(item.name);
  const imageSource = getItemImageSource(item);

  return (
    <article className="overflow-hidden rounded-[1.35rem] border border-white/10 bg-slate-950/75 shadow-lg shadow-black/20">
      <div className="flex gap-3 p-3">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/20 via-slate-900 to-slate-950">
          {imageSource ? (
            <img src={imageSource} alt={item.name} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-white">
              {initials}
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-sm font-semibold text-white">{item.name}</h3>
              <p className="mt-1 text-[11px] uppercase tracking-[0.16em] text-slate-400">
                {categoryName}
              </p>
            </div>
            <span className="shrink-0 rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1 text-[11px] text-slate-200">
              {price}
            </span>
          </div>

          <p className="mt-2 line-clamp-2 text-xs leading-5 text-slate-300">
            {item.description || "Sin descripcion"}
          </p>

          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={`rounded-full border px-2 py-0.5 text-[10px] ${getStatePillClass(item.isActive)}`}>
              {item.isActive ? "Activo" : "Inactivo"}
            </span>
            {item.isFeatured ? (
              <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-100">
                Destacado
              </span>
            ) : null}
            {tags.slice(0, 2).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] text-slate-300"
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-t border-white/10 px-3 py-2">
        <button
          type="button"
          onClick={() => onEdit(item.id)}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
        >
          Editar
        </button>
        <button
          type="button"
          onClick={() => onDuplicate(item.id)}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
        >
          Duplicar
        </button>
        <button
          type="button"
          onClick={() => onToggle(item.id)}
          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
        >
          {item.isActive ? "Desactivar" : "Activar"}
        </button>
        <button
          type="button"
          onClick={() => onDelete(item.id)}
          className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-[11px] font-medium text-rose-100 transition hover:border-rose-300/50 hover:bg-rose-500/15 hover:text-white"
        >
          Eliminar
        </button>
      </div>
    </article>
  );
}

function MenuPreview({
  business,
  categories,
  items,
}: {
  business: Business;
  categories: MenuCategory[];
  items: MenuItem[];
}) {
  const activeCategories = categories.filter((category) => category.isActive);
  const activeItems = items.filter((item) => item.isActive);

  return (
    <SectionCard
      title="Preview web"
      description="Simulacion de como se veria el menu en la web publica, organizado por categoria."
    >
      <div className="space-y-4">
        <div className="flex flex-wrap gap-2">
          {activeCategories.map((category) => (
            <span
              key={category.id}
              className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-200"
            >
              {category.name}
            </span>
          ))}
        </div>

        {activeCategories.length > 0 ? (
          <div className="space-y-4">
            {activeCategories.map((category) => {
              const categoryItems = activeItems.filter((item) => item.categoryId === category.id);
              return (
                <section
                  key={category.id}
                  className="rounded-[1.35rem] border border-white/10 bg-slate-950/75 p-4"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-white">{category.name}</h3>
                      {category.description ? (
                        <p className="mt-1 text-xs leading-5 text-slate-400">
                          {category.description}
                        </p>
                      ) : null}
                    </div>
                    <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-slate-300">
                      {categoryItems.length} items
                    </span>
                  </div>

                  <div className="mt-3 flex gap-3 overflow-x-auto pb-1">
                    {categoryItems.length > 0 ? (
                      categoryItems.map((item) => {
                        const imageSource = getItemImageSource(item);
                        return (
                          <article
                            key={item.id}
                            className="min-w-[220px] max-w-[220px] overflow-hidden rounded-[1.25rem] border border-white/10 bg-white/5"
                          >
                            <div className="h-28 bg-gradient-to-br from-cyan-500/20 via-slate-900 to-slate-950">
                              {imageSource ? (
                                <img
                                  src={imageSource}
                                  alt={item.name}
                                  className="h-full w-full object-cover"
                                />
                              ) : (
                                <div className="flex h-full w-full items-center justify-center text-lg font-semibold text-cyan-100">
                                  {item.imagePlaceholder?.trim() || initialsFromName(item.name)}
                                </div>
                              )}
                            </div>
                            <div className="space-y-2 p-3">
                              <div className="flex items-start justify-between gap-3">
                                <h4 className="line-clamp-2 text-sm font-semibold text-white">
                                  {item.name}
                                </h4>
                                <span className="shrink-0 rounded-full border border-white/10 bg-slate-900/70 px-2 py-0.5 text-[11px] text-slate-200">
                                  {formatCurrency(item.price)}
                                </span>
                              </div>
                              <p className="line-clamp-2 text-xs leading-5 text-slate-300">
                                {item.description}
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {item.isFeatured ? (
                                  <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-2 py-0.5 text-[10px] text-amber-100">
                                    Destacado
                                  </span>
                                ) : null}
                                <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2 py-0.5 text-[10px] text-cyan-100">
                                  {business.name}
                                </span>
                              </div>
                            </div>
                          </article>
                        );
                      })
                    ) : (
                      <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-400">
                        Esta categoria todavia no tiene items activos.
                      </div>
                    )}
                  </div>
                </section>
              );
            })}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 px-4 py-6 text-sm text-slate-400">
            Aun no hay categorias activas para este negocio.
          </div>
        )}
      </div>
    </SectionCard>
  );
}

export function LocalMenuPage() {
  const [mounted, setMounted] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [categories, setCategories] = useState<MenuCategory[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "featured">("all");
  const [message, setMessage] = useState("");
  const [categoryModal, setCategoryModal] = useState<CategoryModalState | null>(null);
  const [itemModal, setItemModal] = useState<ItemModalState | null>(null);
  const [categoryError, setCategoryError] = useState("");
  const [itemError, setItemError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const syncBusinesses = async () => {
      const currentBusinesses = await getBusinesses();

      if (!cancelled) {
        setBusinesses(currentBusinesses);
      }
    };

    const timeout = window.setTimeout(() => {
      setMounted(true);
      void syncBusinesses();
    }, 0);

    const unsubscribeBusinesses = subscribeBusinesses(() => {
      void syncBusinesses();
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      unsubscribeBusinesses();
    };
  }, []);

  const selectedBusinessKey = useMemo(() => {
    if (businesses.length === 0) {
      return "";
    }

    if (selectedBusinessId && businesses.some((business) => business.id === selectedBusinessId)) {
      return selectedBusinessId;
    }

    return businesses.find((business) => business.status === "active")?.id ?? "";
  }, [businesses, selectedBusinessId]);

  const selectedBusiness =
    businesses.find((business) => business.id === selectedBusinessKey) ?? null;

  const {
    businessWarning,
    handleBusinessChange: handleBusinessSelectionChange,
    canChangeBusiness,
    isSelectionReady,
  } = useLocalBusinessSelection({
    businesses,
    selectedBusinessId,
    setSelectedBusinessId,
  });

  useEffect(() => {
    if (!mounted || !selectedBusinessKey || !isSelectionReady) {
      return;
    }

    const syncMenu = () => {
      setCategories(getMenuCategoriesByBusinessId(selectedBusinessKey));
      setItems(getMenuItemsByBusinessId(selectedBusinessKey));
    };

    const timeout = window.setTimeout(() => {
      syncMenu();
    }, 0);

    const unsubscribeMenu = subscribeMenu(syncMenu);

    return () => {
      window.clearTimeout(timeout);
      unsubscribeMenu();
    };
  }, [mounted, selectedBusinessKey]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = window.setTimeout(() => setMessage(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [message]);

  function refreshMenu() {
    if (!selectedBusinessKey) {
      setCategories([]);
      setItems([]);
      return;
    }

    const nextCategories = getMenuCategoriesByBusinessId(selectedBusinessKey);
    const nextItems = getMenuItemsByBusinessId(selectedBusinessKey);

    setCategories(nextCategories);
    setItems(nextItems);

    if (
      categoryFilter !== "all" &&
      !nextCategories.some((category) => category.id === categoryFilter)
    ) {
      setCategoryFilter("all");
    }
  }

  function openCreateCategory() {
    setCategoryError("");
    setCategoryModal({
      mode: "create",
      draft: { ...emptyCategoryDraft },
    });
  }

  function openEditCategory(category: MenuCategory) {
    setCategoryError("");
    setCategoryModal({
      mode: "edit",
      categoryId: category.id,
      draft: {
        name: category.name,
        description: category.description ?? "",
        isActive: category.isActive,
      },
    });
  }

  async function saveCategory() {
    if (!categoryModal || !selectedBusinessKey) {
      return;
    }

    const name = categoryModal.draft.name.trim();
    if (!name) {
      setCategoryError("El nombre de la categoria es obligatorio.");
      return;
    }

    const normalized = normalizeText(name);
    const duplicate = categories.some((category) => {
      if (categoryModal.mode === "edit" && category.id === categoryModal.categoryId) {
        return false;
      }

      return normalizeText(category.name) === normalized;
    });

    if (duplicate) {
      setCategoryError("Ya existe una categoria con ese nombre.");
      return;
    }

    try {
      if (categoryModal.mode === "create") {
        await createMenuCategory(selectedBusinessKey, {
          name,
          description: categoryModal.draft.description,
          isActive: categoryModal.draft.isActive,
        });
        setMessage("Categoria guardada en modo local/mock.");
      } else if (categoryModal.categoryId) {
        await updateMenuCategory(categoryModal.categoryId, {
          name,
          description: categoryModal.draft.description,
          isActive: categoryModal.draft.isActive,
        });
        setMessage("Categoria actualizada en modo local/mock.");
      }

      setCategoryModal(null);
      refreshMenu();
      setCategoryError("");
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : "No se pudo guardar la categoria.");
    }
  }

  async function handleToggleCategory(categoryId: string) {
    try {
      await toggleMenuCategoryStatus(categoryId);
      refreshMenu();
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : "No se pudo actualizar la categoria.");
    }
  }

  async function handleDeleteCategory(category: MenuCategory) {
    if (
      !window.confirm(
        `Eliminar la categoria "${category.name}" borrara tambien sus items. ¿Querés continuar?`,
      )
    ) {
      return;
    }

    try {
      await deleteMenuCategory(category.id);
      setMessage("Categoria eliminada en modo local/mock.");
      refreshMenu();
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : "No se pudo eliminar la categoria.");
    }
  }

  async function handleMoveCategory(categoryId: string, direction: -1 | 1) {
    try {
      await moveMenuCategory(categoryId, direction);
      refreshMenu();
    } catch (error) {
      setCategoryError(error instanceof Error ? error.message : "No se pudo mover la categoria.");
    }
  }

  function openCreateItem() {
    setItemError("");
    setItemModal({
      mode: "create",
      draft: createItemDraft(categoryFilter !== "all" ? categoryFilter : categories[0]?.id ?? ""),
    });
  }

  function openEditItem(itemId: string) {
    const item = items.find((current) => current.id === itemId);
    if (!item) {
      return;
    }

    setItemError("");
    setItemModal({
      mode: "edit",
      itemId: item.id,
      draft: createItemDraft(item.categoryId, item),
    });
  }

  async function saveItem() {
    if (!itemModal || !selectedBusinessKey) {
      return;
    }

    const name = itemModal.draft.name.trim();
    const categoryId = itemModal.draft.categoryId;
    const description = itemModal.draft.description.trim();
    const price = itemModal.draft.price.trim();
    const imageDataUrl = itemModal.draft.imageDataUrl.trim();
    const imageUrl = itemModal.draft.imageUrl.trim();
    const imagePlaceholder = itemModal.draft.imagePlaceholder.trim();
    const tags = readTags(itemModal.draft.tagsText);

    if (!name) {
      setItemError("El nombre del item es obligatorio.");
      return;
    }

    if (!categoryId) {
      setItemError("Debes elegir una categoria.");
      return;
    }

    let parsedPrice: number | null = null;
    if (price) {
      parsedPrice = Number(price);
      if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
        setItemError("El precio debe ser un numero valido mayor o igual a 0.");
        return;
      }
    }

    try {
      if (itemModal.mode === "create") {
        await createMenuItem(selectedBusinessKey, {
          categoryId,
          name,
          description,
          price: parsedPrice,
          imageDataUrl,
          imageUrl,
          imagePlaceholder: imagePlaceholder || initialsFromName(name),
          isActive: itemModal.draft.isActive,
          isFeatured: itemModal.draft.isFeatured,
          tags,
        });
        setMessage("Item guardado en modo local/mock.");
      } else if (itemModal.itemId) {
        await updateMenuItem(itemModal.itemId, {
          categoryId,
          name,
          description,
          price: parsedPrice,
          imageDataUrl,
          imageUrl,
          imagePlaceholder: imagePlaceholder || initialsFromName(name),
          isActive: itemModal.draft.isActive,
          isFeatured: itemModal.draft.isFeatured,
          tags,
        });
        setMessage("Item actualizado en modo local/mock.");
      }

      setItemModal(null);
      refreshMenu();
      setItemError("");
    } catch (error) {
      setItemError(error instanceof Error ? error.message : "No se pudo guardar el item.");
    }
  }

  async function handleDuplicateItem(itemId: string) {
    try {
      await duplicateMenuItem(itemId);
      setMessage("Item duplicado en modo local/mock.");
      refreshMenu();
    } catch (error) {
      setItemError(error instanceof Error ? error.message : "No se pudo duplicar el item.");
    }
  }

  async function handleToggleItem(itemId: string) {
    try {
      await toggleMenuItemStatus(itemId);
      refreshMenu();
    } catch (error) {
      setItemError(error instanceof Error ? error.message : "No se pudo actualizar el item.");
    }
  }

  async function handleDeleteItem(itemId: string) {
    const item = items.find((current) => current.id === itemId);
    if (!item) {
      return;
    }

    if (!window.confirm(`Eliminar "${item.name}" de forma permanente?`)) {
      return;
    }

    try {
      await deleteMenuItem(item.id);
      setMessage("Item eliminado en modo local/mock.");
      refreshMenu();
    } catch (error) {
      setItemError(error instanceof Error ? error.message : "No se pudo eliminar el item.");
    }
  }

  async function handleRestoreDemo() {
    if (
      !window.confirm(
        "Esto restaurara el menu demo del negocio seleccionado y reemplazara solo sus categorias e items demo. ¿Querés continuar?",
      )
    ) {
      return;
    }

    try {
      await resetMenuForBusiness(selectedBusinessKey);
      setMessage("Menu demo restaurado en modo local/mock.");
      refreshMenu();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo restaurar el menu demo.");
    }
  }

  function handleBusinessChange(nextBusinessId: string) {
    setCategoryFilter("all");
    setStatusFilter("all");
    setSearch("");
    setCategoryModal(null);
    setItemModal(null);
    setCategoryError("");
    setItemError("");
    handleBusinessSelectionChange(nextBusinessId);
  }

  const summary = getMenuSummary(selectedBusinessKey);
  const categoryMap = useMemo(() => new Map(categories.map((category) => [category.id, category])), [categories]);
  const activeCategories = categories.filter((category) => category.isActive);
  const filteredItems = useMemo(() => {
    const normalizedSearch = normalizeText(search);

    return items.filter((item) => {
      if (categoryFilter !== "all" && item.categoryId !== categoryFilter) {
        return false;
      }

      if (statusFilter === "active" && !item.isActive) {
        return false;
      }

      if (statusFilter === "inactive" && item.isActive) {
        return false;
      }

      if (statusFilter === "featured" && (!item.isActive || !item.isFeatured)) {
        return false;
      }

      if (!normalizedSearch) {
        return true;
      }

      return normalizeText(
        [item.name, item.description, item.tags?.join(" ") ?? ""].join(" "),
      ).includes(normalizedSearch);
    });
  }, [categoryFilter, items, search, statusFilter]);

  const activeItemCountByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of items) {
      if (!item.isActive) {
        continue;
      }
      map.set(item.categoryId, (map.get(item.categoryId) ?? 0) + 1);
    }
    return map;
  }, [items]);

  const categoriesWithItems = categories.map((category) => ({
    category,
    activeCount: activeItemCountByCategory.get(category.id) ?? 0,
    totalCount: items.filter((item) => item.categoryId === category.id).length,
  }));

  if (!mounted || !selectedBusiness || !isSelectionReady) {
    if (mounted && businesses.length > 0 && !businesses.some((business) => business.status === "active")) {
      return <LocalNoActiveBusinessesState />;
    }

    return (
      <section className="space-y-4">
        <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-5 shadow-2xl shadow-black/20 sm:px-5">
          <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
            Menú
          </p>
          <h1 className="mt-1 text-[1.5rem] font-semibold tracking-tight text-white sm:text-[1.7rem]">
            Menú del negocio
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
            Cargando categorias e items del negocio seleccionado...
          </p>
        </section>

        <section className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-300 shadow-2xl shadow-black/20 sm:px-5">
          Preparando el editor del menu.
        </section>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      {businesses.length > 0 && !businesses.some((business) => business.status === "active") ? (
        <LocalNoActiveBusinessesState />
      ) : null}

      <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-5 shadow-2xl shadow-black/20 sm:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
              Panel del Local
            </p>
            <h1 className="text-[1.5rem] font-semibold tracking-tight text-white sm:text-[1.7rem]">
              Menú del negocio
            </h1>
            <p className="max-w-4xl text-sm leading-6 text-slate-300">
              Cargá categorias, items, precios, imagenes y destacados por negocio.
              Luego este mismo contenido podrá consumirse en la web publica.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <MenuStatePill label={selectedBusiness.status === "active" ? "Activo" : selectedBusiness.status === "draft" ? "Borrador" : "Inactivo"} tone={selectedBusiness.status === "active" ? "emerald" : selectedBusiness.status === "draft" ? "amber" : "rose"} />
            <MenuStatePill label={selectedBusiness.category} tone="cyan" />
            <MenuStatePill label={selectedBusiness.city} tone="default" />
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {canChangeBusiness ? (
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Negocio
              </span>
              <select
                value={selectedBusinessKey}
                onChange={(event) => handleBusinessChange(event.target.value)}
                className="input-base min-w-[240px]"
              >
                {businesses.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name} - {business.city}
                  </option>
                ))}
              </select>
            </label>
          ) : (
            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Negocio
              </span>
              <div className="input-base min-w-[240px] text-slate-100">
                {selectedBusiness?.name ?? "Negocio asignado"}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Acciones
            </span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleRestoreDemo}
                className="rounded-full border border-cyan-400/20 bg-cyan-500/15 px-3.5 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/25"
              >
                Restaurar menú demo
              </button>
              <button
                type="button"
                onClick={openCreateCategory}
                className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/30 hover:text-white"
              >
                Nueva categoría
              </button>
              <button
                type="button"
                onClick={openCreateItem}
                className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/30 hover:text-white"
              >
                Nuevo item
              </button>
            </div>
          </div>
        </div>

        <LocalBusinessWarning message={businessWarning} />

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300">
            Categorias: {summary.totalCategories}
          </span>
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300">
            Categorias activas: {summary.activeCategories}
          </span>
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300">
            Items: {summary.totalItems}
          </span>
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300">
            Items activos: {summary.activeItems}
          </span>
        </div>

        {message ? (
          <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {message}
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.08fr_0.92fr]">
        <div className="space-y-4">
          <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <MetricCard label="Total categorias" value={summary.totalCategories} tone="cyan" />
            <MetricCard label="Categorias activas" value={summary.activeCategories} tone="emerald" />
            <MetricCard label="Items destacados" value={summary.featuredItems} tone="amber" />
            <MetricCard label="Items sin precio" value={summary.itemsWithoutPrice} tone="rose" />
          </section>

          <SectionCard
            title="Editor de categorias"
            description="Gestiona las categorias dinamicas del negocio. Podes moverlas, activarlas, desactivarlas o eliminarlas."
          >
            <div className="space-y-3">
              {categoriesWithItems.length > 0 ? (
                categoriesWithItems.map(({ category, activeCount, totalCount }, index) => (
                  <article
                    key={category.id}
                    className="rounded-[1.35rem] border border-white/10 bg-slate-950/75 p-3"
                  >
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-white">{category.name}</h3>
                          <span className={`rounded-full border px-2.5 py-0.5 text-[10px] ${getStatePillClass(category.isActive)}`}>
                            {category.isActive ? "Activa" : "Inactiva"}
                          </span>
                          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] text-slate-300">
                            {activeCount}/{totalCount} items
                          </span>
                        </div>
                        {category.description ? (
                          <p className="mt-1 text-xs leading-5 text-slate-400">
                            {category.description}
                          </p>
                        ) : (
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Sin descripcion.
                          </p>
                        )}
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          disabled={index === 0}
                          onClick={() => handleMoveCategory(category.id, -1)}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Subir
                        </button>
                        <button
                          type="button"
                          disabled={index === categories.length - 1}
                          onClick={() => handleMoveCategory(category.id, 1)}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white disabled:cursor-not-allowed disabled:opacity-40"
                        >
                          Bajar
                        </button>
                        <button
                          type="button"
                          onClick={() => openEditCategory(category)}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleToggleCategory(category.id)}
                          className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
                        >
                          {category.isActive ? "Desactivar" : "Activar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteCategory(category)}
                          className="rounded-full border border-rose-400/30 bg-rose-500/10 px-3 py-1.5 text-[11px] font-medium text-rose-100 transition hover:border-rose-300/50 hover:bg-rose-500/15 hover:text-white"
                        >
                          Eliminar
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-400">
                  Aun no hay categorias. Usa Nueva categoria para empezar.
                </div>
              )}
            </div>
          </SectionCard>

          <SectionCard
            title="Lista de items"
            description="Buscar, filtrar, duplicar y editar items comerciales de cada categoria."
          >
            <div className="grid gap-3 xl:grid-cols-[1.1fr_0.75fr_0.65fr_0.5fr]">
              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Buscar
                </span>
                <input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  className="input-base"
                  placeholder="Nombre o descripcion"
                />
              </label>

              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Categoria
                </span>
                <select
                  value={categoryFilter}
                  onChange={(event) => setCategoryFilter(event.target.value)}
                  className="input-base"
                >
                  <option value="all">Todas</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Estado
                </span>
                <select
                  value={statusFilter}
                  onChange={(event) =>
                    setStatusFilter(event.target.value as typeof statusFilter)
                  }
                  className="input-base"
                >
                  <option value="all">Todos</option>
                  <option value="active">Activos</option>
                  <option value="inactive">Inactivos</option>
                  <option value="featured">Destacados</option>
                </select>
              </label>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={() => {
                    setSearch("");
                    setCategoryFilter("all");
                    setStatusFilter("all");
                  }}
                  className="w-full rounded-full border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
                >
                  Limpiar filtros
                </button>
              </div>
            </div>

            <div className="mt-4 space-y-3">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => (
                  <MenuItemCard
                    key={item.id}
                    item={item}
                    categoryName={categoryMap.get(item.categoryId)?.name ?? "Sin categoria"}
                    onEdit={openEditItem}
                    onDuplicate={handleDuplicateItem}
                    onToggle={handleToggleItem}
                    onDelete={handleDeleteItem}
                  />
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-400">
                  No hay items que coincidan con los filtros.
                </div>
              )}
            </div>
          </SectionCard>
        </div>

        <div className="space-y-4">
          <SectionCard
            title="Resumen rapido"
            description="Un vistazo compacto de como se ve el menu de este negocio."
          >
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-2">
              <MetricCard label="Items activos" value={summary.activeItems} tone="emerald" />
              <MetricCard label="Items destacados" value={summary.featuredItems} tone="amber" />
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {activeCategories.map((category) => (
                <span
                  key={category.id}
                  className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-200"
                >
                  {category.name}
                </span>
              ))}
            </div>
            <p className="mt-4 text-sm leading-6 text-slate-300">
              El menu se guarda por negocio. Si cambias de negocio, ves sus propias
              categorias e items.
            </p>
          </SectionCard>

          <MenuPreview business={selectedBusiness} categories={categories} items={items} />
        </div>
      </div>

      <MenuCategoryModal
        open={categoryModal !== null}
        mode={categoryModal?.mode ?? "create"}
        draft={categoryModal?.draft ?? emptyCategoryDraft}
        error={categoryError}
        onChange={(draft) =>
          setCategoryModal((current) =>
            current ? { ...current, draft } : current,
          )
        }
        onClose={() => {
          setCategoryError("");
          setCategoryModal(null);
        }}
        onSave={saveCategory}
      />

      <MenuItemModal
        open={itemModal !== null}
        mode={itemModal?.mode ?? "create"}
        draft={itemModal?.draft ?? createItemDraft(categories[0]?.id ?? "")}
        categories={categories}
        error={itemError}
        onChange={(draft) => setItemModal((current) => (current ? { ...current, draft } : current))}
        onClose={() => {
          setItemError("");
          setItemModal(null);
        }}
        onSave={saveItem}
        onError={setItemError}
      />
    </section>
  );
}
