export type ReservationStockMovement = {
  productId: string;
  productName: string;
  quantity: number;
};

export type ReservationStockProduct = {
  id: string;
  name: string;
  unit: string;
  consumedBySales: number;
};

export type ReservationRecipe = {
  menuItemId?: string;
  name: string;
  ingredients: Array<{
    stockProductId?: string;
    quantity: number;
    unit: string;
  }>;
};

export type ReservationMenuItemReference = {
  id?: string;
  menuItemId?: string;
  name: string;
};

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

export function convertRecipeQuantityToStockUnit(
  quantity: number,
  fromUnit: string,
  toUnit: string
) {
  const from = normalizeText(fromUnit);
  const to = normalizeText(toUnit);

  if (from === to) return quantity;
  if (from === "g" && to === "kg") return quantity / 1000;
  if (from === "kg" && to === "g") return quantity * 1000;
  if (from === "ml" && to === "l") return quantity / 1000;
  if (from === "l" && to === "ml") return quantity * 1000;

  return quantity;
}

function findStockProductByName<T extends ReservationStockProduct>(products: T[], search: string) {
  const query = normalizeText(search);

  return products.find((product) => {
    const name = normalizeText(product.name);
    return name === query || name.includes(query) || query.includes(name);
  });
}

function addStockMovement<T extends ReservationStockProduct>(
  movements: Map<string, ReservationStockMovement>,
  stockProduct: T | undefined,
  quantity: number
) {
  if (!stockProduct || quantity <= 0) return;

  const current = movements.get(stockProduct.id);
  movements.set(stockProduct.id, {
    productId: stockProduct.id,
    productName: stockProduct.name,
    quantity: Number(((current?.quantity ?? 0) + quantity).toFixed(2)),
  });
}

export function resolveReservationStockMovements<
  TProduct extends ReservationStockProduct,
  TRecipe extends ReservationRecipe,
>(
  item: ReservationMenuItemReference | string,
  quantity: number,
  stockProducts: TProduct[],
  recipes: TRecipe[]
) {
  const movements = new Map<string, ReservationStockMovement>();
  const itemId = typeof item === "string" ? "" : item.menuItemId ?? item.id ?? "";
  const itemName = typeof item === "string" ? item : item.name;
  const normalizedItemName = normalizeText(itemName);
  const recipe =
    recipes.find((candidate) => candidate.menuItemId && candidate.menuItemId === itemId) ??
    recipes.find((candidate) => normalizeText(candidate.name) === normalizedItemName);

  if (recipe) {
    recipe.ingredients.forEach((ingredient) => {
      if (!ingredient.stockProductId) return;

      const stockProduct = stockProducts.find(
        (product) => product.id === ingredient.stockProductId
      );
      if (!stockProduct) return;

      addStockMovement(
        movements,
        stockProduct,
        convertRecipeQuantityToStockUnit(
          ingredient.quantity * quantity,
          ingredient.unit,
          stockProduct.unit
        )
      );
    });

    return Array.from(movements.values());
  }

  const stock = {
    harina: findStockProductByName(stockProducts, "Harina 000"),
    muzzarella: findStockProductByName(stockProducts, "Muzzarella"),
    carne: findStockProductByName(stockProducts, "Carne picada"),
    vino: findStockProductByName(stockProducts, "Vino Malbec"),
    gaseosa: findStockProductByName(stockProducts, "Gaseosa cola 1.5L"),
    cajasPizza: findStockProductByName(stockProducts, "Cajas de pizza grandes"),
  };

  if (
    normalizedItemName.includes("pizza") ||
    normalizedItemName.includes("muzzarella") ||
    normalizedItemName.includes("fugazzeta")
  ) {
    addStockMovement(movements, stock.harina, quantity * 0.25);
    addStockMovement(movements, stock.muzzarella, quantity * 0.35);
    addStockMovement(movements, stock.cajasPizza, quantity);
  }

  if (normalizedItemName.includes("empanada")) {
    addStockMovement(movements, stock.harina, quantity * 0.05);
    if (normalizedItemName.includes("carne")) {
      addStockMovement(movements, stock.carne, quantity * 0.08);
    }
    if (normalizedItemName.includes("jamon") || normalizedItemName.includes("queso")) {
      addStockMovement(movements, stock.muzzarella, quantity * 0.04);
    }
  }

  if (normalizedItemName.includes("gaseosa") || normalizedItemName.includes("cola")) {
    addStockMovement(movements, stock.gaseosa, quantity);
  }
  if (normalizedItemName.includes("vino")) {
    addStockMovement(movements, stock.vino, quantity);
  }

  return Array.from(movements.values());
}

export function applyReservationStockMovements<TProduct extends ReservationStockProduct>(
  stockProducts: TProduct[],
  movements: ReservationStockMovement[],
  direction: "discount" | "return"
) {
  const multiplier = direction === "discount" ? 1 : -1;

  return stockProducts.map((product) => {
    const movement = movements.find((item) => item.productId === product.id);
    if (!movement) return product;

    return {
      ...product,
      consumedBySales: Math.max(
        0,
        Number((Number(product.consumedBySales) + movement.quantity * multiplier).toFixed(2))
      ),
      lastUpdated: "Hoy",
    };
  });
}

export function mergeReservationStockMovements(
  baseMovements: ReservationStockMovement[],
  extraMovements: ReservationStockMovement[]
) {
  const merged = new Map<string, ReservationStockMovement>();

  [...baseMovements, ...extraMovements].forEach((movement) => {
    const current = merged.get(movement.productId);
    merged.set(movement.productId, {
      ...movement,
      quantity: Number(((current?.quantity ?? 0) + movement.quantity).toFixed(2)),
    });
  });

  return Array.from(merged.values()).filter((movement) => movement.quantity > 0);
}

export function subtractReservationStockMovements(
  baseMovements: ReservationStockMovement[],
  returnedMovements: ReservationStockMovement[]
) {
  const remaining = new Map<string, ReservationStockMovement>();
  baseMovements.forEach((movement) => remaining.set(movement.productId, movement));

  returnedMovements.forEach((movement) => {
    const current = remaining.get(movement.productId);
    if (!current) return;

    remaining.set(movement.productId, {
      ...current,
      quantity: Number((current.quantity - movement.quantity).toFixed(2)),
    });
  });

  return Array.from(remaining.values()).filter((movement) => movement.quantity > 0);
}
