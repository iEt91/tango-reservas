"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { StatusBadge } from "@/components/StatusBadge";
import { LocalBusinessWarning } from "@/components/local/LocalBusinessWarning";
import { LocalNoActiveBusinessesState } from "@/components/local/LocalNoActiveBusinessesState";
import { getDataSource } from "@/lib/data/dataSource";
import {
  getBusinessById,
  loadAdminBusinessesSnapshot,
  subscribeBusinesses,
  updateAdminBusiness,
} from "@/lib/data/admin-businesses";
import {
  createService,
  deleteService,
  getServicesByBusiness,
  setServiceActive,
  updateService,
} from "@/lib/data/services";
import {
  getBusinessHours,
  getReservationRules,
  updateBusinessHours,
  updateReservationRules,
} from "@/data/scheduling";
import { toBusinessFormValues } from "@/lib/data/businesses";
import { LOCAL_BUSINESS_QUERY_KEY } from "@/lib/local-business-routing";
import type {
  Business,
  BusinessFormValues,
  BusinessHours,
  DayOfWeek,
  ReservationRules,
  Service,
} from "@/data/types";
import { useLocalBusinessSelection } from "@/hooks/useLocalBusinessSelection";

const dayOrder: DayOfWeek[] = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

const dayLabels: Record<DayOfWeek, string> = {
  monday: "Lunes",
  tuesday: "Martes",
  wednesday: "Miercoles",
  thursday: "Jueves",
  friday: "Viernes",
  saturday: "Sabado",
  sunday: "Domingo",
};

function createFallbackRules(businessId: string): ReservationRules {
  return {
    id: `rules-${businessId}`,
    businessId,
    slotDurationMinutes: 30,
    maxReservationsPerSlot: 4,
    minNoticeMinutes: 30,
    maxDaysAhead: 14,
    requiresConfirmation: true,
    allowCancellation: true,
    cancellationLimitHours: 4,
  };
}

function normalizeHours(businessId: string, hours: BusinessHours[]) {
  const map = new Map(hours.map((entry) => [entry.dayOfWeek, entry]));

  return dayOrder.map((dayOfWeek) => {
    const current = map.get(dayOfWeek);

    return (
      current ?? {
        id: `${businessId}-${dayOfWeek}`,
        businessId,
        dayOfWeek,
        isOpen: false,
        openTime: "",
        closeTime: "",
        breakStartTime: null,
        breakEndTime: null,
      }
    );
  });
}

function formatCurrency(value: number | null | undefined) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "Sin precio";
  }

  return `$ ${value.toLocaleString("es-AR")}`;
}

function sanitizeServices(services: Service[]) {
  return services.map((service) => ({
    ...service,
    name: service.name.trim() || "Nuevo servicio",
    description: service.description.trim(),
    price:
      typeof service.price === "number" && Number.isFinite(service.price)
        ? service.price
        : null,
  }));
}

function sanitizeHours(hours: BusinessHours[]) {
  return hours.map((entry) => ({
    ...entry,
    breakStartTime:
      entry.breakStartTime && entry.breakStartTime.trim().length > 0
        ? entry.breakStartTime
        : null,
    breakEndTime:
      entry.breakEndTime && entry.breakEndTime.trim().length > 0
        ? entry.breakEndTime
        : null,
  }));
}

type ServiceModalMode = "create" | "edit";

type ServiceDraft = {
  id: string;
  name: string;
  description: string;
  durationMinutes: string;
  capacity: string;
  price: string;
  isActive: boolean;
};

type ServiceModalState = {
  mode: ServiceModalMode;
  draft: ServiceDraft;
  serviceId?: string;
};

function createServiceDraft(businessId: string, service?: Service): ServiceDraft {
  const base =
    service ??
    ({
      id:
        globalThis.crypto?.randomUUID?.() ??
        `service-${businessId}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      businessId,
      name: "",
      description: "",
      durationMinutes: 60,
      capacity: 4,
      price: null,
      isActive: true,
    } satisfies Service);

  return {
    id: base.id,
    name: service?.name ?? "",
    description: service?.description ?? "",
    durationMinutes: String(service?.durationMinutes ?? base.durationMinutes),
    capacity: String(service?.capacity ?? base.capacity),
    price:
      typeof service?.price === "number" && Number.isFinite(service.price)
        ? String(service.price)
        : "",
    isActive: service?.isActive ?? base.isActive,
  };
}

export function LocalConfigurationPage() {
  const [mounted, setMounted] = useState(false);
  const [businessOptions, setBusinessOptions] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [businessDraft, setBusinessDraft] = useState<BusinessFormValues | null>(null);
  const [hours, setHours] = useState<BusinessHours[]>([]);
  const [rules, setRules] = useState<ReservationRules | null>(null);
  const [services, setServices] = useState<Service[]>([]);
  const [serviceModal, setServiceModal] = useState<ServiceModalState | null>(null);
  const [serviceModalError, setServiceModalError] = useState("");
  const [message, setMessage] = useState("");
  const [loadError, setLoadError] = useState("");
  const dataSource = getDataSource();
  const sourceLabel = dataSource === "supabase" ? "Supabase" : "local/mock";
  const searchParams = useSearchParams();
  const businessQuery = searchParams.get(LOCAL_BUSINESS_QUERY_KEY)?.trim() ?? "";

  const selectedBusiness = useMemo(
    () =>
      businessOptions.find((business) => business.id === selectedBusinessId) ??
      null,
    [businessOptions, selectedBusinessId],
  );
  const draftBusiness = businessDraft ?? (selectedBusiness ? toBusinessFormValues(selectedBusiness) : null);

  const {
    businessWarning,
    handleBusinessChange: handleBusinessSelectionChange,
  } = useLocalBusinessSelection({
    businesses: businessOptions,
    selectedBusinessId,
    setSelectedBusinessId,
  });

  function handleBusinessChange(nextBusinessId: string) {
    setServiceModal(null);
    setServiceModalError("");
    setMessage("");
    handleBusinessSelectionChange(nextBusinessId);
  }

  useEffect(() => {
    let cancelled = false;

    const syncBusinesses = async () => {
      const snapshot =
        dataSource === "supabase"
          ? await loadAdminBusinessesSnapshot({ allowFallback: false })
          : await loadAdminBusinessesSnapshot();

      if (cancelled) {
        return;
      }

      if (dataSource === "supabase" && snapshot.resolvedSource !== "supabase") {
        setBusinessOptions([]);
        setLoadError(
          snapshot.error ??
            snapshot.warning ??
            "No se pudo cargar la configuracion desde Supabase.",
        );
        setMounted(true);
        return;
      }

      if (dataSource === "supabase" && snapshot.businesses.length === 0) {
        setBusinessOptions([]);
        setLoadError(
          snapshot.warning ??
            "Supabase responde, pero no devolvio negocios para Configuracion.",
        );
        setMounted(true);
        return;
      }

      setLoadError("");
      setBusinessOptions(snapshot.businesses);
      setMounted(true);

      if (!selectedBusinessId && !businessQuery && snapshot.businesses[0]) {
        setSelectedBusinessId(snapshot.businesses[0].id);
      }
    };

    void syncBusinesses();
    const unsubscribeBusinesses = subscribeBusinesses(() => {
      void syncBusinesses();
    });

    return () => {
      cancelled = true;
      unsubscribeBusinesses();
    };
  }, [businessQuery, dataSource, selectedBusinessId]);

  useEffect(() => {
    if (!mounted || !selectedBusinessId) {
      return;
    }

    let cancelled = false;

    void (async () => {
      const currentBusiness =
        (await getBusinessById(selectedBusinessId)) ??
        businessOptions.find((business) => business.id === selectedBusinessId) ??
        null;

      if (!currentBusiness || cancelled) {
        return;
      }

      setBusinessDraft(toBusinessFormValues(currentBusiness));
      setHours(normalizeHours(selectedBusinessId, getBusinessHours(selectedBusinessId)));
      setRules(
        getReservationRules(selectedBusinessId) ?? createFallbackRules(selectedBusinessId),
      );
      setServices(await getServicesByBusiness(selectedBusinessId));
    })();

    return () => {
      cancelled = true;
    };
  }, [businessOptions, mounted, selectedBusinessId]);

  const hasActiveBusiness = businessOptions.some((business) => business.status === "active");

  useEffect(() => {
    if (!message) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setMessage("");
    }, 3500);

    return () => window.clearTimeout(timeout);
  }, [message]);

  useEffect(() => {
    if (!serviceModal) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setServiceModal(null);
        setServiceModalError("");
      }
    };

    window.addEventListener("keydown", onKeyDown);

    return () => window.removeEventListener("keydown", onKeyDown);
  }, [serviceModal]);

  if (mounted && businessOptions.length > 0 && !hasActiveBusiness) {
    return <LocalNoActiveBusinessesState />;
  }

  function updateBusinessField<K extends keyof BusinessFormValues>(
    field: K,
    value: BusinessFormValues[K],
  ) {
    setBusinessDraft((current) => {
      const base = current ?? draftBusiness;

      if (!base) {
        return current;
      }

      return {
        ...base,
        [field]: value,
      };
    });
  }

  function updateHour(
    dayOfWeek: DayOfWeek,
    field: keyof BusinessHours,
    value: string | boolean | null,
  ) {
    setHours((current) =>
      current.map((entry) => {
        if (entry.dayOfWeek !== dayOfWeek) {
          return entry;
        }

        const next: BusinessHours = {
          ...entry,
          [field]: value,
        } as BusinessHours;

        if (field === "isOpen" && !value) {
          next.openTime = "";
          next.closeTime = "";
          next.breakStartTime = null;
          next.breakEndTime = null;
        }

        return next;
      }),
    );
  }

  function updateRuleField(field: keyof ReservationRules, value: string | boolean) {
    setRules((current) => {
      const base = current ?? createFallbackRules(selectedBusinessId);

      return {
        ...base,
        [field]: typeof value === "boolean" ? value : Number(value),
      } as ReservationRules;
    });
  }

  function openNewServiceModal() {
    setServiceModal({
      mode: "create",
      draft: createServiceDraft(selectedBusinessId),
    });
    setServiceModalError("");
  }

  function openEditServiceModal(service: Service) {
    setServiceModal({
      mode: "edit",
      serviceId: service.id,
      draft: createServiceDraft(selectedBusinessId, service),
    });
    setServiceModalError("");
  }

  function closeServiceModal() {
    setServiceModal(null);
    setServiceModalError("");
  }

  async function refreshServices(nextBusinessId = selectedBusinessId) {
    if (!nextBusinessId) {
      setServices([]);
      return;
    }

    setServices(await getServicesByBusiness(nextBusinessId));
  }

  async function handleToggleServiceActive(service: Service) {
    try {
      await setServiceActive(service.id, !service.isActive);
      await refreshServices();
      setMessage(
        getDataSource() === "supabase"
          ? `Servicio ${service.isActive ? "desactivado" : "activado"} en Supabase.`
          : service.isActive
            ? "Servicio desactivado en modo local/mock."
            : "Servicio activado en modo local/mock.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo actualizar el servicio.");
    }
  }

  async function handleDeleteService(service: Service) {
    try {
      await deleteService(service.id);
      await refreshServices();
      setMessage(
        getDataSource() === "supabase"
          ? "Servicio eliminado de Supabase."
          : "Servicio eliminado en modo local/mock.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo eliminar el servicio.");
    }
  }

  async function saveServiceDraft() {
    if (!serviceModal) {
      return;
    }

    const name = serviceModal.draft.name.trim();
    const durationMinutes = Number(serviceModal.draft.durationMinutes);
    const capacity = Number(serviceModal.draft.capacity);
    const priceText = serviceModal.draft.price.trim();
    const price = priceText === "" ? null : Number(priceText);

    if (!name) {
      setServiceModalError("El nombre es obligatorio.");
      return;
    }

    if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
      setServiceModalError("La duracion debe ser mayor a 0.");
      return;
    }

    if (!Number.isFinite(capacity) || capacity <= 0) {
      setServiceModalError("La capacidad debe ser mayor a 0.");
      return;
    }

    if (price !== null && (!Number.isFinite(price) || price < 0)) {
      setServiceModalError("El precio debe ser 0 o quedar vacio.");
      return;
    }

    try {
      if (serviceModal.mode === "edit" && serviceModal.serviceId) {
        await updateService(serviceModal.serviceId, {
          name,
          description: serviceModal.draft.description.trim(),
          durationMinutes,
          capacity,
          price,
          isActive: serviceModal.draft.isActive,
        });
      } else {
        await createService(selectedBusinessId, {
          name,
          description: serviceModal.draft.description.trim(),
          durationMinutes,
          capacity,
          price,
          isActive: serviceModal.draft.isActive,
        });
      }

      await refreshServices();
      setMessage(
        getDataSource() === "supabase"
          ? "Servicio guardado en Supabase."
          : serviceModal.mode === "create"
            ? "Servicio agregado en modo local/mock."
            : "Servicio actualizado en modo local/mock.",
      );
      closeServiceModal();
    } catch (error) {
      setServiceModalError(error instanceof Error ? error.message : "No se pudo guardar el servicio.");
    }
  }

  async function handleSave() {
    if (!selectedBusinessId || !rules || !draftBusiness) {
      return;
    }

    try {
      const nextBusiness = await updateAdminBusiness(
        selectedBusinessId,
        draftBusiness,
      );
      const savedHours = updateBusinessHours(selectedBusinessId, sanitizeHours(hours));
      const savedRules = updateReservationRules(selectedBusinessId, rules);

      const refreshedSnapshot =
        dataSource === "supabase"
          ? await loadAdminBusinessesSnapshot({ allowFallback: false })
          : await loadAdminBusinessesSnapshot();

      setBusinessOptions(refreshedSnapshot.businesses);
      setBusinessDraft(toBusinessFormValues(nextBusiness));
      setHours(normalizeHours(selectedBusinessId, savedHours));
      setRules(savedRules ?? createFallbackRules(selectedBusinessId));

      if (getDataSource() === "supabase") {
        await refreshServices();
        setMessage("Configuración básica y servicios guardados en Supabase.");
      } else {
        setServices((current) => current);
        setMessage("Guardado en modo local/mock. La persistencia real llegara con Supabase.");
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar la configuración.");
    }
  }

  if (!mounted || !selectedBusiness) {
    return (
      <section className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-300 shadow-2xl shadow-black/20 sm:px-5">
        {loadError || "Cargando configuracion..."}
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4 shadow-2xl shadow-black/20 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-1.5">
            <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
              Panel del Local - Configuracion
            </p>
            <h1 className="text-[1.4rem] font-semibold tracking-tight text-white sm:text-[1.6rem]">
              Configuracion operativa del negocio
            </h1>
            <p className="max-w-3xl text-xs leading-5 text-slate-300 sm:text-sm">
              Edita los datos del negocio, reglas de reserva, horarios y servicios
              en modo local. Cada negocio guarda su propia configuracion por
              separado.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:min-w-[380px] xl:grid-cols-1">
            <label className="space-y-1.5">
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Negocio
              </span>
              <select
                value={selectedBusinessId}
                onChange={(event) => handleBusinessChange(event.target.value)}
                className="input-base"
              >
                {businessOptions.map((business) => (
                  <option key={business.id} value={business.id}>
                    {business.name} - {business.city}
                  </option>
                ))}
              </select>
            </label>

            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300">
                {selectedBusiness.category}
              </span>
              <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300">
                {selectedBusiness.city}
              </span>
              <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300">
                Fuente de datos: {sourceLabel}
              </span>
            </div>
          </div>
        </div>

        <LocalBusinessWarning message={businessWarning} />

        {message ? (
          <div
            role="status"
            aria-live="polite"
            className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200"
          >
            {message}
          </div>
        ) : null}
      </section>

      <div className="grid gap-4 xl:grid-cols-[1.05fr_0.95fr]">
        <div className="space-y-4">
          <ConfigSection
            title="Datos del negocio"
            description="Identidad y datos operativos que luego migraran a Supabase."
          >
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Nombre del negocio">
                <input
                  value={draftBusiness?.name ?? ""}
                  onChange={(event) => updateBusinessField("name", event.target.value)}
                  className="input-base"
                />
              </Field>
              <Field label="Slug">
                <input
                  value={draftBusiness?.slug ?? ""}
                  readOnly
                  className="input-base cursor-not-allowed opacity-80"
                />
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <Field label="Rubro">
                <input
                  value={draftBusiness?.category ?? ""}
                  onChange={(event) =>
                    updateBusinessField("category", event.target.value)
                  }
                  className="input-base"
                />
              </Field>
              <Field label="Localidad">
                <input
                  value={draftBusiness?.city ?? ""}
                  onChange={(event) => updateBusinessField("city", event.target.value)}
                  className="input-base"
                />
              </Field>
              <Field label="Estado">
                <select
                  value={draftBusiness?.status ?? "draft"}
                  onChange={(event) =>
                    updateBusinessField(
                      "status",
                      event.target.value as BusinessFormValues["status"],
                    )
                  }
                  className="input-base"
                >
                  <option value="active">Activo</option>
                  <option value="draft">Borrador</option>
                  <option value="inactive">Inactivo</option>
                </select>
              </Field>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Telefono">
                <input
                  value={draftBusiness?.phone ?? ""}
                  onChange={(event) => updateBusinessField("phone", event.target.value)}
                  className="input-base"
                />
              </Field>
              <Field label="WhatsApp">
                <input
                  value={draftBusiness?.whatsapp ?? ""}
                  onChange={(event) =>
                    updateBusinessField("whatsapp", event.target.value)
                  }
                  className="input-base"
                />
              </Field>
            </div>

            <Field label="Descripcion">
              <textarea
                value={draftBusiness?.description ?? ""}
                onChange={(event) =>
                  updateBusinessField("description", event.target.value)
                }
                className="input-base min-h-28"
              />
            </Field>
          </ConfigSection>

          <ConfigSection
            title="Horarios semanales"
            description="Configuracion por dia de la semana, con descansos opcionales."
          >
            <div className="grid gap-3">
              {hours.map((entry) => (
                <article
                  key={entry.id}
                  className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h3 className="text-sm font-semibold text-white">
                        {dayLabels[entry.dayOfWeek]}
                      </h3>
                      <p className="mt-1 text-xs text-slate-400">
                        {entry.isOpen ? "Abierto" : "Cerrado"}
                      </p>
                    </div>

                    <label className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-slate-400">
                      <input
                        type="checkbox"
                        checked={entry.isOpen}
                        onChange={(event) =>
                          updateHour(entry.dayOfWeek, "isOpen", event.target.checked)
                        }
                        className="h-4 w-4 rounded border-white/20 bg-slate-950 text-cyan-400"
                      />
                      Activo
                    </label>
                  </div>

                  <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                    <Field label="Apertura">
                      <input
                        type="time"
                        value={entry.openTime}
                        disabled={!entry.isOpen}
                        onChange={(event) =>
                          updateHour(entry.dayOfWeek, "openTime", event.target.value)
                        }
                        className="input-base disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </Field>
                    <Field label="Cierre">
                      <input
                        type="time"
                        value={entry.closeTime}
                        disabled={!entry.isOpen}
                        onChange={(event) =>
                          updateHour(entry.dayOfWeek, "closeTime", event.target.value)
                        }
                        className="input-base disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </Field>
                    <Field label="Descanso inicio">
                      <input
                        type="time"
                        value={entry.breakStartTime ?? ""}
                        disabled={!entry.isOpen}
                        onChange={(event) =>
                          updateHour(
                            entry.dayOfWeek,
                            "breakStartTime",
                            event.target.value || null,
                          )
                        }
                        className="input-base disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </Field>
                    <Field label="Descanso fin">
                      <input
                        type="time"
                        value={entry.breakEndTime ?? ""}
                        disabled={!entry.isOpen}
                        onChange={(event) =>
                          updateHour(
                            entry.dayOfWeek,
                            "breakEndTime",
                            event.target.value || null,
                          )
                        }
                        className="input-base disabled:cursor-not-allowed disabled:opacity-60"
                      />
                    </Field>
                  </div>
                </article>
              ))}
            </div>
          </ConfigSection>
        </div>

        <div className="space-y-4">
          <ConfigSection
            title="Reservas automáticas"
            description="Si está activo, la web pública confirma la reserva automáticamente cuando encuentra una mesa disponible."
          >
            <div className="space-y-3">
              <ToggleCard
                label={draftBusiness?.autoConfirmReservations ? "Sí" : "No"}
                checked={draftBusiness?.autoConfirmReservations ?? true}
                onChange={(checked) =>
                  updateBusinessField("autoConfirmReservations", checked)
                }
              />
              <p className="text-sm leading-6 text-slate-300">
                Si está desactivado, las reservas entran pendientes para revisión
                manual. Si está activo y no hay mesa disponible, la reserva igual
                entra pendiente sin mesa.
              </p>
            </div>
          </ConfigSection>

          <ConfigSection
            title="Reglas de reserva"
            description="Parametros operativos que afectan la disponibilidad del negocio."
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Duracion del slot">
                <input
                  type="number"
                  min={15}
                  step={15}
                  value={rules?.slotDurationMinutes ?? 30}
                  onChange={(event) =>
                    updateRuleField("slotDurationMinutes", event.target.value)
                  }
                  className="input-base"
                />
              </Field>
              <Field label="Capacidad por slot">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={rules?.maxReservationsPerSlot ?? 4}
                  onChange={(event) =>
                    updateRuleField("maxReservationsPerSlot", event.target.value)
                  }
                  className="input-base"
                />
              </Field>
              <Field label="Anticipacion minima">
                <input
                  type="number"
                  min={0}
                  step={15}
                  value={rules?.minNoticeMinutes ?? 30}
                  onChange={(event) =>
                    updateRuleField("minNoticeMinutes", event.target.value)
                  }
                  className="input-base"
                />
              </Field>
              <Field label="Dias maximos hacia adelante">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={rules?.maxDaysAhead ?? 14}
                  onChange={(event) =>
                    updateRuleField("maxDaysAhead", event.target.value)
                  }
                  className="input-base"
                />
              </Field>
              <Field label="Limite de cancelacion en horas">
                <input
                  type="number"
                  min={0}
                  step={1}
                  value={rules?.cancellationLimitHours ?? 4}
                  onChange={(event) =>
                    updateRuleField("cancellationLimitHours", event.target.value)
                  }
                  className="input-base"
                />
              </Field>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <ToggleCard
                label="Requiere confirmacion"
                checked={rules?.requiresConfirmation ?? true}
                onChange={(checked) =>
                  setRules((current) => ({
                    ...(current ?? createFallbackRules(selectedBusinessId)),
                    requiresConfirmation: checked,
                  }))
                }
              />
              <ToggleCard
                label="Permite cancelacion"
                checked={rules?.allowCancellation ?? true}
                onChange={(checked) =>
                  setRules((current) => ({
                    ...(current ?? createFallbackRules(selectedBusinessId)),
                    allowCancellation: checked,
                  }))
                }
              />
            </div>
          </ConfigSection>

          <ConfigSection
            title="Servicios"
            description="Listado editable de servicios, precios y capacidad por negocio."
          >
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-slate-400">
                {services.length} servicios configurados
              </p>
              <button
                type="button"
                onClick={openNewServiceModal}
                className="inline-flex items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/15 px-3 py-1.5 text-xs font-medium text-cyan-100 transition hover:border-cyan-400/50 hover:bg-cyan-400/20"
              >
                Nuevo servicio
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {services.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-white/10 bg-slate-950/40 px-4 py-5 text-sm text-slate-400">
                  No hay servicios configurados para este negocio.
                </div>
              ) : (
                services.map((service) => (
                  <article
                    key={service.id}
                    className="rounded-2xl border border-white/10 bg-slate-950/60 p-4"
                  >
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-2">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-semibold text-white">
                            {service.name}
                          </h3>
                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-medium ${
                              service.isActive
                                ? "bg-emerald-500/15 text-emerald-200"
                                : "bg-slate-500/15 text-slate-300"
                            }`}
                          >
                            {service.isActive ? "Activo" : "Inactivo"}
                          </span>
                        </div>
                        <p className="max-w-3xl text-sm leading-6 text-slate-300">
                          {service.description || "Sin descripcion"}
                        </p>
                        <div className="flex flex-wrap gap-2 text-[11px] text-slate-400">
                          <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1">
                            Duracion: {service.durationMinutes} min
                          </span>
                          <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1">
                            Capacidad: {service.capacity}
                          </span>
                          <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1">
                            Precio: {formatCurrency(service.price)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 lg:justify-end">
                        <button
                          type="button"
                          onClick={() => openEditServiceModal(service)}
                          className="inline-flex items-center justify-center rounded-full border border-cyan-400/30 bg-cyan-400/15 px-3 py-1.5 text-xs font-medium text-cyan-100 transition hover:border-cyan-400/50 hover:bg-cyan-400/20"
                        >
                          Editar
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleToggleServiceActive(service)}
                          className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-emerald-400/40 hover:text-white"
                        >
                          {service.isActive ? "Desactivar" : "Activar"}
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDeleteService(service)}
                          className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-rose-400/40 hover:text-white"
                        >
                          Quitar
                        </button>
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </ConfigSection>
        </div>
      </div>

      <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4 shadow-2xl shadow-black/20 sm:px-5 sm:py-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
              Resumen
            </p>
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={draftBusiness?.status ?? "draft"} />
              <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300">
                {draftBusiness?.name ?? ""}
              </span>
              <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300">
                {draftBusiness?.category ?? ""}
              </span>
              <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-[11px] text-slate-300">
                {draftBusiness?.city ?? ""}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleSave}
            className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
          >
            Guardar configuracion
          </button>
        </div>
        <p className="mt-3 text-sm text-slate-400">
          {dataSource === "supabase"
            ? "Configuración básica y servicios se guardan en Supabase. Reservas, menú, plano y reportes siguen en la capa operativa actual."
            : "Modo local. Cada negocio guarda sus propios datos, horarios, reglas y servicios en este navegador hasta conectar Supabase."}
        </p>
      </section>

      {serviceModal ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 px-4 py-6 backdrop-blur-sm"
          onClick={closeServiceModal}
        >
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="service-modal-title"
            className="w-full max-w-2xl rounded-[1.5rem] border border-white/10 bg-slate-950 p-4 shadow-2xl shadow-black/40 sm:p-6"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
                  Servicios
                </p>
                <h2
                  id="service-modal-title"
                  className="mt-1 text-xl font-semibold text-white"
                >
                  {serviceModal.mode === "create"
                    ? "Nuevo servicio"
                    : "Editar servicio"}
                </h2>
                <p className="mt-2 text-sm leading-6 text-slate-300">
                  Los cambios se guardan para el negocio seleccionado.
                </p>
              </div>

              <button
                type="button"
                onClick={closeServiceModal}
                className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-slate-200 transition hover:border-white/20 hover:text-white"
                aria-label="Cerrar modal"
              >
                ×
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <Field label="Nombre">
                <input
                  value={serviceModal.draft.name}
                  onChange={(event) =>
                    setServiceModal((current) =>
                      current
                        ? {
                            ...current,
                            draft: {
                              ...current.draft,
                              name: event.target.value,
                            },
                          }
                        : current,
                    )
                  }
                  className="input-base"
                  autoFocus
                />
              </Field>
              <Field label="Descripcion">
                <input
                  value={serviceModal.draft.description}
                  onChange={(event) =>
                    setServiceModal((current) =>
                      current
                        ? {
                            ...current,
                            draft: {
                              ...current.draft,
                              description: event.target.value,
                            },
                          }
                        : current,
                    )
                  }
                  className="input-base"
                />
              </Field>
              <Field label="Duracion en minutos">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={serviceModal.draft.durationMinutes}
                  onChange={(event) =>
                    setServiceModal((current) =>
                      current
                        ? {
                            ...current,
                            draft: {
                              ...current.draft,
                              durationMinutes: event.target.value,
                            },
                          }
                        : current,
                    )
                  }
                  className="input-base"
                />
              </Field>
              <Field label="Capacidad">
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={serviceModal.draft.capacity}
                  onChange={(event) =>
                    setServiceModal((current) =>
                      current
                        ? {
                            ...current,
                            draft: {
                              ...current.draft,
                              capacity: event.target.value,
                            },
                          }
                        : current,
                    )
                  }
                  className="input-base"
                />
              </Field>
              <Field label="Precio">
                <input
                  type="number"
                  min={0}
                  step={1000}
                  value={serviceModal.draft.price}
                  onChange={(event) =>
                    setServiceModal((current) =>
                      current
                        ? {
                            ...current,
                            draft: {
                              ...current.draft,
                              price: event.target.value,
                            },
                          }
                        : current,
                    )
                  }
                  className="input-base"
                />
              </Field>
              <div className="flex items-end">
                <ToggleCard
                  label={serviceModal.draft.isActive ? "Activo" : "Inactivo"}
                  checked={serviceModal.draft.isActive}
                  onChange={(checked) =>
                    setServiceModal((current) =>
                      current
                        ? {
                            ...current,
                            draft: {
                              ...current.draft,
                              isActive: checked,
                            },
                          }
                        : current,
                    )
                  }
                />
              </div>
            </div>

            {serviceModalError ? (
              <div className="mt-4 rounded-2xl border border-rose-400/20 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                {serviceModalError}
              </div>
            ) : null}

            <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={closeServiceModal}
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-4 py-2.5 text-sm font-medium text-slate-200 transition hover:border-white/20 hover:text-white"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={saveServiceDraft}
                className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
              >
                {serviceModal.mode === "create"
                  ? "Guardar servicio"
                  : "Guardar cambios"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </section>
  );
}

type ConfigSectionProps = {
  title: string;
  description: string;
  children: ReactNode;
};

function ConfigSection({ title, description, children }: ConfigSectionProps) {
  return (
    <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-4 shadow-2xl shadow-black/20 sm:px-5 sm:py-5">
      <div className="space-y-1.5">
        <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
          {title}
        </p>
        <p className="text-sm text-slate-300">{description}</p>
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

type FieldProps = {
  label: string;
  children: ReactNode;
};

function Field({ label, children }: FieldProps) {
  return (
    <label className="space-y-1.5">
      <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
        {label}
      </span>
      {children}
    </label>
  );
}

type ToggleCardProps = {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
};

function ToggleCard({ label, checked, onChange }: ToggleCardProps) {
  return (
    <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
      <input
        type="checkbox"
        checked={checked}
        onChange={(event) => onChange(event.target.checked)}
        className="h-4 w-4 rounded border-white/20 bg-slate-950 text-cyan-400"
      />
      <span>{label}</span>
    </label>
  );
}

