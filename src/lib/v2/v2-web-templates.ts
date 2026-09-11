export type V2WebTemplateImageSlot = { id: string; label: string; description: string; defaultSrc: string };
export type V2WebTemplateTextSlot = { id: string; label: string; defaultValue: string; multiline?: boolean };
export type V2WebTemplate = { id: string; name: string; category: string; description: string; recommendedFor: string[]; previewImage: string; previewUrl?: string; accent: string; imageSlots: V2WebTemplateImageSlot[]; textSlots: V2WebTemplateTextSlot[] };
export type V2WebTemplateSectionId = "hero" | "menu" | "experience" | "gallery" | "contact";
export type V2WebTemplateContent = { templateId: string; textValues: Record<string, string>; imageValues: Record<string, string>; visibleSections: Record<V2WebTemplateSectionId, boolean>; updatedAt: string };

export const V2_WEB_TEMPLATE_STORAGE_KEY = "tango-v2-active-web-template";
export const V2_WEB_TEMPLATE_CONTENT_STORAGE_KEY = "tango-v2-web-template-content";
export const V2_DEFAULT_WEB_TEMPLATE_ID = "01-bistro-contemporaneo";
export const V2_WEB_TEMPLATE_SECTION_LABELS: Record<V2WebTemplateSectionId, string> = { hero: "Hero principal", menu: "Menú destacado", experience: "Experiencia", gallery: "Galería / ambiente", contact: "Contacto" };

const catalog = [
  "01-bistro-contemporaneo", "02-mediterraneo-costero", "03-izakaya-japones", "04-trattoria-italiana", "05-parrilla-argentina", "06-cafe-vegetal", "07-menu-degustacion", "08-pizzeria-napolitana", "09-sushi-omakase", "10-panaderia-brunch", "11-brasserie-art-deco", "12-taqueria-moderna", "13-nordico-estacional", "14-cevicheria-peruana", "15-korean-barbecue", "16-cocina-libanesa", "17-diner-retro", "18-thai-street-food", "19-steakhouse-bodega", "20-mariscos-sustentable", "21-cocina-india-fine-dining", "22-churrascaria-brasilera", "23-burger-laboratorio", "24-restaurante-alpino", "25-tapas-y-vermouth", "26-pasteleria-y-cafe", "27-cerveceria-gastropub", "28-pastas-familiares", "29-fusion-caribena", "30-farm-to-table",
  "31_Japanese_Minimal_Noodle_Kit", "32_Pop_Art_Dessert_Kit", "33_Cyberpunk_Neon_Sushi_Kit", "34_Vintage_Cafe_Barrio_Kit", "35_Watercolor_Japanese_Tea_Garden_Kit", "36_Moody_Fine_Dining_Editorial_Kit", "37_Memphis_Arcade_Pizza_Kit", "38_Pixel_Art_Ramen_Game_Kit", "39_Monochrome_Brutalist_Fine_Dining_Kit", "40_Wabi_Sabi_Ceramic_Zen_Kit", "41_Coastal_Seafood_Minimal_Kit", "42_Tropical_Filipino_Fusion_Kit", "43_Urban_Street_Food_Brush_Kit", "44_Rustic_Italian_Winehouse_Kit", "45_Coastal_Brutalist_Fine_Dining_Kit", "46_Ethiopian_Heritage_Cuisine_Kit", "47_Serene_Dim_Sum_Tea_Kit", "48_Cajun_Creole_Mardi_Gras_Kit", "49_Nordic_Volcanic_Fine_Dining_Kit", "50_Marrakech_Rooftop_Moroccan_Kit",
] as const;
const colors = ["#18251a", "#1456a0", "#7d1717", "#c85d3b", "#23452f", "#496955", "#aa8c48", "#d74a36", "#142031", "#b48454", "#c49c54", "#cc0c24", "#0c5484", "#6c6c54", "#9c2424", "#b87c44", "#e45c3c", "#e75e1d", "#840c0c", "#247c94", "#8b3f20", "#26734d", "#e03d22", "#365c5a", "#b33e30", "#ce8973", "#b8842c", "#b95637", "#e86632", "#5c7650", "#ba4a2f", "#f4518c", "#8b38c9", "#a46040", "#638c74", "#3b2a34", "#ff4d5a", "#55c4c0", "#181818", "#8a7868", "#3c8b9b", "#e67c35", "#e34228", "#76523c", "#223e4b", "#a94727", "#5a7b67", "#7f345d", "#2a3033", "#ae6636"];
const title = (id: string) => id.replace(/^\d+[-_]/, "").replace(/[_-](kit|fine|dining|street|food|art|deco|and|to)/gi, " $1").replace(/[_-]/g, " ").replace(/\b\w/g, (char) => char.toUpperCase()).replace(/ Kit$/, "");
const imageSlots = (): V2WebTemplateImageSlot[] => [["hero", "Foto principal", "Imagen hero cargada por el local."], ["espacio1", "Ambiente destacado", "Foto del salón o experiencia."], ["espacio2", "Galería 1", "Foto del salón, producto o detalle."], ["espacio3", "Galería 2", "Foto del salón, producto o detalle."], ["espacio4", "Galería 3", "Foto del salón, producto o detalle."], ["espacio5", "Galería 4", "Foto del salón, producto o detalle."], ["menu1", "Plato destacado 1", "Foto del producto cargada por el local."], ["menu2", "Plato destacado 2", "Foto del producto cargada por el local."], ["menu3", "Plato destacado 3", "Foto del producto cargada por el local."], ["menu4", "Plato destacado 4", "Foto del producto cargada por el local."]].map(([id, label, description]) => ({ id, label, description, defaultSrc: "" }));
const textSlots = (name: string): V2WebTemplateTextSlot[] => [{ id: "heroEyebrow", label: "Texto superior del hero", defaultValue: "Cocina de autor" }, { id: "heroTitle", label: "Título principal", defaultValue: `Descubrí ${name}.` }, { id: "heroSubtitle", label: "Subtítulo principal", defaultValue: "Una experiencia gastronómica creada para compartir.", multiline: true }, { id: "primaryButton", label: "Botón principal", defaultValue: "Reservá tu mesa" }, { id: "menuTitle", label: "Título menú", defaultValue: "Nuestra carta" }, { id: "experienceTitle", label: "Título experiencia", defaultValue: "Una mesa para volver" }, { id: "experienceText", label: "Texto experiencia", defaultValue: "Producto, técnica y hospitalidad en cada detalle.", multiline: true }, { id: "contactTitle", label: "Título contacto", defaultValue: "Te esperamos" }];
export const v2WebTemplateCategories = [
  "Sushi", "Pizzería", "Parrilla", "Cervecería y bar", "Cafetería y pastelería",
  "Italiana y pastas", "Pescados y mariscos", "Hamburguesería y comida rápida",
  "Asiática", "Cocina de autor", "Vegetariana y natural", "Cocina internacional",
] as const;
export type V2WebTemplateCategory = typeof v2WebTemplateCategories[number];

const categoryById: Record<typeof catalog[number], V2WebTemplateCategory> = {
  "01-bistro-contemporaneo": "Cocina de autor",
  "02-mediterraneo-costero": "Pescados y mariscos",
  "03-izakaya-japones": "Asiática",
  "04-trattoria-italiana": "Italiana y pastas",
  "05-parrilla-argentina": "Parrilla",
  "06-cafe-vegetal": "Vegetariana y natural",
  "07-menu-degustacion": "Cocina de autor",
  "08-pizzeria-napolitana": "Pizzería",
  "09-sushi-omakase": "Sushi",
  "10-panaderia-brunch": "Cafetería y pastelería",
  "11-brasserie-art-deco": "Cocina internacional",
  "12-taqueria-moderna": "Cocina internacional",
  "13-nordico-estacional": "Cocina de autor",
  "14-cevicheria-peruana": "Pescados y mariscos",
  "15-korean-barbecue": "Parrilla",
  "16-cocina-libanesa": "Cocina internacional",
  "17-diner-retro": "Hamburguesería y comida rápida",
  "18-thai-street-food": "Asiática",
  "19-steakhouse-bodega": "Parrilla",
  "20-mariscos-sustentable": "Pescados y mariscos",
  "21-cocina-india-fine-dining": "Cocina internacional",
  "22-churrascaria-brasilera": "Parrilla",
  "23-burger-laboratorio": "Hamburguesería y comida rápida",
  "24-restaurante-alpino": "Cocina internacional",
  "25-tapas-y-vermouth": "Cervecería y bar",
  "26-pasteleria-y-cafe": "Cafetería y pastelería",
  "27-cerveceria-gastropub": "Cervecería y bar",
  "28-pastas-familiares": "Italiana y pastas",
  "29-fusion-caribena": "Cocina internacional",
  "30-farm-to-table": "Cocina de autor",
  "31_Japanese_Minimal_Noodle_Kit": "Asiática",
  "32_Pop_Art_Dessert_Kit": "Cafetería y pastelería",
  "33_Cyberpunk_Neon_Sushi_Kit": "Sushi",
  "34_Vintage_Cafe_Barrio_Kit": "Cafetería y pastelería",
  "35_Watercolor_Japanese_Tea_Garden_Kit": "Cafetería y pastelería",
  "36_Moody_Fine_Dining_Editorial_Kit": "Cocina de autor",
  "37_Memphis_Arcade_Pizza_Kit": "Pizzería",
  "38_Pixel_Art_Ramen_Game_Kit": "Asiática",
  "39_Monochrome_Brutalist_Fine_Dining_Kit": "Cocina de autor",
  "40_Wabi_Sabi_Ceramic_Zen_Kit": "Asiática",
  "41_Coastal_Seafood_Minimal_Kit": "Pescados y mariscos",
  "42_Tropical_Filipino_Fusion_Kit": "Asiática",
  "43_Urban_Street_Food_Brush_Kit": "Hamburguesería y comida rápida",
  "44_Rustic_Italian_Winehouse_Kit": "Italiana y pastas",
  "45_Coastal_Brutalist_Fine_Dining_Kit": "Cocina de autor",
  "46_Ethiopian_Heritage_Cuisine_Kit": "Cocina internacional",
  "47_Serene_Dim_Sum_Tea_Kit": "Asiática",
  "48_Cajun_Creole_Mardi_Gras_Kit": "Cocina internacional",
  "49_Nordic_Volcanic_Fine_Dining_Kit": "Cocina de autor",
  "50_Marrakech_Rooftop_Moroccan_Kit": "Cocina internacional",
};

export const v2WebTemplates: V2WebTemplate[] = catalog.map((id, index) => { const name = title(id); const color = colors[index]; const category = categoryById[id]; return { id, name, category, description: `Plantilla ${name} de la colección Pixel Perfect.`, recommendedFor: [category], previewImage: `/template-concepts/${id}.png`, accent: `from-[${color}] via-slate-700 to-slate-100`, imageSlots: imageSlots(), textSlots: textSlots(name) }; });
const aliases: Record<string, string> = { "bistro-contemporaneo": "01-bistro-contemporaneo", "mediterraneo-costero": "02-mediterraneo-costero", "izakaya-japones": "03-izakaya-japones", "trattoria-italiana": "04-trattoria-italiana", "parrilla-argentina": "05-parrilla-argentina", "cafe-vegetal": "06-cafe-vegetal", "menu-degustacion": "07-menu-degustacion", "pizzeria-napolitana": "08-pizzeria-napolitana", "pizzeria-mediterranea": "08-pizzeria-napolitana", "sushi-omakase": "09-sushi-omakase", "pop-art-maximalista": "32_Pop_Art_Dessert_Kit", "panaderia-brunch": "10-panaderia-brunch" };
v2WebTemplates.push({
  id: "baum-pinamar",
  name: "Baum Pinamar",
  category: "Cervecería y bar",
  description: "Cervecería con tonos tierra, portada de producto y reservas. Vista previa con identidad Baum; imágenes reemplazables por las del local.",
  recommendedFor: ["Cervecería y bar"],
  previewImage: "/web-templates/baum-pinamar/preview.png",
  previewUrl: "/plantillas/baum-pinamar",
  accent: "from-stone-950 via-stone-800 to-stone-100",
  imageSlots: [{ id: "logo", label: "Logo del local", description: "Imagen independiente con fondo transparente.", defaultSrc: "" }, ...imageSlots()],
  textSlots: textSlots("tu cervecería").map(slot => ({ ...slot, defaultValue: slot.id === "heroEyebrow" ? "Cervecería y bar" : slot.id === "heroTitle" ? "Buenos momentos. Buena cerveza." : slot.id === "heroSubtitle" ? "Un lugar para encontrarnos, brindar y compartir algo rico." : slot.defaultValue })),
});
export function getV2WebTemplateById(templateId: string | null | undefined) { const id = aliases[templateId ?? ""] ?? templateId; return v2WebTemplates.find((template) => template.id === id) ?? v2WebTemplates[0]; }
export function getDefaultV2WebTemplate() { return getV2WebTemplateById(V2_DEFAULT_WEB_TEMPLATE_ID); }
export function createDefaultV2WebTemplateContent(template: V2WebTemplate): V2WebTemplateContent { return { templateId: template.id, textValues: Object.fromEntries(template.textSlots.map((slot) => [slot.id, slot.defaultValue])), imageValues: Object.fromEntries(template.imageSlots.map((slot) => [slot.id, slot.defaultSrc])), visibleSections: { hero: true, menu: true, experience: true, gallery: true, contact: true }, updatedAt: new Date().toISOString() }; }
export function mergeV2WebTemplateContent(template: V2WebTemplate, content: Partial<V2WebTemplateContent> | null | undefined): V2WebTemplateContent { const defaults = createDefaultV2WebTemplateContent(template); return { ...defaults, ...content, templateId: template.id, textValues: { ...defaults.textValues, ...(content?.textValues ?? {}) }, imageValues: { ...defaults.imageValues, ...(content?.imageValues ?? {}) }, visibleSections: { ...defaults.visibleSections, ...(content?.visibleSections ?? {}) } }; }
