"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  CalendarClock,
  Clock3,
  Database,
  Download,
  ExternalLink,
  Globe2,
  MapPin,
  Save,
  ShoppingBag,
  SlidersHorizontal,
  Upload,
  UsersRound,
} from "lucide-react";
import { V2AppShell } from "@/components/v2/v2-app-shell";
import { V2Badge } from "@/components/v2/v2-badge";
import { V2Button } from "@/components/v2/v2-button";
import { V2Card } from "@/components/v2/v2-card";
import { V2Field, V2Input, V2Select, V2Textarea } from "@/components/v2/v2-input";
import { V2PageHeader } from "@/components/v2/v2-page-header";
import {
  createTangoLocalBackup,
  parseTangoLocalBackup,
  restoreTangoLocalBackup,
  type TangoLocalBackup,
} from "@/lib/local-backup";
import {
  V2_NOTIFICATION_OPTIONS,
  countActiveNotificationSettings,
  normalizeNotificationSettings,
  type V2NotificationSettings,
} from "@/lib/notification-settings";
import { V2_OPERATIONAL_EVENTS, V2_OPERATIONAL_STORAGE_KEYS } from "@/lib/v2-operational-storage";
import {
  saveBusinessHoursAction,
  saveReservationConfigurationAction,
} from "./actions";
import { mergeBusinessHoursEditor } from "@/lib/configuration/business-hours-contract";
import {
  mergeReservationSettingsEditor,
  normalizeReservationSettingsEditor,
  type ReservationSettingsEditor,
} from "@/lib/configuration/reservation-settings-contract";
import {
  v2BusinessHours,
  v2DeliverySettings,
  v2LocalSettings,
  v2LocalUsers,
  v2ReservationSettings,
} from "@/lib/v2/v2-mock-data";


const LOCAL_CONFIG_STORAGE_KEY = V2_OPERATIONAL_STORAGE_KEYS.localConfig;
const LOCAL_CONFIG_EVENT = V2_OPERATIONAL_EVENTS.localConfig;

type V2BusinessHourSlot = {
  open: string;
  close: string;
};

type V2BusinessHourConfig = {
  day: string;
  open: string;
  close: string;
  enabled: boolean;
  slots: V2BusinessHourSlot[];
};

type V2LocalConfigState = V2NotificationSettings & {
  businessName: string;
  businessType: string;
  publicUrl: string;
  status: "active" | "draft" | "paused";
  description: string;
  address: string;
  phone: string;
  whatsapp: string;
  instagram: string;
  email: string;
  timezone: string;
  businessHours: V2BusinessHourConfig[];
  reservationEnabled: boolean;
  standardDurationMinutes: number;
  confirmationMode: "manual" | "automatic";
  defaultReservationStatus: "pending" | "confirmed";
  minimumNoticeHours: number;
  bookingWindowDays: number;
  maxPeoplePerSlot: number;
  allowReservationsWithoutTable: boolean;
  autoAssignReservationTables: boolean;
  allowTableCombinations: boolean;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  estimatedDeliveryMinutes: number;
  fixedDeliveryCost: number;
  minimumOrder: number;
  paymentMethods: string;
  coverageZones: string;
};

function normalizeNumber(value: unknown, fallback: number) {
  const parsedValue = Number(value);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

const TIME_SELECT_OPTIONS = Array.from({ length: 48 }, (_, index) => {
  const totalMinutes = index * 30;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
});

function normalizeTimeToSelectOption(value: string, fallback: string) {
  if (TIME_SELECT_OPTIONS.includes(value)) return value;

  return fallback;
}

function timeOptionToMinutes(value: string) {
  const [hours, minutes] = value.split(":").map(Number);
  return hours * 60 + minutes;
}

function isNextDayClosingTime(
  openTime: string,
  closeTime: string
) {
  return (
    timeOptionToMinutes(closeTime)
    <= timeOptionToMinutes(openTime)
  );
}

function getClosingTimeOptions(openTime: string) {
  const openIndex = TIME_SELECT_OPTIONS.indexOf(openTime);

  if (openIndex < 0) {
    return TIME_SELECT_OPTIONS.map((value) => ({
      value,
      label: value,
    }));
  }

  return Array.from(
    { length: TIME_SELECT_OPTIONS.length - 1 },
    (_, offset) => {
      const index =
        (openIndex + offset + 1)
        % TIME_SELECT_OPTIONS.length;
      const value = TIME_SELECT_OPTIONS[index];
      const nextDay = index <= openIndex;

      return {
        value,
        label: nextDay
          ? `${value} (día siguiente)`
          : value,
      };
    }
  );
}

function normalizeBusinessHourSlots(
  item: Partial<V2BusinessHourConfig>
): V2BusinessHourSlot[] {
  const fallbackSlots = [
    {
      open: normalizeTimeToSelectOption(item.open ?? "12:00", "12:00"),
      close: normalizeTimeToSelectOption(item.close ?? "00:00", "00:00"),
    },
  ];

  const rawSlots =
    Array.isArray(item.slots) && item.slots.length > 0 ? item.slots : fallbackSlots;

  return rawSlots.slice(0, 2).map((slot) => ({
    open: normalizeTimeToSelectOption(slot.open, "12:00"),
    close: normalizeTimeToSelectOption(slot.close, "00:00"),
  }));
}

function normalizeBusinessHour(item: Partial<V2BusinessHourConfig>): V2BusinessHourConfig {
  const slots = normalizeBusinessHourSlots(item);

  return {
    day: item.day ?? "",
    open: slots[0]?.open ?? "12:00",
    close: slots[0]?.close ?? "00:00",
    enabled: Boolean(item.enabled),
    slots,
  };
}

function formatBusinessHourSlots(item: V2BusinessHourConfig) {
  if (!item.enabled) return "Cerrado";

  return item.slots
    .map((slot) => (
      `${slot.open}–${slot.close}${isNextDayClosingTime(
        slot.open,
        slot.close
      ) ? " (+1 día)" : ""}`
    ))
    .join(" / ");
}

function getDefaultConfig(): V2LocalConfigState {
  return {
    businessName: v2LocalSettings.businessName,
    businessType: v2LocalSettings.businessType,
    publicUrl: v2LocalSettings.publicUrl,
    status: v2LocalSettings.status as V2LocalConfigState["status"],
    description: v2LocalSettings.description,
    address: v2LocalSettings.address,
    phone: v2LocalSettings.phone,
    whatsapp: v2LocalSettings.whatsapp,
    instagram: v2LocalSettings.instagram,
    email: v2LocalSettings.email,
    timezone: v2LocalSettings.timezone,
    businessHours: v2BusinessHours.map((item) =>
      normalizeBusinessHour({
        day: item.day,
        open: item.open,
        close: item.close,
        enabled: item.enabled,
      })
    ),
    reservationEnabled: Boolean(v2ReservationSettings.enabled),
    standardDurationMinutes: normalizeNumber(v2ReservationSettings.standardDurationMinutes, 120),
    confirmationMode: v2ReservationSettings.confirmationMode === "automatic" ? "automatic" : "manual",
    defaultReservationStatus: v2ReservationSettings.confirmationMode === "automatic" ? "confirmed" : "pending",
    minimumNoticeHours: normalizeNumber(v2ReservationSettings.minimumNoticeHours, 2),
    bookingWindowDays: normalizeNumber(v2ReservationSettings.bookingWindowDays, 14),
    maxPeoplePerSlot: normalizeNumber(v2ReservationSettings.maxPeoplePerSlot, 40),
    allowReservationsWithoutTable: false,
    autoAssignReservationTables: true,
    allowTableCombinations: true,
    deliveryEnabled: Boolean(v2DeliverySettings.enabled),
    pickupEnabled: Boolean(v2DeliverySettings.pickupEnabled),
    estimatedDeliveryMinutes: normalizeNumber(v2DeliverySettings.estimatedMinutes, 45),
    fixedDeliveryCost: normalizeNumber(v2DeliverySettings.fixedDeliveryCost, 0),
    minimumOrder: normalizeNumber(v2DeliverySettings.minimumOrder, 0),
    paymentMethods: v2DeliverySettings.paymentMethods.join(", "),
    coverageZones: v2DeliverySettings.coverageZones.join(", "),
    ...normalizeNotificationSettings(),
  };
}

function readConfigFromStorage() {
  if (typeof window === "undefined") return getDefaultConfig();

  try {
    const rawValue = window.localStorage.getItem(LOCAL_CONFIG_STORAGE_KEY);
    if (!rawValue) return getDefaultConfig();

    const parsedConfig = JSON.parse(rawValue) as Partial<V2LocalConfigState>;
    const defaultConfig = getDefaultConfig();

    return {
      ...defaultConfig,
      ...parsedConfig,
      allowReservationsWithoutTable:
        parsedConfig.allowReservationsWithoutTable ?? defaultConfig.allowReservationsWithoutTable,
      autoAssignReservationTables:
        parsedConfig.autoAssignReservationTables ?? defaultConfig.autoAssignReservationTables,
      allowTableCombinations:
        parsedConfig.allowTableCombinations ?? defaultConfig.allowTableCombinations,
      ...normalizeNotificationSettings(parsedConfig),
      businessHours: (parsedConfig.businessHours ?? defaultConfig.businessHours).map((item) =>
        normalizeBusinessHour(item)
      ),
    };
  } catch {
    return getDefaultConfig();
  }
}

function writeConfigToStorage(value: V2LocalConfigState) {
  if (typeof window === "undefined") return;

  window.localStorage.setItem(LOCAL_CONFIG_STORAGE_KEY, JSON.stringify(value));
  window.dispatchEvent(new Event(LOCAL_CONFIG_EVENT));
}

function booleanSelectValue(value: boolean) {
  return value ? "enabled" : "disabled";
}

function booleanFromSelect(value: string) {
  return value === "enabled";
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function roleLabel(role: (typeof v2LocalUsers)[number]["role"]) {
  const labels = {
    owner: "Dueño",
    manager: "Encargado",
    staff: "Empleado",
    support: "Soporte",
  };

  return labels[role];
}

export function V2ConfiguracionPage({
  initialBusinessHours = null,
  initialReservationSettings = null,
  businessHoursPersistence = "local",
  reservationSettingsPersistence = "local",
}: {
  initialBusinessHours?: V2BusinessHourConfig[] | null;
  initialReservationSettings?: ReservationSettingsEditor | null;
  businessHoursPersistence?: "local" | "supabase";
  reservationSettingsPersistence?: "local" | "supabase";
}) {
  const [config, setConfig] = useState<V2LocalConfigState>(() => getDefaultConfig());
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveError, setSaveError] = useState("");
  const [backupMessage, setBackupMessage] = useState("");
  const [pendingBackup, setPendingBackup] = useState<TangoLocalBackup | null>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const localConfig = readConfigFromStorage();
    const reservationSettings =
      mergeReservationSettingsEditor(
        normalizeReservationSettingsEditor(localConfig),
        initialReservationSettings,
      );

    setConfig({
      ...localConfig,
      ...reservationSettings,
      businessHours: mergeBusinessHoursEditor(
        localConfig.businessHours,
        initialBusinessHours,
      ),
    });
  }, [initialBusinessHours, initialReservationSettings]);

  const openDays = useMemo(
    () => config.businessHours.filter((item) => item.enabled),
    [config.businessHours]
  );
  const closedDays = useMemo(
    () => config.businessHours.filter((item) => !item.enabled),
    [config.businessHours]
  );
  const notificationOptions = V2_NOTIFICATION_OPTIONS.map((option) => ({
    ...option,
    value: config[option.key],
  }));
  const activeNotificationCount = countActiveNotificationSettings(config);

  function updateConfig<K extends keyof V2LocalConfigState>(
    field: K,
    value: V2LocalConfigState[K]
  ) {
    setConfig((current) => ({ ...current, [field]: value }));
    setSaveStatus("idle");
    setSaveError("");
  }

  function updateConfirmationMode(
    value: V2LocalConfigState["confirmationMode"]
  ) {
    setConfig((current) => ({
      ...current,
      confirmationMode: value,
      defaultReservationStatus:
        value === "automatic" ? "confirmed" : "pending",
    }));
    setSaveStatus("idle");
    setSaveError("");
  }

  function updateDefaultReservationStatus(
    value: V2LocalConfigState["defaultReservationStatus"]
  ) {
    setConfig((current) => ({
      ...current,
      defaultReservationStatus: value,
      confirmationMode:
        value === "confirmed" ? "automatic" : "manual",
    }));
    setSaveStatus("idle");
    setSaveError("");
  }

  function updateBusinessHour(
    day: string,
    field: "enabled",
    value: boolean
  ) {
    setConfig((current) => ({
      ...current,
      businessHours: current.businessHours.map((item) =>
        item.day === day ? normalizeBusinessHour({ ...item, [field]: value }) : item
      ),
    }));
    setSaveStatus("idle");
  }

  function updateBusinessHourSlot(
    day: string,
    slotIndex: number,
    field: keyof V2BusinessHourSlot,
    value: string
  ) {
    setConfig((current) => ({
      ...current,
      businessHours: current.businessHours.map((item) => {
        if (item.day !== day) return item;

        const nextSlots = normalizeBusinessHourSlots(item);
        const currentSlot = nextSlots[slotIndex];
        const nextClose =
          field === "open" && currentSlot.close === value
            ? getClosingTimeOptions(value)[0]?.value
              ?? currentSlot.close
            : currentSlot.close;

        nextSlots[slotIndex] = {
          ...currentSlot,
          [field]: value,
          close: field === "open"
            ? nextClose
            : value,
        };

        return normalizeBusinessHour({ ...item, slots: nextSlots });
      }),
    }));
    setSaveStatus("idle");
  }

  function addBusinessHourSlot(day: string) {
    setConfig((current) => ({
      ...current,
      businessHours: current.businessHours.map((item) => {
        if (item.day !== day) return item;

        const currentSlots = normalizeBusinessHourSlots(item);
        if (currentSlots.length >= 2) return item;

        return normalizeBusinessHour({
          ...item,
          slots: [...currentSlots, { open: "19:00", close: "00:00" }],
        });
      }),
    }));
    setSaveStatus("idle");
  }

  function removeBusinessHourSlot(day: string, slotIndex: number) {
    setConfig((current) => ({
      ...current,
      businessHours: current.businessHours.map((item) => {
        if (item.day !== day) return item;

        const nextSlots = normalizeBusinessHourSlots(item).filter((_, index) => index !== slotIndex);

        return normalizeBusinessHour({
          ...item,
          slots: nextSlots.length > 0 ? nextSlots : [{ open: "12:00", close: "00:00" }],
        });
      }),
    }));
    setSaveStatus("idle");
  }

  async function saveConfig() {
    const normalizedHours = config.businessHours.map((item) =>
      normalizeBusinessHour(item)
    );
    const normalizedReservationSettings =
      normalizeReservationSettingsEditor(config);
    let nextConfig = {
      ...config,
      ...normalizedReservationSettings,
      businessHours: normalizedHours,
    };

    setSaveStatus("saving");
    setSaveError("");

    if (
      businessHoursPersistence === "supabase"
      && reservationSettingsPersistence === "supabase"
    ) {
      const result = await saveReservationConfigurationAction({
        businessHours: normalizedHours,
        reservationSettings: normalizedReservationSettings,
      });

      if (!result.ok) {
        setSaveError(result.error);
        setSaveStatus("error");
        return;
      }

      nextConfig = {
        ...nextConfig,
        ...result.reservationSettings,
        businessHours: result.businessHours,
      };
    } else if (businessHoursPersistence === "supabase") {
      const result = await saveBusinessHoursAction(normalizedHours);

      if (!result.ok) {
        setSaveError(result.error);
        setSaveStatus("error");
        return;
      }

      nextConfig = {
        ...nextConfig,
        businessHours: result.businessHours,
      };
    }

    setConfig(nextConfig);
    writeConfigToStorage(nextConfig);
    setSaveStatus("saved");
  }

  function exportBackup() {
    try {
      const backup = createTangoLocalBackup(window.localStorage, v2LocalSettings.version);
      const file = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(file);
      const link = document.createElement("a");
      link.href = url;
      link.download = `tango-reservas-backup-${new Date().toISOString().slice(0, 10)}.json`;
      link.click();
      URL.revokeObjectURL(url);
      setBackupMessage(`Respaldo descargado: ${Object.keys(backup.entries).length} registros.`);
    } catch {
      setBackupMessage("No se pudo generar el respaldo.");
    }
  }

  async function selectBackup(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;

    try {
      const backup = parseTangoLocalBackup(await file.text());
      setPendingBackup(backup);
      setBackupMessage("");
    } catch (error) {
      setPendingBackup(null);
      setBackupMessage(error instanceof Error ? error.message : "El respaldo no es válido.");
    }
  }

  function confirmRestore() {
    if (!pendingBackup) return;

    try {
      restoreTangoLocalBackup(window.localStorage, pendingBackup);
      window.location.reload();
    } catch {
      setPendingBackup(null);
      setBackupMessage("No se pudo restaurar. Los datos anteriores se conservaron.");
    }
  }

  return (
    <V2AppShell>
      <div className="flex h-full min-h-0 flex-col">
        <V2PageHeader
          title="Configuración"
          description="Configurá los datos, reglas operativas y permisos del local."
          actions={
            <>
              <V2Button variant="secondary" icon={<ExternalLink size={17} />}>
                Ver sitio público
              </V2Button>
              {saveStatus === "saved" ? (
                <V2Badge tone="green">Cambios guardados</V2Badge>
              ) : null}
              {saveStatus === "error" ? (
                <V2Badge tone="red" className="max-w-64" >
                  {saveError || "No se pudieron guardar los cambios"}
                </V2Badge>
              ) : null}
              <V2Button
                variant="primary"
                icon={<Save size={17} />}
                onClick={() => void saveConfig()}
                disabled={saveStatus === "saving"}
              >
                {saveStatus === "saving"
                  ? "Guardando..."
                  : "Guardar cambios"}
              </V2Button>
            </>
          }
        />

        <div className="mt-4 grid min-h-0 flex-1 items-stretch gap-4 overflow-hidden xl:grid-cols-[1fr_340px]">
          <div className="v2-config-scrollbar min-h-0 overflow-y-auto pr-1 pb-2">
            <div className="space-y-4 pb-2">
              <div className="sticky top-0 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
                <div className="flex items-center gap-2 overflow-x-auto">
                  <a href="#config-datos" className="whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800">Datos</a>
                  <a href="#config-contacto" className="whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800">Contacto</a>
                  <a href="#config-horarios" className="whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800">Horarios</a>
                  <a href="#config-reservas" className="whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800">Reservas</a>
                  <a href="#config-envios" className="whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800">Envíos</a>
                  <a href="#config-notificaciones" className="whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800">Notificaciones</a>
                  <a href="#config-usuarios" className="whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800">Usuarios</a>
                  <a href="#config-sistema" className="whitespace-nowrap rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800">Sistema</a>
                </div>
              </div>

              <div id="config-datos" className="scroll-mt-20">
                <V2Card>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
                    <Globe2 size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">Datos del negocio</h2>
                    <p className="mt-1 text-sm text-slate-500">Información operativa que identifica al local dentro del panel.</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <V2Field label="Nombre del negocio">
                    <V2Input value={config.businessName} onChange={(event) => updateConfig("businessName", event.target.value)} />
                  </V2Field>
                  <V2Field label="Rubro">
                    <V2Select value={config.businessType} onChange={(event) => updateConfig("businessType", event.target.value)}>
                      <option value="restaurant">Restaurante</option>
                      <option value="professional">Profesional</option>
                      <option value="beauty">Belleza / estética</option>
                      <option value="other">Otro rubro</option>
                    </V2Select>
                  </V2Field>
                  <V2Field label="Estado del local">
                    <V2Select value={config.status} onChange={(event) => updateConfig("status", event.target.value as V2LocalConfigState["status"])}>
                      <option value="active">Activo</option>
                      <option value="draft">Borrador</option>
                      <option value="paused">Pausado</option>
                    </V2Select>
                  </V2Field>
                  <div className="md:col-span-2">
                    <V2Field label="Descripción breve">
                      <V2Textarea value={config.description} onChange={(event) => updateConfig("description", event.target.value)} />
                    </V2Field>
                  </div>
                </div>
                </V2Card>
              </div>

              <div id="config-contacto" className="scroll-mt-20">
                <V2Card>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
                    <MapPin size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">Contacto operativo</h2>
                    <p className="mt-1 text-sm text-slate-500">Datos base del local usados en reservas, envíos, soporte y futuras notificaciones.</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <V2Field label="Dirección"><V2Input value={config.address} onChange={(event) => updateConfig("address", event.target.value)} /></V2Field>
                  <V2Field label="Teléfono"><V2Input value={config.phone} onChange={(event) => updateConfig("phone", event.target.value)} /></V2Field>
                  <V2Field label="WhatsApp"><V2Input value={config.whatsapp} onChange={(event) => updateConfig("whatsapp", event.target.value)} /></V2Field>
                  <V2Field label="Instagram"><V2Input value={config.instagram} onChange={(event) => updateConfig("instagram", event.target.value)} /></V2Field>
                  <V2Field label="Email"><V2Input value={config.email} onChange={(event) => updateConfig("email", event.target.value)} /></V2Field>
                  <V2Field label="Zona horaria"><V2Input value={config.timezone} onChange={(event) => updateConfig("timezone", event.target.value)} /></V2Field>
                </div>
                </V2Card>
              </div>

              <div id="config-horarios" className="scroll-mt-20">
                <V2Card>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-orange-50 text-orange-700">
                      <Clock3 size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-slate-950">Horarios comerciales</h2>
                      <p className="mt-1 text-sm text-slate-500">Definen la disponibilidad base para reservas y pedidos.</p>
                    </div>
                  </div>
                  <V2Badge tone="blue">{openDays.length} días abiertos</V2Badge>
                </div>

                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                  {config.businessHours.map((item) => {
                    const slots = normalizeBusinessHourSlots(item);

                    return (
                      <div key={item.day} className="border-b border-slate-100 px-4 py-3 text-sm last:border-b-0">
                        <div className="grid grid-cols-[120px_1fr_110px] items-start gap-3">
                          <div className="pt-2">
                            <p className="font-semibold text-slate-950">{item.day}</p>
                            <p className="mt-1 text-xs text-slate-500">{formatBusinessHourSlots(item)}</p>
                          </div>

                          <div className="space-y-2">
                            {slots.map((slot, slotIndex) => (
                              <div key={`${item.day}-slot-${slotIndex}`} className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                                <V2Select
                                  value={normalizeTimeToSelectOption(slot.open, "12:00")}
                                  disabled={!item.enabled}
                                  onChange={(event) =>
                                    updateBusinessHourSlot(item.day, slotIndex, "open", event.target.value)
                                  }
                                >
                                  {TIME_SELECT_OPTIONS.map((time) => (
                                    <option key={`${item.day}-open-${slotIndex}-${time}`} value={time}>
                                      {time}
                                    </option>
                                  ))}
                                </V2Select>
                                <V2Select
                                  value={normalizeTimeToSelectOption(slot.close, "00:00")}
                                  disabled={!item.enabled}
                                  onChange={(event) =>
                                    updateBusinessHourSlot(item.day, slotIndex, "close", event.target.value)
                                  }
                                >
                                  {getClosingTimeOptions(slot.open).map((option) => (
                                    <option
                                      key={`${item.day}-close-${slotIndex}-${option.value}`}
                                      value={option.value}
                                    >
                                      {option.label}
                                    </option>
                                  ))}
                                </V2Select>
                                {slotIndex === 0 ? (
                                  <button
                                    type="button"
                                    onClick={() => addBusinessHourSlot(item.day)}
                                    disabled={!item.enabled || slots.length >= 2}
                                    className="h-9 rounded-xl border border-emerald-200 px-3 text-xs font-bold text-emerald-700 transition hover:bg-emerald-50 disabled:cursor-not-allowed disabled:opacity-40"
                                  >
                                    + Tramo
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => removeBusinessHourSlot(item.day, slotIndex)}
                                    className="h-9 rounded-xl border border-red-200 px-3 text-xs font-bold text-red-600 transition hover:bg-red-50"
                                  >
                                    Quitar
                                  </button>
                                )}
                              </div>
                            ))}
                          </div>

                          <V2Select
                            value={booleanSelectValue(item.enabled)}
                            onChange={(event) => updateBusinessHour(item.day, "enabled", booleanFromSelect(event.target.value))}
                          >
                            <option value="enabled">Abierto</option>
                            <option value="disabled">Cerrado</option>
                          </V2Select>
                        </div>
                      </div>
                    );
                  })}
                </div>
                </V2Card>
              </div>

              <div id="config-reservas" className="scroll-mt-20">
                <V2Card>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
                    <CalendarClock size={20} />
                  </div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">Reglas de reservas</h2>
                    <p className="mt-1 text-sm text-slate-500">Parámetros para calcular disponibilidad y validar reservas.</p>
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <V2Field label="Reservas online">
                    <V2Select value={booleanSelectValue(config.reservationEnabled)} onChange={(event) => updateConfig("reservationEnabled", booleanFromSelect(event.target.value))}>
                      <option value="enabled">Activadas</option>
                      <option value="disabled">Desactivadas</option>
                    </V2Select>
                  </V2Field>
                  <V2Field label="Duración estándar">
                    <V2Select value={String(config.standardDurationMinutes)} onChange={(event) => updateConfig("standardDurationMinutes", Number(event.target.value))}>
                      <option value="60">60 minutos</option>
                      <option value="90">90 minutos</option>
                      <option value="120">120 minutos</option>
                      <option value="150">150 minutos</option>
                    </V2Select>
                  </V2Field>
                  <V2Field label="Confirmación">
                    <V2Select value={config.confirmationMode} onChange={(event) => updateConfirmationMode(event.target.value as V2LocalConfigState["confirmationMode"])}>
                      <option value="manual">Manual</option>
                      <option value="automatic">Automática</option>
                    </V2Select>
                  </V2Field>
                  <V2Field label="Estado inicial">
                    <V2Select
                      value={config.defaultReservationStatus}
                      onChange={(event) => updateDefaultReservationStatus(event.target.value as V2LocalConfigState["defaultReservationStatus"])}
                    >
                      <option value="pending">Pendiente</option>
                      <option value="confirmed">Confirmada</option>
                    </V2Select>
                  </V2Field>
                  <V2Field label="Permitir sin mesa">
                    <V2Select
                      value={booleanSelectValue(config.allowReservationsWithoutTable)}
                      onChange={(event) => updateConfig("allowReservationsWithoutTable", booleanFromSelect(event.target.value))}
                    >
                      <option value="enabled">Permitido</option>
                      <option value="disabled">Bloquear</option>
                    </V2Select>
                  </V2Field>
                  <V2Field label="Asignación automática de mesa">
                    <V2Select
                      value={booleanSelectValue(config.autoAssignReservationTables)}
                      onChange={(event) => updateConfig("autoAssignReservationTables", booleanFromSelect(event.target.value))}
                    >
                      <option value="enabled">Activada</option>
                      <option value="disabled">Desactivada</option>
                    </V2Select>
                  </V2Field>
                  <V2Field label="Permitir unir mesas">
                    <V2Select
                      value={booleanSelectValue(config.allowTableCombinations)}
                      onChange={(event) => updateConfig("allowTableCombinations", booleanFromSelect(event.target.value))}
                    >
                      <option value="enabled">Permitido</option>
                      <option value="disabled">Bloquear</option>
                    </V2Select>
                  </V2Field>
                  <V2Field label="Anticipación mínima"><V2Input type="number" min={0} max={168} step="0.5" value={config.minimumNoticeHours} onChange={(event) => updateConfig("minimumNoticeHours", Number(event.target.value))} /></V2Field>
                  <V2Field label="Días hacia adelante"><V2Input type="number" min={1} max={365} value={config.bookingWindowDays} onChange={(event) => updateConfig("bookingWindowDays", Number(event.target.value))} /></V2Field>
                  <V2Field label="Capacidad máxima por horario"><V2Input type="number" min={1} max={1000} value={config.maxPeoplePerSlot} onChange={(event) => updateConfig("maxPeoplePerSlot", Number(event.target.value))} /></V2Field>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Campos obligatorios</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {v2ReservationSettings.requiredFields.map((field) => <V2Badge key={field} tone="blue">{field}</V2Badge>)}
                    </div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Campos opcionales</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {v2ReservationSettings.optionalFields.map((field) => <V2Badge key={field} tone="slate">{field}</V2Badge>)}
                    </div>
                  </div>
                </div>
                </V2Card>
              </div>

              <div id="config-envios" className="scroll-mt-20">
                <V2Card>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-blue-50 text-blue-700"><ShoppingBag size={20} /></div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">Envíos y retiro</h2>
                    <p className="mt-1 text-sm text-slate-500">Reglas comerciales para pedidos por teléfono, WhatsApp y retiro en local.</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-4 md:grid-cols-3">
                  <V2Field label="Envíos"><V2Select value={booleanSelectValue(config.deliveryEnabled)} onChange={(event) => updateConfig("deliveryEnabled", booleanFromSelect(event.target.value))}><option value="enabled">Activados</option><option value="disabled">Desactivados</option></V2Select></V2Field>
                  <V2Field label="Retiro en local"><V2Select value={booleanSelectValue(config.pickupEnabled)} onChange={(event) => updateConfig("pickupEnabled", booleanFromSelect(event.target.value))}><option value="enabled">Activado</option><option value="disabled">Desactivado</option></V2Select></V2Field>
                  <V2Field label="Tiempo estimado"><V2Input type="number" value={config.estimatedDeliveryMinutes} onChange={(event) => updateConfig("estimatedDeliveryMinutes", Number(event.target.value))} /></V2Field>
                  <V2Field label="Costo fijo de envío"><V2Input type="number" value={config.fixedDeliveryCost} onChange={(event) => updateConfig("fixedDeliveryCost", Number(event.target.value))} /></V2Field>
                  <V2Field label="Pedido mínimo"><V2Input type="number" value={config.minimumOrder} onChange={(event) => updateConfig("minimumOrder", Number(event.target.value))} /></V2Field>
                  <V2Field label="Métodos de pago"><V2Input value={config.paymentMethods} onChange={(event) => updateConfig("paymentMethods", event.target.value)} /></V2Field>
                </div>
                <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <V2Field label="Zonas de cobertura">
                    <V2Input
                      value={config.coverageZones}
                      onChange={(event) => updateConfig("coverageZones", event.target.value)}
                    />
                  </V2Field>
                  <p className="mt-2 text-xs text-slate-500">Separá zonas por coma.</p>
                </div>
                </V2Card>
              </div>

              <div id="config-notificaciones" className="scroll-mt-20">
                <V2Card>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700"><Bell size={20} /></div>
                  <div>
                    <h2 className="text-base font-semibold text-slate-950">Notificaciones</h2>
                    <p className="mt-1 text-sm text-slate-500">Alertas internas del panel. WhatsApp queda planteado para automatizaciones futuras.</p>
                  </div>
                </div>
                <div className="mt-5 grid gap-3 md:grid-cols-2">
                  {notificationOptions.map((option) => (
                    <div
                      key={option.key}
                      className={`rounded-2xl border p-4 ${
                        option.value
                          ? "border-emerald-200 bg-emerald-50"
                          : "border-slate-200 bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-950">{option.title}</p>
                          <p className="mt-1 text-sm text-slate-500">{option.description}</p>
                        </div>
                        <V2Badge tone={option.value ? "green" : "slate"}>
                          {option.value ? "Activada" : "Desactivada"}
                        </V2Badge>
                      </div>
                      <V2Select
                        className="mt-3"
                        value={booleanSelectValue(option.value)}
                        onChange={(event) =>
                          updateConfig(option.key, booleanFromSelect(event.target.value))
                        }
                      >
                        <option value="enabled">Activada</option>
                        <option value="disabled">Desactivada</option>
                      </V2Select>
                    </div>
                  ))}
                </div>
                <div className="mt-5 grid gap-4 rounded-2xl border border-slate-200 bg-slate-50 p-4 md:grid-cols-2">
                  <V2Field label="Recordatorio de cumpleaños">
                    <V2Select
                      value={booleanSelectValue(config.birthdayReminderEnabled)}
                      onChange={(event) => updateConfig("birthdayReminderEnabled", booleanFromSelect(event.target.value))}
                    >
                      <option value="enabled">Activado</option>
                      <option value="disabled">Desactivado</option>
                    </V2Select>
                  </V2Field>
                  <V2Field label="Avisar con días de anticipación">
                    <V2Input
                      type="number"
                      min={0}
                      value={config.birthdayReminderDays}
                      onChange={(event) => updateConfig("birthdayReminderDays", Number(event.target.value))}
                    />
                  </V2Field>
                </div>
                </V2Card>
              </div>

              <div id="config-usuarios" className="scroll-mt-20">
                <V2Card>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-700"><UsersRound size={20} /></div>
                    <div>
                      <h2 className="text-base font-semibold text-slate-950">Usuarios y permisos</h2>
                      <p className="mt-1 text-sm text-slate-500">Base visual para roles. La invitación real de usuarios queda para una etapa con login y permisos.</p>
                    </div>
                  </div>
                  <V2Badge tone="slate">Próximamente</V2Badge>
                </div>
                <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                  {v2LocalUsers.map((user) => (
                    <div key={user.id} className="grid grid-cols-[1fr_180px_120px] items-center gap-4 border-b border-slate-100 px-4 py-3 text-sm last:border-b-0">
                      <div><p className="font-semibold text-slate-950">{user.name}</p><p className="mt-1 text-xs text-slate-500">{user.email}</p></div>
                      <p className="text-slate-600">{roleLabel(user.role)}</p>
                      <div className="flex justify-end"><V2Badge tone={user.role === "support" ? "purple" : "green"}>{user.status}</V2Badge></div>
                    </div>
                  ))}
                </div>
                </V2Card>
              </div>

              <div id="config-sistema" className="scroll-mt-20">
                <V2Card>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-700">
                      <SlidersHorizontal size={20} />
                    </div>
                    <div>
                      <h2 className="text-base font-semibold text-slate-950">Sistema</h2>
                      <p className="mt-1 text-sm text-slate-500">Versión, respaldo y recuperación de los datos guardados en este dispositivo.</p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Versión actual</p>
                    <p className="mt-1 text-lg font-bold text-slate-950">{v2LocalSettings.version}</p>
                  </div>

                  <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                        <Database size={18} />
                      </div>
                      <div>
                        <p className="font-semibold text-slate-950">Copia de seguridad local</p>
                        <p className="mt-1 text-sm leading-5 text-slate-500">Incluye reservas, envíos, cocina, caja, gastos, stock, menú, imágenes, clientes, web y configuración.</p>
                      </div>
                    </div>

                    <input ref={backupInputRef} type="file" accept="application/json,.json" className="hidden" onChange={selectBackup} />
                    <div className="mt-4 flex flex-wrap gap-2">
                      <V2Button variant="success" icon={<Download size={16} />} onClick={exportBackup}>Descargar respaldo</V2Button>
                      <V2Button variant="secondary" icon={<Upload size={16} />} onClick={() => backupInputRef.current?.click()}>Restaurar respaldo</V2Button>
                    </div>

                    {backupMessage ? <p className="mt-3 text-sm font-medium text-slate-600">{backupMessage}</p> : null}

                    {pendingBackup ? (
                      <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                        <div className="flex items-start gap-2 text-amber-900">
                          <AlertTriangle className="mt-0.5 shrink-0" size={17} />
                          <div>
                            <p className="font-semibold">Confirmá la restauración</p>
                            <p className="mt-1 text-sm leading-5">Reemplazará los datos actuales de Tango en este navegador por {Object.keys(pendingBackup.entries).length} registros del {new Date(pendingBackup.exportedAt).toLocaleString("es-AR")}.</p>
                          </div>
                        </div>
                        <div className="mt-3 flex justify-end gap-2">
                          <V2Button size="sm" onClick={() => setPendingBackup(null)}>Cancelar</V2Button>
                          <V2Button size="sm" variant="dangerSolid" onClick={confirmRestore}>Restaurar datos</V2Button>
                        </div>
                      </div>
                    ) : null}
                  </div>
                </V2Card>
              </div>
            </div>
          </div>

          <aside className="flex h-full min-h-0 flex-col gap-4 overflow-hidden pb-2">
            <V2Card className="shrink-0">
              <h2 className="text-base font-semibold text-slate-950">Estado del local</h2>
              <div className="mt-4"><V2Badge tone={config.status === "active" ? "green" : config.status === "paused" ? "red" : "slate"}>{config.status === "active" ? "Activo" : config.status === "paused" ? "Pausado" : "Borrador"}</V2Badge><p className="mt-3 text-sm leading-6 text-slate-500">{config.reservationEnabled ? "El local acepta reservas según las reglas configuradas." : "Las reservas online están desactivadas."}</p></div>
              <div className="mt-5 space-y-3 border-t border-slate-200 pt-4 text-sm text-slate-600">
                <p><strong className="text-slate-950">Última actualización:</strong> {v2LocalSettings.lastUpdated}</p>
                <p><strong className="text-slate-950">Zona horaria:</strong> Buenos Aires</p>
                <p><strong className="text-slate-950">Versión:</strong> {v2LocalSettings.version}</p>
              </div>
            </V2Card>

            <V2Card className="min-h-0 flex-1 overflow-hidden">
              <h2 className="text-base font-semibold text-slate-950">Resumen operativo</h2>
              <div className="v2-config-scrollbar mt-4 grid h-[calc(100%-2.25rem)] content-start gap-3 overflow-y-auto pr-1 text-sm">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Horarios</p><p className="mt-1 font-semibold text-slate-950">{openDays.length} abiertos / {closedDays.length} cerrados</p></div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Reservas</p><p className="mt-1 font-semibold text-slate-950">{config.standardDurationMinutes} min · {config.bookingWindowDays} días visibles</p></div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Envíos</p><p className="mt-1 font-semibold text-slate-950">{formatCurrency(config.fixedDeliveryCost)} costo fijo</p></div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Alertas</p><p className="mt-1 font-semibold text-slate-950">{activeNotificationCount}/5 activas</p></div>
              </div>
            </V2Card>

          </aside>
        </div>
      </div>

      <style jsx global>{`
        .v2-config-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #94a3b8 transparent;
        }

        .v2-config-scrollbar::-webkit-scrollbar {
          width: 10px;
          height: 10px;
        }

        .v2-config-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }

        .v2-config-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(180deg, #cbd5e1, #94a3b8);
          border: 3px solid transparent;
          border-radius: 999px;
          background-clip: padding-box;
        }

        .v2-config-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(180deg, #94a3b8, #64748b);
          border: 3px solid transparent;
          background-clip: padding-box;
        }
      `}</style>
    </V2AppShell>
  );
}
