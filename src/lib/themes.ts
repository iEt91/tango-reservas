import type { PublicThemeId } from "@/data/types";

export type PublicTheme = {
  id: PublicThemeId;
  templateId: "restaurant-elegant" | "compact-premium" | "minimal-cafe";
  name: string;
  description: string;
  previewLabel: string;
  category: string;
  defaultColors: {
    primaryColor: string;
    secondaryColor: string;
  };
};

const themes: Record<PublicThemeId, PublicTheme> = {
  restaurant_elegant: {
    id: "restaurant_elegant",
    templateId: "restaurant-elegant",
    name: "Restaurante elegante",
    description: "Template premium para restaurantes de autor y cenas especiales.",
    previewLabel: "Restaurant Elegant",
    category: "Gastronomia premium",
    defaultColors: {
      primaryColor: "#06b6d4",
      secondaryColor: "#0f172a",
    },
  },
  beach_club_dark: {
    id: "beach_club_dark",
    templateId: "compact-premium",
    name: "Beach club oscuro",
    description: "Template visual, nocturno y playero para paradores y balnearios.",
    previewLabel: "Beach Club Dark",
    category: "Beach club / parador",
    defaultColors: {
      primaryColor: "#38bdf8",
      secondaryColor: "#082f49",
    },
  },
  cafe_minimal: {
    id: "cafe_minimal",
    templateId: "minimal-cafe",
    name: "Cafe minimalista",
    description: "Template calido y limpio para cafeterias, brunch y desayunos.",
    previewLabel: "Cafe Minimal",
    category: "Cafe / brunch",
    defaultColors: {
      primaryColor: "#f59e0b",
      secondaryColor: "#292524",
    },
  },
};

export const THEME_OPTIONS = Object.values(themes);

export function getThemeById(themeId?: string | null): PublicTheme {
  if (themeId && themeId in themes) {
    return themes[themeId as PublicThemeId];
  }

  return themes.restaurant_elegant;
}

export function getThemePreviewLabel(themeId?: string | null) {
  return getThemeById(themeId).previewLabel;
}

export function getThemeName(themeId?: string | null) {
  return getThemeById(themeId).name;
}

export function getDefaultThemeId(): PublicThemeId {
  return "restaurant_elegant";
}
