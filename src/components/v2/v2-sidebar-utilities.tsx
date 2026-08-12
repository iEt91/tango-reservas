"use client";

import Link from "next/link";
import {
  Bell,
  Boxes,
  CalendarDays,
  CheckCheck,
  LogOut,
  Megaphone,
  PackageCheck,
} from "lucide-react";
import {
  useEffect,
  useMemo,
  useState,
} from "react";
import {
  V2_OPERATIONAL_EVENTS,
  V2_OPERATIONAL_STORAGE_KEYS,
} from "@/lib/v2-operational-storage";
import { cn } from "@/lib/v2/v2-utils";

const READ_NOTIFICATIONS_STORAGE_KEY =
  "tango-v2-notifications-read-v1";
const SYSTEM_NOTIFICATIONS_STORAGE_KEY =
  "tango-v2-system-notifications-v1";
const SYSTEM_NOTIFICATIONS_EVENT =
  "tango-v2-system-notifications-updated";

type StoredReservation = {
  id: string;
  date: string;
  time: string;
  client: string;
  status: string;
  people?: number;
  createdAt?: string;
};

type StoredDelivery = {
  id: string;
  date?: string;
  time: string;
  client: string;
  needsAcceptance?: boolean;
  total?: number;
  totalAmount?: number;
  createdAt?: string;
};

type StoredStockProduct = {
  id: string;
  name: string;
  unit: string;
  totalStock: number;
  consumedBySales: number;
  alertBelow: number;
  updatedAt?: string;
};

type StoredSystemNotification = {
  id: string;
  title: string;
  message: string;
  createdAt: string;
  href?: string;
};

type SidebarNotification = {
  id: string;
  title: string;
  detail: string;
  meta: string;
  href?: string;
  timestamp: number;
  kind: "order" | "reservation" | "stock" | "system";
  priority: "high" | "medium" | "info";
};

function getTodayDateKey() {
  const now = new Date();

  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("-");
}

function readStorage<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function getTimestamp(
  date: string | undefined,
  time: string | undefined,
  createdAt: string | undefined,
) {
  if (createdAt) {
    const parsed = new Date(createdAt).getTime();
    if (Number.isFinite(parsed)) return parsed;
  }

  if (date && time) {
    const parsed = new Date(`${date}T${time}:00`).getTime();
    if (Number.isFinite(parsed)) return parsed;
  }

  return Date.now();
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function buildNotifications() {
  const today = getTodayDateKey();
  const reservations = readStorage<StoredReservation[]>(
    V2_OPERATIONAL_STORAGE_KEYS.reservations,
    [],
  );
  const deliveries = readStorage<StoredDelivery[]>(
    V2_OPERATIONAL_STORAGE_KEYS.deliveries,
    [],
  );
  const stockProducts = readStorage<StoredStockProduct[]>(
    V2_OPERATIONAL_STORAGE_KEYS.stockProducts,
    [],
  );
  const systemNotifications = readStorage<StoredSystemNotification[]>(
    SYSTEM_NOTIFICATIONS_STORAGE_KEY,
    [],
  );
  const notifications: SidebarNotification[] = [];

  for (const delivery of deliveries) {
    if (!delivery.needsAcceptance) continue;

    const total = Number(delivery.total ?? delivery.totalAmount ?? 0);
    notifications.push({
      id: `web-order:${delivery.id}`,
      title: "Pedido pendiente de aceptación",
      detail: `${delivery.client}${total > 0 ? ` · ${formatCurrency(total)}` : ""}`,
      meta: `${delivery.date ?? today} · ${delivery.time}`,
      href: "/local/envios",
      timestamp: getTimestamp(delivery.date ?? today, delivery.time, delivery.createdAt),
      kind: "order",
      priority: "high",
    });
  }

  for (const reservation of reservations) {
    if (reservation.status !== "pending") continue;

    const createdAt = reservation.createdAt
      ? new Date(reservation.createdAt).getTime()
      : Number.NaN;
    const isRecent =
      Number.isFinite(createdAt)
      && Date.now() - createdAt <= 24 * 60 * 60 * 1000;

    if (reservation.date !== today && !isRecent) continue;

    notifications.push({
      id: `reservation:${reservation.id}`,
      title: "Reserva pendiente por confirmar",
      detail: `${reservation.client}${Number(reservation.people) > 0 ? ` · ${reservation.people} personas` : ""}`,
      meta: `${reservation.date} · ${reservation.time}`,
      href: "/local/reservas",
      timestamp: getTimestamp(reservation.date, reservation.time, reservation.createdAt),
      kind: "reservation",
      priority: "medium",
    });
  }

  for (const product of stockProducts) {
    const remaining = Number(product.totalStock) - Number(product.consumedBySales);
    const alertBelow = Number(product.alertBelow);

    if (
      !Number.isFinite(remaining)
      || !Number.isFinite(alertBelow)
      || remaining >= alertBelow
    ) {
      continue;
    }

    notifications.push({
      id: `stock:${product.id}:${product.updatedAt ?? "current"}`,
      title: "Stock bajo",
      detail: product.name,
      meta: `Restan ${Math.max(0, remaining).toFixed(1)} ${product.unit}`,
      href: "/local/stock",
      timestamp: getTimestamp(undefined, undefined, product.updatedAt),
      kind: "stock",
      priority: "medium",
    });
  }

  for (const notification of systemNotifications) {
    const timestamp = new Date(notification.createdAt).getTime();
    notifications.push({
      id: `system:${notification.id}`,
      title: notification.title,
      detail: notification.message,
      meta: "Tango Reservas",
      href: notification.href,
      timestamp: Number.isFinite(timestamp) ? timestamp : Date.now(),
      kind: "system",
      priority: "info",
    });
  }

  return notifications.sort((a, b) => b.timestamp - a.timestamp);
}

function NotificationIcon({ kind }: { kind: SidebarNotification["kind"] }) {
  if (kind === "order") return <PackageCheck size={16} />;
  if (kind === "reservation") return <CalendarDays size={16} />;
  if (kind === "stock") return <Boxes size={16} />;
  return <Megaphone size={16} />;
}

export function V2SidebarUtilities() {
  const [open, setOpen] = useState(false);
  const [revision, setRevision] = useState(0);
  const [readIds, setReadIds] = useState<Set<string>>(() => new Set());

  useEffect(() => {
    setReadIds(new Set(readStorage<string[]>(READ_NOTIFICATIONS_STORAGE_KEY, [])));

    const refresh = () => setRevision((current) => current + 1);
    window.addEventListener("focus", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener(V2_OPERATIONAL_EVENTS.reservations, refresh);
    window.addEventListener(V2_OPERATIONAL_EVENTS.deliveries, refresh);
    window.addEventListener(V2_OPERATIONAL_EVENTS.stockProducts, refresh);
    window.addEventListener(SYSTEM_NOTIFICATIONS_EVENT, refresh);

    return () => {
      window.removeEventListener("focus", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener(V2_OPERATIONAL_EVENTS.reservations, refresh);
      window.removeEventListener(V2_OPERATIONAL_EVENTS.deliveries, refresh);
      window.removeEventListener(V2_OPERATIONAL_EVENTS.stockProducts, refresh);
      window.removeEventListener(SYSTEM_NOTIFICATIONS_EVENT, refresh);
    };
  }, []);

  const notifications = useMemo(() => { void revision; return buildNotifications(); }, [revision]);
  const unreadCount = notifications.filter((item) => !readIds.has(item.id)).length;

  function persistReadIds(next: Set<string>) {
    setReadIds(next);
    try {
      window.localStorage.setItem(
        READ_NOTIFICATIONS_STORAGE_KEY,
        JSON.stringify([...next]),
      );
    } catch {
      // El centro sigue operativo aunque el navegador no persista el estado leído.
    }
  }

  function markRead(id: string) {
    if (readIds.has(id)) return;
    persistReadIds(new Set([...readIds, id]));
  }

  function markAllRead() {
    persistReadIds(new Set(notifications.map((item) => item.id)));
  }

  return (
    <>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => setOpen((current) => !current)}
          aria-label="Abrir notificaciones"
          aria-expanded={open}
          title="Notificaciones"
          className={cn(
            "relative flex h-10 items-center justify-center rounded-[10px] border text-slate-600 transition-colors",
            open
              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
              : "border-slate-200 bg-white hover:bg-slate-50 hover:text-slate-950",
          )}
        >
          <Bell size={18} />
          {unreadCount > 0 ? (
            <span className="absolute right-2 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-red-600 px-1 text-[10px] font-bold leading-4 text-white">
              {unreadCount > 99 ? "99+" : unreadCount}
            </span>
          ) : null}
        </button>

        <form
          method="post"
          action="/auth/logout"
          onSubmit={(event) => {
            if (!window.confirm("¿Cerrar sesión en Tango Reservas?")) {
              event.preventDefault();
            }
          }}
        >
          <button
            type="submit"
            aria-label="Cerrar sesión"
            title="Cerrar sesión"
            className="flex h-10 w-full items-center justify-center rounded-[10px] border border-slate-200 bg-white text-slate-600 transition-colors hover:border-red-200 hover:bg-red-50 hover:text-red-700"
          >
            <LogOut size={18} />
          </button>
        </form>
      </div>

      {open ? (
        <>
          <button
            type="button"
            aria-label="Cerrar notificaciones"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
          />
          <section className="fixed bottom-6 left-[244px] top-24 z-50 flex w-[430px] flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
              <div>
                <p className="text-base font-semibold text-slate-950">Notificaciones</p>
                <p className="mt-0.5 text-xs text-slate-500">
                  Reservas, pedidos, stock y novedades de Tango Reservas.
                </p>
              </div>
              <button
                type="button"
                disabled={unreadCount === 0}
                onClick={markAllRead}
                className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-lg px-2 py-1 text-xs font-medium text-slate-500 hover:bg-slate-50 hover:text-emerald-700 disabled:cursor-default disabled:opacity-40"
              >
                <CheckCheck size={14} />
                Todo leído
              </button>
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto p-3">
              {notifications.length === 0 ? (
                <div className="flex min-h-52 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 px-6 text-center">
                  <CheckCheck className="text-emerald-700" size={20} />
                  <p className="mt-3 text-sm font-semibold text-slate-950">Todo al día</p>
                  <p className="mt-1 max-w-64 text-xs leading-5 text-slate-500">
                    Los nuevos pedidos, reservas, alertas y comunicaciones aparecerán acá.
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((notification) => {
                    const unread = !readIds.has(notification.id);
                    const content = (
                      <div className="flex gap-3">
                        <div className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          notification.priority === "high"
                            ? "bg-red-50 text-red-700"
                            : notification.kind === "system"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-amber-50 text-amber-700",
                        )}>
                          <NotificationIcon kind={notification.kind} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start gap-2">
                            <p className="min-w-0 flex-1 text-sm font-semibold text-slate-950">
                              {notification.title}
                            </p>
                            {unread ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-blue-600" /> : null}
                          </div>
                          <p className="mt-1 text-sm text-slate-700">{notification.detail}</p>
                          <p className="mt-1.5 text-xs text-slate-500">{notification.meta}</p>
                        </div>
                      </div>
                    );

                    return notification.href ? (
                      <Link
                        key={notification.id}
                        href={notification.href}
                        onClick={() => {
                          markRead(notification.id);
                          setOpen(false);
                        }}
                        className={cn(
                          "block rounded-xl border p-3 transition-colors",
                          unread
                            ? "border-blue-100 bg-blue-50/40 hover:bg-blue-50/70"
                            : "border-slate-200 bg-white hover:bg-slate-50",
                        )}
                      >
                        {content}
                      </Link>
                    ) : (
                      <button
                        key={notification.id}
                        type="button"
                        onClick={() => markRead(notification.id)}
                        className={cn(
                          "block w-full rounded-xl border p-3 text-left transition-colors",
                          unread
                            ? "border-blue-100 bg-blue-50/40 hover:bg-blue-50/70"
                            : "border-slate-200 bg-white hover:bg-slate-50",
                        )}
                      >
                        {content}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="border-t border-slate-200 bg-slate-50/70 px-5 py-3 text-xs leading-5 text-slate-500">
              Las comunicaciones enviadas por Tango Reservas también aparecerán en este centro.
            </div>
          </section>
        </>
      ) : null}
    </>
  );
}
