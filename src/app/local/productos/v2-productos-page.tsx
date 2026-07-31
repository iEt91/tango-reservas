"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
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
import { createV2OperationalId } from "@/lib/v2-operational-storage";
import {
  v2StockProducts,
  type V2StockUnit,
} from "@/lib/v2/v2-mock-data";

type V2StockProduct = (typeof v2StockProducts)[number];
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

const STOCK_PRODUCTS_STORAGE_KEY = "tango-v2-stock-products";
const STOCK_PRODUCTS_EVENT = "tango-v2-stock-products-updated";
const STOCK_MOVEMENTS_STORAGE_KEY = "tango-v2-stock-movements";

type V2StockMovementType = "discount" | "return" | "manual";

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

  if (repaired && typeof window !== "undefined") {
    window.localStorage.setItem(STOCK_MOVEMENTS_STORAGE_KEY, JSON.stringify(normalizedHistory));
  }

  return normalizedHistory;
}

function formatMovementDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Sin fecha";

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getMovementTypeLabel(type: V2StockMovementType) {
  if (type === "return") return "Devolución";
  if (type === "manual") return "Manual";

  return "Descuento";
}

function getMovementOriginLabel(origin: V2StockMovementOrigin) {
  if (origin === "reservas") return "Reserva";
  if (origin === "envios") return "Envío";

  return "Manual";
}

function getMovementTone(type: V2StockMovementType): "green" | "orange" | "blue" {
  if (type === "return") return "green";
  if (type === "manual") return "blue";

  return "orange";
}

function getMovementQuantityPrefix(type: V2StockMovementType) {
  if (type === "return") return "+";
  if (type === "discount") return "-";

  return "";
}

function getMovementCardToneClass(type: V2StockMovementType) {
  if (type === "return") return "border-emerald-200 bg-emerald-50/70";
  if (type === "manual") return "border-blue-200 bg-blue-50/70";

  return "border-amber-200 bg-amber-50/70";
}

function getRemainingStock(product: V2StockProduct) {
  return Math.max(product.totalStock - product.consumedBySales, 0);
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

export function V2ProductosPage() {
  const [stockProducts, setStockProducts] = useState<V2StockProduct[]>(v2StockProducts);
  const [stockMovements, setStockMovements] = useState<V2StockMovementLog[]>([]);
  const [editingProduct, setEditingProduct] = useState<V2StockProduct | null>(
    null
  );

  useEffect(() => {
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
  }, []);

  const categories = useMemo(() => {
    return Array.from(new Set(stockProducts.map((item) => item.category))).sort((a, b) =>
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

  function openEditor(product: V2StockProduct) {
    setEditingProduct(product);
  }

  function openNewProduct() {
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
    setEditingProduct(null);
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
      if (event.key === "Escape") {
        closeActivePopup();
      }
    }

    window.addEventListener("keydown", handleEscapeKey);

    return () => window.removeEventListener("keydown", handleEscapeKey);
  }, [editingProduct]);

  return (
    <V2AppShell>
      <div className="flex h-full min-h-0 flex-col">
        <V2PageHeader
          title="Stock"
          description="Gestioná insumos, stock descontado y alertas de reposición."
          actions={
            <div className="flex flex-wrap justify-end gap-2">
              <Link
                href="/local/historial"
                className="inline-flex h-10 items-center justify-center gap-2 rounded-[10px] border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 hover:text-slate-950"
              >
                <History size={18} />
                Ver historial
              </Link>

              <V2Button variant="primary" icon={<PackagePlus size={18} />} onClick={openNewProduct}>
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
                    cell: (row) => renderSelectableCell(row, row.lastUpdated),
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
                          Editar
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
                    Descuentos y devoluciones de stock.
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
                    onChange={(event) => updateEditingProduct("name", event.target.value)}
                  />
                </V2Field>

                <V2Field label="Categoría">
                  <V2Select
                    value={editingProduct.category}
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
                    onChange={(event) => updateEditingProduct("supplier", event.target.value)}
                  />
                </V2Field>

                <V2Field label="Costo por unidad">
                  <V2Input
                    type="number"
                    value={editingProduct.unitCost}
                    onChange={(event) =>
                      updateEditingProduct("unitCost", Number(event.target.value) || 0)
                    }
                  />
                </V2Field>

                <V2Field label="Stock total">
                  <V2Input
                    type="number"
                    value={editingProduct.totalStock}
                    onChange={(event) =>
                      updateEditingProduct("totalStock", Number(event.target.value) || 0)
                    }
                  />
                </V2Field>

                <V2Field label="Unidad">
                  <V2Select
                    value={editingProduct.unit}
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
                    onChange={(event) =>
                      updateEditingProduct("consumedBySales", Number(event.target.value) || 0)
                    }
                  />
                </V2Field>

                <V2Field label="Alerta personalizada">
                  <V2Input
                    type="number"
                    value={editingProduct.alertBelow}
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
                    {editingProduct.lastUpdated}
                  </p>
                </div>
              </div>

              <div className="mt-4">
                <V2Field label="Nota">
                  <V2Textarea
                    value={editingProduct.note}
                    onChange={(event) => updateEditingProduct("note", event.target.value)}
                  />
                </V2Field>
              </div>
            </div>

            <div className="flex justify-end gap-2 border-t border-slate-200 p-6">
              <V2Button variant="secondary" onClick={closeEditor}>
                Cancelar
              </V2Button>
              <V2Button
                variant="primary"
                onClick={() => {
                  if (!editingProduct) return;

                  const nextEditingProduct = {
                    ...editingProduct,
                    lastUpdated: "Hoy",
                  };
                  const exists = stockProducts.some((product) => product.id === nextEditingProduct.id);
                  const nextProducts = exists
                    ? stockProducts.map((product) =>
                        product.id === nextEditingProduct.id ? nextEditingProduct : product
                      )
                    : [...stockProducts, nextEditingProduct];

                  persistStockProducts(nextProducts);
                  closeEditor();
                }}
              >
                Guardar cambios
              </V2Button>
            </div>
          </div>
        </div>
      ) : null}
    </V2AppShell>
  );
}
