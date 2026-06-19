"use client";

import { useMemo, useSyncExternalStore } from "react";
import type {
  Business,
  PublicWebContent,
  PublicWebGalleryItem,
  Service,
} from "@/data/types";
import {
  getPublicWebServerSnapshot,
  getPublicWebSnapshot,
  subscribePublicWeb,
} from "@/lib/data/webContent";
import { getThemeById } from "@/lib/themes";
import { CompactPremiumTemplate } from "./templates/CompactPremiumTemplate";
import { MinimalCafeTemplate } from "./templates/MinimalCafeTemplate";
import { RestaurantElegantTemplate } from "./templates/RestaurantElegantTemplate";
import { useHasMounted } from "@/hooks/useHasMounted";
import type { MenuCategory, MenuItem } from "@/data/types";

type PublicBusinessRendererProps = {
  business: Business;
  contentOverride?: PublicWebContent;
  galleryOverride?: PublicWebGalleryItem[];
  menuCategoriesOverride?: MenuCategory[];
  menuItemsOverride?: MenuItem[];
  servicesOverride?: Service[];
  snapshotOverride?: PublicWebSnapshot | null;
  publicDataSource?: "local" | "supabase";
};

type PublicWebSnapshot = {
  content: PublicWebContent;
  gallery: PublicWebGalleryItem[];
  services?: Service[];
};

function parseSnapshot(snapshot: string, business: Business): PublicWebSnapshot {
  try {
    const parsed = JSON.parse(snapshot) as Partial<PublicWebSnapshot>;

    if (parsed.content && Array.isArray(parsed.gallery)) {
      return {
        content: parsed.content,
        gallery: parsed.gallery,
      };
    }
  } catch {
    // fall through to fallback below
  }

  return {
    content: {
      businessId: business.id,
      publicName: business.name,
      publicSubtitle: business.description,
      publicDescription: business.description,
      publicBadge: business.category,
      publicAttributesText: "Cocina de autor, Reservas cuidadas, Atencion personalizada",
      publicTemplateId: "restaurant-elegant",
      heroDescription: business.description,
      publicCategory: business.category,
      publicCity: business.city,
      publicAddress: business.address,
      publicPhone: business.phone,
      heroTitle: business.heroTitle || business.name,
      heroSubtitle: business.heroSubtitle || business.description,
      heroSecondaryCtaLabel: business.showMenu ? "Ver menu" : null,
      menuTitle: business.menuTitle || "Seleccion destacada",
      menuSubtitle: "Algunas opciones recomendadas por el local.",
      aboutTitle: business.aboutTitle || "Presentacion",
      aboutText: business.aboutText || business.description,
      presentationTitle: business.aboutTitle || "Presentacion",
      presentationText: business.aboutText || business.description,
      aboutHighlights: [],
      featuredPhrase: business.menuTitle || business.ctaLabel || "Experiencia del negocio",
      mapLabel: "Ubicacion",
      locationTitle: "Ubicacion",
      locationText: business.address || business.city,
      heroImageDataUrl: null,
      heroImageUrl: null,
      heroImagePlaceholder:
        business.name
          .trim()
          .split(/\s+/)
          .filter(Boolean)
          .slice(0, 2)
          .map((part) => part[0] ?? "")
          .join("")
          .toUpperCase() || "MN",
      instagramUrl: business.instagramUrl || null,
      facebookUrl: business.facebookUrl || null,
      tiktokUrl: null,
      websiteUrl: business.websiteUrl || null,
      whatsapp: business.whatsapp || null,
      email: business.email || null,
      googleMapsUrl: business.googleMapsUrl || null,
      mapEmbedUrl: null,
      ctaLabel: business.ctaLabel || "Reservar ahora",
      showHero: business.showHero,
      showAbout: business.showAbout,
      showFeaturedMenu: business.showMenu,
      showGallery: business.showGallery,
      showMenu: business.showMenu,
      showLocation: business.showLocation,
      showReservation: business.showReservation,
      showReservations: business.showReservation,
      showWhatsappButton: business.showWhatsappButton,
      showEmailButton: true,
      showSocials: true,
      updatedAt: business.updatedAt,
    },
    gallery: [],
  };
}

function renderTemplate(
  themeId: string,
  business: Business,
  content: PublicWebContent,
  galleryItems: PublicWebGalleryItem[],
  menuCategories?: MenuCategory[],
  menuItems?: MenuItem[],
  services?: Service[],
  publicDataSource?: "local" | "supabase",
) {
  const theme = getThemeById(themeId);
  const templateId = content.publicTemplateId?.trim() || theme.templateId;
  const safeServices = services ?? [];
  const safePublicDataSource = publicDataSource ?? "local";

  switch (templateId) {
    case "compact-premium":
      return (
        <CompactPremiumTemplate
          business={business}
          theme={theme}
          content={content}
          galleryItems={galleryItems}
          menuCategories={menuCategories}
          menuItems={menuItems}
          services={safeServices}
          publicDataSource={safePublicDataSource}
        />
      );
    case "minimal-cafe":
      return (
        <MinimalCafeTemplate
          business={business}
          theme={theme}
          content={content}
          galleryItems={galleryItems}
          menuCategories={menuCategories}
          menuItems={menuItems}
          services={safeServices}
          publicDataSource={safePublicDataSource}
        />
      );
    case "restaurant-elegant":
    default:
      return (
        <RestaurantElegantTemplate
          business={business}
          theme={theme}
          content={content}
          galleryItems={galleryItems}
          menuCategories={menuCategories}
          menuItems={menuItems}
          services={safeServices}
          publicDataSource={safePublicDataSource}
        />
      );
  }
}

function PublicBusinessShell({ business }: { business: Business }) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/25">
      <div className="grid gap-8 p-6 xl:grid-cols-[1.1fr_0.9fr] xl:p-10">
        <div className="space-y-6">
          <div className="flex flex-wrap items-center gap-3">
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.2em] text-slate-300">
              Cargando web
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              {business.category}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
              {business.city}
            </span>
          </div>

          <div className="space-y-3">
            <div className="h-12 w-4/5 animate-pulse rounded-2xl bg-white/10" />
            <div className="h-6 w-full animate-pulse rounded-full bg-white/10" />
            <div className="h-6 w-11/12 animate-pulse rounded-full bg-white/10" />
            <div className="h-6 w-3/4 animate-pulse rounded-full bg-white/10" />
          </div>

          <div className="flex flex-wrap gap-3">
            <div className="h-12 w-36 animate-pulse rounded-full bg-white/10" />
            <div className="h-12 w-32 animate-pulse rounded-full bg-white/10" />
            <div className="h-12 w-28 animate-pulse rounded-full bg-white/10" />
          </div>

          <div className="grid gap-3 md:grid-cols-3">
            <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-24 animate-pulse rounded-2xl bg-white/5" />
          </div>
        </div>

        <div className="grid gap-4">
          <div className="rounded-[1.75rem] border border-white/10 p-5">
            <div className="flex items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="h-3 w-24 animate-pulse rounded-full bg-white/10" />
                <div className="h-6 w-40 animate-pulse rounded-full bg-white/10" />
              </div>
              <div className="h-12 w-12 rounded-2xl border border-white/10 bg-white/10" />
            </div>
            <div className="mt-4 h-72 animate-pulse rounded-[1.5rem] border border-dashed border-white/10 bg-slate-950/35" />
          </div>

          <div className="rounded-[1.75rem] border border-white/10 bg-slate-950/60 p-5">
            <div className="h-3 w-20 animate-pulse rounded-full bg-white/10" />
            <div className="mt-3 h-5 w-4/5 animate-pulse rounded-full bg-white/10" />
            <div className="mt-2 h-5 w-3/4 animate-pulse rounded-full bg-white/10" />
          </div>
        </div>
      </div>
    </section>
  );
}

export function PublicBusinessRenderer({
  business,
  contentOverride,
  galleryOverride,
  menuCategoriesOverride,
  menuItemsOverride,
  servicesOverride,
  snapshotOverride,
  publicDataSource = "local",
}: PublicBusinessRendererProps) {
  const hasMounted = useHasMounted();
  const snapshot = useSyncExternalStore(
    snapshotOverride ? (() => () => {}) : subscribePublicWeb,
    () => {
      if (snapshotOverride) {
        return JSON.stringify(snapshotOverride);
      }

      return getPublicWebSnapshot(business.id);
    },
    () => {
      if (snapshotOverride) {
        return JSON.stringify(snapshotOverride);
      }

      return getPublicWebServerSnapshot(business.id);
    },
  );

  const { content, gallery } = useMemo(
    () =>
      snapshotOverride
        ? {
            content: snapshotOverride.content,
            gallery: snapshotOverride.gallery,
          }
        : parseSnapshot(snapshot, business),
    [business, snapshot, snapshotOverride],
  );

  if (!hasMounted) {
    return <PublicBusinessShell business={business} />;
  }

  return renderTemplate(
    business.themeId,
    business,
    contentOverride ?? content,
    galleryOverride ?? gallery,
    menuCategoriesOverride,
    menuItemsOverride,
    servicesOverride ?? snapshotOverride?.services ?? [],
    publicDataSource,
  );
}
