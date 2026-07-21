"use client";

import { use, useEffect, useMemo, useState } from "react";

type V2DeliveryStatus = "confirmed" | "completed" | "cancelled";
type V2DeliveryType = "delivery" | "pickup";

type V2DeliveryOrderItem = {
  id: string;
  name: string;
  price: number;
  quantity: number;
};

type V2Delivery = {
  id: string;
  date?: string;
  time: string;
  client: string;
  phone: string;
  address: string;
  deliveryType: V2DeliveryType;
  order: string;
  orderItems?: V2DeliveryOrderItem[];
  total: number;
  payment: string;
  note: string;
  status: V2DeliveryStatus;
  source?: "web" | "manual";
  needsAcceptance?: boolean;
  trackingId?: string;
  createdAt?: string;
  acceptedAt?: string;
  preparingAt?: string;
  readyAt?: string;
  onTheWayAt?: string;
  deliveredAt?: string;
  cancelledAt?: string;
};

type TrackingPageProps = {
  params: Promise<{
    slug: string;
    trackingId: string;
  }>;
};

const DELIVERIES_STORAGE_KEY = "tango-v2-deliveries-v1";
const DELIVERIES_EVENT = "tango-v2-deliveries-updated";
const CLOSED_TRACKING_VISIBILITY_MINUTES = 1;

const STEP_LABELS = {
  entered: "Pedido recibido",
  confirmed: "Pedido confirmado",
  preparing: "En preparación",
  onTheWay: "En viaje al cliente",
  ready: "Listo para retirar",
  delivered: "Entregado",
  cancelled: "Cancelado",
};

function createPublicCode(prefix: "PED" | "RES", seed?: string) {
  if (!seed) {
    return `${prefix}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
  }

  let hash = 0;

  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }

  return `${prefix}-${hash.toString(36).toUpperCase().slice(0, 5).padStart(5, "0")}`;
}

function getDeliveryTrackingId(delivery: Pick<V2Delivery, "id" | "trackingId">) {
  return delivery.trackingId || createPublicCode("PED", delivery.id);
}

function formatMoney(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatTime(value?: string) {
  if (!value) return "Pendiente";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Pendiente";

  return date.toLocaleTimeString("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function isClosedTrackingExpired(delivery: V2Delivery) {
  if (delivery.status !== "completed" && delivery.status !== "cancelled") {
    return false;
  }

  const closedAt =
    delivery.status === "completed" ? delivery.deliveredAt : delivery.cancelledAt;

  if (!closedAt) return false;

  const closedTime = new Date(closedAt).getTime();

  if (Number.isNaN(closedTime)) return false;

  const expirationMs = CLOSED_TRACKING_VISIBILITY_MINUTES * 60 * 1000;

  return Date.now() - closedTime > expirationMs;
}

function readDeliveries() {
  if (typeof window === "undefined") return [];

  try {
    const raw = window.localStorage.getItem(DELIVERIES_STORAGE_KEY);

    if (!raw) return [];

    const parsed = JSON.parse(raw);

    return Array.isArray(parsed) ? (parsed as V2Delivery[]) : [];
  } catch {
    return [];
  }
}

function normalizeTrackingCode(value: string) {
  return decodeURIComponent(value).trim().toUpperCase();
}

export default function PedidoTrackingPage({ params }: TrackingPageProps) {
  const resolvedParams = use(params);
  const [deliveries, setDeliveries] = useState<V2Delivery[]>([]);
  const trackingCode = normalizeTrackingCode(resolvedParams.trackingId);

  useEffect(() => {
    function syncDeliveries() {
      setDeliveries(readDeliveries());
    }

    syncDeliveries();

    window.addEventListener("storage", syncDeliveries);
    window.addEventListener("focus", syncDeliveries);
    window.addEventListener(DELIVERIES_EVENT, syncDeliveries);

    return () => {
      window.removeEventListener("storage", syncDeliveries);
      window.removeEventListener("focus", syncDeliveries);
      window.removeEventListener(DELIVERIES_EVENT, syncDeliveries);
    };
  }, []);

  const [nowTick, setNowTick] = useState(Date.now());

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNowTick(Date.now());
    }, 30 * 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  const delivery = useMemo(
    () =>
      deliveries.find(
        (item) => getDeliveryTrackingId(item).toUpperCase() === trackingCode,
      ),
    [deliveries, trackingCode],
  );

  const isTrackingExpired = delivery ? isClosedTrackingExpired(delivery) : false;
  void nowTick;

  const steps = useMemo(() => {
    if (!delivery) return [];

    if (delivery.status === "cancelled") {
      return [
        {
          label: STEP_LABELS.entered,
          time: delivery.createdAt,
          done: true,
        },
        {
          label: STEP_LABELS.cancelled,
          time: delivery.cancelledAt,
          done: true,
          danger: true,
        },
      ];
    }

    const isPickup = delivery.deliveryType === "pickup";

    return [
      {
        label: STEP_LABELS.entered,
        time: delivery.createdAt,
        done: true,
      },
      {
        label: STEP_LABELS.confirmed,
        time: delivery.acceptedAt,
        done: Boolean(delivery.acceptedAt),
      },
      {
        label: STEP_LABELS.preparing,
        time: delivery.preparingAt,
        done: Boolean(delivery.preparingAt),
      },
      {
        label: isPickup ? STEP_LABELS.ready : STEP_LABELS.onTheWay,
        time: isPickup ? delivery.readyAt : delivery.onTheWayAt,
        done: Boolean(isPickup ? delivery.readyAt : delivery.onTheWayAt),
      },
      {
        label: STEP_LABELS.delivered,
        time: delivery.deliveredAt,
        done: delivery.status === "completed",
      },
    ];
  }, [delivery]);

  const isClosed = delivery?.status === "completed" || delivery?.status === "cancelled";

  return (
    <main className="min-h-screen bg-[#130d09] px-4 py-10 text-[#f8ead6]">
      <section className="mx-auto flex min-h-[calc(100vh-80px)] w-full max-w-3xl flex-col justify-center">
        <div className="rounded-[2rem] border border-[#d6a96a]/30 bg-[#1c130d] p-6 shadow-2xl shadow-black/30 md:p-8">
          <div className="flex flex-col gap-4 border-b border-[#d6a96a]/20 pb-6 md:flex-row md:items-start md:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.4em] text-[#d6a96a]">
                Seguimiento de pedido
              </p>
              <h1 className="mt-3 text-3xl font-semibold md:text-4xl">
                {delivery ? getDeliveryTrackingId(delivery) : trackingCode}
              </h1>
              <p className="mt-2 text-sm text-[#cbb8a3]">
                Estado público del pedido en tiempo real.
              </p>
            </div>

            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                !delivery || isTrackingExpired
                  ? "border-[#d6a96a]/30 text-[#d6a96a]"
                  : delivery.status === "cancelled"
                    ? "border-red-400/40 bg-red-500/10 text-red-200"
                    : delivery.status === "completed"
                      ? "border-blue-300/40 bg-blue-500/10 text-blue-200"
                      : "border-emerald-300/40 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {!delivery
                ? "No encontrado"
                : isTrackingExpired
                  ? "No disponible"
                  : delivery.status === "cancelled"
                    ? "Cancelado"
                    : delivery.status === "completed"
                      ? "Finalizado"
                      : "Activo"}
            </span>
          </div>

          {!delivery || isTrackingExpired ? (
            <div className="mt-8 rounded-3xl border border-[#d6a96a]/20 bg-black/20 p-5">
              <h2 className="text-xl font-semibold">
                {isTrackingExpired ? "Seguimiento no disponible" : "Pedido no encontrado"}
              </h2>
              <p className="mt-3 leading-7 text-[#cbb8a3]">
                {isTrackingExpired
                  ? "Este pedido ya fue cerrado. Si necesitás ayuda, comunicate con el restaurante."
                  : "Revisá que el código sea correcto. Si el problema continúa, comunicate con el restaurante por WhatsApp."}
              </p>
            </div>
          ) : (
            <>
              {isClosed ? (
                <div className="mt-6 rounded-3xl border border-[#d6a96a]/20 bg-black/20 p-4 text-sm leading-6 text-[#cbb8a3]">
                  El seguimiento de este pedido ya no está activo porque el pedido
                  fue {delivery.status === "completed" ? "entregado" : "cancelado"}.
                  Este link dejará de mostrar los datos del pedido después de {CLOSED_TRACKING_VISIBILITY_MINUTES} minutos.
                </div>
              ) : null}

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-[#d6a96a]/20 bg-black/20 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d6a96a]">
                    Cliente
                  </p>
                  <p className="mt-2 text-lg font-semibold">{delivery.client}</p>
                  <p className="mt-1 text-sm text-[#cbb8a3]">
                    {delivery.deliveryType === "delivery"
                      ? delivery.address
                      : "Retiro en el local"}
                  </p>
                </div>

                <div className="rounded-3xl border border-[#d6a96a]/20 bg-black/20 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d6a96a]">
                    Total
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {formatMoney(delivery.total)}
                  </p>
                  <p className="mt-1 text-sm text-[#cbb8a3]">
                    {delivery.deliveryType === "delivery" ? "Delivery" : "Retiro"}
                  </p>
                </div>
              </div>

              <div className="mt-8 rounded-3xl border border-[#d6a96a]/20 bg-black/20 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d6a96a]">
                  Pedido
                </p>
                <p className="mt-3 leading-7 text-[#f8ead6]">{delivery.order}</p>
              </div>

              <div className="mt-8 rounded-3xl border border-[#d6a96a]/20 bg-black/20 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d6a96a]">
                  Timeline
                </p>

                <div className="mt-5 space-y-4">
                  {steps.map((step, index) => (
                    <div key={step.label} className="flex gap-4">
                      <div className="flex flex-col items-center">
                        <span
                          className={`h-4 w-4 rounded-full border ${
                            step.done
                              ? step.danger
                                ? "border-red-300 bg-red-400"
                                : "border-emerald-300 bg-emerald-400"
                              : "border-[#d6a96a]/30 bg-transparent"
                          }`}
                        />
                        {index < steps.length - 1 ? (
                          <span className="mt-1 h-10 w-px bg-[#d6a96a]/20" />
                        ) : null}
                      </div>

                      <div className="pb-2">
                        <p
                          className={`font-semibold ${
                            step.done ? "text-[#f8ead6]" : "text-[#8f8171]"
                          }`}
                        >
                          {step.label}
                        </p>
                        <p className="mt-1 text-sm text-[#cbb8a3]">
                          {formatTime(step.time)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
