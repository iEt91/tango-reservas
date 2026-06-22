"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { LocalWebPreview } from "@/components/local-web/LocalWebPreview";
import { LocalBusinessWarning } from "@/components/local/LocalBusinessWarning";
import { LocalNoActiveBusinessesState } from "@/components/local/LocalNoActiveBusinessesState";
import { getDataSource } from "@/lib/data/dataSource";
import type { Business, PublicWebContent, PublicWebGalleryItem } from "@/data/types";
import { useLocalBusinessSelection } from "@/hooks/useLocalBusinessSelection";
import {
  createGalleryImage,
  deleteGalleryImage,
  getGalleryImagesByBusiness,
  reorderGalleryImages,
  resetGalleryImagesByBusiness,
  setGalleryImageActive,
  updateGalleryImage,
} from "@/lib/data/galleryEditor";
import {
  getWebContentByBusiness,
  resetWebContent,
  subscribeWebContent,
  updateWebContent,
} from "@/lib/data/webContentEditor";
import { getBusinesses, subscribeBusinesses, updateAdminBusiness } from "@/lib/data/admin-businesses";
import { toBusinessFormValues } from "@/lib/businesses";

type GalleryDraft = {
  title: string;
  description: string;
  imageDataUrl: string;
  imageUrl: string;
  imagePlaceholder: string;
  isActive: boolean;
};

type GalleryModalState = {
  mode: "create" | "edit";
  itemId?: string;
  draft: GalleryDraft;
  error: string;
};

type PublicWebToggleKey =
  | "showHero"
  | "showAbout"
  | "showFeaturedMenu"
  | "showMenu"
  | "showGallery"
  | "showLocation"
  | "showReservation"
  | "showWhatsappButton"
  | "showEmailButton"
  | "showSocials";

const PUBLIC_TEMPLATE_OPTIONS = [
  {
    value: "restaurant-elegant",
    label: "Restaurante elegante",
    description: "La plantilla actual, premium y equilibrada.",
  },
  {
    value: "compact-premium",
    label: "Premium compacto",
    description: "MÃ¡s directa, ideal para restaurantes con foco en reservas.",
  },
  {
    value: "minimal-cafe",
    label: "CafÃ© minimalista",
    description: "MÃ¡s liviana, pensada para cafeterÃ­as y brunch.",
  },
] as const;

function getInitials(value: string) {
  const parts = value.trim().split(/\s+/).filter(Boolean).slice(0, 2);
  return parts.map((part) => part[0] ?? "").join("").toUpperCase() || "GA";
}

function getGalleryImageSource(item: PublicWebGalleryItem) {
  if (item.imageDataUrl?.trim()) {
    return item.imageDataUrl.trim();
  }

  if (item.imageUrl?.trim()) {
    return item.imageUrl.trim();
  }

  return "";
}

function createGalleryDraft(item?: PublicWebGalleryItem): GalleryDraft {
  return {
    title: item?.title ?? "",
    description: item?.description ?? "",
    imageDataUrl: item?.imageDataUrl ?? "",
    imageUrl: item?.imageUrl ?? "",
    imagePlaceholder: item?.imagePlaceholder ?? "",
    isActive: item?.isActive ?? true,
  };
}

function readText(value: string) {
  return value.trim();
}

function readFileAsDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === "string" ? reader.result : "";
      if (!result) {
        reject(new Error("No se pudo leer la imagen seleccionada."));
        return;
      }

      resolve(result);
    };
    reader.onerror = () => reject(new Error("No se pudo leer la imagen seleccionada."));
    reader.readAsDataURL(file);
  });
}

function toBooleanField(value: PublicWebContent[PublicWebToggleKey]) {
  return Boolean(value);
}

function SectionCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 sm:p-5">
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">Web del negocio</p>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {description ? (
          <p className="max-w-4xl text-xs leading-5 text-slate-300">{description}</p>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function StatusPill({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "cyan" | "emerald" | "amber";
}) {
  const className =
    tone === "cyan"
      ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-100"
      : tone === "emerald"
        ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
        : tone === "amber"
          ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
          : "border-white/10 bg-white/5 text-slate-200";

  return <span className={`rounded-full border px-2.5 py-1 text-[11px] ${className}`}>{label}</span>;
}

function WebModal({
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
  children: ReactNode;
  footer: ReactNode;
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
        className={`flex max-h-[calc(100vh-32px)] w-full flex-col overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950 shadow-2xl shadow-black/40 ${maxWidth}`}
        onClick={(event) => event.stopPropagation()}
      >
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-4 py-4 sm:px-5">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">Panel Web</p>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="text-sm leading-6 text-slate-300">{subtitle}</p>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:border-white/20 hover:text-white"
            aria-label="Cerrar modal"
          >
            Ã—
          </button>
        </header>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5">{children}</div>

        <footer className="border-t border-white/10 px-4 py-4 sm:px-5">{footer}</footer>
      </section>
    </div>
  );
}

function GalleryModal({
  open,
  mode,
  draft,
  error,
  onChange,
  onClose,
  onSave,
  onError,
  sourceLabel,
}: {
  open: boolean;
  mode: "create" | "edit";
  draft: GalleryDraft;
  error: string;
  onChange: (draft: GalleryDraft) => void;
  onClose: () => void;
  onSave: () => void;
  onError: (message: string) => void;
  sourceLabel: string;
}) {
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const previewSource = draft.imageDataUrl.trim() || draft.imageUrl.trim();
  const placeholder = draft.imagePlaceholder.trim() || getInitials(draft.title || "GalerÃ­a");

  async function handleFileSelected(event: React.ChangeEvent<HTMLInputElement>) {
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
        imageUrl: "",
      });
    };
    reader.onerror = () => onError("No se pudo leer la imagen seleccionada.");
    reader.readAsDataURL(file);
  }

  return (
    <WebModal
      open={open}
      title={mode === "create" ? "Nueva imagen de galería" : "Editar imagen de galería"}
      subtitle={
        sourceLabel === "Supabase"
          ? "La galería pública se guarda por negocio en Supabase. Supabase Storage quedará para una fase posterior."
          : "La galería pública se guarda por negocio en esta capa local hasta conectar Supabase."
      }
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
            Guardar imagen
          </button>
        </div>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-4">
          <label className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              TÃ­tulo
            </span>
            <input
              value={draft.title}
              onChange={(event) => onChange({ ...draft, title: event.target.value })}
              className="input-base"
              autoFocus
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Texto alt / descripción breve
            </span>
            <textarea
              value={draft.description}
              onChange={(event) => onChange({ ...draft, description: event.target.value })}
              className="input-base min-h-28"
              placeholder="Opcional"
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
                onChange({ ...draft, imageUrl: event.target.value, imageDataUrl: "" });
              }}
              className="input-base"
              placeholder="https://..."
            />
          </label>

          <label className="space-y-1.5">
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Placeholder
            </span>
            <input
              value={draft.imagePlaceholder}
              onChange={(event) => onChange({ ...draft, imagePlaceholder: event.target.value })}
              className="input-base"
              placeholder="GA"
            />
          </label>

          <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-200">
            <input
              type="checkbox"
              checked={draft.isActive}
              onChange={(event) => onChange({ ...draft, isActive: event.target.checked })}
              className="h-4 w-4 rounded border-white/20 bg-slate-950 text-cyan-400"
            />
            <span>Imagen activa</span>
          </label>

          <div className="space-y-2">
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
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
              >
                Subir imagen
              </button>
              {previewSource ? (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...draft,
                      imageDataUrl: "",
                      imageUrl: "",
                    })
                  }
                  className="inline-flex h-12 items-center justify-center rounded-full border border-rose-400/30 bg-rose-500/10 px-4 text-xs font-medium text-rose-100 transition hover:border-rose-300/50 hover:bg-rose-500/15 hover:text-white"
                >
                  Quitar imagen
                </button>
              ) : null}
              <button
                type="button"
                onClick={() =>
                  onChange({
                    ...draft,
                    imageDataUrl: "",
                    imageUrl: "",
                    imagePlaceholder: getInitials(draft.title || "GalerÃ­a"),
                  })
                }
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
              >
                Usar placeholder
              </button>
            </div>
            <p className="text-[11px] leading-5 text-slate-400">
              Modo local. La imagen se guarda en este navegador hasta conectar storage real.
            </p>
          </div>

          {error ? (
            <div className="rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
              {error}
            </div>
          ) : null}
        </div>

        <div className="space-y-4">
          <div className="overflow-hidden rounded-[1.5rem] border border-white/10 bg-slate-950/70">
            <div className="h-72 bg-gradient-to-br from-cyan-500/20 via-slate-900 to-slate-950">
              {previewSource ? (
                <img src={previewSource} alt={draft.title || "Imagen"} className="h-full w-full object-cover" />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-4xl font-semibold text-white">
                  {placeholder}
                </div>
              )}
            </div>
            <div className="space-y-2 p-4">
              <h4 className="text-sm font-semibold text-white">
                {draft.title.trim() || "Imagen de ejemplo"}
              </h4>
              <p className="line-clamp-3 text-sm leading-6 text-slate-300">
                {draft.description.trim() || "Sin descripciÃ³n"}
              </p>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
            Esta imagen se verÃ¡ en la web pÃºblica cuando estÃ© activa.
          </div>
        </div>
      </div>
    </WebModal>
  );
}

function loadDraftContent(businessId: string) {
  return getWebContentByBusiness(businessId);
}

export function LocalWebPage() {
  const [mounted, setMounted] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [contentDraft, setContentDraft] = useState<PublicWebContent | null>(null);
  const [galleryItems, setGalleryItems] = useState<PublicWebGalleryItem[]>([]);
  const [message, setMessage] = useState("");
  const [galleryModal, setGalleryModal] = useState<GalleryModalState | null>(null);
  const [galleryError, setGalleryError] = useState("");
  const heroFileInputRef = useRef<HTMLInputElement | null>(null);
  const dataSource = getDataSource();
  const sourceLabel = dataSource === "supabase" ? "Supabase" : "local/mock";

  useEffect(() => {
    let cancelled = false;

    const syncBusinesses = async () => {
      const currentBusinesses = await getBusinesses();

      if (cancelled) {
        return;
      }

      setBusinesses(currentBusinesses);
      setMounted(true);
    };

    const timeout = window.setTimeout(() => {
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

  const selectedBusiness = useMemo(() => {
    if (businesses.length === 0) {
      return null;
    }

    if (selectedBusinessId && businesses.some((business) => business.id === selectedBusinessId)) {
      return businesses.find((business) => business.id === selectedBusinessId) ?? null;
    }

    return businesses.find((business) => business.status === "active") ?? null;
  }, [businesses, selectedBusinessId]);

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
    if (!mounted || !selectedBusiness || !isSelectionReady) {
      return;
    }

    let cancelled = false;

    const syncContent = async () => {
      const [currentContent, currentGallery] = await Promise.all([
        loadDraftContent(selectedBusiness.id),
        getGalleryImagesByBusiness(selectedBusiness.id),
      ]);

      if (cancelled) {
        return;
      }

      setContentDraft(currentContent);
      setGalleryItems(currentGallery);
    };

    void syncContent();

    const unsubscribePublicWeb = subscribeWebContent(() => {
      void syncContent();
    });
    return () => {
      cancelled = true;
      unsubscribePublicWeb();
    };
  }, [mounted, selectedBusiness]);

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = window.setTimeout(() => setMessage(""), 2600);
    return () => window.clearTimeout(timeout);
  }, [message]);

  async function refreshSelectedBusiness() {
    if (!selectedBusiness) {
      return;
    }

    const [currentContent, currentGallery] = await Promise.all([
      loadDraftContent(selectedBusiness.id),
      getGalleryImagesByBusiness(selectedBusiness.id),
    ]);

    setContentDraft(currentContent);
    setGalleryItems(currentGallery);
  }

  function handleBusinessChange(nextBusinessId: string) {
    setMessage("");
    setGalleryModal(null);
    setGalleryError("");
    handleBusinessSelectionChange(nextBusinessId);
  }

  async function handleSaveContent() {
    if (!selectedBusiness || !contentDraft) {
      return;
    }

    await updateWebContent(selectedBusiness.id, {
      publicName: contentDraft.publicName,
      publicSubtitle: contentDraft.publicSubtitle,
      publicDescription: contentDraft.publicDescription,
      publicBadge: contentDraft.publicBadge,
      publicAttributesText: contentDraft.publicAttributesText,
      publicTemplateId: contentDraft.publicTemplateId,
      heroDescription: contentDraft.publicDescription,
      publicCategory: contentDraft.publicCategory,
      publicCity: contentDraft.publicCity,
      publicAddress: contentDraft.publicAddress,
      publicPhone: contentDraft.publicPhone,
      heroTitle: contentDraft.heroTitle,
      heroSubtitle: contentDraft.heroSubtitle,
      heroSecondaryCtaLabel: contentDraft.heroSecondaryCtaLabel,
      menuTitle: contentDraft.menuTitle,
      menuSubtitle: contentDraft.menuSubtitle,
      aboutTitle: contentDraft.aboutTitle,
      aboutText: contentDraft.aboutText,
      presentationTitle: contentDraft.aboutTitle ?? contentDraft.presentationTitle,
      presentationText: contentDraft.presentationText,
      aboutHighlights: contentDraft.aboutHighlights,
      featuredPhrase: contentDraft.featuredPhrase,
      mapLabel: contentDraft.locationTitle,
      mapEmbedUrl: contentDraft.mapEmbedUrl,
      locationTitle: contentDraft.locationTitle,
      locationText: contentDraft.locationText,
      heroImageDataUrl: contentDraft.heroImageDataUrl,
      heroImageUrl: contentDraft.heroImageUrl,
      heroImagePlaceholder: contentDraft.heroImagePlaceholder,
      instagramUrl: contentDraft.instagramUrl,
      facebookUrl: contentDraft.facebookUrl,
      tiktokUrl: contentDraft.tiktokUrl,
      websiteUrl: contentDraft.websiteUrl,
      whatsapp: contentDraft.whatsapp,
      email: contentDraft.email,
      googleMapsUrl: contentDraft.googleMapsUrl,
      ctaLabel: contentDraft.ctaLabel,
      showHero: contentDraft.showHero,
      showAbout: contentDraft.showAbout,
      showFeaturedMenu: contentDraft.showFeaturedMenu,
      showGallery: contentDraft.showGallery,
      showMenu: contentDraft.showMenu,
      showLocation: contentDraft.showLocation,
      showReservation: contentDraft.showReservation,
      showReservations: contentDraft.showReservation,
      showWhatsappButton: contentDraft.showWhatsappButton,
      showEmailButton: contentDraft.showEmailButton,
      showSocials: contentDraft.showSocials,
    });

    const nextThemeId =
      contentDraft.publicTemplateId === "compact-premium"
        ? "beach_club_dark"
        : contentDraft.publicTemplateId === "minimal-cafe"
          ? "cafe_minimal"
          : "restaurant_elegant";

    if (selectedBusiness.themeId !== nextThemeId) {
      await updateAdminBusiness(selectedBusiness.id, {
        ...toBusinessFormValues(selectedBusiness),
        themeId: nextThemeId,
      });
      setBusinesses(await getBusinesses());
    }

    setMessage(
      dataSource === "supabase"
        ? "Contenido web guardado en Supabase."
        : "Web actualizada en modo local/mock.",
    );
    await refreshSelectedBusiness();
  }

  async function handleResetContent() {
    if (!selectedBusiness) {
      return;
    }

    if (!window.confirm("Esto va a restaurar el contenido web base del negocio seleccionado. Â¿QuerÃ©s continuar?")) {
      return;
    }

    await resetWebContent(selectedBusiness.id);
    await resetGalleryImagesByBusiness(selectedBusiness.id);
    setMessage("Contenido web restaurado al estado base.");
    await refreshSelectedBusiness();
  }

  async function handleHeroImageSelected(event: React.ChangeEvent<HTMLInputElement>) {
    if (!contentDraft) {
      return;
    }

    const file = event.target.files?.[0] ?? null;
    event.target.value = "";

    if (!file) {
      return;
    }

    const allowedTypes = ["image/jpeg", "image/png", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      setMessage("La imagen del hero debe ser JPG, PNG o WEBP.");
      return;
    }

    if (file.size > 2 * 1024 * 1024) {
      setMessage("La imagen del hero no puede superar los 2 MB.");
      return;
    }

    try {
      const result = await readFileAsDataUrl(file);
      updateContentField("heroImageDataUrl", result);
      updateContentField("heroImageUrl", "");
      setMessage(
        dataSource === "supabase"
          ? "Imagen principal cargada en Supabase de forma temporal."
          : "Imagen principal cargada en modo local/mock.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo cargar la imagen.");
    }
  }

  function openCreateGalleryItem() {
    setGalleryError("");
    setGalleryModal({
      mode: "create",
      draft: createGalleryDraft(),
      error: "",
    });
  }

  function openEditGalleryItem(itemId: string) {
    const item = galleryItems.find((current) => current.id === itemId);
    if (!item) {
      return;
    }

    setGalleryError("");
    setGalleryModal({
      mode: "edit",
      itemId: item.id,
      draft: createGalleryDraft(item),
      error: "",
    });
  }

  async function saveGalleryItem() {
    if (!selectedBusiness || !galleryModal) {
      return;
    }

    const title = readText(galleryModal.draft.title);
    if (!title) {
      setGalleryError("El tÃ­tulo de la imagen es obligatorio.");
      return;
    }

    const imagePlaceholder = readText(galleryModal.draft.imagePlaceholder) || getInitials(title);

    if (galleryModal.mode === "create") {
      await createGalleryImage(selectedBusiness.id, {
        title,
        description: readText(galleryModal.draft.description),
        altText: readText(galleryModal.draft.description),
        imageDataUrl: readText(galleryModal.draft.imageDataUrl),
        imageUrl: readText(galleryModal.draft.imageUrl),
        imagePlaceholder,
        isActive: galleryModal.draft.isActive,
      });
      setMessage(
        dataSource === "supabase"
          ? "Imagen de galerÃ­a guardada en Supabase."
          : "Imagen de galerÃ­a guardada en modo local/mock.",
      );
    } else if (galleryModal.itemId) {
      await updateGalleryImage(galleryModal.itemId, {
        title,
        description: readText(galleryModal.draft.description),
        altText: readText(galleryModal.draft.description),
        imageDataUrl: readText(galleryModal.draft.imageDataUrl),
        imageUrl: readText(galleryModal.draft.imageUrl),
        imagePlaceholder,
        isActive: galleryModal.draft.isActive,
      });
      setMessage(
        dataSource === "supabase"
          ? "Imagen de galerÃ­a actualizada en Supabase."
          : "Imagen de galerÃ­a actualizada en modo local/mock.",
      );
    }

    setGalleryModal(null);
    await refreshSelectedBusiness();
  }

  async function handleToggleGalleryItem(itemId: string) {
    const item = galleryItems.find((current) => current.id === itemId);
    if (!item) {
      return;
    }

    await setGalleryImageActive(itemId, !item.isActive);
    await refreshSelectedBusiness();
  }

  async function handleDeleteGalleryItem(itemId: string) {
    const item = galleryItems.find((current) => current.id === itemId);
    if (!item) {
      return;
    }

    if (!window.confirm(`Eliminar "${item.title}" de forma permanente?`)) {
      return;
    }

    await deleteGalleryImage(item.id);
    setMessage(
      dataSource === "supabase"
        ? "Imagen de galerÃ­a eliminada en Supabase."
        : "Imagen de galerÃ­a eliminada en modo local/mock.",
    );
    await refreshSelectedBusiness();
  }

  async function handleMoveGalleryItem(itemId: string, direction: -1 | 1) {
    if (!selectedBusiness) {
      return;
    }

    const currentIndex = galleryItems.findIndex((current) => current.id === itemId);
    if (currentIndex === -1) {
      return;
    }

    const nextIndex = currentIndex + direction;
    if (nextIndex < 0 || nextIndex >= galleryItems.length) {
      return;
    }

    const nextItems = [...galleryItems];
    const [moved] = nextItems.splice(currentIndex, 1);
    nextItems.splice(nextIndex, 0, moved);

    await reorderGalleryImages(selectedBusiness.id, nextItems);
    await refreshSelectedBusiness();
  }

  function updateContentField<K extends keyof PublicWebContent>(field: K, value: PublicWebContent[K]) {
    setContentDraft((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current,
    );
  }

  function updateToggleField(field: PublicWebToggleKey, checked: boolean) {
    updateContentField(field, checked as PublicWebContent[PublicWebToggleKey]);
  }

  const activeSections = contentDraft
      ? [
        contentDraft.showHero ? "Hero" : null,
        contentDraft.showAbout ? "InformaciÃ³n del negocio" : null,
        contentDraft.showFeaturedMenu ? "SelecciÃ³n destacada" : null,
        contentDraft.showMenu ? "MenÃº" : null,
        contentDraft.showGallery ? "GalerÃ­a" : null,
        contentDraft.showLocation ? "UbicaciÃ³n" : null,
        contentDraft.showReservation ? "Reservas" : null,
      ].filter(Boolean)
    : [];

  const activeGalleryCount = galleryItems.filter((item) => item.isActive).length;

  const hasActiveBusiness = businesses.some((business) => business.status === "active");

  if (mounted && businesses.length > 0 && !hasActiveBusiness) {
    return <LocalNoActiveBusinessesState />;
  }

  if (mounted && businesses.length > 0 && !selectedBusiness) {
    const demuruBusinessId = businesses.find((business) => business.slug === "demuru")?.id ?? "";

    return (
      <section className="space-y-4">
        <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-5 shadow-2xl shadow-black/20 sm:px-5">
          <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">Web</p>
          <h1 className="mt-1 text-[1.5rem] font-semibold tracking-tight text-white sm:text-[1.7rem]">
            Web del negocio
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
            No se encontró el negocio seleccionado.
          </p>
        </section>

        <section className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-300 shadow-2xl shadow-black/20 sm:px-5">
          <p className="font-medium text-white">No se encontró el negocio seleccionado.</p>
          <p className="mt-1.5 text-xs leading-5 text-slate-400">
            Revisá el negocio activo o volvé al admin para elegir otro local.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <a
              href="/admin"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 transition hover:border-white/20 hover:text-white"
            >
              Volver al admin
            </a>
            <button
              type="button"
              onClick={() => {
                if (demuruBusinessId) {
                  handleBusinessChange(demuruBusinessId);
                }
              }}
              disabled={!demuruBusinessId}
              className="rounded-full border border-cyan-400/20 bg-cyan-500/15 px-4 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/25"
            >
              Usar Demuru
            </button>
          </div>
        </section>
      </section>
    );
  }

  if (!mounted || !selectedBusiness || !contentDraft || !isSelectionReady) {
    return (
      <section className="space-y-4">
        <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-5 shadow-2xl shadow-black/20 sm:px-5">
          <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">Web</p>
          <h1 className="mt-1 text-[1.5rem] font-semibold tracking-tight text-white sm:text-[1.7rem]">
            Web del negocio
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
            Cargando contenido publico, galerias y negocios...
          </p>
        </section>

        <section className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-300 shadow-2xl shadow-black/20 sm:px-5">
          Preparando el editor del contenido publico.
        </section>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-5 shadow-2xl shadow-black/20 sm:px-5">
        <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">Panel del Local</p>
            <h1 className="text-[1.5rem] font-semibold tracking-tight text-white sm:text-[1.7rem]">
              Web del negocio
            </h1>
            <p className="max-w-4xl text-sm leading-6 text-slate-300">
              EditÃ¡ textos, imagen principal, galerÃ­a, contacto y secciones activas de la web publica por negocio.
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusPill label={selectedBusiness.status === "active" ? "Activo" : selectedBusiness.status === "draft" ? "Borrador" : "Inactivo"} tone={selectedBusiness.status === "active" ? "emerald" : selectedBusiness.status === "draft" ? "amber" : "default"} />
            <StatusPill label={selectedBusiness.category} tone="cyan" />
            <StatusPill label={selectedBusiness.city} />
            <StatusPill label={`${activeGalleryCount} fotos activas`} tone="amber" />
          </div>
        </div>

        <LocalBusinessWarning message={businessWarning} />

        <div className="mt-4 flex flex-wrap gap-2">
          <StatusPill label={`Fuente de datos: ${sourceLabel}`} tone="cyan" />
          <StatusPill
            label={
              selectedBusiness.status === "active"
                ? "Activo"
                : selectedBusiness.status === "draft"
                  ? "Borrador"
                  : "Inactivo"
            }
            tone={
              selectedBusiness.status === "active"
                ? "emerald"
                : selectedBusiness.status === "draft"
                  ? "amber"
                  : "default"
            }
          />
          <StatusPill label={selectedBusiness.category} tone="cyan" />
          <StatusPill label={selectedBusiness.city} />
          <StatusPill label={`${activeGalleryCount} fotos activas`} tone="amber" />
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          {canChangeBusiness ? (
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Negocio</span>
              <select
                value={selectedBusiness.id}
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
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Negocio</span>
              <div className="input-base min-w-[240px] text-slate-100">
                {selectedBusiness?.name ?? "Negocio asignado"}
              </div>
            </div>
          )}

          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Acciones</span>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSaveContent}
                className="rounded-full border border-cyan-400/20 bg-cyan-500/15 px-3.5 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/25"
              >
                Guardar cambios
              </button>
              <button
                type="button"
                onClick={handleResetContent}
                className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:border-white/20 hover:text-white"
              >
                Restaurar contenido demo
              </button>
              <a
                href={`/${selectedBusiness?.slug ?? ""}`}
                target="_blank"
                rel="noreferrer"
                className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/30 hover:text-white"
              >
                Ver web pÃºblica
              </a>
              <button
                type="button"
                onClick={openCreateGalleryItem}
                className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/30 hover:text-white"
              >
                Nueva foto
              </button>
            </div>
            <p className="text-[11px] leading-5 text-slate-400">
              {dataSource === "supabase"
                ? "Contenido web y galería se guardan en Supabase. La web pública todavía sigue en la capa pública actual mientras se completa la migración."
                : "Modo local activo. Los cambios se guardan en este navegador hasta conectar Supabase."}
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300">
            Secciones activas: {activeSections.length}
          </span>
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300">
            Fotos activas: {activeGalleryCount}
          </span>
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300">
            MenÃº: {contentDraft.showMenu ? "Visible" : "Oculto"}
          </span>
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300">
            Reservas: {contentDraft.showReservation ? "Visible" : "Oculto"}
          </span>
        </div>

        {message ? (
          <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {message}
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="grid gap-4">
          <SectionCard
            title="Identidad pÃºblica"
            description="Datos visibles de la web del negocio. Todo se guarda por negocio."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Nombre pÃºblico
                </span>
                <input
                  value={contentDraft.publicName ?? ""}
                  onChange={(event) => updateContentField("publicName", event.target.value)}
                  className="input-base"
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  SubtÃ­tulo / bajada
                </span>
                <input
                  value={contentDraft.publicSubtitle ?? ""}
                  onChange={(event) => updateContentField("publicSubtitle", event.target.value)}
                  className="input-base"
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  DescripciÃ³n breve
                </span>
                <textarea
                  value={contentDraft.publicDescription ?? ""}
                  onChange={(event) => updateContentField("publicDescription", event.target.value)}
                  className="input-base min-h-28"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Badge principal
                </span>
                <input
                  value={contentDraft.publicBadge ?? ""}
                  onChange={(event) => updateContentField("publicBadge", event.target.value)}
                  className="input-base"
                  placeholder="Abierto hoy"
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Tags / atributos pÃºblicos separados por coma
                </span>
                <input
                  value={contentDraft.publicAttributesText ?? ""}
                  onChange={(event) =>
                    updateContentField("publicAttributesText", event.target.value)
                  }
                  className="input-base"
                  placeholder="Cocina de autor, Reservas cuidadas, AtenciÃ³n personalizada"
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Plantilla pÃºblica
                </span>
                <select
                  value={contentDraft.publicTemplateId ?? "restaurant-elegant"}
                  onChange={(event) =>
                    updateContentField(
                      "publicTemplateId",
                      event.target.value as PublicWebContent["publicTemplateId"],
                    )
                  }
                  className="input-base"
                >
                  {PUBLIC_TEMPLATE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] leading-5 text-slate-400">
                  {PUBLIC_TEMPLATE_OPTIONS.find(
                    (option) => option.value === (contentDraft.publicTemplateId ?? "restaurant-elegant"),
                  )?.description ?? "ElegÃ­ una plantilla para la portada pÃºblica."}
                </p>
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Rubro visible
                </span>
                <input
                  value={contentDraft.publicCategory ?? ""}
                  onChange={(event) => updateContentField("publicCategory", event.target.value)}
                  className="input-base"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Localidad
                </span>
                <input
                  value={contentDraft.publicCity ?? ""}
                  onChange={(event) => updateContentField("publicCity", event.target.value)}
                  className="input-base"
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  DirecciÃ³n
                </span>
                <input
                  value={contentDraft.publicAddress ?? ""}
                  onChange={(event) => updateContentField("publicAddress", event.target.value)}
                  className="input-base"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  WhatsApp
                </span>
                <input
                  value={contentDraft.whatsapp ?? ""}
                  onChange={(event) => updateContentField("whatsapp", event.target.value)}
                  className="input-base"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  TelÃ©fono
                </span>
                <input
                  value={contentDraft.publicPhone ?? ""}
                  onChange={(event) => updateContentField("publicPhone", event.target.value)}
                  className="input-base"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Instagram
                </span>
                <input
                  value={contentDraft.instagramUrl ?? ""}
                  onChange={(event) => updateContentField("instagramUrl", event.target.value)}
                  className="input-base"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Google Maps URL
                </span>
                <input
                  value={contentDraft.googleMapsUrl ?? ""}
                  onChange={(event) => updateContentField("googleMapsUrl", event.target.value)}
                  className="input-base"
                  placeholder="https://maps.google.com/..."
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Google Maps Embed URL
                </span>
                <input
                  value={contentDraft.mapEmbedUrl ?? ""}
                  onChange={(event) => updateContentField("mapEmbedUrl", event.target.value)}
                  className="input-base"
                  placeholder="https://www.google.com/maps/embed?..."
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Texto visible de ubicaciÃ³n
                </span>
                <input
                  value={contentDraft.mapLabel ?? ""}
                  onChange={(event) => updateContentField("mapLabel", event.target.value)}
                  className="input-base"
                  placeholder="UbicaciÃ³n"
                />
              </label>
            </div>
          </SectionCard>

          <SectionCard
            title="Hero"
            description="TÃ­tulo principal, subtÃ­tulo, frase destacada, CTA y la imagen principal pÃºblica."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Hero title
                </span>
                <input
                  value={contentDraft.heroTitle}
                  onChange={(event) => updateContentField("heroTitle", event.target.value)}
                  className="input-base"
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Hero subtitle
                </span>
                <textarea
                  value={contentDraft.heroSubtitle}
                  onChange={(event) => updateContentField("heroSubtitle", event.target.value)}
                  className="input-base min-h-28"
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Frase destacada
                </span>
                <input
                  value={contentDraft.featuredPhrase}
                  onChange={(event) => updateContentField("featuredPhrase", event.target.value)}
                  className="input-base"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Texto CTA
                </span>
                <input
                  value={contentDraft.ctaLabel}
                  onChange={(event) => updateContentField("ctaLabel", event.target.value)}
                  className="input-base"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  CTA secundario
                </span>
                <input
                  value={contentDraft.heroSecondaryCtaLabel ?? ""}
                  onChange={(event) =>
                    updateContentField("heroSecondaryCtaLabel", event.target.value)
                  }
                  className="input-base"
                  placeholder="Ver menÃº / Ver reservas"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Imagen principal URL
                </span>
                <input
                  value={contentDraft.heroImageUrl ?? ""}
                  onChange={(event) => {
                    updateContentField("heroImageUrl", event.target.value);
                    updateContentField("heroImageDataUrl", "");
                  }}
                  className="input-base"
                  placeholder="https://..."
                />
              </label>
              <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
                <input
                  ref={heroFileInputRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  className="hidden"
                  onChange={handleHeroImageSelected}
                />
                <button
                  type="button"
                  onClick={() => heroFileInputRef.current?.click()}
                  className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/30 hover:text-white"
                >
                  Subir imagen
                </button>
                <button
                  type="button"
                  onClick={() => {
                    updateContentField("heroImageDataUrl", "");
                    updateContentField("heroImageUrl", "");
                  }}
                  className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:border-white/20 hover:text-white"
                >
                  Quitar imagen
                </button>
                <span className="text-[11px] text-slate-400">
                  Modo local. La imagen se guarda en este navegador hasta conectar storage real.
                </span>
              </div>
              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Placeholder
                </span>
                <input
                  value={contentDraft.heroImagePlaceholder ?? ""}
                  onChange={(event) => updateContentField("heroImagePlaceholder", event.target.value)}
                  className="input-base"
                />
              </label>
            </div>
          </SectionCard>

          <SectionCard
            title="SelecciÃ³n de platos"
            description="TÃ­tulo y subtÃ­tulo visibles para los platos destacados que se toman desde /local/menu."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  TÃ­tulo destacado
                </span>
                <input
                  value={contentDraft.menuTitle ?? ""}
                  onChange={(event) => updateContentField("menuTitle", event.target.value)}
                  className="input-base"
                  placeholder="SelecciÃ³n destacada"
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  SubtÃ­tulo destacado
                </span>
                <textarea
                  value={contentDraft.menuSubtitle ?? ""}
                  onChange={(event) => updateContentField("menuSubtitle", event.target.value)}
                  className="input-base min-h-24"
                  placeholder="Algunas opciones recomendadas por el local."
                />
              </label>
            </div>
          </SectionCard>

                    <SectionCard
            title="InformaciÃ³n del negocio"
            description="Texto principal, texto secundario y etiquetas visibles para contar mejor la propuesta."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  TÃ­tulo de secciÃ³n
                </span>
                <input
                  value={contentDraft.aboutTitle ?? ""}
                  onChange={(event) => updateContentField("aboutTitle", event.target.value)}
                  className="input-base"
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Texto principal
                </span>
                <textarea
                  value={contentDraft.aboutText ?? ""}
                  onChange={(event) => updateContentField("aboutText", event.target.value)}
                  className="input-base min-h-32"
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Texto secundario
                </span>
                <textarea
                  value={contentDraft.presentationText}
                  onChange={(event) => updateContentField("presentationText", event.target.value)}
                  className="input-base min-h-28"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Destacado 1
                </span>
                <input
                  value={contentDraft.aboutHighlights?.[0] ?? ""}
                  onChange={(event) =>
                    updateContentField("aboutHighlights", [
                      event.target.value,
                      contentDraft.aboutHighlights?.[1] ?? "",
                      contentDraft.aboutHighlights?.[2] ?? "",
                    ])
                  }
                  className="input-base"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Destacado 2
                </span>
                <input
                  value={contentDraft.aboutHighlights?.[1] ?? ""}
                  onChange={(event) =>
                    updateContentField("aboutHighlights", [
                      contentDraft.aboutHighlights?.[0] ?? "",
                      event.target.value,
                      contentDraft.aboutHighlights?.[2] ?? "",
                    ])
                  }
                  className="input-base"
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Destacado 3
                </span>
                <input
                  value={contentDraft.aboutHighlights?.[2] ?? ""}
                  onChange={(event) =>
                    updateContentField("aboutHighlights", [
                      contentDraft.aboutHighlights?.[0] ?? "",
                      contentDraft.aboutHighlights?.[1] ?? "",
                      event.target.value,
                    ])
                  }
                  className="input-base"
                />
              </label>

              <div className="sm:col-span-2 rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-xs uppercase tracking-[0.18em] text-slate-400">
                UbicaciÃ³n y contacto
              </div>

              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  TÃ­tulo ubicaciÃ³n
                </span>
                <input
                  value={contentDraft.locationTitle}
                  onChange={(event) => updateContentField("locationTitle", event.target.value)}
                  className="input-base"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Texto ubicaciÃ³n
                </span>
                <input
                  value={contentDraft.locationText}
                  onChange={(event) => updateContentField("locationText", event.target.value)}
                  className="input-base"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  WhatsApp visible
                </span>
                <input
                  value={contentDraft.whatsapp ?? ""}
                  onChange={(event) => updateContentField("whatsapp", event.target.value)}
                  className="input-base"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Email opcional
                </span>
                <input
                  value={contentDraft.email ?? ""}
                  onChange={(event) => updateContentField("email", event.target.value)}
                  className="input-base"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Instagram
                </span>
                <input
                  value={contentDraft.instagramUrl ?? ""}
                  onChange={(event) => updateContentField("instagramUrl", event.target.value)}
                  className="input-base"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Facebook
                </span>
                <input
                  value={contentDraft.facebookUrl ?? ""}
                  onChange={(event) => updateContentField("facebookUrl", event.target.value)}
                  className="input-base"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  TikTok
                </span>
                <input
                  value={contentDraft.tiktokUrl ?? ""}
                  onChange={(event) => updateContentField("tiktokUrl", event.target.value)}
                  className="input-base"
                />
              </label>
              <label className="space-y-1.5">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Sitio externo
                </span>
                <input
                  value={contentDraft.websiteUrl ?? ""}
                  onChange={(event) => updateContentField("websiteUrl", event.target.value)}
                  className="input-base"
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Google Maps URL
                </span>
                <input
                  value={contentDraft.googleMapsUrl ?? ""}
                  onChange={(event) => updateContentField("googleMapsUrl", event.target.value)}
                  className="input-base"
                  placeholder="https://maps.google.com/..."
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Google Maps Embed URL
                </span>
                <input
                  value={contentDraft.mapEmbedUrl ?? ""}
                  onChange={(event) => updateContentField("mapEmbedUrl", event.target.value)}
                  className="input-base"
                  placeholder="https://www.google.com/maps/embed?..."
                />
              </label>
              <label className="space-y-1.5 sm:col-span-2">
                <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                  Texto visible de ubicaciÃ³n
                </span>
                <input
                  value={contentDraft.mapLabel ?? ""}
                  onChange={(event) => updateContentField("mapLabel", event.target.value)}
                  className="input-base"
                  placeholder="UbicaciÃ³n"
                />
              </label>
            </div>
          </SectionCard>

          <SectionCard
            title="Secciones activas"
            description="Si una secciÃ³n se desactiva acÃ¡, no se muestra en la web pÃºblica."
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {[
                ["showHero", "Hero"],
                ["showAbout", "InformaciÃ³n del negocio"],
                ["showFeaturedMenu", "SelecciÃ³n destacada"],
                ["showMenu", "MenÃº"],
                ["showGallery", "GalerÃ­a"],
                ["showLocation", "UbicaciÃ³n"],
                ["showReservation", "Reservas"],
                ["showWhatsappButton", "BotÃ³n WhatsApp"],
                ["showEmailButton", "BotÃ³n email"],
                ["showSocials", "Redes sociales"],
              ].map(([key, label]) => (
                <label
                  key={key}
                  className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-900/70 px-4 py-3 text-sm text-slate-200"
                >
                  <input
                    type="checkbox"
                    checked={toBooleanField(contentDraft[key as PublicWebToggleKey])}
                    onChange={(event) => updateToggleField(key as PublicWebToggleKey, event.target.checked)}
                    className="h-4 w-4 rounded border-white/20 bg-slate-950 text-cyan-400"
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </SectionCard>

          <SectionCard
            title="GalerÃ­a dinÃ¡mica"
            description="ImÃ¡genes activas/inactivas por negocio. Pueden venir por URL o subidas localmente."
          >
            <div className="flex items-center justify-between gap-3">
              <div className="text-sm text-slate-300">
                {galleryItems.length} imÃ¡genes cargadas Â· {activeGalleryCount} activas
              </div>
              <button
                type="button"
                onClick={openCreateGalleryItem}
                className="rounded-full border border-white/10 bg-white/5 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/30 hover:text-white"
              >
                Nueva foto
              </button>
            </div>

            <div className="mt-4 grid gap-4">
              {galleryItems.length > 0 ? (
                galleryItems.map((item) => {
                  const imageSource = getGalleryImageSource(item);
                  const placeholder = item.imagePlaceholder?.trim() || getInitials(item.title);

                  return (
                    <article
                      key={item.id}
                      className="grid gap-4 rounded-[1.35rem] border border-white/10 bg-slate-950/60 p-3 sm:grid-cols-[180px_1fr]"
                    >
                      <div className="overflow-hidden rounded-[1rem] border border-white/10 bg-slate-900/70">
                        <div className="h-36 bg-gradient-to-br from-cyan-500/20 via-slate-900 to-slate-950">
                          {imageSource ? (
                            <img
                              src={imageSource}
                              alt={item.altText?.trim() || item.description?.trim() || item.title}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-2xl font-semibold text-white">
                              {placeholder}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex min-w-0 flex-col justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-start justify-between gap-3">
                            <div className="min-w-0">
                              <h4 className="truncate text-sm font-semibold text-white">{item.title}</h4>
                              {item.description ? (
                                <p className="mt-1 line-clamp-2 text-xs leading-5 text-slate-300">
                                  {item.description}
                                </p>
                              ) : null}
                            </div>
                            <StatusPill
                              label={item.isActive ? "Activa" : "Inactiva"}
                              tone={item.isActive ? "emerald" : "default"}
                            />
                          </div>
                          <div className="flex flex-wrap gap-2">
                            <StatusPill
                              label={item.imageDataUrl ? "Upload" : item.imageUrl ? "URL" : "Placeholder"}
                              tone="cyan"
                            />
                            <StatusPill label={item.id.slice(0, 10)} />
                          </div>
                        </div>

                        <div className="flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openEditGalleryItem(item.id)}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-400/30 hover:text-white"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleGalleryItem(item.id)}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-cyan-400/30 hover:text-white"
                          >
                            {item.isActive ? "Desactivar" : "Activar"}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveGalleryItem(item.id, -1)}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-white/20 hover:text-white"
                          >
                            Subir
                          </button>
                          <button
                            type="button"
                            onClick={() => handleMoveGalleryItem(item.id, 1)}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-white/20 hover:text-white"
                          >
                            Bajar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteGalleryItem(item.id)}
                            className="rounded-full border border-rose-400/20 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-100 transition hover:bg-rose-500/20 hover:text-white"
                          >
                            Eliminar
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/60 px-4 py-8 text-sm text-slate-300">
                  TodavÃ­a no hay imÃ¡genes cargadas para este negocio.
                </div>
              )}
            </div>
          </SectionCard>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-[1.35rem] border border-white/10 bg-slate-950/60 p-4">
            <div className="text-sm text-slate-300">
              Guarda primero y despuÃ©s revisa la vista pÃºblica o restaura la demo base si hace falta.
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleSaveContent}
                className="rounded-full bg-cyan-400 px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                Guardar cambios
              </button>
              <button
                type="button"
                onClick={handleResetContent}
                className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:text-white"
              >
                Restaurar demo
              </button>
            </div>
          </div>
        </div>

        <div className="grid gap-4">
          <section className="rounded-[1.35rem] border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
                  Preview web
                </p>
                <h2 className="text-sm font-semibold text-white">CÃ³mo se verÃ¡ la web pÃºblica</h2>
                <p className="max-w-3xl text-xs leading-5 text-slate-300">
                  Esta vista usa el contenido editado ahora mismo, sin hardcodear textos del negocio.
                </p>
              </div>
              <div className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1.5 text-xs text-slate-300">
                Live preview
              </div>
            </div>

            <div className="mt-4 max-h-[calc(100vh-240px)] overflow-y-auto rounded-[1.35rem] border border-white/10 bg-slate-950/80 p-3">
              <LocalWebPreview
                business={selectedBusiness}
                content={contentDraft}
                galleryItems={galleryItems}
              />
            </div>
          </section>
        </div>
      </div>

      <GalleryModal
        open={Boolean(galleryModal)}
        mode={galleryModal?.mode ?? "create"}
        draft={galleryModal?.draft ?? createGalleryDraft()}
      error={galleryError}
      onChange={(draft) =>
        setGalleryModal((current) => (current ? { ...current, draft, error: "" } : current))
      }
      onClose={() => {
          setGalleryModal(null);
          setGalleryError("");
      }}
      onSave={saveGalleryItem}
      onError={setGalleryError}
      sourceLabel={sourceLabel}
    />
  </section>
);
}
