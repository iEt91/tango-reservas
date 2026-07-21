export type V2WebTemplateImageSlot = {
  id: string;
  label: string;
  description: string;
  defaultSrc: string;
};

export type V2WebTemplateTextSlot = {
  id: string;
  label: string;
  defaultValue: string;
  multiline?: boolean;
};

export type V2WebTemplate = {
  id: string;
  name: string;
  category: string;
  description: string;
  recommendedFor: string[];
  previewImage: string;
  accent: string;
  imageSlots: V2WebTemplateImageSlot[];
  textSlots: V2WebTemplateTextSlot[];
};

export type V2WebTemplateSectionId = "hero" | "menu" | "experience" | "gallery" | "contact";

export type V2WebTemplateContent = {
  templateId: string;
  textValues: Record<string, string>;
  imageValues: Record<string, string>;
  visibleSections: Record<V2WebTemplateSectionId, boolean>;
  updatedAt: string;
};

export const V2_WEB_TEMPLATE_STORAGE_KEY = "tango-v2-active-web-template";
export const V2_WEB_TEMPLATE_CONTENT_STORAGE_KEY = "tango-v2-web-template-content";

export const V2_WEB_TEMPLATE_SECTION_LABELS: Record<V2WebTemplateSectionId, string> = {
  hero: "Hero principal",
  menu: "Menú destacado",
  experience: "Experiencia",
  gallery: "Galería / ambiente",
  contact: "Contacto",
};

export const v2WebTemplates: V2WebTemplate[] = [
  {
    id: "demuru-restaurant",
    name: "Demuru Restaurante",
    category: "Restaurante elegante",
    description:
      "Plantilla vertical, visual y premium para restaurantes con platos destacados, ambiente, experiencia y contacto.",
    recommendedFor: ["Restaurantes", "Cocina de autor", "Parrillas", "Bistró"],
    previewImage: "/web-templates/demuru-restaurant/hero.png",
    accent: "from-stone-950 via-stone-900 to-amber-950",
    imageSlots: [
      { id: "hero", label: "Hero principal", description: "Imagen principal de portada.", defaultSrc: "/web-templates/demuru-restaurant/hero.png" },
      { id: "espacio1", label: "Ambiente 1", description: "Foto del salón, mesa o experiencia.", defaultSrc: "/web-templates/demuru-restaurant/espacio1.png" },
      { id: "espacio2", label: "Fachada / entrada", description: "Foto exterior o entrada del local.", defaultSrc: "/web-templates/demuru-restaurant/espacio2.png" },
      { id: "espacio3", label: "Bebidas / mesa", description: "Imagen de copa, mesa o detalle del servicio.", defaultSrc: "/web-templates/demuru-restaurant/espacio3.png" },
      { id: "espacio5", label: "Mesa compartida", description: "Imagen de varios platos o mesa completa.", defaultSrc: "/web-templates/demuru-restaurant/espacio5.png" },
      { id: "espacio6", label: "Chef / cocina", description: "Imagen del chef o preparación.", defaultSrc: "/web-templates/demuru-restaurant/espacio6.png" },
      { id: "menu1", label: "Plato destacado 1", description: "Imagen del primer plato destacado.", defaultSrc: "/web-templates/demuru-restaurant/menu1.png" },
      { id: "menu2", label: "Plato destacado 2", description: "Imagen del segundo plato destacado.", defaultSrc: "/web-templates/demuru-restaurant/menu2.png" },
      { id: "menu3", label: "Plato destacado 3", description: "Imagen del tercer plato destacado.", defaultSrc: "/web-templates/demuru-restaurant/menu3.png" },
      { id: "menu4", label: "Postre / especial", description: "Imagen de postre, especial o producto premium.", defaultSrc: "/web-templates/demuru-restaurant/menu4.png" },
    ],
    textSlots: [
      { id: "heroEyebrow", label: "Texto superior del hero", defaultValue: "Cocina de autor en Pinamar" },
      { id: "heroTitle", label: "Título principal", defaultValue: "Sabores honestos, noches memorables" },
      { id: "heroSubtitle", label: "Subtítulo principal", defaultValue: "Reservá tu mesa y disfrutá una experiencia cálida, estacional y cuidada en cada detalle.", multiline: true },
      { id: "primaryButton", label: "Botón principal", defaultValue: "Reservar mesa" },
      { id: "menuTitle", label: "Título menú", defaultValue: "Platos destacados" },
      { id: "experienceTitle", label: "Título experiencia", defaultValue: "Una experiencia pensada para quedarse" },
      { id: "experienceText", label: "Texto experiencia", defaultValue: "Ambiente íntimo, producto de estación y una carta diseñada para compartir buenos momentos.", multiline: true },
      { id: "contactTitle", label: "Título contacto", defaultValue: "Visitá Demuru" },
    ],
  },
];

export function getV2WebTemplateById(templateId: string | null | undefined) {
  return v2WebTemplates.find((template) => template.id === templateId) ?? v2WebTemplates[0];
}

export function createDefaultV2WebTemplateContent(template: V2WebTemplate): V2WebTemplateContent {
  return {
    templateId: template.id,
    textValues: Object.fromEntries(template.textSlots.map((slot) => [slot.id, slot.defaultValue])),
    imageValues: Object.fromEntries(template.imageSlots.map((slot) => [slot.id, slot.defaultSrc])),
    visibleSections: { hero: true, menu: true, experience: true, gallery: true, contact: true },
    updatedAt: new Date().toISOString(),
  };
}

export function mergeV2WebTemplateContent(
  template: V2WebTemplate,
  content: Partial<V2WebTemplateContent> | null | undefined
): V2WebTemplateContent {
  const defaultContent = createDefaultV2WebTemplateContent(template);

  return {
    ...defaultContent,
    ...content,
    templateId: template.id,
    textValues: { ...defaultContent.textValues, ...(content?.textValues ?? {}) },
    imageValues: { ...defaultContent.imageValues, ...(content?.imageValues ?? {}) },
    visibleSections: { ...defaultContent.visibleSections, ...(content?.visibleSections ?? {}) },
  };
}
