"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Bell,
  Briefcase,
  CalendarClock,
  Clock3,
  Database,
  Download,
  ExternalLink,
  Globe2,
  MapPin,
  Pencil,
  Plus,
  Power,
  Save,
  ShoppingBag,
  SlidersHorizontal,
  Upload,
} from "lucide-react";
import { V2AppShell } from "@/components/v2/v2-app-shell";
import { V2Badge } from "@/components/v2/v2-badge";
import { V2Button } from "@/components/v2/v2-button";
import { V2Card } from "@/components/v2/v2-card";
import { V2Field, V2Input, V2Select, V2Textarea } from "@/components/v2/v2-input";
import { V2Modal } from "@/components/v2/v2-modal";
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
import { createOrResetBusinessSandboxAction } from "./sandbox-actions";
import {
  saveBusinessServiceAction,
  setBusinessServiceActiveAction,
} from "./service-actions";
import { V2StaffSection } from "./v2-staff-section";
import type { BusinessStaffSnapshot } from "@/lib/staff/staff-contract";
import { mergeBusinessHoursEditor } from "@/lib/configuration/business-hours-contract";
import {
  mergeReservationSettingsEditor,
  normalizeReservationSettingsEditor,
  type ReservationSettingsEditor,
} from "@/lib/configuration/reservation-settings-contract";
import {
  normalizeBusinessService,
  type BusinessServiceEditor,
} from "@/lib/services/business-service-contract";
import {
  v2BusinessHours,
  v2DeliverySettings,
  v2LocalSettings,
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

function createEmptyBusinessService(): BusinessServiceEditor {
  return {
    id: null,
    name: "",
    description: "",
    durationMinutes: 60,
    capacity: 1,
    price: null,
    isActive: true,
  };
}

function sortBusinessServices(
  services: BusinessServiceEditor[],
) {
  return [...services].sort((left, right) => {
    const orderDifference =
      (left.sortOrder ?? Number.MAX_SAFE_INTEGER)
      - (right.sortOrder ?? Number.MAX_SAFE_INTEGER);

    if (orderDifference !== 0) {
      return orderDifference;
    }

    return left.name.localeCompare(
      right.name,
      "es",
      { sensitivity: "base" },
    );
  });
}

const CONFIG_SECTION_LINKS = [
  { id: "datos", label: "Datos" },
  { id: "contacto", label: "Contacto" },
  { id: "horarios", label: "Horarios" },
  { id: "reservas", label: "Reservas" },
  { id: "servicios", label: "Servicios" },
  { id: "envios", label: "Envíos" },
  { id: "notificaciones", label: "Notificaciones" },
  { id: "staff", label: "Staff" },
  { id: "sistema", label: "Sistema" },
] as const;

export function V2ConfiguracionPage({
  initialBusinessHours = null,
  initialReservationSettings = null,
  initialBusinessServices = null,
  initialStaffSnapshot = null,
  businessHoursPersistence = "local",
  reservationSettingsPersistence = "local",
  businessServicesPersistence = "local",
  staffPersistence = "local",
  canManageBusinessServices = false,
  canManageStaff = false,
  businessName = "",
  initialSandbox = null,
}: {
  initialBusinessHours?: V2BusinessHourConfig[] | null;
  initialReservationSettings?: ReservationSettingsEditor | null;
  initialBusinessServices?: BusinessServiceEditor[] | null;
  initialStaffSnapshot?: BusinessStaffSnapshot | null;
  businessHoursPersistence?: "local" | "supabase";
  reservationSettingsPersistence?: "local" | "supabase";
  businessServicesPersistence?: "local" | "supabase";
  staffPersistence?: "local" | "supabase";
  canManageBusinessServices?: boolean;
  canManageStaff?: boolean;
  businessName?: string;
  initialSandbox?: {
    businessId: string;
    sourceBusinessId: string;
    isActiveSandbox: boolean;
    seedVersion: string;
    lastResetAt: string;
  } | null;
}) {
  const [config, setConfig] = useState<V2LocalConfigState>(() => getDefaultConfig());
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "saving" | "saved" | "error"
  >("idle");
  const [saveError, setSaveError] = useState("");
  const [backupMessage, setBackupMessage] = useState("");
  const [pendingBackup, setPendingBackup] = useState<TangoLocalBackup | null>(null);
  const backupInputRef = useRef<HTMLInputElement>(null);
  const [businessServices, setBusinessServices] =
    useState<BusinessServiceEditor[]>(() =>
      sortBusinessServices(
        initialBusinessServices ?? [],
      )
    );
  const [serviceEditor, setServiceEditor] =
    useState<BusinessServiceEditor | null>(null);
  const [serviceMutationStatus, setServiceMutationStatus] =
    useState<"idle" | "saving" | "saved" | "error">(
      "idle",
    );
  const [serviceMutationError, setServiceMutationError] =
    useState("");
  const [sandbox, setSandbox] = useState(initialSandbox);
  const [sandboxModalOpen, setSandboxModalOpen] = useState(false);
  const [sandboxConfirmation, setSandboxConfirmation] = useState("");
  const [sandboxStatus, setSandboxStatus] = useState<"idle" | "saving" | "error">("idle");
  const [sandboxError, setSandboxError] = useState("");
  const configScrollRef = useRef<HTMLDivElement>(null);
  const [activeConfigSection, setActiveConfigSection] = useState("datos");

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

  useEffect(() => {
    setBusinessServices(
      sortBusinessServices(
        initialBusinessServices ?? [],
      ),
    );
  }, [initialBusinessServices]);

  useEffect(() => {
    const scrollRoot = configScrollRef.current;
    if (!scrollRoot) return;

    const updateActiveSection = () => {
      const rootTop = scrollRoot.getBoundingClientRect().top;
      let nextSection: string = CONFIG_SECTION_LINKS[0].id;

      for (const section of CONFIG_SECTION_LINKS) {
        const element = document.getElementById(`config-${section.id}`);
        if (element && element.getBoundingClientRect().top - rootTop <= 128) {
          nextSection = section.id;
        }
      }

      setActiveConfigSection((current) => current === nextSection ? current : nextSection);
    };

    updateActiveSection();
    scrollRoot.addEventListener("scroll", updateActiveSection, { passive: true });
    return () => scrollRoot.removeEventListener("scroll", updateActiveSection);
  }, []);

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
  const activeBusinessServiceCount =
    businessServices.filter(
      (service) => service.isActive,
    ).length;

  function updateConfig<K extends keyof V2LocalConfigState>(
    field: K,
    value: V2LocalConfigState[K]
  ) {
    setConfig((current) => ({ ...current, [field]: value }));
    setSaveStatus("idle");
    setSaveError("");
  }

  async function createOrResetSandbox() {
    setSandboxStatus("saving");
    setSandboxError("");
    const result = await createOrResetBusinessSandboxAction(sandboxConfirmation);

    if (!result.ok) {
      setSandboxStatus("error");
      setSandboxError(result.error);
      return;
    }

    setSandbox({
      businessId: result.sandboxBusinessId,
      sourceBusinessId: "",
      isActiveSandbox: false,
      seedVersion: result.seedVersion,
      lastResetAt: new Date().toISOString(),
    });
    setSandboxStatus("idle");
    setSandboxModalOpen(false);
    setSandboxConfirmation("");
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

  function openNewBusinessService() {
    if (
      !canManageBusinessServices
      || businessServicesPersistence !== "supabase"
    ) {
      setServiceMutationStatus("error");
      setServiceMutationError(
        "La edición de servicios no está disponible.",
      );
      return;
    }

    setServiceEditor(createEmptyBusinessService());
    setServiceMutationStatus("idle");
    setServiceMutationError("");
  }

  function openBusinessServiceEditor(
    service: BusinessServiceEditor,
  ) {
    if (
      !canManageBusinessServices
      || businessServicesPersistence !== "supabase"
    ) {
      return;
    }

    setServiceEditor({ ...service });
    setServiceMutationStatus("idle");
    setServiceMutationError("");
  }

  function closeBusinessServiceEditor() {
    if (serviceMutationStatus === "saving") {
      return;
    }

    setServiceEditor(null);
    setServiceMutationStatus("idle");
    setServiceMutationError("");
  }

  function updateBusinessServiceEditor<
    K extends keyof BusinessServiceEditor,
  >(
    field: K,
    value: BusinessServiceEditor[K],
  ) {
    setServiceEditor((current) =>
      current
        ? {
            ...current,
            [field]: value,
          }
        : current
    );
    setServiceMutationStatus("idle");
    setServiceMutationError("");
  }

  function replaceBusinessService(
    service: BusinessServiceEditor,
  ) {
    setBusinessServices((current) => {
      const exists = current.some(
        (item) => item.id === service.id,
      );

      return sortBusinessServices(
        exists
          ? current.map((item) =>
              item.id === service.id
                ? service
                : item
            )
          : [...current, service],
      );
    });
  }

  async function saveBusinessServiceEditor() {
    if (
      !serviceEditor
      || !canManageBusinessServices
      || businessServicesPersistence !== "supabase"
    ) {
      setServiceMutationStatus("error");
      setServiceMutationError(
        "La edición de servicios no está disponible.",
      );
      return;
    }

    try {
      const normalized =
        normalizeBusinessService(serviceEditor);

      setServiceMutationStatus("saving");
      setServiceMutationError("");

      const result = await saveBusinessServiceAction({
        serviceId: normalized.id ?? null,
        service: normalized,
      });

      if (!result.ok) {
        setServiceMutationStatus("error");
        setServiceMutationError(result.error);
        return;
      }

      replaceBusinessService(result.service);
      setServiceEditor(null);
      setServiceMutationStatus("saved");
    } catch (error) {
      setServiceMutationStatus("error");
      setServiceMutationError(
        error instanceof Error
          ? error.message
          : "No se pudo validar el servicio.",
      );
    }
  }

  async function toggleBusinessService(
    service: BusinessServiceEditor,
  ) {
    if (
      !service.id
      || !canManageBusinessServices
      || businessServicesPersistence !== "supabase"
    ) {
      return;
    }

    setServiceMutationStatus("saving");
    setServiceMutationError("");

    const result =
      await setBusinessServiceActiveAction({
        serviceId: service.id,
        isActive: !service.isActive,
      });

    if (!result.ok) {
      setServiceMutationStatus("error");
      setServiceMutationError(result.error);
      return;
    }

    replaceBusinessService(result.service);
    setServiceMutationStatus("saved");
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
          <div ref={configScrollRef} className="v2-config-scrollbar min-h-0 overflow-y-auto pr-1 pb-2">
            <div className="space-y-4 pb-2">
              <div className="sticky top-0 z-20 rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-sm backdrop-blur">
                <div className="flex items-center gap-2 overflow-x-auto">
                  {CONFIG_SECTION_LINKS.map((section) => (
                    <a
                      key={section.id}
                      href={`#config-${section.id}`}
                      onClick={() => setActiveConfigSection(section.id)}
                      className={`whitespace-nowrap rounded-xl border px-3 py-2 text-sm font-semibold transition ${activeConfigSection === section.id ? "border-emerald-200 bg-emerald-100 text-emerald-800" : "border-slate-200 bg-white text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800"}`}
                    >
                      {section.label}
                    </a>
                  ))}
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

              <div id="config-servicios" className="scroll-mt-20">
                <V2Card>
                  <div className="flex flex-wrap items-start justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-cyan-50 text-cyan-700">
                        <Briefcase size={20} />
                      </div>
                      <div>
                        <h2 className="text-base font-semibold text-slate-950">
                          Catálogo de servicios
                        </h2>
                        <p className="mt-1 text-sm text-slate-500">
                          Duración, capacidad, precio y disponibilidad de cada servicio.
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <V2Badge tone="blue">
                        {activeBusinessServiceCount} activos
                      </V2Badge>
                      {canManageBusinessServices
                        && businessServicesPersistence === "supabase" ? (
                        <V2Button
                          size="sm"
                          variant="success"
                          icon={<Plus size={16} />}
                          onClick={openNewBusinessService}
                        >
                          Nuevo servicio
                        </V2Button>
                      ) : null}
                    </div>
                  </div>

                  {serviceMutationStatus === "error" ? (
                    <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                      {serviceMutationError}
                    </div>
                  ) : null}

                  {!canManageBusinessServices
                    && businessServicesPersistence === "supabase" ? (
                    <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                      Modo de solo lectura. Solo el dueño o un administrador pueden modificar servicios.
                    </div>
                  ) : null}

                  {businessServicesPersistence !== "supabase" ? (
                    <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                      El catálogo persistente estará disponible al conectar Supabase.
                    </div>
                  ) : null}

                  <div className="mt-5 overflow-hidden rounded-2xl border border-slate-200">
                    {businessServices.length === 0 ? (
                      <div className="px-4 py-8 text-center">
                        <p className="font-semibold text-slate-950">
                          No hay servicios cargados
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          Creá el primer servicio para definir su duración y capacidad.
                        </p>
                      </div>
                    ) : (
                      businessServices.map((service) => (
                        <div
                          key={service.id ?? service.name}
                          className="border-b border-slate-100 px-4 py-4 last:border-b-0"
                        >
                          <div className="flex flex-wrap items-start justify-between gap-4">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2">
                                <p className="font-semibold text-slate-950">
                                  {service.name}
                                </p>
                                <V2Badge tone={service.isActive ? "green" : "slate"}>
                                  {service.isActive ? "Activo" : "Inactivo"}
                                </V2Badge>
                              </div>
                              <p className="mt-1 text-sm leading-5 text-slate-500">
                                {service.description || "Sin descripción"}
                              </p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                <V2Badge tone="blue">
                                  {service.durationMinutes} min
                                </V2Badge>
                                <V2Badge tone="slate">
                                  Capacidad {service.capacity}
                                </V2Badge>
                                <V2Badge tone="slate">
                                  {service.price === null
                                    ? "Sin precio"
                                    : formatCurrency(service.price)}
                                </V2Badge>
                              </div>
                            </div>

                            {canManageBusinessServices
                              && businessServicesPersistence === "supabase" ? (
                              <div className="flex flex-wrap gap-2">
                                <V2Button
                                  size="sm"
                                  variant="secondary"
                                  icon={<Pencil size={15} />}
                                  onClick={() =>
                                    openBusinessServiceEditor(service)
                                  }
                                  disabled={serviceMutationStatus === "saving"}
                                >
                                  Editar
                                </V2Button>
                                <V2Button
                                  size="sm"
                                  variant="secondary"
                                  icon={<Power size={15} />}
                                  onClick={() =>
                                    void toggleBusinessService(service)
                                  }
                                  disabled={serviceMutationStatus === "saving"}
                                >
                                  {service.isActive
                                    ? "Desactivar"
                                    : "Activar"}
                                </V2Button>
                              </div>
                            ) : null}
                          </div>
                        </div>
                      ))
                    )}
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

              <div id="config-staff" className="scroll-mt-20">
                <V2StaffSection
                  initialSnapshot={initialStaffSnapshot}
                  persistence={staffPersistence}
                  canManage={canManageStaff}
                />
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

                  {businessHoursPersistence === "supabase" ? (
                    <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4">
                      <div className="flex items-start gap-3">
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                          <Briefcase size={18} />
                        </div>
                        <div className="min-w-0">
                          <p className="font-semibold text-slate-950">Local de simulación</p>
                          <p className="mt-1 text-sm leading-5 text-slate-600">
                            {sandbox?.isActiveSandbox
                              ? "Estás dentro de una simulación. Sus datos son independientes y no se publican."
                              : sandbox
                              ? "Datos ficticios aislados del local real. Reiniciarlo elimina únicamente esa simulación."
                              : "Creá un local ficticio aislado para practicar sin modificar datos reales."}
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {sandbox?.isActiveSandbox ? (
                          <form action="/auth/select-business/activate" method="post">
                            <input type="hidden" name="businessId" value={sandbox.sourceBusinessId} />
                            <input type="hidden" name="next" value="/local" />
                            <V2Button type="submit" variant="success">Volver al local real</V2Button>
                          </form>
                        ) : sandbox ? (
                          <form action="/auth/select-business/activate" method="post">
                            <input type="hidden" name="businessId" value={sandbox.businessId} />
                            <input type="hidden" name="next" value="/local" />
                            <V2Button type="submit" variant="success">Entrar a simulación</V2Button>
                          </form>
                        ) : null}
                        {!sandbox?.isActiveSandbox ? <V2Button variant={sandbox ? "danger" : "secondary"} onClick={() => {
                          setSandboxError("");
                          setSandboxConfirmation("");
                          setSandboxModalOpen(true);
                        }}>
                          {sandbox ? "Reiniciar simulación" : "Crear simulación"}
                        </V2Button> : null}
                      </div>
                      {sandbox ? <p className="mt-3 text-xs text-slate-500">Base {sandbox.seedVersion} · último reinicio {new Date(sandbox.lastResetAt).toLocaleString("es-AR")}</p> : null}
                    </div>
                  ) : null}

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
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Servicios activos</p><p className="mt-1 font-semibold text-slate-950">{activeBusinessServiceCount} de {businessServices.length}</p></div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Envíos</p><p className="mt-1 font-semibold text-slate-950">{formatCurrency(config.fixedDeliveryCost)} costo fijo</p></div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3"><p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Alertas</p><p className="mt-1 font-semibold text-slate-950">{activeNotificationCount}/5 activas</p></div>
              </div>
            </V2Card>

          </aside>
        </div>
      </div>

      <V2Modal
        open={serviceEditor !== null}
        title={
          serviceEditor?.id
            ? "Editar servicio"
            : "Servicio nuevo"
        }
        description="Los cambios se guardan únicamente en el negocio activo."
        onClose={closeBusinessServiceEditor}
        footer={
          <>
            <V2Button
              variant="secondary"
              onClick={closeBusinessServiceEditor}
              disabled={serviceMutationStatus === "saving"}
            >
              Cancelar
            </V2Button>
            <V2Button
              variant="success"
              onClick={() =>
                void saveBusinessServiceEditor()
              }
              disabled={
                serviceMutationStatus === "saving"
                || !serviceEditor
              }
            >
              {serviceMutationStatus === "saving"
                ? "Guardando..."
                : "Guardar servicio"}
            </V2Button>
          </>
        }
      >
        {serviceEditor ? (
          <div className="grid gap-4">
            <V2Field label="Nombre del servicio">
              <V2Input
                value={serviceEditor.name}
                maxLength={120}
                onChange={(event) =>
                  updateBusinessServiceEditor(
                    "name",
                    event.target.value,
                  )
                }
              />
            </V2Field>

            <V2Field label="Descripción">
              <V2Textarea
                value={serviceEditor.description}
                maxLength={1000}
                onChange={(event) =>
                  updateBusinessServiceEditor(
                    "description",
                    event.target.value,
                  )
                }
              />
            </V2Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <V2Field label="Duración en minutos">
                <V2Input
                  type="number"
                  min={15}
                  max={1440}
                  step={15}
                  value={serviceEditor.durationMinutes}
                  onChange={(event) =>
                    updateBusinessServiceEditor(
                      "durationMinutes",
                      Number(event.target.value),
                    )
                  }
                />
              </V2Field>

              <V2Field label="Capacidad">
                <V2Input
                  type="number"
                  min={1}
                  max={1000}
                  value={serviceEditor.capacity}
                  onChange={(event) =>
                    updateBusinessServiceEditor(
                      "capacity",
                      Number(event.target.value),
                    )
                  }
                />
              </V2Field>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <V2Field label="Precio opcional">
                <V2Input
                  type="number"
                  min={0}
                  max={99999999.99}
                  step="0.01"
                  value={serviceEditor.price ?? ""}
                  onChange={(event) =>
                    updateBusinessServiceEditor(
                      "price",
                      event.target.value === ""
                        ? null
                        : Number(event.target.value),
                    )
                  }
                />
              </V2Field>

              <V2Field label="Estado">
                <V2Select
                  value={booleanSelectValue(
                    serviceEditor.isActive,
                  )}
                  onChange={(event) =>
                    updateBusinessServiceEditor(
                      "isActive",
                      booleanFromSelect(
                        event.target.value,
                      ),
                    )
                  }
                >
                  <option value="enabled">Activo</option>
                  <option value="disabled">Inactivo</option>
                </V2Select>
              </V2Field>
            </div>

            {serviceMutationStatus === "error" ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {serviceMutationError}
              </div>
            ) : null}
          </div>
        ) : null}
      </V2Modal>

      <V2Modal
        open={sandboxModalOpen}
        title={sandbox ? "Reiniciar local de simulación" : "Crear local de simulación"}
        description="La simulación es un negocio separado. Nunca comparte reservas, caja, stock ni clientes con el local real."
        onClose={() => sandboxStatus !== "saving" && setSandboxModalOpen(false)}
        footer={<>
          <V2Button variant="secondary" onClick={() => setSandboxModalOpen(false)} disabled={sandboxStatus === "saving"}>Cancelar</V2Button>
          <V2Button variant={sandbox ? "dangerSolid" : "success"} onClick={() => void createOrResetSandbox()} disabled={sandboxStatus === "saving" || sandboxConfirmation !== businessName}>
            {sandboxStatus === "saving" ? "Preparando..." : sandbox ? "Reiniciar simulación" : "Crear simulación"}
          </V2Button>
        </>}
      >
        <div className="space-y-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm leading-5 text-amber-900">
            {sandbox
              ? "Se creará una simulación nueva y se eliminarán todos los datos de la simulación anterior. El local real no se toca."
              : "Se crea con mesas, menú y reservas ficticias para que puedas practicar flujos sin afectar el local real."}
          </div>
          <V2Field label={`Escribí “${businessName}” para confirmar`}>
            <V2Input value={sandboxConfirmation} onChange={(event) => setSandboxConfirmation(event.target.value)} autoComplete="off" />
          </V2Field>
          {sandboxStatus === "error" ? <p className="text-sm font-medium text-red-700">{sandboxError}</p> : null}
        </div>
      </V2Modal>

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
