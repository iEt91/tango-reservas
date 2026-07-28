"use client";

import Link from "next/link";
import {
  CalendarDays,
  ExternalLink,
  Globe2,
  Image as ImageIcon,
  LayoutTemplate,
  MapPin,
  MessageCircle,
  Pencil,
  Save,
  Truck,
  Utensils,
  X,
} from "lucide-react";
import * as LucideIcons from "lucide-react";
import { useEffect, useState } from "react";
import { V2AppShell } from "@/components/v2/v2-app-shell";
import { V2Badge } from "@/components/v2/v2-badge";
import { V2Button } from "@/components/v2/v2-button";
import { V2Card } from "@/components/v2/v2-card";
import { V2Field, V2Input, V2Select, V2Textarea } from "@/components/v2/v2-input";
import { V2PageHeader } from "@/components/v2/v2-page-header";
import {
  v2WebConfig,
} from "@/lib/v2/v2-mock-data";

type WebConfigState = {
  businessName: string;
  publicUrl: string;
  status: "published" | "draft";
  heroEyebrow: string;
  heroTitle: string;
  heroSubtitle: string;
  primaryButtonLabel: string;
  secondaryButtonLabel: string;
  description: string;
  address: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  showMenu: boolean;
  showReservations: boolean;
  showWhatsApp: boolean;
  showGallery: boolean;
  showMap: boolean;
  showDelivery: boolean;
};

type WebTab = "portada" | "info" | "secciones";

type LocalMenuProduct = {
  id: string;
  name: string;
  description?: string;
  price?: number;
  imageUrl?: string;
  categoryId?: string;
  visible?: boolean;
  status?: string;
};

type LocalMenuCategory = {
  id: string;
  name: string;
  description?: string;
  order?: number;
  visible?: boolean;
  active?: boolean;
  isPromotion?: boolean;
};

type PublicMenuIconKey = string;

type PublicMenuSection = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  iconKey?: PublicMenuIconKey;
  productIds: string[];
  featuredProductIds?: string[];
};

const WEB_CONFIG_STORAGE_KEY = "tango-v2-local-web-config-v1";
const PUBLIC_MENU_SECTIONS_STORAGE_KEY = "tango-v2-public-menu-sections-v1";
const PUBLIC_MENU_SECTIONS_EVENT = "tango-v2-public-menu-sections-updated";
const MENU_ITEMS_STORAGE_KEY = "tango-v2-menu-items";
const MENU_CATEGORIES_STORAGE_KEY = "tango-v2-menu-categories";
const MENU_ITEMS_EVENT = "tango-v2-menu-items-updated";
const MENU_CATEGORIES_EVENT = "tango-v2-menu-categories-updated";
const WEB_CONFIG_EVENT = "tango-v2-local-web-config-updated";

type LucideMenuIconComponent = React.ElementType<{
  size?: number | string;
  className?: string;
  strokeWidth?: number | string;
}>;

const BLOCKED_LUCIDE_EXPORTS = new Set([
  "Icon",
  "LucideIcon",
  "LucideProvider",
  "createLucideIcon",
  "icons",
]);

function isRenderableLucideIconExport(iconName: string, iconValue: unknown) {
  if (!/^[A-Z]/.test(iconName)) return false;
  if (iconName.endsWith("Icon")) return false;
  if (BLOCKED_LUCIDE_EXPORTS.has(iconName)) return false;

  return typeof iconValue === "function" || (typeof iconValue === "object" && iconValue !== null);
}

const LUCIDE_ICON_LIBRARY = Object.entries(LucideIcons)
  .filter(([iconName, iconValue]) => isRenderableLucideIconExport(iconName, iconValue))
  .map(([iconName, Icon]) => ({
    key: iconName,
    label: iconName.replace(/([a-z])([A-Z])/g, "$1 $2"),
    Icon: Icon as LucideMenuIconComponent,
  }))
  .sort((first, second) => first.label.localeCompare(second.label, "es"));

const DEFAULT_PUBLIC_MENU_ICON_KEY = "Utensils";

function normalizePublicMenuIconKey(iconKey?: PublicMenuIconKey): PublicMenuIconKey | undefined {
  const aliases: Record<string, string> = {
    leaf: "Leaf",
    utensils: "Utensils",
    bag: "ShoppingBag",
    star: "Star",
    wine: "Wine",
    bike: "Bike",
    clock: "Clock",
    calendar: "CalendarDays",
  };

  return iconKey ? aliases[iconKey] ?? iconKey : undefined;
}

function getPublicMenuIconOption(iconKey?: PublicMenuIconKey) {
  const normalizedIconKey = normalizePublicMenuIconKey(iconKey);

  return (
    LUCIDE_ICON_LIBRARY.find((option) => option.key === normalizedIconKey) ??
    LUCIDE_ICON_LIBRARY.find((option) => option.key === DEFAULT_PUBLIC_MENU_ICON_KEY) ??
    LUCIDE_ICON_LIBRARY.find((option) => option.key === "Leaf") ??
    LUCIDE_ICON_LIBRARY[0]
  );
}

function inferPublicMenuIconKey(name: string): PublicMenuIconKey {
  const normalizedName = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

  if (
    normalizedName.includes("bebida") ||
    normalizedName.includes("vino") ||
    normalizedName.includes("trago")
  ) {
    return "Wine";
  }

  if (
    normalizedName.includes("postre") ||
    normalizedName.includes("tortilla")
  ) {
    return "Star";
  }

  if (
    normalizedName.includes("sandwich") ||
    normalizedName.includes("pan") ||
    normalizedName.includes("burger")
  ) {
    return "ShoppingBag";
  }

  if (
    normalizedName.includes("ensalada") ||
    normalizedName.includes("vegetal") ||
    normalizedName.includes("clasico")
  ) {
    return "Leaf";
  }

  return DEFAULT_PUBLIC_MENU_ICON_KEY;
}

function normalizeWebConfig(value?: Partial<WebConfigState> | null): WebConfigState {
  return {
    businessName: value?.businessName ?? v2WebConfig.businessName,
    publicUrl: value?.publicUrl ?? v2WebConfig.publicUrl,
    status: value?.status === "draft" ? "draft" : v2WebConfig.status === "published" ? "published" : "draft",
    heroEyebrow: value?.heroEyebrow ?? v2WebConfig.heroEyebrow,
    heroTitle: value?.heroTitle ?? v2WebConfig.heroTitle,
    heroSubtitle: value?.heroSubtitle ?? v2WebConfig.heroSubtitle,
    primaryButtonLabel: value?.primaryButtonLabel ?? v2WebConfig.primaryButtonLabel,
    secondaryButtonLabel: value?.secondaryButtonLabel ?? v2WebConfig.secondaryButtonLabel,
    description: value?.description ?? v2WebConfig.description,
    address: value?.address ?? v2WebConfig.address,
    phone: value?.phone ?? v2WebConfig.phone,
    whatsapp: value?.whatsapp ?? v2WebConfig.whatsapp,
    instagram: value?.instagram ?? v2WebConfig.instagram,
    showMenu: value?.showMenu ?? Boolean(v2WebConfig.showMenu),
    showReservations: value?.showReservations ?? Boolean(v2WebConfig.showReservations),
    showWhatsApp: value?.showWhatsApp ?? Boolean(v2WebConfig.showWhatsApp),
    showGallery: value?.showGallery ?? Boolean(v2WebConfig.showGallery),
    showMap: value?.showMap ?? Boolean(v2WebConfig.showMap),
    showDelivery: value?.showDelivery ?? true,
  };
}

function readStoredWebConfig() {
  if (typeof window === "undefined") return normalizeWebConfig();

  try {
    const rawValue = window.localStorage.getItem(WEB_CONFIG_STORAGE_KEY);
    return normalizeWebConfig(rawValue ? JSON.parse(rawValue) as Partial<WebConfigState> : null);
  } catch {
    return normalizeWebConfig();
  }
}

function writeStoredWebConfig(config: WebConfigState) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(WEB_CONFIG_STORAGE_KEY, JSON.stringify(config));
  window.dispatchEvent(new Event(WEB_CONFIG_EVENT));
}

function readLocalMenuCategories(): LocalMenuCategory[] {
  if (typeof window === "undefined") return [];

  try {
    const rawValue = window.localStorage.getItem(MENU_CATEGORIES_STORAGE_KEY);
    const parsedCategories = rawValue ? (JSON.parse(rawValue) as LocalMenuCategory[]) : [];

    return parsedCategories
      .filter((category) => category.visible !== false && category.active !== false && !category.isPromotion)
      .sort((a, b) => (a.order ?? 999) - (b.order ?? 999));
  } catch {
    return [];
  }
}

function createDefaultPublicMenuSections(
  products: LocalMenuProduct[] = [],
  categories: LocalMenuCategory[] = []
): PublicMenuSection[] {
  const visibleCategories = categories.length > 0
    ? categories
    : [
        { id: "entradas", name: "Entradas", description: "Platos visibles en la web.", order: 1 },
        { id: "principales", name: "Principales", description: "Platos visibles en la web.", order: 2 },
        { id: "postres", name: "Postres", description: "Platos visibles en la web.", order: 3 },
      ];

  return visibleCategories.map((category) => {
    const categoryProducts = products.filter((product) => product.categoryId === category.id);
    const productIds = categoryProducts.map((product) => product.id);

    return {
      id: category.id,
      name: category.name || "Nueva sección",
      description: category.description || "Platos visibles en la web.",
      active: category.visible !== false && category.active !== false,
      iconKey: inferPublicMenuIconKey(category.name || ""),
      productIds,
      featuredProductIds: categoryProducts
        .filter((product) => productIds.includes(product.id))
        .slice(0, 2)
        .map((product) => product.id),
    };
  });
}

function readLocalMenuProducts(): LocalMenuProduct[] {
  if (typeof window === "undefined") return [];

  try {
    const rawValue = window.localStorage.getItem(MENU_ITEMS_STORAGE_KEY);
    const parsedProducts = rawValue ? (JSON.parse(rawValue) as LocalMenuProduct[]) : [];

    return parsedProducts.filter(
      (product) => product.visible !== false && product.status !== "paused"
    );
  } catch {
    return [];
  }
}

function readPublicMenuSections(
  products: LocalMenuProduct[],
  categories: LocalMenuCategory[]
): PublicMenuSection[] {
  const defaultSections = createDefaultPublicMenuSections(products, categories);

  if (typeof window === "undefined") return defaultSections;

  try {
    const rawValue = window.localStorage.getItem(PUBLIC_MENU_SECTIONS_STORAGE_KEY);
    const parsedSections = rawValue ? (JSON.parse(rawValue) as PublicMenuSection[]) : null;

    if (!parsedSections || parsedSections.length === 0) {
      return defaultSections;
    }

    const validCategoryIds = new Set(categories.map((category) => category.id));
    const sectionById = new Map(parsedSections.map((section) => [section.id, section]));
    const sectionByName = new Map(
      parsedSections.map((section) => [section.name.trim().toLowerCase(), section])
    );

    if (categories.length > 0) {
      return defaultSections.map((defaultSection) => {
        const storedSection =
          sectionById.get(defaultSection.id) ??
          sectionByName.get(defaultSection.name.trim().toLowerCase());

        const allowedProductIds = new Set(
          products
            .filter((product) => product.categoryId === defaultSection.id)
            .map((product) => product.id)
        );

        const storedProductIds = storedSection?.productIds?.filter((productId) =>
          allowedProductIds.has(productId)
        );

        const productIds =
          storedProductIds && storedProductIds.length > 0
            ? storedProductIds
            : defaultSection.productIds;

        return {
          ...defaultSection,
          description: storedSection?.description || defaultSection.description,
          active: storedSection?.active ?? defaultSection.active,
          iconKey: storedSection?.iconKey ?? defaultSection.iconKey,
          productIds,
          featuredProductIds: (storedSection?.featuredProductIds ?? defaultSection.featuredProductIds ?? []).filter(
            (productId) => productIds.includes(productId)
          ),
        };
      });
    }

    return parsedSections
      .filter((section) => !validCategoryIds.size || validCategoryIds.has(section.id))
      .map((section) => ({
        id: section.id,
        name: section.name || "Nueva sección",
        description: section.description || "Sección visible en la web.",
        active: section.active !== false,
        iconKey: section.iconKey ?? inferPublicMenuIconKey(section.name || ""),
        productIds: Array.isArray(section.productIds) ? section.productIds : [],
        featuredProductIds: Array.isArray(section.featuredProductIds)
          ? section.featuredProductIds.filter((productId) =>
              Array.isArray(section.productIds) ? section.productIds.includes(productId) : false
            )
          : [],
      }));
  } catch {
    return defaultSections;
  }
}

function writePublicMenuSections(sections: PublicMenuSection[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(PUBLIC_MENU_SECTIONS_STORAGE_KEY, JSON.stringify(sections));
  window.dispatchEvent(new Event(PUBLIC_MENU_SECTIONS_EVENT));
}

function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

function ToggleRow({
  title,
  description,
  enabled,
  onChange,
  icon,
}: {
  title: string;
  description: string;
  enabled: boolean;
  onChange: (value: boolean) => void;
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex min-w-0 items-start gap-3">
        <div className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl",
          enabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
        )}>
          {icon}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-slate-950">{title}</p>
          <p className="mt-1 text-sm leading-5 text-slate-500">{description}</p>
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChange(!enabled)}
        className={cn(
          "relative h-7 w-12 shrink-0 rounded-full transition",
          enabled ? "bg-emerald-600" : "bg-slate-300"
        )}
        aria-label={enabled ? `Desactivar ${title}` : `Activar ${title}`}
      >
        <span
          className={cn(
            "absolute top-1 h-5 w-5 rounded-full bg-white shadow transition",
            enabled ? "left-6" : "left-1"
          )}
        />
      </button>
    </div>
  );
}

export function V2WebPage() {
  const [activeTab, setActiveTab] = useState<WebTab>("portada");
  const [config, setConfig] = useState<WebConfigState>(() => normalizeWebConfig());
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [localMenuProducts, setLocalMenuProducts] = useState<LocalMenuProduct[]>([]);
  const [publicMenuSections, setPublicMenuSections] = useState<PublicMenuSection[]>([]);
  const [selectedPublicMenuSectionId, setSelectedPublicMenuSectionId] = useState("");
  const [isPublicMenuPopupOpen, setIsPublicMenuPopupOpen] = useState(false);
  const [isPublicMenuIconPickerOpen, setIsPublicMenuIconPickerOpen] = useState(false);
  const [publicMenuIconSearch, setPublicMenuIconSearch] = useState("");

  useEffect(() => {
    setConfig(readStoredWebConfig());

    function loadMenuPublicSections() {
      const products = readLocalMenuProducts();
      const categories = readLocalMenuCategories();
      const sections = readPublicMenuSections(products, categories);

      setLocalMenuProducts(products);
      setPublicMenuSections(sections);
      setSelectedPublicMenuSectionId((currentSectionId) =>
        sections.some((section) => section.id === currentSectionId)
          ? currentSectionId
          : sections[0]?.id ?? ""
      );
    }

    loadMenuPublicSections();

    window.addEventListener("storage", loadMenuPublicSections);
    window.addEventListener(MENU_ITEMS_EVENT, loadMenuPublicSections);
    window.addEventListener(MENU_CATEGORIES_EVENT, loadMenuPublicSections);

    return () => {
      window.removeEventListener("storage", loadMenuPublicSections);
      window.removeEventListener(MENU_ITEMS_EVENT, loadMenuPublicSections);
      window.removeEventListener(MENU_CATEGORIES_EVENT, loadMenuPublicSections);
    };
  }, []);

  useEffect(() => {
    setIsPublicMenuIconPickerOpen(false);
    setPublicMenuIconSearch("");
  }, [selectedPublicMenuSectionId]);

  const isPublished = config.status === "published";
  const activeSections = [
    config.showMenu,
    config.showReservations,
    config.showWhatsApp,
    config.showGallery,
    config.showMap,
    config.showDelivery,
  ].filter(Boolean).length;

  const selectedPublicMenuSection =
    publicMenuSections.find((section) => section.id === selectedPublicMenuSectionId) ??
    publicMenuSections[0] ??
    null;

  const selectedPublicMenuProducts = selectedPublicMenuSection
    ? selectedPublicMenuSection.productIds
        .map((productId) => localMenuProducts.find((product) => product.id === productId))
        .filter(Boolean) as LocalMenuProduct[]
    : [];

  const selectedFeaturedProductIds = selectedPublicMenuSection?.featuredProductIds ?? [];
  const selectedPublicMenuIconOption = getPublicMenuIconOption(selectedPublicMenuSection?.iconKey);
  const filteredPublicMenuIconOptions = LUCIDE_ICON_LIBRARY.filter((option) =>
    option.label.toLowerCase().includes(publicMenuIconSearch.trim().toLowerCase()) ||
    option.key.toLowerCase().includes(publicMenuIconSearch.trim().toLowerCase())
  );

  const productsAvailableForSelectedSection = selectedPublicMenuSection
    ? localMenuProducts.filter(
        (product) => !selectedPublicMenuSection.productIds.includes(product.id)
      )
    : localMenuProducts;

  const publishedPublicMenuSections = publicMenuSections.filter((section) => section.active);
  const publishedPublicMenuProductIds = new Set(
    publishedPublicMenuSections.flatMap((section) => section.productIds)
  );
  const publishedPublicMenuFeaturedIds = new Set(
    publishedPublicMenuSections.flatMap((section) => section.featuredProductIds ?? [])
  );
  const hiddenPublicMenuSections = publicMenuSections.filter((section) => !section.active);

  function updateConfig<K extends keyof WebConfigState>(key: K, value: WebConfigState[K]) {
    setConfig((current) => ({
      ...current,
      [key]: value,
    }));
    setSaveStatus("idle");
  }

  function saveConfig() {
    writeStoredWebConfig(config);
    writePublicMenuSections(publicMenuSections);
    setSaveStatus("saved");
  }

  function updatePublicMenuSection(sectionId: string, updates: Partial<PublicMenuSection>) {
    setPublicMenuSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              ...updates,
            }
          : section
      )
    );
    setSaveStatus("idle");
  }

  function createPublicMenuSection() {
    const newSection: PublicMenuSection = {
      id: `web-section-${Date.now()}`,
      name: "Nueva sección",
      description: "Descripción de la sección.",
      active: true,
      iconKey: DEFAULT_PUBLIC_MENU_ICON_KEY,
      productIds: [],
      featuredProductIds: [],
    };

    setPublicMenuSections((current) => [...current, newSection]);
    setSelectedPublicMenuSectionId(newSection.id);
    setSaveStatus("idle");
  }

  function deletePublicMenuSection(sectionId: string) {
    setPublicMenuSections((current) => {
      const nextSections = current.filter((section) => section.id !== sectionId);
      setSelectedPublicMenuSectionId(nextSections[0]?.id ?? "");

      return nextSections;
    });
    setSaveStatus("idle");
  }

  function addProductToPublicSection(sectionId: string, productId: string) {
    if (!productId) return;

    setPublicMenuSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              productIds: section.productIds.includes(productId)
                ? section.productIds
                : [...section.productIds, productId],
            }
          : section
      )
    );
    setSaveStatus("idle");
  }

  function removeProductFromPublicSection(sectionId: string, productId: string) {
    setPublicMenuSections((current) =>
      current.map((section) =>
        section.id === sectionId
          ? {
              ...section,
              productIds: section.productIds.filter((currentProductId) => currentProductId !== productId),
              featuredProductIds: (section.featuredProductIds ?? []).filter(
                (currentProductId) => currentProductId !== productId
              ),
            }
          : section
      )
    );
    setSaveStatus("idle");
  }

  function movePublicMenuSection(sectionId: string, direction: "up" | "down") {
    setPublicMenuSections((current) => {
      const currentIndex = current.findIndex((section) => section.id === sectionId);
      const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= current.length) return current;

      const nextSections = [...current];
      const [section] = nextSections.splice(currentIndex, 1);
      nextSections.splice(nextIndex, 0, section);

      return nextSections;
    });
    setSaveStatus("idle");
  }

  function moveProductInPublicSection(
    sectionId: string,
    productId: string,
    direction: "up" | "down"
  ) {
    setPublicMenuSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) return section;

        const currentIndex = section.productIds.indexOf(productId);
        const nextIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;

        if (currentIndex < 0 || nextIndex < 0 || nextIndex >= section.productIds.length) {
          return section;
        }

        const nextProductIds = [...section.productIds];
        const [currentProductId] = nextProductIds.splice(currentIndex, 1);
        nextProductIds.splice(nextIndex, 0, currentProductId);

        return {
          ...section,
          productIds: nextProductIds,
        };
      })
    );
    setSaveStatus("idle");
  }

  function toggleFeaturedPublicProduct(sectionId: string, productId: string) {
    setPublicMenuSections((current) =>
      current.map((section) => {
        if (section.id !== sectionId) return section;

        const currentFeaturedProductIds = section.featuredProductIds ?? [];
        const isFeatured = currentFeaturedProductIds.includes(productId);

        return {
          ...section,
          featuredProductIds: isFeatured
            ? currentFeaturedProductIds.filter((currentProductId) => currentProductId !== productId)
            : [...currentFeaturedProductIds, productId],
        };
      })
    );
    setSaveStatus("idle");
  }

  const tabs: Array<{ id: WebTab; label: string; icon: React.ReactNode }> = [
    { id: "portada", label: "Portada", icon: <ImageIcon size={16} /> },
    { id: "info", label: "Información", icon: <Globe2 size={16} /> },
    { id: "secciones", label: "Secciones", icon: <LayoutTemplate size={16} /> },
  ];

  return (
    <V2AppShell>
      <div className="flex h-full min-h-0 flex-col">
        <V2PageHeader
          title="Web"
          description="Configurá la web pública del local: portada, datos comerciales, reservas, delivery y secciones visibles."
          actions={
            <>
              {saveStatus === "saved" ? (
                <span className="inline-flex h-10 items-center rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-bold text-emerald-700">
                  Cambios guardados
                </span>
              ) : null}

              <Link
                href="/local/web/plantillas"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <LayoutTemplate size={17} />
                Plantillas
              </Link>

              <Link
                href="/local/web/editor"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Pencil size={17} />
                Editor
              </Link>

              <a
                href="/demuru"
                target="_blank"
                rel="noreferrer"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <ExternalLink size={17} />
                Ver sitio
              </a>

              <V2Button variant="primary" icon={<Save size={17} />} onClick={saveConfig}>
                Guardar cambios
              </V2Button>
            </>
          }
        />

        <div className="mt-4 grid shrink-0 gap-4 md:grid-cols-4">
          <V2Card className="bg-gradient-to-br from-emerald-50 to-white">
            <p className="text-xs font-bold uppercase tracking-wide text-emerald-600">Estado</p>
            <div className="mt-2 flex items-center justify-between gap-3">
              <p className="text-2xl font-black text-slate-950">
                {isPublished ? "Publicada" : "Borrador"}
              </p>
              <V2Badge tone={isPublished ? "green" : "red"}>
                {isPublished ? "Online" : "Offline"}
              </V2Badge>
            </div>
          </V2Card>

          <V2Card>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">URL pública</p>
            <p className="mt-2 truncate text-lg font-black text-slate-950">{config.publicUrl}</p>
            <p className="mt-1 text-xs text-slate-500">Ruta comercial del local</p>
          </V2Card>

          <V2Card>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Secciones activas</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{activeSections}/6</p>
            <p className="mt-1 text-xs text-slate-500">Menú, reservas, delivery y contacto</p>
          </V2Card>

          <V2Card>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Menú público</p>
            <p className="mt-2 text-2xl font-black text-slate-950">
              {publishedPublicMenuProductIds.size}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {publishedPublicMenuSections.length} visibles · {hiddenPublicMenuSections.length} ocultas · {publishedPublicMenuFeaturedIds.size} destacados
            </p>
          </V2Card>
        </div>

        <div className="mt-4 min-h-0 flex-1">
          <V2Card className="flex h-full min-h-0 flex-col overflow-hidden p-0">
            <div className="shrink-0 border-b border-slate-200 bg-white p-5">
              <div className="grid grid-cols-3 rounded-2xl border border-slate-200 bg-slate-50 p-1">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;

                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        "inline-flex h-10 items-center justify-center gap-2 rounded-xl text-xs font-bold transition",
                        isActive
                          ? "bg-slate-950 text-white shadow-sm"
                          : "text-slate-500 hover:text-slate-950"
                      )}
                    >
                      {tab.icon}
                      {tab.label}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-slate-50/60 p-5">
              {activeTab === "portada" ? (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">Portada</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Lo primero que ve el cliente cuando entra a la web pública.
                    </p>
                  </div>

                  <V2Field label="Estado de publicación">
                    <V2Select
                      value={config.status}
                      onChange={(event) =>
                        updateConfig("status", event.target.value as WebConfigState["status"])
                      }
                    >
                      <option value="published">Publicada</option>
                      <option value="draft">Borrador</option>
                    </V2Select>
                  </V2Field>

                  <V2Field label="Texto superior">
                    <V2Input
                      value={config.heroEyebrow}
                      onChange={(event) => updateConfig("heroEyebrow", event.target.value)}
                    />
                  </V2Field>

                  <V2Field label="Título principal">
                    <V2Input
                      value={config.heroTitle}
                      onChange={(event) => updateConfig("heroTitle", event.target.value)}
                    />
                  </V2Field>

                  <V2Field label="Subtítulo">
                    <V2Textarea
                      value={config.heroSubtitle}
                      onChange={(event) => updateConfig("heroSubtitle", event.target.value)}
                    />
                  </V2Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <V2Field label="Botón reservas">
                      <V2Input
                        value={config.primaryButtonLabel}
                        onChange={(event) => updateConfig("primaryButtonLabel", event.target.value)}
                      />
                    </V2Field>

                    <V2Field label="Botón secundario">
                      <V2Input
                        value={config.secondaryButtonLabel}
                        onChange={(event) => updateConfig("secondaryButtonLabel", event.target.value)}
                      />
                    </V2Field>
                  </div>

                  <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900">
                    La imagen de portada y la galería fina se editan desde <strong>Editor</strong> y <strong>Plantillas</strong>.
                  </div>
                </div>
              ) : null}

              {activeTab === "info" ? (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">Información pública</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Datos visibles para clientes: nombre, dirección, teléfono y redes.
                    </p>
                  </div>

                  <V2Field label="Nombre público">
                    <V2Input
                      value={config.businessName}
                      onChange={(event) => updateConfig("businessName", event.target.value)}
                    />
                  </V2Field>

                  <V2Field label="Descripción">
                    <V2Textarea
                      value={config.description}
                      onChange={(event) => updateConfig("description", event.target.value)}
                    />
                  </V2Field>

                  <V2Field label="URL pública">
                    <V2Input
                      value={config.publicUrl}
                      onChange={(event) => updateConfig("publicUrl", event.target.value)}
                    />
                  </V2Field>

                  <V2Field label="Dirección">
                    <V2Input
                      value={config.address}
                      onChange={(event) => updateConfig("address", event.target.value)}
                    />
                  </V2Field>

                  <div className="grid gap-4 sm:grid-cols-2">
                    <V2Field label="Teléfono">
                      <V2Input
                        value={config.phone}
                        onChange={(event) => updateConfig("phone", event.target.value)}
                      />
                    </V2Field>

                    <V2Field label="WhatsApp">
                      <V2Input
                        value={config.whatsapp}
                        onChange={(event) => updateConfig("whatsapp", event.target.value)}
                      />
                    </V2Field>
                  </div>

                  <V2Field label="Instagram">
                    <V2Input
                      value={config.instagram}
                      onChange={(event) => updateConfig("instagram", event.target.value)}
                    />
                  </V2Field>
                </div>
              ) : null}

              {activeTab === "secciones" ? (
                <div className="space-y-5">
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">Secciones visibles</h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Definí qué herramientas comerciales aparecen en la web.
                    </p>
                  </div>

                  <ToggleRow
                    title="Menú público"
                    description="Muestra platos destacados y categorías visibles del menú."
                    enabled={config.showMenu}
                    onChange={(value) => updateConfig("showMenu", value)}
                    icon={<Utensils size={18} />}
                  />

                  {config.showMenu ? (
                    <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-950">
                            Configurar menú público
                          </p>
                          <p className="mt-1 text-xs leading-5 text-slate-500">
                            Elegí qué secciones y platos del catálogo interno aparecen en la web pública.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => setIsPublicMenuPopupOpen(true)}
                          className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                        >
                          Abrir configuración
                        </button>
                      </div>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {publicMenuSections.map((section) => {
                          const Icon = getPublicMenuIconOption(section.iconKey).Icon;

                          return (
                            <span
                              key={section.id}
                              className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600"
                            >
                              <Icon size={13} className="text-emerald-700" />
                              {section.name} · {section.productIds.length} platos
                            </span>
                          );
                        })}
                      </div>
                    </div>
                  ) : null}

                  <ToggleRow
                    title="Reservas online"
                    description="Permite que el cliente reserve desde la web pública."
                    enabled={config.showReservations}
                    onChange={(value) => updateConfig("showReservations", value)}
                    icon={<CalendarDays size={18} />}
                  />

                  <ToggleRow
                    title="Delivery / pedidos online"
                    description="Muestra acceso comercial a pedidos, take away o delivery."
                    enabled={config.showDelivery}
                    onChange={(value) => updateConfig("showDelivery", value)}
                    icon={<Truck size={18} />}
                  />

                  <ToggleRow
                    title="WhatsApp"
                    description="Deja visible el canal directo de contacto por WhatsApp."
                    enabled={config.showWhatsApp}
                    onChange={(value) => updateConfig("showWhatsApp", value)}
                    icon={<MessageCircle size={18} />}
                  />

                  <ToggleRow
                    title="Galería"
                    description="Muestra imágenes del local, ambiente, platos y experiencia."
                    enabled={config.showGallery}
                    onChange={(value) => updateConfig("showGallery", value)}
                    icon={<ImageIcon size={18} />}
                  />

                  <ToggleRow
                    title="Mapa"
                    description="Muestra ubicación y dirección del local."
                    enabled={config.showMap}
                    onChange={(value) => updateConfig("showMap", value)}
                    icon={<MapPin size={18} />}
                  />
                </div>
              ) : null}
            </div>
          </V2Card>
        </div>

        {isPublicMenuPopupOpen ? (
          <div
            className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-6 backdrop-blur-sm"
            onClick={() => setIsPublicMenuPopupOpen(false)}
          >
            <div
              className="flex h-[min(820px,calc(100dvh-3rem))] w-full max-w-5xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
              onClick={(event) => event.stopPropagation()}
            >
              <div className="flex items-start justify-between gap-4 border-b border-slate-200 bg-gradient-to-r from-emerald-50 via-white to-slate-50 p-6">
                <div>
                  <p className="text-sm font-semibold text-emerald-700">Web pública</p>
                  <h2 className="mt-1 text-xl font-semibold text-slate-950">
                    Configurar menú público
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Armá las secciones visibles de la web usando platos existentes de /local/menu.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsPublicMenuPopupOpen(false)}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                  aria-label="Cerrar"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="grid min-h-0 flex-1 gap-4 overflow-hidden bg-slate-50/70 p-5 lg:grid-cols-[300px_1fr]">
                <div className="flex min-h-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-950">Secciones</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {publicMenuSections.length} configuradas
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={createPublicMenuSection}
                      className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 transition hover:bg-emerald-100"
                    >
                      + Nueva
                    </button>
                  </div>

                  <div className="mt-4 min-h-0 flex-1 space-y-2 overflow-y-auto pr-1">
                    {publicMenuSections.map((section, sectionIndex) => {
                      const isSelected = selectedPublicMenuSection?.id === section.id;

                      return (
                        <div
                          key={section.id}
                          className={cn(
                            "rounded-2xl border p-3 transition",
                            isSelected
                              ? "border-emerald-300 bg-emerald-50"
                              : "border-slate-200 bg-white hover:bg-slate-50"
                          )}
                        >
                          <button
                            type="button"
                            onClick={() => setSelectedPublicMenuSectionId(section.id)}
                            className="block w-full text-left"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <div className="flex min-w-0 items-center gap-2">
                                {(() => {
                                  const Icon = getPublicMenuIconOption(section.iconKey).Icon;

                                  return <Icon size={16} className="shrink-0 text-emerald-700" />;
                                })()}
                                <p className="truncate text-sm font-semibold text-slate-950">
                                  {section.name}
                                </p>
                              </div>
                              <span
                                className={cn(
                                  "rounded-full px-2 py-0.5 text-[11px] font-bold",
                                  section.active
                                    ? "bg-emerald-100 text-emerald-700"
                                    : "bg-slate-100 text-slate-500"
                                )}
                              >
                                {section.active ? "Visible" : "Oculta"}
                              </span>
                            </div>
                            <p className="mt-1 text-xs text-slate-500">
                              {section.productIds.length} platos · {(section.featuredProductIds ?? []).length} destacados
                            </p>
                          </button>

                          <div className="mt-3 grid grid-cols-2 gap-2">
                            <button
                              type="button"
                              onClick={() => movePublicMenuSection(section.id, "up")}
                              disabled={sectionIndex === 0}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Subir
                            </button>
                            <button
                              type="button"
                              onClick={() => movePublicMenuSection(section.id, "down")}
                              disabled={sectionIndex === publicMenuSections.length - 1}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                            >
                              Bajar
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="min-h-0 overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  {selectedPublicMenuSection ? (
                    <div className="grid gap-5">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <p className="text-base font-semibold text-slate-950">
                            {selectedPublicMenuSection.name}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">
                            Editá el nombre, descripción y platos visibles.
                          </p>
                        </div>

                        <button
                          type="button"
                          onClick={() => deletePublicMenuSection(selectedPublicMenuSection.id)}
                          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-bold text-red-600 transition hover:bg-red-100"
                        >
                          Eliminar sección
                        </button>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <V2Field label="Nombre de sección">
                          <V2Input
                            value={selectedPublicMenuSection.name}
                            onChange={(event) =>
                              updatePublicMenuSection(selectedPublicMenuSection.id, {
                                name: event.target.value,
                              })
                            }
                          />
                        </V2Field>

                        <V2Field label="Estado">
                          <button
                            type="button"
                            onClick={() =>
                              updatePublicMenuSection(selectedPublicMenuSection.id, {
                                active: !selectedPublicMenuSection.active,
                              })
                            }
                            className={cn(
                              "flex h-11 items-center justify-center rounded-xl border px-4 text-sm font-bold transition",
                              selectedPublicMenuSection.active
                                ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                : "border-slate-200 bg-slate-50 text-slate-500"
                            )}
                          >
                            {selectedPublicMenuSection.active ? "Visible en web" : "Oculta en web"}
                          </button>
                        </V2Field>
                      </div>

                      <V2Field label="Ícono de sección">
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setIsPublicMenuIconPickerOpen((current) => !current)}
                            className="flex h-11 w-full items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              {selectedPublicMenuIconOption ? (
                                <selectedPublicMenuIconOption.Icon
                                  size={20}
                                  className="shrink-0 text-emerald-700"
                                />
                              ) : null}
                              <span className="truncate">
                                {selectedPublicMenuIconOption?.label ?? "Seleccionar ícono"}
                              </span>
                            </span>
                            <span className="text-xs font-bold text-slate-400">
                              {isPublicMenuIconPickerOpen ? "Cerrar" : "Abrir"}
                            </span>
                          </button>

                          {isPublicMenuIconPickerOpen ? (
                            <div className="absolute left-0 right-0 top-12 z-20 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
                              <div className="border-b border-slate-200 p-3">
                                <V2Input
                                  value={publicMenuIconSearch}
                                  placeholder="Buscar ícono..."
                                  onChange={(event) => setPublicMenuIconSearch(event.target.value)}
                                />
                                <p className="mt-2 text-xs text-slate-400">
                                  {filteredPublicMenuIconOptions.length} íconos disponibles
                                </p>
                              </div>

                              <div className="max-h-72 overflow-y-auto p-3">
                                <div className="grid grid-cols-5 gap-2 sm:grid-cols-8">
                                  {filteredPublicMenuIconOptions.map((option) => {
                                    const Icon = option.Icon;
                                    const isSelected = selectedPublicMenuSection.iconKey === option.key;

                                    return (
                                      <button
                                        key={option.key}
                                        type="button"
                                        title={option.label}
                                        onClick={() => {
                                          updatePublicMenuSection(selectedPublicMenuSection.id, {
                                            iconKey: option.key,
                                          });
                                          setIsPublicMenuIconPickerOpen(false);
                                          setPublicMenuIconSearch("");
                                        }}
                                        className={cn(
                                          "flex h-11 items-center justify-center rounded-xl border transition",
                                          isSelected
                                            ? "border-emerald-300 bg-emerald-50 text-emerald-700 shadow-sm"
                                            : "border-slate-200 bg-white text-slate-500 hover:bg-slate-50"
                                        )}
                                      >
                                        <Icon size={20} />
                                      </button>
                                    );
                                  })}
                                </div>
                              </div>
                            </div>
                          ) : null}
                        </div>
                      </V2Field>

                      <V2Field label="Descripción">
                        <V2Input
                          value={selectedPublicMenuSection.description}
                          onChange={(event) =>
                            updatePublicMenuSection(selectedPublicMenuSection.id, {
                              description: event.target.value,
                            })
                          }
                        />
                      </V2Field>

                      <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                        <V2Field label="Agregar plato desde /local/menu">
                          <V2Select
                            value=""
                            onChange={(event) =>
                              addProductToPublicSection(
                                selectedPublicMenuSection.id,
                                event.target.value
                              )
                            }
                          >
                            <option value="">Seleccionar producto</option>
                            {productsAvailableForSelectedSection.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name}
                              </option>
                            ))}
                          </V2Select>
                        </V2Field>
                      </div>

                      <div>
                        <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                          Platos visibles en esta sección
                        </p>

                        <div className="mt-3 grid gap-3 md:grid-cols-2">
                          {selectedPublicMenuProducts.length > 0 ? (
                            selectedPublicMenuProducts.map((product, productIndex) => {
                              const isFeatured = selectedFeaturedProductIds.includes(product.id);

                              return (
                                <div
                                  key={product.id}
                                  className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm"
                                >
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <div className="flex flex-wrap items-center gap-2">
                                        <p className="truncate text-sm font-semibold text-slate-950">
                                          {product.name}
                                        </p>
                                        {isFeatured ? (
                                          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-bold text-amber-700">
                                            Destacado
                                          </span>
                                        ) : null}
                                      </div>
                                      <p className="mt-1 truncate text-xs text-slate-500">
                                        {product.description || "Sin descripción"}
                                      </p>
                                    </div>

                                    <button
                                      type="button"
                                      onClick={() =>
                                        removeProductFromPublicSection(
                                          selectedPublicMenuSection.id,
                                          product.id
                                        )
                                      }
                                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-bold text-red-600 transition hover:bg-red-100"
                                    >
                                      Quitar
                                    </button>
                                  </div>

                                  <div className="mt-3 grid grid-cols-3 gap-2">
                                    <button
                                      type="button"
                                      onClick={() =>
                                        moveProductInPublicSection(
                                          selectedPublicMenuSection.id,
                                          product.id,
                                          "up"
                                        )
                                      }
                                      disabled={productIndex === 0}
                                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      Subir
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        moveProductInPublicSection(
                                          selectedPublicMenuSection.id,
                                          product.id,
                                          "down"
                                        )
                                      }
                                      disabled={productIndex === selectedPublicMenuProducts.length - 1}
                                      className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-xs font-bold text-slate-600 transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
                                    >
                                      Bajar
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() =>
                                        toggleFeaturedPublicProduct(
                                          selectedPublicMenuSection.id,
                                          product.id
                                        )
                                      }
                                      className={cn(
                                        "rounded-lg border px-2 py-1.5 text-xs font-bold transition",
                                        isFeatured
                                          ? "border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100"
                                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                                      )}
                                    >
                                      {isFeatured ? "Quitar dest." : "Destacar"}
                                    </button>
                                  </div>
                                </div>
                              );
                            })
                          ) : (
                            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500 md:col-span-2">
                              Esta sección todavía no tiene platos asignados.
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
                      Creá una sección para empezar a armar el menú público.
                    </div>
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-200 bg-white p-5">
                <V2Button variant="secondary" onClick={() => setIsPublicMenuPopupOpen(false)}>
                  Cerrar
                </V2Button>
                <V2Button
                  variant="primary"
                  onClick={() => {
                    saveConfig();
                    setIsPublicMenuPopupOpen(false);
                  }}
                >
                  Guardar menú público
                </V2Button>
              </div>
            </div>
          </div>
        ) : null}

      </div>
    </V2AppShell>
  );
}
