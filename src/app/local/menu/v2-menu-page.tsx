"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ChangeEvent, type ReactNode } from "react";
import {
  AlertTriangle,
  BookOpenText,
  Eye,
  EyeOff,
  GripVertical,
  Image as ImageIcon,
  PauseCircle,
  Plus,
  Search,
  Tags,
  Trash2,
  X,
} from "lucide-react";
import { V2AppShell } from "@/components/v2/v2-app-shell";
import { V2Badge } from "@/components/v2/v2-badge";
import { V2Button } from "@/components/v2/v2-button";
import { V2Card, V2MetricCard } from "@/components/v2/v2-card";
import { V2DataTable } from "@/components/v2/v2-data-table";
import { V2FilterBar } from "@/components/v2/v2-filter-bar";
import { V2Field, V2Input, V2Select, V2Textarea } from "@/components/v2/v2-input";
import { V2PageHeader } from "@/components/v2/v2-page-header";
import { V2_OPERATIONAL_EVENTS, V2_OPERATIONAL_STORAGE_KEYS } from "@/lib/v2-operational-storage";
import {
  v2MenuCategories,
  v2MenuItems,
  type V2MenuItemStatus,
} from "@/lib/v2/v2-mock-data";

type V2MenuItemDraft = {
  id: string;
  imageUrl: string;
  name: string;
  categoryId: string;
  description: string;
  price: number;
  status: V2MenuItemStatus;
  visible: boolean;
  featured: boolean;
};

type V2CategoryProduct = {
  productId: string;
  quantity: number;
};

type V2MenuCategoryDraft = {
  id: string;
  name: string;
  description: string;
  order: number;
  visible: boolean;
  active: boolean;
  isPromotion?: boolean;
  fixedPrice?: number;
  discountPercent?: number;
  products?: V2CategoryProduct[];
};

type V2DeleteTarget =
  | { type: "product"; id: string; name: string }
  | { type: "category"; id: string; name: string }
  | null;

type V2RemoveFromCategoryTarget = {
  productId: string;
  productName: string;
  categoryId: string;
  categoryName: string;
} | null;

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function normalizeSearch(value: string) {
  return value.trim().toLowerCase();
}

const MENU_ITEMS_STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.menuItems;
const MENU_CATEGORIES_STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.menuCategories;
const MENU_IMAGE_API_PATH = "/api/menu-images";
const MENU_ITEMS_EVENT = V2_OPERATIONAL_EVENTS.menuItems;
const MENU_CATEGORIES_EVENT = V2_OPERATIONAL_EVENTS.menuCategories;

function buildMenuImageUrl(productName: string) {
  const normalizedName = productName.trim();

  if (!normalizedName) return "";

  return `${MENU_IMAGE_API_PATH}/${encodeURIComponent(normalizedName)}`;
}

function shouldAutoAssignMenuImage(item: Pick<V2MenuItemDraft, "name" | "imageUrl">) {
  return !item.imageUrl || item.imageUrl.startsWith("blob:");
}

function applyAutomaticMenuImages(items: V2MenuItemDraft[]) {
  return items.map((item) => {
    if (!shouldAutoAssignMenuImage(item)) return item;

    return {
      ...item,
      imageUrl: buildMenuImageUrl(item.name),
    };
  });
}

function readFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const storedValue = window.localStorage.getItem(key);

    if (!storedValue) return fallback;

    return JSON.parse(storedValue) as T;
  } catch {
    return fallback;
  }
}

function writeToStorage<T>(key: string, value: T) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    if (error instanceof DOMException && error.name === "QuotaExceededError") {
      console.error(
        `[menu] No se pudo guardar ${key}: el almacenamiento local está lleno.`,
        error
      );
      return;
    }

    throw error;
  }

  if (key === MENU_ITEMS_STORAGE_KEY) {
    window.dispatchEvent(new Event(MENU_ITEMS_EVENT));
  }

  if (key === MENU_CATEGORIES_STORAGE_KEY) {
    window.dispatchEvent(new Event(MENU_CATEGORIES_EVENT));
  }
}

const MAX_MENU_IMAGE_DATA_URL_LENGTH = 90_000;

async function compressMenuImage(file: File) {
  const sourceUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new window.Image();
      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."));
      nextImage.src = sourceUrl;
    });

    const longestSide = Math.max(image.naturalWidth, image.naturalHeight);
    const initialScale = Math.min(1, 720 / Math.max(1, longestSide));
    let width = Math.max(1, Math.round(image.naturalWidth * initialScale));
    let height = Math.max(1, Math.round(image.naturalHeight * initialScale));
    let quality = 0.78;
    let result = "";

    for (let attempt = 0; attempt < 8; attempt += 1) {
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;

      const context = canvas.getContext("2d");
      if (!context) throw new Error("No se pudo procesar la imagen seleccionada.");

      context.drawImage(image, 0, 0, width, height);
      result = canvas.toDataURL("image/webp", quality);

      if (result.length <= MAX_MENU_IMAGE_DATA_URL_LENGTH) return result;

      width = Math.max(1, Math.round(width * 0.82));
      height = Math.max(1, Math.round(height * 0.82));
      quality = Math.max(0.48, quality - 0.06);
    }

    return result;
  } finally {
    URL.revokeObjectURL(sourceUrl);
  }
}

function V2MenuStatusBadge({ status }: { status: V2MenuItemStatus }) {
  if (status === "available") {
    return <V2Badge tone="green">Disponible</V2Badge>;
  }

  return <V2Badge tone="red">Pausado</V2Badge>;
}

function V2MenuThumbnail({ item }: { item: Pick<V2MenuItemDraft, "imageUrl" | "name"> }) {


  return (
    <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      {item.imageUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.imageUrl}
          alt={item.name}
          className="h-full w-full object-cover object-center"
          onError={(event) => {
            event.currentTarget.style.display = "none";
          }}
        />
      ) : (
        <ImageIcon size={18} className="text-slate-400" />
      )}
    </div>
  );
}

function createEmptyMenuItem(categoryId: string): V2MenuItemDraft {
  return {
    id: `menu-${Date.now()}`,
    imageUrl: "",
    name: "",
    categoryId,
    description: "",
    price: 0,
    status: "available",
    visible: true,
    featured: false,
  };
}

function createEmptyCategory(nextOrder: number): V2MenuCategoryDraft {
  return {
    id: `cat-${Date.now()}`,
    name: "",
    description: "",
    order: nextOrder,
    visible: true,
    active: true,
    isPromotion: false,
    fixedPrice: undefined,
    discountPercent: undefined,
    products: [],
  };
}


type V2MenuImageFile = {
  fileName: string;
  name: string;
  imageUrl: string;
};

function normalizeMenuProductName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\.[a-z0-9]+$/i, "")
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchAvailableMenuImages() {
  try {
    const response = await fetch("/api/menu-images/_list", { cache: "no-store" });

    if (!response.ok) return [];

    const data = (await response.json()) as { files?: V2MenuImageFile[] };

    return Array.isArray(data.files) ? data.files : [];
  } catch {
    return [];
  }
}

function createMenuImageProductDraft(file: V2MenuImageFile): V2MenuItemDraft {
  return {
    id: `img-product-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    name: file.name,
    description: "",
    categoryId: "",
    price: 0,
    status: "available",
    visible: true,
    featured: false,
    imageUrl: file.imageUrl,
  };
}


export function V2MenuPage() {
  const [menuItems, setMenuItems] = useState<V2MenuItemDraft[]>(v2MenuItems);

  const [categories, setCategories] = useState<V2MenuCategoryDraft[]>(
    v2MenuCategories.map((category) => ({
      ...category,
      isPromotion: false,
      fixedPrice: undefined,
      discountPercent: undefined,
      products: undefined,
    }))
  );

  const [hasLoadedStoredMenu, setHasLoadedStoredMenu] = useState(false);
  const [draggedCategoryId, setDraggedCategoryId] = useState<string | null>(null);
  const [dragOverCategoryId, setDragOverCategoryId] = useState<string | null>(null);

  const [searchValue, setSearchValue] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [visibilityFilter, setVisibilityFilter] = useState("all");
  const [quickFilter, setQuickFilter] = useState("all");
  const [hasQuickChanges, setHasQuickChanges] = useState(false);

  const [editingItem, setEditingItem] = useState<V2MenuItemDraft | null>(null);
  const [editingItemMode, setEditingItemMode] = useState<"create" | "edit">("edit");
  const [editingCategory, setEditingCategory] = useState<V2MenuCategoryDraft | null>(null);
  const [editingCategoryMode, setEditingCategoryMode] = useState<"create" | "edit">("create");

  const [assignCategory, setAssignCategory] = useState<V2MenuCategoryDraft | null>(null);
  const [productToAssignId, setProductToAssignId] = useState("");

  const [deleteTarget, setDeleteTarget] = useState<V2DeleteTarget>(null);
  const [deleteConfirmation, setDeleteConfirmation] = useState("");
  const [removeFromCategoryTarget, setRemoveFromCategoryTarget] =
    useState<V2RemoveFromCategoryTarget>(null);

  useEffect(() => {
    setMenuItems(
      applyAutomaticMenuImages(
        readFromStorage<V2MenuItemDraft[]>(MENU_ITEMS_STORAGE_KEY, v2MenuItems)
      )
    );

    setCategories(
      readFromStorage<V2MenuCategoryDraft[]>(
        MENU_CATEGORIES_STORAGE_KEY,
        v2MenuCategories.map((category) => ({
          ...category,
          isPromotion: false,
          fixedPrice: undefined,
          discountPercent: undefined,
          products: undefined,
        }))
      )
    );

    setHasLoadedStoredMenu(true);
  }, []);

  useEffect(() => {
    if (!hasLoadedStoredMenu) return;

    writeToStorage(MENU_ITEMS_STORAGE_KEY, menuItems);
  }, [hasLoadedStoredMenu, menuItems]);

  useEffect(() => {
    if (!hasLoadedStoredMenu) return;

    writeToStorage(MENU_CATEGORIES_STORAGE_KEY, categories);
  }, [categories, hasLoadedStoredMenu]);

  useEffect(() => {
    const hasOpenModal = Boolean(
      deleteTarget ||
        removeFromCategoryTarget ||
        assignCategory ||
        editingCategory ||
        editingItem
    );

    if (!hasOpenModal) return;

    function handleModalEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;

      if (deleteTarget) {
        closeDeleteDialog();
        return;
      }

      if (removeFromCategoryTarget) {
        closeRemoveFromCategoryDialog();
        return;
      }

      if (assignCategory) {
        closeAssignProduct();
        return;
      }

      if (editingCategory) {
        closeCategoryEditor();
        return;
      }

      closeEditor();
    }

    window.addEventListener("keydown", handleModalEscape);
    return () => window.removeEventListener("keydown", handleModalEscape);
  }, [
    assignCategory,
    deleteTarget,
    editingCategory,
    editingItem,
    removeFromCategoryTarget,
  ]);

  const orderedCategories = useMemo(() => {
    return [...categories].sort((a, b) => a.order - b.order);
  }, [categories]);

  const sortedCategoriesForDropdowns = useMemo(() => {
    return [...categories].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [categories]);

  const sortedMenuItemsForDropdowns = useMemo(() => {
    return [...menuItems].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [menuItems]);

  const categoryNameById = useMemo(() => {
    return new Map(orderedCategories.map((category) => [category.id, category.name]));
  }, [orderedCategories]);

  const visibleItems = menuItems.filter((item) => item.visible);
  const pausedItems = menuItems.filter((item) => item.status === "paused");
  const withoutCategoryItems = menuItems.filter((item) => !item.categoryId);
  const withoutPriceItems = menuItems.filter((item) => Number(item.price) <= 0);

  const filteredItems = useMemo(() => {
    const query = normalizeSearch(searchValue);

    return menuItems.filter((item) => {
      const categoryName = categoryNameById.get(item.categoryId) ?? "Sin categoría";

      const matchesSearch =
        query.length === 0 ||
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        categoryName.toLowerCase().includes(query);

      const matchesCategory =
        categoryFilter === "all" ||
        item.categoryId === categoryFilter ||
        (categoryFilter === "uncategorized" && !item.categoryId);

      const matchesStatus =
        statusFilter === "all" || item.status === statusFilter;

      const matchesVisibility =
        visibilityFilter === "all" ||
        (visibilityFilter === "visible" && item.visible) ||
        (visibilityFilter === "hidden" && !item.visible);

      const matchesQuickFilter =
        quickFilter === "all" ||
        (quickFilter === "without-category" && !item.categoryId) ||
        (quickFilter === "without-price" && Number(item.price) <= 0) ||
        (quickFilter === "needs-review" && (!item.categoryId || Number(item.price) <= 0));

      return (
        matchesSearch &&
        matchesCategory &&
        matchesStatus &&
        matchesVisibility &&
        matchesQuickFilter
      );
    });
  }, [
    categoryFilter,
    categoryNameById,
    menuItems,
    quickFilter,
    searchValue,
    statusFilter,
    visibilityFilter,
  ]);

  const productsOutsideAssignCategory = useMemo(() => {
    if (!assignCategory) return [];

    const categoryProducts = assignCategory.isPromotion
      ? assignCategory.products ?? []
      : menuItems
          .filter((item) => item.categoryId === assignCategory.id)
          .map((item) => ({ productId: item.id, quantity: 1 }));
    const categoryProductIds = new Set(categoryProducts.map((entry) => entry.productId));

    return menuItems.filter((item) => !categoryProductIds.has(item.id));
  }, [assignCategory, menuItems]);

  function getCategoryName(categoryId: string) {
    return categoryNameById.get(categoryId) ?? "Sin categoría";
  }

  function getCategoryProductEntries(category: V2MenuCategoryDraft): V2CategoryProduct[] {
    if (category.isPromotion) {
      return category.products ?? [];
    }

    return menuItems
      .filter((item) => item.categoryId === category.id)
      .map((item) => ({ productId: item.id, quantity: 1 }));
  }

  function getProductsByCategory(category: V2MenuCategoryDraft) {
    const entries = getCategoryProductEntries(category);

    return entries
      .map((entry) => {
        const product = menuItems.find((item) => item.id === entry.productId);

        if (!product) return null;

        return {
          ...product,
          quantity: entry.quantity,
        };
      })
      .filter(Boolean) as Array<V2MenuItemDraft & { quantity: number }>;
  }

  function getCategoryProductsTotal(category: V2MenuCategoryDraft) {
    return getProductsByCategory(category).reduce(
      (total, item) => total + item.price * item.quantity,
      0
    );
  }

  function getCategoryFinalPrice(category: V2MenuCategoryDraft) {
    if (category.fixedPrice) return category.fixedPrice;

    if (category.discountPercent) {
      const total = getCategoryProductsTotal(category);
      return Math.max(total - total * (category.discountPercent / 100), 0);
    }

    return null;
  }

  function updateEditingCategoryQuantity(productId: string, quantity: number) {
    if (!editingCategory) return;

    const normalizedQuantity = Math.max(Number(quantity) || 0, 0);
    const currentProducts = getCategoryProductEntries(editingCategory);
    const productExists = currentProducts.some((entry) => entry.productId === productId);

    const nextProducts =
      normalizedQuantity <= 0
        ? currentProducts.filter((entry) => entry.productId !== productId)
        : productExists
          ? currentProducts.map((entry) =>
              entry.productId === productId
                ? { ...entry, quantity: normalizedQuantity }
                : entry
            )
          : [...currentProducts, { productId, quantity: normalizedQuantity }];

    setEditingCategory({
      ...editingCategory,
      products: editingCategory.isPromotion ? nextProducts : undefined,
    });

    if (!editingCategory.isPromotion) {
      setMenuItems((currentItems) =>
        currentItems.map((item) => {
          if (item.id !== productId) return item;

          return {
            ...item,
            categoryId: normalizedQuantity > 0 ? editingCategory.id : "",
          };
        })
      );
    }
  }

  function reorderCategories(sourceId: string, targetId: string) {
    if (sourceId === targetId) return;

    setCategories((current) => {
      const sortedCategories = [...current].sort((a, b) => a.order - b.order);
      const sourceIndex = sortedCategories.findIndex((category) => category.id === sourceId);
      const targetIndex = sortedCategories.findIndex((category) => category.id === targetId);

      if (sourceIndex === -1 || targetIndex === -1) return current;

      const [movedCategory] = sortedCategories.splice(sourceIndex, 1);
      sortedCategories.splice(targetIndex, 0, movedCategory);

      return sortedCategories.map((category, index) => ({
        ...category,
        order: index + 1,
      }));
    });
  }

  function handleCategoryDragStart(categoryId: string) {
    setDraggedCategoryId(categoryId);
  }

  function handleCategoryDragOver(categoryId: string) {
    if (!draggedCategoryId || draggedCategoryId === categoryId) return;

    setDragOverCategoryId(categoryId);
  }

  function handleCategoryDrop(categoryId: string) {
    if (!draggedCategoryId) return;

    reorderCategories(draggedCategoryId, categoryId);
    setDraggedCategoryId(null);
    setDragOverCategoryId(null);
  }

  function handleCategoryDragEnd() {
    setDraggedCategoryId(null);
    setDragOverCategoryId(null);
  }

  function openNewItem(categoryId?: string) {
    setEditingItemMode("create");
    setEditingItem(createEmptyMenuItem(categoryId ?? orderedCategories[0]?.id ?? ""));
  }

  function openEditor(item: V2MenuItemDraft) {
    setEditingItemMode("edit");
    setEditingItem({ ...item });
  }

  function closeEditor() {
    setEditingItem(null);
  }

  function saveItem() {
    if (!editingItem) return;

    const sanitizedName = editingItem.name.trim() || "Producto sin nombre";
    const sanitizedItem: V2MenuItemDraft = {
      ...editingItem,
      name: sanitizedName,
      imageUrl: shouldAutoAssignMenuImage(editingItem)
        ? buildMenuImageUrl(sanitizedName)
        : editingItem.imageUrl,
      description: editingItem.description.trim(),
      price: Number(editingItem.price) || 0,
    };

    if (editingItemMode === "create") {
      setMenuItems((current) => [sanitizedItem, ...current]);
    } else {
      setMenuItems((current) =>
        current.map((item) => (item.id === sanitizedItem.id ? sanitizedItem : item))
      );
    }

    closeEditor();
  }

  function toggleItemStatus(itemId: string) {
    setHasQuickChanges(true);

    setMenuItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              status: item.status === "available" ? "paused" : "available",
            }
          : item
      )
    );
  }

  function updateQuickItemCategory(itemId: string, categoryId: string) {
    setHasQuickChanges(true);

    setMenuItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              categoryId,
            }
          : item
      )
    );
  }

  function updateQuickItemPrice(itemId: string, price: string) {
    setHasQuickChanges(true);

    setMenuItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              price: Number(price) || 0,
            }
          : item
      )
    );
  }

  function toggleQuickItemVisibility(itemId: string) {
    setHasQuickChanges(true);

    setMenuItems((current) =>
      current.map((item) =>
        item.id === itemId
          ? {
              ...item,
              visible: !item.visible,
            }
          : item
      )
    );
  }

  function confirmQuickChanges() {
    writeToStorage(MENU_ITEMS_STORAGE_KEY, menuItems);
    setHasQuickChanges(false);
  }

  async function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];

    if (!file || !editingItem) return;

    try {
      const compressedImage = await compressMenuImage(file);
      setEditingItem((current) =>
        current ? { ...current, imageUrl: compressedImage } : current
      );
    } catch (error) {
      console.error("[menu] No se pudo procesar la imagen seleccionada.", error);
      window.alert("No se pudo procesar la imagen. Probá con otro archivo JPG, PNG o WEBP.");
    } finally {
      event.target.value = "";
    }
  }

  function linkGeneratedMenuImages() {
    setMenuItems((current) => applyAutomaticMenuImages(current));
  }

  function renderSelectableCell(item: V2MenuItemDraft, content: ReactNode) {
    return (
      <button
        type="button"
        onClick={() => openEditor(item)}
        className="w-full text-left"
      >
        {content}
      </button>
    );
  }

  function openNewCategory() {
    setEditingCategoryMode("create");
    setEditingCategory(createEmptyCategory(orderedCategories.length + 1));
  }

  function openCategoryEditor(category: V2MenuCategoryDraft) {
    setEditingCategoryMode("edit");
    setEditingCategory({
      ...category,
      products: getCategoryProductEntries(category),
    });
  }

  function closeCategoryEditor() {
    setEditingCategory(null);
  }

  function saveCategory() {
    if (!editingCategory) return;

    const categoryEntries = getCategoryProductEntries(editingCategory).filter(
      (entry) => entry.quantity > 0
    );

    const sanitizedCategory: V2MenuCategoryDraft = {
      ...editingCategory,
      name: editingCategory.name.trim() || "Categoría sin nombre",
      description: editingCategory.description.trim(),
      order: editingCategory.order || orderedCategories.length + 1,
      isPromotion: Boolean(editingCategory.isPromotion),
      fixedPrice: Number(editingCategory.fixedPrice) || undefined,
      discountPercent: Number(editingCategory.discountPercent) || undefined,
      products: editingCategory.isPromotion ? categoryEntries : undefined,
    };

    if (!sanitizedCategory.isPromotion) {
      const assignedProductIds = new Set(categoryEntries.map((entry) => entry.productId));

      setMenuItems((currentItems) =>
        currentItems.map((item) => {
          if (assignedProductIds.has(item.id)) {
            return { ...item, categoryId: sanitizedCategory.id };
          }

          if (item.categoryId === sanitizedCategory.id) {
            return { ...item, categoryId: "" };
          }

          return item;
        })
      );
    }

    if (editingCategoryMode === "create") {
      setCategories((current) => [...current, sanitizedCategory]);
    } else {
      setCategories((current) =>
        current.map((category) =>
          category.id === sanitizedCategory.id ? sanitizedCategory : category
        )
      );
    }

    closeCategoryEditor();
  }

  function openAssignProduct(category: V2MenuCategoryDraft) {
    const categoryProductIds = new Set(getCategoryProductEntries(category).map((entry) => entry.productId));
    const firstProduct = menuItems.find((item) => !categoryProductIds.has(item.id));

    setAssignCategory(category);
    setProductToAssignId(firstProduct?.id ?? "");
  }

  function closeAssignProduct() {
    setAssignCategory(null);
    setProductToAssignId("");
  }

  function assignProductToCategory() {
    if (!assignCategory || !productToAssignId) return;

    if (!assignCategory.isPromotion) {
      setMenuItems((currentItems) =>
        currentItems.map((item) =>
          item.id === productToAssignId
            ? { ...item, categoryId: assignCategory.id }
            : item
        )
      );

      closeAssignProduct();
      return;
    }

    setCategories((current) =>
      current.map((category) => {
        if (category.id !== assignCategory.id) return category;

        const currentEntries = getCategoryProductEntries(category);
        const productExists = currentEntries.some(
          (entry) => entry.productId === productToAssignId
        );

        if (productExists) return category;

        return {
          ...category,
          products: [...currentEntries, { productId: productToAssignId, quantity: 1 }],
        };
      })
    );

    closeAssignProduct();
  }

  function openRemoveFromCategory(
    product: V2MenuItemDraft,
    category: V2MenuCategoryDraft
  ) {
    setRemoveFromCategoryTarget({
      productId: product.id,
      productName: product.name,
      categoryId: category.id,
      categoryName: category.name,
    });
  }

  function closeRemoveFromCategoryDialog() {
    setRemoveFromCategoryTarget(null);
  }

  function confirmRemoveFromCategory() {
    if (!removeFromCategoryTarget) return;

    const targetCategory = categories.find(
      (category) => category.id === removeFromCategoryTarget.categoryId
    );

    if (!targetCategory?.isPromotion) {
      setMenuItems((currentItems) =>
        currentItems.map((item) =>
          item.id === removeFromCategoryTarget.productId &&
          item.categoryId === removeFromCategoryTarget.categoryId
            ? { ...item, categoryId: "" }
            : item
        )
      );

      closeRemoveFromCategoryDialog();
      return;
    }

    setCategories((current) =>
      current.map((category) => {
        if (category.id !== removeFromCategoryTarget.categoryId) return category;

        const nextProducts = getCategoryProductEntries(category).filter(
          (entry) => entry.productId !== removeFromCategoryTarget.productId
        );

        return {
          ...category,
          products: nextProducts,
        };
      })
    );

    closeRemoveFromCategoryDialog();
  }

  function openDeleteProduct(product: V2MenuItemDraft) {
    setDeleteTarget({ type: "product", id: product.id, name: product.name });
    setDeleteConfirmation("");
  }

  function openDeleteCategory(category: V2MenuCategoryDraft) {
    setDeleteTarget({ type: "category", id: category.id, name: category.name });
    setDeleteConfirmation("");
  }

  function closeDeleteDialog() {
    setDeleteTarget(null);
    setDeleteConfirmation("");
  }

  function confirmDelete() {
    if (!deleteTarget || deleteConfirmation !== deleteTarget.name) return;

    if (deleteTarget.type === "product") {
      setMenuItems((current) =>
        current.filter((item) => item.id !== deleteTarget.id)
      );

      setCategories((current) =>
        current.map((category) => ({
          ...category,
          products: getCategoryProductEntries(category).filter(
            (entry) => entry.productId !== deleteTarget.id
          ),
        }))
      );

      if (editingItem?.id === deleteTarget.id) {
        closeEditor();
      }
    }

    if (deleteTarget.type === "category") {
      setCategories((current) =>
        current.filter((category) => category.id !== deleteTarget.id)
      );

      setMenuItems((currentItems) =>
        currentItems.map((item) =>
          item.categoryId === deleteTarget.id ? { ...item, categoryId: "" } : item
        )
      );

      if (categoryFilter === deleteTarget.id) {
        setCategoryFilter("all");
      }

      if (editingCategory?.id === deleteTarget.id) {
        closeCategoryEditor();
      }
    }

    closeDeleteDialog();
  }

  async function importProductsFromImageFolder() {
    const files = await fetchAvailableMenuImages();

    if (!files.length) {
      window.alert("No se encontraron imágenes en src/app/local/menu/img.");
      return;
    }

    const existingNames = new Set(menuItems.map((item) => normalizeMenuProductName(item.name)));
    const productsToCreate = files
      .filter((file) => !existingNames.has(normalizeMenuProductName(file.name)))
      .map(createMenuImageProductDraft);

    if (!productsToCreate.length) {
      window.alert("No hay productos nuevos para importar. Las imágenes ya coinciden con productos existentes.");
      return;
    }

    setMenuItems((currentItems) => {
      const currentNames = new Set(currentItems.map((item) => normalizeMenuProductName(item.name)));
      const uniqueProducts = productsToCreate.filter(
        (product) => !currentNames.has(normalizeMenuProductName(product.name))
      );

      return [...currentItems, ...uniqueProducts];
    });

    window.alert(`Se importaron ${productsToCreate.length} productos desde la carpeta de imágenes.`);
  }


  return (
    <V2AppShell>
      <div className="flex h-full min-h-0 flex-col">
        <V2PageHeader
          title="Menú"
          description="Gestioná categorías libres, productos, precios y visibilidad web."
          actions={
            <>
              <Link
                href="/local/menu/recetas"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-emerald-50 hover:text-emerald-700"
              >
                <BookOpenText size={18} />
                Gestionar recetas
              </Link>

              <V2Button
                variant="secondary"
                icon={<ImageIcon size={18} />}
                onClick={linkGeneratedMenuImages}
              >
                Vincular imágenes
              </V2Button>
              <V2Button type="button" variant="secondary" onClick={importProductsFromImageFolder}>
                <Plus size={16} />
                Importar imágenes
              </V2Button>

              {hasQuickChanges ? (
                <V2Button type="button" variant="success" onClick={confirmQuickChanges}>
                  Guardar cambios rápidos
                </V2Button>
              ) : (
                <span className="inline-flex h-10 items-center rounded-[10px] border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700">
                  Menú sincronizado
                </span>
              )}

              <V2Button
                variant="secondary"
                icon={<Plus size={18} />}
                onClick={openNewCategory}
              >
                Nueva categoría
              </V2Button>

              <V2Button
                variant="primary"
                icon={<Plus size={18} />}
                onClick={() => openNewItem()}
              >
                Nuevo producto
              </V2Button>
            </>
          }
        />

        <div className="mt-4 grid min-h-0 flex-1 items-stretch gap-4 xl:grid-cols-[1fr_340px]">
          <div className="flex min-h-0 flex-col gap-4">
            <div className="grid shrink-0 gap-3 md:grid-cols-3 xl:grid-cols-6">
              <V2MetricCard
                className="min-h-[88px] py-3"
                label="Productos"
                value={menuItems.length}
                helper="Total"
                tone="blue"
                icon={<BookOpenText size={22} />}
              />

              <V2MetricCard
                className="min-h-[88px] py-3"
                label="Categorías"
                value={categories.length}
                helper="Configurables"
                tone="orange"
                icon={<Tags size={22} />}
              />

              <V2MetricCard
                className="min-h-[88px] py-3"
                label="Visibles"
                value={visibleItems.length}
                helper="En web"
                tone="green"
                icon={<Eye size={22} />}
              />

              <V2MetricCard
                className="min-h-[88px] py-3"
                label="Pausados"
                value={pausedItems.length}
                helper="No disponibles"
                tone="red"
                icon={<PauseCircle size={22} />}
              />

              <V2MetricCard
                className="min-h-[88px] py-3"
                label="Sin categoría"
                value={withoutCategoryItems.length}
                helper="Revisar"
                tone="orange"
                icon={<Tags size={22} />}
              />

              <V2MetricCard
                className="min-h-[88px] py-3"
                label="Precio $0"
                value={withoutPriceItems.length}
                helper="Completar"
                tone="red"
                icon={<AlertTriangle size={22} />}
              />
            </div>

            <div className="-mt-3 shrink-0">
              <V2FilterBar>
                <div className="relative min-w-[320px] flex-1">
                  <Search
                    className="pointer-events-none absolute left-3 top-2.5 text-slate-400"
                    size={18}
                  />
                  <V2Input
                    className="pl-10"
                    placeholder="Buscar producto, descripción o categoría"
                    value={searchValue}
                    onChange={(event) => setSearchValue(event.target.value)}
                  />
                </div>

                <div className="min-w-[190px]">
                  <V2Select
                    value={categoryFilter}
                    onChange={(event) => setCategoryFilter(event.target.value)}
                  >
                    <option value="all">Todas las categorías</option>
                    <option value="uncategorized">Sin categoría</option>
                    {sortedCategoriesForDropdowns.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </V2Select>
                </div>

                <div className="min-w-[160px]">
                  <V2Select
                    value={statusFilter}
                    onChange={(event) => setStatusFilter(event.target.value)}
                  >
                    <option value="all">Todos los estados</option>
                    <option value="available">Disponibles</option>
                    <option value="paused">Pausados</option>
                  </V2Select>
                </div>

                <div className="min-w-[160px]">
                  <V2Select
                    value={visibilityFilter}
                    onChange={(event) => setVisibilityFilter(event.target.value)}
                  >
                    <option value="all">Toda visibilidad</option>
                    <option value="visible">Visible en web</option>
                    <option value="hidden">Oculto en web</option>
                  </V2Select>
                </div>

                <div className="min-w-[180px]">
                  <V2Select
                    value={quickFilter}
                    onChange={(event) => setQuickFilter(event.target.value)}
                  >
                    <option value="all">Revisión rápida</option>
                    <option value="needs-review">Sin categoría o precio</option>
                    <option value="without-category">Solo sin categoría</option>
                    <option value="without-price">Solo precio $0</option>
                  </V2Select>
                </div>
              </V2FilterBar>
            </div>

            <div className="-mt-6 min-h-0 flex-1">
              <V2DataTable
                rows={filteredItems}
                getRowKey={(row) => row.id}
                columns={[
                  {
                    header: "Producto",
                    align: "left",
                    cell: (row) =>
                      renderSelectableCell(
                        row,
                        <div className="flex items-center gap-3">
                          <V2MenuThumbnail item={row} />
                          <div>
                            <p className="font-semibold text-slate-950">
                              {row.name}
                            </p>
                            <p className="mt-1 line-clamp-1 text-xs text-slate-500">
                              {row.description}
                            </p>
                          </div>
                        </div>
                      ),
                  },
                  {
                    header: "Categoría",
                    align: "left",
                    cell: (row) => (
                      <div onClick={(event) => event.stopPropagation()}>
                        <V2Select
                          value={row.categoryId}
                          onChange={(event) => updateQuickItemCategory(row.id, event.target.value)}
                          className="min-w-[170px]"
                        >
                          <option value="">Sin categoría</option>
                          {sortedCategoriesForDropdowns
                            .filter((category) => !category.isPromotion)
                            .map((category) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            ))}
                        </V2Select>
                      </div>
                    ),
                  },
                  {
                    header: "Precio",
                    cell: (row) => (
                      <div onClick={(event) => event.stopPropagation()}>
                        <V2Input
                          type="number"
                          min={0}
                          value={String(row.price)}
                          onChange={(event) => updateQuickItemPrice(row.id, event.target.value)}
                          className="w-28 font-semibold text-slate-950"
                        />
                      </div>
                    ),
                  },
                  {
                    header: "Estado",
                    cell: (row) =>
                      renderSelectableCell(
                        row,
                        <V2MenuStatusBadge status={row.status} />
                      ),
                  },
                  {
                    header: "Web",
                    cell: (row) => (
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleQuickItemVisibility(row.id);
                        }}
                        className="inline-flex"
                      >
                        {row.visible ? (
                          <V2Badge tone="green">Visible</V2Badge>
                        ) : (
                          <V2Badge tone="red">Oculto</V2Badge>
                        )}
                      </button>
                    ),
                  },
                  {
                    header: "Disponibilidad",
                    align: "right",
                    cell: (row) => (
                      <div className="flex justify-end gap-2">
                        {row.status === "available" ? (
                          <V2Button
                            size="sm"
                            variant="danger"
                            onClick={() => toggleItemStatus(row.id)}
                          >
                            Pausar
                          </V2Button>
                        ) : (
                          <V2Button
                            size="sm"
                            variant="success"
                            onClick={() => toggleItemStatus(row.id)}
                          >
                            Activar
                          </V2Button>
                        )}
                      </div>
                    ),
                    className: "text-right",
                  },
                ]}
                className="h-full"
              />
            </div>
          </div>

          <aside className="flex h-full min-h-0 flex-col overflow-hidden">
            <V2Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <h2 className="shrink-0 text-base font-semibold text-slate-950">
                Categorías del menú
              </h2>

              <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="space-y-3">
                  {orderedCategories.map((category) => {
                    const categoryProducts = getProductsByCategory(category);
                    const finalPrice = getCategoryFinalPrice(category);

                    return (
                      <div
                        key={category.id}
                        draggable
                        onDragStart={() => handleCategoryDragStart(category.id)}
                        onDragOver={(event) => {
                          event.preventDefault();
                          handleCategoryDragOver(category.id);
                        }}
                        onDrop={() => handleCategoryDrop(category.id)}
                        onDragEnd={handleCategoryDragEnd}
                        className={`rounded-2xl border p-3 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${
                          dragOverCategoryId === category.id
                            ? "border-emerald-300 bg-gradient-to-br from-emerald-50 to-white ring-2 ring-emerald-100"
                            : category.isPromotion
                              ? "border-amber-200 bg-gradient-to-br from-amber-50 to-white"
                              : "border-slate-200 bg-gradient-to-br from-white to-slate-50"
                        } ${draggedCategoryId === category.id ? "opacity-60" : ""}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <GripVertical
                                size={16}
                                className="shrink-0 cursor-grab text-slate-300 active:cursor-grabbing"
                              />
                              <p className="font-semibold text-slate-950">
                                {category.name}
                              </p>
                            </div>
                            <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-500">
                              {category.description}
                            </p>

                            {(category.isPromotion || category.discountPercent) ? (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {category.isPromotion ? (
                                  <V2Badge tone="orange">Promo / Combo</V2Badge>
                                ) : null}

                                {category.discountPercent ? (
                                  <V2Badge tone="orange">
                                    {category.discountPercent}% descuento
                                  </V2Badge>
                                ) : null}
                              </div>
                            ) : null}
                          </div>

                          {category.visible ? (
                            <Eye
                              className="shrink-0 text-emerald-600"
                              size={17}
                            />
                          ) : (
                            <EyeOff className="shrink-0 text-slate-400" size={17} />
                          )}
                        </div>

                        <div className="mt-3 space-y-2">
                          {categoryProducts.length > 0 ? (
                            <div className="space-y-1 rounded-xl border border-slate-100 bg-slate-50 p-2">
                              {categoryProducts.map((product) => (
                                <div
                                  key={product.id}
                                  className="flex items-center justify-between gap-2 rounded-lg bg-white px-2 py-1.5 text-xs"
                                >
                                  <button
                                    type="button"
                                    onClick={() => openEditor(product)}
                                    className="min-w-0 flex-1 truncate text-left font-medium text-slate-700 hover:text-slate-950"
                                  >
                                    {product.quantity > 1 ? `${product.quantity}× ` : ""}
                                    {product.name}
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => openRemoveFromCategory(product, category)}
                                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100"
                                    aria-label={`Quitar ${product.name} de ${category.name}`}
                                    title="Quitar de esta categoría"
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          ) : (
                            <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-2 text-xs text-slate-500">
                              Sin productos en esta categoría.
                            </div>
                          )}

                          <div className="flex items-center justify-between gap-2">
                            <V2Button
                              size="sm"
                              variant="secondary"
                              onClick={() => openCategoryEditor(category)}
                            >
                              Editar
                            </V2Button>

                            <div className="min-w-0 flex-1 text-center">
                              {finalPrice !== null ? (
                                <div>
                                  <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                    Precio final
                                  </p>
                                  <p className="font-bold text-slate-950">
                                    {formatCurrency(finalPrice)}
                                  </p>
                                </div>
                              ) : null}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => openAssignProduct(category)}
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-emerald-200 bg-emerald-600 text-white transition hover:bg-emerald-700"
                                aria-label={`Agregar producto a ${category.name}`}
                              >
                                <Plus size={16} />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </V2Card>
          </aside>
        </div>
      </div>

      {editingItem ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm">
          <div className="w-full max-w-3xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <p className="text-sm text-slate-500">
                  {editingItemMode === "create" ? "Nuevo producto" : "Editar producto"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {editingItem.name || "Producto sin nombre"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeEditor}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[72vh] overflow-y-auto overflow-x-hidden p-6">
              <div className="grid gap-5 lg:grid-cols-[220px_1fr]">
                <div>
                  <p className="mb-2 text-[13px] font-medium text-slate-700">
                    Imagen del producto
                  </p>

                  <div className="flex aspect-square items-center justify-center overflow-hidden rounded-2xl border border-dashed border-slate-300 bg-slate-50">
                    {editingItem.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={editingItem.imageUrl}
                        alt={editingItem.name}
                        className="h-full w-full object-cover"
                        onError={(event) => {
                          event.currentTarget.style.display = "none";
                        }}
                      />
                    ) : (
                      <div className="text-center text-slate-400">
                        <ImageIcon className="mx-auto" size={28} />
                        <p className="mt-2 text-xs">Sin imagen</p>
                      </div>
                    )}
                  </div>

                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="mt-3 block w-full text-sm text-slate-600 file:mr-3 file:h-9 file:rounded-lg file:border file:border-slate-200 file:bg-white file:px-3 file:text-sm file:font-semibold file:text-slate-700 hover:file:bg-slate-50"
                  />
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    Si existe una imagen en <code className="rounded bg-slate-100 px-1">src/app/local/menu/img</code> con el mismo nombre del producto, se vincula automáticamente.
                    Al renombrar el producto se conserva la imagen ya vinculada.
                  </p>
                </div>

                <div className="grid gap-4">
                  <V2Field label="Nombre">
                    <V2Input
                      value={editingItem.name}
                      onChange={(event) =>
                        setEditingItem({ ...editingItem, name: event.target.value })
                      }
                    />
                  </V2Field>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <V2Field label="Precio">
                      <V2Input
                        type="number"
                        value={editingItem.price}
                        onChange={(event) =>
                          setEditingItem({
                            ...editingItem,
                            price: Number(event.target.value),
                          })
                        }
                      />
                    </V2Field>

                    <V2Field label="Agregar a">
                      <V2Select
                        value={editingItem.categoryId}
                        onChange={(event) =>
                          setEditingItem({
                            ...editingItem,
                            categoryId: event.target.value,
                          })
                        }
                      >
                        <option value="">Sin categoría</option>
                        {sortedCategoriesForDropdowns.map((category) => (
                          <option key={category.id} value={category.id}>
                            {category.name}
                          </option>
                        ))}
                      </V2Select>
                    </V2Field>
                  </div>

                  <V2Field label="Descripción">
                    <V2Textarea
                      value={editingItem.description}
                      onChange={(event) =>
                        setEditingItem({
                          ...editingItem,
                          description: event.target.value,
                        })
                      }
                    />
                  </V2Field>

                  <div className="grid gap-4 md:grid-cols-3">
                    <V2Field label="Estado">
                      <V2Select
                        value={editingItem.status}
                        onChange={(event) =>
                          setEditingItem({
                            ...editingItem,
                            status: event.target.value as V2MenuItemStatus,
                          })
                        }
                      >
                        <option value="available">Disponible</option>
                        <option value="paused">Pausado</option>
                      </V2Select>
                    </V2Field>

                    <V2Field label="Web">
                      <V2Select
                        value={editingItem.visible ? "yes" : "no"}
                        onChange={(event) =>
                          setEditingItem({
                            ...editingItem,
                            visible: event.target.value === "yes",
                          })
                        }
                      >
                        <option value="yes">Visible en web</option>
                        <option value="no">Oculto en web</option>
                      </V2Select>
                    </V2Field>

                    <V2Field label="Destacado">
                      <V2Select
                        value={editingItem.featured ? "yes" : "no"}
                        onChange={(event) =>
                          setEditingItem({
                            ...editingItem,
                            featured: event.target.value === "yes",
                          })
                        }
                      >
                        <option value="yes">Destacado</option>
                        <option value="no">No destacado</option>
                      </V2Select>
                    </V2Field>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-200 p-6">
              <div>
                {editingItemMode === "edit" ? (
                  <V2Button
                    variant="danger"
                    icon={<Trash2 size={17} />}
                    onClick={() => openDeleteProduct(editingItem)}
                  >
                    Eliminar producto
                  </V2Button>
                ) : null}
              </div>

              <div className="flex justify-end gap-2">
                <V2Button variant="secondary" onClick={closeEditor}>
                  Cancelar
                </V2Button>
                <V2Button variant="primary" onClick={saveItem}>
                  Guardar cambios
                </V2Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {editingCategory ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm">
          <div className="w-full max-w-5xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <p className="text-sm text-slate-500">
                  {editingCategoryMode === "create" ? "Nueva categoría" : "Editar categoría"}
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {editingCategory.name || "Categoría sin nombre"}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeCategoryEditor}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6">
              <div className="grid gap-4">
                <V2Field label="Nombre">
                  <V2Input
                    value={editingCategory.name}
                    onChange={(event) =>
                      setEditingCategory({
                        ...editingCategory,
                        name: event.target.value,
                      })
                    }
                  />
                </V2Field>

                <div className="grid gap-4 lg:grid-cols-[1fr_220px]">
                  <V2Field label="Descripción">
                    <V2Textarea
                      rows={1}
                      className="min-h-[42px] resize-y"
                      value={editingCategory.description}
                      onChange={(event) =>
                        setEditingCategory({
                          ...editingCategory,
                          description: event.target.value,
                        })
                      }
                    />
                  </V2Field>

                  <label className="mt-6 flex h-[42px] cursor-pointer items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50">
                    <input
                      type="checkbox"
                      checked={Boolean(editingCategory.isPromotion)}
                      onChange={(event) =>
                        setEditingCategory({
                          ...editingCategory,
                          isPromotion: event.target.checked,
                        })
                      }
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Promoción
                  </label>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <V2Field label="Precio fijo de promoción">
                    <V2Input
                      type="number"
                      value={editingCategory.fixedPrice ?? ""}
                      placeholder="Ej: 15500"
                      onChange={(event) =>
                        setEditingCategory({
                          ...editingCategory,
                          fixedPrice: event.target.value === "" ? undefined : Number(event.target.value),
                        })
                      }
                    />
                  </V2Field>

                  <V2Field label="Descuento porcentual">
                    <V2Input
                      type="number"
                      value={editingCategory.discountPercent ?? ""}
                      placeholder="Ej: 15"
                      onChange={(event) =>
                        setEditingCategory({
                          ...editingCategory,
                          discountPercent: event.target.value === "" ? undefined : Number(event.target.value),
                        })
                      }
                    />
                  </V2Field>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <V2Field label="Web">
                    <V2Select
                      value={editingCategory.visible ? "yes" : "no"}
                      onChange={(event) =>
                        setEditingCategory({
                          ...editingCategory,
                          visible: event.target.value === "yes",
                        })
                      }
                    >
                      <option value="yes">Visible</option>
                      <option value="no">Oculta</option>
                    </V2Select>
                  </V2Field>

                  <V2Field label="Estado">
                    <V2Select
                      value={editingCategory.active ? "active" : "paused"}
                      onChange={(event) =>
                        setEditingCategory({
                          ...editingCategory,
                          active: event.target.value === "active",
                        })
                      }
                    >
                      <option value="active">Activa</option>
                      <option value="paused">Pausada</option>
                    </V2Select>
                  </V2Field>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Productos incluidos
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        Definí cantidades para esta categoría o combo.
                      </p>
                    </div>

                    {getCategoryFinalPrice(editingCategory) !== null ? (
                      <div className="text-right">
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                          Precio final
                        </p>
                        <p className="font-bold text-slate-950">
                          {formatCurrency(getCategoryFinalPrice(editingCategory) ?? 0)}
                        </p>
                      </div>
                    ) : null}
                  </div>

                  <div className="mt-4 max-h-[320px] overflow-y-auto overflow-x-hidden pr-1">
                    <div className="space-y-2">
                      {sortedMenuItemsForDropdowns.map((item) => {
                        const currentQuantity =
                          getCategoryProductEntries(editingCategory).find(
                            (entry) => entry.productId === item.id
                          )?.quantity ?? 0;

                        return (
                          <div
                            key={item.id}
                            className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm"
                          >
                            <div className="min-w-0 overflow-hidden">
                              <p className="max-w-full truncate font-semibold text-slate-950">
                                {item.name}
                              </p>
                              <p className="mt-0.5 text-xs text-slate-500">
                                {formatCurrency(item.price)}
                              </p>
                            </div>

                            <div className="flex shrink-0 items-center gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1">
                              <button
                                type="button"
                                onClick={() =>
                                  updateEditingCategoryQuantity(item.id, currentQuantity - 1)
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-700 transition hover:bg-slate-100"
                              >
                                −
                              </button>

                              <input
                                type="number"
                                min={0}
                                value={currentQuantity}
                                onChange={(event) =>
                                  updateEditingCategoryQuantity(
                                    item.id,
                                    Number(event.target.value)
                                  )
                                }
                                className="h-7 w-12 rounded-lg border border-slate-200 bg-white text-center text-sm font-semibold text-slate-950"
                              />

                              <button
                                type="button"
                                onClick={() =>
                                  updateEditingCategoryQuantity(item.id, currentQuantity + 1)
                                }
                                className="flex h-7 w-7 items-center justify-center rounded-lg bg-white text-slate-700 transition hover:bg-slate-100"
                              >
                                +
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between gap-2 border-t border-slate-200 p-6">
              <div>
                {editingCategoryMode === "edit" ? (
                  <V2Button
                    variant="danger"
                    icon={<Trash2 size={17} />}
                    onClick={() => openDeleteCategory(editingCategory)}
                  >
                    Eliminar categoría
                  </V2Button>
                ) : null}
              </div>

              <div className="flex justify-end gap-2">
                <V2Button variant="secondary" onClick={closeCategoryEditor}>
                  Cancelar
                </V2Button>
                <V2Button variant="primary" onClick={saveCategory}>
                  Guardar cambios
                </V2Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {assignCategory ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <p className="text-sm text-slate-500">Agregar producto existente</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {assignCategory.name}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeAssignProduct}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              <V2Field
                label="Producto"
                helper="Seleccioná un producto existente para incluirlo en esta categoría."
              >
                <V2Select
                  value={productToAssignId}
                  onChange={(event) => setProductToAssignId(event.target.value)}
                >
                  {productsOutsideAssignCategory.length > 0 ? (
                    productsOutsideAssignCategory.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name} · {getCategoryName(item.categoryId)}
                      </option>
                    ))
                  ) : (
                    <option value="">No hay productos disponibles</option>
                  )}
                </V2Select>
              </V2Field>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-6">
              <V2Button variant="secondary" onClick={closeAssignProduct}>
                Cancelar
              </V2Button>
              <V2Button
                variant="primary"
                onClick={assignProductToCategory}
                disabled={!productToAssignId}
              >
                Agregar a categoría
              </V2Button>
            </div>
          </div>
        </div>
      ) : null}

      {removeFromCategoryTarget ? (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/50 p-6 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <p className="text-sm text-slate-500">Quitar de categoría</p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {removeFromCategoryTarget.productName}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeRemoveFromCategoryDialog}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm leading-6 text-slate-600">
                ¿Querés quitar este producto de{" "}
                <strong className="text-slate-950">
                  {removeFromCategoryTarget.categoryName}
                </strong>
                ? El producto no se elimina del menú.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-6">
              <V2Button variant="secondary" onClick={closeRemoveFromCategoryDialog}>
                Cancelar
              </V2Button>
              <V2Button variant="danger" onClick={confirmRemoveFromCategory}>
                Quitar de categoría
              </V2Button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/50 p-6 backdrop-blur-sm">
          <div className="w-full max-w-xl rounded-3xl border border-red-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-red-100 p-6">
              <div>
                <p className="text-sm font-semibold text-red-700">
                  Confirmar eliminación
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  {deleteTarget.name}
                </h2>
              </div>

              <button
                type="button"
                onClick={closeDeleteDialog}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6">
              <p className="text-sm leading-6 text-slate-600">
                Esta acción no se puede deshacer en esta sesión mock. Para confirmar,
                escribí exactamente:
              </p>

              <div className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-sm font-semibold text-slate-950">
                {deleteTarget.name}
              </div>

              <div className="mt-4">
                <V2Field label="Confirmación">
                  <V2Input
                    value={deleteConfirmation}
                    onChange={(event) => setDeleteConfirmation(event.target.value)}
                    placeholder={deleteTarget.name}
                  />
                </V2Field>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-6">
              <V2Button variant="secondary" onClick={closeDeleteDialog}>
                Cancelar
              </V2Button>
              <V2Button
                variant="danger"
                icon={<Trash2 size={17} />}
                onClick={confirmDelete}
                disabled={deleteConfirmation !== deleteTarget.name}
              >
                Eliminar definitivamente
              </V2Button>
            </div>
          </div>
        </div>
      ) : null}
    </V2AppShell>
  );
}
