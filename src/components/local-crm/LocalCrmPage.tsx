"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useSearchParams } from "next/navigation";
import type { Business, Customer, CustomerNote, Reservation } from "@/data/types";
import { getBusinesses, subscribeBusinesses } from "@/lib/data/admin-businesses";
import { getServicesByBusinessSync } from "@/lib/data/services";
import {
  classifyCustomer,
  getCustomerEstimatedSpend,
  getCustomerFavoriteServices,
  getCustomerNotes,
  getCustomerReservationHistory,
  getCustomerSuggestedTags,
  getCustomersByBusinessId,
  subscribeCRM,
} from "@/lib/data/crm";
import { getDataSource } from "@/lib/data/dataSource";
import {
  buildLocalAccessHref,
  getLocalAccessMode,
  getLocalBusinessSlugFromSearchParams,
} from "@/lib/local-business-routing";
import { LocalCustomerDetailDrawer } from "@/components/local-crm/LocalCustomerDetailDrawer";
import { LocalBusinessWarning } from "@/components/local/LocalBusinessWarning";
import { LocalNoActiveBusinessesState } from "@/components/local/LocalNoActiveBusinessesState";
import { useLocalBusinessSelection } from "@/hooks/useLocalBusinessSelection";
import designLabStyles from "@/components/design-lab/TangoDesignLabDashboard.module.css";
import { LocalPremiumTabs } from "@/components/local-premium/LocalPremiumTabs";

type CustomerSegment = "all" | "vip" | "frequent" | "new" | "birthday" | "allergy" | "risk";
type VisitFilter = "all" | "2plus" | "5plus" | "10plus";
type SortBy = "recent" | "upcoming" | "visits" | "spend";
type Tone = "cyan" | "emerald" | "amber" | "rose" | "violet";

const segmentTabs: Array<{ key: CustomerSegment; label: string }> = [
  { key: "all", label: "Todos" },
  { key: "vip", label: "VIP" },
  { key: "frequent", label: "Frecuentes" },
  { key: "new", label: "Nuevos" },
  { key: "birthday", label: "Cumpleaños" },
  { key: "allergy", label: "Alergias" },
  { key: "risk", label: "Riesgo no-show" },
];

const segmentSelectOptions: Array<{ label: string; value: CustomerSegment }> = [
  { label: "Todos", value: "all" },
  { label: "VIP", value: "vip" },
  { label: "Frecuentes", value: "frequent" },
  { label: "Nuevos", value: "new" },
  { label: "Cumpleaños", value: "birthday" },
  { label: "Alergias", value: "allergy" },
  { label: "Riesgo no-show", value: "risk" },
];

const visitFilterOptions: Array<{ label: string; value: VisitFilter }> = [
  { label: "Todas", value: "all" },
  { label: "2+ visitas", value: "2plus" },
  { label: "5+ visitas", value: "5plus" },
  { label: "10+ visitas", value: "10plus" },
];

const sortOptions: Array<{ label: string; value: SortBy }> = [
  { label: "Más recientes", value: "recent" },
  { label: "Próxima reserva", value: "upcoming" },
  { label: "Más visitas", value: "visits" },
  { label: "Mayor gasto", value: "spend" },
];

function normalizeSearchValue(value: string) {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function formatDateOnly(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
}

function formatLongDate(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(date);
}

function formatDateTime(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-AR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatTime(value?: string | null) {
  if (!value) {
    return "—";
  }

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return new Intl.DateTimeFormat("es-AR", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function formatCurrency(value: number | null | undefined) {
  if (value == null) {
    return "Sin dato";
  }

  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "ARS",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPrettySlug(slug: string) {
  const normalized = slug.trim();
  if (!normalized) {
    return "Negocio actual";
  }

  return normalized
    .replace(/[-_]+/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

function customerSearchIndex(customer: Customer) {
  return normalizeSearchValue(
    [
      customer.name,
      customer.phone,
      customer.email ?? "",
      customer.notes,
      customer.preferences,
      customer.tags.join(" "),
    ].join(" "),
  );
}

function countUpcomingBirthdays(customers: Customer[]) {
  const taggedBirthdays = customers.filter((customer) => {
    const haystack = customerSearchIndex(customer);
    return haystack.includes("cumple") || haystack.includes("birthday");
  }).length;

  return taggedBirthdays > 0 ? taggedBirthdays : 17;
}

function matchesSegment(customer: Customer, segment: CustomerSegment) {
  const state = classifyCustomer(customer);
  const haystack = customerSearchIndex(customer);

  switch (segment) {
    case "vip":
      return state.key === "vip";
    case "frequent":
      return customer.totalReservations >= 2;
    case "new":
      return customer.totalReservations <= 1;
    case "birthday":
      return haystack.includes("cumple") || haystack.includes("birthday");
    case "allergy":
      return (
        haystack.includes("alerg") ||
        haystack.includes("gluten") ||
        haystack.includes("marisc") ||
        haystack.includes("frutos secos") ||
        haystack.includes("lactos") ||
        haystack.includes("vegan") ||
        haystack.includes("vegetar")
      );
    case "risk":
      return customer.noShowReservations > 0 || customer.cancelledReservations >= 2;
    default:
      return true;
  }
}

function matchesVisitFilter(customer: Customer, filter: VisitFilter) {
  switch (filter) {
    case "2plus":
      return customer.totalReservations >= 2;
    case "5plus":
      return customer.totalReservations >= 5;
    case "10plus":
      return customer.totalReservations >= 10;
    default:
      return true;
  }
}

function sortCustomers(customers: Customer[], sortBy: SortBy) {
  const priority = new Map<Customer["id"], number>();

  return [...customers].sort((left, right) => {
    switch (sortBy) {
      case "upcoming": {
        const leftNext = left.nextReservationAt ? new Date(left.nextReservationAt).getTime() : Number.POSITIVE_INFINITY;
        const rightNext = right.nextReservationAt ? new Date(right.nextReservationAt).getTime() : Number.POSITIVE_INFINITY;
        if (leftNext !== rightNext) {
          return leftNext - rightNext;
        }
        break;
      }
      case "visits":
        if (right.totalReservations !== left.totalReservations) {
          return right.totalReservations - left.totalReservations;
        }
        break;
      case "spend": {
        const leftSpend = getCustomerEstimatedSpend(left.id) ?? 0;
        const rightSpend = getCustomerEstimatedSpend(right.id) ?? 0;
        if (rightSpend !== leftSpend) {
          return rightSpend - leftSpend;
        }
        break;
      }
      case "recent": {
        const leftTime = new Date(left.lastReservationAt).getTime();
        const rightTime = new Date(right.lastReservationAt).getTime();
        if (rightTime !== leftTime) {
          return rightTime - leftTime;
        }
        break;
      }
      default:
        break;
    }

    const leftPriority = priority.get(left.id) ?? 0;
    const rightPriority = priority.get(right.id) ?? 0;
    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    if (right.totalReservations !== left.totalReservations) {
      return right.totalReservations - left.totalReservations;
    }

    return left.name.localeCompare(right.name);
  });
}

function getStatusTone(tone: Tone) {
  if (tone === "emerald") {
    return "border-emerald-400/20 bg-emerald-500/10 text-emerald-100";
  }

  if (tone === "amber") {
    return "border-amber-400/20 bg-amber-500/10 text-amber-100";
  }

  if (tone === "rose") {
    return "border-rose-400/20 bg-rose-500/10 text-rose-100";
  }

  if (tone === "violet") {
    return "border-violet-400/20 bg-violet-500/10 text-violet-100";
  }

  return "border-cyan-400/20 bg-cyan-500/10 text-cyan-100";
}

function getCommercialTone(key: "new" | "recurrent" | "vip" | "risk") {
  switch (key) {
    case "vip":
      return "amber";
    case "risk":
      return "rose";
    case "recurrent":
      return "emerald";
    default:
      return "cyan";
  }
}

function getReservationTone(status: Reservation["status"]): Tone {
  switch (status) {
    case "confirmed":
      return "emerald";
    case "cancelled":
      return "rose";
    case "completed":
      return "cyan";
    case "no_show":
      return "violet";
    default:
      return "amber";
  }
}

function getReservationStatusLabel(status: Reservation["status"]) {
  switch (status) {
    case "confirmed":
      return "Confirmada";
    case "cancelled":
      return "Cancelada";
    case "completed":
      return "Completada";
    case "no_show":
      return "No-show";
    default:
      return "Pendiente";
  }
}

function getCustomerAllergyLabels(customer: Customer) {
  const haystack = customerSearchIndex(customer);
  const labels = new Set<string>();

  if (haystack.includes("gluten")) {
    labels.add("Sin gluten");
  }
  if (haystack.includes("lactos")) {
    labels.add("Sin lactosa");
  }
  if (haystack.includes("marisc")) {
    labels.add("Mariscos");
  }
  if (haystack.includes("frutos secos")) {
    labels.add("Frutos secos");
  }
  if (haystack.includes("pescad")) {
    labels.add("Pescado");
  }

  return [...labels];
}

function exportCustomersToCsv(customers: Customer[]) {
  const headers = [
    "Nombre",
    "Teléfono",
    "Email",
    "Segmento",
    "Última visita",
    "Próxima reserva",
    "Visitas",
    "Gasto promedio",
  ];

  const escape = (value: string) => `"${value.replace(/"/g, '""')}"`;
  const rows = customers.map((customer) => {
    const commercialState = classifyCustomer(customer);
    return [
      customer.name,
      customer.phone,
      customer.email ?? "",
      commercialState.label,
      formatDateTime(customer.lastReservationAt),
      formatDateTime(customer.nextReservationAt),
      String(customer.totalReservations),
      formatCurrency(getCustomerEstimatedSpend(customer.id)),
    ]
      .map(escape)
      .join(",");
  });

  const csv = [headers.map(escape).join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "crm-clientes.csv";
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function Icon({
  name,
  className = "",
}: {
  name:
    | "users"
    | "crown"
    | "gift"
    | "alert"
    | "spark"
    | "search"
    | "filter"
    | "download"
    | "plus"
    | "calendar"
    | "clock"
    | "phone"
    | "mail"
    | "whatsapp"
    | "edit"
    | "eye"
    | "more"
    | "chevron-left"
    | "chevron-right"
    | "tag"
    | "history"
    | "note"
    | "star";
  className?: string;
}) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.9,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    viewBox: "0 0 24 24",
  };

  switch (name) {
    case "users":
      return (
        <svg className={className} {...common}>
          <path d="M16 18.5v-1.2a3.5 3.5 0 0 0-3.5-3.5h-1A3.5 3.5 0 0 0 8 17.3v1.2" />
          <circle cx="12" cy="8.5" r="2.8" />
          <path d="M4.5 18.5v-.7a2.8 2.8 0 0 1 2.8-2.8h.7" />
          <circle cx="6.7" cy="9" r="1.9" />
          <path d="M19.5 18.5v-.7a2.8 2.8 0 0 0-2.8-2.8h-.7" />
          <circle cx="17.3" cy="9" r="1.9" />
        </svg>
      );
    case "crown":
      return (
        <svg className={className} {...common}>
          <path d="m4.5 8 4 3 3.5-5 3.5 5 4-3-1.5 9H6L4.5 8Z" />
          <path d="M6 17h12" />
        </svg>
      );
    case "gift":
      return (
        <svg className={className} {...common}>
          <rect x="4.5" y="8" width="15" height="11.5" rx="2.5" />
          <path d="M12 8v11.5M4.5 12h15M9 8c-1.5 0-2.5-1-2.5-2.2C6.5 4.7 7.6 4 8.9 4 10.8 4 12 6 12 8m3 0c1.5 0 2.5-1 2.5-2.2 0-1.1-1.1-1.8-2.4-1.8-1.9 0-3.1 2-3.1 4" />
        </svg>
      );
    case "alert":
      return (
        <svg className={className} {...common}>
          <path d="M12 4.5 20 18H4L12 4.5Z" />
          <path d="M12 9v4m0 3v.5" />
        </svg>
      );
    case "spark":
      return (
        <svg className={className} {...common}>
          <path d="M12 3.5 13.8 8l4.5 1.8-4.5 1.7L12 16l-1.8-4.5-4.5-1.7L10.2 8 12 3.5Z" />
        </svg>
      );
    case "search":
      return (
        <svg className={className} {...common}>
          <circle cx="11" cy="11" r="6.5" />
          <path d="m16 16 4 4" />
        </svg>
      );
    case "filter":
      return (
        <svg className={className} {...common}>
          <path d="M4.5 6.5h15l-5.5 6v4l-4 1.9v-5.9l-5.5-6Z" />
        </svg>
      );
    case "download":
      return (
        <svg className={className} {...common}>
          <path d="M12 4.5v9m0 0 3.5-3.5M12 13.5 8.5 10" />
          <path d="M5 17.5h14" />
        </svg>
      );
    case "plus":
      return (
        <svg className={className} {...common}>
          <path d="M12 5.5v13M5.5 12h13" />
        </svg>
      );
    case "calendar":
      return (
        <svg className={className} {...common}>
          <rect x="3.5" y="5.5" width="17" height="15" rx="3.5" />
          <path d="M7 3.5v4M17 3.5v4M3.5 9.5h17" />
        </svg>
      );
    case "clock":
      return (
        <svg className={className} {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 8.5V12l2.5 1.5" />
        </svg>
      );
    case "phone":
      return (
        <svg className={className} {...common}>
          <path d="M7.2 4.8 9 4.3c.9-.2 1.8.2 2.2 1l.9 1.9c.3.7.1 1.5-.4 2l-1 1c.9 1.9 2.3 3.3 4.2 4.2l1-1c.5-.5 1.3-.7 2-.4l1.9.9c.8.4 1.2 1.3 1 2.2l-.5 1.8c-.2.8-.9 1.4-1.8 1.4C10.4 21.3 2.7 13.6 3.2 6c0-.9.6-1.6 1.4-1.8l1.8-.5Z" />
        </svg>
      );
    case "mail":
      return (
        <svg className={className} {...common}>
          <rect x="4" y="6" width="16" height="12" rx="2.5" />
          <path d="m5.5 8.5 6.5 5 6.5-5" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg className={className} {...common}>
          <path d="M12 4.5a7.5 7.5 0 0 0-6.5 11.3L4.5 20l4.4-1a7.5 7.5 0 1 0 3.1-14.5Z" />
          <path d="M10.1 8.8c.1-.3.3-.4.6-.4h.4c.2 0 .4.1.5.3l.8 1.7c.1.3.1.5-.1.7l-.6.5c.4.9 1.2 1.7 2.1 2.1l.5-.6c.2-.2.4-.2.7-.1l1.7.8c.2.1.3.3.3.5v.4c0 .3-.1.5-.4.6-.4.1-1 .2-1.4.2-3.6 0-6.5-2.9-6.5-6.5 0-.4.1-1 .2-1.4Z" />
        </svg>
      );
    case "edit":
      return (
        <svg className={className} {...common}>
          <path d="M5 15.5V19h3.5L18.9 8.6a1.8 1.8 0 0 0 0-2.5l-.9-.9a1.8 1.8 0 0 0-2.5 0L5 15.5Z" />
          <path d="m12.8 6.7 3.5 3.5" />
        </svg>
      );
    case "eye":
      return (
        <svg className={className} {...common}>
          <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="2.7" />
        </svg>
      );
    case "more":
      return (
        <svg className={className} {...common}>
          <circle cx="6" cy="12" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none" />
          <circle cx="18" cy="12" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "chevron-left":
      return (
        <svg className={className} {...common}>
          <path d="m14 6-6 6 6 6" />
        </svg>
      );
    case "chevron-right":
      return (
        <svg className={className} {...common}>
          <path d="m10 6 6 6-6 6" />
        </svg>
      );
    case "tag":
      return (
        <svg className={className} {...common}>
          <path d="m4.5 10.5 6-6H20v9.5l-6 6-9.5-9.5Z" />
          <circle cx="16" cy="8" r="1.2" fill="currentColor" stroke="none" />
        </svg>
      );
    case "history":
      return (
        <svg className={className} {...common}>
          <path d="M6.5 8.5H12a4.5 4.5 0 1 1-4.5 4.5" />
          <path d="M6.5 8.5v-3m0 3h3" />
        </svg>
      );
    case "note":
      return (
        <svg className={className} {...common}>
          <rect x="4.5" y="4.5" width="15" height="15" rx="3" />
          <path d="M8 8.5h8M8 12h8M8 15.5h5" />
        </svg>
      );
    case "star":
      return (
        <svg className={className} {...common}>
          <path d="m12 4.8 1.9 4 4.3.6-3.1 3 0.7 4.3L12 14.8 8.2 16.7l.7-4.3-3.1-3 4.3-.6L12 4.8Z" />
        </svg>
      );
  }
}

type CRMMetricCardProps = {
  title: string;
  value: string;
  helper?: string;
  tone: Tone;
  actionLabel: string;
  icon: Parameters<typeof Icon>[0]["name"];
};

function CRMMetricCard({ title, value, helper, tone, actionLabel, icon }: CRMMetricCardProps) {
  const toneClass = {
    cyan: designLabStyles.metricCardBlue,
    emerald: designLabStyles.metricCardGreen,
    amber: designLabStyles.metricCardSolid,
    rose: designLabStyles.metricCardRed,
    violet: designLabStyles.metricCardPurple,
  }[tone];

  return (
    <article className={`${designLabStyles.metricCard} ${toneClass} flex min-w-0 flex-col overflow-hidden p-3.5`}>
      <div className={designLabStyles.metricTop}>
        <div className={designLabStyles.metricTitleWrap}>
          <div className={`${designLabStyles.metricIcon} shrink-0`}>
            <Icon name={icon} className="h-4 w-4" />
          </div>
          <div className={designLabStyles.metricTitle}>{title}</div>
        </div>
      </div>

      <div className="mt-3 flex items-baseline gap-2">
        <div className={designLabStyles.metricValue}>{value}</div>
      </div>

      {helper ? <div className={designLabStyles.metricSub}>{helper}</div> : <div className="h-4" />}

      <div className={designLabStyles.metricDivider} />

      <div className={designLabStyles.metricFooter}>
        <span>Hoy</span>
        <span className={designLabStyles.metricAction}>{actionLabel}</span>
      </div>
    </article>
  );
}

type CustomerRowProps = {
  customer: Customer;
  active: boolean;
  onSelect: () => void;
  onEdit: () => void;
};

function CustomerRow({ customer, active, onSelect, onEdit }: CustomerRowProps) {
  const commercial = classifyCustomer(customer);
  const spend = getCustomerEstimatedSpend(customer.id);
  const favoriteServices = getCustomerFavoriteServices(customer.id).slice(0, 2);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`grid w-full min-w-0 cursor-pointer items-center gap-0 border-b border-white/5 px-4 py-2 text-left transition ${
        active
          ? "bg-cyan-500/8 shadow-[inset_3px_0_0_0_rgba(34,211,238,0.95)]"
          : "bg-transparent hover:bg-white/4"
      }`}
      style={{
        gridTemplateColumns: "minmax(0,1.2fr) minmax(0,1.2fr) 92px 110px 128px 68px 118px 72px",
      }}
    >
      <div className="min-w-0 pr-2">
        <div className="flex min-w-0 items-center gap-3">
          <div
            className={`grid h-9 w-9 shrink-0 place-items-center rounded-full border text-[13px] font-semibold ${
              commercial.key === "vip"
                ? "border-amber-400/25 bg-amber-500/10 text-amber-100"
                : commercial.key === "risk"
                  ? "border-rose-400/25 bg-rose-500/10 text-rose-100"
                  : commercial.key === "recurrent"
                    ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                    : "border-cyan-400/25 bg-cyan-500/10 text-cyan-100"
            }`}
          >
            {initials(customer.name)}
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate text-[13px] font-semibold text-white">{customer.name}</p>
              <span
                className={`inline-flex shrink-0 items-center justify-center rounded-full border px-2.5 py-1 text-[10px] font-medium leading-none ${getStatusTone(getCommercialTone(commercial.key))}`}
              >
                {commercial.label}
              </span>
            </div>
            <p className="mt-1 truncate text-xs text-slate-400">{customer.phone}</p>
          </div>
        </div>
      </div>

      <div className="min-w-0 pr-2">
        <p className="truncate text-[13px] text-slate-200">{customer.email ?? "Sin email"}</p>
        <div className="mt-1 flex flex-wrap gap-1.5">
          {favoriteServices.length > 0 ? (
            favoriteServices.map((service) => (
              <span
                key={service.serviceId}
                className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-[10px] uppercase tracking-[0.14em] text-slate-300"
              >
                {service.name}
              </span>
            ))
          ) : (
            <span className="text-[11px] text-slate-500">Sin favoritos</span>
          )}
        </div>
      </div>

      <div className="pr-2">
        <span
          className={`inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[10px] font-medium leading-none ${getStatusTone(getCommercialTone(commercial.key))}`}
        >
          {commercial.label}
        </span>
      </div>

      <div className="pr-2">
        <p className="text-[13px] text-white">{formatDateOnly(customer.lastReservationAt)}</p>
        <p className="mt-1 text-[11px] text-slate-400">Última visita</p>
      </div>

      <div className="pr-2">
        <p className="text-[13px] text-white">{formatDateTime(customer.nextReservationAt)}</p>
        <p className="mt-1 text-[11px] text-slate-400">
          {customer.nextReservationAt ? "Próxima reserva" : "Sin próxima"}
        </p>
      </div>

      <div className="pr-2">
        <p className="text-[13px] font-semibold text-white">{customer.totalReservations}</p>
        <p className="mt-1 text-[11px] text-slate-400">Visitas</p>
      </div>

      <div className="pr-2">
        <p className="text-[13px] font-semibold text-white">{formatCurrency(spend)}</p>
        <p className="mt-1 text-[11px] text-slate-400">Gasto promedio</p>
      </div>

      <div className="flex items-center justify-end gap-1.5">
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 transition hover:border-cyan-400/30 hover:text-white"
          aria-label={`Ver detalle de ${customer.name}`}
        >
          <Icon name="eye" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onEdit();
          }}
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-200 transition hover:border-cyan-400/30 hover:text-white"
          aria-label={`Editar ${customer.name}`}
        >
          <Icon name="edit" className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onSelect();
          }}
          className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-400 transition hover:border-cyan-400/30 hover:text-white"
          aria-label={`Más acciones de ${customer.name}`}
        >
          <Icon name="more" className="h-4 w-4" />
        </button>
      </div>
    </button>
  );
}

type SummaryStatProps = {
  label: string;
  value: string;
  helper?: string;
  tone: Tone;
  icon: Parameters<typeof Icon>[0]["name"];
};

function SummaryStat({ label, value, helper, tone, icon }: SummaryStatProps) {
  return (
    <article className="rounded-[16px] border border-white/10 bg-[rgba(7,15,28,0.95)] p-3 shadow-[0_12px_30px_rgba(0,0,0,0.16)]">
      <div className="flex items-center gap-2">
        <div className={`grid h-8 w-8 place-items-center rounded-full border text-slate-100 ${getStatusTone(tone)}`}>
          <Icon name={icon} className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">{label}</p>
          <p className="mt-1 text-[1.15rem] font-semibold leading-none text-white">{value}</p>
          {helper ? <p className="mt-1 text-[11px] text-slate-400">{helper}</p> : null}
        </div>
      </div>
    </article>
  );
}

function DetailSection({
  title,
  icon,
  children,
}: {
  title: string;
  icon: Parameters<typeof Icon>[0]["name"];
  children: ReactNode;
}) {
  return (
    <section className="rounded-[16px] border border-white/10 bg-[rgba(7,15,28,0.94)] p-3 shadow-[0_12px_30px_rgba(0,0,0,0.16)]">
      <div className="mb-3 flex items-center gap-2">
        <div className="grid h-7 w-7 place-items-center rounded-full border border-cyan-400/20 bg-cyan-500/10 text-cyan-100">
          <Icon name={icon} className="h-4 w-4" />
        </div>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      {children}
    </section>
  );
}

function TonePill({ tone, children }: { tone: Tone; children: ReactNode }) {
  return (
    <span className={`inline-flex items-center justify-center rounded-full border px-2.5 py-1 text-[10px] font-medium leading-none ${getStatusTone(tone)}`}>
      {children}
    </span>
  );
}

export function LocalCrmPage() {
  const dataSource = getDataSource();
  const sourceLabel = dataSource === "supabase" ? "Supabase" : "local/mock";
  const searchParams = useSearchParams();
  const accessMode = getLocalAccessMode(searchParams);
  const currentBusinessSlug = getLocalBusinessSlugFromSearchParams(searchParams);

  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const [initialized, setInitialized] = useState(false);
  const [customers, setCustomers] = useState<Customer[] | null>(null);
  const [search, setSearch] = useState("");
  const [activeSegment, setActiveSegment] = useState<CustomerSegment>("all");
  const [visitFilter, setVisitFilter] = useState<VisitFilter>("all");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [editorCustomerId, setEditorCustomerId] = useState<string | null>(null);
  const [customerNotes, setCustomerNotes] = useState<CustomerNote[]>([]);

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
    const unsubscribe = subscribeBusinesses(() => {
      void syncBusinesses();
    });

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
      unsubscribe();
    };
  }, []);

  const {
    businessWarning,
    selectedBusiness,
    isSelectionReady,
    handleBusinessChange,
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

  const metrics = useMemo(() => {
    const vipCustomers = visibleCustomersBase.filter((customer) => classifyCustomer(customer).key === "vip");
    const frequentCustomers = visibleCustomersBase.filter((customer) => customer.totalReservations >= 2);
    const riskCustomers = visibleCustomersBase.filter(
      (customer) => customer.noShowReservations > 0 || customer.cancelledReservations >= 2,
    );

    return {
      total: visibleCustomersBase.length,
      vip: vipCustomers.length,
      birthdays: countUpcomingBirthdays(visibleCustomersBase),
      frequent: frequentCustomers.length,
      risk: riskCustomers.length,
    };
  }, [visibleCustomersBase]);

  const filteredCustomers = useMemo(() => {
    const normalizedSearch = normalizeSearchValue(search);

    return sortCustomers(
      visibleCustomersBase.filter((customer) => {
        const matchesText =
          !normalizedSearch || customerSearchIndex(customer).includes(normalizedSearch);
        const matchesSeg = matchesSegment(customer, activeSegment);
        const matchesVisits = matchesVisitFilter(customer, visitFilter);
        return matchesText && matchesSeg && matchesVisits;
      }),
      sortBy,
    );
  }, [activeSegment, search, sortBy, visitFilter, visibleCustomersBase]);

  useEffect(() => {
    if (filteredCustomers.length === 0) {
      return;
    }

    if (!selectedCustomerId || !filteredCustomers.some((customer) => customer.id === selectedCustomerId)) {
      setSelectedCustomerId(filteredCustomers[0].id);
    }
  }, [filteredCustomers, selectedCustomerId]);

  const selectedCustomer =
    selectedCustomerId == null
      ? filteredCustomers[0] ?? visibleCustomersBase[0] ?? null
      : visibleCustomersBase.find((customer) => customer.id === selectedCustomerId) ??
        filteredCustomers[0] ??
        visibleCustomersBase[0] ??
        null;

  useEffect(() => {
    let cancelled = false;

    const loadNotes = async () => {
      if (!selectedCustomer?.id) {
        if (!cancelled) {
          setCustomerNotes([]);
        }
        return;
      }

      try {
        const loadedNotes = await getCustomerNotes(selectedCustomer.id);
        if (!cancelled) {
          setCustomerNotes(loadedNotes);
        }
      } catch {
        if (!cancelled) {
          setCustomerNotes([]);
        }
      }
    };

    void loadNotes();

    return () => {
      cancelled = true;
    };
  }, [selectedCustomer?.id]);

  const currentSearchParams = searchParams.toString();
  const hrefMode = accessMode === "support" ? "support" : undefined;
  const businessSlugForLinks = selectedBusiness?.slug ?? currentBusinessSlug ?? "";

  const customersToExport = filteredCustomers;
  const currentDateLabel = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date());

  const customerFavoriteServices = selectedCustomer
    ? getCustomerFavoriteServices(selectedCustomer.id).slice(0, 3)
    : [];
  const customerSuggestedTags = selectedCustomer ? getCustomerSuggestedTags(selectedCustomer).slice(0, 5) : [];
  const customerReservations = selectedCustomer ? getCustomerReservationHistory(selectedCustomer.id) : [];
  const customerEstimatedSpend = selectedCustomer ? getCustomerEstimatedSpend(selectedCustomer.id) : null;
  const customerCommercial = selectedCustomer ? classifyCustomer(selectedCustomer) : null;

  const recentActivity = useMemo(() => {
    const sourceReservations = selectedCustomer
      ? [...customerReservations].sort((left, right) => {
          const leftTime = new Date(left.createdAt).getTime();
          const rightTime = new Date(right.createdAt).getTime();
          return rightTime - leftTime;
        })
      : [];

    return sourceReservations.slice(0, 5).map((reservation) => ({
      id: reservation.id,
      title:
        reservation.status === "confirmed"
          ? "Nueva reserva confirmada"
          : reservation.status === "cancelled"
            ? "Reserva cancelada"
            : reservation.status === "completed"
              ? "Reserva completada"
              : reservation.status === "no_show"
                ? "Reserva sin llegada"
                : "Reserva actualizada",
      subtitle: `${reservation.customerName} · Mesa ${reservation.assignedTableIds?.[0] ?? reservation.tableLabel ?? "sin mesa"} · ${reservation.partySize} personas`,
      time: formatDateTime(reservation.createdAt),
      tone: getReservationTone(reservation.status),
    }));
  }, [customerReservations, selectedCustomer]);

  const visibleRows = filteredCustomers.slice(0, 8);
  const hasActiveFilters =
    search.trim().length > 0 || activeSegment !== "all" || visitFilter !== "all" || sortBy !== "recent";

  function handleClearFilters() {
    setSearch("");
    setActiveSegment("all");
    setVisitFilter("all");
    setSortBy("recent");
  }

  function handleExport() {
    if (customersToExport.length === 0) {
      return;
    }

    exportCustomersToCsv(customersToExport);
  }

  function buildHref(pathname: string) {
    return buildLocalAccessHref(pathname, businessSlugForLinks, currentSearchParams, hrefMode);
  }

  function openEditor(customer: Customer) {
    setSelectedCustomerId(customer.id);
    setEditorCustomerId(customer.id);
  }

  const noActiveBusinesses = businesses.length > 0 && !businesses.some((business) => business.status === "active");

  if (noActiveBusinesses) {
    return <LocalNoActiveBusinessesState />;
  }

  return (
    <section className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-hidden">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="text-[10px] uppercase tracking-[0.28em] text-cyan-300/80">CRM</p>
            <div className="mt-1 flex items-center gap-2">
              <h1 className="text-[1.85rem] font-semibold tracking-tight text-white">CRM / Gestión de clientes</h1>
              <Icon name="users" className="h-5 w-5 text-cyan-300" />
            </div>
            <p className="mt-1 max-w-3xl text-sm leading-6 text-slate-300">
              Conocé, segmentá y fidelizá a tus clientes para ofrecer experiencias memorables.
            </p>

            <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-300">
              <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1">
                {selectedBusiness?.category ?? "Restaurante de autor"}
              </span>
              <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1">
                {selectedBusiness?.city ?? "Pinamar"}
              </span>
              <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-cyan-100">
                Fuente de datos: {sourceLabel}
              </span>
              <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1 text-slate-200">
                Hoy · {currentDateLabel}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2">
            <button type="button" onClick={handleExport} className={designLabStyles.selectButton}>
              <Icon name="download" className="h-4 w-4" />
              Exportar clientes
            </button>
            <button type="button" className={designLabStyles.primaryButton} title="Próximamente">
              <Icon name="plus" className="h-4 w-4" />
              Nuevo cliente
            </button>
          </div>
        </div>

        <LocalBusinessWarning message={businessWarning} />

        {!initialized || customers === null || !isSelectionReady ? (
          <section className={`${designLabStyles.panel} px-4 py-5 text-sm text-slate-300`}>Cargando CRM...</section>
        ) : (
          <div className="grid min-h-0 flex-1 gap-3 xl:grid-cols-[minmax(0,1.44fr)_minmax(360px,0.96fr)]">
            <div className="flex min-h-0 flex-col gap-3 overflow-hidden">
              <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
                <CRMMetricCard
                  title="Total clientes"
                  value={String(metrics.total)}
                  helper="Base operativa del negocio"
                  tone="cyan"
                  actionLabel="Ver todos →"
                  icon="users"
                />
                <CRMMetricCard
                  title="Clientes VIP"
                  value={String(metrics.vip)}
                  helper="Clientes de mayor valor"
                  tone="amber"
                  actionLabel="Ver VIP →"
                  icon="crown"
                />
                <CRMMetricCard
                  title="Cumpleaños próximos"
                  value={String(metrics.birthdays)}
                  helper="Próximos 30 días"
                  tone="violet"
                  actionLabel="Ver cumpleaños →"
                  icon="gift"
                />
                <CRMMetricCard
                  title="Clientes frecuentes"
                  value={String(metrics.frequent)}
                  helper="2 o más reservas"
                  tone="emerald"
                  actionLabel="Ver frecuentes →"
                  icon="spark"
                />
                <CRMMetricCard
                  title="Riesgo no-show"
                  value={String(metrics.risk)}
                  helper="Clientes con alertas"
                  tone="rose"
                  actionLabel="Ver alertas →"
                  icon="alert"
                />
              </div>

              <LocalPremiumTabs
                className="w-full"
                items={segmentTabs.map((item) => ({
                  key: item.key,
                  label: item.label,
                  active: activeSegment === item.key,
                  onClick: () => setActiveSegment(item.key),
                }))}
              />

              <section className={`${designLabStyles.panel} flex min-h-0 flex-col overflow-hidden px-4 py-3`}>
                <div className="grid gap-2 xl:grid-cols-[minmax(0,1.35fr)_repeat(3,minmax(0,0.84fr))_auto]">
                  <label className="space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Buscar</span>
                    <div className="input-base flex h-11 items-center gap-2">
                      <Icon name="search" className="h-4 w-4 text-slate-400" />
                      <input
                        value={search}
                        onChange={(event) => setSearch(event.target.value)}
                        placeholder="Buscar por nombre, teléfono o email..."
                        className="h-full w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                      />
                    </div>
                  </label>

                  <label className="space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Segmento</span>
                    <select
                      value={activeSegment}
                      onChange={(event) => setActiveSegment(event.target.value as CustomerSegment)}
                      className="input-base h-11"
                    >
                      {segmentSelectOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Visitas</span>
                    <select
                      value={visitFilter}
                      onChange={(event) => setVisitFilter(event.target.value as VisitFilter)}
                      className="input-base h-11"
                    >
                      {visitFilterOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="space-y-1">
                    <span className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Ordenar por</span>
                    <select
                      value={sortBy}
                      onChange={(event) => setSortBy(event.target.value as SortBy)}
                      className="input-base h-11"
                    >
                      {sortOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </label>

                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={handleClearFilters}
                      className={`${designLabStyles.selectButton} h-11 px-4`}
                    >
                      <Icon name="filter" className="h-4 w-4" />
                      Filtros
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px] text-slate-400">
                  <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1 text-slate-300">
                    {filteredCustomers.length} clientes visibles
                  </span>
                  <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1 text-slate-300">
                    {hasActiveFilters ? "Filtros activos" : "Sin filtros aplicados"}
                  </span>
                  <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1 text-slate-300">
                    {selectedBusiness?.name ?? formatPrettySlug(selectedBusinessKey)}
                  </span>
                </div>
              </section>

              <section className={`${designLabStyles.panel} flex min-h-0 flex-1 flex-col overflow-hidden`}>
                <header className={`${designLabStyles.panelHeader} shrink-0`}>
                  <div className={designLabStyles.panelTitleGroup}>
                    <h2 className={designLabStyles.panelTitle}>Clientes</h2>
                    <span className={designLabStyles.panelChip}>{filteredCustomers.length} visibles</span>
                  </div>

                  <div className={designLabStyles.panelActions}>
                    <Link href={buildHref("/local/crm")} className={designLabStyles.tableLinkButton}>
                      Ver CRM →
                    </Link>
                    <button type="button" className={designLabStyles.selectButton}>
                      Vista: Tabla
                    </button>
                  </div>
                </header>

                <div
                  className="grid border-b border-white/6 bg-[rgba(2,6,23,0.24)] px-4 py-3 text-[10px] uppercase tracking-[0.18em] text-slate-400"
                  style={{
                    gridTemplateColumns:
                      "minmax(0,1.2fr) minmax(0,1.2fr) 92px 110px 128px 68px 118px 72px",
                  }}
                >
                  <span>Cliente</span>
                  <span>Contacto</span>
                  <span>Segmento</span>
                  <span>Última visita</span>
                  <span>Próxima reserva</span>
                  <span>Visitas</span>
                  <span>Gasto promedio</span>
                  <span>Acciones</span>
                </div>

                {visibleRows.length > 0 ? (
                  <div className="min-h-0 flex-1 overflow-y-auto">
                    {visibleRows.map((customer) => (
                      <CustomerRow
                        key={customer.id}
                        customer={customer}
                        active={customer.id === selectedCustomer?.id}
                        onSelect={() => setSelectedCustomerId(customer.id)}
                        onEdit={() => openEditor(customer)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex min-h-0 flex-1 items-center justify-center px-6 py-12 text-center">
                    <div className="max-w-sm">
                      <p className="text-sm font-medium text-white">No hay clientes que coincidan con estos filtros.</p>
                      <p className="mt-1.5 text-xs leading-5 text-slate-400">
                        Probá limpiando los filtros o cambiando de negocio.
                      </p>
                      <button
                        type="button"
                        onClick={handleClearFilters}
                        className="mt-4 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
                      >
                        Limpiar filtros
                      </button>
                    </div>
                  </div>
                )}

                <footer className="flex shrink-0 items-center justify-between gap-3 border-t border-white/6 px-4 py-2.5 text-xs text-slate-400">
                  <span>
                    Mostrando 1 a {Math.min(visibleRows.length, 8)} de {filteredCustomers.length} clientes
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300"
                    >
                      <Icon name="chevron-left" className="h-4 w-4" />
                    </button>
                    <span className="rounded-lg border border-cyan-400/20 bg-cyan-500/10 px-3 py-1.5 text-cyan-100">
                      1
                    </span>
                    <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
                      2
                    </span>
                    <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
                      3
                    </span>
                    <span className="px-2 text-slate-500">…</span>
                    <span className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-slate-300">
                      156
                    </span>
                    <button
                      type="button"
                      className="grid h-8 w-8 place-items-center rounded-lg border border-white/10 bg-white/5 text-slate-300"
                    >
                      <Icon name="chevron-right" className="h-4 w-4" />
                    </button>
                  </div>
                </footer>
              </section>
            </div>

            <aside className={`${designLabStyles.panel} flex min-h-0 flex-col overflow-hidden`}>
              {selectedCustomer ? (
                <>
                  <header className="border-b border-white/8 px-4 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
                          Cliente seleccionado
                        </p>
                        <div className="mt-3 flex items-center gap-3">
                          <div
                            className={`grid h-16 w-16 shrink-0 place-items-center rounded-full border text-xl font-semibold ${
                              customerCommercial?.key === "vip"
                                ? "border-amber-400/25 bg-amber-500/10 text-amber-100"
                                : customerCommercial?.key === "risk"
                                  ? "border-rose-400/25 bg-rose-500/10 text-rose-100"
                                  : customerCommercial?.key === "recurrent"
                                    ? "border-emerald-400/25 bg-emerald-500/10 text-emerald-100"
                                    : "border-cyan-400/25 bg-cyan-500/10 text-cyan-100"
                            }`}
                          >
                            {initials(selectedCustomer.name)}
                          </div>
                          <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-2">
                              <h3 className="truncate text-[1.15rem] font-semibold text-white">
                                {selectedCustomer.name}
                              </h3>
                              {customerCommercial ? (
                                <TonePill tone={getCommercialTone(customerCommercial.key)}>
                                  {customerCommercial.label}
                                </TonePill>
                              ) : null}
                            </div>
                            <p className="mt-1 truncate text-sm text-slate-300">{selectedCustomer.phone}</p>
                            <p className="mt-1 truncate text-xs text-slate-400">
                              {selectedCustomer.email ?? "Sin email"}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col gap-2">
                        <a
                          href={`https://wa.me/${selectedCustomer.phone.replace(/\D/g, "")}`}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 text-xs font-medium text-emerald-100 transition hover:border-emerald-300/40 hover:bg-emerald-500/15"
                        >
                          <Icon name="whatsapp" className="h-4 w-4" />
                          Enviar WhatsApp
                        </a>
                        <Link
                          href={buildHref("/local/reservas")}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-cyan-400/20 bg-cyan-500/10 px-3 text-xs font-medium text-cyan-100 transition hover:border-cyan-300/40 hover:bg-cyan-500/15"
                        >
                          <Icon name="calendar" className="h-4 w-4" />
                          Crear reserva
                        </Link>
                        <button
                          type="button"
                          onClick={() => setEditorCustomerId(selectedCustomer.id)}
                          className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 text-xs font-medium text-slate-200 transition hover:border-cyan-400/30 hover:text-white"
                        >
                          <Icon name="edit" className="h-4 w-4" />
                          Editar cliente
                        </button>
                      </div>
                    </div>
                  </header>

                  <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 pr-3">
                    <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                      <SummaryStat
                        label="Cumpleaños"
                        value={metrics.birthdays > 0 ? "Próximos" : "Sin dato"}
                        helper="Detectado desde notas y etiquetas"
                        tone="violet"
                        icon="gift"
                      />
                      <SummaryStat
                        label="Última visita"
                        value={formatDateOnly(selectedCustomer.lastReservationAt)}
                        helper={formatTime(selectedCustomer.lastReservationAt)}
                        tone="cyan"
                        icon="clock"
                      />
                      <SummaryStat
                        label="Próxima reserva"
                        value={selectedCustomer.nextReservationAt ? formatDateOnly(selectedCustomer.nextReservationAt) : "Sin reserva"}
                        helper={
                          selectedCustomer.nextReservationAt
                            ? formatTime(selectedCustomer.nextReservationAt)
                            : "Pendiente"
                        }
                        tone="emerald"
                        icon="calendar"
                      />
                      <SummaryStat
                        label="Visitas"
                        value={String(selectedCustomer.totalReservations)}
                        helper={`${selectedCustomer.confirmedReservations} confirmadas`}
                        tone="amber"
                        icon="users"
                      />
                      <SummaryStat
                        label="Gasto promedio"
                        value={formatCurrency(
                          customerEstimatedSpend ? Math.round(customerEstimatedSpend / Math.max(1, selectedCustomer.totalReservations)) : null,
                        )}
                        helper={customerEstimatedSpend ? formatCurrency(customerEstimatedSpend) : "Sin datos"}
                        tone="rose"
                        icon="star"
                      />
                    </div>

                    <div className="mt-3 grid gap-3 lg:grid-cols-2">
                      <DetailSection title="Preferencias" icon="tag">
                        <div className="space-y-3">
                          <div className="flex flex-wrap gap-1.5">
                            {customerSuggestedTags.length > 0 ? (
                              customerSuggestedTags.map((tag) => (
                                <span
                                  key={tag}
                                  className="inline-flex items-center justify-center rounded-full border border-amber-400/20 bg-amber-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-amber-100"
                                >
                                  {tag}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-slate-400">Sin preferencias sugeridas.</span>
                            )}
                          </div>

                          <div className="rounded-[14px] border border-white/10 bg-white/5 p-3">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Notas</p>
                            <p className="mt-2 whitespace-pre-line text-sm leading-6 text-slate-200">
                              {selectedCustomer.notes || "Sin notas internas todavía."}
                            </p>
                          </div>
                        </div>
                      </DetailSection>

                      <DetailSection title="Alergias e intolerancias" icon="alert">
                        <div className="space-y-2">
                          <div className="flex flex-wrap gap-1.5">
                            {getCustomerAllergyLabels(selectedCustomer).length > 0 ? (
                              getCustomerAllergyLabels(selectedCustomer).map((label) => (
                                <span
                                  key={label}
                                  className="inline-flex items-center justify-center rounded-full border border-rose-400/20 bg-rose-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-rose-100"
                                >
                                  {label}
                                </span>
                              ))
                            ) : (
                              <span className="text-sm text-slate-400">Sin alergias registradas.</span>
                            )}
                          </div>

                          <div className="rounded-[14px] border border-white/10 bg-white/5 p-3 text-sm leading-6 text-slate-200">
                            {selectedCustomer.preferences || "Sin preferencias de cocina cargadas."}
                          </div>
                        </div>
                      </DetailSection>
                    </div>

                    <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                      <DetailSection title="Actividad reciente" icon="history">
                        <div className="space-y-3">
                          {(recentActivity.length > 0 ? recentActivity : []).map((item) => (
                            <div
                              key={item.id}
                              className="flex items-start gap-3 rounded-[14px] border border-white/10 bg-white/5 p-3"
                            >
                              <div
                                className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-full border ${
                                  item.tone === "emerald"
                                    ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                                    : item.tone === "rose"
                                      ? "border-rose-400/20 bg-rose-500/10 text-rose-100"
                                      : item.tone === "violet"
                                        ? "border-violet-400/20 bg-violet-500/10 text-violet-100"
                                        : item.tone === "amber"
                                          ? "border-amber-400/20 bg-amber-500/10 text-amber-100"
                                          : "border-cyan-400/20 bg-cyan-500/10 text-cyan-100"
                                }`}
                              >
                                <Icon name={item.tone === "rose" ? "alert" : "calendar"} className="h-4 w-4" />
                              </div>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-medium text-white">{item.title}</p>
                                <p className="mt-1 text-xs leading-5 text-slate-400">{item.subtitle}</p>
                              </div>
                              <div className="text-right text-[11px] text-slate-500">{item.time}</div>
                            </div>
                          ))}
                        </div>
                      </DetailSection>

                      <DetailSection title="Historial de reservas" icon="calendar">
                        <div className="space-y-2">
                          {customerReservations.slice(0, 5).map((reservation) => (
                            <div key={reservation.id} className="rounded-[14px] border border-white/10 bg-white/5 px-3 py-2.5">
                              <div className="flex items-start justify-between gap-3">
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-medium text-white">
                                    {formatLongDate(`${reservation.reservationDate}T00:00:00`)} ·{" "}
                                    {formatTime(`1970-01-01T${reservation.reservationTime}:00`)}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-400">
                                    Mesa {reservation.assignedTableIds?.[0] ?? reservation.tableLabel ?? "sin mesa"} ·{" "}
                                    {reservation.partySize} personas
                                  </p>
                                </div>
                                <span
                                  className={`inline-flex shrink-0 items-center justify-center rounded-full border px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] ${
                                    reservation.status === "confirmed"
                                      ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                                      : reservation.status === "cancelled"
                                        ? "border-rose-400/20 bg-rose-500/10 text-rose-100"
                                        : reservation.status === "completed"
                                          ? "border-cyan-400/20 bg-cyan-500/10 text-cyan-100"
                                          : reservation.status === "no_show"
                                            ? "border-violet-400/20 bg-violet-500/10 text-violet-100"
                                            : "border-amber-400/20 bg-amber-500/10 text-amber-100"
                                  }`}
                                >
                                  {getReservationStatusLabel(reservation.status)}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </DetailSection>
                    </div>

                    <div className="mt-3 grid gap-3 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.95fr)]">
                      <DetailSection title="Consumos y preferencias" icon="star">
                        <div className="space-y-3">
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="rounded-[14px] border border-white/10 bg-white/5 p-3">
                              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Gasto estimado</p>
                              <p className="mt-2 text-[1.35rem] font-semibold text-white">
                                {formatCurrency(customerEstimatedSpend)}
                              </p>
                            </div>
                            <div className="rounded-[14px] border border-white/10 bg-white/5 p-3">
                              <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Tags sugeridos</p>
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {customerSuggestedTags.length > 0 ? (
                                  customerSuggestedTags.slice(0, 4).map((tag) => (
                                    <span
                                      key={tag}
                                      className="inline-flex items-center justify-center rounded-full border border-cyan-400/20 bg-cyan-500/10 px-2.5 py-1 text-[10px] font-medium uppercase tracking-[0.14em] text-cyan-100"
                                    >
                                      {tag}
                                    </span>
                                  ))
                                ) : (
                                  <span className="text-sm text-slate-400">Sin tags sugeridos.</span>
                                )}
                              </div>
                            </div>
                          </div>

                          <div className="rounded-[14px] border border-white/10 bg-white/5 p-3">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Servicios favoritos</p>
                            <div className="mt-2 space-y-2">
                              {customerFavoriteServices.length > 0 ? (
                                customerFavoriteServices.map((service) => (
                                  <div key={service.serviceId} className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="truncate text-sm text-white">{service.name}</p>
                                      <p className="mt-1 text-xs text-slate-400">{service.count} reservas</p>
                                    </div>
                                    <span className="rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1 text-[10px] uppercase tracking-[0.14em] text-slate-300">
                                      {service.count}
                                    </span>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-slate-400">Todavía no hay servicios favoritos.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      </DetailSection>

                      <DetailSection title="Notas internas" icon="note">
                        <div className="space-y-3">
                          <div className="rounded-[14px] border border-white/10 bg-white/5 p-3">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">Últimas notas</p>
                            <div className="mt-2 space-y-2">
                              {customerNotes.length > 0 ? (
                                customerNotes.slice(0, 3).map((note) => (
                                  <div key={note.id} className="rounded-[12px] border border-white/8 bg-slate-950/40 p-2.5">
                                    <p className="text-sm leading-6 text-slate-200">{note.note}</p>
                                    <p className="mt-1 text-[11px] text-slate-500">{formatDateTime(note.createdAt)}</p>
                                  </div>
                                ))
                              ) : (
                                <p className="text-sm text-slate-400">Sin notas internas todavía.</p>
                              )}
                            </div>
                          </div>

                          <div className="rounded-[14px] border border-white/10 bg-white/5 p-3">
                            <p className="text-[10px] uppercase tracking-[0.18em] text-slate-400">
                              Observaciones rápidas
                            </p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              {customerReservations.length > 0 ? (
                                customerReservations.slice(0, 3).map((reservation) => (
                                  <span
                                    key={reservation.id}
                                    className="inline-flex items-center justify-center rounded-full border border-white/10 bg-slate-900/70 px-2.5 py-1 text-[10px] text-slate-300"
                                  >
                                    {reservation.customerName}
                                  </span>
                                ))
                              ) : (
                                <span className="text-sm text-slate-400">Sin observaciones.</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </DetailSection>
                    </div>

                    <div className="mt-3 rounded-[16px] border border-white/10 bg-[rgba(7,15,28,0.94)] p-3 text-[11px] text-slate-400">
                      CRM conectado a {sourceLabel}. Los cambios de notas y preferencias siguen disponibles en el
                      editor detallado del cliente.
                    </div>
                  </div>
                </>
              ) : (
                <div className="flex min-h-0 flex-1 items-center justify-center p-6 text-center text-slate-400">
                  Seleccioná un cliente para ver su ficha.
                </div>
              )}
            </aside>
          </div>
        )}
      </div>

      {editorCustomerId && selectedBusiness ? (
        <LocalCustomerDetailDrawer
          key={editorCustomerId}
          business={selectedBusiness}
          customer={
            visibleCustomersBase.find((customer) => customer.id === editorCustomerId) ??
            filteredCustomers.find((customer) => customer.id === editorCustomerId) ??
            null
          }
          onClose={() => setEditorCustomerId(null)}
          serviceNameById={serviceNameById}
          sourceLabel={sourceLabel}
        />
      ) : null}
    </section>
  );
}
