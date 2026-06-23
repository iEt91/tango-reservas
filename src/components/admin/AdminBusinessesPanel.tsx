"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Business, BusinessFiltersState } from "@/data/types";
import type { AdminBusinessStats } from "@/lib/admin";
import type { AdminBusinessesSnapshot } from "@/lib/data/admin-businesses";
import {
  getBusinesses,
  deleteAdminBusiness,
  duplicateAdminBusiness,
  setAdminBusinessStatus,
} from "@/lib/data/admin-businesses";
import {
  subscribeBusinesses,
} from "@/lib/data/businesses";
import { getAdminDashboardStats, getBusinessAdminStats } from "@/lib/admin";
import { subscribeMenu } from "@/data/menu";
import { subscribeScheduling } from "@/data/scheduling";
import { subscribeReservations } from "@/data/reservations";
import { subscribeFloorPlan } from "@/data/floor-plan";
import { initialBusinesses } from "@/mocks/businesses";
import { AdminBusinessFilters } from "./AdminBusinessFilters";
import { AdminBusinessTable } from "./AdminBusinessTable";
import { AdminDeleteBusinessDialog } from "./AdminDeleteBusinessDialog";
import { WideContainer } from "../WideContainer";

const initialFilters: BusinessFiltersState = {
  search: "",
  status: "all",
  city: "all",
  category: "all",
  sortBy: "name",
};

const knownCities = new Set(["Pinamar", "CarilÃ³", "Valeria del Mar", "Villa Gesell"]);
const knownCategories = new Set([
  "restaurante",
  "bar",
  "cafeterÃ­a",
  "cafe",
  "parador",
  "hotel",
  "belleza",
  "salud",
]);

const statusRank: Record<Business["status"], number> = {
  active: 0,
  draft: 1,
  inactive: 2,
};

function MetricCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number | string;
  helper?: string;
}) {
  return (
    <article className="h-full rounded-3xl border border-white/10 bg-slate-950/60 p-3.5">
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-[1.55rem] font-semibold tracking-tight text-white">{value}</p>
      {helper ? <p className="mt-1 text-[11px] leading-5 text-slate-400">{helper}</p> : null}
    </article>
  );
}

type AdminBusinessesPanelProps = {
  snapshot: AdminBusinessesSnapshot;
};

export function AdminBusinessesPanel({ snapshot }: AdminBusinessesPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [businesses, setBusinesses] = useState<Business[]>(snapshot.businesses);
  const [filters, setFilters] = useState<BusinessFiltersState>(initialFilters);
  const [feedback, setFeedback] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Business | null>(null);
  const [deleteSlugInput, setDeleteSlugInput] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");

  const readOnly = snapshot.resolvedSource === "supabase";
  const sourceLabel = readOnly ? "Supabase" : "local/mock";
  const readOnlyMetricHelper = readOnly ? "Disponible en local/mock." : undefined;
  const sourceNotice = snapshot.warning
    ? snapshot.resolvedSource === "supabase"
      ? "Supabase está activo para businesses. El resto de módulos sigue en local/mock."
      : snapshot.fallbackUsed
        ? "Supabase no respondió y se usó local/mock como fallback."
        : null
    : null;

  const baseBusinessIds = useMemo(
    () => new Set(initialBusinesses.map((business) => business.id)),
    [],
  );

  useEffect(() => {
    setMounted(true);

    if (snapshot.resolvedSource === "supabase") {
      setBusinesses(snapshot.businesses);
      return;
    }

    const refreshBusinesses = () => {
      void (async () => {
        const nextBusinesses = await getBusinesses();
        setBusinesses(nextBusinesses);
      })();
    };

    refreshBusinesses();

    const unsubscribeBusinesses = subscribeBusinesses(refreshBusinesses);
    const unsubscribeReservations = subscribeReservations(refreshBusinesses);
    const unsubscribeScheduling = subscribeScheduling(refreshBusinesses);
    const unsubscribeMenu = subscribeMenu(refreshBusinesses);
    const unsubscribeFloorPlan = subscribeFloorPlan(refreshBusinesses);

    return () => {
      unsubscribeBusinesses();
      unsubscribeReservations();
      unsubscribeScheduling();
      unsubscribeMenu();
      unsubscribeFloorPlan();
    };
  }, [snapshot.businesses, snapshot.resolvedSource]);

  const dashboardStats = useMemo(
    () => (mounted && !readOnly ? getAdminDashboardStats(businesses) : null),
    [mounted, businesses, readOnly],
  );

  const businessCounts = useMemo(
    () => ({
      totalBusinesses: businesses.length,
      activeBusinesses: businesses.filter((business) => business.status === "active").length,
      draftBusinesses: businesses.filter((business) => business.status === "draft").length,
      inactiveBusinesses: businesses.filter((business) => business.status === "inactive").length,
    }),
    [businesses],
  );

  const statsByBusinessId = useMemo(
    () =>
      mounted
        ? new Map(
            businesses.map((business) =>
              readOnly
                ? ([business.id, null] as const)
                : ([business.id, getBusinessAdminStats(business)] as const),
            ),
          )
        : new Map<string, AdminBusinessStats | null>(),
    [mounted, businesses, readOnly],
  );

  const filteredBusinesses = useMemo(() => {
    if (!mounted) {
      return [];
    }

    const term = filters.search.trim().toLowerCase();

    const matchesCity = (business: Business) => {
      if (filters.city === "all") {
        return true;
      }

      if (filters.city === "other") {
        return !knownCities.has(business.city);
      }

      return business.city === filters.city;
    };

    const matchesCategory = (business: Business) => {
      if (filters.category === "all") {
        return true;
      }

      if (filters.category === "other") {
        return !Array.from(knownCategories).some((entry) =>
          business.category.toLowerCase().includes(entry),
        );
      }

      return business.category.toLowerCase().includes(filters.category.toLowerCase());
    };

    const filtered = businesses.filter((business) => {
      const matchesSearch =
        term.length === 0 ||
        [business.name, business.slug, business.category, business.city]
          .join(" ")
          .toLowerCase()
          .includes(term);
      const matchesStatus = filters.status === "all" || business.status === filters.status;

      return matchesSearch && matchesStatus && matchesCity(business) && matchesCategory(business);
    });

    const compareText = (left: string, right: string) => left.localeCompare(right);

    return [...filtered].sort((left, right) => {
      const leftStats = statsByBusinessId.get(left.id);
      const rightStats = statsByBusinessId.get(right.id);

      switch (filters.sortBy) {
        case "status":
          return (
            statusRank[left.status] - statusRank[right.status] || compareText(left.name, right.name)
          );
        case "city":
          return compareText(left.city, right.city) || compareText(left.name, right.name);
        case "reservations":
          return (
            (rightStats?.reservationsTotal ?? 0) - (leftStats?.reservationsTotal ?? 0) ||
            compareText(left.name, right.name)
          );
        case "activity":
          return (
            compareText(rightStats?.lastActivityAt ?? "", leftStats?.lastActivityAt ?? "") ||
            compareText(left.name, right.name)
          );
        case "name":
        default:
          return compareText(left.name, right.name);
      }
    });
  }, [mounted, businesses, filters, statsByBusinessId]);

  async function refreshBusinesses(nextMessage: string) {
    const nextBusinesses = await getBusinesses();
    setBusinesses(nextBusinesses);
    setFeedback(nextMessage);
  }

  async function handleDuplicate(businessId: string) {
    try {
      const duplicated = await duplicateAdminBusiness(businessId);
      await refreshBusinesses(
        readOnly
          ? `Negocio duplicado en Supabase con configuraciÃ³n base: ${duplicated.name}.`
          : `Negocio duplicado correctamente: ${duplicated.name}.`,
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No pudimos duplicar el negocio.");
    }
  }

  async function handleToggleStatus(businessId: string) {
    const current = businesses.find((business) => business.id === businessId);

    if (!current) {
      return;
    }

    const nextStatus = current.status === "inactive" ? "active" : "inactive";

    try {
      const updated = await setAdminBusinessStatus(businessId, nextStatus);
      await refreshBusinesses(
        updated.status === "inactive"
          ? `Negocio desactivado correctamente: ${updated.name}.`
          : `Negocio reactivado correctamente: ${updated.name}.`,
      );
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No pudimos actualizar el estado.");
    }
  }

  function handleOpenDelete(businessId: string) {
    const target = businesses.find((business) => business.id === businessId);
    if (!target) {
      return;
    }

    setDeleteTarget(target);
    setDeleteSlugInput("");
    setDeleteMessage("");
  }

  function handleCloseDelete() {
    setDeleteTarget(null);
    setDeleteSlugInput("");
    setDeleteMessage("");
  }

  async function handleConfirmDelete() {
    if (!deleteTarget) {
      return;
    }

    if (!readOnly && baseBusinessIds.has(deleteTarget.id)) {
      setFeedback("Este negocio base no se puede eliminar en modo mock. PodÃ©s desactivarlo.");
      handleCloseDelete();
      return;
    }

    if (deleteSlugInput.trim() !== deleteTarget.slug) {
      setDeleteMessage("Escribe exactamente el slug para confirmar.");
      return;
    }

    try {
      const deleted = await deleteAdminBusiness(deleteTarget.id);
      await refreshBusinesses(`Negocio eliminado correctamente: ${deleted.name}.`);
      handleCloseDelete();
    } catch (error) {
      setFeedback(error instanceof Error ? error.message : "No pudimos eliminar el negocio.");
      handleCloseDelete();
    }
  }

  if (!mounted) {
    return (
      <WideContainer className="flex flex-col gap-6 py-8">
        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20">
          <div className="flex flex-col gap-6">
            <div className="max-w-3xl space-y-4">
              <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
                Admin Panel
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-white">
                GestiÃ³n central de negocios
              </h1>
              <p className="max-w-4xl text-sm leading-7 text-slate-300 sm:text-base">
                Cargando datos del panel...
              </p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-100">
                Fuente de datos: {sourceLabel}
              </span>
              {readOnly ? (
                <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-100">
                  Modo Supabase write para businesses
                </span>
              ) : null}
              {snapshot.fallbackUsed ? (
                <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-100">
                  Fallback local/mock
                </span>
              ) : null}
            </div>
              {sourceNotice ? (
                <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                  {sourceNotice}
                </div>
              ) : null}
            </div>
          </div>

          <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <MetricCard label="Total negocios" value="â€”" />
            <MetricCard label="Reservas mock" value="â€”" />
            <MetricCard label="Pendientes mock" value="â€”" />
            <MetricCard label="Con reservas hoy" value="â€”" />
            <MetricCard label="Sin configurar" value="â€”" />
            <MetricCard label="Activos" value="â€”" />
            <MetricCard label="Borradores" value="â€”" />
            <MetricCard label="Inactivos" value="â€”" />
          </div>
        </section>
      </WideContainer>
    );
  }

  return (
    <WideContainer className="flex flex-col gap-6 py-8">
      <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20">
        <div className="flex flex-col gap-6">
          <div className="max-w-3xl space-y-4">
            <p className="text-[10px] uppercase tracking-[0.24em] text-cyan-300/80">
              Admin Panel
            </p>
            <h1 className="text-4xl font-semibold tracking-tight text-white">
              GestiÃ³n central de negocios
            </h1>
            <p className="max-w-4xl text-sm leading-7 text-slate-300 sm:text-base">
              GestiÃ³n central de negocios, estado operativo y accesos rÃ¡pidos. Todo sigue en modo
              local/mock, listo para reemplazar la capa de datos mÃ¡s adelante.
            </p>
            <div className="flex flex-wrap gap-2">
              <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-100">
                Fuente de datos: {sourceLabel}
              </span>
              {snapshot.fallbackUsed ? (
                <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-100">
                  Fallback local/mock
                </span>
              ) : null}
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
                Total negocios: {dashboardStats?.totalBusinesses ?? "—"}
              </span>
              <span className="rounded-full border border-emerald-400/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-100">
                Activos: {dashboardStats?.activeBusinesses ?? "—"}
              </span>
              <span className="rounded-full border border-amber-400/20 bg-amber-500/10 px-3 py-1 text-xs font-medium text-amber-100">
                Borradores: {dashboardStats?.draftBusinesses ?? "—"}
              </span>
              <span className="rounded-full border border-slate-400/20 bg-slate-500/10 px-3 py-1 text-xs font-medium text-slate-100">
                Inactivos: {dashboardStats?.inactiveBusinesses ?? "—"}
              </span>
            </div>
            {sourceNotice ? (
              <div className="rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
                {sourceNotice}
              </div>
            ) : null}
            {feedback ? (
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                {feedback}
              </div>
            ) : null}
          </div>
        </div>

        <div className="mt-6 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard label="Total negocios" value={businessCounts.totalBusinesses} />
          <MetricCard
            label="Reservas mock"
            value={dashboardStats?.reservationsTotal ?? "—"}
            helper={readOnly ? readOnlyMetricHelper : undefined}
          />
          <MetricCard
            label="Pendientes mock"
            value={dashboardStats?.reservationsPending ?? "—"}
            helper={readOnly ? readOnlyMetricHelper : undefined}
          />
          <MetricCard
            label="Con reservas hoy"
            value={dashboardStats?.businessesWithReservationsToday ?? "—"}
            helper={readOnly ? readOnlyMetricHelper : undefined}
          />
          <MetricCard
            label="Sin configurar"
            value={dashboardStats?.businessesIncomplete ?? "—"}
            helper={readOnly ? readOnlyMetricHelper : undefined}
          />
          <MetricCard label="Activos" value={businessCounts.activeBusinesses} />
          <MetricCard label="Borradores" value={businessCounts.draftBusinesses} />
          <MetricCard label="Inactivos" value={businessCounts.inactiveBusinesses} />
        </div>
      </section>

      <AdminBusinessFilters
        filters={filters}
        onFiltersChange={setFilters}
        totalCount={businesses.length}
        visibleCount={filteredBusinesses.length}
      />

      <div className="flex justify-end">
        <Link
          href="/admin/businesses/new"
          className="inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
        >
          Crear negocio
        </Link>
      </div>

      <AdminBusinessTable
        businesses={filteredBusinesses}
        statsByBusinessId={statsByBusinessId}
        onDuplicate={handleDuplicate}
        onToggleStatus={handleToggleStatus}
        onDelete={handleOpenDelete}
        readOnly={readOnly}
      />

      <AdminDeleteBusinessDialog
        open={Boolean(deleteTarget)}
        target={deleteTarget}
        slugInput={deleteSlugInput}
        deleteMessage={deleteMessage}
        isLastActive={Boolean(
          deleteTarget &&
            deleteTarget.status === "active" &&
            (dashboardStats?.activeBusinesses ?? 0) <= 1,
        )}
        isBaseBusiness={Boolean(
          !readOnly && deleteTarget && baseBusinessIds.has(deleteTarget.id),
        )}
        onSlugInputChange={(nextValue) => {
          setDeleteSlugInput(nextValue);
          setDeleteMessage("");
        }}
        onClose={handleCloseDelete}
        onConfirm={handleConfirmDelete}
      />
    </WideContainer>
  );
}

