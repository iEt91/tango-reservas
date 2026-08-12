"use client";

import {
  use,
  useEffect,
  useMemo,
  useState,
} from "react";
import { getDataSource } from "@/lib/data/dataSource";
import type { PublicShippingTrackingSnapshot } from "@/lib/public-shipping/public-shipping-contract";
import {
  CLOSED_DELIVERY_TRACKING_GRACE_MINUTES,
  isClosedDeliveryTrackingExpired,
} from "@/lib/public-tracking-core";
import {
  V2_OPERATIONAL_EVENTS,
  V2_OPERATIONAL_STORAGE_KEYS,
} from "@/lib/v2-operational-storage";

type V2DeliveryStatus =
  | "confirmed"
  | "completed"
  | "cancelled";

type V2DeliveryType =
  | "delivery"
  | "pickup";

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

type TrackingStep = {
  label: string;
  time?: string | null;
  done: boolean;
  danger?: boolean;
};

const DELIVERIES_STORAGE_KEY =
  V2_OPERATIONAL_STORAGE_KEYS.deliveries;
const DELIVERIES_EVENT =
  V2_OPERATIONAL_EVENTS.deliveries;

const STEP_LABELS = {
  entered:
    "Pedido recibido",
  confirmed:
    "Pedido confirmado",
  preparing:
    "En preparación",
  onTheWay:
    "En viaje al cliente",
  ready:
    "Listo para retirar",
  delivered:
    "Entregado",
  cancelled:
    "Cancelado",
};

function createPublicCode(
  prefix: "PED" | "RES",
  seed?: string,
) {
  if (!seed) {
    return `${prefix}-${Math.random()
      .toString(36)
      .slice(2, 7)
      .toUpperCase()}`;
  }

  let hash = 0;

  for (
    let index = 0;
    index < seed.length;
    index += 1
  ) {
    hash =
      (
        hash * 31
        + seed.charCodeAt(index)
      )
      >>> 0;
  }

  return `${prefix}-${hash
    .toString(36)
    .toUpperCase()
    .slice(0, 5)
    .padStart(5, "0")}`;
}

function getDeliveryTrackingId(
  delivery: Pick<
    V2Delivery,
    "id" | "trackingId"
  >,
) {
  return (
    delivery.trackingId
    || createPublicCode(
      "PED",
      delivery.id,
    )
  );
}

function formatMoney(
  value: number,
) {
  return new Intl.NumberFormat(
    "es-AR",
    {
      style: "currency",
      currency: "ARS",
      maximumFractionDigits: 0,
    },
  ).format(value);
}

function formatTime(
  value?: string | null,
) {
  if (!value) {
    return "Pendiente";
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime(),
    )
  ) {
    return "Pendiente";
  }

  return date.toLocaleTimeString(
    "es-AR",
    {
      hour: "2-digit",
      minute: "2-digit",
    },
  );
}

function readDeliveries() {
  if (
    typeof window
    === "undefined"
  ) {
    return [];
  }

  try {
    const raw =
      window.localStorage.getItem(
        DELIVERIES_STORAGE_KEY,
      );

    if (!raw) {
      return [];
    }

    const parsed =
      JSON.parse(raw);

    return Array.isArray(parsed)
      ? parsed as V2Delivery[]
      : [];
  } catch {
    return [];
  }
}

function normalizeTrackingCode(
  value: string,
) {
  return decodeURIComponent(value)
    .trim()
    .toUpperCase();
}

function buildLocalSteps(
  delivery: V2Delivery,
): TrackingStep[] {
  if (
    delivery.status
    === "cancelled"
  ) {
    return [
      {
        label:
          STEP_LABELS.entered,
        time:
          delivery.createdAt,
        done: true,
      },
      {
        label:
          STEP_LABELS.cancelled,
        time:
          delivery.cancelledAt,
        done: true,
        danger: true,
      },
    ];
  }

  const isPickup =
    delivery.deliveryType
    === "pickup";

  return [
    {
      label:
        STEP_LABELS.entered,
      time:
        delivery.createdAt,
      done: true,
    },
    {
      label:
        STEP_LABELS.confirmed,
      time:
        delivery.acceptedAt,
      done:
        Boolean(
          delivery.acceptedAt,
        ),
    },
    {
      label:
        STEP_LABELS.preparing,
      time:
        delivery.preparingAt,
      done:
        Boolean(
          delivery.preparingAt,
        ),
    },
    {
      label:
        isPickup
          ? STEP_LABELS.ready
          : STEP_LABELS.onTheWay,
      time:
        isPickup
          ? delivery.readyAt
          : delivery.onTheWayAt,
      done:
        Boolean(
          isPickup
            ? delivery.readyAt
            : delivery.onTheWayAt,
        ),
    },
    {
      label:
        STEP_LABELS.delivered,
      time:
        delivery.deliveredAt,
      done:
        delivery.status
        === "completed",
    },
  ];
}

function buildPersistentSteps(
  tracking:
    PublicShippingTrackingSnapshot,
): TrackingStep[] {
  if (
    tracking.status
    === "cancelled"
  ) {
    return [
      {
        label:
          STEP_LABELS.entered,
        time:
          tracking.createdAt,
        done: true,
      },
      {
        label:
          STEP_LABELS.cancelled,
        time:
          tracking.cancelledAt,
        done: true,
        danger: true,
      },
    ];
  }

  const isPickup =
    tracking.deliveryType
    === "pickup";

  return [
    {
      label:
        STEP_LABELS.entered,
      time:
        tracking.createdAt,
      done: true,
    },
    {
      label:
        STEP_LABELS.confirmed,
      time:
        tracking.acceptedAt,
      done:
        Boolean(
          tracking.acceptedAt,
        ),
    },
    {
      label:
        STEP_LABELS.preparing,
      time:
        tracking.preparingAt,
      done:
        Boolean(
          tracking.preparingAt,
        ),
    },
    {
      label:
        isPickup
          ? STEP_LABELS.ready
          : STEP_LABELS.onTheWay,
      time:
        isPickup
          ? tracking.readyAt
          : tracking.onTheWayAt,
      done:
        Boolean(
          isPickup
            ? tracking.readyAt
            : tracking.onTheWayAt,
        ),
    },
    {
      label:
        STEP_LABELS.delivered,
      time:
        tracking.completedAt,
      done:
        tracking.status
        === "completed",
    },
  ];
}

export default function PedidoTrackingPage({
  params,
}: TrackingPageProps) {
  const resolvedParams =
    use(params);
  const isSupabasePersistence =
    getDataSource()
    === "supabase";
  const slug =
    decodeURIComponent(
      resolvedParams.slug,
    )
      .trim()
      .toLowerCase();
  const trackingCode =
    normalizeTrackingCode(
      resolvedParams.trackingId,
    );

  const [
    localDeliveries,
    setLocalDeliveries,
  ] =
    useState<V2Delivery[]>([]);
  const [
    persistentTracking,
    setPersistentTracking,
  ] =
    useState<
      PublicShippingTrackingSnapshot
      | null
    >(null);
  const [
    persistentLoaded,
    setPersistentLoaded,
  ] =
    useState(false);
  const [
    trackingError,
    setTrackingError,
  ] =
    useState("");
  const [
    nowTick,
    setNowTick,
  ] =
    useState(0);

  useEffect(() => {
    if (isSupabasePersistence) {
      return;
    }

    function syncDeliveries() {
      setLocalDeliveries(
        readDeliveries(),
      );
    }

    syncDeliveries();

    window.addEventListener(
      "storage",
      syncDeliveries,
    );
    window.addEventListener(
      "focus",
      syncDeliveries,
    );
    window.addEventListener(
      DELIVERIES_EVENT,
      syncDeliveries,
    );

    return () => {
      window.removeEventListener(
        "storage",
        syncDeliveries,
      );
      window.removeEventListener(
        "focus",
        syncDeliveries,
      );
      window.removeEventListener(
        DELIVERIES_EVENT,
        syncDeliveries,
      );
    };
  }, [
    isSupabasePersistence,
  ]);

  useEffect(() => {
    if (!isSupabasePersistence) {
      return;
    }

    let cancelled = false;

    async function refreshTracking() {
      try {
        const response =
          await fetch(
            `/api/public/${encodeURIComponent(slug)}/shipping/${encodeURIComponent(trackingCode)}`,
            {
              cache: "no-store",
            },
          );

        if (cancelled) {
          return;
        }

        if (response.status === 404) {
          setPersistentTracking(
            null,
          );
          setPersistentLoaded(true);
          setTrackingError("");
          return;
        }

        const payload =
          await response.json() as {
            tracking?:
              PublicShippingTrackingSnapshot;
            error?: string;
          };

        if (!response.ok) {
          setTrackingError(
            payload.error
            ?? "No se pudo actualizar el seguimiento.",
          );
          setPersistentLoaded(true);
          return;
        }

        setPersistentTracking(
          payload.tracking
          ?? null,
        );
        setPersistentLoaded(true);
        setTrackingError("");
      } catch {
        if (!cancelled) {
          setTrackingError(
            "No se pudo actualizar el seguimiento.",
          );
          setPersistentLoaded(true);
        }
      }
    }

    const refresh = () => {
      void refreshTracking();
    };

    refresh();

    const intervalId =
      window.setInterval(
        refresh,
        30 * 1000,
      );

    window.addEventListener(
      "focus",
      refresh,
    );

    return () => {
      cancelled = true;
      window.clearInterval(
        intervalId,
      );
      window.removeEventListener(
        "focus",
        refresh,
      );
    };
  }, [
    isSupabasePersistence,
    slug,
    trackingCode,
  ]);

  useEffect(() => {
    if (isSupabasePersistence) {
      return;
    }

    const intervalId =
      window.setInterval(
        () => {
          setNowTick(
            Date.now(),
          );
        },
        30 * 1000,
      );

    return () =>
      window.clearInterval(
        intervalId,
      );
  }, [
    isSupabasePersistence,
  ]);

  const localDelivery =
    useMemo(
      () =>
        localDeliveries.find(
          (item) =>
            getDeliveryTrackingId(
              item,
            ).toUpperCase()
            === trackingCode,
        )
        ?? null,
      [
        localDeliveries,
        trackingCode,
      ],
    );

  const localExpired =
    localDelivery
      ? isClosedDeliveryTrackingExpired(
          localDelivery,
        )
      : false;
  void nowTick;

  const status =
    isSupabasePersistence
      ? persistentTracking?.status
      : localDelivery?.status;
  const deliveryType =
    isSupabasePersistence
      ? persistentTracking
          ?.deliveryType
      : localDelivery
          ?.deliveryType;
  const total =
    isSupabasePersistence
      ? persistentTracking?.total
      : localDelivery?.total;
  const displayedTracking =
    isSupabasePersistence
      ? persistentTracking
          ?.trackingId
        ?? trackingCode
      : localDelivery
          ? getDeliveryTrackingId(
              localDelivery,
            )
          : trackingCode;
  const isClosed =
    status === "completed"
    || status === "cancelled";
  const notFound =
    isSupabasePersistence
      ? (
          persistentLoaded
          && !persistentTracking
        )
      : (
          !localDelivery
          || localExpired
        );

  const steps =
    useMemo(
      () => {
        if (
          isSupabasePersistence
        ) {
          return persistentTracking
            ? buildPersistentSteps(
                persistentTracking,
              )
            : [];
        }

        return localDelivery
          ? buildLocalSteps(
              localDelivery,
            )
          : [];
      },
      [
        isSupabasePersistence,
        localDelivery,
        persistentTracking,
      ],
    );

  const orderSummary =
    isSupabasePersistence
      ? (
          persistentTracking
            ?.items
            .map(
              (item) =>
                `${item.quantity}x ${item.name}`,
            )
            .join(", ")
          ?? ""
        )
      : (
          localDelivery?.order
          ?? ""
        );

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
                {displayedTracking}
              </h1>
              <p className="mt-2 text-sm text-[#cbb8a3]">
                Estado público del pedido en tiempo real.
              </p>
            </div>

            <span
              className={`inline-flex rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${
                notFound
                  ? "border-[#d6a96a]/30 text-[#d6a96a]"
                  : status === "cancelled"
                    ? "border-red-400/40 bg-red-500/10 text-red-200"
                    : status === "completed"
                      ? "border-blue-300/40 bg-blue-500/10 text-blue-200"
                      : "border-emerald-300/40 bg-emerald-500/10 text-emerald-200"
              }`}
            >
              {notFound
                ? "No disponible"
                : status === "cancelled"
                  ? "Cancelado"
                  : status === "completed"
                    ? "Finalizado"
                    : "Activo"}
            </span>
          </div>

          {trackingError ? (
            <div className="mt-6 rounded-3xl border border-amber-300/25 bg-amber-400/10 p-4 text-sm leading-6 text-amber-100">
              {trackingError}
            </div>
          ) : null}

          {!persistentLoaded
            && isSupabasePersistence
          ? (
            <div className="mt-8 rounded-3xl border border-[#d6a96a]/20 bg-black/20 p-5 text-[#cbb8a3]">
              Cargando seguimiento…
            </div>
          )
          : notFound ? (
            <div className="mt-8 rounded-3xl border border-[#d6a96a]/20 bg-black/20 p-5">
              <h2 className="text-xl font-semibold">
                Seguimiento no disponible
              </h2>
              <p className="mt-3 leading-7 text-[#cbb8a3]">
                Revisá que el código sea correcto. Si el pedido ya fue cerrado, este enlace deja de mostrar datos después del período de cortesía.
              </p>
            </div>
          ) : (
            <>
              {isClosed ? (
                <div className="mt-6 rounded-3xl border border-[#d6a96a]/20 bg-black/20 p-4 text-sm leading-6 text-[#cbb8a3]">
                  El pedido fue{" "}
                  {status === "completed"
                    ? "entregado"
                    : "cancelado"}.
                  {" "}
                  Este link dejará de mostrar sus datos después de{" "}
                  {CLOSED_DELIVERY_TRACKING_GRACE_MINUTES} minuto.
                </div>
              ) : null}

              <div className="mt-8 grid gap-4 md:grid-cols-2">
                <div className="rounded-3xl border border-[#d6a96a]/20 bg-black/20 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d6a96a]">
                    Entrega
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {deliveryType === "pickup"
                      ? "Retiro en el local"
                      : "Delivery"}
                  </p>
                  {isSupabasePersistence
                    && persistentTracking
                      ?.needsAcceptance ? (
                    <p className="mt-1 text-sm text-[#cbb8a3]">
                      Pendiente de aceptación por el restaurante.
                    </p>
                  ) : null}
                  {isSupabasePersistence
                    && persistentTracking
                      ?.etaMinutes ? (
                    <p className="mt-1 text-sm text-[#cbb8a3]">
                      Tiempo estimado:{" "}
                      {persistentTracking.etaMinutes} min.
                    </p>
                  ) : null}
                  {!isSupabasePersistence
                    && localDelivery ? (
                    <p className="mt-1 text-sm text-[#cbb8a3]">
                      {localDelivery.deliveryType === "delivery"
                        ? localDelivery.address
                        : "Retiro en el local"}
                    </p>
                  ) : null}
                </div>

                <div className="rounded-3xl border border-[#d6a96a]/20 bg-black/20 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d6a96a]">
                    Total
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {formatMoney(
                      total
                      ?? 0,
                    )}
                  </p>
                  <p className="mt-1 text-sm text-[#cbb8a3]">
                    Importe canónico del pedido.
                  </p>
                </div>
              </div>

              {!isSupabasePersistence
                && localDelivery ? (
                <div className="mt-8 rounded-3xl border border-[#d6a96a]/20 bg-black/20 p-5">
                  <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d6a96a]">
                    Cliente
                  </p>
                  <p className="mt-2 text-lg font-semibold">
                    {localDelivery.client}
                  </p>
                  <p className="mt-1 text-sm text-[#cbb8a3]">
                    La vista persistente no publica datos personales.
                  </p>
                </div>
              ) : null}

              <div className="mt-8 rounded-3xl border border-[#d6a96a]/20 bg-black/20 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d6a96a]">
                  Pedido
                </p>
                <p className="mt-3 leading-7 text-[#f8ead6]">
                  {orderSummary}
                </p>
              </div>

              <div className="mt-8 rounded-3xl border border-[#d6a96a]/20 bg-black/20 p-5">
                <p className="text-xs font-bold uppercase tracking-[0.28em] text-[#d6a96a]">
                  Timeline
                </p>

                <div className="mt-5 space-y-4">
                  {steps.map(
                    (
                      step,
                      index,
                    ) => (
                      <div
                        key={step.label}
                        className="flex gap-4"
                      >
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
                          {index
                            < steps.length - 1 ? (
                            <span className="mt-1 h-10 w-px bg-[#d6a96a]/20" />
                          ) : null}
                        </div>

                        <div className="pb-2">
                          <p
                            className={`font-semibold ${
                              step.done
                                ? "text-[#f8ead6]"
                                : "text-[#8f8171]"
                            }`}
                          >
                            {step.label}
                          </p>
                          <p className="mt-1 text-sm text-[#cbb8a3]">
                            {formatTime(
                              step.time,
                            )}
                          </p>
                        </div>
                      </div>
                    ),
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      </section>
    </main>
  );
}
