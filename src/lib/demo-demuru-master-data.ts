export const DEMURU_DEMO_MASTER_VERSION =
  "e35a-demuru-master-v1";

export type DemuruDemoStockUnit =
  | "kg"
  | "g"
  | "l"
  | "ml"
  | "unidad"
  | "botella"
  | "caja"
  | "paquete"
  | "bolsa"
  | "lata";

export type DemuruDemoMenuCategory = {
  id: string;
  name: string;
  description: string;
  order: number;
  visible: boolean;
  active: boolean;
};

export type DemuruDemoMenuItem = {
  id: string;
  imageUrl: string;
  name: string;
  categoryId: string;
  description: string;
  price: number;
  status: "available" | "paused";
  visible: boolean;
  featured: boolean;
};

export type DemuruDemoStockProduct = {
  id: string;
  supplier: string;
  unitCost: number;
  name: string;
  category: string;
  unit: DemuruDemoStockUnit;
  totalStock: number;
  consumedBySales: number;
  alertBelow: number;
  lastUpdated: string;
  note: string;
};

export type DemuruDemoRecipeIngredient = {
  id: string;
  stockProductId: string;
  name: string;
  quantity: number;
  unit: DemuruDemoStockUnit;
};

export type DemuruDemoRecipe = {
  id: string;
  menuItemId: string;
  name: string;
  preparationTimeSeconds: number;
  persisted: boolean;
  ingredients: DemuruDemoRecipeIngredient[];
};

type DemuruDemoRecipeIngredientSeed =
  Omit<
    DemuruDemoRecipeIngredient,
    "name"
  >;

type DemuruDemoRecipeSeed =
  Omit<
    DemuruDemoRecipe,
    "ingredients"
  >
  & {
    ingredients:
      DemuruDemoRecipeIngredientSeed[];
  };

export const demuruDemoMenuCategories: DemuruDemoMenuCategory[] =
[
  {
    "id": "demuru-cat-entradas",
    "name": "Entradas",
    "description": "Comienzos que despiertan.",
    "order": 1,
    "visible": true,
    "active": true
  },
  {
    "id": "demuru-cat-principales",
    "name": "Principales",
    "description": "Platos intensos y sabrosos.",
    "order": 2,
    "visible": true,
    "active": true
  },
  {
    "id": "demuru-cat-pastas",
    "name": "Pastas",
    "description": "Hechas en casa, como siempre.",
    "order": 3,
    "visible": true,
    "active": true
  },
  {
    "id": "demuru-cat-postres",
    "name": "Postres",
    "description": "El final perfecto para tu comida.",
    "order": 4,
    "visible": true,
    "active": true
  },
  {
    "id": "demuru-cat-bebidas",
    "name": "Bebidas",
    "description": "Vinos, tragos y sin alcohol.",
    "order": 5,
    "visible": true,
    "active": true
  }
];

export const demuruDemoMenuItems: DemuruDemoMenuItem[] =
[
  {
    "id": "demuru-menu-burrata",
    "imageUrl": "",
    "name": "Burrata de estación",
    "categoryId": "demuru-cat-entradas",
    "description": "Comienzos que despiertan.",
    "price": 12500,
    "status": "available",
    "visible": true,
    "featured": true
  },
  {
    "id": "demuru-menu-remolacha",
    "imageUrl": "",
    "name": "Remolacha asada",
    "categoryId": "demuru-cat-entradas",
    "description": "Comienzos que despiertan.",
    "price": 14800,
    "status": "available",
    "visible": true,
    "featured": true
  },
  {
    "id": "demuru-menu-croquetas",
    "imageUrl": "",
    "name": "Croquetas de hongos",
    "categoryId": "demuru-cat-entradas",
    "description": "Comienzos que despiertan.",
    "price": 18900,
    "status": "available",
    "visible": true,
    "featured": true
  },
  {
    "id": "demuru-menu-toston",
    "imageUrl": "",
    "name": "Tostón ahumado",
    "categoryId": "demuru-cat-entradas",
    "description": "Comienzos que despiertan.",
    "price": 9800,
    "status": "available",
    "visible": true,
    "featured": true
  },
  {
    "id": "demuru-menu-ojo-bife",
    "imageUrl": "",
    "name": "Ojo de bife",
    "categoryId": "demuru-cat-principales",
    "description": "Platos intensos y sabrosos.",
    "price": 13400,
    "status": "available",
    "visible": true,
    "featured": false
  },
  {
    "id": "demuru-menu-pulpo",
    "imageUrl": "",
    "name": "Pulpo grillado",
    "categoryId": "demuru-cat-principales",
    "description": "Platos intensos y sabrosos.",
    "price": 15700,
    "status": "available",
    "visible": true,
    "featured": false
  },
  {
    "id": "demuru-menu-pesca",
    "imageUrl": "",
    "name": "Pesca del día",
    "categoryId": "demuru-cat-principales",
    "description": "Platos intensos y sabrosos.",
    "price": 19800,
    "status": "available",
    "visible": true,
    "featured": false
  },
  {
    "id": "demuru-menu-pollo",
    "imageUrl": "",
    "name": "Pollo braseado",
    "categoryId": "demuru-cat-principales",
    "description": "Platos intensos y sabrosos.",
    "price": 10700,
    "status": "available",
    "visible": true,
    "featured": false
  },
  {
    "id": "demuru-menu-ravioles",
    "imageUrl": "",
    "name": "Ravioles de osobuco",
    "categoryId": "demuru-cat-pastas",
    "description": "Hechas en casa, como siempre.",
    "price": 14300,
    "status": "available",
    "visible": true,
    "featured": false
  },
  {
    "id": "demuru-menu-sorrentinos",
    "imageUrl": "",
    "name": "Sorrentinos de calabaza",
    "categoryId": "demuru-cat-pastas",
    "description": "Hechas en casa, como siempre.",
    "price": 16600,
    "status": "available",
    "visible": true,
    "featured": false
  },
  {
    "id": "demuru-menu-pappardelle",
    "imageUrl": "",
    "name": "Pappardelle",
    "categoryId": "demuru-cat-pastas",
    "description": "Hechas en casa, como siempre.",
    "price": 20700,
    "status": "available",
    "visible": true,
    "featured": false
  },
  {
    "id": "demuru-menu-noquis",
    "imageUrl": "",
    "name": "Ñoquis de papa",
    "categoryId": "demuru-cat-pastas",
    "description": "Hechas en casa, como siempre.",
    "price": 11600,
    "status": "available",
    "visible": true,
    "featured": false
  },
  {
    "id": "demuru-menu-creme-brulee",
    "imageUrl": "",
    "name": "Creme brulee (para 2)",
    "categoryId": "demuru-cat-postres",
    "description": "El final perfecto para tu comida.",
    "price": 16000,
    "status": "available",
    "visible": true,
    "featured": false
  },
  {
    "id": "demuru-menu-flan-mixto",
    "imageUrl": "",
    "name": "Flan mixto",
    "categoryId": "demuru-cat-postres",
    "description": "El final perfecto para tu comida.",
    "price": 10000,
    "status": "available",
    "visible": true,
    "featured": false
  },
  {
    "id": "demuru-menu-panqueque",
    "imageUrl": "",
    "name": "Panqueque caramelizado",
    "categoryId": "demuru-cat-postres",
    "description": "El final perfecto para tu comida.",
    "price": 10000,
    "status": "available",
    "visible": true,
    "featured": false
  },
  {
    "id": "demuru-menu-marquise",
    "imageUrl": "",
    "name": "Marquise chocolate",
    "categoryId": "demuru-cat-postres",
    "description": "El final perfecto para tu comida.",
    "price": 16000,
    "status": "available",
    "visible": true,
    "featured": false
  },
  {
    "id": "demuru-menu-vino-casa",
    "imageUrl": "",
    "name": "Vino de la casa",
    "categoryId": "demuru-cat-bebidas",
    "description": "Vinos, tragos y sin alcohol.",
    "price": 16100,
    "status": "available",
    "visible": true,
    "featured": false
  },
  {
    "id": "demuru-menu-aperitivo",
    "imageUrl": "",
    "name": "Aperitivo cítrico",
    "categoryId": "demuru-cat-bebidas",
    "description": "Vinos, tragos y sin alcohol.",
    "price": 18400,
    "status": "available",
    "visible": true,
    "featured": false
  },
  {
    "id": "demuru-menu-copa-especial",
    "imageUrl": "",
    "name": "Copa especial",
    "categoryId": "demuru-cat-bebidas",
    "description": "Vinos, tragos y sin alcohol.",
    "price": 22500,
    "status": "available",
    "visible": true,
    "featured": false
  },
  {
    "id": "demuru-menu-agua-saborizada",
    "imageUrl": "",
    "name": "Agua saborizada",
    "categoryId": "demuru-cat-bebidas",
    "description": "Vinos, tragos y sin alcohol.",
    "price": 13400,
    "status": "available",
    "visible": true,
    "featured": false
  }
];

export const demuruDemoStockProducts: DemuruDemoStockProduct[] =
[
  {
    "id": "stock-burrata",
    "supplier": "Lácteos del Sur",
    "unitCost": 2200,
    "name": "Burrata 125 g",
    "category": "Lácteos",
    "unit": "unidad",
    "totalStock": 36,
    "consumedBySales": 0,
    "alertBelow": 8,
    "lastUpdated": "Hoy",
    "note": "Mantener refrigerada entre 2 y 5 °C."
  },
  {
    "id": "stock-queso-cabra",
    "supplier": "Lácteos del Sur",
    "unitCost": 8500,
    "name": "Queso de cabra cremoso",
    "category": "Lácteos",
    "unit": "kg",
    "totalStock": 3.5,
    "consumedBySales": 0,
    "alertBelow": 0.8,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-manteca",
    "supplier": "Lácteos del Sur",
    "unitCost": 7000,
    "name": "Manteca",
    "category": "Lácteos",
    "unit": "kg",
    "totalStock": 6,
    "consumedBySales": 0,
    "alertBelow": 1.5,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-leche",
    "supplier": "Lácteos del Sur",
    "unitCost": 1400,
    "name": "Leche entera",
    "category": "Lácteos",
    "unit": "l",
    "totalStock": 18,
    "consumedBySales": 0,
    "alertBelow": 4,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-parmesano",
    "supplier": "Lácteos del Sur",
    "unitCost": 13000,
    "name": "Queso parmesano",
    "category": "Lácteos",
    "unit": "kg",
    "totalStock": 6,
    "consumedBySales": 0,
    "alertBelow": 1.2,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-provolone",
    "supplier": "Lácteos del Sur",
    "unitCost": 10000,
    "name": "Queso provolone",
    "category": "Lácteos",
    "unit": "kg",
    "totalStock": 4,
    "consumedBySales": 0,
    "alertBelow": 0.8,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-crema",
    "supplier": "Lácteos del Sur",
    "unitCost": 5000,
    "name": "Crema de leche",
    "category": "Lácteos",
    "unit": "l",
    "totalStock": 15,
    "consumedBySales": 0,
    "alertBelow": 3,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-ricotta",
    "supplier": "Lácteos del Sur",
    "unitCost": 5500,
    "name": "Ricotta",
    "category": "Lácteos",
    "unit": "kg",
    "totalStock": 4,
    "consumedBySales": 0,
    "alertBelow": 1,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-stracciatella",
    "supplier": "Lácteos del Sur",
    "unitCost": 9000,
    "name": "Stracciatella",
    "category": "Lácteos",
    "unit": "kg",
    "totalStock": 3,
    "consumedBySales": 0,
    "alertBelow": 0.7,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-ojo-bife",
    "supplier": "Carnes del Tuyú",
    "unitCost": 12000,
    "name": "Ojo de bife",
    "category": "Carnicería",
    "unit": "kg",
    "totalStock": 12,
    "consumedBySales": 0,
    "alertBelow": 3,
    "lastUpdated": "Hoy",
    "note": "Porcionar a 350 g."
  },
  {
    "id": "stock-pollo",
    "supplier": "Carnes del Tuyú",
    "unitCost": 6000,
    "name": "Pollo deshuesado",
    "category": "Carnicería",
    "unit": "kg",
    "totalStock": 12,
    "consumedBySales": 0,
    "alertBelow": 3,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-osobuco",
    "supplier": "Carnes del Tuyú",
    "unitCost": 8000,
    "name": "Osobuco",
    "category": "Carnicería",
    "unit": "kg",
    "totalStock": 8,
    "consumedBySales": 0,
    "alertBelow": 2,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-pulpo",
    "supplier": "Pescados Atlántico",
    "unitCost": 16000,
    "name": "Pulpo limpio",
    "category": "Pescadería",
    "unit": "kg",
    "totalStock": 7,
    "consumedBySales": 0,
    "alertBelow": 1.5,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-pescado-blanco",
    "supplier": "Pescados Atlántico",
    "unitCost": 9000,
    "name": "Pescado blanco fresco",
    "category": "Pescadería",
    "unit": "kg",
    "totalStock": 10,
    "consumedBySales": 0,
    "alertBelow": 2.5,
    "lastUpdated": "Hoy",
    "note": "Rotación diaria; usar para Pesca del día."
  },
  {
    "id": "stock-tomate",
    "supplier": "Huerta Pinamar",
    "unitCost": 1800,
    "name": "Tomate de estación",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 12,
    "consumedBySales": 0,
    "alertBelow": 3,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-albahaca",
    "supplier": "Huerta Pinamar",
    "unitCost": 12000,
    "name": "Albahaca fresca",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 1,
    "consumedBySales": 0,
    "alertBelow": 0.2,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-remolacha",
    "supplier": "Huerta Pinamar",
    "unitCost": 900,
    "name": "Remolacha",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 12,
    "consumedBySales": 0,
    "alertBelow": 3,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-naranja",
    "supplier": "Huerta Pinamar",
    "unitCost": 1200,
    "name": "Naranja",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 10,
    "consumedBySales": 0,
    "alertBelow": 2,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-rucula",
    "supplier": "Huerta Pinamar",
    "unitCost": 6500,
    "name": "Rúcula",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 1.5,
    "consumedBySales": 0,
    "alertBelow": 0.3,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-hongos",
    "supplier": "Huerta Pinamar",
    "unitCost": 7500,
    "name": "Hongos frescos",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 9,
    "consumedBySales": 0,
    "alertBelow": 2,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-cebolla",
    "supplier": "Huerta Pinamar",
    "unitCost": 900,
    "name": "Cebolla",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 14,
    "consumedBySales": 0,
    "alertBelow": 3,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-limon",
    "supplier": "Huerta Pinamar",
    "unitCost": 1800,
    "name": "Limón",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 12,
    "consumedBySales": 0,
    "alertBelow": 3,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-perejil",
    "supplier": "Huerta Pinamar",
    "unitCost": 6000,
    "name": "Perejil fresco",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 1,
    "consumedBySales": 0,
    "alertBelow": 0.2,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-berenjena",
    "supplier": "Huerta Pinamar",
    "unitCost": 1500,
    "name": "Berenjena",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 8,
    "consumedBySales": 0,
    "alertBelow": 2,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-tomate-cherry",
    "supplier": "Huerta Pinamar",
    "unitCost": 3500,
    "name": "Tomate cherry",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 5,
    "consumedBySales": 0,
    "alertBelow": 1,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-cebolla-morada",
    "supplier": "Huerta Pinamar",
    "unitCost": 1400,
    "name": "Cebolla morada",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 5,
    "consumedBySales": 0,
    "alertBelow": 1,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-papa",
    "supplier": "Huerta Pinamar",
    "unitCost": 900,
    "name": "Papa",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 30,
    "consumedBySales": 0,
    "alertBelow": 7,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-ajo",
    "supplier": "Huerta Pinamar",
    "unitCost": 3500,
    "name": "Ajo",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 3,
    "consumedBySales": 0,
    "alertBelow": 0.6,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-romero",
    "supplier": "Huerta Pinamar",
    "unitCost": 10000,
    "name": "Romero fresco",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 0.7,
    "consumedBySales": 0,
    "alertBelow": 0.15,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-zucchini",
    "supplier": "Huerta Pinamar",
    "unitCost": 1800,
    "name": "Zucchini",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 7,
    "consumedBySales": 0,
    "alertBelow": 1.5,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-zanahoria",
    "supplier": "Huerta Pinamar",
    "unitCost": 1000,
    "name": "Zanahoria",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 10,
    "consumedBySales": 0,
    "alertBelow": 2,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-hinojo",
    "supplier": "Huerta Pinamar",
    "unitCost": 3000,
    "name": "Hinojo",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 4,
    "consumedBySales": 0,
    "alertBelow": 0.8,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-apio",
    "supplier": "Huerta Pinamar",
    "unitCost": 1200,
    "name": "Apio",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 5,
    "consumedBySales": 0,
    "alertBelow": 1,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-tomillo",
    "supplier": "Huerta Pinamar",
    "unitCost": 12000,
    "name": "Tomillo fresco",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 0.7,
    "consumedBySales": 0,
    "alertBelow": 0.15,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-calabaza",
    "supplier": "Huerta Pinamar",
    "unitCost": 1200,
    "name": "Calabaza",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 12,
    "consumedBySales": 0,
    "alertBelow": 3,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-salvia",
    "supplier": "Huerta Pinamar",
    "unitCost": 14000,
    "name": "Salvia fresca",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 0.6,
    "consumedBySales": 0,
    "alertBelow": 0.12,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-pomelo",
    "supplier": "Huerta Pinamar",
    "unitCost": 1800,
    "name": "Pomelo rosado",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 8,
    "consumedBySales": 0,
    "alertBelow": 2,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-pepino",
    "supplier": "Huerta Pinamar",
    "unitCost": 1500,
    "name": "Pepino",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 6,
    "consumedBySales": 0,
    "alertBelow": 1.5,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-menta",
    "supplier": "Huerta Pinamar",
    "unitCost": 12000,
    "name": "Menta fresca",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 0.7,
    "consumedBySales": 0,
    "alertBelow": 0.15,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-jengibre",
    "supplier": "Huerta Pinamar",
    "unitCost": 4000,
    "name": "Jengibre",
    "category": "Verdulería",
    "unit": "kg",
    "totalStock": 2,
    "consumedBySales": 0,
    "alertBelow": 0.4,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-aceite-oliva",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 8000,
    "name": "Aceite de oliva extra virgen",
    "category": "Almacén",
    "unit": "l",
    "totalStock": 8,
    "consumedBySales": 0,
    "alertBelow": 2,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-reduccion-balsamica",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 6500,
    "name": "Reducción balsámica",
    "category": "Almacén",
    "unit": "l",
    "totalStock": 3,
    "consumedBySales": 0,
    "alertBelow": 0.7,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-nuez",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 11000,
    "name": "Nuez pelada",
    "category": "Almacén",
    "unit": "kg",
    "totalStock": 3,
    "consumedBySales": 0,
    "alertBelow": 0.7,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-vinagre-vino",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 2500,
    "name": "Vinagre de vino",
    "category": "Almacén",
    "unit": "l",
    "totalStock": 3,
    "consumedBySales": 0,
    "alertBelow": 0.7,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-miel",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 6000,
    "name": "Miel",
    "category": "Almacén",
    "unit": "kg",
    "totalStock": 3,
    "consumedBySales": 0,
    "alertBelow": 0.7,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-harina",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 1000,
    "name": "Harina 0000",
    "category": "Almacén",
    "unit": "kg",
    "totalStock": 25,
    "consumedBySales": 0,
    "alertBelow": 6,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-panko",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 3000,
    "name": "Panko",
    "category": "Almacén",
    "unit": "kg",
    "totalStock": 5,
    "consumedBySales": 0,
    "alertBelow": 1.2,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-aceite-girasol",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 2200,
    "name": "Aceite de girasol",
    "category": "Almacén",
    "unit": "l",
    "totalStock": 12,
    "consumedBySales": 0,
    "alertBelow": 3,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-mayonesa",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 4500,
    "name": "Mayonesa",
    "category": "Almacén",
    "unit": "kg",
    "totalStock": 5,
    "consumedBySales": 0,
    "alertBelow": 1,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-pimenton",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 18000,
    "name": "Pimentón ahumado",
    "category": "Almacén",
    "unit": "kg",
    "totalStock": 0.8,
    "consumedBySales": 0,
    "alertBelow": 0.15,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-demi-glace",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 7000,
    "name": "Demi-glace",
    "category": "Almacén",
    "unit": "l",
    "totalStock": 6,
    "consumedBySales": 0,
    "alertBelow": 1.5,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-alcaparras",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 12000,
    "name": "Alcaparras",
    "category": "Almacén",
    "unit": "kg",
    "totalStock": 1.5,
    "consumedBySales": 0,
    "alertBelow": 0.3,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-fondo-pollo",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 2500,
    "name": "Fondo de pollo",
    "category": "Almacén",
    "unit": "l",
    "totalStock": 8,
    "consumedBySales": 0,
    "alertBelow": 2,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-polenta",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 1800,
    "name": "Polenta",
    "category": "Almacén",
    "unit": "kg",
    "totalStock": 7,
    "consumedBySales": 0,
    "alertBelow": 1.5,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-fondo-carne",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 3000,
    "name": "Fondo de carne",
    "category": "Almacén",
    "unit": "l",
    "totalStock": 8,
    "consumedBySales": 0,
    "alertBelow": 2,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-extracto-tomate",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 4000,
    "name": "Extracto de tomate",
    "category": "Almacén",
    "unit": "kg",
    "totalStock": 2,
    "consumedBySales": 0,
    "alertBelow": 0.5,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-amaretti",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 7000,
    "name": "Amaretti",
    "category": "Almacén",
    "unit": "kg",
    "totalStock": 2,
    "consumedBySales": 0,
    "alertBelow": 0.4,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-nuez-moscada",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 18000,
    "name": "Nuez moscada",
    "category": "Almacén",
    "unit": "kg",
    "totalStock": 0.3,
    "consumedBySales": 0,
    "alertBelow": 0.06,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-porcini",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 45000,
    "name": "Hongos porcini secos",
    "category": "Almacén",
    "unit": "kg",
    "totalStock": 1,
    "consumedBySales": 0,
    "alertBelow": 0.2,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-passata",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 2200,
    "name": "Passata de tomate",
    "category": "Almacén",
    "unit": "l",
    "totalStock": 10,
    "consumedBySales": 0,
    "alertBelow": 2,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-azucar",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 1200,
    "name": "Azúcar",
    "category": "Almacén",
    "unit": "kg",
    "totalStock": 12,
    "consumedBySales": 0,
    "alertBelow": 3,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-vainilla",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 25000,
    "name": "Esencia de vainilla",
    "category": "Almacén",
    "unit": "l",
    "totalStock": 1,
    "consumedBySales": 0,
    "alertBelow": 0.2,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-dulce-leche",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 4500,
    "name": "Dulce de leche repostero",
    "category": "Almacén",
    "unit": "kg",
    "totalStock": 8,
    "consumedBySales": 0,
    "alertBelow": 2,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-chocolate",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 14000,
    "name": "Chocolate amargo 70%",
    "category": "Almacén",
    "unit": "kg",
    "totalStock": 6,
    "consumedBySales": 0,
    "alertBelow": 1.5,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-cacao",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 9000,
    "name": "Cacao amargo",
    "category": "Almacén",
    "unit": "kg",
    "totalStock": 2,
    "consumedBySales": 0,
    "alertBelow": 0.4,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-almibar",
    "supplier": "Almacén Mayorista Centro",
    "unitCost": 1500,
    "name": "Almíbar simple",
    "category": "Almacén",
    "unit": "l",
    "totalStock": 5,
    "consumedBySales": 0,
    "alertBelow": 1,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-pan-masa-madre",
    "supplier": "Panadería La Esquina",
    "unitCost": 5000,
    "name": "Pan de masa madre",
    "category": "Panadería",
    "unit": "kg",
    "totalStock": 8,
    "consumedBySales": 0,
    "alertBelow": 2,
    "lastUpdated": "Hoy",
    "note": "Entregas diarias."
  },
  {
    "id": "stock-huevo",
    "supplier": "Granja del Mar",
    "unitCost": 250,
    "name": "Huevo fresco",
    "category": "Almacén",
    "unit": "unidad",
    "totalStock": 180,
    "consumedBySales": 0,
    "alertBelow": 36,
    "lastUpdated": "Hoy",
    "note": "Rotación semanal."
  },
  {
    "id": "stock-vino-blanco-cocina",
    "supplier": "Bodega Costa",
    "unitCost": 4500,
    "name": "Vino blanco de cocina",
    "category": "Bodega",
    "unit": "l",
    "totalStock": 6,
    "consumedBySales": 0,
    "alertBelow": 1.5,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-vino-casa",
    "supplier": "Bodega Costa",
    "unitCost": 6500,
    "name": "Vino de la casa 750 ml",
    "category": "Bodega",
    "unit": "botella",
    "totalStock": 48,
    "consumedBySales": 0,
    "alertBelow": 12,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-bitter-naranja",
    "supplier": "Barra & Co",
    "unitCost": 10000,
    "name": "Aperitivo bitter de naranja",
    "category": "Barra",
    "unit": "botella",
    "totalStock": 12,
    "consumedBySales": 0,
    "alertBelow": 3,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-espumante",
    "supplier": "Bodega Costa",
    "unitCost": 8000,
    "name": "Espumante brut 750 ml",
    "category": "Bodega",
    "unit": "botella",
    "totalStock": 24,
    "consumedBySales": 0,
    "alertBelow": 6,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-soda",
    "supplier": "Bebidas Pinamar",
    "unitCost": 1200,
    "name": "Soda 1,5 l",
    "category": "Bebidas",
    "unit": "botella",
    "totalStock": 24,
    "consumedBySales": 0,
    "alertBelow": 6,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-gin",
    "supplier": "Barra & Co",
    "unitCost": 12000,
    "name": "Gin",
    "category": "Barra",
    "unit": "botella",
    "totalStock": 12,
    "consumedBySales": 0,
    "alertBelow": 3,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-vermut",
    "supplier": "Barra & Co",
    "unitCost": 8000,
    "name": "Vermut seco",
    "category": "Barra",
    "unit": "botella",
    "totalStock": 12,
    "consumedBySales": 0,
    "alertBelow": 3,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-sauco",
    "supplier": "Barra & Co",
    "unitCost": 18000,
    "name": "Licor de flor de saúco",
    "category": "Barra",
    "unit": "botella",
    "totalStock": 8,
    "consumedBySales": 0,
    "alertBelow": 2,
    "lastUpdated": "Hoy",
    "note": ""
  },
  {
    "id": "stock-agua-filtrada",
    "supplier": "Demuru",
    "unitCost": 100,
    "name": "Agua filtrada",
    "category": "Bebidas",
    "unit": "l",
    "totalStock": 80,
    "consumedBySales": 0,
    "alertBelow": 20,
    "lastUpdated": "Hoy",
    "note": ""
  }
];

const demuruDemoRecipesRaw: DemuruDemoRecipeSeed[] =
[
  {
    "id": "recipe-burrata",
    "menuItemId": "demuru-menu-burrata",
    "name": "Burrata de estación",
    "preparationTimeSeconds": 480,
    "persisted": true,
    "ingredients": [
      {
        "id": "recipe-burrata-ing-01",
        "stockProductId": "stock-burrata",
        "quantity": 1,
        "unit": "unidad"
      },
      {
        "id": "recipe-burrata-ing-02",
        "stockProductId": "stock-tomate",
        "quantity": 180,
        "unit": "g"
      },
      {
        "id": "recipe-burrata-ing-03",
        "stockProductId": "stock-albahaca",
        "quantity": 5,
        "unit": "g"
      },
      {
        "id": "recipe-burrata-ing-04",
        "stockProductId": "stock-aceite-oliva",
        "quantity": 18,
        "unit": "ml"
      },
      {
        "id": "recipe-burrata-ing-05",
        "stockProductId": "stock-reduccion-balsamica",
        "quantity": 12,
        "unit": "ml"
      }
    ]
  },
  {
    "id": "recipe-remolacha",
    "menuItemId": "demuru-menu-remolacha",
    "name": "Remolacha asada",
    "preparationTimeSeconds": 600,
    "persisted": true,
    "ingredients": [
      {
        "id": "recipe-remolacha-ing-01",
        "stockProductId": "stock-remolacha",
        "quantity": 220,
        "unit": "g"
      },
      {
        "id": "recipe-remolacha-ing-02",
        "stockProductId": "stock-queso-cabra",
        "quantity": 70,
        "unit": "g"
      },
      {
        "id": "recipe-remolacha-ing-03",
        "stockProductId": "stock-naranja",
        "quantity": 80,
        "unit": "g"
      },
      {
        "id": "recipe-remolacha-ing-04",
        "stockProductId": "stock-nuez",
        "quantity": 20,
        "unit": "g"
      },
      {
        "id": "recipe-remolacha-ing-05",
        "stockProductId": "stock-rucula",
        "quantity": 20,
        "unit": "g"
      },
      {
        "id": "recipe-remolacha-ing-06",
        "stockProductId": "stock-aceite-oliva",
        "quantity": 15,
        "unit": "ml"
      },
      {
        "id": "recipe-remolacha-ing-07",
        "stockProductId": "stock-vinagre-vino",
        "quantity": 10,
        "unit": "ml"
      },
      {
        "id": "recipe-remolacha-ing-08",
        "stockProductId": "stock-miel",
        "quantity": 8,
        "unit": "g"
      }
    ]
  },
  {
    "id": "recipe-croquetas",
    "menuItemId": "demuru-menu-croquetas",
    "name": "Croquetas de hongos",
    "preparationTimeSeconds": 720,
    "persisted": true,
    "ingredients": [
      {
        "id": "recipe-croquetas-ing-01",
        "stockProductId": "stock-hongos",
        "quantity": 160,
        "unit": "g"
      },
      {
        "id": "recipe-croquetas-ing-02",
        "stockProductId": "stock-cebolla",
        "quantity": 35,
        "unit": "g"
      },
      {
        "id": "recipe-croquetas-ing-03",
        "stockProductId": "stock-manteca",
        "quantity": 25,
        "unit": "g"
      },
      {
        "id": "recipe-croquetas-ing-04",
        "stockProductId": "stock-harina",
        "quantity": 25,
        "unit": "g"
      },
      {
        "id": "recipe-croquetas-ing-05",
        "stockProductId": "stock-leche",
        "quantity": 120,
        "unit": "ml"
      },
      {
        "id": "recipe-croquetas-ing-06",
        "stockProductId": "stock-parmesano",
        "quantity": 20,
        "unit": "g"
      },
      {
        "id": "recipe-croquetas-ing-07",
        "stockProductId": "stock-huevo",
        "quantity": 0.5,
        "unit": "unidad"
      },
      {
        "id": "recipe-croquetas-ing-08",
        "stockProductId": "stock-panko",
        "quantity": 45,
        "unit": "g"
      },
      {
        "id": "recipe-croquetas-ing-09",
        "stockProductId": "stock-aceite-girasol",
        "quantity": 20,
        "unit": "ml"
      },
      {
        "id": "recipe-croquetas-ing-10",
        "stockProductId": "stock-mayonesa",
        "quantity": 30,
        "unit": "g"
      },
      {
        "id": "recipe-croquetas-ing-11",
        "stockProductId": "stock-limon",
        "quantity": 10,
        "unit": "g"
      },
      {
        "id": "recipe-croquetas-ing-12",
        "stockProductId": "stock-perejil",
        "quantity": 3,
        "unit": "g"
      }
    ]
  },
  {
    "id": "recipe-toston",
    "menuItemId": "demuru-menu-toston",
    "name": "Tostón ahumado",
    "preparationTimeSeconds": 600,
    "persisted": true,
    "ingredients": [
      {
        "id": "recipe-toston-ing-01",
        "stockProductId": "stock-pan-masa-madre",
        "quantity": 120,
        "unit": "g"
      },
      {
        "id": "recipe-toston-ing-02",
        "stockProductId": "stock-berenjena",
        "quantity": 160,
        "unit": "g"
      },
      {
        "id": "recipe-toston-ing-03",
        "stockProductId": "stock-provolone",
        "quantity": 50,
        "unit": "g"
      },
      {
        "id": "recipe-toston-ing-04",
        "stockProductId": "stock-tomate-cherry",
        "quantity": 70,
        "unit": "g"
      },
      {
        "id": "recipe-toston-ing-05",
        "stockProductId": "stock-cebolla-morada",
        "quantity": 30,
        "unit": "g"
      },
      {
        "id": "recipe-toston-ing-06",
        "stockProductId": "stock-aceite-oliva",
        "quantity": 15,
        "unit": "ml"
      },
      {
        "id": "recipe-toston-ing-07",
        "stockProductId": "stock-pimenton",
        "quantity": 1,
        "unit": "g"
      },
      {
        "id": "recipe-toston-ing-08",
        "stockProductId": "stock-perejil",
        "quantity": 3,
        "unit": "g"
      }
    ]
  },
  {
    "id": "recipe-ojo-bife",
    "menuItemId": "demuru-menu-ojo-bife",
    "name": "Ojo de bife",
    "preparationTimeSeconds": 1320,
    "persisted": true,
    "ingredients": [
      {
        "id": "recipe-ojo-bife-ing-01",
        "stockProductId": "stock-ojo-bife",
        "quantity": 350,
        "unit": "g"
      },
      {
        "id": "recipe-ojo-bife-ing-02",
        "stockProductId": "stock-papa",
        "quantity": 260,
        "unit": "g"
      },
      {
        "id": "recipe-ojo-bife-ing-03",
        "stockProductId": "stock-crema",
        "quantity": 50,
        "unit": "ml"
      },
      {
        "id": "recipe-ojo-bife-ing-04",
        "stockProductId": "stock-manteca",
        "quantity": 30,
        "unit": "g"
      },
      {
        "id": "recipe-ojo-bife-ing-05",
        "stockProductId": "stock-demi-glace",
        "quantity": 80,
        "unit": "ml"
      },
      {
        "id": "recipe-ojo-bife-ing-06",
        "stockProductId": "stock-ajo",
        "quantity": 5,
        "unit": "g"
      },
      {
        "id": "recipe-ojo-bife-ing-07",
        "stockProductId": "stock-romero",
        "quantity": 2,
        "unit": "g"
      },
      {
        "id": "recipe-ojo-bife-ing-08",
        "stockProductId": "stock-aceite-oliva",
        "quantity": 10,
        "unit": "ml"
      }
    ]
  },
  {
    "id": "recipe-pulpo",
    "menuItemId": "demuru-menu-pulpo",
    "name": "Pulpo grillado",
    "preparationTimeSeconds": 1200,
    "persisted": true,
    "ingredients": [
      {
        "id": "recipe-pulpo-ing-01",
        "stockProductId": "stock-pulpo",
        "quantity": 320,
        "unit": "g"
      },
      {
        "id": "recipe-pulpo-ing-02",
        "stockProductId": "stock-papa",
        "quantity": 180,
        "unit": "g"
      },
      {
        "id": "recipe-pulpo-ing-03",
        "stockProductId": "stock-mayonesa",
        "quantity": 30,
        "unit": "g"
      },
      {
        "id": "recipe-pulpo-ing-04",
        "stockProductId": "stock-ajo",
        "quantity": 3,
        "unit": "g"
      },
      {
        "id": "recipe-pulpo-ing-05",
        "stockProductId": "stock-pimenton",
        "quantity": 2,
        "unit": "g"
      },
      {
        "id": "recipe-pulpo-ing-06",
        "stockProductId": "stock-limon",
        "quantity": 40,
        "unit": "g"
      },
      {
        "id": "recipe-pulpo-ing-07",
        "stockProductId": "stock-aceite-oliva",
        "quantity": 15,
        "unit": "ml"
      },
      {
        "id": "recipe-pulpo-ing-08",
        "stockProductId": "stock-perejil",
        "quantity": 4,
        "unit": "g"
      }
    ]
  },
  {
    "id": "recipe-pesca",
    "menuItemId": "demuru-menu-pesca",
    "name": "Pesca del día",
    "preparationTimeSeconds": 1200,
    "persisted": true,
    "ingredients": [
      {
        "id": "recipe-pesca-ing-01",
        "stockProductId": "stock-pescado-blanco",
        "quantity": 280,
        "unit": "g"
      },
      {
        "id": "recipe-pesca-ing-02",
        "stockProductId": "stock-zucchini",
        "quantity": 70,
        "unit": "g"
      },
      {
        "id": "recipe-pesca-ing-03",
        "stockProductId": "stock-zanahoria",
        "quantity": 60,
        "unit": "g"
      },
      {
        "id": "recipe-pesca-ing-04",
        "stockProductId": "stock-hinojo",
        "quantity": 50,
        "unit": "g"
      },
      {
        "id": "recipe-pesca-ing-05",
        "stockProductId": "stock-manteca",
        "quantity": 25,
        "unit": "g"
      },
      {
        "id": "recipe-pesca-ing-06",
        "stockProductId": "stock-limon",
        "quantity": 40,
        "unit": "g"
      },
      {
        "id": "recipe-pesca-ing-07",
        "stockProductId": "stock-aceite-oliva",
        "quantity": 15,
        "unit": "ml"
      },
      {
        "id": "recipe-pesca-ing-08",
        "stockProductId": "stock-alcaparras",
        "quantity": 12,
        "unit": "g"
      },
      {
        "id": "recipe-pesca-ing-09",
        "stockProductId": "stock-perejil",
        "quantity": 4,
        "unit": "g"
      }
    ]
  },
  {
    "id": "recipe-pollo",
    "menuItemId": "demuru-menu-pollo",
    "name": "Pollo braseado",
    "preparationTimeSeconds": 1080,
    "persisted": true,
    "ingredients": [
      {
        "id": "recipe-pollo-ing-01",
        "stockProductId": "stock-pollo",
        "quantity": 320,
        "unit": "g"
      },
      {
        "id": "recipe-pollo-ing-02",
        "stockProductId": "stock-cebolla",
        "quantity": 60,
        "unit": "g"
      },
      {
        "id": "recipe-pollo-ing-03",
        "stockProductId": "stock-zanahoria",
        "quantity": 50,
        "unit": "g"
      },
      {
        "id": "recipe-pollo-ing-04",
        "stockProductId": "stock-apio",
        "quantity": 30,
        "unit": "g"
      },
      {
        "id": "recipe-pollo-ing-05",
        "stockProductId": "stock-vino-blanco-cocina",
        "quantity": 80,
        "unit": "ml"
      },
      {
        "id": "recipe-pollo-ing-06",
        "stockProductId": "stock-fondo-pollo",
        "quantity": 120,
        "unit": "ml"
      },
      {
        "id": "recipe-pollo-ing-07",
        "stockProductId": "stock-polenta",
        "quantity": 70,
        "unit": "g"
      },
      {
        "id": "recipe-pollo-ing-08",
        "stockProductId": "stock-parmesano",
        "quantity": 25,
        "unit": "g"
      },
      {
        "id": "recipe-pollo-ing-09",
        "stockProductId": "stock-manteca",
        "quantity": 20,
        "unit": "g"
      },
      {
        "id": "recipe-pollo-ing-10",
        "stockProductId": "stock-tomillo",
        "quantity": 2,
        "unit": "g"
      }
    ]
  },
  {
    "id": "recipe-ravioles",
    "menuItemId": "demuru-menu-ravioles",
    "name": "Ravioles de osobuco",
    "preparationTimeSeconds": 1080,
    "persisted": true,
    "ingredients": [
      {
        "id": "recipe-ravioles-ing-01",
        "stockProductId": "stock-harina",
        "quantity": 90,
        "unit": "g"
      },
      {
        "id": "recipe-ravioles-ing-02",
        "stockProductId": "stock-huevo",
        "quantity": 1,
        "unit": "unidad"
      },
      {
        "id": "recipe-ravioles-ing-03",
        "stockProductId": "stock-osobuco",
        "quantity": 150,
        "unit": "g"
      },
      {
        "id": "recipe-ravioles-ing-04",
        "stockProductId": "stock-cebolla",
        "quantity": 35,
        "unit": "g"
      },
      {
        "id": "recipe-ravioles-ing-05",
        "stockProductId": "stock-zanahoria",
        "quantity": 25,
        "unit": "g"
      },
      {
        "id": "recipe-ravioles-ing-06",
        "stockProductId": "stock-apio",
        "quantity": 20,
        "unit": "g"
      },
      {
        "id": "recipe-ravioles-ing-07",
        "stockProductId": "stock-vino-blanco-cocina",
        "quantity": 40,
        "unit": "ml"
      },
      {
        "id": "recipe-ravioles-ing-08",
        "stockProductId": "stock-fondo-carne",
        "quantity": 70,
        "unit": "ml"
      },
      {
        "id": "recipe-ravioles-ing-09",
        "stockProductId": "stock-extracto-tomate",
        "quantity": 10,
        "unit": "g"
      },
      {
        "id": "recipe-ravioles-ing-10",
        "stockProductId": "stock-parmesano",
        "quantity": 20,
        "unit": "g"
      },
      {
        "id": "recipe-ravioles-ing-11",
        "stockProductId": "stock-manteca",
        "quantity": 20,
        "unit": "g"
      },
      {
        "id": "recipe-ravioles-ing-12",
        "stockProductId": "stock-perejil",
        "quantity": 4,
        "unit": "g"
      },
      {
        "id": "recipe-ravioles-ing-13",
        "stockProductId": "stock-limon",
        "quantity": 10,
        "unit": "g"
      }
    ]
  },
  {
    "id": "recipe-sorrentinos",
    "menuItemId": "demuru-menu-sorrentinos",
    "name": "Sorrentinos de calabaza",
    "preparationTimeSeconds": 1020,
    "persisted": true,
    "ingredients": [
      {
        "id": "recipe-sorrentinos-ing-01",
        "stockProductId": "stock-harina",
        "quantity": 90,
        "unit": "g"
      },
      {
        "id": "recipe-sorrentinos-ing-02",
        "stockProductId": "stock-huevo",
        "quantity": 1,
        "unit": "unidad"
      },
      {
        "id": "recipe-sorrentinos-ing-03",
        "stockProductId": "stock-calabaza",
        "quantity": 150,
        "unit": "g"
      },
      {
        "id": "recipe-sorrentinos-ing-04",
        "stockProductId": "stock-ricotta",
        "quantity": 60,
        "unit": "g"
      },
      {
        "id": "recipe-sorrentinos-ing-05",
        "stockProductId": "stock-parmesano",
        "quantity": 25,
        "unit": "g"
      },
      {
        "id": "recipe-sorrentinos-ing-06",
        "stockProductId": "stock-manteca",
        "quantity": 25,
        "unit": "g"
      },
      {
        "id": "recipe-sorrentinos-ing-07",
        "stockProductId": "stock-salvia",
        "quantity": 4,
        "unit": "g"
      },
      {
        "id": "recipe-sorrentinos-ing-08",
        "stockProductId": "stock-amaretti",
        "quantity": 8,
        "unit": "g"
      },
      {
        "id": "recipe-sorrentinos-ing-09",
        "stockProductId": "stock-nuez-moscada",
        "quantity": 0.5,
        "unit": "g"
      }
    ]
  },
  {
    "id": "recipe-pappardelle",
    "menuItemId": "demuru-menu-pappardelle",
    "name": "Pappardelle",
    "preparationTimeSeconds": 960,
    "persisted": true,
    "ingredients": [
      {
        "id": "recipe-pappardelle-ing-01",
        "stockProductId": "stock-harina",
        "quantity": 110,
        "unit": "g"
      },
      {
        "id": "recipe-pappardelle-ing-02",
        "stockProductId": "stock-huevo",
        "quantity": 1,
        "unit": "unidad"
      },
      {
        "id": "recipe-pappardelle-ing-03",
        "stockProductId": "stock-hongos",
        "quantity": 180,
        "unit": "g"
      },
      {
        "id": "recipe-pappardelle-ing-04",
        "stockProductId": "stock-porcini",
        "quantity": 10,
        "unit": "g"
      },
      {
        "id": "recipe-pappardelle-ing-05",
        "stockProductId": "stock-cebolla",
        "quantity": 30,
        "unit": "g"
      },
      {
        "id": "recipe-pappardelle-ing-06",
        "stockProductId": "stock-vino-blanco-cocina",
        "quantity": 40,
        "unit": "ml"
      },
      {
        "id": "recipe-pappardelle-ing-07",
        "stockProductId": "stock-crema",
        "quantity": 70,
        "unit": "ml"
      },
      {
        "id": "recipe-pappardelle-ing-08",
        "stockProductId": "stock-parmesano",
        "quantity": 25,
        "unit": "g"
      },
      {
        "id": "recipe-pappardelle-ing-09",
        "stockProductId": "stock-manteca",
        "quantity": 20,
        "unit": "g"
      },
      {
        "id": "recipe-pappardelle-ing-10",
        "stockProductId": "stock-tomillo",
        "quantity": 2,
        "unit": "g"
      }
    ]
  },
  {
    "id": "recipe-noquis",
    "menuItemId": "demuru-menu-noquis",
    "name": "Ñoquis de papa",
    "preparationTimeSeconds": 960,
    "persisted": true,
    "ingredients": [
      {
        "id": "recipe-noquis-ing-01",
        "stockProductId": "stock-papa",
        "quantity": 280,
        "unit": "g"
      },
      {
        "id": "recipe-noquis-ing-02",
        "stockProductId": "stock-harina",
        "quantity": 70,
        "unit": "g"
      },
      {
        "id": "recipe-noquis-ing-03",
        "stockProductId": "stock-huevo",
        "quantity": 0.5,
        "unit": "unidad"
      },
      {
        "id": "recipe-noquis-ing-04",
        "stockProductId": "stock-parmesano",
        "quantity": 25,
        "unit": "g"
      },
      {
        "id": "recipe-noquis-ing-05",
        "stockProductId": "stock-passata",
        "quantity": 150,
        "unit": "ml"
      },
      {
        "id": "recipe-noquis-ing-06",
        "stockProductId": "stock-stracciatella",
        "quantity": 60,
        "unit": "g"
      },
      {
        "id": "recipe-noquis-ing-07",
        "stockProductId": "stock-manteca",
        "quantity": 15,
        "unit": "g"
      },
      {
        "id": "recipe-noquis-ing-08",
        "stockProductId": "stock-aceite-oliva",
        "quantity": 10,
        "unit": "ml"
      },
      {
        "id": "recipe-noquis-ing-09",
        "stockProductId": "stock-ajo",
        "quantity": 3,
        "unit": "g"
      },
      {
        "id": "recipe-noquis-ing-10",
        "stockProductId": "stock-albahaca",
        "quantity": 5,
        "unit": "g"
      }
    ]
  },
  {
    "id": "recipe-creme-brulee",
    "menuItemId": "demuru-menu-creme-brulee",
    "name": "Creme brulee (para 2)",
    "preparationTimeSeconds": 480,
    "persisted": true,
    "ingredients": [
      {
        "id": "recipe-creme-brulee-ing-01",
        "stockProductId": "stock-crema",
        "quantity": 250,
        "unit": "ml"
      },
      {
        "id": "recipe-creme-brulee-ing-02",
        "stockProductId": "stock-leche",
        "quantity": 75,
        "unit": "ml"
      },
      {
        "id": "recipe-creme-brulee-ing-03",
        "stockProductId": "stock-huevo",
        "quantity": 4,
        "unit": "unidad"
      },
      {
        "id": "recipe-creme-brulee-ing-04",
        "stockProductId": "stock-azucar",
        "quantity": 70,
        "unit": "g"
      },
      {
        "id": "recipe-creme-brulee-ing-05",
        "stockProductId": "stock-vainilla",
        "quantity": 5,
        "unit": "ml"
      }
    ]
  },
  {
    "id": "recipe-flan-mixto",
    "menuItemId": "demuru-menu-flan-mixto",
    "name": "Flan mixto",
    "preparationTimeSeconds": 360,
    "persisted": true,
    "ingredients": [
      {
        "id": "recipe-flan-mixto-ing-01",
        "stockProductId": "stock-leche",
        "quantity": 200,
        "unit": "ml"
      },
      {
        "id": "recipe-flan-mixto-ing-02",
        "stockProductId": "stock-huevo",
        "quantity": 2,
        "unit": "unidad"
      },
      {
        "id": "recipe-flan-mixto-ing-03",
        "stockProductId": "stock-azucar",
        "quantity": 60,
        "unit": "g"
      },
      {
        "id": "recipe-flan-mixto-ing-04",
        "stockProductId": "stock-vainilla",
        "quantity": 3,
        "unit": "ml"
      },
      {
        "id": "recipe-flan-mixto-ing-05",
        "stockProductId": "stock-dulce-leche",
        "quantity": 50,
        "unit": "g"
      },
      {
        "id": "recipe-flan-mixto-ing-06",
        "stockProductId": "stock-crema",
        "quantity": 60,
        "unit": "ml"
      }
    ]
  },
  {
    "id": "recipe-panqueque",
    "menuItemId": "demuru-menu-panqueque",
    "name": "Panqueque caramelizado",
    "preparationTimeSeconds": 480,
    "persisted": true,
    "ingredients": [
      {
        "id": "recipe-panqueque-ing-01",
        "stockProductId": "stock-harina",
        "quantity": 60,
        "unit": "g"
      },
      {
        "id": "recipe-panqueque-ing-02",
        "stockProductId": "stock-huevo",
        "quantity": 1,
        "unit": "unidad"
      },
      {
        "id": "recipe-panqueque-ing-03",
        "stockProductId": "stock-leche",
        "quantity": 120,
        "unit": "ml"
      },
      {
        "id": "recipe-panqueque-ing-04",
        "stockProductId": "stock-manteca",
        "quantity": 20,
        "unit": "g"
      },
      {
        "id": "recipe-panqueque-ing-05",
        "stockProductId": "stock-dulce-leche",
        "quantity": 100,
        "unit": "g"
      },
      {
        "id": "recipe-panqueque-ing-06",
        "stockProductId": "stock-azucar",
        "quantity": 20,
        "unit": "g"
      }
    ]
  },
  {
    "id": "recipe-marquise",
    "menuItemId": "demuru-menu-marquise",
    "name": "Marquise chocolate",
    "preparationTimeSeconds": 420,
    "persisted": true,
    "ingredients": [
      {
        "id": "recipe-marquise-ing-01",
        "stockProductId": "stock-chocolate",
        "quantity": 80,
        "unit": "g"
      },
      {
        "id": "recipe-marquise-ing-02",
        "stockProductId": "stock-manteca",
        "quantity": 50,
        "unit": "g"
      },
      {
        "id": "recipe-marquise-ing-03",
        "stockProductId": "stock-huevo",
        "quantity": 1,
        "unit": "unidad"
      },
      {
        "id": "recipe-marquise-ing-04",
        "stockProductId": "stock-azucar",
        "quantity": 30,
        "unit": "g"
      },
      {
        "id": "recipe-marquise-ing-05",
        "stockProductId": "stock-dulce-leche",
        "quantity": 50,
        "unit": "g"
      },
      {
        "id": "recipe-marquise-ing-06",
        "stockProductId": "stock-crema",
        "quantity": 50,
        "unit": "ml"
      },
      {
        "id": "recipe-marquise-ing-07",
        "stockProductId": "stock-cacao",
        "quantity": 8,
        "unit": "g"
      }
    ]
  },
  {
    "id": "recipe-vino-casa",
    "menuItemId": "demuru-menu-vino-casa",
    "name": "Vino de la casa",
    "preparationTimeSeconds": 120,
    "persisted": true,
    "ingredients": [
      {
        "id": "recipe-vino-casa-ing-01",
        "stockProductId": "stock-vino-casa",
        "quantity": 0.2,
        "unit": "botella"
      }
    ]
  },
  {
    "id": "recipe-aperitivo",
    "menuItemId": "demuru-menu-aperitivo",
    "name": "Aperitivo cítrico",
    "preparationTimeSeconds": 240,
    "persisted": true,
    "ingredients": [
      {
        "id": "recipe-aperitivo-ing-01",
        "stockProductId": "stock-bitter-naranja",
        "quantity": 0.06,
        "unit": "botella"
      },
      {
        "id": "recipe-aperitivo-ing-02",
        "stockProductId": "stock-espumante",
        "quantity": 0.08,
        "unit": "botella"
      },
      {
        "id": "recipe-aperitivo-ing-03",
        "stockProductId": "stock-pomelo",
        "quantity": 60,
        "unit": "g"
      },
      {
        "id": "recipe-aperitivo-ing-04",
        "stockProductId": "stock-soda",
        "quantity": 0.02,
        "unit": "botella"
      },
      {
        "id": "recipe-aperitivo-ing-05",
        "stockProductId": "stock-almibar",
        "quantity": 10,
        "unit": "ml"
      }
    ]
  },
  {
    "id": "recipe-copa-especial",
    "menuItemId": "demuru-menu-copa-especial",
    "name": "Copa especial",
    "preparationTimeSeconds": 240,
    "persisted": true,
    "ingredients": [
      {
        "id": "recipe-copa-especial-ing-01",
        "stockProductId": "stock-gin",
        "quantity": 0.06,
        "unit": "botella"
      },
      {
        "id": "recipe-copa-especial-ing-02",
        "stockProductId": "stock-vermut",
        "quantity": 0.033,
        "unit": "botella"
      },
      {
        "id": "recipe-copa-especial-ing-03",
        "stockProductId": "stock-sauco",
        "quantity": 0.021,
        "unit": "botella"
      },
      {
        "id": "recipe-copa-especial-ing-04",
        "stockProductId": "stock-limon",
        "quantity": 35,
        "unit": "g"
      },
      {
        "id": "recipe-copa-especial-ing-05",
        "stockProductId": "stock-espumante",
        "quantity": 0.08,
        "unit": "botella"
      },
      {
        "id": "recipe-copa-especial-ing-06",
        "stockProductId": "stock-almibar",
        "quantity": 5,
        "unit": "ml"
      }
    ]
  },
  {
    "id": "recipe-agua-saborizada",
    "menuItemId": "demuru-menu-agua-saborizada",
    "name": "Agua saborizada",
    "preparationTimeSeconds": 180,
    "persisted": true,
    "ingredients": [
      {
        "id": "recipe-agua-saborizada-ing-01",
        "stockProductId": "stock-agua-filtrada",
        "quantity": 450,
        "unit": "ml"
      },
      {
        "id": "recipe-agua-saborizada-ing-02",
        "stockProductId": "stock-limon",
        "quantity": 40,
        "unit": "g"
      },
      {
        "id": "recipe-agua-saborizada-ing-03",
        "stockProductId": "stock-pepino",
        "quantity": 50,
        "unit": "g"
      },
      {
        "id": "recipe-agua-saborizada-ing-04",
        "stockProductId": "stock-menta",
        "quantity": 3,
        "unit": "g"
      },
      {
        "id": "recipe-agua-saborizada-ing-05",
        "stockProductId": "stock-jengibre",
        "quantity": 5,
        "unit": "g"
      },
      {
        "id": "recipe-agua-saborizada-ing-06",
        "stockProductId": "stock-almibar",
        "quantity": 10,
        "unit": "ml"
      }
    ]
  }
];

const demuruDemoStockNameById =
  new Map(
    demuruDemoStockProducts.map(
      (product) => [
        product.id,
        product.name,
      ],
    ),
  );

export const demuruDemoRecipes: DemuruDemoRecipe[] =
  demuruDemoRecipesRaw.map(
    (recipe) => ({
      ...recipe,
      ingredients:
        recipe.ingredients.map(
          (ingredient) => ({
            ...ingredient,
            name:
              demuruDemoStockNameById.get(
                ingredient.stockProductId,
              )
              ?? ingredient.stockProductId,
          }),
        ),
    }),
  );
