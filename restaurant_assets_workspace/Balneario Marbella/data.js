window.MARBELLA_DATA = {
  business: {
    businessName: "Balneario Marbella",
    description: "Playa, buena comida y mejores veranos frente al mar en Pinamar.",
    address: "Av. del Mar 152, Pinamar",
    phone: "+54 2254 48-1393",
    whatsapp: "542254481393",
    instagram: "@marbellapinamar",
    publicUrl: "https://marbellapinamar.com.ar"
  },
  sections: { showMenu: true, showReservations: true, showDelivery: true, showWhatsApp: false, showGallery: true, showMap: true },
  actions: {
    reservationUrl: "",
    deliveryUrl: "",
    mapUrl: "https://www.google.com/maps/search/?api=1&query=Av.%20del%20Mar%20152%2C%20Pinamar"
  },
  hero: {
    eyebrow: "BALNEARIO",
    title: "Marbella",
    subtitle: "BUENA COMIDA\nMEJORES VERANOS",
    primaryButtonLabel: "RESERVAR",
    secondaryButtonLabel: "",
    image: "./media/reference-defaults/hero.png",
    imageAlt: "Restaurante de playa frente al mar",
    imagePosition: "center center",
    rightItems: ["PLAYA", "PARRILLA", "PESCADOS", "FAMILIA", "PINAMAR", "SIEMPRE ES", "UNA BUENA IDEA"]
  },
  featured: [
    { id: "mariscos", title: "SABORES DEL MAR", description: "PESCADOS Y MARISCOS\nFRESCOS", image: "./media/reference-defaults/featured-mariscos.png", imageAlt: "Pescados y mariscos frescos" },
    { id: "parrilla", title: "PARRILLA A LAS BRASAS", description: "CORTES SELECCIONADOS\nY SABOR ARGENTINO", image: "./media/reference-defaults/featured-parrilla.png", imageAlt: "Parrilla a las brasas" },
    { id: "pastas", title: "CLÁSICOS DE LA COSTA", description: "RECETAS QUE SIEMPRE\nVUELVEN", image: "./media/reference-defaults/featured-pastas.png", imageAlt: "Clásicos de la costa" },
    { id: "familia", title: "EN FAMILIA SIEMPRE", description: "BUENA COMIDA,\nMEJORES MOMENTOS", image: "./media/reference-defaults/featured-familia.png", imageAlt: "Comida en familia" }
  ],
  menu: {
    categories: [
      { id: "mariscos", name: "PESCADOS Y MARISCOS", displayName: "PESCADOS\nY MARISCOS", iconAsset: "09_icono_pescado_mariscos", active: true, order: 1 },
      { id: "parrilla", name: "PARRILLA", displayName: "PARRILLA", iconAsset: "10_icono_parrilla", active: true, order: 2 },
      { id: "ensaladas", name: "ENSALADAS FRESCAS", displayName: "ENSALADAS\nFRESCAS", iconAsset: "11_icono_ensalada", active: true, order: 3 },
      { id: "pastas", name: "PASTAS", displayName: "PASTAS", iconAsset: "12_icono_pastas", active: true, order: 4 },
      { id: "vinos", name: "VINOS Y TRAGOS", displayName: "VINOS Y TRAGOS", iconAsset: "13_icono_vino", active: true, order: 5 },
      { id: "playa", name: "FRENTE AL MAR", displayName: "FRENTE AL MAR", iconAsset: "14_icono_frente_mar", active: true, order: 6 },
      { id: "infantil", name: "MENÚ INFANTIL", displayName: "MENÚ INFANTIL", iconAsset: "15_icono_menu_infantil", active: true, order: 7 },
      { id: "balneario", name: "BALNEARIO", displayName: "BALNEARIO", iconAsset: "16_icono_balneario", active: true, order: 8 }
    ],
    products: [
      { id: "m1", categoryId: "mariscos", name: "Paella Marbella", description: "Arroz, mariscos y pesca del día", price: "$29.500", imageUrl: "./media/featured-mariscos.png", visible: true, status: "active", featured: true },
      { id: "m2", categoryId: "mariscos", name: "Pescado del día", description: "Pesca fresca con guarnición", price: "$24.000", imageUrl: "./media/gallery-03.png", visible: true, status: "active" },
      { id: "m3", categoryId: "mariscos", name: "Rabas crocantes", description: "Con limón y alioli casero", price: "$17.800", imageUrl: "./media/gallery-06.png", visible: true, status: "active" },
      { id: "m4", categoryId: "parrilla", name: "Ojo de bife a las brasas", description: "Corte seleccionado con guarnición", price: "$28.500", imageUrl: "./media/featured-parrilla.png", visible: true, status: "active", featured: true },
      { id: "m5", categoryId: "parrilla", name: "Vacío con papas", description: "Parrilla argentina", price: "$24.500", imageUrl: "./media/gallery-05.png", visible: true, status: "active" },
      { id: "m6", categoryId: "ensaladas", name: "Verde Marbella", description: "Hojas, palta y vegetales de estación", price: "$14.500", imageUrl: "./media/gallery-05.png", visible: true, status: "active" },
      { id: "m7", categoryId: "pastas", name: "Linguine ai frutti di mare", description: "Pasta fresca y frutos de mar", price: "$22.000", imageUrl: "./media/featured-pastas.png", visible: true, status: "active", featured: true },
      { id: "m8", categoryId: "vinos", name: "Aperol de playa", description: "Aperol, espumante y soda", price: "$8.400", imageUrl: "./media/gallery-02.png", visible: true, status: "active" },
      { id: "m9", categoryId: "playa", name: "Brunch frente al mar", description: "Selección para compartir", price: "$18.500", imageUrl: "./media/hero.png", visible: true, status: "active" },
      { id: "m10", categoryId: "infantil", name: "Milanesa con papas", description: "Menú para los más chicos", price: "$12.500", imageUrl: "./media/featured-familia.png", visible: true, status: "active" },
      { id: "m11", categoryId: "balneario", name: "Carpa de día", description: "Servicio de balneario", price: "Consultar", imageUrl: "./media/gallery-01.png", visible: true, status: "active" }
    ]
  },
  experience: { image: "./media/experience.png", imageAlt: "Experiencia Marbella frente al mar", note: "Acá\ntambién\nse viven\nlos mejores\ndías" },
  reservations: { title: "RESERVAS", subtitle: "ASEGURÁ TU LUGAR FRENTE AL MAR", fields: ["Fecha", "Cantidad de personas", "Horario"], buttonLabel: "RESERVAR AHORA" },
  delivery: { title: "PEDÍ Y DISFRUTÁ\nDONDE QUIERAS", description: "Nuestros sabores también\nte acompañan.", buttonLabel: "PEDIR AHORA" },
  gallery: [
    { id: "g1", image: "./media/reference-defaults/gallery-01.png", alt: "Sombrillas en la playa", caption: "Días de playa" },
    { id: "g2", image: "./media/reference-defaults/gallery-02.png", alt: "Brindis frente al mar", caption: "Brindis al mar" },
    { id: "g3", image: "./media/reference-defaults/gallery-03.png", alt: "Plato de pescado", caption: "Cocina con alma" },
    { id: "g4", image: "./media/reference-defaults/gallery-04.png", alt: "Familia compartiendo una comida", caption: "Lo importante acá" },
    { id: "g5", image: "./media/reference-defaults/gallery-05.png", alt: "Cartel de Pinamar", caption: "Verano siempre" },
    { id: "g6", image: "./media/reference-defaults/gallery-06.png", alt: "Atardecer en el mar", caption: "Atardeceres únicos" }
  ],
  contact: { locationEyebrow: "NOS ENCONTRÁS EN", hoursTitle: "HORARIOS", hours: ["Todos los días", "de 10:00 a 00:00 hs"], summerNote: "VERANO ES\nMÁS LINDO ACÁ", contactTitle: "CONTACTO" }
};
