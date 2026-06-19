import { WideContainer } from "@/components/WideContainer";
import type {
  Business,
  MenuCategory,
  MenuItem,
  PublicWebContent,
  PublicWebGalleryItem,
  Service,
} from "@/data/types";
import type { PublicTheme } from "@/lib/themes";
import { PublicBusinessInfo } from "../PublicBusinessInfo";
import { PublicFeaturedMenu } from "../PublicFeaturedMenu";
import { PublicGallery } from "../PublicGallery";
import { PublicHero } from "../PublicHero";
import { PublicLocation } from "../PublicLocation";
import { PublicMenuSection } from "../PublicMenuSection";
import { PublicReservationSection } from "../PublicReservationSection";

type TemplateProps = {
  business: Business;
  theme: PublicTheme;
  content: PublicWebContent;
  galleryItems: PublicWebGalleryItem[];
  menuCategories?: MenuCategory[];
  menuItems?: MenuItem[];
  services?: Service[];
  publicDataSource?: "local" | "supabase";
};

export function MinimalCafeTemplate({
  business,
  theme,
  content,
  galleryItems,
  menuCategories,
  menuItems,
  services,
  publicDataSource,
}: TemplateProps) {
  return (
    <main className="w-full py-6">
      <WideContainer className="flex flex-col gap-5">
        <div className="flex flex-wrap items-center gap-2 rounded-[1.35rem] border border-amber-400/15 bg-amber-500/10 px-4 py-3 text-xs uppercase tracking-[0.18em] text-amber-100">
          Plantilla publica: Cafe minimalista
        </div>
        <PublicHero business={business} content={content} theme={theme} compact />

        {content.showMenu ? (
          <PublicMenuSection
            businessId={business.id}
            accentColor={business.primaryColor}
            variant="minimal"
            categoriesOverride={menuCategories}
            itemsOverride={menuItems}
            emptyMessage={publicDataSource === "supabase" ? "El menu estara disponible pronto." : undefined}
          />
        ) : null}

        <div className="grid items-start gap-5 xl:grid-cols-[0.96fr_1.04fr]">
          {content.showFeaturedMenu !== false ? (
            <PublicFeaturedMenu
              businessId={business.id}
              title={content.menuTitle || business.menuTitle || "Seleccion destacada"}
              subtitle={content.menuSubtitle || "Algunas opciones recomendadas por el local."}
              accentColor={business.primaryColor}
              variant="minimal"
              categoriesOverride={menuCategories}
              itemsOverride={menuItems}
              emptyMessage={publicDataSource === "supabase" ? "El menu estara disponible pronto." : undefined}
            />
          ) : null}
          {content.showReservation ? (
            <PublicReservationSection
              business={business}
              content={content}
              variant="minimal"
              publicDataSource={publicDataSource}
              servicesOverride={services}
            />
          ) : null}
        </div>

        <div className="grid items-start gap-5 xl:grid-cols-[1fr_1fr]">
          {content.showAbout ? (
            <PublicBusinessInfo
              business={business}
              content={content}
              accentColor={business.primaryColor}
              variant="minimal"
            />
          ) : null}
          {content.showLocation ? (
            <PublicLocation
              business={business}
              content={content}
              accentColor={business.primaryColor}
              variant="minimal"
            />
          ) : null}
        </div>

        {content.showGallery ? (
          <PublicGallery
            title="Momentos del cafe"
            items={galleryItems}
            accentColor={business.primaryColor}
            variant="minimal"
            compact
            hideWhenEmpty
          />
        ) : null}
      </WideContainer>
    </main>
  );
}
