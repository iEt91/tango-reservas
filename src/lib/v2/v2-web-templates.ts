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
export const V2_DEFAULT_WEB_TEMPLATE_ID = "pop-art-maximalista";

export const V2_WEB_TEMPLATE_SECTION_LABELS: Record<V2WebTemplateSectionId, string> = {
  hero: "Hero principal",
  menu: "Menú destacado",
  experience: "Experiencia",
  gallery: "Galería / ambiente",
  contact: "Contacto",
};

function restaurantImageSlots(concept: string): V2WebTemplateImageSlot[] {
  const reference = `/template-concepts/${concept}`;
  return [
    { id: "hero", label: "Foto principal", description: "Imagen hero cargada por el local.", defaultSrc: reference },
    { id: "espacio1", label: "Ambiente destacado", description: "Foto del salón o experiencia.", defaultSrc: reference },
    { id: "espacio2", label: "Galería 1", description: "Foto de plato, salón o detalle.", defaultSrc: reference },
    { id: "espacio3", label: "Galería 2", description: "Foto de plato, salón o detalle.", defaultSrc: reference },
    { id: "espacio4", label: "Galería 3", description: "Foto de plato, salón o detalle.", defaultSrc: reference },
    { id: "espacio5", label: "Galería 4", description: "Foto de plato, salón o detalle.", defaultSrc: reference },
    { id: "menu1", label: "Plato destacado 1", description: "Foto opcional si el producto no tiene imagen propia.", defaultSrc: reference },
    { id: "menu2", label: "Plato destacado 2", description: "Foto opcional si el producto no tiene imagen propia.", defaultSrc: reference },
    { id: "menu3", label: "Plato destacado 3", description: "Foto opcional si el producto no tiene imagen propia.", defaultSrc: reference },
    { id: "menu4", label: "Plato destacado 4", description: "Foto opcional si el producto no tiene imagen propia.", defaultSrc: reference },
  ];
}

function restaurantTextSlots(values: {
  eyebrow: string;
  title: string;
  subtitle: string;
  menuTitle: string;
  experienceTitle: string;
  experienceText: string;
  contactTitle: string;
}): V2WebTemplateTextSlot[] {
  return [
    { id: "heroEyebrow", label: "Texto superior del hero", defaultValue: values.eyebrow },
    { id: "heroTitle", label: "Título principal", defaultValue: values.title },
    { id: "heroSubtitle", label: "Subtítulo principal", defaultValue: values.subtitle, multiline: true },
    { id: "primaryButton", label: "Botón principal", defaultValue: "Reservá tu mesa" },
    { id: "menuTitle", label: "Título menú", defaultValue: values.menuTitle },
    { id: "experienceTitle", label: "Título experiencia", defaultValue: values.experienceTitle },
    { id: "experienceText", label: "Texto experiencia", defaultValue: values.experienceText, multiline: true },
    { id: "contactTitle", label: "Título contacto", defaultValue: values.contactTitle },
  ];
}

function pixelPerfectImageSlots(): V2WebTemplateImageSlot[] {
  return [
    { id: "hero", label: "Foto principal", description: "Imagen hero cargada por el local.", defaultSrc: "" },
    { id: "espacio1", label: "Ambiente destacado", description: "Foto del salón o experiencia.", defaultSrc: "" },
    { id: "espacio2", label: "Galería 1", description: "Foto del salón, producto o detalle.", defaultSrc: "" },
    { id: "espacio3", label: "Galería 2", description: "Foto del salón, producto o detalle.", defaultSrc: "" },
    { id: "espacio4", label: "Galería 3", description: "Foto del salón, producto o detalle.", defaultSrc: "" },
    { id: "espacio5", label: "Galería 4", description: "Foto del salón, producto o detalle.", defaultSrc: "" },
    { id: "menu1", label: "Plato destacado 1", description: "Foto del producto cargada por el local.", defaultSrc: "" },
    { id: "menu2", label: "Plato destacado 2", description: "Foto del producto cargada por el local.", defaultSrc: "" },
    { id: "menu3", label: "Plato destacado 3", description: "Foto del producto cargada por el local.", defaultSrc: "" },
    { id: "menu4", label: "Plato destacado 4", description: "Foto del producto cargada por el local.", defaultSrc: "" },
  ];
}

export const v2WebTemplates: V2WebTemplate[] = [
  {
    id: "bistro-contemporaneo",
    name: "Bistró contemporáneo",
    category: "Bistró / restaurante",
    description:
      "Diseño editorial cálido, con una carta protagonista, reservas y fotos propias del local.",
    recommendedFor: ["Bistrós", "Restaurantes de autor", "Wine bars", "Cocina de estación"],
    previewImage: "/template-concepts/01-bistro-contemporaneo.png",
    accent: "from-[#173022] via-[#8a5638] to-[#f4eee1]",
    imageSlots: [
      { id: "hero", label: "Foto principal", description: "Imagen hero cargada por el local.", defaultSrc: "/template-concepts/01-bistro-contemporaneo.png" },
      { id: "espacio1", label: "Ambiente destacado", description: "Foto del salón o experiencia.", defaultSrc: "/template-concepts/01-bistro-contemporaneo.png" },
      { id: "espacio2", label: "Galería 1", description: "Foto de plato, salón o detalle.", defaultSrc: "/template-concepts/01-bistro-contemporaneo.png" },
      { id: "espacio3", label: "Galería 2", description: "Foto de plato, salón o detalle.", defaultSrc: "/template-concepts/01-bistro-contemporaneo.png" },
      { id: "espacio4", label: "Galería 3", description: "Foto de plato, salón o detalle.", defaultSrc: "/template-concepts/01-bistro-contemporaneo.png" },
      { id: "espacio5", label: "Galería 4", description: "Foto de plato, salón o detalle.", defaultSrc: "/template-concepts/01-bistro-contemporaneo.png" },
      { id: "menu1", label: "Plato destacado 1", description: "Foto opcional si el producto no tiene imagen propia.", defaultSrc: "/template-concepts/01-bistro-contemporaneo.png" },
      { id: "menu2", label: "Plato destacado 2", description: "Foto opcional si el producto no tiene imagen propia.", defaultSrc: "/template-concepts/01-bistro-contemporaneo.png" },
      { id: "menu3", label: "Plato destacado 3", description: "Foto opcional si el producto no tiene imagen propia.", defaultSrc: "/template-concepts/01-bistro-contemporaneo.png" },
      { id: "menu4", label: "Plato destacado 4", description: "Foto opcional si el producto no tiene imagen propia.", defaultSrc: "/template-concepts/01-bistro-contemporaneo.png" },
    ],
    textSlots: [
      { id: "heroEyebrow", label: "Texto superior del hero", defaultValue: "Cocina de estación" },
      { id: "heroTitle", label: "Título principal", defaultValue: "Sabores que invitan a quedarse" },
      { id: "heroSubtitle", label: "Subtítulo principal", defaultValue: "Una mesa cálida, productos de temporada y una carta hecha con intención.", multiline: true },
      { id: "primaryButton", label: "Botón principal", defaultValue: "Reservá tu mesa" },
      { id: "menuTitle", label: "Título menú", defaultValue: "Platos de estación" },
      { id: "experienceTitle", label: "Título experiencia", defaultValue: "Un lugar para volver" },
      { id: "experienceText", label: "Texto experiencia", defaultValue: "Vinos elegidos, cocina honesta y atención cercana.", multiline: true },
      { id: "contactTitle", label: "Título contacto", defaultValue: "Te esperamos" },
    ],
  },
  {
    id: "mediterraneo-costero", name: "Mediterráneo costero", category: "Restaurante / costa",
    description: "Sitio luminoso y fresco, con grillas amplias y una carta de inspiración costera.",
    recommendedFor: ["Restaurantes costeros", "Pescados y mariscos", "Bares de playa"],
    previewImage: "/template-concepts/02-mediterraneo-costero.png", accent: "from-[#1456a0] via-[#f5c63a] to-[#fff8e9]",
    imageSlots: restaurantImageSlots("02-mediterraneo-costero.png"),
    textSlots: restaurantTextSlots({ eyebrow: "Sabores junto al mar", title: "La mesa más linda está cerca del agua.", subtitle: "Cocina fresca, tardes largas y una carta pensada para compartir.", menuTitle: "Fresco, simple, inolvidable", experienceTitle: "La costa en cada detalle", experienceText: "Producto local, copa fría y una vista que completa la experiencia.", contactTitle: "Nos vemos junto al mar" }),
  },
  {
    id: "izakaya-japones", name: "Izakaya japonés", category: "Japonesa / nocturna",
    description: "Formato nocturno, íntimo y de alto contraste para barras, izakayas y cocina japonesa.",
    recommendedFor: ["Izakayas", "Ramen bars", "Sushi nocturno"],
    previewImage: "/template-concepts/03-izakaya-japones.png", accent: "from-[#111111] via-[#7d1717] to-[#eadcc0]",
    imageSlots: restaurantImageSlots("03-izakaya-japones.png"),
    textSlots: restaurantTextSlots({ eyebrow: "夜の台所 · Cocina de noche", title: "Una noche, muchas vueltas de sabor.", subtitle: "Platos para el centro de la mesa, sake y una barra encendida hasta tarde.", menuTitle: "Para pedir de a varios", experienceTitle: "Una barra, una historia", experienceText: "Recetas japonesas con espíritu de barrio y servicio cercano.", contactTitle: "La noche empieza acá" }),
  },
  {
    id: "trattoria-italiana", name: "Trattoria italiana", category: "Italiana / familiar",
    description: "Una trattoria cálida con bloques de papel, tonos tomate y una carta muy humana.",
    recommendedFor: ["Pastas", "Pizzerías", "Restaurantes familiares"],
    previewImage: "/template-concepts/04-trattoria-italiana.png", accent: "from-[#f2e7cf] via-[#c85d3b] to-[#536c42]",
    imageSlots: restaurantImageSlots("04-trattoria-italiana.png"),
    textSlots: restaurantTextSlots({ eyebrow: "Fatto in casa", title: "Comer rico se siente como casa.", subtitle: "Pastas, sobremesas y recetas hechas con tiempo, como corresponde.", menuTitle: "La carta de la nonna", experienceTitle: "Hecho para compartir", experienceText: "Platos abundantes, vino servido y una mesa que siempre tiene lugar.", contactTitle: "La mesa está puesta" }),
  },
  {
    id: "parrilla-argentina", name: "Parrilla argentina", category: "Parrilla / carnes",
    description: "Una parrilla de contraste alto, fuego, brasas y una carta clara para pedir sin vueltas.",
    recommendedFor: ["Parrillas", "Asadores", "Bodegones"],
    previewImage: "/template-concepts/05-parrilla-argentina.png", accent: "from-[#171a18] via-[#23452f] to-[#b84d32]",
    imageSlots: restaurantImageSlots("05-parrilla-argentina.png"),
    textSlots: restaurantTextSlots({ eyebrow: "Fuego lento, mesa llena", title: "El fuego reúne todo lo bueno.", subtitle: "Cortes al punto, brasas encendidas y clásicos que no fallan.", menuTitle: "Lo que sale de la parrilla", experienceTitle: "Carne, fuego y tiempo", experienceText: "Una cocina directa, producto noble y una mesa para disfrutar sin apuro.", contactTitle: "Te esperamos al fuego" }),
  },
  {
    id: "cafe-vegetal", name: "Café vegetal", category: "Café / saludable",
    description: "Diseño suave, botánico y claro para cafeterías de especialidad y cocina de día.",
    recommendedFor: ["Cafeterías", "Brunch", "Cocina saludable"],
    previewImage: "/template-concepts/06-cafe-vegetal.png", accent: "from-[#eaf1e2] via-[#a8c29a] to-[#496955]",
    imageSlots: restaurantImageSlots("06-cafe-vegetal.png"),
    textSlots: restaurantTextSlots({ eyebrow: "Café, plantas y calma", title: "Una pausa rica para todos los días.", subtitle: "Café de especialidad, platos frescos y un rincón verde para bajar un cambio.", menuTitle: "Lo que hace bien", experienceTitle: "Respirar, tomar café, quedarse", experienceText: "Ingredientes honestos, opciones de estación y un espacio hecho para vos.", contactTitle: "Pasá cuando quieras" }),
  },
  {
    id: "menu-degustacion", name: "Menú degustación", category: "Fine dining / experiencia",
    description: "Una experiencia de alta cocina con ritmo editorial, detalles dorados y narrativa de pasos.",
    recommendedFor: ["Fine dining", "Chefs de autor", "Experiencias gastronómicas"],
    previewImage: "/template-concepts/07-menu-degustacion.png", accent: "from-[#070d18] via-[#aa8c48] to-[#f4ead4]",
    imageSlots: restaurantImageSlots("07-menu-degustacion.png"),
    textSlots: restaurantTextSlots({ eyebrow: "Una experiencia por pasos", title: "Cada plato tiene su momento.", subtitle: "Una cena guiada por producto, técnica y una historia que se descubre en la mesa.", menuTitle: "El recorrido de esta noche", experienceTitle: "Un menú que se vive", experienceText: "Cupos limitados, maridajes sugeridos y una secuencia diseñada para sorprender.", contactTitle: "Reservá tu experiencia" }),
  },
  {
    id: "pizzeria-napolitana", name: "Pizzería napolitana", category: "Pizzería / informal",
    description: "Una pizzería vibrante, de papel y trazo manual, preparada para delivery y mesas llenas.",
    recommendedFor: ["Pizzerías", "Pizza al corte", "Restaurantes informales"],
    previewImage: "/template-concepts/08-pizzeria-napolitana.png", accent: "from-[#f7efdb] via-[#d74a36] to-[#1c4d87]",
    imageSlots: restaurantImageSlots("08-pizzeria-napolitana.png"),
    textSlots: restaurantTextSlots({ eyebrow: "Impasto · forno · amore", title: "La pizza se come con las manos.", subtitle: "Masa de fermentación lenta, horno caliente y combinaciones que salen volando.", menuTitle: "Del horno a la mesa", experienceTitle: "Una porción de felicidad", experienceText: "Pizzas para compartir, birra fría y delivery directo a tu puerta.", contactTitle: "Caé por una pizza" }),
  },
  {
    id: "pizzeria-mediterranea", name: "Pizzería mediterránea", category: "Pizzería / mediterránea",
    description: "Diseño artesanal en azul, rojo y crema, con horno, olivas, tomate y módulos ilustrados.",
    recommendedFor: ["Pizzerías", "Restaurantes mediterráneos", "Delivery", "Locales costeros"],
    previewImage: "/web-templates/pizzeria-mediterranea/assets/00_fondo_y_guia/pagina_base_mediterranea_completa.png", accent: "from-[#103e75] via-[#f6eddc] to-[#d93827]",
    imageSlots: restaurantImageSlots("placeholder").map((slot) => ({
      ...slot,
      defaultSrc: "/web-templates/pizzeria-mediterranea/assets/00_fondo_y_guia/pagina_base_mediterranea_completa.png",
    })),
    textSlots: restaurantTextSlots({ eyebrow: "Pizza · sol · mesa larga", title: "Pizza, sol y mesa larga.", subtitle: "Masa lenta, tomate, aceite de oliva y una mesa hecha para compartir.", menuTitle: "Recién salido del horno", experienceTitle: "El Mediterráneo en cada porción", experienceText: "Una pizzería luminosa, con producto noble y la calma de una sobremesa larga.", contactTitle: "Una mesa cerca del mar" }),
  },
  {
    id: "sushi-omakase", name: "Sushi omakase", category: "Japonesa / premium",
    description: "Composición silenciosa y precisa para omakase, sushi premium y experiencias de barra.",
    recommendedFor: ["Omakase", "Sushi premium", "Barras japonesas"],
    previewImage: "/template-concepts/09-sushi-omakase.png", accent: "from-[#f6f0e4] via-[#142031] to-[#c5483b]",
    imageSlots: restaurantImageSlots("09-sushi-omakase.png"),
    textSlots: restaurantTextSlots({ eyebrow: "Omakase · おまかせ", title: "Confiá en el recorrido.", subtitle: "Piezas de temporada, técnica precisa y una experiencia serena frente a la barra.", menuTitle: "El corte del día", experienceTitle: "Menos ruido, más detalle", experienceText: "Una propuesta íntima, guiada por el itamae y el mejor producto disponible.", contactTitle: "Tu lugar en la barra" }),
  },
  {
    id: "10-panaderia-brunch", name: "Panadería & brunch", category: "Brunch / panadería",
    description: "Diseño pastel cálido de la colección Pixel Perfect, para panadería, brunch y cafetería.",
    recommendedFor: ["Panaderías", "Brunch", "Cafeterías de día"],
    previewImage: "/template-concepts/10-panaderia-brunch.png", accent: "from-[#fcfcfc] via-[#fce4cc] to-[#b48454]",
    imageSlots: pixelPerfectImageSlots(),
    textSlots: restaurantTextSlots({ eyebrow: "Pan recién hecho, día mejor", title: "Brunch que se queda en la memoria.", subtitle: "Panadería de masa madre, café rico y platos para empezar sin apuro.", menuTitle: "Recién salido del horno", experienceTitle: "Una mañana con sabor", experienceText: "Todo hecho fresco, con opciones dulces, saladas y mucho café.", contactTitle: "Te esperamos temprano" }),
  },
  {
    id: "11-brasserie-art-deco", name: "Brasserie art déco", category: "Brasserie / nocturna",
    description: "Colección Pixel Perfect: geometría art déco y una atmósfera de brasserie nocturna.",
    recommendedFor: ["Brasseries", "Wine bars", "Restaurantes nocturnos"], previewImage: "/template-concepts/11-brasserie-art-deco.png", accent: "from-[#0c0c24] via-[#fce4e4] to-[#c49c54]",
    imageSlots: pixelPerfectImageSlots(), textSlots: restaurantTextSlots({ eyebrow: "Brasserie de noche", title: "Una mesa con historia.", subtitle: "Cocina, copa y conversación hasta tarde.", menuTitle: "La carta", experienceTitle: "Una noche bien servida", experienceText: "Detalles, producto y una sala para quedarse.", contactTitle: "Te esperamos" }),
  },
  {
    id: "12-taqueria-moderna", name: "Taquería moderna", category: "Mexicana / informal",
    description: "Colección Pixel Perfect: alto contraste, color y ritmo para una taquería contemporánea.",
    recommendedFor: ["Taquerías", "Comida mexicana", "Locales informales"], previewImage: "/template-concepts/12-taqueria-moderna.png", accent: "from-[#fce4e4] via-[#0c2484] to-[#cc0c24]",
    imageSlots: pixelPerfectImageSlots(), textSlots: restaurantTextSlots({ eyebrow: "Tacos y buena vibra", title: "Todo sabe mejor con salsa.", subtitle: "Recetas honestas, mesa llena y sabor directo.", menuTitle: "Para compartir", experienceTitle: "Picante, fresco, nuestro", experienceText: "Una carta para probar de todo.", contactTitle: "Caé cuando quieras" }),
  },
  {
    id: "13-nordico-estacional", name: "Nórdico estacional", category: "Nórdica / autor",
    description: "Colección Pixel Perfect: composición serena, producto de estación y minimalismo nórdico.",
    recommendedFor: ["Cocina de autor", "Bistrós", "Cocina estacional"], previewImage: "/template-concepts/13-nordico-estacional.png", accent: "from-[#fce4e4] via-[#0c243c] to-[#0c5484]",
    imageSlots: pixelPerfectImageSlots(), textSlots: restaurantTextSlots({ eyebrow: "Producto de estación", title: "Simple, preciso, memorable.", subtitle: "Una carta que cambia con cada temporada.", menuTitle: "Ahora en la carta", experienceTitle: "El origen importa", experienceText: "Ingredientes nobles y técnica en equilibrio.", contactTitle: "Reservá tu mesa" }),
  },
  {
    id: "14-cevicheria-peruana", name: "Cevichería peruana", category: "Peruana / mar",
    description: "Colección Pixel Perfect: energía marina y una carta peruana cargada de color.",
    recommendedFor: ["Cevicherías", "Cocina peruana", "Pescados y mariscos"], previewImage: "/template-concepts/14-cevicheria-peruana.png", accent: "from-[#fcfcfc] via-[#e4e4e4] to-[#d85030]",
    imageSlots: pixelPerfectImageSlots(), textSlots: restaurantTextSlots({ eyebrow: "Mar, ají y limón", title: "Fresco desde el primer bocado.", subtitle: "Ceviches, tiraditos y cocina peruana de todos los días.", menuTitle: "Del mar a la mesa", experienceTitle: "Sabor que despierta", experienceText: "Acidez, picante y producto fresco.", contactTitle: "Nos encontramos acá" }),
  },
  {
    id: "15-korean-barbecue", name: "Korean barbecue", category: "Coreana / grill",
    description: "Colección Pixel Perfect: parrilla coreana, contraste intenso y una experiencia de mesa activa.",
    recommendedFor: ["Korean barbecue", "Cocina coreana", "Parrillas"], previewImage: "/template-concepts/15-korean-barbecue.png", accent: "from-[#0c0c0c] via-[#242424] to-[#c43c3c]",
    imageSlots: pixelPerfectImageSlots(), textSlots: restaurantTextSlots({ eyebrow: "Grill en la mesa", title: "Todo se cocina mejor juntos.", subtitle: "Parrilla, banchan y una experiencia para compartir.", menuTitle: "Elegí tu grill", experienceTitle: "El fuego en el centro", experienceText: "Carne, vegetales y sabores coreanos en tu mesa.", contactTitle: "Reservá tu grill" }),
  },
  {
    id: "16-cocina-libanesa", name: "Cocina libanesa", category: "Libanesa / familiar",
    description: "Colección Pixel Perfect: color, calidez y composición artesanal inspirada en el Levante.",
    recommendedFor: ["Cocina libanesa", "Restaurantes familiares", "Cocina mediterránea"], previewImage: "/template-concepts/16-cocina-libanesa.png", accent: "from-[#240c24] via-[#fce4cc] to-[#b87c44]",
    imageSlots: pixelPerfectImageSlots(), textSlots: restaurantTextSlots({ eyebrow: "Mesa del Levante", title: "Compartir es parte de la receta.", subtitle: "Platos abundantes, especias y una mesa siempre abierta.", menuTitle: "Para el centro", experienceTitle: "Cocina con memoria", experienceText: "Recetas familiares hechas para reunirse.", contactTitle: "La mesa te espera" }),
  },
  {
    id: "17-diner-retro", name: "Diner retro", category: "Diner / casual",
    description: "Colección Pixel Perfect: identidad retro, contrastes gráficos y servicio rápido.",
    recommendedFor: ["Diners", "Hamburgueserías", "Cafeterías casuales"], previewImage: "/template-concepts/17-diner-retro.png", accent: "from-[#fcfce4] via-[#0c3c3c] to-[#e45c3c]",
    imageSlots: pixelPerfectImageSlots(), textSlots: restaurantTextSlots({ eyebrow: "Todo el día", title: "Clásicos que nunca pasan.", subtitle: "Desayunos, burgers y shakes para volver una y otra vez.", menuTitle: "Favoritos de la casa", experienceTitle: "Una parada obligada", experienceText: "Comida rica, rápida y hecha con onda.", contactTitle: "Te guardamos una mesa" }),
  },
  {
    id: "18-thai-street-food", name: "Thai street food", category: "Tailandesa / street food",
    description: "Colección Pixel Perfect: neón, contraste y energía de mercado nocturno tailandés.",
    recommendedFor: ["Cocina tailandesa", "Street food", "Locales nocturnos"], previewImage: "/template-concepts/18-thai-street-food.png", accent: "from-[#0c0c0c] via-[#3c240c] to-[#e75e1d]",
    imageSlots: pixelPerfectImageSlots(), textSlots: restaurantTextSlots({ eyebrow: "Bangkok en la mesa", title: "Picante, ácido, increíble.", subtitle: "Street food tailandés para comer sin mirar el reloj.", menuTitle: "El mercado hoy", experienceTitle: "Sabor a toda velocidad", experienceText: "Wok, curry y mucho carácter.", contactTitle: "Nos vemos esta noche" }),
  },
  {
    id: "19-steakhouse-bodega", name: "Steakhouse & bodega", category: "Steakhouse / vinos",
    description: "Colección Pixel Perfect: carnes, bodega y una estética intensa de noche.",
    recommendedFor: ["Steakhouses", "Bodegas", "Parrillas premium"], previewImage: "/template-concepts/19-steakhouse-bodega.png", accent: "from-[#0c0c0c] via-[#840c0c] to-[#3c2414]",
    imageSlots: pixelPerfectImageSlots(), textSlots: restaurantTextSlots({ eyebrow: "Cortes y grandes vinos", title: "Una copa merece un gran corte.", subtitle: "Parrilla, bodega y sobremesas que se estiran.", menuTitle: "La selección", experienceTitle: "Fuego y guarda", experienceText: "Producto, brasa y una cava para descubrir.", contactTitle: "Reservá tu mesa" }),
  },
  {
    id: "20-mariscos-sustentable", name: "Mariscos sustentable", category: "Mar / sustentable",
    description: "Colección Pixel Perfect: identidad marina clara y una propuesta de pesca responsable.",
    recommendedFor: ["Marisquerías", "Pesca sustentable", "Restaurantes costeros"], previewImage: "/template-concepts/20-mariscos-sustentable.png", accent: "from-[#fcfcfc] via-[#e4e4e4] to-[#247c94]",
    imageSlots: pixelPerfectImageSlots(), textSlots: restaurantTextSlots({ eyebrow: "Pesca responsable", title: "Del mar, con respeto.", subtitle: "Mariscos frescos, proveedores cercanos y cocina consciente.", menuTitle: "La captura del día", experienceTitle: "Cuidar también es elegir", experienceText: "Producto trazable y sabor de costa.", contactTitle: "Te esperamos junto al mar" }),
  },
  {
    id: "pop-art-maximalista",
    name: "Pop art maximalista",
    category: "Heladería / cafetería",
    description:
      "Composición pop-art completa con hero editorial, menú visual, galería, reservas y pedidos online.",
    recommendedFor: ["Heladerías", "Cafeterías", "Pastelerías", "Restaurantes informales"],
    previewImage: "/template-concepts/32-pop-art-maximalista.png",
    accent: "from-pink-500 via-fuchsia-500 to-cyan-400",
    imageSlots: [
      { id: "hero", label: "Hero principal", description: "Composición principal de la portada.", defaultSrc: "/web-templates/pop-art-maximalista/01_hero/milkshake_rosa_hero.png" },
      { id: "espacio1", label: "Ambiente 1", description: "Foto de experiencia o salón.", defaultSrc: "/web-templates/pop-art-maximalista/05_galeria/galeria_cafeteria_retro_01.png" },
      { id: "espacio2", label: "Ambiente 2", description: "Foto de espacio o fachada.", defaultSrc: "/web-templates/pop-art-maximalista/05_galeria/galeria_cafeteria_neon_03.png" },
      { id: "espacio3", label: "Ambiente 3", description: "Foto de producto o mesa.", defaultSrc: "/web-templates/pop-art-maximalista/05_galeria/galeria_milkshakes_02.png" },
      { id: "espacio5", label: "Ambiente 4", description: "Foto adicional de experiencia.", defaultSrc: "/web-templates/pop-art-maximalista/05_galeria/galeria_sundae_chocolate_04.png" },
      { id: "espacio6", label: "Ambiente 5", description: "Foto adicional de producto.", defaultSrc: "/web-templates/pop-art-maximalista/05_galeria/galeria_postres_coloridos_05.png" },
      { id: "menu1", label: "Plato destacado 1", description: "Imagen del primer producto.", defaultSrc: "/web-templates/pop-art-maximalista/02_postres/cono_helado_chocolate.png" },
      { id: "menu2", label: "Plato destacado 2", description: "Imagen del segundo producto.", defaultSrc: "/web-templates/pop-art-maximalista/02_postres/torta_arcoiris.png" },
      { id: "menu3", label: "Plato destacado 3", description: "Imagen del tercer producto.", defaultSrc: "/web-templates/pop-art-maximalista/02_postres/pancakes_frutos_rojos.png" },
      { id: "menu4", label: "Plato destacado 4", description: "Imagen del cuarto producto.", defaultSrc: "/web-templates/pop-art-maximalista/02_postres/copa_helado_gafas_rosas.png" },
    ],
    textSlots: [
      { id: "heroEyebrow", label: "Texto superior del hero", defaultValue: "Dulce, raro y delicioso" },
      { id: "heroTitle", label: "Título principal", defaultValue: "Antojos con actitud" },
      { id: "heroSubtitle", label: "Subtítulo principal", defaultValue: "Postres, café y momentos para venir a pasarla bien.", multiline: true },
      { id: "primaryButton", label: "Botón principal", defaultValue: "Reservar ahora" },
      { id: "menuTitle", label: "Título menú", defaultValue: "Postres con actitud" },
      { id: "experienceTitle", label: "Título experiencia", defaultValue: "El lugar para antojarte" },
      { id: "experienceText", label: "Texto experiencia", defaultValue: "Una experiencia visual, colorida y deliciosa.", multiline: true },
      { id: "contactTitle", label: "Título contacto", defaultValue: "Nos vemos ahí" },
    ],
  },
];

export function getV2WebTemplateById(templateId: string | null | undefined) {
  const resolvedTemplateId = templateId === "panaderia-brunch" ? "10-panaderia-brunch" : templateId;
  return (
    v2WebTemplates.find((template) => template.id === resolvedTemplateId) ??
    v2WebTemplates.find((template) => template.id === V2_DEFAULT_WEB_TEMPLATE_ID) ??
    v2WebTemplates[0]
  );
}

export function getDefaultV2WebTemplate() {
  return getV2WebTemplateById(V2_DEFAULT_WEB_TEMPLATE_ID);
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
