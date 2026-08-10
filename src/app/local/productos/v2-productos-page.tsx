"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  AlertTriangle,
  Boxes,
  CheckCircle2,
  PackagePlus,
  Search,
  History,
  X,
  XCircle,
} from "lucide-react";
import { V2AppShell } from "@/components/v2/v2-app-shell";
import { V2Badge } from "@/components/v2/v2-badge";
import { V2Button } from "@/components/v2/v2-button";
import { V2Card, V2MetricCard } from "@/components/v2/v2-card";
import { V2DataTable } from "@/components/v2/v2-data-table";
import { V2FilterBar } from "@/components/v2/v2-filter-bar";
import { V2Field, V2Input, V2Select, V2Textarea } from "@/components/v2/v2-input";
import { V2PageHeader } from "@/components/v2/v2-page-header";
import type {
  BusinessStockMovement,
  BusinessStockMovementDatabaseRow,
  BusinessStockMovementType,
  BusinessStockProductSnapshot,
  BusinessStockSnapshot,
} from "@/lib/stock/business-stock-contract";
import { mapBusinessStockMovementRow } from "@/lib/stock/business-stock-contract";
import { createV2OperationalId, V2_OPERATIONAL_EVENTS, V2_OPERATIONAL_STORAGE_KEYS } from "@/lib/v2-operational-storage";
import { subscribeV2ServerSync } from "@/lib/v2-server-sync";
import { createSupabaseBrowserClient } from "@/lib/supabase/auth-browser";
import {
  recordBusinessStockMovementAction,
  saveBusinessStockProductAction,
} from "../stock/actions";
import {
  v2StockProducts,
  type V2StockUnit,
} from "@/lib/v2/v2-mock-data";

type V2StockProduct = {
  id: string;
  supplier: string;
  unitCost: number;
  name: string;
  category: string;
  unit: V2StockUnit;
  totalStock: number;
  consumedBySales: number;
  alertBelow: number;
  lastUpdated: string;
  note: string;
};

type V2ProductosPageProps = {
  initialBusinessStock?: BusinessStockSnapshot;
  stockPersistence?: "local" | "supabase";
  businessId?: string;
  canManageStock?: boolean;
};

type V2StockStatus = "available" | "low_stock" | "out_of_stock";

const stockUnits: V2StockUnit[] = [
  "kg",
  "g",
  "l",
  "ml",
  "unidad",
  "botella",
  "caja",
  "paquete",
  "bolsa",
  "lata",
];

const STOCK_PRODUCTS_STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.stockProducts;
const STOCK_PRODUCTS_EVENT = V2_OPERATIONAL_EVENTS.stockProducts;
const STOCK_MOVEMENTS_STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.stockMovements;

type V2StockMovementType =
  | "discount"
  | "return"
  | "entry"
  | "manual";

type V2StockMovementOrigin = "envios" | "reservas" | "manual";

type V2StockMovementLog = {
  id: string;
  createdAt: string;
  type: V2StockMovementType;
  origin: V2StockMovementOrigin;
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

function readStockProductsFromStorage() {
  if (typeof window === "undefined") return v2StockProducts;

  try {
    const storedValue = window.localStorage.getItem(STOCK_PRODUCTS_STORAGE_KEY);

    if (!storedValue) return v2StockProducts;

    return JSON.parse(storedValue) as V2StockProduct[];
  } catch {
    return v2StockProducts;
  }
}

function writeStockProductsToStorage(products: V2StockProduct[]) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(STOCK_PRODUCTS_STORAGE_KEY, JSON.stringify(products));
  window.dispatchEvent(new Event(STOCK_PRODUCTS_EVENT));
}

function readFromStorage<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;

  try {
    const storedValue = window.localStorage.getItem(key);

    if (!storedValue) return fallback;

    return JSON.parse(storedValue) as T;
  } catch {
    return fallback;
  }
}

function readStockMovementHistory() {
  const history = readFromStorage<V2StockMovementLog[]>(STOCK_MOVEMENTS_STORAGE_KEY, []);
  const usedIds = new Set<string>();
  let repaired = false;
  const normalizedHistory = history.map((movement) => {
    if (!usedIds.has(movement.id)) {
      usedIds.add(movement.id);
      return movement;
    }

    repaired = true;
    const nextMovement = {
      ...movement,
      id: createV2OperationalId(`${movement.id}-recovered`),
    };
    usedIds.add(nextMovement.id);
    return nextMovement;
  });
  const nextHistory = normalizedHistory;

  if (repaired && typeof window !== "undefined") {
    window.localStorage.setItem(STOCK_MOVEMENTS_STORAGE_KEY, JSON.stringify(nextHistory));
  }

  return nextHistory;
}

const STOCK_DATE_TIME_ZONE =
  "America/Argentina/Buenos_Aires";

const stockDateTimeFormatter =
  new Intl.DateTimeFormat("en-US", {
    timeZone: STOCK_DATE_TIME_ZONE,
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });

function formatStockDateTime(
  value: string,
  fallback: string,
) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return fallback;
  }

  const parts = Object.fromEntries(
    stockDateTimeFormatter
      .formatToParts(date)
      .map((part) => [
        part.type,
        part.value,
      ]),
  );

  return [
    parts.day + "/" + parts.month,
    parts.hour + ":" + parts.minute,
  ].join(", ");
}

function formatMovementDate(value: string) {
  return formatStockDateTime(
    value,
    "Sin fecha",
  );
}

function getMovementTypeLabel(type: V2StockMovementType) {
  if (type === "return") return "Devolución";
  if (type === "entry") return "Ingreso";
  if (type === "manual") return "Ajuste";

  return "Descuento";
}

function getMovementOriginLabel(origin: V2StockMovementOrigin) {
  if (origin === "reservas") return "Reserva";
  if (origin === "envios") return "Envío";

  return "Manual";
}

function getMovementTone(type: V2StockMovementType): "green" | "orange" | "blue" {
  if (type === "return" || type === "entry") return "green";
  if (type === "manual") return "blue";

  return "orange";
}

function getMovementQuantityPrefix(type: V2StockMovementType) {
  if (type === "return" || type === "entry") return "+";
  if (type === "discount") return "-";

  return "";
}

function getMovementCardToneClass(type: V2StockMovementType) {
  if (type === "return" || type === "entry") {
    return "border-emerald-200 bg-emerald-50/70";
  }

  if (type === "manual") {
    return "border-blue-200 bg-blue-50/70";
  }

  return "border-amber-200 bg-amber-50/70";
}

function getRemainingStock(product: V2StockProduct) {
  return Math.max(product.totalStock - product.consumedBySales, 0);
}

function formatStockUpdatedAt(value: string) {
  return formatStockDateTime(
    value,
    value || "Sin fecha",
  );
}

function mapPersistentStockProduct(
  product: BusinessStockProductSnapshot,
): V2StockProduct {
  return {
    id: product.id,
    supplier: product.supplier,
    unitCost: product.unitCost,
    name: product.name,
    category: product.category,
    unit: product.unit as V2StockUnit,
    totalStock: product.totalStock,
    consumedBySales: product.consumedBySales,
    alertBelow: product.alertBelow,
    lastUpdated: product.lastUpdated,
    note: product.note,
  };
}

function mapPersistentStockProducts(
  snapshot?: BusinessStockSnapshot,
) {
  return (snapshot?.products ?? []).map(
    mapPersistentStockProduct,
  );
}

function mapPersistentStockMovement(
  movement: BusinessStockMovement,
): V2StockMovementLog {
  const type: V2StockMovementType =
    movement.movementType === "consumption"
      ? "discount"
      : movement.movementType === "return"
        ? "return"
        : movement.movementType === "opening"
          || movement.movementType === "replenishment"
          ? "entry"
          : "manual";

  const origin: V2StockMovementOrigin =
    movement.origin === "shipping"
      ? "envios"
      : movement.origin === "reservation"
        ? "reservas"
        : "manual";

  return {
    id: movement.id,
    createdAt: movement.createdAt,
    type,
    origin,
    productId: movement.productId,
    productName: movement.productName,
    quantity:
      type === "manual"
        ? movement.quantityDelta
        : Math.abs(movement.quantityDelta),
    unit: movement.unit,
    label: movement.label,
    detail: movement.detail,
    referenceId: movement.referenceId || undefined,
    operationId: movement.operationKey || undefined,
  };
}

function mapPersistentStockMovements(
  snapshot?: BusinessStockSnapshot,
) {
  return (snapshot?.movements ?? []).map(
    mapPersistentStockMovement,
  );
}

function applyPersistentMovement(
  product: V2StockProduct,
  movement: BusinessStockMovement,
): V2StockProduct {
  const currentStock =
    getRemainingStock(product)
    + movement.quantityDelta;

  let consumedBySales =
    product.consumedBySales;

  if (movement.movementType === "consumption") {
    consumedBySales += Math.abs(
      movement.quantityDelta,
    );
  } else if (movement.movementType === "return") {
    consumedBySales = Math.max(
      consumedBySales - movement.quantityDelta,
      0,
    );
  }

  const normalizedCurrent =
    Number(currentStock.toFixed(3));
  const normalizedConsumed =
    Number(consumedBySales.toFixed(3));

  return {
    ...product,
    totalStock: Number(
      (
        normalizedCurrent
        + normalizedConsumed
      ).toFixed(3),
    ),
    consumedBySales: normalizedConsumed,
    lastUpdated: movement.createdAt,
  };
}

function getStockStatus(product: V2StockProduct): V2StockStatus {
  const remaining = getRemainingStock(product);

  if (remaining <= 0) return "out_of_stock";
  if (remaining <= product.alertBelow) return "low_stock";

  return "available";
}

function getStockStatusPriority(product: V2StockProduct) {
  const status = getStockStatus(product);

  if (status === "out_of_stock") return 0;
  if (status === "low_stock") return 1;

  return 2;
}

function formatAmount(value: number, unit: V2StockUnit) {
  return `${Number.isInteger(value) ? value : value.toFixed(1)} ${unit}`;
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function getConsumedCost(product: V2StockProduct) {
  return product.consumedBySales * product.unitCost;
}

function V2StockStatusBadge({ status }: { status: V2StockStatus }) {
  const config: Record<
    V2StockStatus,
    { label: string; tone: "green" | "orange" | "red" }
  > = {
    available: { label: "Disponible", tone: "green" },
    low_stock: { label: "Bajo stock", tone: "orange" },
    out_of_stock: { label: "Sin stock", tone: "red" },
  };

  return <V2Badge tone={config[status].tone}>{config[status].label}</V2Badge>;
}

function getStockRowToneClass(product: V2StockProduct) {
  const status = getStockStatus(product);

  if (status === "out_of_stock") {
    return "bg-red-100/60 hover:bg-red-100/100";
  }

  if (status === "low_stock") {
    return "bg-amber-100/60 hover:bg-amber-100/100";
  }

  return "bg-emerald-100/50 hover:bg-emerald-100/100";
}

function getStockAlertCardToneClass(product: V2StockProduct) {
  const status = getStockStatus(product);

  if (status === "out_of_stock") {
    return "border-red-200 bg-gradient-to-br from-red-50 to-white text-red-900 hover:border-red-300";
  }

  if (status === "low_stock") {
    return "border-amber-200 bg-gradient-to-br from-amber-50 to-white text-amber-900 hover:border-amber-300";
  }

  return "border-emerald-200 bg-gradient-to-br from-emerald-50 to-white text-emerald-900 hover:border-emerald-300";
}

function getStockMiniCardToneClass(product: V2StockProduct) {
  const status = getStockStatus(product);

  if (status === "out_of_stock") return "bg-red-100/60";
  if (status === "low_stock") return "bg-amber-100/60";

  return "bg-emerald-100/60";
}

export function V2ProductosPage({
  initialBusinessStock,
  stockPersistence = "local",
  businessId,
  canManageStock = true,
}: V2ProductosPageProps = {}) {
  const isSupabasePersistence =
    stockPersistence === "supabase";
  const router = useRouter();
  const stockRealtimeReadyRef = useRef(false);
  const appliedPersistentMovementIdsRef = useRef(
    new Set(
      (initialBusinessStock?.movements ?? []).map(
        (movement) => movement.id,
      ),
    ),
  );
  const knownStockProductIdsRef = useRef(
    new Set(
      (initialBusinessStock?.products ?? []).map(
        (product) => product.id,
      ),
    ),
  );

  const [stockProducts, setStockProducts] =
    useState<V2StockProduct[]>(() =>
      isSupabasePersistence
        ? mapPersistentStockProducts(
            initialBusinessStock,
          )
        : v2StockProducts
    );
  const [stockMovements, setStockMovements] =
    useState<V2StockMovementLog[]>(() =>
      isSupabasePersistence
        ? mapPersistentStockMovements(
            initialBusinessStock,
          )
        : []
    );
  const [editingProduct, setEditingProduct] =
    useState<V2StockProduct | null>(null);
  const [
    editingProductIsNew,
    setEditingProductIsNew,
  ] = useState(false);
  const [
    stockMutationPending,
    setStockMutationPending,
  ] = useState(false);
  const [
    stockMutationError,
    setStockMutationError,
  ] = useState("");
  const [
    movementType,
    setMovementType,
  ] = useState<BusinessStockMovementType>(
    "replenishment",
  );
  const [
    movementQuantity,
    setMovementQuantity,
  ] = useState("");
  const [
    movementLabel,
    setMovementLabel,
  ] = useState("Movimiento manual de stock");

  useEffect(() => {
    knownStockProductIdsRef.current =
      new Set(
        stockProducts.map(
          (product) => product.id,
        ),
      );
  }, [stockProducts]);

  useEffect(() => {
    if (
      !isSupabasePersistence
      || !businessId
    ) {
      return;
    }

    let refreshTimer: number | null = null;
    let disposed = false;

    function refreshPersistentStock() {
      if (
        disposed
        || refreshTimer !== null
      ) {
        return;
      }

      refreshTimer = window.setTimeout(
        () => {
          refreshTimer = null;
          router.refresh();
        },
        25,
      );
    }

    function applyRealtimeStockMovement(
      movement: BusinessStockMovement,
    ) {
      if (
        appliedPersistentMovementIdsRef.current.has(
          movement.id,
        )
      ) {
        return;
      }

      if (
        !knownStockProductIdsRef.current.has(
          movement.productId,
        )
      ) {
        refreshPersistentStock();
        return;
      }

      appliedPersistentMovementIdsRef.current.add(
        movement.id,
      );

      setStockProducts((current) =>
        current.map((product) =>
          product.id === movement.productId
            ? applyPersistentMovement(
                product,
                movement,
              )
            : product
        )
      );
      setEditingProduct((current) =>
        current?.id === movement.productId
          ? applyPersistentMovement(
              current,
              movement,
            )
          : current
      );
      setStockMovements((current) => [
        mapPersistentStockMovement(
          movement,
        ),
        ...current.filter(
          (item) =>
            item.id !== movement.id,
        ),
      ].slice(0, 500));
    }

    const unsubscribeStockSync =
      subscribeV2ServerSync(
        "stock",
        () => {
          if (!stockRealtimeReadyRef.current) {
            refreshPersistentStock();
          }
        },
      );

    function handlePersistentStockFocus() {
      if (!stockRealtimeReadyRef.current) {
        refreshPersistentStock();
      }
    }

    function handlePersistentStockVisibility() {
      if (
        document.visibilityState === "visible"
        && !stockRealtimeReadyRef.current
      ) {
        refreshPersistentStock();
      }
    }

    window.addEventListener(
      "focus",
      handlePersistentStockFocus,
    );
    document.addEventListener(
      "visibilitychange",
      handlePersistentStockVisibility,
    );

    const supabase =
      createSupabaseBrowserClient();
    let channel:
      | ReturnType<
          NonNullable<
            typeof supabase
          >["channel"]
        >
      | null = null;

    async function subscribePersistentStockRealtime() {
      if (
        !supabase
        || disposed
      ) {
        return;
      }

      const {
        data: sessionData,
        error: sessionError,
      } =
        await supabase.auth.getSession();

      if (disposed) {
        return;
      }

      const accessToken =
        sessionData.session?.access_token;

      if (
        sessionError
        || !accessToken
      ) {
        refreshPersistentStock();
        return;
      }

      await supabase.realtime.setAuth(
        accessToken,
      );

      if (disposed) {
        return;
      }

      channel = supabase
        .channel(
          createV2OperationalId(
            "stock-realtime-" + businessId,
          ),
        )
        .on(
          "postgres_changes",
          {
            event: "INSERT",
            schema: "public",
            table: "stock_movements",
            filter: "business_id=eq." + businessId,
          },
          (payload) => {
            try {
              const movement =
                mapBusinessStockMovementRow(
                  payload.new as unknown as BusinessStockMovementDatabaseRow,
                );

              applyRealtimeStockMovement(
                movement,
              );
            } catch {
              refreshPersistentStock();
            }
          },
        )
        .subscribe((status) => {
          stockRealtimeReadyRef.current =
            status === "SUBSCRIBED";

          if (
            status === "CHANNEL_ERROR"
            || status === "TIMED_OUT"
          ) {
            refreshPersistentStock();
          }
        });
    }

    void subscribePersistentStockRealtime();

    return () => {
      disposed = true;
      stockRealtimeReadyRef.current = false;

      if (refreshTimer !== null) {
        window.clearTimeout(
          refreshTimer,
        );
      }

      unsubscribeStockSync();
      window.removeEventListener(
        "focus",
        handlePersistentStockFocus,
      );
      document.removeEventListener(
        "visibilitychange",
        handlePersistentStockVisibility,
      );

      if (
        supabase
        && channel
      ) {
        void supabase.removeChannel(
          channel,
        );
      }
    };
  }, [
    businessId,
    isSupabasePersistence,
    router,
  ]);

  useEffect(() => {
    if (isSupabasePersistence) {
      const nextProducts =
        mapPersistentStockProducts(
          initialBusinessStock,
        );

      setStockProducts(nextProducts);
      setStockMovements(
        mapPersistentStockMovements(
          initialBusinessStock,
        ),
      );
      appliedPersistentMovementIdsRef.current =
        new Set(
          (initialBusinessStock?.movements ?? []).map(
            (movement) => movement.id,
          ),
        );
      setEditingProduct((current) =>
        current
          ? nextProducts.find(
              (product) =>
                product.id === current.id,
            ) ?? current
          : null
      );

      return;
    }

    function syncStockProducts() {
      const nextProducts = readStockProductsFromStorage();

      setStockProducts(nextProducts);
      setStockMovements(readStockMovementHistory());
      setEditingProduct((current) =>
        current ? nextProducts.find((product) => product.id === current.id) ?? current : null
      );
    }

    syncStockProducts();

    window.addEventListener("focus", syncStockProducts);
    window.addEventListener("storage", syncStockProducts);
    window.addEventListener(STOCK_PRODUCTS_EVENT, syncStockProducts);

    return () => {
      window.removeEventListener("focus", syncStockProducts);
      window.removeEventListener("storage", syncStockProducts);
      window.removeEventListener(STOCK_PRODUCTS_EVENT, syncStockProducts);
    };
  }, [
    initialBusinessStock,
    isSupabasePersistence,
  ]);

  const categories = useMemo(() => {
    return Array.from(
      new Set([
        "Almacén",
        ...stockProducts.map(
          (item) => item.category,
        ),
      ]),
    ).sort((a, b) =>
      String(a).localeCompare(String(b), "es")
    );
  }, [stockProducts]);

  const sortedStockProducts = useMemo(() => {
    return [...stockProducts].sort((a, b) => a.name.localeCompare(b.name, "es"));
  }, [stockProducts]);

  const lowStockProducts = stockProducts.filter(
    (item) => getStockStatus(item) === "low_stock"
  );

  const outOfStockProducts = stockProducts.filter(
    (item) => getStockStatus(item) === "out_of_stock"
  );

  const availableProducts = stockProducts.filter(
    (item) => getStockStatus(item) === "available"
  );

  const alertProducts = [...stockProducts]
    .filter((item) => getStockStatus(item) !== "available")
    .sort((a, b) => {
      const priorityDiff = getStockStatusPriority(a) - getStockStatusPriority(b);

      if (priorityDiff !== 0) return priorityDiff;

      return getRemainingStock(a) - getRemainingStock(b);
    });

  const recentStockMovements = [...stockMovements]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, 12);

  function resetMovementEditor() {
    setMovementType("replenishment");
    setMovementQuantity("");
    setMovementLabel(
      "Movimiento manual de stock",
    );
    setStockMutationError("");
  }

  function openEditor(product: V2StockProduct) {
    setEditingProduct(product);
    setEditingProductIsNew(false);
    resetMovementEditor();
  }

  function openNewProduct() {
    if (
      isSupabasePersistence
      && !canManageStock
    ) {
      setStockMutationError(
        "No tenés permisos para modificar el stock de este local.",
      );
      return;
    }

    setEditingProductIsNew(true);
    resetMovementEditor();
    setEditingProduct({
      id: `stock-${Date.now()}`,
      supplier: "Sin proveedor",
      unitCost: 0,
      name: "Nuevo insumo",
      category: "Almacén",
      unit: "unidad",
      totalStock: 0,
      consumedBySales: 0,
      alertBelow: 0,
      lastUpdated: "Hoy",
      note: "",
    } as V2StockProduct);
  }

  function closeEditor() {
    if (stockMutationPending) return;

    setEditingProduct(null);
    setEditingProductIsNew(false);
    setStockMutationError("");
  }

  function updateEditingProduct<K extends keyof V2StockProduct>(
    field: K,
    value: V2StockProduct[K]
  ) {
    setEditingProduct((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current
    );
  }

  function persistStockProducts(nextProducts: V2StockProduct[]) {
    if (editingProduct) {
      const previousProduct = stockProducts.find((product) => product.id === editingProduct.id);
      const nextProduct = nextProducts.find((product) => product.id === editingProduct.id);

      if (previousProduct && nextProduct) {
        const discountedDiff = Number(nextProduct.consumedBySales) - Number(previousProduct.consumedBySales);

        if (discountedDiff !== 0) {
          const movement: V2StockMovementLog = {
            id: createV2OperationalId("stock-mov-manual"),
            createdAt: new Date().toISOString(),
            type: discountedDiff > 0 ? "discount" : "return",
            origin: "manual",
            productId: nextProduct.id,
            productName: nextProduct.name,
            quantity: Math.abs(Number(discountedDiff.toFixed(2))),
            unit: nextProduct.unit,
            label: "Edición manual de stock",
            detail: "Cambio manual del campo Stock descontado.",
          };

          const nextHistory = [movement, ...readStockMovementHistory()].slice(0, 200);
          window.localStorage.setItem(STOCK_MOVEMENTS_STORAGE_KEY, JSON.stringify(nextHistory));
          setStockMovements(nextHistory);
        }
      }
    }

    setStockProducts(nextProducts);
    writeStockProductsToStorage(nextProducts);
  }

  async function handleSaveEditingProduct() {
    if (!editingProduct) return;

    if (!isSupabasePersistence) {
      const nextEditingProduct = {
        ...editingProduct,
        lastUpdated: "Hoy",
      };
      const exists = stockProducts.some(
        (product) =>
          product.id === nextEditingProduct.id,
      );
      const nextProducts = exists
        ? stockProducts.map((product) =>
            product.id === nextEditingProduct.id
              ? nextEditingProduct
              : product
          )
        : [
            ...stockProducts,
            nextEditingProduct,
          ];

      persistStockProducts(nextProducts);
      closeEditor();
      return;
    }

    if (!canManageStock) {
      setStockMutationError(
        "No tenés permisos para modificar el stock de este local.",
      );
      return;
    }

    if (
      !editingProductIsNew
      && movementQuantity.trim() !== ""
    ) {
      setStockMutationError(
        'Tenés un movimiento pendiente. Aplicalo con "Registrar movimiento" o vaciá la cantidad antes de guardar los datos del insumo.',
      );
      return;
    }

    setStockMutationPending(true);
    setStockMutationError("");

    try {
      const result =
        await saveBusinessStockProductAction({
          productId:
            editingProductIsNew
              ? null
              : editingProduct.id,
          product: {
            name: editingProduct.name,
            category: editingProduct.category,
            supplier: editingProduct.supplier,
            unit: editingProduct.unit,
            unitCost: editingProduct.unitCost,
            alertBelow: editingProduct.alertBelow,
            note: editingProduct.note,
            isActive: true,
          },
        });

      if (!result.ok) {
        setStockMutationError(result.error);
        return;
      }

      const previous = stockProducts.find(
        (product) =>
          product.id === result.product.id,
      );

      const savedProduct: V2StockProduct = {
        id: result.product.id,
        supplier: result.product.supplier,
        unitCost: result.product.unitCost,
        name: result.product.name,
        category: result.product.category,
        unit: result.product.unit as V2StockUnit,
        totalStock:
          previous?.totalStock ?? 0,
        consumedBySales:
          previous?.consumedBySales ?? 0,
        alertBelow: result.product.alertBelow,
        lastUpdated: result.product.updatedAt,
        note: result.product.note,
      };

      setStockProducts((current) => {
        const exists = current.some(
          (product) =>
            product.id === savedProduct.id,
        );

        return exists
          ? current.map((product) =>
              product.id === savedProduct.id
                ? savedProduct
                : product
            )
          : [...current, savedProduct];
      });

      setEditingProduct(null);
      setEditingProductIsNew(false);
      setStockMutationError("");
    } finally {
      setStockMutationPending(false);
    }
  }

  async function handleRecordStockMovement() {
    if (
      !editingProduct
      || editingProductIsNew
    ) {
      return;
    }

    if (!canManageStock) {
      setStockMutationError(
        "No tenés permisos para modificar el stock de este local.",
      );
      return;
    }

    const rawQuantity =
      Number(movementQuantity);

    if (
      !Number.isFinite(rawQuantity)
      || rawQuantity === 0
    ) {
      setStockMutationError(
        "Ingresá una cantidad de movimiento distinta de cero.",
      );
      return;
    }

    let quantityDelta = rawQuantity;

    if (movementType === "consumption") {
      quantityDelta = -Math.abs(rawQuantity);
    } else if (
      movementType !== "adjustment"
    ) {
      quantityDelta = Math.abs(rawQuantity);
    }

    const defaultLabels:
      Record<BusinessStockMovementType, string> = {
        opening: "Stock inicial",
        replenishment: "Reposición manual",
        consumption: "Consumo manual",
        return: "Devolución manual",
        adjustment: "Ajuste manual",
      };

    setStockMutationPending(true);
    setStockMutationError("");

    try {
      const result =
        await recordBusinessStockMovementAction({
          productId: editingProduct.id,
          movement: {
            movementType,
            origin: "manual",
            quantityDelta,
            operationKey: null,
            referenceId: null,
            label:
              movementLabel.trim()
              || defaultLabels[movementType],
            detail: "",
            unitCost: editingProduct.unitCost,
          },
        });

      if (!result.ok) {
        setStockMutationError(result.error);
        return;
      }

      if (
        !appliedPersistentMovementIdsRef.current.has(
          result.movement.id,
        )
      ) {
        appliedPersistentMovementIdsRef.current.add(
          result.movement.id,
        );

        const nextProduct =
          applyPersistentMovement(
            editingProduct,
            result.movement,
          );

        setEditingProduct(nextProduct);
        setStockProducts((current) =>
          current.map((product) =>
            product.id === nextProduct.id
              ? nextProduct
              : product
          ),
        );
        setStockMovements((current) => [
          mapPersistentStockMovement(
            result.movement,
          ),
          ...current.filter(
            (movement) =>
              movement.id !== result.movement.id,
          ),
        ]);
      }
      setMovementQuantity("");
      setMovementLabel(
        defaultLabels[movementType],
      );
    } finally {
      setStockMutationPending(false);
    }
  }

  function renderSelectableCell(product: V2StockProduct, content: ReactNode) {
    return (
      <button
        type="button"
        onClick={() => openEditor(product)}
        className="w-full text-left"
      >
        {content}
      </button>
    );
  }

  function closeActivePopup() {
    closeEditor();
  }

  useEffect(() => {
    if (!editingProduct) return;

    function handleEscapeKey(event: KeyboardEvent) {
      if (
        event.key === "Escape"
        && !stockMutationPending
      ) {
        setEditingProduct(null);
        setEditingProductIsNew(false);
        setStockMutationError("");
      }
    }

    window.addEventListener(
      "keydown",
      handleEscapeKey,
    );

    return () =>
      window.removeEventListener(
        "keydown",
        handleEscapeKey,
      );
  }, [
    editingProduct,
    stockMutationPending,
  ]);

  return (
    <V2AppShell>
      <div className="flex h-full min-h-0 flex-col">
        <V2PageHeader
          title="Stock"
          description="Gestioná insumos, stock descontado y alertas de reposición."
          actions={
            <div className="flex flex-wrap justify-end gap-2">
              <Link
                href="/local/historial?tab=stock"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
              >
                <History size={18} />
                Ver historial
              </Link>

              <V2Button
                variant="primary"
                icon={<PackagePlus size={18} />}
                onClick={openNewProduct}
                disabled={
                  isSupabasePersistence
                  && !canManageStock
                }
              >
                Nuevo insumo
              </V2Button>
            </div>
          }
        />
        <div className="mt-4 grid min-h-0 flex-1 items-stretch gap-4 xl:grid-cols-[1fr_340px]">
          <div className="flex min-h-0 flex-col gap-4">
            <div className="grid shrink-0 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <V2MetricCard
                label="Insumos"
                value={stockProducts.length}
                helper="Controlados"
                tone="blue"
                icon={<Boxes size={22} />}
              />

              <V2MetricCard
                label="Disponibles"
                value={availableProducts.length}
                helper="Disponible"
                tone="green"
                icon={<CheckCircle2 size={22} />}
              />

              <V2MetricCard
                label="Bajo stock"
                value={lowStockProducts.length}
                helper="Comprar pronto"
                tone="orange"
                icon={<AlertTriangle size={22} />}
              />

              <V2MetricCard
                label="Sin stock"
                value={outOfStockProducts.length}
                helper="Reposición urgente"
                tone="red"
                icon={<XCircle size={22} />}
              />
            </div>

            <div className="-mt-2 shrink-0">
                      <V2FilterBar>
                        <div className="relative min-w-[320px] flex-1">
                          <Search
                            className="pointer-events-none absolute left-3 top-2.5 text-slate-400"
                            size={18}
                          />
                          <V2Input
                            className="pl-10"
                            placeholder="Buscar insumo, categoría o proveedor"
                          />
                        </div>

                        <div className="min-w-[180px]">
                          <V2Select defaultValue="all">
                            <option value="all">Todas las categorías</option>
                            {categories.map((category) => (
                              <option key={category} value={category}>
                                {category}
                              </option>
                            ))}
                          </V2Select>
                        </div>

                        <div className="min-w-[160px]">
                          <V2Select defaultValue="all">
                            <option value="all">Todos los estados</option>
                            <option value="available">Disponible</option>
                            <option value="low_stock">Bajo stock</option>
                            <option value="out_of_stock">Sin stock</option>
                          </V2Select>
                        </div>

                        <div className="min-w-[150px]">
                          <V2Select defaultValue="all">
                            <option value="all">Todas las unidades</option>
                            {stockUnits.map((unit) => (
                              <option key={unit} value={unit}>
                                {unit}
                              </option>
                            ))}
                          </V2Select>
                        </div>
                      </V2FilterBar>
                    </div>

            <div className="-mt-4 flex flex-wrap items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-xs text-slate-600">
              <span className="font-semibold text-slate-500">Leyenda:</span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-300" />
                Disponible
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-amber-300" />
                Bajo stock
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-300" />
                Sin stock
              </span>
            </div>

            <div className="-mt-2 min-h-0 flex-1">
              <V2DataTable
                rows={sortedStockProducts}
                getRowKey={(row) => row.id}
                rowClassName={(row) => getStockRowToneClass(row)}
                columns={[
                  {
                    header: "Producto",
                    align: "left",
                    cell: (row) =>
                      renderSelectableCell(
                        row,
                        <div>
                          <p className="font-semibold text-slate-950">
                            {row.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {row.category} · {row.supplier}
                          </p>
                        </div>
                      ),
                  },
                  {
                    header: "Total",
                    cell: (row) =>
                      renderSelectableCell(
                        row,
                        <span className="font-semibold text-slate-950">
                          {formatAmount(row.totalStock, row.unit)}
                        </span>
                      ),
                  },
                  {
                    header: "Stock descontado",
                    cell: (row) =>
                      renderSelectableCell(
                        row,
                        formatAmount(row.consumedBySales, row.unit)
                      ),
                  },
                  {
                    header: "Restante",
                    cell: (row) =>
                      renderSelectableCell(
                        row,
                        <span className="font-semibold text-slate-950">
                          {formatAmount(getRemainingStock(row), row.unit)}
                        </span>
                      ),
                  },
                  {
                    header: "Alerta",
                    align: "left",
                    cell: (row) =>
                      renderSelectableCell(
                        row,
                        `Menos de ${formatAmount(row.alertBelow, row.unit)}`
                      ),
                  },
                  {
                    header: "Costo/u",
                    cell: (row) =>
                      renderSelectableCell(
                        row,
                        `${formatCurrency(row.unitCost)} / ${row.unit}`
                      ),
                  },
                  {
                    header: "Estado",
                    cell: (row) =>
                      renderSelectableCell(
                        row,
                        <V2StockStatusBadge status={getStockStatus(row)} />
                      ),
                  },
                  {
                    header: "Actualizado",
                    cell: (row) =>
                      renderSelectableCell(
                        row,
                        formatStockUpdatedAt(
                          row.lastUpdated,
                        ),
                      ),
                  },
                  {
                    header: "Stock",
                    align: "right",
                    cell: (row) => (
                      <div className="flex justify-end gap-2">
                        <V2Button
                          size="sm"
                          variant="success"
                          onClick={() => openEditor(row)}
                        >
                          {isSupabasePersistence
                            ? canManageStock
                              ? "Editar"
                              : "Ver"
                            : "Editar"}
                        </V2Button>
                      </div>
                    ),
                    className: "text-right",
                  },
                ]}
                className="h-full"
              />
            </div>
          </div>

          <aside className="flex h-full min-h-0 flex-col gap-4 overflow-hidden">
            <V2Card className="flex min-h-0 flex-[1.15] flex-col overflow-hidden">
              <h2 className="shrink-0 text-base font-semibold text-slate-950">
                Alertas de compra
              </h2>

              <p className="mt-1 shrink-0 text-sm text-slate-500">
                Insumos que necesitan reposición según su alerta personalizada.
              </p>

              <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="space-y-3 text-sm">
                  {alertProducts.length > 0 ? (
                    alertProducts.map((item) => {
                      const status = getStockStatus(item);

                      return (
                        <button
                          type="button"
                          key={item.id}
                          onClick={() => openEditor(item)}
                          className={`group block w-full rounded-2xl border p-3 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${getStockAlertCardToneClass(item)}`}
                        >
                          <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-slate-950">
                            {item.name}
                          </p>
                          <p className="mt-1 text-xs text-slate-500">
                            {item.category} · {item.supplier}
                          </p>
                        </div>

                        <div className="shrink-0">
                          <V2StockStatusBadge status={status} />
                        </div>
                      </div>

                          <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                            <div className={`rounded-xl p-2 shadow-sm ${getStockMiniCardToneClass(item)}`}>
                              <p className="font-semibold uppercase tracking-wide text-slate-400">
                                Restante
                              </p>
                              <p className="mt-1 font-semibold text-slate-950">
                                {formatAmount(getRemainingStock(item), item.unit)}
                              </p>
                            </div>

                            <div className={`rounded-xl p-2 shadow-sm ${getStockMiniCardToneClass(item)}`}>
                              <p className="font-semibold uppercase tracking-wide text-slate-400">
                                Alerta
                              </p>
                              <p className="mt-1 font-semibold text-slate-950">
                                {"< "}
                                {formatAmount(item.alertBelow, item.unit)}
                              </p>
                            </div>

                            <div className={`rounded-xl p-2 shadow-sm ${getStockMiniCardToneClass(item)}`}>
                              <p className="font-semibold uppercase tracking-wide text-slate-400">
                                Costo/u
                              </p>
                              <p className="mt-1 font-semibold text-slate-950">
                                {formatCurrency(item.unitCost)}
                              </p>
                            </div>

                            <div className={`rounded-xl p-2 shadow-sm ${getStockMiniCardToneClass(item)}`}>
                              <p className="font-semibold uppercase tracking-wide text-slate-400">
                                Descontado $
                              </p>
                              <p className="mt-1 font-semibold text-slate-950">
                                {formatCurrency(getConsumedCost(item))}
                              </p>
                            </div>
                          </div>
                        </button>
                      );
                    })
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      No hay productos con alerta activa.
                    </div>
                  )}
                </div>
              </div>
            </V2Card>

            <V2Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
              <div className="flex shrink-0 items-start justify-between gap-3">
                <div>
                  <h2 className="text-base font-semibold text-slate-950">
                    Movimientos recientes
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Ingresos, consumos, devoluciones y ajustes.
                  </p>
                </div>
                <V2Badge tone="blue">{recentStockMovements.length}</V2Badge>
              </div>

              <div className="mt-4 min-h-0 flex-1 overflow-y-auto pr-1">
                <div className="space-y-2 text-sm">
                  {recentStockMovements.length > 0 ? (
                    recentStockMovements.map((movement, index) => (
                      <div
                        key={`${movement.id}-${index}`}
                        className={`rounded-2xl border p-3 shadow-sm ${getMovementCardToneClass(movement.type)}`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-950">
                              {movement.productName}
                            </p>
                            <p className="mt-1 text-xs text-slate-600">
                              {movement.label}
                            </p>
                          </div>
                          <V2Badge tone={getMovementTone(movement.type)}>
                            {getMovementTypeLabel(movement.type)}
                          </V2Badge>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                          <div className="rounded-xl border border-slate-700 bg-white/90 p-2 shadow-sm">
                            <p className="font-semibold uppercase tracking-wide text-slate-400">
                              Cantidad
                            </p>
                            <p className="mt-1 font-bold text-slate-950">
                              {getMovementQuantityPrefix(movement.type)}
                              {formatAmount(movement.quantity, movement.unit as V2StockUnit)}
                            </p>
                          </div>

                          <div className="rounded-xl border border-slate-700 bg-white/90 p-2 shadow-sm">
                            <p className="font-semibold uppercase tracking-wide text-slate-400">
                              Origen
                            </p>
                            <p className="mt-1 font-bold text-slate-950">
                              {getMovementOriginLabel(movement.origin)}
                            </p>
                          </div>
                        </div>

                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-600">
                          <span>{formatMovementDate(movement.createdAt)}</span>
                          {movement.client ? <span>· {movement.client}</span> : null}
                        </div>

                        {movement.detail ? (
                          <p className="mt-2 line-clamp-2 text-xs text-slate-500">
                            {movement.detail}
                          </p>
                        ) : null}
                      </div>
                    ))
                  ) : (
                    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                      Todavía no hay movimientos de stock registrados.
                    </div>
                  )}
                </div>
              </div>
            </V2Card>
          </aside>
        </div>
      </div>

      {editingProduct ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-6 backdrop-blur-sm"
          onClick={closeActivePopup}
        >
          <div
            onClick={(event) => event.stopPropagation()}
            className="w-full max-w-4xl rounded-3xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 p-6">
              <div>
                <p className="text-sm text-slate-500">Editar insumo de stock</p>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-semibold text-slate-950">
                    {editingProduct.name}
                  </h2>
                  <V2StockStatusBadge status={getStockStatus(editingProduct)} />
                </div>
              </div>

              <button
                type="button"
                onClick={closeEditor}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto p-6">
              <div className="grid gap-4 md:grid-cols-2">
                <V2Field label="Nombre">
                  <V2Input
                    value={editingProduct.name}
                    disabled={
                      isSupabasePersistence
                      && !canManageStock
                    }
                    onChange={(event) => updateEditingProduct("name", event.target.value)}
                  />
                </V2Field>

                <V2Field label="Categoría">
                  <V2Select
                    value={editingProduct.category}
                    disabled={
                      isSupabasePersistence
                      && !canManageStock
                    }
                    onChange={(event) =>
                      updateEditingProduct(
                        "category",
                        event.target.value as V2StockProduct["category"]
                      )
                    }
                  >
                    {categories.map((category) => (
                      <option key={category} value={category}>
                        {category}
                      </option>
                    ))}
                  </V2Select>
                </V2Field>

                <V2Field label="Proveedor">
                  <V2Input
                    value={editingProduct.supplier}
                    disabled={
                      isSupabasePersistence
                      && !canManageStock
                    }
                    onChange={(event) => updateEditingProduct("supplier", event.target.value)}
                  />
                </V2Field>

                <V2Field label="Costo por unidad">
                  <V2Input
                    type="number"
                    value={editingProduct.unitCost}
                    disabled={
                      isSupabasePersistence
                      && !canManageStock
                    }
                    onChange={(event) =>
                      updateEditingProduct("unitCost", Number(event.target.value) || 0)
                    }
                  />
                </V2Field>

                <V2Field label="Stock total">
                  <V2Input
                    type="number"
                    value={editingProduct.totalStock}
                    disabled={isSupabasePersistence}
                    onChange={(event) =>
                      updateEditingProduct("totalStock", Number(event.target.value) || 0)
                    }
                  />
                </V2Field>

                <V2Field label="Unidad">
                  <V2Select
                    value={editingProduct.unit}
                    disabled={
                      isSupabasePersistence
                      && !canManageStock
                    }
                    onChange={(event) =>
                      updateEditingProduct("unit", event.target.value as V2StockProduct["unit"])
                    }
                  >
                    {stockUnits.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </V2Select>
                </V2Field>

                <V2Field label="Stock descontado">
                  <V2Input
                    type="number"
                    value={editingProduct.consumedBySales}
                    disabled={isSupabasePersistence}
                    onChange={(event) =>
                      updateEditingProduct("consumedBySales", Number(event.target.value) || 0)
                    }
                  />
                </V2Field>

                <V2Field label="Alerta personalizada">
                  <V2Input
                    type="number"
                    value={editingProduct.alertBelow}
                    disabled={
                      isSupabasePersistence
                      && !canManageStock
                    }
                    onChange={(event) =>
                      updateEditingProduct("alertBelow", Number(event.target.value) || 0)
                    }
                  />
                </V2Field>
              </div>

              <div className="mt-4 grid gap-4 md:grid-cols-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Stock restante
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-950">
                    {formatAmount(getRemainingStock(editingProduct), editingProduct.unit)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Alerta cuando quede menos de
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-950">
                    {formatAmount(editingProduct.alertBelow, editingProduct.unit)}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Costo descontado
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-950">
                    {formatCurrency(getConsumedCost(editingProduct))}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                    Última actualización
                  </p>
                  <p className="mt-1 text-lg font-bold text-slate-950">
                    {formatStockUpdatedAt(
                      editingProduct.lastUpdated,
                    )}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <V2Field label="Nota">
                  <V2Textarea
                    value={editingProduct.note}
                    disabled={
                      isSupabasePersistence
                      && !canManageStock
                    }
                    onChange={(event) => updateEditingProduct("note", event.target.value)}
                  />
                </V2Field>
              </div>

              {isSupabasePersistence ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-950">
                        Registrar movimiento
                      </h3>
                      <p className="mt-1 text-xs text-slate-500">
                        En Supabase, el stock se modifica con movimientos auditables.
                      </p>
                    </div>
                    <V2Badge tone="blue">
                      Ledger
                    </V2Badge>
                  </div>

                  {editingProductIsNew ? (
                    <p className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                      Guardá primero el insumo. Después podrás registrar su stock inicial o una reposición.
                    </p>
                  ) : canManageStock ? (
                    <>
                      <div className="mt-4 grid gap-4 md:grid-cols-3">
                        <V2Field label="Tipo">
                          <V2Select
                            value={movementType}
                            disabled={stockMutationPending}
                            onChange={(event) =>
                              setMovementType(
                                event.target.value as BusinessStockMovementType,
                              )
                            }
                          >
                            <option value="opening">
                              Stock inicial
                            </option>
                            <option value="replenishment">
                              Reposición
                            </option>
                            <option value="consumption">
                              Consumo manual
                            </option>
                            <option value="return">
                              Devolución
                            </option>
                            <option value="adjustment">
                              Ajuste
                            </option>
                          </V2Select>
                        </V2Field>

                        <V2Field label="Cantidad">
                          <V2Input
                            type="number"
                            value={movementQuantity}
                            disabled={stockMutationPending}
                            placeholder={
                              movementType === "adjustment"
                                ? "Ej. 5 o -2"
                                : "Ej. 5"
                            }
                            onChange={(event) =>
                              setMovementQuantity(
                                event.target.value,
                              )
                            }
                          />
                        </V2Field>

                        <V2Field label="Descripción">
                          <V2Input
                            value={movementLabel}
                            disabled={stockMutationPending}
                            onChange={(event) =>
                              setMovementLabel(
                                event.target.value,
                              )
                            }
                          />
                        </V2Field>
                      </div>

                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                        <p className="max-w-xl text-xs text-slate-500">
                          El movimiento se aplica únicamente con
                          {" "}
                          <span className="font-semibold text-slate-700">
                            Registrar movimiento
                          </span>
                          . Guardar los datos del insumo no modifica existencias.
                        </p>

                        <V2Button
                          variant="secondary"
                          disabled={stockMutationPending}
                          onClick={() => {
                            void handleRecordStockMovement();
                          }}
                        >
                          {stockMutationPending
                            ? "Registrando..."
                            : "Registrar movimiento"}
                        </V2Button>
                      </div>
                    </>
                  ) : (
                    <p className="mt-4 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-600">
                      Tu rol tiene acceso de solo lectura al stock.
                    </p>
                  )}
                </div>
              ) : null}

              {stockMutationError ? (
                <p className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {stockMutationError}
                </p>
              ) : null}
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-6">
              <V2Button variant="secondary" onClick={closeEditor}>
                Cancelar
              </V2Button>
              <V2Button
                variant="primary"
                disabled={
                  stockMutationPending
                  || (
                    isSupabasePersistence
                    && !canManageStock
                  )
                  || (
                    isSupabasePersistence
                    && !editingProductIsNew
                    && movementQuantity.trim() !== ""
                  )
                }
                onClick={() => {
                  void handleSaveEditingProduct();
                }}
              >
                {stockMutationPending
                  ? "Guardando..."
                  : isSupabasePersistence
                    ? "Guardar datos del insumo"
                    : "Guardar cambios"}
              </V2Button>
            </div>
          </div>
        </div>
      ) : null}
    </V2AppShell>
  );
}
