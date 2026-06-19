"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import { LocalBusinessWarning } from "@/components/local/LocalBusinessWarning";
import { LocalNoActiveBusinessesState } from "@/components/local/LocalNoActiveBusinessesState";
import { getReservations, subscribeReservations } from "@/data/reservations";
import { getDataSource } from "@/lib/data/dataSource";
import {
  getAdminBusinessesSourceLabel,
  loadAdminBusinessesSnapshot,
  subscribeBusinesses,
} from "@/lib/data/admin-businesses";
import { subscribeCRM } from "@/lib/data/crm";
import { subscribeFloorPlan } from "@/data/floor-plan";
import { subscribeFloorPlanBackground } from "@/data/floor-plan-background";
import { subscribeJoinedTables } from "@/data/joined-tables";
import { subscribeScheduling } from "@/data/scheduling";
import { subscribeServices } from "@/lib/data/services";
import { refreshSupabaseCustomersForBusiness } from "@/lib/data/supabase/customers";
import { refreshSupabaseReservationsForBusiness } from "@/lib/data/supabase/reservations";
import { refreshSupabaseServicesForBusiness } from "@/lib/data/supabase/services";
import type { Business, Reservation } from "@/data/types";
import {
  buildReportData,
  buildReportDateRange,
  formatCurrency,
  formatPercent,
  formatShortDate,
  type ReportData,
  type ReportPeriod,
} from "@/lib/data/reports";
import { clearDemoReservations, seedDemoReservations } from "@/lib/demo-seed";
import { useLocalBusinessSelection } from "@/hooks/useLocalBusinessSelection";
import {
  LOCAL_BUSINESS_QUERY_KEY,
  resolveBusinessForLocalRoute,
} from "@/lib/local-business-routing";

type MetricCard = {
  label: string;
  value: number | string;
  helper?: string;
  tone?: "default" | "emerald" | "cyan" | "amber" | "rose";
};

function cardToneClass(tone: MetricCard["tone"]) {
  if (tone === "emerald") {
    return "text-emerald-100";
  }

  if (tone === "cyan") {
    return "text-cyan-100";
  }

  if (tone === "amber") {
    return "text-amber-100";
  }

  if (tone === "rose") {
    return "text-rose-100";
  }

  return "text-white";
}

function SectionCard({
  title,
  description,
  children,
  className = "",
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-[1.35rem] border border-white/10 bg-white/5 p-4 shadow-2xl shadow-black/20 sm:p-5 ${className}`}
    >
      <div className="space-y-1">
        <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
          Reportes
        </p>
        <h2 className="text-sm font-semibold text-white">{title}</h2>
        {description ? (
          <p className="max-w-4xl text-xs leading-5 text-slate-300">{description}</p>
        ) : null}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

function MetricStrip({ cards }: { cards: MetricCard[] }) {
  return (
    <section className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-6">
      {cards.map((card) => (
        <article
          key={card.label}
          className="min-h-[78px] rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 shadow-2xl shadow-black/20"
        >
          <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
            {card.label}
          </p>
          <p className={`mt-1 text-[1.15rem] font-semibold tracking-tight ${cardToneClass(card.tone)}`}>
            {card.value}
          </p>
          {card.helper ? (
            <p className="mt-1 text-[10px] leading-4 text-slate-400">{card.helper}</p>
          ) : null}
        </article>
      ))}
    </section>
  );
}

function ProgressBar({
  value,
  max,
  tone = "cyan",
}: {
  value: number;
  max: number;
  tone?: "cyan" | "emerald" | "amber" | "rose";
}) {
  const width = max > 0 ? Math.max(4, (value / max) * 100) : 0;
  const toneClass =
    tone === "emerald"
      ? "bg-emerald-400"
      : tone === "amber"
        ? "bg-amber-400"
        : tone === "rose"
          ? "bg-rose-400"
          : "bg-cyan-400";

  return (
    <div className="h-1.5 rounded-full bg-white/5">
      <div className={`h-full rounded-full ${toneClass}`} style={{ width: `${width}%` }} />
    </div>
  );
}

function formatDateRangeLabel(range: ReportData["range"]) {
  return `${formatShortDate(range.from)} - ${formatShortDate(range.to)}`;
}

function getSeverityClass(severity: "low" | "medium" | "high") {
  if (severity === "high") {
    return "border-rose-400/20 bg-rose-500/10 text-rose-100";
  }

  if (severity === "medium") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-100";
  }

  return "border-cyan-400/20 bg-cyan-500/10 text-cyan-100";
}

function getStatusPillClass(tone: "default" | "emerald" | "cyan" | "amber" | "rose") {
  if (tone === "emerald") {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
  }

  if (tone === "cyan") {
    return "border-cyan-400/20 bg-cyan-500/10 text-cyan-100";
  }

  if (tone === "amber") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-100";
  }

  if (tone === "rose") {
    return "border-rose-400/20 bg-rose-500/10 text-rose-100";
  }

  return "border-white/10 bg-slate-900/70 text-slate-200";
}

function StatePill({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "emerald" | "cyan" | "amber" | "rose";
}) {
  return (
    <span className={`rounded-full border px-2.5 py-1 text-[11px] ${getStatusPillClass(tone)}`}>
      {label}
    </span>
  );
}

function TopItemList({
  title,
  items,
  maxValue,
  formatter,
  tone = "cyan",
}: {
  title: string;
  items: Array<{
    id: string;
    label: string;
    value: number;
    helper?: string;
  }>;
  maxValue: number;
  formatter: (value: number) => string;
  tone?: "cyan" | "emerald" | "amber" | "rose";
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
      <h3 className="text-xs font-semibold uppercase tracking-[0.18em] text-white/80">
        {title}
      </h3>
      <div className="mt-3 space-y-3">
        {items.length > 0 ? (
          items.map((item) => (
            <div key={item.id} className="space-y-1">
              <div className="flex items-center justify-between gap-3 text-xs text-slate-200">
                <span className="truncate font-medium">{item.label}</span>
                <span className="shrink-0 text-slate-400">{formatter(item.value)}</span>
              </div>
              <ProgressBar value={item.value} max={maxValue} tone={tone} />
              {item.helper ? (
                <p className="text-[10px] leading-4 text-slate-400">{item.helper}</p>
              ) : null}
            </div>
          ))
        ) : (
          <p className="text-sm text-slate-400">Sin datos para este periodo.</p>
        )}
      </div>
    </div>
  );
}

function getClassificationLabel(key: string) {
  if (key === "vip") return "VIP";
  if (key === "risk") return "Riesgo";
  if (key === "recurrent") return "Recurrente";
  return "Nuevo";
}

export function LocalReportesPage() {
  const dataSource = getDataSource();
  const [mounted, setMounted] = useState(false);
  const [revision, setRevision] = useState(0);
  const searchParams = useSearchParams();
  const businessQuery = searchParams.get(LOCAL_BUSINESS_QUERY_KEY)?.trim() ?? "";
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [businessesSourceLabel, setBusinessesSourceLabel] = useState(
    dataSource === "supabase" ? "Supabase" : "local/mock",
  );
  const [businessesSourceWarning, setBusinessesSourceWarning] = useState("");
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [period, setPeriod] = useState<ReportPeriod>("30d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [demoMessage, setDemoMessage] = useState("");
  const [resolvedRouteBusiness, setResolvedRouteBusiness] = useState<Business | null>(
    null,
  );
  const [isResolvingRouteBusiness, setIsResolvingRouteBusiness] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const syncBusinesses = async () => {
      const snapshot = await loadAdminBusinessesSnapshot();

      if (cancelled) {
        return;
      }

      setBusinesses(snapshot.businesses);
      setBusinessesSourceLabel(getAdminBusinessesSourceLabel(snapshot));
      setBusinessesSourceWarning(snapshot.warning ?? snapshot.error ?? "");
    };

    const syncReservations = () => setReservations(getReservations());
    const bumpRevision = () => setRevision((current) => current + 1);

    const timeout = window.setTimeout(() => {
      void syncBusinesses();
      syncReservations();
      setMounted(true);
      bumpRevision();
    }, 0);

    const unsubscribeBusinesses = subscribeBusinesses(() => {
      void syncBusinesses();
    });
    const unsubscribeReservations = subscribeReservations(syncReservations);
    const unsubscribeCRM = subscribeCRM(bumpRevision);
    const unsubscribeFloorPlan = subscribeFloorPlan(bumpRevision);
    const unsubscribeBackground = subscribeFloorPlanBackground(bumpRevision);
    const unsubscribeJoinedTables = subscribeJoinedTables(bumpRevision);
    const unsubscribeScheduling = subscribeScheduling(bumpRevision);
    const unsubscribeServices = subscribeServices(bumpRevision);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      unsubscribeBusinesses();
      unsubscribeReservations();
      unsubscribeCRM();
      unsubscribeFloorPlan();
      unsubscribeBackground();
      unsubscribeJoinedTables();
      unsubscribeScheduling();
      unsubscribeServices();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const syncResolvedRouteBusiness = async () => {
      setIsResolvingRouteBusiness(true);
      const resolved = await resolveBusinessForLocalRoute(businessQuery, businesses);

      if (!cancelled) {
        setResolvedRouteBusiness(resolved);
        setIsResolvingRouteBusiness(false);
      }
    };

    const timeout = window.setTimeout(() => {
      void syncResolvedRouteBusiness();
    }, 0);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [businessQuery, businesses]);

  const selectedBusinessKey = useMemo(() => {
    if (selectedBusinessId && businesses.some((business) => business.id === selectedBusinessId)) {
      return selectedBusinessId;
    }

    if (resolvedRouteBusiness) {
      return resolvedRouteBusiness.id;
    }

    if (getDataSource() === "supabase" && businessQuery) {
      return "";
    }

    if (businesses.length === 0) {
      return "";
    }

    return businesses.find((business) => business.status === "active")?.id ?? "";
  }, [businesses, resolvedRouteBusiness, selectedBusinessId]);

  const selectedBusiness =
    businesses.find((business) => business.id === selectedBusinessKey) ??
    resolvedRouteBusiness ??
    null;

  const {
    businessWarning,
    handleBusinessChange: handleBusinessSelectionChange,
  } = useLocalBusinessSelection({
    businesses,
    selectedBusinessId,
    setSelectedBusinessId,
  });

  const reportRange = useMemo(
    () => {
      void revision;
      return buildReportDateRange(period, new Date(), customFrom, customTo);
    },
    [customFrom, customTo, period, revision],
  );

  useEffect(() => {
    if (!mounted || !selectedBusinessKey || getDataSource() !== "supabase") {
      return;
    }

    void refreshSupabaseReservationsForBusiness(selectedBusinessKey);
    void refreshSupabaseServicesForBusiness(selectedBusinessKey);
    void refreshSupabaseCustomersForBusiness(selectedBusinessKey);
  }, [mounted, selectedBusinessKey]);

  const reportData = useMemo(() => {
    if (!mounted || !selectedBusinessKey) {
      return null;
    }

    void revision;
    return buildReportData({
      businessId: selectedBusinessKey,
      reservations,
      range: reportRange,
      now: new Date(),
    });
  }, [mounted, reportRange, reservations, selectedBusinessKey, revision]);

  const showLocalDemoControls = getDataSource() === "local";
  const shouldWaitForBusiness =
    getDataSource() === "supabase" && (!selectedBusinessKey || isResolvingRouteBusiness);

  const summaryCards: MetricCard[] = reportData
    ? [
        {
          label: "Total reservas",
          value: reportData.summary.totalReservations,
          tone: "cyan",
          helper: `Periodo ${reportData.range.label}`,
        },
        {
          label: "Confirmadas",
          value: reportData.summary.confirmed,
          tone: "emerald",
          helper: `${reportData.summary.activeReservations} activas`,
        },
        {
          label: "Pendientes",
          value: reportData.summary.pending,
          tone: "amber",
          helper: `${reportData.summary.pendingSoonCount} proximas`,
        },
        {
          label: "Canceladas",
          value: reportData.summary.cancelled,
          tone: "rose",
          helper: `${formatPercent(reportData.summary.cancellationRate)} del total`,
        },
        {
          label: "Completadas",
          value: reportData.summary.completed,
          tone: "emerald",
        },
        {
          label: "No-show",
          value: reportData.summary.noShow,
          tone: "rose",
          helper: `${formatPercent(reportData.summary.noShowRate)} del total`,
        },
        {
          label: "Personas totales",
          value: reportData.summary.peopleTotal,
          tone: "cyan",
        },
        {
          label: "Sin mesa",
          value: reportData.summary.withoutTableCount,
          tone: "amber",
        },
        {
          label: "Ingreso estimado",
          value: formatCurrency(reportData.summary.estimatedRevenue),
          tone: "emerald",
          helper: "Solo reservas activas con precio de servicio",
        },
        {
          label: "Tasa de cancelacion",
          value: formatPercent(reportData.summary.cancellationRate),
          tone: "rose",
        },
        {
          label: "Tasa de no-show",
          value: formatPercent(reportData.summary.noShowRate),
          tone: "rose",
        },
        {
          label: "Ocupacion estimada",
          value: formatPercent(reportData.summary.occupancyRate),
          tone: "cyan",
          helper: `${reportData.summary.capacityOccupied} / ${reportData.summary.capacityPotential} asientos-slot`,
        },
      ]
    : [];

  const serviceMax = Math.max(...(reportData?.serviceStats.map((item) => item.reservations) ?? [0]), 1);
  const timeSlotMax = Math.max(...(reportData?.timeSlotStats.map((item) => item.reservations) ?? [0]), 1);
  const weekdayMax = Math.max(...(reportData?.weekdayStats.map((item) => item.reservations) ?? [0]), 1);
  const tableMax = Math.max(...(reportData?.tableStats.mostUsedTables.map((item) => item.reservations) ?? [0]), 1);
  const topCustomersByReservations = reportData?.customerStats.topByReservations.slice(0, 6) ?? [];
  const topCustomersByPeople = reportData?.customerStats.topByPeople.slice(0, 6) ?? [];
  const topCustomersBySpend = reportData?.customerStats.topBySpend.slice(0, 6) ?? [];

  const hasActiveBusiness = businesses.some((business) => business.status === "active");

  if (mounted && businesses.length > 0 && !hasActiveBusiness) {
    return <LocalNoActiveBusinessesState />;
  }

  if (shouldWaitForBusiness) {
    return (
      <section className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-300 shadow-2xl shadow-black/20 sm:px-5">
        Cargando negocio y reportes...
      </section>
    );
  }

  function handleBusinessChange(nextBusinessId: string) {
    handleBusinessSelectionChange(nextBusinessId);
  }

  function handlePeriodChange(nextPeriod: ReportPeriod) {
    setPeriod(nextPeriod);

    if (nextPeriod === "custom") {
      const defaultRange = buildReportDateRange("30d", new Date());
      setCustomFrom((current) => current || defaultRange.from);
      setCustomTo((current) => current || defaultRange.to);
    }
  }

  function handleLoadDemo() {
    if (!window.confirm("Esto va a cargar una demo comercial realista para mayo y junio 2026. Se reemplazaran solo las reservas demo existentes. ¿Querés continuar?")) {
      return;
    }

    const result = seedDemoReservations();
    setDemoMessage(
      `Demo comercial cargada: ${result.inserted} reservas nuevas (${Object.entries(result.perBusiness)
        .map(([businessId, count]) => {
          const business = businesses.find((entry) => entry.id === businessId);
          return `${business?.name ?? businessId}: ${count}`;
        })
        .join(" | ")}).`,
    );
  }

  function handleClearDemo() {
    if (!window.confirm("Se eliminaran solo las reservas marcadas como demo comercial. Las reservas manuales no se tocan. ¿Querés continuar?")) {
      return;
    }

    const result = clearDemoReservations();
    setDemoMessage(`Demo comercial eliminada: ${result.removed} reservas.`);
  }

  if (!mounted || !reportData || !selectedBusiness) {
    return (
      <section className="space-y-4">
        <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-5 shadow-2xl shadow-black/20 sm:px-5">
          <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
            Reportes
          </p>
          <h1 className="mt-1 text-[1.5rem] font-semibold tracking-tight text-white sm:text-[1.7rem]">
            Reportes operativos
          </h1>
          <p className="mt-2 max-w-4xl text-sm leading-6 text-slate-300">
            Cargando metricas operativas del local...
          </p>
        </section>

        <section className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/5 px-4 py-6 text-sm text-slate-300 shadow-2xl shadow-black/20 sm:px-5">
          Preparando datos de reservas, mesas, clientes y horarios.
        </section>
      </section>
    );
  }

  return (
    <section className="space-y-4">
      <section className="rounded-[1.35rem] border border-white/10 bg-white/5 px-4 py-5 shadow-2xl shadow-black/20 sm:px-5">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
              Panel del Local
            </p>
            <h1 className="text-[1.5rem] font-semibold tracking-tight text-white sm:text-[1.7rem]">
              Reportes operativos
            </h1>
            <p className="max-w-4xl text-sm leading-6 text-slate-300">
              {businessesSourceLabel === "Supabase"
                ? "Metricas calculadas con reservas, servicios y clientes reales de Supabase para ver demanda, ocupacion, clientes y alertas del periodo seleccionado."
                : "Metricas calculadas desde las reservas locales/mock para ver demanda, ocupacion, clientes, mesas y alertas del periodo seleccionado."}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <StatePill label={selectedBusiness.status === "active" ? "Activo" : selectedBusiness.status === "draft" ? "Borrador" : "Inactivo"} tone={selectedBusiness.status === "active" ? "emerald" : selectedBusiness.status === "draft" ? "amber" : "rose"} />
            <StatePill label={selectedBusiness.category} tone="cyan" />
            <StatePill label={selectedBusiness.city} tone="default" />
            <StatePill
              label={`Fuente de datos: ${businessesSourceLabel}`}
              tone={businessesSourceLabel === "Supabase" ? "cyan" : "default"}
            />
          </div>
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <label className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Negocio
            </span>
            <select
              value={selectedBusinessKey}
              onChange={(event) => handleBusinessChange(event.target.value)}
              className="input-base min-w-[240px]"
            >
              {businesses.map((business) => (
                <option key={business.id} value={business.id}>
                  {business.name} - {business.city}
                </option>
              ))}
            </select>
          </label>

          <div className="space-y-1">
            <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
              Periodo
            </span>
            <div className="flex flex-wrap gap-2">
              {[
                { value: "today", label: "Hoy" },
                { value: "7d", label: "7 dias" },
                { value: "30d", label: "30 dias" },
                { value: "month", label: "Mes actual" },
                { value: "custom", label: "Personalizado" },
              ].map((option) => {
                const active = period === option.value;
                return (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => handlePeriodChange(option.value as ReportPeriod)}
                    className={`rounded-full border px-3.5 py-2 text-xs font-medium transition ${
                      active
                        ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-100"
                        : "border-white/10 bg-white/5 text-slate-300 hover:border-cyan-400/30 hover:text-white"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <LocalBusinessWarning message={businessWarning || businessesSourceWarning} />

        {showLocalDemoControls ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-3 py-3">
            <div className="space-y-1">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Demo comercial local
              </p>
              <p className="text-xs text-slate-300">
                Carga reservas simuladas de mayo y junio para presentar metricas reales del panel.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={handleLoadDemo}
                className="rounded-full border border-cyan-400/20 bg-cyan-500/15 px-3.5 py-2 text-xs font-medium text-cyan-100 transition hover:bg-cyan-500/25"
              >
                Cargar demo comercial
              </button>
              <button
                type="button"
                onClick={handleClearDemo}
                className="rounded-full border border-rose-400/20 bg-rose-500/15 px-3.5 py-2 text-xs font-medium text-rose-100 transition hover:bg-rose-500/25"
              >
                Limpiar demo comercial
              </button>
            </div>
          </div>
        ) : null}

        {showLocalDemoControls && demoMessage ? (
          <div className="mt-3 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-100">
            {demoMessage}
          </div>
        ) : null}

        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-300">
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1.5">
            Periodo activo: {reportData.range.label}
          </span>
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1.5">
            {formatDateRangeLabel(reportData.range)}
          </span>
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1.5">
            {reportData.tableStats.totalTables} mesas
          </span>
          <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1.5">
            {reportData.summary.openSlotCount} slots abiertos
          </span>
        </div>

        {period === "custom" ? (
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:max-w-2xl">
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Desde
              </span>
              <input
                type="date"
                value={customFrom}
                onChange={(event) => setCustomFrom(event.target.value)}
                className="input-base"
              />
            </label>
            <label className="space-y-1">
              <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Hasta
              </span>
              <input
                type="date"
                value={customTo}
                onChange={(event) => setCustomTo(event.target.value)}
                className="input-base"
              />
            </label>
          </div>
        ) : null}
      </section>

      <MetricStrip cards={summaryCards} />

      <div className="grid gap-4 xl:grid-cols-2">
        <SectionCard
          title="Servicios mas reservados"
          description="Ranking por cantidad de reservas, personas y ingreso estimado."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                <tr className="border-b border-white/10">
                  <th className="px-2 py-2">Servicio</th>
                  <th className="px-2 py-2">Reservas</th>
                  <th className="px-2 py-2">Personas</th>
                  <th className="px-2 py-2">Ingreso</th>
                  <th className="px-2 py-2">%</th>
                  <th className="px-2 py-2">Cancel.</th>
                  <th className="px-2 py-2">No-show</th>
                </tr>
              </thead>
              <tbody>
                {reportData.serviceStats.length > 0 ? (
                  reportData.serviceStats.slice(0, 8).map((item) => (
                    <tr key={item.serviceId} className="border-b border-white/5 last:border-b-0">
                      <td className="px-2 py-2.5 text-sm font-medium text-white">{item.name}</td>
                      <td className="px-2 py-2.5 text-slate-200">{item.reservations}</td>
                      <td className="px-2 py-2.5 text-slate-300">{item.people}</td>
                      <td className="px-2 py-2.5 text-slate-300">{formatCurrency(item.revenue)}</td>
                      <td className="px-2 py-2.5 text-slate-300">{formatPercent(item.percentage)}</td>
                      <td className="px-2 py-2.5 text-slate-300">{item.cancellations}</td>
                      <td className="px-2 py-2.5 text-slate-300">{item.noShows}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-2 py-4 text-sm text-slate-400" colSpan={7}>
                      No hay reservas para mostrar en este periodo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {reportData.serviceStats.length > 0 ? (
            <div className="mt-4 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Distribucion
              </p>
              {reportData.serviceStats.slice(0, 5).map((item) => (
                <div key={`${item.serviceId}-bar`} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-200">
                    <span className="truncate font-medium">{item.name}</span>
                    <span className="shrink-0 text-slate-400">{item.reservations}</span>
                  </div>
                  <ProgressBar value={item.reservations} max={serviceMax} tone="cyan" />
                </div>
              ))}
            </div>
          ) : null}
        </SectionCard>

        <SectionCard
          title="Horarios mas demandados"
          description="Horarios con mas demanda real dentro del periodo seleccionado."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                <tr className="border-b border-white/10">
                  <th className="px-2 py-2">Horario</th>
                  <th className="px-2 py-2">Reservas</th>
                  <th className="px-2 py-2">Personas</th>
                  <th className="px-2 py-2">Ocupacion</th>
                  <th className="px-2 py-2">Servicio frecuente</th>
                </tr>
              </thead>
              <tbody>
                {reportData.timeSlotStats.length > 0 ? (
                  reportData.timeSlotStats.slice(0, 8).map((item) => (
                    <tr key={item.time} className="border-b border-white/5 last:border-b-0">
                      <td className="px-2 py-2.5 text-sm font-medium text-white">{item.time}</td>
                      <td className="px-2 py-2.5 text-slate-200">{item.reservations}</td>
                      <td className="px-2 py-2.5 text-slate-300">{item.people}</td>
                      <td className="px-2 py-2.5 text-slate-300">
                        {formatPercent(item.occupancyRate)}
                      </td>
                      <td className="px-2 py-2.5 text-slate-300">
                        {item.serviceName ?? "Sin datos"}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-2 py-4 text-sm text-slate-400" colSpan={5}>
                      No hay horarios con reservas en este periodo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {reportData.timeSlotStats.length > 0 ? (
            <div className="mt-4 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Demanda por horario
              </p>
              {reportData.timeSlotStats.slice(0, 5).map((item) => (
                <div key={`${item.time}-bar`} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-200">
                    <span className="font-medium text-white">{item.time}</span>
                    <span className="shrink-0 text-slate-400">{item.reservations}</span>
                  </div>
                  <ProgressBar value={item.reservations} max={timeSlotMax} tone="emerald" />
                </div>
              ))}
            </div>
          ) : null}
        </SectionCard>

        <SectionCard
          title="Dias con mas movimiento"
          description="Resumen por dia de semana con reservas, personas y ingreso estimado."
        >
          <div className="overflow-x-auto">
            <table className="min-w-full border-collapse text-left text-xs">
              <thead className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                <tr className="border-b border-white/10">
                  <th className="px-2 py-2">Dia</th>
                  <th className="px-2 py-2">Reservas</th>
                  <th className="px-2 py-2">Personas</th>
                  <th className="px-2 py-2">Cancel.</th>
                  <th className="px-2 py-2">No-show</th>
                  <th className="px-2 py-2">Ingreso</th>
                </tr>
              </thead>
              <tbody>
                {reportData.weekdayStats.length > 0 ? (
                  reportData.weekdayStats.map((item) => (
                    <tr key={item.weekday} className="border-b border-white/5 last:border-b-0">
                      <td className="px-2 py-2.5 text-sm font-medium text-white">{item.label}</td>
                      <td className="px-2 py-2.5 text-slate-200">{item.reservations}</td>
                      <td className="px-2 py-2.5 text-slate-300">{item.people}</td>
                      <td className="px-2 py-2.5 text-slate-300">{item.cancellations}</td>
                      <td className="px-2 py-2.5 text-slate-300">{item.noShows}</td>
                      <td className="px-2 py-2.5 text-slate-300">{formatCurrency(item.revenue)}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="px-2 py-4 text-sm text-slate-400" colSpan={6}>
                      No hay movimientos por dia en este periodo.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {reportData.weekdayStats.length > 0 ? (
            <div className="mt-4 space-y-2">
              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                Movimiento por dia
              </p>
              {reportData.weekdayStats.slice(0, 5).map((item) => (
                <div key={`${item.weekday}-bar`} className="space-y-1">
                  <div className="flex items-center justify-between gap-3 text-xs text-slate-200">
                    <span className="font-medium text-white">{item.label}</span>
                    <span className="shrink-0 text-slate-400">{item.reservations}</span>
                  </div>
                  <ProgressBar value={item.reservations} max={weekdayMax} tone="amber" />
                </div>
              ))}
            </div>
          ) : null}
        </SectionCard>

        <SectionCard
          title="Clientes"
          description="Agrupados desde reservas y clasificados por recurrencia, riesgo y valor estimado."
        >
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                Resumen comercial
              </p>
              <div className="mt-3 grid gap-2 text-xs text-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <span>Total clientes</span>
                  <span className="font-medium text-white">{reportData.customerStats.totalCustomers}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Recurrentes</span>
                  <span className="font-medium text-emerald-100">
                    {reportData.customerStats.recurringCustomers}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>VIP</span>
                  <span className="font-medium text-amber-100">{reportData.customerStats.vipCustomers}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Riesgo</span>
                  <span className="font-medium text-rose-100">{reportData.customerStats.riskCustomers}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>No-show</span>
                  <span className="font-medium text-rose-100">{reportData.customerStats.noShowCustomers}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Cancelaciones</span>
                  <span className="font-medium text-amber-100">
                    {reportData.customerStats.cancelationCustomers}
                  </span>
                </div>
              </div>
            </article>

            <TopItemList
              title="Top por reservas"
              items={topCustomersByReservations.slice(0, 5).map((customer) => ({
                id: customer.id,
                label: customer.name,
                value: customer.totalReservations,
                helper: `${getClassificationLabel(customer.commercialState.key)} · ${customer.phone}`,
              }))}
              maxValue={Math.max(...topCustomersByReservations.slice(0, 5).map((customer) => customer.totalReservations), 1)}
              formatter={(value) => `${value}`}
              tone="cyan"
            />

            <TopItemList
              title="Top por personas"
              items={topCustomersByPeople.slice(0, 5).map((customer) => ({
                id: customer.id,
                label: customer.name,
                value: customer.peopleTotal,
                helper: `${getClassificationLabel(customer.commercialState.key)} · ${customer.email ?? "Sin email"}`,
              }))}
              maxValue={Math.max(...topCustomersByPeople.slice(0, 5).map((customer) => customer.peopleTotal), 1)}
              formatter={(value) => `${value}`}
              tone="emerald"
            />

            <TopItemList
              title="Top por gasto"
              items={topCustomersBySpend.slice(0, 5).map((customer) => ({
                id: customer.id,
                label: customer.name,
                value: customer.estimatedSpend,
                helper: `${getClassificationLabel(customer.commercialState.key)} · ${customer.totalReservations} reservas`,
              }))}
              maxValue={Math.max(...topCustomersBySpend.slice(0, 5).map((customer) => customer.estimatedSpend), 1)}
              formatter={(value) => formatCurrency(value)}
              tone="amber"
            />
          </div>
        </SectionCard>

        <SectionCard
          title="Mesas y plano"
          description="Uso de mesas, capacidad estimada y mesas que necesitan atencion."
        >
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
            <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                Estado actual
              </p>
              <div className="mt-3 grid gap-2 text-xs text-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <span>Mesas</span>
                  <span className="font-medium text-white">{reportData.tableStats.totalTables}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Disponibles</span>
                  <span className="font-medium text-emerald-100">
                    {reportData.tableStats.availableTables}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Ocupadas</span>
                  <span className="font-medium text-amber-100">{reportData.tableStats.occupiedTables}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Reservadas</span>
                  <span className="font-medium text-cyan-100">{reportData.tableStats.reservedTables}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Bloqueadas</span>
                  <span className="font-medium text-rose-100">{reportData.tableStats.blockedTables}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Fuera de servicio</span>
                  <span className="font-medium text-rose-100">
                    {reportData.tableStats.outOfServiceTables}
                  </span>
                </div>
              </div>
            </article>

            <article className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
              <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                Capacidad estimada
              </p>
              <div className="mt-3 grid gap-2 text-xs text-slate-200">
                <div className="flex items-center justify-between gap-3">
                  <span>Libre</span>
                  <span className="font-medium text-emerald-100">
                    {reportData.tableStats.capacityPotential - reportData.tableStats.capacityOccupied}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Ocupada</span>
                  <span className="font-medium text-amber-100">
                    {reportData.tableStats.capacityOccupied}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Total capacidad</span>
                  <span className="font-medium text-white">
                    {reportData.tableStats.capacityPotential}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Sin mesa</span>
                  <span className="font-medium text-cyan-100">
                    {reportData.tableStats.reservationsWithoutTable}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Conflictos</span>
                  <span className="font-medium text-rose-100">{reportData.tableStats.conflictCount}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Ocupacion</span>
                  <span className="font-medium text-cyan-100">
                    {formatPercent(reportData.tableStats.occupancyRate)}
                  </span>
                </div>
              </div>
            </article>

            <div className="xl:col-span-2">
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                <p className="text-[10px] uppercase tracking-[0.16em] text-slate-400">
                  Mesas mas usadas
                </p>
                <div className="mt-3 space-y-2">
                  {reportData.tableStats.mostUsedTables.length > 0 ? (
                    reportData.tableStats.mostUsedTables.slice(0, 6).map((item) => (
                      <div key={item.tableId} className="space-y-1">
                        <div className="flex items-center justify-between gap-3 text-xs text-slate-200">
                          <span className="truncate font-medium text-white">{item.label}</span>
                          <span className="shrink-0 text-slate-400">
                            {item.reservations} reservas
                          </span>
                        </div>
                        <ProgressBar value={item.reservations} max={tableMax} tone="rose" />
                        <p className="text-[10px] leading-4 text-slate-400">
                          {item.seats} asientos · {item.people} personas · {item.conflicts} conflictos
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-slate-400">No hay mesas usadas en este periodo.</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Alertas operativas"
          description="Se resaltan situaciones que requieren atencion del encargado."
          className="xl:col-span-2"
        >
          {reportData.alerts.length > 0 ? (
            <div className="grid gap-2 md:grid-cols-2">
              {reportData.alerts.map((alert) => (
                <article
                  key={alert.key}
                  className={`rounded-2xl border px-3 py-3 ${getSeverityClass(alert.severity)}`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold">{alert.title}</h3>
                    <span className="rounded-full border border-white/10 bg-slate-950/40 px-2 py-0.5 text-[10px] uppercase tracking-[0.16em] text-white/70">
                      {alert.severity}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-200/90">{alert.description}</p>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-4 text-sm text-emerald-100">
              No hay alertas operativas para este periodo.
            </div>
          )}
        </SectionCard>
      </div>
    </section>
  );
}

