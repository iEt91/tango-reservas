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

export function RestaurantElegantTemplate({
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
      <WideContainer className="flex flex-col gap-6">
        <PublicHero business={business} content={content} theme={theme} />

        <div className="grid items-start gap-6 xl:grid-cols-[1.02fr_0.98fr]">
          <PublicBusinessInfo
            business={business}
            content={content}
            accentColor={business.primaryColor}
          />
          {content.showFeaturedMenu !== false ? (
            <PublicFeaturedMenu
              businessId={business.id}
              title={content.menuTitle || business.menuTitle || "Seleccion destacada"}
              subtitle={content.menuSubtitle || "Algunas opciones recomendadas por el local."}
              accentColor={business.primaryColor}
              categoriesOverride={menuCategories}
              itemsOverride={menuItems}
              emptyMessage={publicDataSource === "supabase" ? "El menu estara disponible pronto." : undefined}
            />
          ) : null}
        </div>

        {content.showMenu ? (
          <PublicMenuSection
            businessId={business.id}
            accentColor={business.primaryColor}
            categoriesOverride={menuCategories}
            itemsOverride={menuItems}
            emptyMessage={publicDataSource === "supabase" ? "El menu estara disponible pronto." : undefined}
          />
        ) : null}

        {content.showGallery ? (
          <PublicGallery
            title="Galeria seleccionada"
            items={galleryItems}
            accentColor={business.primaryColor}
            variant="elegant"
            hideWhenEmpty
          />
        ) : null}

        <div className="grid items-start gap-6 xl:grid-cols-[0.98fr_1.02fr]">
          {content.showLocation ? (
            <PublicLocation
              business={business}
              content={content}
              accentColor={business.primaryColor}
            />
          ) : null}
          {content.showReservation ? (
            <PublicReservationSection
              business={business}
              content={content}
              publicDataSource={publicDataSource}
              servicesOverride={services}
            />
          ) : null}
        </div>
      </WideContainer>
    </main>
  );
}
