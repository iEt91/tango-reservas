import { createV2OperationalId } from "@/lib/v2-operational-storage";

const STOCK_PRODUCTS_STORAGE_KEY = "tango-v2-stock-products";
const STOCK_PRODUCTS_EVENT = "tango-v2-stock-products-updated";
const STOCK_MOVEMENTS_STORAGE_KEY = "tango-v2-stock-movements";
const LOCAL_CONFIG_STORAGE_KEY = "tango-v2-local-config-v1";

type DeliveryOrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type DeliveryStockMovement = {
  productId: string;
  productName: string;
  quantity: number;
};

type StockProduct = {
  id: string;
  name: string;
  unit: string;
  consumedBySales: number;
  lastUpdated?: string;
};

type RecipeIngredient = {
  stockProductId?: string;
  name: string;
  quantity: number;
  unit: string;
};

type RecipeConfig = {
  menuItemId?: string;
  ingredients: RecipeIngredient[];
};

export type StockReservableDelivery = {
  id: string;
  client: string;
  order: string;
  orderItems?: DeliveryOrderItem[];
  note: string;
  status: string;
  needsAcceptance?: boolean;
  stockDiscounted?: boolean;
  stockReturned?: boolean;
  stockMovements?: DeliveryStockMovement[];
};

function readJson<T>(key: string, fallback: T) {
  if (typeof window === "undefined") return fallback;
  try {
    const value = window.localStorage.getItem(key);
    return value ? (JSON.parse(value) as T) : fallback;
  } catch {
    return fallback;
  }
}

function normalize(value: string) {
  return value.trim().toLocaleLowerCase("es");
}

function convertUnit(quantity: number, fromUnit: string, toUnit: string) {
  const from = normalize(fromUnit);
  const to = normalize(toUnit);
  if (from === to) return quantity;
  if (from === "g" && to === "kg") return quantity / 1000;
  if (from === "kg" && to === "g") return quantity * 1000;
  if (from === "ml" && to === "l") return quantity / 1000;
  if (from === "l" && to === "ml") return quantity * 1000;
  return quantity;
}

function addMovement(
  movements: Map<string, DeliveryStockMovement>,
  product: StockProduct | undefined,
  quantity: number
) {
  if (!product || quantity <= 0) return;
  const current = movements.get(product.id);
  movements.set(product.id, {
    productId: product.id,
    productName: product.name,
    quantity: Number(((current?.quantity ?? 0) + quantity).toFixed(2)),
  });
}

function findProduct(products: StockProduct[], query: string) {
  const normalizedQuery = normalize(query);
  return products.find((product) => {
    const name = normalize(product.name);
    return name === normalizedQuery || name.includes(normalizedQuery) || normalizedQuery.includes(name);
  });
}

function resolveMovements(delivery: StockReservableDelivery) {
  const products = readJson<StockProduct[]>(STOCK_PRODUCTS_STORAGE_KEY, []);
  const config = readJson<{ recipes?: RecipeConfig[] }>(LOCAL_CONFIG_STORAGE_KEY, {});
  const recipes = Array.isArray(config.recipes) ? config.recipes : [];
  const recipesByMenuItem = new Map(
    recipes.filter((recipe) => recipe.menuItemId).map((recipe) => [recipe.menuItemId, recipe])
  );
  const movements = new Map<string, DeliveryStockMovement>();

  const fallback = {
    harina: findProduct(products, "Harina 000"),
    muzzarella: findProduct(products, "Muzzarella"),
    carne: findProduct(products, "Carne picada"),
    vino: findProduct(products, "Vino Malbec"),
    gaseosa: findProduct(products, "Gaseosa cola 1.5L"),
    cajasPizza: findProduct(products, "Cajas de pizza grandes"),
  };

  (delivery.orderItems ?? []).forEach((item) => {
    const quantity = Number(item.quantity) || 0;
    if (quantity <= 0) return;
    const recipe = recipesByMenuItem.get(item.id);

    if (recipe) {
      recipe.ingredients.forEach((ingredient) => {
        const product = products.find((candidate) => candidate.id === ingredient.stockProductId);
        if (!product) return;
        addMovement(
          movements,
          product,
          convertUnit(ingredient.quantity * quantity, ingredient.unit, product.unit)
        );
      });
      return;
    }

    const name = normalize(item.name);
    const pizzaUnits = name.includes("3x2") ? quantity * 3 : quantity;
    if (name.includes("pizza") || name.includes("muzzarella") || name.includes("fugazzeta")) {
      addMovement(movements, fallback.harina, pizzaUnits * 0.25);
      addMovement(movements, fallback.muzzarella, pizzaUnits * 0.35);
      addMovement(movements, fallback.cajasPizza, pizzaUnits);
    }
    if (name.includes("empanada")) {
      const units = name.includes("6 empanadas") ? quantity * 6 : quantity;
      addMovement(movements, fallback.harina, units * 0.05);
      if (name.includes("carne")) addMovement(movements, fallback.carne, units * 0.08);
      if (name.includes("jamon") || name.includes("queso")) {
        addMovement(movements, fallback.muzzarella, units * 0.04);
      }
    }
    if (name.includes("gaseosa") || name.includes("cola")) {
      addMovement(movements, fallback.gaseosa, quantity);
    }
    if (name.includes("vino")) addMovement(movements, fallback.vino, quantity);
  });

  return { products, movements: Array.from(movements.values()) };
}

export function reserveStockForClientDelivery<T extends StockReservableDelivery>(delivery: T): T {
  if (
    typeof window === "undefined" ||
    delivery.status === "cancelled" ||
    delivery.needsAcceptance ||
    delivery.stockDiscounted ||
    delivery.stockReturned
  ) {
    return delivery;
  }

  const { products, movements } = resolveMovements(delivery);
  if (movements.length === 0) return delivery;

  const nextProducts = products.map((product) => {
    const movement = movements.find((candidate) => candidate.productId === product.id);
    return movement
      ? {
          ...product,
          consumedBySales: Math.max(
            0,
            Number(((Number(product.consumedBySales) || 0) + movement.quantity).toFixed(2))
          ),
          lastUpdated: "Hoy",
        }
      : product;
  });
  window.localStorage.setItem(STOCK_PRODUCTS_STORAGE_KEY, JSON.stringify(nextProducts));

  const previousLogs = readJson<Array<Record<string, unknown>>>(STOCK_MOVEMENTS_STORAGE_KEY, []);
  const createdAt = new Date().toISOString();
  const logs = movements.map((movement) => ({
    id: createV2OperationalId("stock-mov-env"),
    createdAt,
    type: "discount",
    origin: "envios",
    productId: movement.productId,
    productName: movement.productName,
    quantity: movement.quantity,
    unit: products.find((product) => product.id === movement.productId)?.unit ?? "unidad",
    label: "Pedido manual confirmado",
    detail: delivery.order,
    referenceId: delivery.id,
    client: delivery.client,
  }));
  window.localStorage.setItem(
    STOCK_MOVEMENTS_STORAGE_KEY,
    JSON.stringify([...logs, ...previousLogs].slice(0, 200))
  );
  window.dispatchEvent(new Event(STOCK_PRODUCTS_EVENT));

  const summary = movements
    .map((movement) => `${movement.productName}: ${movement.quantity}`)
    .join(", ");

  return {
    ...delivery,
    stockDiscounted: true,
    stockReturned: false,
    stockMovements: movements,
    note:
      delivery.note && delivery.note !== "—"
        ? `${delivery.note} · Stock reservado: ${summary}.`
        : `Stock reservado: ${summary}.`,
  };
}
