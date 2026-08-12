import {
  demuruDemoMenuItems,
  demuruDemoRecipes,
  demuruDemoStockProducts,
  type DemuruDemoStockProduct,
} from "./demo-demuru-master-data";

export const DEMURU_DEMO_OPERATIONAL_VERSION =
  "e35b-demuru-operational-v1";

export const DEMURU_DEMO_HISTORY_DAYS = 120;
export const DEMURU_DEMO_FUTURE_DAYS = 14;
export const DEMURU_DEMO_STOCK_USAGE_DAYS = 30;
export const DEMURU_DEMO_STOCK_HISTORY_DAYS = 7;

type DemoReservationStatus =
  | "pending"
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

type DemoDeliveryStatus =
  | "confirmed"
  | "completed"
  | "cancelled";

type DemoKitchenStatus =
  | "pending"
  | "preparing"
  | "ready"
  | "completed";

type DemoReservationOrigin =
  | "web"
  | "whatsapp"
  | "phone"
  | "instagram"
  | "manual";

type DemoDeliveryType =
  | "delivery"
  | "pickup";

type DemoPaymentBreakdown = {
  cash: number;
  card: number;
  mercadoPago: number;
  transfer: number;
};

export type DemuruDemoOrderLineItem = {
  id: string;
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
};

type DemoKitchenTicket = {
  id: string;
  status: DemoKitchenStatus;
  items: DemuruDemoOrderLineItem[];
  createdAt: string;
  startedAt?: string;
  readyAt?: string;
  completedAt?: string;
};

export type DemuruDemoReservation = {
  id: string;
  date: string;
  time: string;
  client: string;
  people: number;
  phone: string;
  email: string;
  durationMinutes: number;
  tableName: string;
  note: string;
  status: DemoReservationStatus;
  origin: DemoReservationOrigin;
  orderItems?: string;
  orderLineItems?: DemuruDemoOrderLineItem[];
  orderTotal?: number;
  paymentMethod?: string;
  paidAmount?: number;
  paymentBreakdown?: DemoPaymentBreakdown;
  paymentClosedAt?: string;
  reservationCode: string;
  stockDiscounted?: boolean;
  stockReturned?: boolean;
  createdAt: string;
  confirmedAt?: string;
  seatedAt?: string;
  consumptionStartedAt?: string;
  kitchenStatus?: DemoKitchenStatus;
  kitchenStartedAt?: string;
  kitchenReadyAt?: string;
  kitchenCompletedAt?: string;
  kitchenTickets?: DemoKitchenTicket[];
  completedAt?: string;
  cancelledAt?: string;
  noShowAt?: string;
};

export type DemuruDemoDelivery = {
  id: string;
  date: string;
  time: string;
  client: string;
  phone: string;
  address: string;
  deliveryType: DemoDeliveryType;
  order: string;
  orderItems: DemuruDemoOrderLineItem[];
  total: number;
  payment: string;
  paymentBreakdown?: Partial<DemoPaymentBreakdown>;
  note: string;
  status: DemoDeliveryStatus;
  source: "web" | "manual";
  needsAcceptance: boolean;
  trackingId: string;
  stockDiscounted: boolean;
  stockReturned: boolean;
  createdAt: string;
  acceptedAt?: string;
  preparingAt?: string;
  readyAt?: string;
  onTheWayAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
  kitchenStatus?: DemoKitchenStatus;
  kitchenStartedAt?: string;
  kitchenReadyAt?: string;
  kitchenCompletedAt?: string;
  kitchenTickets?: DemoKitchenTicket[];
};

export type DemuruDemoExpense = {
  id: string;
  businessId: string;
  date: string;
  dueDate?: string;
  description: string;
  provider: string;
  category: string;
  amount: number;
  status: "paid" | "pending";
  paymentMethod: string;
  createdAt: string;
  updatedAt: string;
  paidAt?: string;
};

type DemoCashMovement = {
  id: string;
  type: "income" | "withdrawal";
  amount: number;
  reason: string;
  createdAt: string;
};

export type DemuruDemoCashRegister = {
  id: string;
  date: string;
  status: "open" | "closed";
  openingAmount: number;
  adjustment: number;
  movements: DemoCashMovement[];
  actualCash: number | null;
  expectedCash: number | null;
  difference: number | null;
  salesSnapshot: DemoPaymentBreakdown | null;
  cashExpensesSnapshot: number | null;
  notes: string;
  openedAt: string;
  closedAt: string | null;
};

export type DemuruDemoStockMovement = {
  id: string;
  createdAt: string;
  type: "discount" | "return" | "entry" | "manual";
  origin: "envios" | "reservas" | "manual";
  productId: string;
  productName: string;
  quantity: number;
  unit: string;
  label: string;
  detail?: string;
  referenceId?: string;
  client?: string;
  operationId?: string;
};

export type DemuruDemoClientMeta = {
  birthDate: string;
  internalNotes: string;
};

export type DemuruDemoManualClient = {
  id: string;
  name: string;
  email: string;
  phone: string;
  birthDate: string;
  internalNotes: string;
  preferences: string;
  tags: string[];
  isActive: boolean;
  createdAt: string;
};

export type DemuruDemoClientFallback = {
  id: string;
  name: string;
  initials: string;
  phone: string;
  email: string;
  lastVisit: string;
  reservations: number;
  preference: string;
  status:
    | "new"
    | "active"
    | "frequent"
    | "inactive"
    | "no_show";
  note: string;
};

export type DemuruDemoOperationalSnapshot = {
  anchorDate: string;
  reservations: DemuruDemoReservation[];
  deliveries: DemuruDemoDelivery[];
  expenses: DemuruDemoExpense[];
  cashRegisters: DemuruDemoCashRegister[];
  stockProducts: DemuruDemoStockProduct[];
  stockMovements: DemuruDemoStockMovement[];
  clientMeta: Record<string, DemuruDemoClientMeta>;
  manualClients: DemuruDemoManualClient[];
  clients: DemuruDemoClientFallback[];
  summary: {
    reservations: number;
    completedReservations: number;
    deliveries: number;
    completedDeliveries: number;
    expenses: number;
    cashRegisters: number;
    stockMovements: number;
  };
};

type DemoClientPersona = {
  name: string;
  phone: string;
  email: string;
  preference: string;
  note: string;
  birthDate: string;
  tags: string[];
};

const CLIENTS: DemoClientPersona[] = [
  {
    name: "María López",
    phone: "11 2345 6789",
    email: "maria.lopez@email.com",
    preference: "Mesa cerca de la ventana",
    note: "Cliente frecuente. Prefiere un sector tranquilo.",
    birthDate: "1988-03-18",
    tags: ["Frecuente", "Ventana"],
  },
  {
    name: "Juan Pérez",
    phone: "11 2233 4455",
    email: "juan.perez@email.com",
    preference: "Mesa interior",
    note: "Suele venir en pareja los viernes.",
    birthDate: "1985-10-04",
    tags: ["Frecuente"],
  },
  {
    name: "Lucía Fernández",
    phone: "11 9988 2345",
    email: "lucia.fernandez@email.com",
    preference: "Sin gluten",
    note: "Alergia declarada al gluten. Confirmar alternativas.",
    birthDate: "1992-06-27",
    tags: ["Alergia", "Sin gluten"],
  },
  {
    name: "Carlos Gómez",
    phone: "11 4567 1209",
    email: "carlos.gomez@email.com",
    preference: "Sin preferencia",
    note: "Prefiere confirmación por WhatsApp.",
    birthDate: "1979-11-12",
    tags: ["WhatsApp"],
  },
  {
    name: "Ana Rodríguez",
    phone: "11 7654 3201",
    email: "ana.rodriguez@email.com",
    preference: "Mesa 8",
    note: "Suele reservar para aniversarios.",
    birthDate: "1990-02-09",
    tags: ["Frecuente", "Celebraciones"],
  },
  {
    name: "Martín Sosa",
    phone: "11 5566 7788",
    email: "martin.sosa@email.com",
    preference: "Terraza",
    note: "Prefiere vinos tintos.",
    birthDate: "1987-08-21",
    tags: ["Vinos"],
  },
  {
    name: "Sofía Martínez",
    phone: "11 6677 8899",
    email: "sofia.martinez@email.com",
    preference: "Sin lactosa",
    note: "Evita lácteos cuando es posible.",
    birthDate: "1994-01-30",
    tags: ["Sin lactosa"],
  },
  {
    name: "Diego Ramírez",
    phone: "11 3344 5566",
    email: "diego.ramirez@email.com",
    preference: "Exterior",
    note: "Tuvo un no-show histórico. Confirmar el mismo día.",
    birthDate: "1983-05-15",
    tags: ["Confirmar"],
  },
  {
    name: "Valentina Costa",
    phone: "11 7788 9900",
    email: "valentina.costa@email.com",
    preference: "Mesa amplia",
    note: "Frecuentemente organiza cumpleaños.",
    birthDate: "1991-09-02",
    tags: ["Celebraciones"],
  },
  {
    name: "Federico Ruiz",
    phone: "11 1122 3344",
    email: "federico.ruiz@email.com",
    preference: "Mesa 2",
    note: "Prefiere cenas tempranas.",
    birthDate: "1986-12-14",
    tags: ["Temprano"],
  },
  {
    name: "Camila Torres",
    phone: "11 4455 6677",
    email: "camila.torres@email.com",
    preference: "Sin TACC",
    note: "Solicita opciones sin TACC.",
    birthDate: "1995-04-24",
    tags: ["Sin TACC"],
  },
  {
    name: "Nicolás Herrera",
    phone: "11 8899 0011",
    email: "nicolas.herrera@email.com",
    preference: "Mesa tranquila",
    note: "Evita sectores de circulación.",
    birthDate: "1982-07-11",
    tags: ["Tranquilo"],
  },
  {
    name: "Agustina Molina",
    phone: "11 9090 1122",
    email: "agustina.molina@email.com",
    preference: "Terraza",
    note: "Suele venir con grupos de cinco o seis personas.",
    birthDate: "1993-03-08",
    tags: ["Grupos"],
  },
  {
    name: "Tomás Medina",
    phone: "11 1212 3434",
    email: "tomas.medina@email.com",
    preference: "Sin preferencia",
    note: "",
    birthDate: "1989-01-19",
    tags: [],
  },
  {
    name: "Florencia Suárez",
    phone: "11 5656 7878",
    email: "florencia.suarez@email.com",
    preference: "Mesa íntima",
    note: "Suele reservar para dos personas.",
    birthDate: "1990-06-01",
    tags: ["Pareja"],
  },
  {
    name: "Gonzalo Peralta",
    phone: "11 3434 5656",
    email: "gonzalo.peralta@email.com",
    preference: "Mesa grande",
    note: "Reservas de seis personas o más.",
    birthDate: "1978-10-30",
    tags: ["Grupos"],
  },
  {
    name: "Paula Benítez",
    phone: "11 4141 5252",
    email: "paula.benitez@email.com",
    preference: "Cerca de la entrada",
    note: "Movilidad reducida de un acompañante.",
    birthDate: "1984-02-17",
    tags: ["Accesibilidad"],
  },
  {
    name: "Sebastián Luna",
    phone: "11 6363 7474",
    email: "sebastian.luna@email.com",
    preference: "Mesa interior",
    note: "Cumpleaños en noviembre.",
    birthDate: "1987-11-06",
    tags: ["Celebraciones"],
  },
  {
    name: "Julieta Navarro",
    phone: "11 8585 9696",
    email: "julieta.navarro@email.com",
    preference: "Sin maní",
    note: "Alergia declarada a maní.",
    birthDate: "1996-05-22",
    tags: ["Alergia"],
  },
  {
    name: "Emiliano Duarte",
    phone: "11 1010 2020",
    email: "emiliano.duarte@email.com",
    preference: "Mesa interior",
    note: "",
    birthDate: "1981-08-13",
    tags: [],
  },
  {
    name: "Carla Ibarra",
    phone: "11 3030 4040",
    email: "carla.ibarra@email.com",
    preference: "Mesa para grupo",
    note: "Suele almorzar los domingos.",
    birthDate: "1988-09-29",
    tags: ["Domingos"],
  },
  {
    name: "Ramiro Acosta",
    phone: "11 5050 6060",
    email: "ramiro.acosta@email.com",
    preference: "Sector silencioso",
    note: "Prefiere baja música ambiente.",
    birthDate: "1985-01-05",
    tags: ["Tranquilo"],
  },
  {
    name: "Micaela Ríos",
    phone: "11 7070 8080",
    email: "micaela.rios@email.com",
    preference: "Mesa familiar",
    note: "Almuerzos familiares de cuatro personas.",
    birthDate: "1992-12-07",
    tags: ["Familia"],
  },
  {
    name: "Bruno Leiva",
    phone: "11 2222 3333",
    email: "bruno.leiva@email.com",
    preference: "Sin preferencia",
    note: "",
    birthDate: "1997-03-31",
    tags: ["Nuevo"],
  },
  {
    name: "Daniela Vega",
    phone: "11 4444 5555",
    email: "daniela.vega@email.com",
    preference: "Vegetariana",
    note: "Prefiere platos vegetarianos.",
    birthDate: "1991-07-18",
    tags: ["Vegetariana"],
  },
  {
    name: "Hernán Ponce",
    phone: "11 6666 7777",
    email: "hernan.ponce@email.com",
    preference: "Ventana",
    note: "",
    birthDate: "1980-04-02",
    tags: [],
  },
  {
    name: "Laura Méndez",
    phone: "11 8888 9999",
    email: "laura.mendez@email.com",
    preference: "Mesa 1",
    note: "Cliente frecuente de cenas.",
    birthDate: "1986-05-10",
    tags: ["Frecuente"],
  },
  {
    name: "Pablo Roldán",
    phone: "11 1313 1414",
    email: "pablo.roldan@email.com",
    preference: "Mesa grande",
    note: "Suele reservar para grupos.",
    birthDate: "1977-06-20",
    tags: ["Grupos"],
  },
  {
    name: "Natalia Ferreyra",
    phone: "11 1515 1616",
    email: "natalia.ferreyra@email.com",
    preference: "Sin lactosa",
    note: "",
    birthDate: "1993-10-25",
    tags: ["Sin lactosa"],
  },
  {
    name: "Iván Morales",
    phone: "11 1717 1818",
    email: "ivan.morales@email.com",
    preference: "Cumpleaños",
    note: "Suele pedir postres para compartir.",
    birthDate: "1989-12-03",
    tags: ["Postres"],
  },
  {
    name: "Rocío Alvarez",
    phone: "11 1919 2020",
    email: "rocio.alvarez@email.com",
    preference: "Mesa 8",
    note: "Prefiere Aperitivo cítrico.",
    birthDate: "1994-08-08",
    tags: ["Barra"],
  },
  {
    name: "Mateo Silva",
    phone: "11 2121 2222",
    email: "mateo.silva@email.com",
    preference: "Mesa tranquila",
    note: "",
    birthDate: "1984-09-14",
    tags: [],
  },
  {
    name: "Clara Núñez",
    phone: "11 2323 2424",
    email: "clara.nunez@email.com",
    preference: "Sin gluten",
    note: "Consultar contaminación cruzada.",
    birthDate: "1990-01-27",
    tags: ["Alergia", "Sin gluten"],
  },
  {
    name: "Oscar Cabrera",
    phone: "11 2525 2626",
    email: "oscar.cabrera@email.com",
    preference: "Sin preferencia",
    note: "",
    birthDate: "1975-03-16",
    tags: [],
  },
  {
    name: "Elena Prieto",
    phone: "11 2727 2828",
    email: "elena.prieto@email.com",
    preference: "Mesa amplia",
    note: "Aniversario en agosto.",
    birthDate: "1982-08-19",
    tags: ["Celebraciones"],
  },
  {
    name: "Marcos Vidal",
    phone: "11 2929 3030",
    email: "marcos.vidal@email.com",
    preference: "Barra",
    note: "Suele pedir copa especial.",
    birthDate: "1988-11-23",
    tags: ["Barra"],
  },
];

const DELIVERY_ADDRESSES = [
  "Av. Bunge 742, Pinamar",
  "Av. Libertador 1190, Pinamar",
  "De las Artes 455, Pinamar",
  "Jason 885, Pinamar",
  "Intermédanos 1280, Pinamar",
  "Del Tuyú 510, Pinamar",
  "Marco Polo 625, Pinamar",
  "Shaw 1044, Pinamar",
  "Constitución 930, Pinamar",
  "Rivadavia 128, Ostende",
  "Azopardo 1412, Valeria del Mar",
  "Av. Espora 805, Valeria del Mar",
];

const TABLE_NAMES =
  Array.from(
    {
      length: 12,
    },
    (_, index) =>
      `Mesa ${index + 1}`,
  );

const ORIGINS: DemoReservationOrigin[] = [
  "web",
  "whatsapp",
  "web",
  "phone",
  "instagram",
  "manual",
  "web",
];

const LOW_STOCK_IDS = new Set([
  "stock-pulpo",
  "stock-stracciatella",
  "stock-porcini",
  "stock-sauco",
  "stock-burrata",
]);

function normalizePhone(
  value: string,
) {
  return value.replace(
    /\D/gu,
    "",
  );
}

function hashSeed(
  input: string,
) {
  let hash =
    2166136261;

  for (
    let index = 0;
    index < input.length;
    index += 1
  ) {
    hash ^=
      input.charCodeAt(
        index,
      );
    hash =
      Math.imul(
        hash,
        16777619,
      );
  }

  return hash >>> 0;
}

function createRandom(
  seed: string,
) {
  let state =
    hashSeed(
      seed,
    )
    || 1;

  return () => {
    state +=
      0x6D2B79F5;

    let value =
      state;

    value =
      Math.imul(
        value
        ^ value >>> 15,
        value | 1,
      );
    value ^=
      value
      + Math.imul(
        value ^ value >>> 7,
        value | 61,
      );

    return (
      (
        value ^ value >>> 14
      )
      >>> 0
    )
      / 4294967296;
  };
}

function localDateKey(
  date: Date,
) {
  return [
    date.getFullYear(),
    String(
      date.getMonth() + 1,
    ).padStart(
      2,
      "0",
    ),
    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    ),
  ].join(
    "-",
  );
}

function dateFromKey(
  value: string,
) {
  return new Date(
    `${value}T12:00:00`,
  );
}

function shiftDateKey(
  value: string,
  days: number,
) {
  const date =
    dateFromKey(
      value,
    );

  date.setDate(
    date.getDate()
    + days,
  );

  return localDateKey(
    date,
  );
}

function minuteOfDay(
  time: string,
) {
  const [
    hour,
    minute,
  ] =
    time
      .split(":")
      .map(Number);

  return (
    (hour || 0) * 60
    + (minute || 0)
  );
}

function timestampAt(
  date: string,
  time: string,
  deltaMinutes = 0,
) {
  const value =
    new Date(
      `${date}T${time}:00`,
    );

  value.setMinutes(
    value.getMinutes()
    + deltaMinutes,
  );

  return value.toISOString();
}

function dateLabel(
  value: string,
) {
  const months = [
    "ene",
    "feb",
    "mar",
    "abr",
    "may",
    "jun",
    "jul",
    "ago",
    "sep",
    "oct",
    "nov",
    "dic",
  ];
  const date =
    dateFromKey(
      value,
    );

  return [
    String(
      date.getDate(),
    ).padStart(
      2,
      "0",
    ),
    months[
      date.getMonth()
    ],
    date.getFullYear(),
  ].join(
    " ",
  );
}

function roundMoney(
  value: number,
) {
  return Math.round(
    value / 100,
  ) * 100;
}

function roundQuantity(
  value: number,
) {
  return Math.round(
    value * 1000,
  ) / 1000;
}

function codeFromSeed(
  prefix: "RES" | "PED",
  seed: string,
) {
  return `${prefix}-${hashSeed(
    seed,
  )
    .toString(36)
    .toUpperCase()
    .slice(0, 6)
    .padStart(6, "0")}`;
}

function pick<T>(
  values: T[],
  random: () => number,
) {
  return values[
    Math.floor(
      random()
      * values.length,
    )
    % values.length
  ];
}

function getServiceSlots(
  date: string,
) {
  const weekday =
    dateFromKey(
      date,
    ).getDay();

  if (weekday === 1) {
    return [];
  }

  if (weekday === 0) {
    return [
      "12:30",
      "13:15",
      "14:00",
      "15:00",
    ];
  }

  if (
    weekday === 5
    || weekday === 6
  ) {
    return [
      "19:00",
      "19:45",
      "20:30",
      "21:15",
      "22:00",
      "22:45",
      "23:30",
    ];
  }

  if (weekday === 4) {
    return [
      "19:00",
      "19:45",
      "20:30",
      "21:15",
      "22:00",
      "22:45",
    ];
  }

  return [
    "19:15",
    "20:00",
    "20:45",
    "21:30",
    "22:15",
  ];
}

function getOrderPool(
  categoryId: string,
) {
  return demuruDemoMenuItems
    .filter(
      (item) =>
        item.categoryId
        === categoryId,
    );
}

const STARTERS =
  getOrderPool(
    "demuru-cat-entradas",
  );
const MAINS = [
  ...getOrderPool(
    "demuru-cat-principales",
  ),
  ...getOrderPool(
    "demuru-cat-pastas",
  ),
];
const DESSERTS =
  getOrderPool(
    "demuru-cat-postres",
  );
const DRINKS =
  getOrderPool(
    "demuru-cat-bebidas",
  );

function addOrderItem(
  target:
    Map<
      string,
      DemuruDemoOrderLineItem
    >,
  item:
    typeof demuruDemoMenuItems[number],
  quantity: number,
) {
  const current =
    target.get(
      item.id,
    );

  if (current) {
    current.quantity +=
      quantity;
    return;
  }

  target.set(
    item.id,
    {
      id: item.id,
      menuItemId:
        item.id,
      name: item.name,
      price: item.price,
      quantity,
    },
  );
}

function buildReservationOrder(
  people: number,
  random: () => number,
) {
  const items =
    new Map<
      string,
      DemuruDemoOrderLineItem
    >();

  const starterCount =
    Math.max(
      1,
      Math.ceil(
        people / 3,
      ),
    );

  for (
    let index = 0;
    index < starterCount;
    index += 1
  ) {
    addOrderItem(
      items,
      pick(
        STARTERS,
        random,
      ),
      1,
    );
  }

  for (
    let index = 0;
    index < people;
    index += 1
  ) {
    addOrderItem(
      items,
      pick(
        MAINS,
        random,
      ),
      1,
    );
  }

  if (
    random()
    < 0.72
  ) {
    const dessertCount =
      Math.max(
        1,
        Math.ceil(
          people / 2,
        ),
      );

    for (
      let index = 0;
      index < dessertCount;
      index += 1
    ) {
      addOrderItem(
        items,
        pick(
          DESSERTS,
          random,
        ),
        1,
      );
    }
  }

  const drinkCount =
    Math.max(
      1,
      Math.ceil(
        people / 2,
      ),
    );

  for (
    let index = 0;
    index < drinkCount;
    index += 1
  ) {
    addOrderItem(
      items,
      pick(
        DRINKS,
        random,
      ),
      1,
    );
  }

  return [
    ...items.values(),
  ];
}

function buildDeliveryOrder(
  random: () => number,
) {
  const items =
    new Map<
      string,
      DemuruDemoOrderLineItem
    >();
  const mainCount =
    1
    + Math.floor(
      random() * 3,
    );

  for (
    let index = 0;
    index < mainCount;
    index += 1
  ) {
    addOrderItem(
      items,
      pick(
        MAINS,
        random,
      ),
      1,
    );
  }

  if (
    random()
    < 0.45
  ) {
    addOrderItem(
      items,
      pick(
        STARTERS,
        random,
      ),
      1,
    );
  }

  if (
    random()
    < 0.35
  ) {
    addOrderItem(
      items,
      pick(
        DESSERTS,
        random,
      ),
      1,
    );
  }

  addOrderItem(
    items,
    pick(
      DRINKS,
      random,
    ),
    1,
  );

  return [
    ...items.values(),
  ];
}

function orderTotal(
  items:
    DemuruDemoOrderLineItem[],
) {
  return items.reduce(
    (
      total,
      item,
    ) =>
      total
      + item.price
      * item.quantity,
    0,
  );
}

function orderText(
  items:
    DemuruDemoOrderLineItem[],
) {
  return items
    .map(
      (item) =>
        `${item.quantity}x ${item.name}`,
    )
    .join(
      ", ",
    );
}

function reservationPayment(
  total: number,
  random: () => number,
) {
  const selector =
    random();

  if (
    selector < 0.18
  ) {
    return {
      method: "cash",
      breakdown: {
        cash: total,
        card: 0,
        mercadoPago: 0,
        transfer: 0,
      },
    };
  }

  if (
    selector < 0.43
  ) {
    return {
      method: "card",
      breakdown: {
        cash: 0,
        card: total,
        mercadoPago: 0,
        transfer: 0,
      },
    };
  }

  if (
    selector < 0.68
  ) {
    return {
      method:
        "mercado_pago",
      breakdown: {
        cash: 0,
        card: 0,
        mercadoPago: total,
        transfer: 0,
      },
    };
  }

  if (
    selector < 0.86
  ) {
    return {
      method:
        "transfer",
      breakdown: {
        cash: 0,
        card: 0,
        mercadoPago: 0,
        transfer: total,
      },
    };
  }

  const cash =
    roundMoney(
      total
      * (
        0.3
        + random()
        * 0.2
      ),
    );
  const remainder =
    Math.max(
      total - cash,
      0,
    );

  if (
    random()
    < 0.5
  ) {
    return {
      method: "mixed",
      breakdown: {
        cash,
        card: remainder,
        mercadoPago: 0,
        transfer: 0,
      },
    };
  }

  return {
    method: "mixed",
    breakdown: {
      cash,
      card: 0,
      mercadoPago: 0,
      transfer: remainder,
    },
  };
}

function deliveryPayment(
  total: number,
  random: () => number,
) {
  const selector =
    random();

  if (
    selector < 0.25
  ) {
    return {
      label: "Efectivo",
      breakdown: {
        cash: total,
        card: 0,
        mercadoPago: 0,
        transfer: 0,
      },
    };
  }

  if (
    selector < 0.5
  ) {
    return {
      label: "Tarjeta",
      breakdown: {
        cash: 0,
        card: total,
        mercadoPago: 0,
        transfer: 0,
      },
    };
  }

  if (
    selector < 0.75
  ) {
    return {
      label:
        "Mercado Pago",
      breakdown: {
        cash: 0,
        card: 0,
        mercadoPago: total,
        transfer: 0,
      },
    };
  }

  return {
    label:
      "Transferencia",
    breakdown: {
      cash: 0,
      card: 0,
      mercadoPago: 0,
      transfer: total,
    },
  };
}

function historicalReservationStatus(
  random: () => number,
): DemoReservationStatus {
  const selector =
    random();

  if (
    selector < 0.84
  ) {
    return "completed";
  }

  if (
    selector < 0.94
  ) {
    return "cancelled";
  }

  return "no_show";
}

function futureReservationStatus(
  random: () => number,
): DemoReservationStatus {
  return random() < 0.68
    ? "confirmed"
    : "pending";
}

function buildCompletedKitchen(
  id: string,
  date: string,
  time: string,
  items:
    DemuruDemoOrderLineItem[],
) {
  const createdAt =
    timestampAt(
      date,
      time,
      8,
    );
  const startedAt =
    timestampAt(
      date,
      time,
      12,
    );
  const readyAt =
    timestampAt(
      date,
      time,
      34,
    );
  const completedAt =
    timestampAt(
      date,
      time,
      42,
    );

  return {
    kitchenStatus:
      "completed" as const,
    kitchenStartedAt:
      startedAt,
    kitchenReadyAt:
      readyAt,
    kitchenCompletedAt:
      completedAt,
    kitchenTickets: [
      {
        id:
          `kitchen-${id}-1`,
        status:
          "completed" as const,
        items,
        createdAt,
        startedAt,
        readyAt,
        completedAt,
      },
    ],
  };
}

function buildActiveKitchen(
  id: string,
  date: string,
  time: string,
  items:
    DemuruDemoOrderLineItem[],
  anchorMinutes: number,
) {
  const elapsed =
    anchorMinutes
    - minuteOfDay(
      time,
    );

  if (
    elapsed < 0
  ) {
    return {};
  }

  const createdAt =
    timestampAt(
      date,
      time,
      8,
    );

  if (
    elapsed < 18
  ) {
    return {
      consumptionStartedAt:
        createdAt,
      kitchenStatus:
        "pending" as const,
      kitchenTickets: [
        {
          id:
            `kitchen-${id}-1`,
          status:
            "pending" as const,
          items,
          createdAt,
        },
      ],
    };
  }

  if (
    elapsed < 38
  ) {
    const startedAt =
      timestampAt(
        date,
        time,
        12,
      );

    return {
      consumptionStartedAt:
        createdAt,
      kitchenStatus:
        "preparing" as const,
      kitchenStartedAt:
        startedAt,
      kitchenTickets: [
        {
          id:
            `kitchen-${id}-1`,
          status:
            "preparing" as const,
          items,
          createdAt,
          startedAt,
        },
      ],
    };
  }

  const startedAt =
    timestampAt(
      date,
      time,
      12,
    );
  const readyAt =
    timestampAt(
      date,
      time,
      34,
    );

  return {
    consumptionStartedAt:
      createdAt,
    kitchenStatus:
      "ready" as const,
    kitchenStartedAt:
      startedAt,
    kitchenReadyAt:
      readyAt,
    kitchenTickets: [
      {
        id:
          `kitchen-${id}-1`,
        status:
          "ready" as const,
        items,
        createdAt,
        startedAt,
        readyAt,
      },
    ],
  };
}

function buildReservations(
  anchorDate: Date,
) {
  const anchorKey =
    localDateKey(
      anchorDate,
    );
  const anchorMinutes =
    anchorDate.getHours()
    * 60
    + anchorDate.getMinutes();
  const reservations:
    DemuruDemoReservation[] = [];

  for (
    let offset =
      -DEMURU_DEMO_HISTORY_DAYS;
    offset
      <= DEMURU_DEMO_FUTURE_DAYS;
    offset += 1
  ) {
    const date =
      shiftDateKey(
        anchorKey,
        offset,
      );
    const slots =
      getServiceSlots(
        date,
      );

    if (
      slots.length === 0
    ) {
      continue;
    }

    const random =
      createRandom(
        `reservation:${date}`,
      );
    const weekday =
      dateFromKey(
        date,
      ).getDay();

    const minimumCount =
      offset === 0
        ? Math.min(
            slots.length,
            5,
          )
        : (
          weekday === 5
          || weekday === 6
        )
          ? Math.min(
              slots.length,
              2,
            )
          : 1;
    const maximumCount =
      offset === 0
        ? Math.min(
            slots.length,
            5,
          )
        : (
          weekday === 5
          || weekday === 6
        )
          ? Math.min(
              slots.length,
              4,
            )
          : Math.min(
              slots.length,
              3,
            );
    const count =
      minimumCount
      + Math.floor(
        random()
        * (
          maximumCount
          - minimumCount
          + 1
        ),
      );
    const selectedSlots =
      [...slots]
        .sort(
          () =>
            random()
            - 0.5,
        )
        .slice(
          0,
          count,
        )
        .sort(
          (
            first,
            second,
          ) =>
            minuteOfDay(
              first,
            )
            - minuteOfDay(
              second,
            ),
        );
    const usedClients =
      new Set<number>();

    selectedSlots.forEach(
      (
        time,
        index,
      ) => {
        let clientIndex =
          Math.floor(
            random()
            * CLIENTS.length,
          )
          % CLIENTS.length;

        while (
          usedClients.has(
            clientIndex,
          )
        ) {
          clientIndex =
            (
              clientIndex + 1
            )
            % CLIENTS.length;
        }

        usedClients.add(
          clientIndex,
        );

        const client =
          CLIENTS[
            clientIndex
          ];
        const people =
          2
          + Math.floor(
            random() * 5,
          );
        const id =
          `demo-res-${date}-${String(
            index + 1,
          ).padStart(
            2,
            "0",
          )}`;
        const slotMinutes =
          minuteOfDay(
            time,
          );

        let status:
          DemoReservationStatus;

        if (
          offset < 0
        ) {
          status =
            historicalReservationStatus(
              random,
            );
        } else if (
          offset > 0
        ) {
          status =
            futureReservationStatus(
              random,
            );
        } else if (
          anchorMinutes
          >= slotMinutes + 120
        ) {
          status =
            historicalReservationStatus(
              random,
            );
        } else if (
          anchorMinutes
          >= slotMinutes
        ) {
          status =
            "confirmed";
        } else {
          status =
            futureReservationStatus(
              random,
            );
        }

        const origin =
          pick(
            ORIGINS,
            random,
          );
        const tableName =
          status === "cancelled"
          || status === "no_show"
            ? ""
            : pick(
                TABLE_NAMES,
                random,
              );
        const note =
          random() < 0.55
            ? client.preference
            : client.note;
        const createdDaysBefore =
          1
          + Math.floor(
            random() * 9,
          );
        const createdAt =
          timestampAt(
            shiftDateKey(
              date,
              -createdDaysBefore,
            ),
            "11:30",
            Math.floor(
              random() * 240,
            ),
          );

        const reservation:
          DemuruDemoReservation = {
            id,
            date,
            time,
            client:
              client.name,
            people,
            phone:
              client.phone,
            email:
              client.email,
            durationMinutes:
              weekday === 0
                ? 90
                : 120,
            tableName,
            note:
              note || "—",
            status,
            origin,
            reservationCode:
              codeFromSeed(
                "RES",
                id,
              ),
            createdAt,
          };

        if (
          status === "confirmed"
        ) {
          const confirmationCandidate =
            timestampAt(
              date,
              time,
              -Math.max(
                30,
                Math.floor(
                  random()
                  * 720,
                ),
              ),
            );

          reservation.confirmedAt =
            offset === 0
              && new Date(
                confirmationCandidate,
              ).getTime()
              > anchorDate.getTime()
                ? new Date(
                    anchorDate.getTime()
                    - 5 * 60 * 1000,
                  ).toISOString()
                : confirmationCandidate;
        }

        if (
          status === "cancelled"
        ) {
          reservation.cancelledAt =
            timestampAt(
              date,
              time,
              -60,
            );
        }

        if (
          status === "no_show"
        ) {
          reservation.noShowAt =
            timestampAt(
              date,
              time,
              15,
            );
        }

        const shouldHaveConsumption =
          status === "completed"
          || (
            offset === 0
            && status === "confirmed"
            && anchorMinutes
              >= slotMinutes
          );

        if (
          shouldHaveConsumption
        ) {
          const items =
            buildReservationOrder(
              people,
              random,
            );
          const total =
            orderTotal(
              items,
            );

          reservation.orderLineItems =
            items;
          reservation.orderItems =
            orderText(
              items,
            );
          reservation.orderTotal =
            total;
          reservation.stockDiscounted =
            true;
          reservation.stockReturned =
            false;
          reservation.seatedAt =
            timestampAt(
              date,
              time,
              3,
            );
          reservation.consumptionStartedAt =
            timestampAt(
              date,
              time,
              8,
            );

          if (
            status === "completed"
          ) {
            const payment =
              reservationPayment(
                total,
                random,
              );
            const completedAt =
              timestampAt(
                date,
                time,
                weekday === 0
                  ? 82
                  : 105,
              );

            if (
              offset >= -7
            ) {
              Object.assign(
                reservation,
                buildCompletedKitchen(
                  id,
                  date,
                  time,
                  items,
                ),
              );
            } else {
              reservation.kitchenStatus =
                "completed";
              reservation.kitchenCompletedAt =
                timestampAt(
                  date,
                  time,
                  42,
                );
            }
            reservation.paymentMethod =
              payment.method;
            reservation.paymentBreakdown =
              payment.breakdown;
            reservation.paidAmount =
              total;
            reservation.paymentClosedAt =
              completedAt;
            reservation.completedAt =
              completedAt;
          } else {
            Object.assign(
              reservation,
              buildActiveKitchen(
                id,
                date,
                time,
                items,
                anchorMinutes,
              ),
            );
          }
        }

        reservations.push(
          reservation,
        );
      },
    );
  }

  return reservations.sort(
    (
      first,
      second,
    ) =>
      (
        `${first.date}T${first.time}`
      )
        .localeCompare(
          `${second.date}T${second.time}`,
        ),
  );
}

function buildDeliveries(
  anchorDate: Date,
) {
  const anchorKey =
    localDateKey(
      anchorDate,
    );
  const anchorMinutes =
    anchorDate.getHours()
    * 60
    + anchorDate.getMinutes();
  const deliveries:
    DemuruDemoDelivery[] = [];

  for (
    let offset =
      -DEMURU_DEMO_HISTORY_DAYS;
    offset <= 0;
    offset += 1
  ) {
    const date =
      shiftDateKey(
        anchorKey,
        offset,
      );
    const weekday =
      dateFromKey(
        date,
      ).getDay();

    if (
      weekday === 1
    ) {
      continue;
    }

    const random =
      createRandom(
        `delivery:${date}`,
      );
    const count =
      offset === 0
        ? 5
        : (
          weekday === 5
          || weekday === 6
        )
          ? 2
          + Math.floor(
              random() * 2,
            )
          : 1;
    const times =
      weekday === 0
        ? [
            "12:15",
            "13:00",
            "13:45",
            "14:30",
            "15:15",
          ]
        : [
            "19:10",
            "19:50",
            "20:30",
            "21:10",
            "21:50",
            "22:30",
          ];

    for (
      let index = 0;
      index < count;
      index += 1
    ) {
      const clientIndex =
        (
          Math.floor(
            random()
            * CLIENTS.length,
          )
          + index * 3
        )
        % CLIENTS.length;
      const client =
        CLIENTS[
          clientIndex
        ];
      const time =
        times[
          index
          % times.length
        ];
      const deliveryType:
        DemoDeliveryType =
          random() < 0.68
            ? "delivery"
            : "pickup";
      const source =
        offset === 0
        && index === 0
          ? "web" as const
          : random() < 0.66
            ? "web" as const
            : "manual" as const;
      const items =
        buildDeliveryOrder(
          random,
        );
      const deliveryCost =
        deliveryType
        === "delivery"
          ? 1200
          : 0;
      const total =
        orderTotal(
          items,
        )
        + deliveryCost;
      const payment =
        deliveryPayment(
          total,
          random,
        );
      const id =
        `demo-env-${date}-${String(
          index + 1,
        ).padStart(
          2,
          "0",
        )}`;
      const timeMinutes =
        minuteOfDay(
          time,
        );
      let status:
        DemoDeliveryStatus;
      let needsAcceptance =
        false;
      let accepted =
        false;

      if (
        offset < 0
      ) {
        if (
          random() < 0.075
        ) {
          status =
            "cancelled";
        } else {
          status =
            "completed";
          accepted =
            true;
        }
      } else if (
        anchorMinutes
        < timeMinutes - 20
      ) {
        status =
          "confirmed";
        needsAcceptance =
          source === "web"
          && index === 0;
        accepted =
          !needsAcceptance;
      } else if (
        anchorMinutes
        < timeMinutes + 65
      ) {
        status =
          "confirmed";
        accepted =
          true;
      } else {
        status =
          random() < 0.08
            ? "cancelled"
            : "completed";
        accepted =
          status
          === "completed";
      }

      const scheduledCreatedAt =
        timestampAt(
          date,
          time,
          source === "web"
            ? -45
            : -30,
        );
      const createdAt =
        offset === 0
        && new Date(
          scheduledCreatedAt,
        ).getTime()
        > anchorDate.getTime()
          ? new Date(
              anchorDate.getTime()
              - (
                index + 1
              )
              * 8
              * 60
              * 1000,
            ).toISOString()
          : scheduledCreatedAt;
      const delivery:
        DemuruDemoDelivery = {
          id,
          date,
          time,
          client:
            client.name,
          phone:
            client.phone,
          address:
            deliveryType
            === "pickup"
              ? "Retira en local"
              : DELIVERY_ADDRESSES[
                  clientIndex
                  % DELIVERY_ADDRESSES.length
                ],
          deliveryType,
          order:
            orderText(
              items,
            ),
          orderItems:
            items,
          total,
          payment:
            payment.label,
          paymentBreakdown:
            payment.breakdown,
          note:
            deliveryType
            === "pickup"
              ? "Retira a nombre del cliente."
              : (
                random() < 0.35
                  ? "Avisar antes de salir."
                  : "—"
              ),
          status,
          source,
          needsAcceptance,
          trackingId:
            codeFromSeed(
              "PED",
              id,
            ),
          stockDiscounted:
            accepted
            && status
            !== "cancelled",
          stockReturned:
            status
            === "cancelled"
            && accepted,
          createdAt,
        };

      if (
        accepted
      ) {
        const scheduledAcceptedAt =
          timestampAt(
            date,
            time,
            -20,
          );

        delivery.acceptedAt =
          offset === 0
          && new Date(
            scheduledAcceptedAt,
          ).getTime()
          > anchorDate.getTime()
            ? new Date(
                new Date(
                  createdAt,
                ).getTime()
                + 5 * 60 * 1000,
              ).toISOString()
            : scheduledAcceptedAt;
      }

      if (
        status
        === "cancelled"
      ) {
        delivery.cancelledAt =
          timestampAt(
            date,
            time,
            -5,
          );
      } else if (
        status
        === "completed"
      ) {
        const kitchen =
          buildCompletedKitchen(
            id,
            date,
            time,
            items,
          );
        const readyAt =
          timestampAt(
            date,
            time,
            28,
          );
        const deliveredAt =
          timestampAt(
            date,
            time,
            deliveryType
            === "delivery"
              ? 55
              : 38,
          );

        if (
          offset >= -7
        ) {
          Object.assign(
            delivery,
            kitchen,
          );
        } else {
          delivery.kitchenStatus =
            "completed";
          delivery.kitchenCompletedAt =
            timestampAt(
              date,
              time,
              42,
            );
        }
        delivery.preparingAt =
          timestampAt(
            date,
            time,
            4,
          );
        delivery.readyAt =
          readyAt;
        delivery.onTheWayAt =
          deliveryType
          === "delivery"
            ? timestampAt(
                date,
                time,
                34,
              )
            : undefined;
        delivery.deliveredAt =
          deliveredAt;
      } else if (
        accepted
        && offset === 0
        && anchorMinutes
          >= timeMinutes
      ) {
        const activeKitchen =
          buildActiveKitchen(
            id,
            date,
            time,
            items,
            anchorMinutes,
          );

        Object.assign(
          delivery,
          activeKitchen,
        );
        delivery.preparingAt =
          timestampAt(
            date,
            time,
            4,
          );

        if (
          activeKitchen
            .kitchenStatus
          === "ready"
        ) {
          delivery.readyAt =
            timestampAt(
              date,
              time,
              28,
            );
        }
      }

      deliveries.push(
        delivery,
      );
    }
  }

  return deliveries.sort(
    (
      first,
      second,
    ) =>
      (
        `${first.date}T${first.time}`
      )
        .localeCompare(
          `${second.date}T${second.time}`,
        ),
  );
}

function buildExpenses(
  anchorDate: Date,
) {
  const anchorKey =
    localDateKey(
      anchorDate,
    );
  const patterns = [
    {
      key: "verduleria",
      frequency: 4,
      description:
        "Compra de frutas, verduras y hierbas",
      provider:
        "Huerta Pinamar",
      category:
        "Insumos",
      baseAmount:
        82000,
      paymentMethod:
        "Transferencia",
    },
    {
      key: "carniceria",
      frequency: 7,
      description:
        "Reposición de carnes",
      provider:
        "Carnes del Tuyú",
      category:
        "Insumos",
      baseAmount:
        145000,
      paymentMethod:
        "Transferencia",
    },
    {
      key: "pescaderia",
      frequency: 6,
      description:
        "Pescados y mariscos frescos",
      provider:
        "Pescados Atlántico",
      category:
        "Insumos",
      baseAmount:
        132000,
      paymentMethod:
        "Transferencia",
    },
    {
      key: "lacteos",
      frequency: 8,
      description:
        "Lácteos y quesos",
      provider:
        "Lácteos del Sur",
      category:
        "Insumos",
      baseAmount:
        96000,
      paymentMethod:
        "Mercado Pago",
    },
    {
      key: "almacen",
      frequency: 10,
      description:
        "Secos y almacén",
      provider:
        "Almacén Mayorista Centro",
      category:
        "Insumos",
      baseAmount:
        118000,
      paymentMethod:
        "Tarjeta",
    },
    {
      key: "bodega",
      frequency: 14,
      description:
        "Vinos y espumantes",
      provider:
        "Bodega Costa",
      category:
        "Bebidas",
      baseAmount:
        155000,
      paymentMethod:
        "Transferencia",
    },
    {
      key: "limpieza",
      frequency: 15,
      description:
        "Productos de limpieza",
      provider:
        "Higiene Costa",
      category:
        "Limpieza",
      baseAmount:
        44000,
      paymentMethod:
        "Efectivo",
    },
  ];
  const expenses:
    DemuruDemoExpense[] = [];

  patterns.forEach(
    (pattern) => {
      for (
        let offset =
          -DEMURU_DEMO_HISTORY_DAYS;
        offset <= -1;
        offset +=
          pattern.frequency
      ) {
        const date =
          shiftDateKey(
            anchorKey,
            offset,
          );
        const random =
          createRandom(
            `expense:${pattern.key}:${date}`,
          );
        const amount =
          roundMoney(
            pattern.baseAmount
            * (
              0.82
              + random()
              * 0.36
            ),
          );
        const createdAt =
          timestampAt(
            date,
            "10:00",
            Math.floor(
              random() * 180,
            ),
          );

        expenses.push(
          {
            id:
              `demo-exp-${pattern.key}-${date}`,
            businessId:
              "demo-demuru",
            date,
            dueDate:
              shiftDateKey(
                date,
                3,
              ),
            description:
              pattern.description,
            provider:
              pattern.provider,
            category:
              pattern.category,
            amount,
            status: "paid",
            paymentMethod:
              pattern.paymentMethod,
            createdAt,
            updatedAt:
              createdAt,
            paidAt:
              timestampAt(
                date,
                "16:00",
                Math.floor(
                  random() * 120,
                ),
              ),
          },
        );
      }
    },
  );

  const monthKeys =
    new Set<string>();

  for (
    let offset =
      -DEMURU_DEMO_HISTORY_DAYS;
    offset <= 7;
    offset += 1
  ) {
    monthKeys.add(
      shiftDateKey(
        anchorKey,
        offset,
      ).slice(
        0,
        7,
      ),
    );
  }

  for (
    const month
    of monthKeys
  ) {
    const rentDate =
      `${month}-05`;
    const serviceDate =
      `${month}-12`;

    if (
      rentDate
      >= shiftDateKey(
        anchorKey,
        -DEMURU_DEMO_HISTORY_DAYS,
      )
      && rentDate
      <= shiftDateKey(
        anchorKey,
        7,
      )
    ) {
      const pending =
        rentDate >= anchorKey;

      expenses.push(
        {
          id:
            `demo-exp-alquiler-${month}`,
          businessId:
            "demo-demuru",
          date:
            rentDate,
          dueDate:
            rentDate,
          description:
            "Alquiler del local",
          provider:
            "Administración Bunge",
          category:
            "Alquiler",
          amount:
            780000,
          status:
            pending
              ? "pending"
              : "paid",
          paymentMethod:
            "Transferencia",
          createdAt:
            timestampAt(
              shiftDateKey(
                rentDate,
                -3,
              ),
              "09:00",
            ),
          updatedAt:
            rentDate === anchorKey
              ? new Date(
                  anchorDate.getTime()
                  - 10 * 60 * 1000,
                ).toISOString()
              : timestampAt(
                  rentDate,
                  "09:30",
                ),
          paidAt:
            pending
              ? undefined
              : timestampAt(
                  rentDate,
                  "09:30",
                ),
        },
      );
    }

    if (
      serviceDate
      >= shiftDateKey(
        anchorKey,
        -DEMURU_DEMO_HISTORY_DAYS,
      )
      && serviceDate
      <= shiftDateKey(
        anchorKey,
        7,
      )
    ) {
      const pending =
        serviceDate >= anchorKey;

      expenses.push(
        {
          id:
            `demo-exp-servicios-${month}`,
          businessId:
            "demo-demuru",
          date:
            serviceDate,
          dueDate:
            shiftDateKey(
              serviceDate,
              5,
            ),
          description:
            "Electricidad, gas e internet",
          provider:
            "Servicios del local",
          category:
            "Servicios",
          amount:
            238000,
          status:
            pending
              ? "pending"
              : "paid",
          paymentMethod:
            "Mercado Pago",
          createdAt:
            serviceDate === anchorKey
              ? new Date(
                  anchorDate.getTime()
                  - 20 * 60 * 1000,
                ).toISOString()
              : timestampAt(
                  serviceDate,
                  "08:30",
                ),
          updatedAt:
            serviceDate === anchorKey
              ? new Date(
                  anchorDate.getTime()
                  - 10 * 60 * 1000,
                ).toISOString()
              : timestampAt(
                  serviceDate,
                  "13:00",
                ),
          paidAt:
            pending
              ? undefined
              : timestampAt(
                  serviceDate,
                  "13:00",
                ),
        },
      );
    }
  }

  expenses.push(
    {
      id:
        `demo-exp-pendiente-${anchorKey}`,
      businessId:
        "demo-demuru",
      date:
        anchorKey,
      dueDate:
        shiftDateKey(
          anchorKey,
          5,
        ),
      description:
        "Mantenimiento preventivo de cocina",
      provider:
        "Servicio Técnico Atlántico",
      category:
        "Mantenimiento",
      amount:
        68000,
      status:
        "pending",
      paymentMethod:
        "Transferencia",
      createdAt:
        new Date(
          anchorDate.getTime()
          - 20 * 60 * 1000,
        ).toISOString(),
      updatedAt:
        new Date(
          anchorDate.getTime()
          - 10 * 60 * 1000,
        ).toISOString(),
    },
  );

  return expenses.sort(
    (
      first,
      second,
    ) =>
      first.date.localeCompare(
        second.date,
      ),
  );
}

function emptyPaymentBreakdown():
DemoPaymentBreakdown {
  return {
    cash: 0,
    card: 0,
    mercadoPago: 0,
    transfer: 0,
  };
}

function addBreakdown(
  target:
    DemoPaymentBreakdown,
  source:
    Partial<DemoPaymentBreakdown>,
) {
  target.cash +=
    Number(
      source.cash,
    ) || 0;
  target.card +=
    Number(
      source.card,
    ) || 0;
  target.mercadoPago +=
    Number(
      source.mercadoPago,
    ) || 0;
  target.transfer +=
    Number(
      source.transfer,
    ) || 0;
}

function deliveryBreakdown(
  delivery:
    DemuruDemoDelivery,
): DemoPaymentBreakdown {
  if (
    delivery.paymentBreakdown
  ) {
    return {
      cash:
        Number(
          delivery
            .paymentBreakdown
            .cash,
        ) || 0,
      card:
        Number(
          delivery
            .paymentBreakdown
            .card,
        ) || 0,
      mercadoPago:
        Number(
          delivery
            .paymentBreakdown
            .mercadoPago,
        ) || 0,
      transfer:
        Number(
          delivery
            .paymentBreakdown
            .transfer,
        ) || 0,
    };
  }

  const result =
    emptyPaymentBreakdown();
  const normalized =
    delivery.payment
      .trim()
      .toLowerCase();

  if (
    normalized.includes(
      "mercado",
    )
  ) {
    result.mercadoPago =
      delivery.total;
  } else if (
    normalized.includes(
      "transfer",
    )
  ) {
    result.transfer =
      delivery.total;
  } else if (
    normalized.includes(
      "tarjeta",
    )
  ) {
    result.card =
      delivery.total;
  } else {
    result.cash =
      delivery.total;
  }

  return result;
}

function buildCashRegisters(
  anchorDate: Date,
  reservations:
    DemuruDemoReservation[],
  deliveries:
    DemuruDemoDelivery[],
  expenses:
    DemuruDemoExpense[],
) {
  const anchorKey =
    localDateKey(
      anchorDate,
    );
  const startDate =
    shiftDateKey(
      anchorKey,
      -90,
    );
  const saleDates =
    new Set<string>();

  reservations
    .filter(
      (reservation) =>
        reservation.status
        === "completed"
        && reservation.date
          >= startDate,
    )
    .forEach(
      (reservation) =>
        saleDates.add(
          reservation.date,
        ),
    );
  deliveries
    .filter(
      (delivery) =>
        delivery.status
        === "completed"
        && delivery.date
          >= startDate,
    )
    .forEach(
      (delivery) =>
        saleDates.add(
          delivery.date,
        ),
    );
  saleDates.add(
    anchorKey,
  );

  const cashRegisters:
    DemuruDemoCashRegister[] = [];

  [
    ...saleDates,
  ]
    .sort()
    .forEach(
      (date) => {
        const payments =
          emptyPaymentBreakdown();

        reservations
          .filter(
            (reservation) =>
              reservation.date
              === date
              && reservation.status
                === "completed",
          )
          .forEach(
            (reservation) =>
              addBreakdown(
                payments,
                reservation
                  .paymentBreakdown
                ?? {},
              ),
          );

        deliveries
          .filter(
            (delivery) =>
              delivery.date
              === date
              && delivery.status
                === "completed",
          )
          .forEach(
            (delivery) =>
              addBreakdown(
                payments,
                deliveryBreakdown(
                  delivery,
                ),
              ),
          );

        const cashExpenses =
          expenses
            .filter(
              (expense) =>
                expense.date
                === date
                && expense.status
                  === "paid"
                && expense
                  .paymentMethod
                  .toLowerCase()
                  .includes(
                    "efectivo",
                  ),
            )
            .reduce(
              (
                total,
                expense,
              ) =>
                total
                + expense.amount,
              0,
            );
        const random =
          createRandom(
            `cash:${date}`,
          );
        const openingAmount =
          dateFromKey(
            date,
          ).getDay()
          === 5
          || dateFromKey(
            date,
          ).getDay()
          === 6
            ? 180000
            : 120000;
        const movements:
          DemoCashMovement[] = [];

        if (
          date !== anchorKey
          && random() < 0.32
        ) {
          const withdrawal =
            10000
            + Math.floor(
              random() * 4,
            ) * 5000;

          movements.push(
            {
              id:
                `cash-mov-${date}-1`,
              type:
                "withdrawal",
              amount:
                withdrawal,
              reason:
                "Fondo menor y compras operativas",
              createdAt:
                timestampAt(
                  date,
                  "21:15",
                ),
            },
          );
        }

        if (
          date !== anchorKey
          && random() < 0.12
        ) {
          movements.push(
            {
              id:
                `cash-mov-${date}-2`,
              type:
                "income",
              amount:
                10000,
              reason:
                "Refuerzo de cambio",
              createdAt:
                timestampAt(
                  date,
                  "20:10",
                ),
            },
          );
        }

        const adjustment =
          movements.reduce(
            (
              total,
              movement,
            ) =>
              total
              + (
                movement.type
                === "income"
                  ? movement.amount
                  : -movement.amount
              ),
            0,
          );
        const expectedCash =
          openingAmount
          + payments.cash
          - cashExpenses
          + adjustment;

        if (
          date === anchorKey
        ) {
          cashRegisters.push(
            {
              id:
                `cash-${date}`,
              date,
              status:
                "open",
              openingAmount,
              adjustment,
              movements,
              actualCash:
                null,
              expectedCash:
                null,
              difference:
                null,
              salesSnapshot:
                null,
              cashExpensesSnapshot:
                null,
              notes:
                "",
              openedAt:
                new Date(
                  anchorDate.getTime()
                  - 30
                  * 60
                  * 1000,
                ).toISOString(),
              closedAt:
                null,
            },
          );
          return;
        }

        const difference =
          random() < 0.82
            ? 0
            : (
              random() < 0.5
                ? -500
                : 500
            );

        cashRegisters.push(
          {
            id:
              `cash-${date}`,
            date,
            status:
              "closed",
            openingAmount,
            adjustment,
            movements,
            actualCash:
              expectedCash
              + difference,
            expectedCash,
            difference,
            salesSnapshot:
              payments,
            cashExpensesSnapshot:
              cashExpenses,
            notes:
              difference === 0
                ? "Cierre sin diferencias."
                : "Diferencia menor registrada en el cierre.",
            openedAt:
              timestampAt(
                date,
                dateFromKey(
                  date,
                ).getDay()
                === 0
                  ? "11:30"
                  : "18:00",
              ),
            closedAt:
              timestampAt(
                date,
                dateFromKey(
                  date,
                ).getDay()
                === 0
                  ? "16:30"
                  : "23:55",
              ),
          },
        );
      },
    );

  return cashRegisters;
}

function convertQuantity(
  quantity: number,
  fromUnit: string,
  toUnit: string,
) {
  if (
    fromUnit === toUnit
  ) {
    return quantity;
  }

  if (
    fromUnit === "g"
    && toUnit === "kg"
  ) {
    return quantity / 1000;
  }

  if (
    fromUnit === "kg"
    && toUnit === "g"
  ) {
    return quantity * 1000;
  }

  if (
    fromUnit === "ml"
    && toUnit === "l"
  ) {
    return quantity / 1000;
  }

  if (
    fromUnit === "l"
    && toUnit === "ml"
  ) {
    return quantity * 1000;
  }

  return quantity;
}

function applyOrderUsage(
  usage:
    Map<string, number>,
  items:
    DemuruDemoOrderLineItem[],
) {
  const stockById =
    new Map(
      demuruDemoStockProducts.map(
        (product) => [
          product.id,
          product,
        ],
      ),
    );
  const recipeByMenuItemId =
    new Map(
      demuruDemoRecipes.map(
        (recipe) => [
          recipe.menuItemId,
          recipe,
        ],
      ),
    );

  items.forEach(
    (item) => {
      const recipe =
        recipeByMenuItemId.get(
          item.menuItemId,
        );

      recipe?.ingredients.forEach(
        (ingredient) => {
          const product =
            stockById.get(
              ingredient
                .stockProductId,
            );

          if (!product) {
            return;
          }

          const quantity =
            convertQuantity(
              ingredient.quantity,
              ingredient.unit,
              product.unit,
            )
            * item.quantity;

          usage.set(
            product.id,
            (
              usage.get(
                product.id,
              )
              ?? 0
            )
            + quantity,
          );
        },
      );
    },
  );
}

function buildStockData(
  anchorDate: Date,
  reservations:
    DemuruDemoReservation[],
  deliveries:
    DemuruDemoDelivery[],
) {
  const anchorKey =
    localDateKey(
      anchorDate,
    );
  const usageStart =
    shiftDateKey(
      anchorKey,
      -DEMURU_DEMO_STOCK_USAGE_DAYS,
    );
  const historyStart =
    shiftDateKey(
      anchorKey,
      -DEMURU_DEMO_STOCK_HISTORY_DAYS,
    );
  const usage =
    new Map<string, number>();

  reservations
    .filter(
      (reservation) =>
        reservation.status
        === "completed"
        && reservation.date
          >= usageStart,
    )
    .forEach(
      (reservation) =>
        applyOrderUsage(
          usage,
          reservation
            .orderLineItems
          ?? [],
        ),
    );

  deliveries
    .filter(
      (delivery) =>
        delivery.status
        === "completed"
        && delivery.date
          >= usageStart,
    )
    .forEach(
      (delivery) =>
        applyOrderUsage(
          usage,
          delivery.orderItems,
        ),
    );

  const stockProducts =
    demuruDemoStockProducts.map(
      (product) => {
        const consumed =
          roundQuantity(
            usage.get(
              product.id,
            )
            ?? 0,
          );
        const lowStock =
          LOW_STOCK_IDS.has(
            product.id,
          );
        const targetAvailable =
          roundQuantity(
            lowStock
              ? Math.max(
                  product.alertBelow
                  * 0.62,
                  product.unit
                  === "unidad"
                    || product.unit
                      === "botella"
                    ? 1
                    : 0.05,
                )
              : Math.max(
                  product.alertBelow
                  * 2.4,
                  product.totalStock
                  * 0.32,
                ),
          );

        return {
          ...product,
          totalStock:
            roundQuantity(
              consumed
              + targetAvailable,
            ),
          consumedBySales:
            consumed,
          lastUpdated:
            anchorDate
              .toISOString(),
          note:
            lowStock
              ? `${product.note ? `${product.note} ` : ""}Demo: nivel bajo para mostrar alerta de reposición.`
              : product.note,
        };
      },
    );
  const stockById =
    new Map(
      stockProducts.map(
        (product) => [
          product.id,
          product,
        ],
      ),
    );
  const movements:
    DemuruDemoStockMovement[] = [];

  function appendTransactionMovements({
    origin,
    referenceId,
    client,
    createdAt,
    items,
  }: {
    origin:
      "reservas"
      | "envios";
    referenceId: string;
    client: string;
    createdAt: string;
    items:
      DemuruDemoOrderLineItem[];
  }) {
    const transactionUsage =
      new Map<string, number>();

    applyOrderUsage(
      transactionUsage,
      items,
    );

    [
      ...transactionUsage.entries(),
    ].forEach(
      (
        [
          productId,
          quantity,
        ],
        index,
      ) => {
        const product =
          stockById.get(
            productId,
          );

        if (!product) {
          return;
        }

        movements.push(
          {
            id:
              `demo-stock-${origin}-${referenceId}-${String(
                index + 1,
              ).padStart(
                2,
                "0",
              )}`,
            createdAt,
            type:
              "discount",
            origin,
            productId,
            productName:
              product.name,
            quantity:
              roundQuantity(
                quantity,
              ),
            unit:
              product.unit,
            label:
              origin
              === "reservas"
                ? "Consumo de reserva"
                : "Consumo de envío",
            detail:
              `Descuento automático asociado a ${referenceId}.`,
            referenceId,
            client,
            operationId:
              `demo-operation-${referenceId}`,
          },
        );
      },
    );
  }

  reservations
    .filter(
      (reservation) =>
        reservation.status
        === "completed"
        && reservation.date
          >= historyStart,
    )
    .forEach(
      (reservation) =>
        appendTransactionMovements(
          {
            origin:
              "reservas",
            referenceId:
              reservation.id,
            client:
              reservation.client,
            createdAt:
              reservation
                .paymentClosedAt
              ?? timestampAt(
                reservation.date,
                reservation.time,
                100,
              ),
            items:
              reservation
                .orderLineItems
              ?? [],
          },
        ),
    );

  deliveries
    .filter(
      (delivery) =>
        delivery.status
        === "completed"
        && delivery.date
          >= historyStart,
    )
    .forEach(
      (delivery) =>
        appendTransactionMovements(
          {
            origin:
              "envios",
            referenceId:
              delivery.id,
            client:
              delivery.client,
            createdAt:
              delivery
                .deliveredAt
              ?? timestampAt(
                delivery.date,
                delivery.time,
                55,
              ),
            items:
              delivery.orderItems,
          },
        ),
    );

  const replenishmentDates =
    [
      1,
      7,
      13,
    ].map(
      (daysAgo) =>
        shiftDateKey(
          anchorKey,
          -daysAgo,
        ),
    );
  const restockProducts =
    stockProducts
      .filter(
        (product) =>
          (
            usage.get(
              product.id,
            )
            ?? 0
          ) > 0,
      )
      .sort(
        (
          first,
          second,
        ) =>
          (
            usage.get(
              second.id,
            )
            ?? 0
          )
          - (
            usage.get(
              first.id,
            )
            ?? 0
          ),
      )
      .slice(
        0,
        18,
      );

  replenishmentDates.forEach(
    (
      date,
      dateIndex,
    ) => {
      restockProducts.forEach(
        (
          product,
          productIndex,
        ) => {
          const amount =
            Math.max(
              product.alertBelow
              * 2,
              (
                usage.get(
                  product.id,
                )
                ?? 0
              )
              / 3,
            );

          movements.push(
            {
              id:
                `demo-stock-entry-${dateIndex + 1}-${product.id}`,
              createdAt:
                timestampAt(
                  date,
                  "10:30",
                  productIndex * 2,
                ),
              type:
                "entry",
              origin:
                "manual",
              productId:
                product.id,
              productName:
                product.name,
              quantity:
                roundQuantity(
                  amount,
                ),
              unit:
                product.unit,
              label:
                "Reposición de proveedor",
              detail:
                `Ingreso periódico de ${product.supplier}.`,
              operationId:
                `demo-restock-${date}-${product.id}`,
            },
          );
        },
      );
    },
  );

  return {
    stockProducts,
    stockMovements:
      movements
        .sort(
          (
            first,
            second,
          ) =>
            second.createdAt
              .localeCompare(
                first.createdAt,
              ),
        )
        .slice(
          0,
          650,
        ),
  };
}

function buildClientData(
  anchorDate: Date,
  reservations:
    DemuruDemoReservation[],
  deliveries:
    DemuruDemoDelivery[],
) {
  const anchorKey =
    localDateKey(
      anchorDate,
    );
  const clientMeta:
    Record<
      string,
      DemuruDemoClientMeta
    > = {};
  const clients:
    DemuruDemoClientFallback[] = [];

  CLIENTS.forEach(
    (
      client,
      index,
    ) => {
      const stableId =
        normalizePhone(
          client.phone,
        );
      const reservationHistory =
        reservations.filter(
          (reservation) =>
            normalizePhone(
              reservation.phone,
            )
            === stableId,
        );
      const deliveryHistory =
        deliveries.filter(
          (delivery) =>
            normalizePhone(
              delivery.phone,
            )
            === stableId,
        );
      const allDates = [
        ...reservationHistory
          .filter(
            (reservation) =>
              reservation.date
              <= anchorKey,
          )
          .map(
            (reservation) =>
              reservation.date,
          ),
        ...deliveryHistory
          .filter(
            (delivery) =>
              delivery.date
              <= anchorKey,
          )
          .map(
            (delivery) =>
              delivery.date,
          ),
      ].sort();
      const lastVisit =
        allDates.at(
          -1,
        )
        ?? "";
      const noShows =
        reservationHistory
          .filter(
            (reservation) =>
              reservation.status
              === "no_show",
          )
          .length;
      const activityCount =
        reservationHistory.length
        + deliveryHistory.length;
      const status:
        DemuruDemoClientFallback["status"] =
          noShows > 0
            && index % 7 === 0
            ? "no_show"
            : activityCount >= 8
              ? "frequent"
              : activityCount <= 1
                ? "new"
                : "active";

      clientMeta[
        stableId
      ] = {
        birthDate:
          client.birthDate,
        internalNotes:
          client.note,
      };

      clients.push(
        {
          id:
            `demo-client-${String(
              index + 1,
            ).padStart(
              2,
              "0",
            )}`,
          name:
            client.name,
          initials:
            client.name
              .split(
                /\s+/u,
              )
              .slice(
                0,
                2,
              )
              .map(
                (part) =>
                  part[0]
                    ?.toUpperCase()
                  ?? "",
              )
              .join(
                "",
              ),
          phone:
            client.phone,
          email:
            client.email,
          lastVisit:
            lastVisit
              ? dateLabel(
                  lastVisit,
                )
              : "Sin visitas",
          reservations:
            reservationHistory.length,
          preference:
            client.preference,
          status,
          note:
            client.note,
        },
      );
    },
  );

  const manualClients:
    DemuruDemoManualClient[] = [
      {
        id:
          "5492254550101",
        name:
          "Marina Gaitán",
        email:
          "marina.gaitan@email.com",
        phone:
          "2254 550101",
        birthDate:
          "1992-03-11",
        internalNotes:
          "Contacto de hotel. Todavía no reservó.",
        preferences:
          "Mesa tranquila",
        tags: [
          "Nuevo",
          "Hotel",
        ],
        isActive:
          true,
        createdAt:
          shiftDateKey(
            anchorKey,
            -6,
          ),
      },
      {
        id:
          "5492254550102",
        name:
          "Leandro Paz",
        email:
          "leandro.paz@email.com",
        phone:
          "2254 550102",
        birthDate:
          "1986-10-02",
        internalNotes:
          "Pidió información para una cena empresarial.",
        preferences:
          "Grupo grande",
        tags: [
          "Empresa",
          "Lead",
        ],
        isActive:
          true,
        createdAt:
          shiftDateKey(
            anchorKey,
            -4,
          ),
      },
      {
        id:
          "5492254550103",
        name:
          "Josefina Méndez",
        email:
          "josefina.mendez@email.com",
        phone:
          "2254 550103",
        birthDate:
          "1995-07-16",
        internalNotes:
          "Consulta por opciones vegetarianas.",
        preferences:
          "Vegetariana",
        tags: [
          "Nuevo",
          "Vegetariana",
        ],
        isActive:
          true,
        createdAt:
          shiftDateKey(
            anchorKey,
            -2,
          ),
      },
      {
        id:
          "5492254550104",
        name:
          "Alejandro Bosco",
        email:
          "alejandro.bosco@email.com",
        phone:
          "2254 550104",
        birthDate:
          "1979-12-21",
        internalNotes:
          "Recomendado por cliente frecuente.",
        preferences:
          "Vinos",
        tags: [
          "Referido",
        ],
        isActive:
          true,
        createdAt:
          shiftDateKey(
            anchorKey,
            -9,
          ),
      },
      {
        id:
          "5492254550105",
        name:
          "Malena Quiroga",
        email:
          "malena.quiroga@email.com",
        phone:
          "2254 550105",
        birthDate:
          "1990-04-28",
        internalNotes:
          "Consulta por cumpleaños para 10 personas.",
        preferences:
          "Mesa grande",
        tags: [
          "Celebraciones",
          "Lead",
        ],
        isActive:
          true,
        createdAt:
          shiftDateKey(
            anchorKey,
            -1,
          ),
      },
    ];

  return {
    clientMeta,
    manualClients,
    clients,
  };
}

export function createDemuruDemoOperationalSnapshot(
  anchorDate =
    new Date(),
): DemuruDemoOperationalSnapshot {
  const normalizedAnchor =
    new Date(
      anchorDate.getFullYear(),
      anchorDate.getMonth(),
      anchorDate.getDate(),
      anchorDate.getHours(),
      anchorDate.getMinutes(),
      0,
      0,
    );
  const reservations =
    buildReservations(
      normalizedAnchor,
    );
  const deliveries =
    buildDeliveries(
      normalizedAnchor,
    );
  const expenses =
    buildExpenses(
      normalizedAnchor,
    );
  const cashRegisters =
    buildCashRegisters(
      normalizedAnchor,
      reservations,
      deliveries,
      expenses,
    );
  const stock =
    buildStockData(
      normalizedAnchor,
      reservations,
      deliveries,
    );
  const clients =
    buildClientData(
      normalizedAnchor,
      reservations,
      deliveries,
    );

  return {
    anchorDate:
      localDateKey(
        normalizedAnchor,
      ),
    reservations,
    deliveries,
    expenses,
    cashRegisters,
    stockProducts:
      stock.stockProducts,
    stockMovements:
      stock.stockMovements,
    clientMeta:
      clients.clientMeta,
    manualClients:
      clients.manualClients,
    clients:
      clients.clients,
    summary: {
      reservations:
        reservations.length,
      completedReservations:
        reservations.filter(
          (reservation) =>
            reservation.status
            === "completed",
        ).length,
      deliveries:
        deliveries.length,
      completedDeliveries:
        deliveries.filter(
          (delivery) =>
            delivery.status
            === "completed",
        ).length,
      expenses:
        expenses.length,
      cashRegisters:
        cashRegisters.length,
      stockMovements:
        stock.stockMovements.length,
    },
  };
}
