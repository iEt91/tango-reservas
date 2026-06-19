"use client";

import type { Business, PublicWebContent, PublicWebGalleryItem } from "@/data/types";
import { getThemeById } from "@/lib/themes";
import { CompactPremiumTemplate } from "@/components/themes/templates/CompactPremiumTemplate";
import { MinimalCafeTemplate } from "@/components/themes/templates/MinimalCafeTemplate";
import { RestaurantElegantTemplate } from "@/components/themes/templates/RestaurantElegantTemplate";

type LocalWebPreviewProps = {
  business: Business;
  content: PublicWebContent;
  galleryItems: PublicWebGalleryItem[];
};

function renderTemplate(
  templateId: string,
  business: Business,
  content: PublicWebContent,
  galleryItems: PublicWebGalleryItem[],
) {
  const theme = getThemeById(business.themeId);

  switch (templateId) {
    case "compact-premium":
      return (
        <CompactPremiumTemplate
          business={business}
          theme={theme}
          content={content}
          galleryItems={galleryItems}
        />
      );
    case "minimal-cafe":
      return (
        <MinimalCafeTemplate
          business={business}
          theme={theme}
          content={content}
          galleryItems={galleryItems}
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
        />
      );
  }
}

export function LocalWebPreview({ business, content, galleryItems }: LocalWebPreviewProps) {
  const theme = getThemeById(business.themeId);
  const templateId = content.publicTemplateId?.trim() || theme.templateId;

  return renderTemplate(templateId, business, content, galleryItems);
}
