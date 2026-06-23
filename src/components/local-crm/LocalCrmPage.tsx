"use client";

import { useEffect, useMemo, useState } from "react";
import { getDataSource } from "@/lib/data/dataSource";
import { getBusinesses, subscribeBusinesses } from "@/lib/data/admin-businesses";
import { getServicesByBusinessSync } from "@/lib/data/services";
import type { Business, Customer } from "@/data/types";
import {
  filterCustomers,
  getCustomersByBusinessId,
  subscribeCRM,
  type CustomerFilter,
} from "@/lib/data/crm";
import { LocalCrmFilters } from "@/components/local-crm/LocalCrmFilters";
import { LocalCrmHeader } from "@/components/local-crm/LocalCrmHeader";
import { LocalCrmList } from "@/components/local-crm/LocalCrmList";
import { LocalCrmMetrics } from "@/components/local-crm/LocalCrmMetrics";
import { LocalCustomerDetailDrawer } from "@/components/local-crm/LocalCustomerDetailDrawer";
import { LocalBusinessWarning } from "@/components/local/LocalBusinessWarning";
import { LocalNoActiveBusinessesState } from "@/components/local/LocalNoActiveBusinessesState";
import { useLocalBusinessSelection } from "@/hooks/useLocalBusinessSelection";

function formatReservationDateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function getNextCustomerLabel(customers: Customer[]) {
  const nextCustomer = [...customers]
    .filter((customer) => customer.nextReservationAt)
    .sort(
      (left, right) =>
        new Date(left.nextReservationAt ?? "").getTime() -
        new Date(right.nextReservationAt ?? "").getTime(),
    )[0];

  if (!nextCustomer || !nextCustomer.nextReservationAt) {
    return "No hay prÃ³ximas reservas";
  }

  return `${nextCustomer.name} Â· ${formatReservationDateTime(nextCustomer.nextReservationAt)}`;
}

export function LocalCrmPage() {
  const dataSource = getDataSource();
  const sourceLabel = dataSource === "supabase" ? "Supabase" : "local/mock";
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<CustomerFilter>("all");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    const syncBusinesses = async () => {
      const currentBusinesses = await getBusinesses();
      if (!cancelled) {
        setBusinesses(currentBusinesses);
      }
    };

    const timeout = window.setTimeout(() => {
      void syncBusinesses();
    }, 0);
    const unsubscribeBusinesses = subscribeBusinesses(() => {
      void syncBusinesses();
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      unsubscribeBusinesses();
    };
  }, []);

  const {
    businessWarning,
    handleBusinessChange: handleBusinessSelectionChange,
    selectedBusiness,
    canChangeBusiness,
    isSelectionReady,
  } = useLocalBusinessSelection({
    businesses,
    selectedBusinessId,
    setSelectedBusinessId,
  });

  const selectedBusinessKey = selectedBusiness?.id ?? "";

  useEffect(() => {
    let cancelled = false;

    const syncCustomers = () => {
      if (!selectedBusinessKey) {
        setCustomers([]);
        setInitialized(true);
        return;
      }

      setCustomers(getCustomersByBusinessId(selectedBusinessKey));
      setInitialized(true);
    };

    setInitialized(false);
    setCustomers(null);
    const timeout = window.setTimeout(() => {
      if (!cancelled) {
        syncCustomers();
      }
    }, 0);
    const unsubscribe = subscribeCRM(syncCustomers);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, [selectedBusinessKey]);

  const services = useMemo(
    () => (selectedBusinessKey ? getServicesByBusinessSync(selectedBusinessKey) : []),
    [selectedBusinessKey],
  );

  const serviceNameById = useMemo(
    () => new Map(services.map((service) => [service.id, service.name])),
    [services],
  );

  const visibleCustomersBase = useMemo(() => customers ?? [], [customers]);

  const visibleCustomers = useMemo(() => {
    return filterCustomers(visibleCustomersBase, search, filter);
  }, [filter, search, visibleCustomersBase]);

  const selectedCustomer =
    selectedCustomerId == null
      ? null
      : visibleCustomersBase.find((customer) => customer.id === selectedCustomerId) ?? null;

  const totalReservations = visibleCustomersBase.reduce(
    (sum, customer) => sum + customer.totalReservations,
    0,
  );
  const recurrentCustomers = visibleCustomersBase.filter(
    (customer) => customer.totalReservations >= 2,
  ).length;
  const customersWithCancelations = visibleCustomersBase.filter(
    (customer) => customer.cancelledReservations > 0,
  ).length;
  const customersWithNoShow = visibleCustomersBase.filter(
    (customer) => customer.noShowReservations > 0,
  ).length;
  const latestCustomer = [...visibleCustomersBase].sort(
    (left, right) =>
      new Date(right.lastReservationAt).getTime() -
      new Date(left.lastReservationAt).getTime(),
  )[0];
  const nextCustomerLabel = getNextCustomerLabel(visibleCustomersBase);

  const metricCards = [
    {
      label: "Total clientes",
      value: visibleCustomersBase.length,
      tone: "cyan" as const,
    },
    {
      label: "Recurrentes",
      value: recurrentCustomers,
      tone: "emerald" as const,
    },
    {
      label: "Con cancelaciones",
      value: customersWithCancelations,
      tone: "rose" as const,
    },
    {
      label: "Con no-show",
      value: customersWithNoShow,
      tone: "amber" as const,
    },
    {
      label: "Reservas totales",
      value: totalReservations,
    },
    {
      label: "Ãšltimo cliente activo",
      value: latestCustomer ? latestCustomer.name : "Sin actividad",
    },
    {
      label: "PrÃ³xima reserva",
      value: nextCustomerLabel,
    },
  ];

  function handleBusinessChange(nextBusinessId: string) {
    setSelectedCustomerId(null);
    handleBusinessSelectionChange(nextBusinessId);
  }

  function handleClearFilters() {
    setSearch("");
    setFilter("all");
  }

  const hasActiveBusiness = businesses.some((business) => business.status === "active");

  if (businesses.length > 0 && !hasActiveBusiness) {
    return <LocalNoActiveBusinessesState />;
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-1">
        <LocalCrmHeader
          business={selectedBusiness}
          businesses={businesses}
          canChangeBusiness={canChangeBusiness}
          onBusinessChange={handleBusinessChange}
          selectedBusinessId={selectedBusinessId}
          customerCount={visibleCustomersBase.length}
          sourceLabel={sourceLabel}
        />

        <LocalBusinessWarning message={businessWarning} />

        {!initialized || customers === null || !isSelectionReady ? (
          <section className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-300 shadow-2xl shadow-black/20 sm:px-5">
            Cargando CRM...
          </section>
        ) : (
          <>
            <LocalCrmMetrics metricCards={metricCards} />

            <LocalCrmFilters
              filter={filter}
              hasActiveFilters={search.trim().length > 0 || filter !== "all"}
              onClearFilters={handleClearFilters}
              onFilterChange={setFilter}
              onSearchChange={setSearch}
              resultsCount={visibleCustomers.length}
              search={search}
            />

            {visibleCustomers.length === 0 ? (
              <section className="rounded-[1.35rem] border border-dashed border-white/10 bg-white/5 px-4 py-5 text-sm text-slate-300 shadow-2xl shadow-black/20 sm:px-5">
                <p className="font-medium text-white">
                  No hay clientes que coincidan con estos filtros.
                </p>
                <p className="mt-1.5 text-xs text-slate-400">
                  ProbÃ¡ limpiando los filtros o cambiando de negocio.
                </p>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="mt-4 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
                >
                  Limpiar filtros
                </button>
              </section>
            ) : (
              <LocalCrmList
                customers={visibleCustomers}
                onOpenDetail={(customer) => setSelectedCustomerId(customer.id)}
              />
            )}
          </>
        )}

        <p className="text-xs text-slate-400">
          {dataSource === "supabase"
            ? "CRM conectado a Supabase. Clientes, notas y mÃ©tricas se leen y actualizan desde la base."
            : "CRM local. Los datos se derivan de las reservas del negocio en este entorno."}
        </p>
      </div>

      <LocalCustomerDetailDrawer
        key={selectedCustomer?.id ?? "crm-customer-detail"}
        business={selectedBusiness}
        customer={selectedCustomer}
        onClose={() => setSelectedCustomerId(null)}
        serviceNameById={serviceNameById}
        sourceLabel={sourceLabel}
      />
    </section>
  );
}

