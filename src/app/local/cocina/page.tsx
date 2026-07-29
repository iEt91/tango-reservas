"use client";

import {
  CheckCircle2,
  ChefHat,
  Clock3,
  Flame,
  RotateCcw,
  Table2,
  Truck,
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
const RESERVATIONS_EVENT = "tango-v2-reservations-updated";
const DELIVERIES_EVENT = "tango-v2-deliveries-updated";

type KitchenStatus = "pending" | "preparing" | "ready";
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
  readyAt?: string;
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
  items: Array<{ name: string; quantity: number }>;
  status: KitchenStatus;
  enteredAt?: string;
  startedAt?: string;
  readyAt?: string;
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
        ? { quantity: Number(match[1]) || 1, name: match[2].trim() }
        : { quantity: 1, name: part.trim() };
    })
    .filter((item) => item.name);
}

function getItems(items?: OrderLineItem[], legacyText?: string) {
  const normalized = (items ?? [])
    .filter((item) => Number(item.quantity) > 0)
    .map((item) => ({ name: item.name, quantity: Number(item.quantity) }));

  return normalized.length > 0 ? normalized : parseLegacyItems(legacyText);
}

function subtractTicketItems(
  allItems: Array<{ name: string; quantity: number }>,
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

function getElapsedMinutes(timestamp: string | undefined, now: number) {
  if (!timestamp) return 0;

  const startedAt = new Date(timestamp).getTime();
  if (!Number.isFinite(startedAt)) return 0;

  return Math.max(0, Math.floor((now - startedAt) / 60000));
}

function formatElapsed(minutes: number) {
  if (minutes < 1) return "Ahora";
  if (minutes < 60) return `${minutes} min`;

  const hours = Math.floor(minutes / 60);
  const remainder = minutes % 60;
  return `${hours} h ${remainder} min`;
}

function getCommandTone(minutes: number, status: KitchenStatus) {
  if (status === "ready") return "border-emerald-200 bg-emerald-50/40";
  if (minutes >= 30) return "border-red-200 bg-red-50/40";
  if (minutes >= 15) return "border-orange-200 bg-orange-50/40";
  return "border-slate-200 bg-white";
}

export default function CocinaPage() {
  const [reservations, setReservations] = useState<StoredReservation[]>([]);
  const [deliveries, setDeliveries] = useState<StoredDelivery[]>([]);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    function syncCommands() {
      setReservations(readStorage<StoredReservation[]>(RESERVATIONS_STORAGE_KEY, []));
      setDeliveries(readStorage<StoredDelivery[]>(DELIVERIES_STORAGE_KEY, []));
      setNow(Date.now());
    }

    syncCommands();
    const timer = window.setInterval(() => setNow(Date.now()), 30000);

    window.addEventListener("focus", syncCommands);
    window.addEventListener("storage", syncCommands);
    window.addEventListener(RESERVATIONS_EVENT, syncCommands);
    window.addEventListener(DELIVERIES_EVENT, syncCommands);

    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", syncCommands);
      window.removeEventListener("storage", syncCommands);
      window.removeEventListener(RESERVATIONS_EVENT, syncCommands);
      window.removeEventListener(DELIVERIES_EVENT, syncCommands);
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
                  status: reservation.kitchenStatus ?? "pending",
                  enteredAt: reservation.consumptionStartedAt,
                  startedAt: reservation.kitchenStartedAt,
                  readyAt: reservation.kitchenReadyAt,
                },
              ]
            : [];
        const ticketCommands = tickets.map<KitchenCommand>((ticket) => ({
          ...sharedCommand,
          id: `reservation-${reservation.id}-${ticket.id}`,
          ticketId: ticket.id,
          isAddition: true,
          items: getItems(ticket.items),
          status: ticket.status,
          enteredAt: ticket.createdAt,
          startedAt: ticket.startedAt,
          readyAt: ticket.readyAt,
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
                  status: delivery.kitchenStatus ?? (delivery.readyAt ? "ready" : "pending"),
                  enteredAt: delivery.acceptedAt ?? delivery.createdAt,
                  startedAt: delivery.kitchenStartedAt,
                  readyAt: delivery.kitchenReadyAt ?? delivery.readyAt,
                },
              ]
            : [];
        const ticketCommands = tickets.map<KitchenCommand>((ticket) => ({
          ...sharedCommand,
          id: `delivery-${delivery.id}-${ticket.id}`,
          ticketId: ticket.id,
          isAddition: true,
          items: getItems(ticket.items),
          status: ticket.status,
          enteredAt: ticket.createdAt,
          startedAt: ticket.startedAt,
          readyAt: ticket.readyAt,
        }));

        return [...baseCommand, ...ticketCommands];
      });

    return [...reservationCommands, ...deliveryCommands].sort((a, b) => {
      const aTime = new Date(a.enteredAt ?? `${today}T${a.time}:00`).getTime();
      const bTime = new Date(b.enteredAt ?? `${today}T${b.time}:00`).getTime();
      return aTime - bTime;
    });
  }, [deliveries, reservations]);

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
                            readyAt: status === "ready" ? timestamp : undefined,
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
              kitchenReadyAt: status === "ready" ? timestamp : undefined,
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
                          readyAt: status === "ready" ? timestamp : undefined,
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
            kitchenReadyAt: status === "ready" ? timestamp : undefined,
            readyAt: status === "ready" ? timestamp : undefined,
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
  const averagePreparationMinutes =
    ready.length > 0
      ? Math.round(
          ready.reduce(
            (total, command) =>
              total +
              Math.max(
                0,
                getElapsedMinutes(command.startedAt, new Date(command.readyAt ?? now).getTime()),
              ),
            0,
          ) / ready.length,
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
        />

        <div className="mt-4 grid shrink-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
          <V2MetricCard
            label="Comandas activas"
            value={commands.length}
            helper="Del día actual"
            tone="slate"
            icon={<ChefHat size={22} />}
          />
          <V2MetricCard
            label="Pendientes"
            value={pending.length}
            helper="Esperando inicio"
            tone="orange"
            icon={<Clock3 size={22} />}
          />
          <V2MetricCard
            label="En preparación"
            value={preparing.length}
            helper="En cocina"
            tone="blue"
            icon={<Flame size={22} />}
          />
          <V2MetricCard
            label="Tiempo promedio"
            value={`${averagePreparationMinutes} min`}
            helper={`${ready.length} listas`}
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
                    const elapsed = getElapsedMinutes(
                      command.startedAt ?? command.enteredAt,
                      now,
                    );

                    return (
                      <article
                        key={command.id}
                        className={cn(
                          "rounded-xl border p-3 shadow-sm",
                          getCommandTone(elapsed, command.status),
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
                            tone={
                              command.status === "ready"
                                ? "green"
                                : elapsed >= 30
                                  ? "red"
                                  : elapsed >= 15
                                    ? "orange"
                                    : "slate"
                            }
                            className="shrink-0"
                          >
                            {formatElapsed(elapsed)}
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
                            <V2Button
                              size="sm"
                              variant="secondary"
                              icon={<RotateCcw size={15} />}
                              onClick={() => updateCommand(command, "preparing")}
                            >
                              Reabrir
                            </V2Button>
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
