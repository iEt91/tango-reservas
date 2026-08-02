import { v2NotificationSettings } from "@/lib/v2/v2-mock-data";

export type V2NotificationSettings = {
  notifyNewReservations: boolean;
  notifyNewDeliveries: boolean;
  notifyLowStock: boolean;
  notifyDailySummary: boolean;
  birthdayReminderEnabled: boolean;
  birthdayReminderDays: number;
};

type V2NotificationToggleKey = keyof Pick<
  V2NotificationSettings,
  "notifyNewReservations" | "notifyNewDeliveries" | "notifyLowStock" | "notifyDailySummary"
>;

export const V2_NOTIFICATION_OPTIONS = [
  {
    key: "notifyNewReservations",
    title: "Nuevas reservas",
    description: "Muestra alertas internas cuando entra una reserva pendiente.",
  },
  {
    key: "notifyNewDeliveries",
    title: "Nuevos pedidos",
    description: "Muestra alertas internas cuando entra un pedido web pendiente.",
  },
  {
    key: "notifyLowStock",
    title: "Stock bajo",
    description: "Muestra alertas internas conectadas al módulo Stock.",
  },
  {
    key: "notifyDailySummary",
    title: "Resumen diario",
    description: "Deja activa la preferencia para el resumen operativo del cierre.",
  },
] as const satisfies Array<{
  key: V2NotificationToggleKey;
  title: string;
  description: string;
}>;

function normalizeBoolean(value: unknown, fallback: boolean) {
  if (value === undefined || value === null) return fallback;

  return Boolean(value);
}

function normalizeReminderDays(value: unknown, fallback: number) {
  const parsedValue = Number(value);
  if (!Number.isFinite(parsedValue) || parsedValue < 0) return fallback;

  return Math.round(parsedValue);
}

export function getDefaultNotificationSettings(): V2NotificationSettings {
  return {
    notifyNewReservations: Boolean(v2NotificationSettings.newReservations),
    notifyNewDeliveries: Boolean(v2NotificationSettings.newDeliveries),
    notifyLowStock: Boolean(v2NotificationSettings.lowStock),
    notifyDailySummary: Boolean(v2NotificationSettings.dailySummary),
    birthdayReminderEnabled: true,
    birthdayReminderDays: 7,
  };
}

export function normalizeNotificationSettings(
  value: Partial<V2NotificationSettings> = {}
): V2NotificationSettings {
  const defaults = getDefaultNotificationSettings();

  return {
    notifyNewReservations: normalizeBoolean(
      value.notifyNewReservations,
      defaults.notifyNewReservations
    ),
    notifyNewDeliveries: normalizeBoolean(value.notifyNewDeliveries, defaults.notifyNewDeliveries),
    notifyLowStock: normalizeBoolean(value.notifyLowStock, defaults.notifyLowStock),
    notifyDailySummary: normalizeBoolean(value.notifyDailySummary, defaults.notifyDailySummary),
    birthdayReminderEnabled: normalizeBoolean(
      value.birthdayReminderEnabled,
      defaults.birthdayReminderEnabled
    ),
    birthdayReminderDays: normalizeReminderDays(
      value.birthdayReminderDays,
      defaults.birthdayReminderDays
    ),
  };
}

export function countActiveNotificationSettings(value: Partial<V2NotificationSettings>) {
  const settings = normalizeNotificationSettings(value);

  return [
    ...V2_NOTIFICATION_OPTIONS.map((option) => settings[option.key]),
    settings.birthdayReminderEnabled,
  ].filter(Boolean).length;
}
