"use client";

import {
  CheckCircle2,
  ChefHat,
  Clock3,
  Flame,
  History,
  RotateCcw,
  Table2,
  Truck,
  X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { V2AppShell } from "@/components/v2/v2-app-shell";
import { V2Badge } from "@/components/v2/v2-badge";
import { V2Button } from "@/components/v2/v2-button";
import { V2Card, V2MetricCard } from "@/components/v2/v2-card";
import { V2PageHeader } from "@/components/v2/v2-page-header";
import { cn } from "@/lib/v2/v2-utils";

const RESERVATIONS_STORAGE_KEY = "tango-v2-reservations-calendar-v2";
const DELIVERIES_STORAGE_KEY = "tango-v2-deliveries-v1";
const LOCAL_CONFIG_STORAGE_KEY = "tango-v2-local-config-v1";
const RESERVATIONS_EVENT = "tango-v2-reservations-updated";
const DELIVERIES_EVENT = "tango-v2-deliveries-updated";
const LOCAL_CONFIG_EVENT = "tango-v2-local-config-updated";
const DEFAULT_PREPARATION_TIME_SECONDS = 15 * 60;

type KitchenStatus = "pending" | "preparing" | "ready" | "completed";
type CommandSource = "reservation" | "delivery";

type OrderLineItem = {
  menuItemId?: string;
  id?: string;
  name: string;
  price: number;
  quantity: number;
};

type KitchenTicket = {
  id: string;
  status: KitchenStatus;
  items: OrderLineItem[];
  createdAt: string;
  startedAt?: string;
  readyAt?: string;
  completedAt?: string;
};

type StoredRecipe = {
  menuItemId: string;
  name: string;
  preparationTimeSeconds?: number;
};

type StoredReservation = {
  id: string;
  date: string;
  time: string;
  client: string;
  tableName?: string;
  note?: string;
  status: string;
  orderItems?: string;
  orderLineItems?: OrderLineItem[];
  consumptionStartedAt?: string;
  kitchenStatus?: KitchenStatus;
  kitchenStartedAt?: string;
  kitchenReadyAt?: string;
  kitchenCompletedAt?: string;
  kitchenTickets?: KitchenTicket[];
};

type StoredDelivery = {
  id: string;
  date?: string;
  time: string;
  client: string;
  deliveryType: "delivery" | "pickup";
  note?: string;
  status: string;
  needsAcceptance?: boolean;
  order?: string;
  orderItems?: OrderLineItem[];
  createdAt?: string;
  acceptedAt?: string;
  kitchenStatus?: KitchenStatus;
  kitchenStartedAt?: string;
  kitchenReadyAt?: string;
  kitchenCompletedAt?: string;
  readyAt?: string;
  completedAt?: string;
  kitchenTickets?: KitchenTicket[];
};

type KitchenCommand = {
  id: string;
  sourceId: string;
  source: CommandSource;
  sourceLabel: string;
  client: string;
  time: string;
  note: string;
  items: Array<{ menuItemId?: string; name: string; quantity: number }>;
  status: KitchenStatus;
  targetSeconds: number;
  enteredAt?: string;
  startedAt?: string;
  readyAt?: string;
  completedAt?: string;
  ticketId?: string;
  isAddition?: boolean;
};

function getTodayDateKey() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function parseLegacyItems(value?: string) {
  if (!value?.trim()) return [];

  return value
    .split(/\s*[·,\n]\s*/)
    .map((part) => {
      const match = part.trim().match(/^(\d+)\s*x\s*(.+)$/i);
      return match
        ? { menuItemId: undefined, quantity: Number(match[1]) || 1, name: match[2].trim() }
        : { menuItemId: undefined, quantity: 1, name: part.trim() };
    })
    .filter((item) => item.name);
}

function getItems(items?: OrderLineItem[], legacyText?: string) {
  const normalized = (items ?? [])
    .filter((item) => Number(item.quantity) > 0)
    .map((item) => ({
      menuItemId: item.menuItemId ?? item.id,
      name: item.name,
      quantity: Number(item.quantity),
    }));

  return normalized.length > 0 ? normalized : parseLegacyItems(legacyText);
}

function subtractTicketItems(
  allItems: Array<{ menuItemId?: string; name: string; quantity: number }>,
  tickets: KitchenTicket[],
) {
  const ticketQuantities = new Map<string, number>();

  tickets.forEach((ticket) => {
    ticket.items.forEach((item) => {
      const key = item.name.trim().toLowerCase();
      ticketQuantities.set(key, (ticketQuantities.get(key) ?? 0) + Number(item.quantity));
    });
  });

  return allItems.flatMap((item) => {
    const key = item.name.trim().toLowerCase();
    const remainingQuantity = item.quantity - (ticketQuantities.get(key) ?? 0);

    return remainingQuantity > 0 ? [{ ...item, quantity: remainingQuantity }] : [];
  });
}

function getCommandTargetSeconds(
  items: Array<{ menuItemId?: string; name: string; quantity: number }>,
  recipes: StoredRecipe[],
) {
  const longestPreparationTime = items.reduce((longestTime, item) => {
    const normalizedName = item.name.trim().toLowerCase();
    const recipe = recipes.find(
      (candidate) =>
        (item.menuItemId && candidate.menuItemId === item.menuItemId) ||
        candidate.name.trim().toLowerCase() === normalizedName,
    );
    const preparationTime = Math.max(
      1,
      Number(recipe?.preparationTimeSeconds) || DEFAULT_PREPARATION_TIME_SECONDS,
    );

    return Math.max(longestTime, preparationTime);
  }, 0);

  return longestPreparationTime || DEFAULT_PREPARATION_TIME_SECONDS;
}

function getElapsedSeconds(timestamp: string | undefined, endTime: number) {
  if (!timestamp) return 0;

  const startedAt = new Date(timestamp).getTime();
  if (!Number.isFinite(startedAt)) return 0;

  return Math.max(0, Math.floor((endTime - startedAt) / 1000));
}

function formatDuration(totalSeconds: number) {
  const normalizedSeconds = Math.max(0, Math.floor(totalSeconds));
  const minutes = Math.floor(normalizedSeconds / 60);
  const seconds = normalizedSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function getCommandTone(
  elapsedSeconds: number,
  targetSeconds: number,
  status: KitchenStatus,
) {
  if (status === "ready") return "border-emerald-200 bg-emerald-50/40";
  if (elapsedSeconds >= targetSeconds) return "border-red-200 bg-red-50/40";
  if (elapsedSeconds >= targetSeconds * 0.75) {
    return "border-orange-200 bg-orange-50/40";
  }

  return "border-emerald-200 bg-emerald-50/30";
}

function getTimerBadgeTone(
  elapsedSeconds: number,
  targetSeconds: number,
  status: KitchenStatus,
): "green" | "orange" | "red" {
  if (
    status === "ready" ||
    status === "completed" ||
    elapsedSeconds < targetSeconds * 0.75
  ) {
    return "green";
  }
  if (elapsedSeconds < targetSeconds) return "orange";

  return "red";
}

export default function CocinaPage() {
  const [reservations, setReservations] = useState<StoredReservation[]>([]);
  const [deliveries, setDeliveries] = useState<StoredDelivery[]>([]);
  const [recipes, setRecipes] = useState<StoredRecipe[]>([]);
  const [now, setNow] = useState(() => Date.now());
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  useEffect(() => {
    function syncCommands() {
      setReservations(readStorage<StoredReservation[]>(RESERVATIONS_STORAGE_KEY, []));
      setDeliveries(readStorage<StoredDelivery[]>(DELIVERIES_STORAGE_KEY, []));
      setRecipes(
        readStorage<{ recipes?: StoredRecipe[] }>(LOCAL_CONFIG_STORAGE_KEY, {}).recipes ?? [],
      );
      setNow(Date.now());
    }

    syncCommands();
    const timer = window.setInterval(() => setNow(Date.now()), 1000);

    window.addEventListener("focus", syncCommands);
    window.addEventListener("storage", syncCommands);
    window.addEventListener(RESERVATIONS_EVENT, syncCommands);
    window.addEventListener(DELIVERIES_EVENT, syncCommands);
    window.addEventListener(LOCAL_CONFIG_EVENT, syncCommands);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", syncCommands);
      window.removeEventListener("storage", syncCommands);
      window.removeEventListener(RESERVATIONS_EVENT, syncCommands);
      window.removeEventListener(DELIVERIES_EVENT, syncCommands);
      window.removeEventListener(LOCAL_CONFIG_EVENT, syncCommands);
    };
  }, []);

  const commands = useMemo<KitchenCommand[]>(() => {
    const today = getTodayDateKey();

    const reservationCommands = reservations
      .filter(
        (reservation) =>
          reservation.date === today &&
          reservation.status === "confirmed" &&
          getItems(reservation.orderLineItems, reservation.orderItems).length > 0,
      )
      .flatMap<KitchenCommand>((reservation) => {
        const tickets = reservation.kitchenTickets ?? [];
        const baseItems = subtractTicketItems(
          getItems(reservation.orderLineItems, reservation.orderItems),
          tickets,
        );
        const sharedCommand = {
          sourceId: reservation.id,
          source: "reservation" as const,
          sourceLabel: reservation.tableName || "Mesa sin asignar",
          client: reservation.client,
          time: reservation.time,
          note: reservation.note?.trim() && reservation.note !== "—" ? reservation.note : "",
        };
        const baseCommand: KitchenCommand[] =
          baseItems.length > 0
            ? [
                {
                  ...sharedCommand,
                  id: `reservation-${reservation.id}`,
                  items: baseItems,
                  targetSeconds: getCommandTargetSeconds(baseItems, recipes),
                  status: reservation.kitchenStatus ?? "pending",
                  enteredAt: reservation.consumptionStartedAt,
                  startedAt: reservation.kitchenStartedAt,
                  readyAt: reservation.kitchenReadyAt,
                  completedAt: reservation.kitchenCompletedAt,
                },
              ]
            : [];
        const ticketCommands = tickets.map<KitchenCommand>((ticket) => ({
          ...sharedCommand,
          id: `reservation-${reservation.id}-${ticket.id}`,
          ticketId: ticket.id,
          isAddition: true,
          items: getItems(ticket.items),
          targetSeconds: getCommandTargetSeconds(getItems(ticket.items), recipes),
          status: ticket.status,
          enteredAt: ticket.createdAt,
          startedAt: ticket.startedAt,
          readyAt: ticket.readyAt,
          completedAt: ticket.completedAt,
        }));

        return [...baseCommand, ...ticketCommands];
      });

    const deliveryCommands = deliveries
      .filter(
        (delivery) =>
          (delivery.date ?? today) === today &&
          delivery.status === "confirmed" &&
          !delivery.needsAcceptance &&
          getItems(delivery.orderItems, delivery.order).length > 0,
      )
      .flatMap<KitchenCommand>((delivery) => {
        const tickets = delivery.kitchenTickets ?? [];
        const baseItems = subtractTicketItems(getItems(delivery.orderItems, delivery.order), tickets);
        const sharedCommand = {
          sourceId: delivery.id,
          source: "delivery" as const,
          sourceLabel: delivery.deliveryType === "delivery" ? "Delivery" : "Retiro",
          client: delivery.client,
          time: delivery.time,
          note: delivery.note?.trim() && delivery.note !== "—" ? delivery.note : "",
        };
        const baseCommand: KitchenCommand[] =
          baseItems.length > 0
            ? [
                {
                  ...sharedCommand,
                  id: `delivery-${delivery.id}`,
                  items: baseItems,
                  targetSeconds: getCommandTargetSeconds(baseItems, recipes),
                  status: delivery.kitchenStatus ?? (delivery.readyAt ? "ready" : "pending"),
                  enteredAt: delivery.acceptedAt ?? delivery.createdAt,
                  startedAt: delivery.kitchenStartedAt,
                  readyAt: delivery.kitchenReadyAt ?? delivery.readyAt,
                  completedAt: delivery.kitchenCompletedAt,
                },
              ]
            : [];
        const ticketCommands = tickets.map<KitchenCommand>((ticket) => ({
          ...sharedCommand,
          id: `delivery-${delivery.id}-${ticket.id}`,
          ticketId: ticket.id,
          isAddition: true,
          items: getItems(ticket.items),
          targetSeconds: getCommandTargetSeconds(getItems(ticket.items), recipes),
          status: ticket.status,
          enteredAt: ticket.createdAt,
          startedAt: ticket.startedAt,
          readyAt: ticket.readyAt,
          completedAt: ticket.completedAt,
        }));

        return [...baseCommand, ...ticketCommands];
      });

    return [...reservationCommands, ...deliveryCommands].sort((a, b) => {
      const aTime = new Date(a.enteredAt ?? `${today}T${a.time}:00`).getTime();
      const bTime = new Date(b.enteredAt ?? `${today}T${b.time}:00`).getTime();
      return aTime - bTime;
    });
  }, [deliveries, recipes, reservations]);

  function updateCommand(command: KitchenCommand, status: KitchenStatus) {
    const timestamp = new Date().toISOString();

    if (command.source === "reservation") {
      const nextReservations = reservations.map((reservation) =>
        reservation.id === command.sourceId
          ? {
              ...reservation,
              ...(command.ticketId
                ? {
                    kitchenTickets: (reservation.kitchenTickets ?? []).map((ticket) =>
                      ticket.id === command.ticketId
                        ? {
                            ...ticket,
                            status,
                            startedAt:
                              status === "preparing"
                                ? ticket.startedAt ?? timestamp
                                : status === "pending"
                                  ? undefined
                                  : ticket.startedAt,
                            readyAt:
                              status === "ready"
                                ? ticket.readyAt ?? timestamp
                                : status === "completed"
                                  ? ticket.readyAt
                                  : undefined,
                            completedAt: status === "completed" ? timestamp : undefined,
                          }
                        : ticket,
                    ),
                  }
                : {
              kitchenStatus: status,
              kitchenStartedAt:
                status === "preparing"
                  ? reservation.kitchenStartedAt ?? timestamp
                  : status === "pending"
                    ? undefined
                    : reservation.kitchenStartedAt,
              kitchenReadyAt:
                status === "ready"
                  ? reservation.kitchenReadyAt ?? timestamp
                  : status === "completed"
                    ? reservation.kitchenReadyAt
                    : undefined,
              kitchenCompletedAt: status === "completed" ? timestamp : undefined,
                  }),
            }
          : reservation,
      );

      window.localStorage.setItem(RESERVATIONS_STORAGE_KEY, JSON.stringify(nextReservations));
      setReservations(nextReservations);
      window.dispatchEvent(new Event(RESERVATIONS_EVENT));
      return;
    }

    const nextDeliveries = deliveries.map((delivery) =>
      delivery.id === command.sourceId
        ? {
            ...delivery,
            ...(command.ticketId
              ? {
                  kitchenTickets: (delivery.kitchenTickets ?? []).map((ticket) =>
                    ticket.id === command.ticketId
                      ? {
                          ...ticket,
                          status,
                          startedAt:
                            status === "preparing"
                              ? ticket.startedAt ?? timestamp
                              : status === "pending"
                                ? undefined
                                : ticket.startedAt,
                          readyAt:
                            status === "ready"
                              ? ticket.readyAt ?? timestamp
                              : status === "completed"
                                ? ticket.readyAt
                                : undefined,
                          completedAt: status === "completed" ? timestamp : undefined,
                        }
                      : ticket,
                  ),
                }
              : {
            kitchenStatus: status,
            kitchenStartedAt:
              status === "preparing"
                ? delivery.kitchenStartedAt ?? timestamp
                : status === "pending"
                  ? undefined
                  : delivery.kitchenStartedAt,
            kitchenReadyAt:
              status === "ready"
                ? delivery.kitchenReadyAt ?? timestamp
                : status === "completed"
                  ? delivery.kitchenReadyAt
                  : undefined,
            kitchenCompletedAt: status === "completed" ? timestamp : undefined,
            readyAt:
              status === "ready"
                ? delivery.readyAt ?? timestamp
                : status === "completed"
                  ? delivery.readyAt
                  : undefined,
                }),
          }
        : delivery,
    );

    window.localStorage.setItem(DELIVERIES_STORAGE_KEY, JSON.stringify(nextDeliveries));
    setDeliveries(nextDeliveries);
    window.dispatchEvent(new Event(DELIVERIES_EVENT));
  }

  const pending = commands.filter((command) => command.status === "pending");
  const preparing = commands.filter((command) => command.status === "preparing");
  const ready = commands.filter((command) => command.status === "ready");
  const finished = commands.filter(
    (command) => command.status === "ready" || command.status === "completed",
  );
  const averagePreparationSeconds =
    finished.length > 0
      ? Math.round(
          finished.reduce(
            (total, command) =>
              total +
              Math.max(
                0,
                getElapsedSeconds(
                  command.startedAt,
                  new Date(command.readyAt ?? now).getTime(),
                ),
              ),
            0,
          ) / finished.length,
        )
      : 0;

  const columns: Array<{
    status: KitchenStatus;
    title: string;
    helper: string;
    commands: KitchenCommand[];
    tone: "orange" | "blue" | "green";
  }> = [
    {
      status: "pending",
      title: "Pendientes",
      helper: "Esperando preparación",
      commands: pending,
      tone: "orange",
    },
    {
      status: "preparing",
      title: "En preparación",
      helper: "Trabajando ahora",
      commands: preparing,
      tone: "blue",
    },
    {
      status: "ready",
      title: "Listas",
      helper: "Para entregar o servir",
      commands: ready,
      tone: "green",
    },
  ];

  return (
    <V2AppShell>
      <div className="flex h-full min-h-0 flex-col">
        <V2PageHeader
          title="Cocina"
          description="Comandas de mesas, delivery y retiro en una sola pantalla."
          actions={
            <V2Button
              variant="secondary"
              icon={<History size={17} />}
              onClick={() => setIsHistoryOpen(true)}
            >
              Historial de cocina
            </V2Button>
          }
        />

        <div className="mt-4 grid shrink-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <V2MetricCard
            label="En preparación"
            value={preparing.length}
            helper="En cocina"
            tone="blue"
            icon={<Flame size={22} />}
          />
          <V2MetricCard
            label="Pendientes"
            value={pending.length}
            helper="Esperando inicio"
            tone="orange"
            icon={<Clock3 size={22} />}
          />
          <V2MetricCard
            label="Terminadas"
            value={finished.length}
            helper="Preparadas hoy"
            tone="green"
            icon={<ChefHat size={22} />}
          />
          <V2MetricCard
            label="Tiempo promedio"
            value={formatDuration(averagePreparationSeconds)}
            helper={`${finished.length} terminadas`}
            tone="green"
            icon={<CheckCircle2 size={22} />}
          />
        </div>

        <div className="mt-3 grid min-h-0 flex-1 gap-3 xl:grid-cols-3">
          {columns.map((column) => (
            <V2Card key={column.status} className="flex min-h-0 flex-col overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
                <div>
                  <h2 className="font-semibold text-slate-950">{column.title}</h2>
                  <p className="text-xs text-slate-500">{column.helper}</p>
                </div>
                <V2Badge tone={column.tone}>{column.commands.length}</V2Badge>
              </div>

              <div className="v2-kitchen-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-3">
                {column.commands.length === 0 ? (
                  <div className="flex min-h-40 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
                    <CheckCircle2 className="text-emerald-500" size={28} />
                    <p className="mt-2 text-sm font-semibold text-slate-700">
                      Sin comandas {column.title.toLowerCase()}
                    </p>
                  </div>
                ) : (
                  column.commands.map((command) => {
                    const elapsedSeconds = getElapsedSeconds(
                      command.startedAt ?? command.enteredAt,
                      command.readyAt ? new Date(command.readyAt).getTime() : now,
                    );

                    return (
                      <article
                        key={command.id}
                        className={cn(
                          "rounded-xl border p-3 shadow-sm",
                          getCommandTone(
                            elapsedSeconds,
                            command.targetSeconds,
                            command.status,
                          ),
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              {command.source === "reservation" ? (
                                <Table2 className="shrink-0 text-emerald-700" size={17} />
                              ) : (
                                <Truck className="shrink-0 text-orange-600" size={17} />
                              )}
                              <p className="truncate font-semibold text-slate-950">
                                {command.sourceLabel}
                              </p>
                              {command.isAddition ? (
                                <span className="shrink-0 rounded-md bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700">
                                  Agregado
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-0.5 truncate text-xs text-slate-500">
                              {command.client} · {command.time}
                            </p>
                          </div>
                          <V2Badge
                            tone={getTimerBadgeTone(
                              elapsedSeconds,
                              command.targetSeconds,
                              command.status,
                            )}
                            className="shrink-0"
                          >
                            {formatDuration(elapsedSeconds)} /{" "}
                            {formatDuration(command.targetSeconds)}
                          </V2Badge>
                        </div>

                        <div className="my-3 border-t border-slate-200" />

                        <ul className="space-y-1.5">
                          {command.items.map((item, index) => (
                            <li
                              key={`${item.name}-${index}`}
                              className="flex gap-2 text-sm text-slate-800"
                            >
                              <span className="font-bold text-slate-950">{item.quantity}×</span>
                              <span>{item.name}</span>
                            </li>
                          ))}
                        </ul>

                        {command.note ? (
                          <p className="mt-3 rounded-lg bg-amber-50 px-2.5 py-2 text-xs text-amber-900">
                            {command.note}
                          </p>
                        ) : null}

                        <div className="mt-3 flex justify-end">
                          {command.status === "pending" ? (
                            <V2Button
                              size="sm"
                              variant="primary"
                              icon={<Flame size={15} />}
                              onClick={() => updateCommand(command, "preparing")}
                            >
                              Comenzar
                            </V2Button>
                          ) : command.status === "preparing" ? (
                            <V2Button
                              size="sm"
                              variant="success"
                              icon={<CheckCircle2 size={15} />}
                              onClick={() => updateCommand(command, "ready")}
                            >
                              Marcar lista
                            </V2Button>
                          ) : (
                            <div className="flex items-center gap-2">
                              <V2Button
                                size="sm"
                                variant="secondary"
                                icon={<RotateCcw size={15} />}
                                onClick={() => updateCommand(command, "preparing")}
                              >
                                Reabrir
                              </V2Button>
                              <V2Button
                                size="sm"
                                variant="success"
                                icon={<CheckCircle2 size={15} />}
                                onClick={() => updateCommand(command, "completed")}
                              >
                                {command.source === "reservation" ? "Servida" : "Despachada"}
                              </V2Button>
                            </div>
                          )}
                        </div>
                      </article>
                    );
                  })
                )}
              </div>
            </V2Card>
          ))}
        </div>
      </div>

      {isHistoryOpen ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 px-4 py-8 backdrop-blur-sm"
          onClick={() => setIsHistoryOpen(false)}
        >
          <div
            className="flex max-h-full w-full max-w-3xl flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                  Cocina
                </p>
                <h2 className="mt-1 text-xl font-semibold text-slate-950">
                  Historial del día
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Comandas listas, servidas y despachadas por cocina.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsHistoryOpen(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-950"
                aria-label="Cerrar historial"
              >
                <X size={18} />
              </button>
            </div>

            <div className="v2-kitchen-scrollbar min-h-0 flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-4">
              {[...finished]
                .sort(
                  (a, b) =>
                    new Date(b.completedAt ?? b.readyAt ?? 0).getTime() -
                    new Date(a.completedAt ?? a.readyAt ?? 0).getTime(),
                )
                .map((command) => (
                  <article
                    key={`history-${command.id}`}
                    className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {command.source === "reservation" ? (
                            <Table2 className="text-emerald-700" size={17} />
                          ) : (
                            <Truck className="text-orange-600" size={17} />
                          )}
                          <p className="font-semibold text-slate-950">{command.sourceLabel}</p>
                          {command.isAddition ? (
                            <V2Badge tone="blue">Agregado</V2Badge>
                          ) : null}
                        </div>
                        <p className="mt-1 text-sm text-slate-500">
                          {command.client} · {command.time}
                        </p>
                      </div>
                      <V2Badge tone="green">
                        {command.status === "completed"
                          ? command.source === "reservation"
                            ? "Servida"
                            : "Despachada"
                          : "Lista"}
                      </V2Badge>
                    </div>

                    <p className="mt-3 text-sm text-slate-700">
                      {command.items
                        .map((item) => `${item.quantity}× ${item.name}`)
                        .join(" · ")}
                    </p>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-500">
                      {command.startedAt ? (
                        <span>Inicio: {new Date(command.startedAt).toLocaleTimeString("es-AR")}</span>
                      ) : null}
                      {command.readyAt ? (
                        <span>Lista: {new Date(command.readyAt).toLocaleTimeString("es-AR")}</span>
                      ) : null}
                      {command.completedAt ? (
                        <span>
                          {command.source === "reservation" ? "Servida" : "Despachada"}:{" "}
                          {new Date(command.completedAt).toLocaleTimeString("es-AR")}
                        </span>
                      ) : null}
                    </div>
                  </article>
                ))}

              {finished.length === 0 ? (
                <div className="flex min-h-56 flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white p-6 text-center">
                  <History className="text-slate-300" size={34} />
                  <p className="mt-3 font-semibold text-slate-950">
                    Todavía no hay comandas terminadas
                  </p>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      <style jsx global>{`
        .v2-kitchen-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #94a3b8 transparent;
        }

        .v2-kitchen-scrollbar::-webkit-scrollbar {
          width: 9px;
        }

        .v2-kitchen-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .v2-kitchen-scrollbar::-webkit-scrollbar-thumb {
          border: 2px solid transparent;
          border-radius: 999px;
          background: #94a3b8;
          background-clip: padding-box;
        }
      `}</style>
    </V2AppShell>
  );
}
