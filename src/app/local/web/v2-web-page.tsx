"use client";

import {
  Bike,
  CalendarDays,
  Clock,
  ExternalLink,
  Eye,
  Globe2,
  Image as ImageIcon,
  LayoutTemplate,
  Leaf,
  MapPin,
  MessageCircle,
  Pencil,
  Phone,
  Save,
  Truck,
  Utensils,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { V2AppShell } from "@/components/v2/v2-app-shell";
import { V2Badge } from "@/components/v2/v2-badge";
import { V2Button } from "@/components/v2/v2-button";
import { V2Card } from "@/components/v2/v2-card";
import { V2Field, V2Input, V2Select, V2Textarea } from "@/components/v2/v2-input";
import { V2PageHeader } from "@/components/v2/v2-page-header";
import {
  v2MenuItems,
  v2WebConfig,
} from "@/lib/v2/v2-mock-data";
import {
  V2_WEB_TEMPLATE_CONTENT_STORAGE_KEY,
  V2_WEB_TEMPLATE_STORAGE_KEY,
  V2WebTemplateContent,
  createDefaultV2WebTemplateContent,
  getV2WebTemplateById,
  mergeV2WebTemplateContent,
  v2WebTemplates,
} from "@/lib/v2/v2-web-templates";

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

type PublicMenuSection = {
  id: string;
  name: string;
  description: string;
  active: boolean;
  productIds: string[];
  featuredProductIds?: string[];
};

const WEB_CONFIG_STORAGE_KEY = "tango-v2-local-web-config-v1";
const PUBLIC_MENU_SECTIONS_STORAGE_KEY = "tango-v2-public-menu-sections-v1";
const PUBLIC_MENU_SECTIONS_EVENT = "tango-v2-public-menu-sections-updated";
const MENU_ITEMS_STORAGE_KEY = "tango-v2-menu-items";
const WEB_CONFIG_EVENT = "tango-v2-local-web-config-updated";

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
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

function createDefaultPublicMenuSections(products: LocalMenuProduct[] = []): PublicMenuSection[] {
  const fallbackSections = [
    { id: "pizzas", name: "Pizzas", description: "Pizzas destacadas del local." },
    { id: "empanadas", name: "Empanadas", description: "Empanadas y opciones rápidas." },
    { id: "bebidas", name: "Bebidas", description: "Bebidas visibles en la web." },
  ];

  if (products.length === 0) {
    return fallbackSections.map((section) => ({ ...section, active: true, productIds: [], featuredProductIds: [] }));
  }

  return fallbackSections.map((section, index) => ({
    ...section,
    active: true,
    productIds: products.slice(index * 4, index * 4 + 4).map((product) => product.id),
    featuredProductIds: products.slice(index * 4, index * 4 + 2).map((product) => product.id),
  }));
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

function readPublicMenuSections(products: LocalMenuProduct[]): PublicMenuSection[] {
  if (typeof window === "undefined") return createDefaultPublicMenuSections(products);

  try {
    const rawValue = window.localStorage.getItem(PUBLIC_MENU_SECTIONS_STORAGE_KEY);
    const parsedSections = rawValue ? (JSON.parse(rawValue) as PublicMenuSection[]) : null;

    if (!parsedSections || parsedSections.length === 0) {
      return createDefaultPublicMenuSections(products);
    }

    return parsedSections.map((section) => ({
      id: section.id,
      name: section.name || "Nueva sección",
      description: section.description || "Sección visible en la web.",
      active: section.active !== false,
      productIds: Array.isArray(section.productIds) ? section.productIds : [],
      featuredProductIds: Array.isArray(section.featuredProductIds)
        ? section.featuredProductIds.filter((productId) =>
            Array.isArray(section.productIds) ? section.productIds.includes(productId) : false
          )
        : [],
    }));
  } catch {
    return createDefaultPublicMenuSections(products);
  }
}

function writePublicMenuSections(sections: PublicMenuSection[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(PUBLIC_MENU_SECTIONS_STORAGE_KEY, JSON.stringify(sections));
  window.dispatchEvent(new Event(PUBLIC_MENU_SECTIONS_EVENT));
}

function readTemplateContent(): Record<string, V2WebTemplateContent> {
  if (typeof window === "undefined") return {};

  try {
    const rawValue = window.localStorage.getItem(V2_WEB_TEMPLATE_CONTENT_STORAGE_KEY);
    return rawValue ? (JSON.parse(rawValue) as Record<string, V2WebTemplateContent>) : {};
  } catch {
    return {};
  }
}

function getStorageTemplateId() {
  if (typeof window === "undefined") return v2WebTemplates[0].id;

  return window.localStorage.getItem(V2_WEB_TEMPLATE_STORAGE_KEY) ?? v2WebTemplates[0].id;
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

const featuredMenuItems = v2MenuItems.filter(
  (item) => item.visible && item.featured
);

export function V2WebPage() {
  const [activeTab, setActiveTab] = useState<WebTab>("portada");
  const [config, setConfig] = useState<WebConfigState>(() => normalizeWebConfig());
  const [saveStatus, setSaveStatus] = useState<"idle" | "saved">("idle");
  const [localMenuProducts, setLocalMenuProducts] = useState<LocalMenuProduct[]>([]);
  const [publicMenuSections, setPublicMenuSections] = useState<PublicMenuSection[]>([]);
  const [selectedPublicMenuSectionId, setSelectedPublicMenuSectionId] = useState("");
  const [isPublicMenuPopupOpen, setIsPublicMenuPopupOpen] = useState(false);
  const [activeTemplateId, setActiveTemplateId] = useState(v2WebTemplates[0].id);
  const activeTemplate = useMemo(
    () => getV2WebTemplateById(activeTemplateId),
    [activeTemplateId]
  );
  const [templateContent, setTemplateContent] = useState(() =>
    createDefaultV2WebTemplateContent(v2WebTemplates[0])
  );

  useEffect(() => {
    setConfig(readStoredWebConfig());

    const products = readLocalMenuProducts();
    const sections = readPublicMenuSections(products);

    setLocalMenuProducts(products);
    setPublicMenuSections(sections);
    setSelectedPublicMenuSectionId(sections[0]?.id ?? "");
  }, []);

  useEffect(() => {
    function loadPublicTemplatePreview() {
      const templateId = getStorageTemplateId();
      const template = getV2WebTemplateById(templateId);
      const storedContent = readTemplateContent()[template.id];

      setActiveTemplateId(template.id);
      setTemplateContent(mergeV2WebTemplateContent(template, storedContent));
    }

    loadPublicTemplatePreview();

    window.addEventListener("storage", loadPublicTemplatePreview);
    window.addEventListener("tango-v2-web-template-updated", loadPublicTemplatePreview);
    window.addEventListener("tango-v2-web-template-content-updated", loadPublicTemplatePreview);

    return () => {
      window.removeEventListener("storage", loadPublicTemplatePreview);
      window.removeEventListener("tango-v2-web-template-updated", loadPublicTemplatePreview);
      window.removeEventListener("tango-v2-web-template-content-updated", loadPublicTemplatePreview);
    };
  }, []);

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

  const productsAvailableForSelectedSection = selectedPublicMenuSection
    ? localMenuProducts.filter(
        (product) => !selectedPublicMenuSection.productIds.includes(product.id)
      )
    : localMenuProducts;

  const previewMenuItems = useMemo(() => {
    const featuredProducts = publicMenuSections
      .filter((section) => section.active)
      .flatMap((section) =>
        (section.featuredProductIds ?? [])
          .map((productId) => localMenuProducts.find((product) => product.id === productId))
          .filter(Boolean) as LocalMenuProduct[]
      );

    const configuredProducts = publicMenuSections
      .filter((section) => section.active)
      .flatMap((section) =>
        section.productIds
          .map((productId) => localMenuProducts.find((product) => product.id === productId))
          .filter(Boolean) as LocalMenuProduct[]
      );

    const uniqueProducts = [...featuredProducts, ...configuredProducts].filter(
      (product, index, products) =>
        products.findIndex((currentProduct) => currentProduct.id === product.id) === index
    );

    return uniqueProducts.length > 0
      ? uniqueProducts.slice(0, 4)
      : featuredMenuItems.slice(0, 3);
  }, [localMenuProducts, publicMenuSections]);

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

              <a
                href="/local/web/plantillas"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <LayoutTemplate size={17} />
                Plantillas
              </a>

              <a
                href="/local/web/editor"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                <Pencil size={17} />
                Editor
              </a>

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
            <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Menú destacado</p>
            <p className="mt-2 text-2xl font-black text-slate-950">{previewMenuItems.length}</p>
            <p className="mt-1 text-xs text-slate-500">Platos visibles en preview</p>
          </V2Card>
        </div>

        <div className="mt-4 grid min-h-0 flex-1 items-stretch gap-4 xl:grid-cols-[430px_1fr]">
          <V2Card className="flex min-h-0 flex-col overflow-hidden p-0">
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
                        {publicMenuSections.map((section) => (
                          <span
                            key={section.id}
                            className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-semibold text-slate-600"
                          >
                            {section.name} · {section.productIds.length} platos
                          </span>
                        ))}
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

          <V2Card className="flex min-h-0 flex-col overflow-hidden p-0">
            <div className="flex shrink-0 items-center justify-between border-b border-slate-200 bg-white p-4">
              <div>
                <h2 className="text-base font-semibold text-slate-950">Vista previa pública</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Preview comercial aproximado de la web del local.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <V2Badge tone={isPublished ? "green" : "red"}>
                  {isPublished ? "Publicada" : "Borrador"}
                </V2Badge>
                <V2Badge tone={config.showMenu ? "green" : "slate"}>
                  Menú {config.showMenu ? "visible" : "oculto"}
                </V2Badge>
              </div>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto bg-[#15110d] text-[#f4ead8]">
              <section className="relative min-h-[560px] overflow-hidden bg-[#110e0b]">
                <img
                  src={templateContent.imageValues.hero ?? activeTemplate.previewImage}
                  alt={templateContent.textValues.heroTitle}
                  className="absolute inset-0 h-full w-full object-cover opacity-70"
                />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_74%_34%,rgba(0,0,0,0.12),transparent_24%),linear-gradient(90deg,rgba(13,10,8,0.98),rgba(13,10,8,0.82)_35%,rgba(13,10,8,0.22)_72%,rgba(13,10,8,0.72))]" />
                <div className="absolute inset-x-0 bottom-0 h-36 bg-gradient-to-t from-[#15110d] to-transparent" />

                <header className="relative z-20 border-b border-white/10 bg-black/42 backdrop-blur-md">
                  <div className="flex items-center justify-between px-8 py-5">
                    <div className="leading-none">
                      <p className="font-serif text-4xl font-bold uppercase tracking-[0.12em] text-[#c9784a]">
                        {config.businessName}
                      </p>
                      <p className="mt-1 text-center text-[10px] font-bold uppercase tracking-[0.36em] text-[#d6b489]">
                        Cocina de autor
                      </p>
                    </div>

                    <nav className="hidden items-center gap-7 text-xs font-black uppercase tracking-[0.12em] text-[#f7ead7]/82 lg:flex">
                      <span>Inicio</span>
                      {config.showMenu ? <span>Menú</span> : null}
                      <span>Nosotros</span>
                      {config.showGallery ? <span>Galería</span> : null}
                      {config.showReservations ? <span>Eventos</span> : null}
                      <span>Contacto</span>
                    </nav>

                    <div className="hidden items-center gap-3 md:flex">
                      {config.showReservations ? (
                        <button className="inline-flex h-11 items-center justify-center rounded border border-[#b96f47] px-7 text-xs font-black uppercase tracking-[0.14em] text-[#e8b085]">
                          Reservar
                        </button>
                      ) : null}
                      {config.showDelivery ? (
                        <button className="inline-flex h-11 items-center justify-center gap-2 rounded bg-[#c97048] px-7 text-xs font-black uppercase tracking-[0.12em] text-white shadow-lg shadow-black/30">
                          Pedir ahora
                          <Bike size={18} />
                        </button>
                      ) : null}
                    </div>
                  </div>
                </header>

                <div className="relative z-10 px-8 pb-10 pt-16">
                  <div className="max-w-[620px]">
                    <p className="text-sm font-black uppercase tracking-[0.2em] text-[#d79a6c]">
                      {templateContent.textValues.heroEyebrow}
                    </p>
                    <h1 className="mt-5 font-serif text-[58px] font-normal leading-[0.98] tracking-[-0.035em] text-[#fff2dd] md:text-[74px]">
                      {templateContent.textValues.heroTitle}
                    </h1>

                    <div className="mt-6 flex max-w-sm items-center gap-3 text-[#9fa875]">
                      <span className="h-px flex-1 bg-[#9c7656]" />
                      <Leaf size={20} />
                      <span className="h-px flex-1 bg-[#9c7656]" />
                    </div>

                    <p className="mt-6 max-w-[470px] text-lg leading-8 text-[#f4ead8]/82">
                      {templateContent.textValues.heroSubtitle}
                    </p>

                    <div className="mt-8 flex flex-wrap gap-4">
                      {config.showReservations ? (
                        <button className="inline-flex h-12 items-center gap-3 rounded bg-[#c97048] px-8 text-sm font-black uppercase tracking-[0.12em] text-white">
                          <CalendarDays size={18} />
                          {templateContent.textValues.primaryButton}
                        </button>
                      ) : null}
                      {config.showMenu ? (
                        <button className="inline-flex h-12 items-center gap-3 rounded border border-[#a96a4b] bg-black/25 px-8 text-sm font-black uppercase tracking-[0.12em] text-[#f7ead7]">
                          <Utensils size={18} />
                          Ver menú
                        </button>
                      ) : null}
                    </div>
                  </div>

                  <div className="mt-10 grid overflow-hidden rounded-2xl border border-[#c9a86a]/28 bg-[linear-gradient(180deg,rgba(36,31,25,0.92),rgba(20,17,13,0.94))] shadow-[inset_0_0_0_1px_rgba(207,160,111,0.2),0_18px_70px_rgba(0,0,0,0.32)] backdrop-blur-md md:grid-cols-4">
                    {[
                      { icon: CalendarDays, title: "Reservas online", text: "Reservá tu mesa fácil y rápido en segundos.", visible: config.showReservations },
                      { icon: Bike, title: "Delivery & retiro", text: "Pedí por delivery o retiro y disfrutá donde estés.", visible: config.showDelivery },
                      { icon: Leaf, title: "Menú actualizado", text: "Platos de estación con ingredientes frescos.", visible: config.showMenu },
                      { icon: Clock, title: "Abierto hoy", text: "Lun a Dom · 12:00 — 00:00 hs", visible: true },
                    ]
                      .filter((item) => item.visible)
                      .map((item) => {
                        const Icon = item.icon;

                        return (
                          <div key={item.title} className="flex gap-4 border-[#c9a86a]/18 p-5 md:border-r last:border-r-0">
                            <Icon className="mt-1 shrink-0 text-[#c9a86a]" size={26} />
                            <div>
                              <p className="text-sm font-black uppercase tracking-[0.08em] text-[#fff2dd]">{item.title}</p>
                              <p className="mt-1 text-sm leading-5 text-[#f4ead8]/62">{item.text}</p>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </section>

              {config.showMenu ? (
                <section className="border-t border-[#c9a86a]/12 bg-[#15110d] px-8 py-10">
                  <div className="text-center">
                    <p className="font-serif text-[12px] font-bold uppercase tracking-[0.42em] text-[#c9a86a]">Platos destacados</p>
                    <h2 className="mt-3 font-serif text-3xl font-bold uppercase tracking-[0.32em] text-[#f5ead6]">Carta</h2>
                    <div className="mx-auto mt-3 flex w-56 items-center justify-center gap-3 text-[#9fa875]">
                      <span className="h-px flex-1 bg-[#715943]" />
                      <Leaf size={18} />
                      <span className="h-px flex-1 bg-[#715943]" />
                    </div>
                  </div>

                  <div className="mt-7 grid gap-4 md:grid-cols-4">
                    {previewMenuItems.concat(previewMenuItems.slice(0, 1)).slice(0, 4).map((item, index) => (
                      <article key={`${item.id}-featured-${index}`} className="overflow-hidden rounded-3xl border border-[#c9a86a]/18 bg-black/18">
                        <img src={item.imageUrl || templateContent.imageValues[`menu${(index % 4) + 1}`]} alt={item.name} className="h-32 w-full object-cover" />
                        <div className="p-4 text-center">
                          <h4 className="font-serif text-lg font-bold text-[#fff2dd]">{item.name}</h4>
                          <p className="mt-2 line-clamp-2 text-sm leading-6 text-[#f4ead8]/58">{item.description || "Sin descripción"}</p>
                          <p className="mt-3 font-black text-[#d77f52]">{formatCurrency(Number(item.price) || 0)}</p>
                        </div>
                      </article>
                    ))}
                  </div>

                  <div className="mt-12 text-center">
                    <h2 className="font-serif text-3xl font-bold uppercase tracking-[0.32em] text-[#f5ead6]">Explorá nuestro menú</h2>
                    <div className="mx-auto mt-3 flex w-56 items-center justify-center gap-3 text-[#9fa875]">
                      <span className="h-px flex-1 bg-[#715943]" />
                      <Leaf size={18} />
                      <span className="h-px flex-1 bg-[#715943]" />
                    </div>
                  </div>

                  <div className="mt-7 grid gap-4 md:grid-cols-5">
                    {[
                      { title: "Entradas", text: "Comienzos que despiertan.", icon: Leaf },
                      { title: "Principales", text: "Platos intensos y sabrosos.", icon: Utensils },
                      { title: "Pastas", text: "Hechas en casa, como siempre.", icon: MessageCircle },
                      { title: "Postres", text: "El final perfecto para tu comida.", icon: Eye },
                      { title: "Bebidas", text: "Vinos, tragos y sin alcohol.", icon: Phone },
                    ].map((item) => {
                      const CategoryIcon = item.icon;

                      return (
                        <div key={item.title} className="rounded-3xl border border-[#c9a86a]/18 bg-black/18 p-5 text-center">
                          <CategoryIcon className="mx-auto text-[#9fa875]" size={34} />
                          <p className="mt-5 text-sm font-black uppercase tracking-[0.12em] text-[#fff2dd]">{item.title}</p>
                          <p className="mt-2 text-sm leading-6 text-[#f4ead8]/58">{item.text}</p>
                          <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-[#c9a86a]">Ver opciones</p>
                        </div>
                      );
                    })}
                  </div>

                  <div className="mt-7 rounded-3xl border border-[#c9a86a]/24 bg-black/14 p-5">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-xs font-black uppercase tracking-[0.2em] text-[#c9a86a]">Entradas</p>
                        <h3 className="mt-2 font-serif text-2xl text-[#fff2dd]">Platos de la categoría</h3>
                      </div>
                      <p className="hidden text-sm text-[#f4ead8]/55 md:block">Deslizá horizontalmente para ver más opciones.</p>
                    </div>

                    <div className="mt-5 grid gap-4 md:grid-cols-4">
                      {previewMenuItems.concat(previewMenuItems.slice(0, 1)).slice(0, 4).map((item, index) => (
                        <article key={`${item.id}-category-${index}`} className="overflow-hidden rounded-2xl border border-[#c9a86a]/18 bg-black/18">
                          <img src={item.imageUrl || templateContent.imageValues[`menu${(index % 4) + 1}`]} alt={item.name} className="h-24 w-full object-cover" />
                          <div className="p-3">
                            <h4 className="font-serif text-lg font-bold text-[#fff2dd]">{item.name}</h4>
                            <p className="mt-2 line-clamp-2 text-sm leading-5 text-[#f4ead8]/58">{item.description || "Sin descripción"}</p>
                            <p className="mt-3 font-black text-[#d77f52]">{formatCurrency(Number(item.price) || 0)}</p>
                          </div>
                        </article>
                      ))}
                    </div>
                  </div>
                </section>
              ) : null}

              {config.showGallery ? (
                <section className="border-t border-[#c9a86a]/12 bg-[#1b140f] px-8 py-10">
                  <div className="text-center">
                    <h2 className="font-serif text-3xl font-bold uppercase tracking-[0.32em] text-[#f5ead6]">Nuestro espacio</h2>
                    <div className="mx-auto mt-3 flex w-56 items-center justify-center gap-3 text-[#9fa875]">
                      <span className="h-px flex-1 bg-[#715943]" />
                      <Leaf size={18} />
                      <span className="h-px flex-1 bg-[#715943]" />
                    </div>
                  </div>

                  <div className="mt-7 grid gap-4 md:grid-cols-6">
                    {["espacio2", "espacio1", "espacio3", "espacio6", "espacio5", "hero"].map((slotId) => (
                      <img key={slotId} src={templateContent.imageValues[slotId] ?? templateContent.imageValues.hero} alt={slotId} className="h-28 w-full rounded-2xl object-cover" />
                    ))}
                  </div>

                  <div className="mt-6 text-center">
                    <button className="rounded border border-[#c97048] px-10 py-3 text-xs font-black uppercase tracking-[0.16em] text-[#d88757]">Ver más fotos</button>
                  </div>
                </section>
              ) : null}

              {config.showReservations ? (
                <section className="grid gap-8 border-t border-[#c9a86a]/12 bg-[#34271d] px-8 py-10 lg:grid-cols-[0.72fr_1fr]">
                  <div>
                    <div className="flex h-24 w-24 items-center justify-center rounded-full border border-[#c9a86a]/28 bg-[#c9a86a]/12 text-[#e5c687]">
                      <CalendarDays size={44} />
                    </div>
                    <p className="mt-5 text-xs font-black uppercase tracking-[0.28em] text-[#c9a86a]">Reservas online</p>
                    <h2 className="mt-3 font-serif text-4xl text-[#fff2dd]">Reservá tu mesa</h2>
                    <p className="mt-4 max-w-xl text-sm leading-7 text-[#f4ead8]/72">
                      Elegí fecha, horario y cantidad de personas. El sistema valida disponibilidad según horarios configurados y capacidad real del plano.
                    </p>

                    <div className="mt-6 grid gap-3 md:grid-cols-3">
                      {[
                        ["Ventana", "30 días"],
                        ["Duración", "90 min"],
                        ["Capacidad", "24 personas"],
                      ].map(([label, value]) => (
                        <div key={label} className="rounded-2xl border border-[#c9a86a]/18 bg-black/18 p-4">
                          <p className="text-xs font-black uppercase tracking-[0.14em] text-[#c9a86a]">{label}</p>
                          <p className="mt-2 font-black text-[#fff2dd]">{value}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[2rem] border border-[#c9a86a]/22 bg-black/32 p-6">
                    <div className="grid gap-4 md:grid-cols-2">
                      {["Nombre", "Teléfono", "Email", "Personas", "Fecha", "Horario"].map((label, index) => (
                        <label key={label} className="block">
                          <span className="text-xs font-black uppercase tracking-[0.14em] text-[#c9a86a]">{label}</span>
                          <div className="mt-2 h-11 rounded-xl border border-[#c9a86a]/24 bg-black/24 px-4 text-sm text-[#f4ead8]/40">
                            <span className="leading-[2.75rem]">{index === 3 ? "2" : index === 4 ? "domingo, 19 de julio" : index === 5 ? "Seleccionar horario" : "—"}</span>
                          </div>
                        </label>
                      ))}
                    </div>
                    <div className="mt-5 h-20 rounded-xl border border-[#c9a86a]/24 bg-black/24 p-4 text-sm text-[#f4ead8]/40">Nota opcional</div>
                    <button className="mt-5 flex h-12 w-full items-center justify-center gap-3 rounded bg-[#c97048] text-sm font-black uppercase tracking-[0.14em] text-white">
                      <CalendarDays size={18} />
                      Enviar reserva
                    </button>
                  </div>
                </section>
              ) : null}

              <section className="border-t border-[#c9a86a]/12 bg-[#15110d] px-8 py-10">
                <div className="text-center">
                  <h2 className="font-serif text-3xl font-bold uppercase tracking-[0.32em] text-[#f5ead6]">Lo que dicen nuestros comensales</h2>
                  <div className="mx-auto mt-3 flex w-56 items-center justify-center gap-3 text-[#9fa875]">
                    <span className="h-px flex-1 bg-[#715943]" />
                    <Leaf size={18} />
                    <span className="h-px flex-1 bg-[#715943]" />
                  </div>
                </div>

                <div className="mt-7 grid gap-4 md:grid-cols-3">
                  {[
                    ["Martina L.", "Una experiencia increíble de principio a fin. Los sabores, la atención y el ambiente son de primer nivel."],
                    ["Ignacio R.", "La cocina es espectacular y los postres una locura. Volvemos siempre."],
                    ["Sofía G.", "Demuru es sinónimo de calidez y calidad. Ideal para una cena especial."],
                  ].map(([name, quote]) => (
                    <div key={name} className="rounded-3xl border border-[#c9a86a]/18 bg-black/18 p-6">
                      <p className="text-3xl text-[#c9a86a]">”</p>
                      <p className="mt-4 text-sm leading-7 text-[#f4ead8]/76">{quote}</p>
                      <p className="mt-8 font-black text-[#fff2dd]">— {name}</p>
                    </div>
                  ))}
                </div>
              </section>

              {config.showMap ? (
                <section className="border-t border-[#c9a86a]/12 bg-[#110e0b] px-8 py-10">
                  <div className="text-center">
                    <h2 className="font-serif text-3xl font-bold uppercase tracking-[0.32em] text-[#f5ead6]">Visitá Demuru</h2>
                    <div className="mx-auto mt-3 flex w-56 items-center justify-center gap-3 text-[#9fa875]">
                      <span className="h-px flex-1 bg-[#715943]" />
                      <Leaf size={18} />
                      <span className="h-px flex-1 bg-[#715943]" />
                    </div>
                  </div>

                  <div className="mt-8 grid gap-6 lg:grid-cols-[0.85fr_1fr]">
                    <div className="rounded-[2rem] border border-[#c9a86a]/18 bg-black/18 p-6">
                      <p className="text-xs font-black uppercase tracking-[0.2em] text-[#c9a86a]">Visitá Demuru</p>
                      <h3 className="mt-3 font-serif text-3xl text-[#fff2dd]">Estamos en Pinamar</h3>

                      <div className="mt-6 grid gap-3">
                        {[
                          { title: "Teléfono", value: config.phone, icon: Phone },
                          { title: "WhatsApp", value: config.whatsapp, icon: MessageCircle },
                          { title: "Instagram", value: config.instagram, icon: MessageCircle },
                          { title: "Dirección", value: config.address, icon: MapPin },
                          { title: "Horarios", value: "Miércoles a Domingo · 08:00–02:00", icon: Clock },
                        ].map((item) => {
                          const ContactIcon = item.icon;

                          return (
                            <div key={item.title} className="flex items-center gap-4 rounded-2xl border border-[#c9a86a]/12 bg-black/22 p-4">
                              <ContactIcon className="text-[#c9a86a]" size={20} />
                              <div>
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-[#fff2dd]">{item.title}</p>
                                <p className="mt-1 text-sm text-[#f4ead8]/70">{item.value}</p>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>

                    <div className="relative min-h-[360px] overflow-hidden rounded-[2rem] border border-[#c9a86a]/18 bg-[#cde8df]">
                      <div className="absolute inset-0 bg-[linear-gradient(135deg,#bfe6d6,#e8f1e2_35%,#9ed7ea)]" />
                      <div className="absolute left-[32%] top-0 h-full w-12 rotate-12 bg-white/70" />
                      <div className="absolute left-[42%] top-0 h-full w-2 rotate-12 bg-slate-400/70" />
                      <div className="absolute right-[20%] top-0 h-full w-[48%] bg-sky-300/55" />
                      <div className="absolute left-8 top-8 rounded-3xl border border-[#c9a86a]/18 bg-[#201b15] p-5 shadow-2xl">
                        <p className="text-xs font-black uppercase tracking-[0.18em] text-[#c9a86a]">Ubicación</p>
                        <p className="mt-2 text-sm text-[#f4ead8]/75">{config.address}</p>
                        <button className="mt-4 rounded-full border border-[#c9a86a]/24 px-5 py-2 text-xs font-black uppercase tracking-[0.12em] text-[#fff2dd]">Abrir en Maps</button>
                      </div>
                      <div className="absolute bottom-8 right-10 rounded-full bg-red-500 px-3 py-2 text-xs font-black text-white shadow-xl">
                        Demuru Pinamar
                      </div>
                    </div>
                  </div>
                </section>
              ) : null}

              <footer className="border-t border-[#c9a86a]/18 bg-[#0f0d0a] px-8 py-10">
                <div className="grid gap-8 md:grid-cols-4">
                  <div>
                    <p className="font-serif text-4xl font-bold uppercase tracking-[0.12em] text-[#c9784a]">Demuru</p>
                    <p className="mt-4 text-sm leading-6 text-[#f4ead8]/55">
                      Cocina de autor con alma local. Ingredientes reales, técnicas cuidadas y hospitalidad en cada detalle.
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#fff2dd]">Enlaces</p>
                    <div className="mt-4 grid gap-2 text-sm text-[#f4ead8]/65">
                      <span>Inicio</span>
                      <span>Menú</span>
                      <span>Galería</span>
                      <span>Contacto</span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#fff2dd]">Síguenos</p>
                    <div className="mt-4 flex gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c9a86a]/18 text-[#c9a86a]">
                        <MessageCircle size={18} />
                      </span>
                      <span className="flex h-10 w-10 items-center justify-center rounded-full border border-[#c9a86a]/18 text-[#c9a86a]">
                        <MessageCircle size={18} />
                      </span>
                    </div>
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-[#fff2dd]">Newsletter</p>
                    <p className="mt-4 text-sm text-[#f4ead8]/55">Recibí novedades y promociones.</p>
                    <div className="mt-4 flex overflow-hidden rounded border border-[#c9a86a]/18">
                      <div className="flex-1 px-4 py-3 text-sm text-[#f4ead8]/35">Tu email</div>
                      <div className="bg-[#c97048] px-4 py-3 text-sm font-black text-white">→</div>
                    </div>
                  </div>
                </div>
              </footer>
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
                              <p className="truncate text-sm font-semibold text-slate-950">
                                {section.name}
                              </p>
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
