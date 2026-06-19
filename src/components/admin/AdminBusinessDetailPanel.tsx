"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { Business } from "@/data/types";
import { BusinessStatusBadge } from "./BusinessStatusBadge";
import { getDataSource } from "@/lib/data/dataSource";
import {
  deleteAdminBusiness,
  getBusinesses,
  getBusinessBySlug,
  setAdminBusinessStatus,
  subscribeBusinesses,
} from "@/lib/data/admin-businesses";
import { getBusinessAdminStats, getBusinessSetupStatus } from "@/lib/admin";
import { getReservationsByBusinessId, subscribeReservations } from "@/data/reservations";
import { getBusinessHours, getBusinessServices, getReservationRules, subscribeScheduling } from "@/data/scheduling";
import { getMenuSummary, subscribeMenu } from "@/data/menu";
import { getFloorTablesByBusinessId, subscribeFloorPlan } from "@/data/floor-plan";
import { getPublicWebContentByBusinessId, subscribePublicWeb } from "@/lib/data/webContent";
import { AdminDeleteBusinessDialog } from "./AdminDeleteBusinessDialog";

type AdminBusinessDetailPanelProps = {
  slug: string;
};

function formatActivity(value: string | null | undefined) {
  if (!value) {
    return "Sin actividad";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getTodayIsoDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(new Date());
}

function StatCard({
  label,
  value,
  helper,
}: {
  label: string;
  value: number | string;
  helper?: string;
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-slate-950/70 p-4 shadow-lg shadow-black/20">
      <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">{label}</p>
      <p className="mt-2 text-2xl font-semibold text-white">{value}</p>
      {helper ? <p className="mt-1 text-xs leading-5 text-slate-400">{helper}</p> : null}
    </article>
  );
}

export function AdminBusinessDetailPanel({ slug }: AdminBusinessDetailPanelProps) {
  const [mounted, setMounted] = useState(false);
  const [business, setBusiness] = useState<Business | null>(null);
  const [activeBusinessCount, setActiveBusinessCount] = useState(0);
  const [deleteTarget, setDeleteTarget] = useState<Business | null>(null);
  const [deleteSlugInput, setDeleteSlugInput] = useState("");
  const [deleteMessage, setDeleteMessage] = useState("");
  const [feedback, setFeedback] = useState("");
  const sourceIsSupabase = getDataSource() === "supabase";

  useEffect(() => {
    let cancelled = false;

    void (async () => {
      const [nextBusiness, nextBusinesses] = await Promise.all([
        getBusinessBySlug(slug),
        getBusinesses(),
      ]);

      if (!cancelled) {
        setBusiness(nextBusiness);
        setActiveBusinessCount(nextBusinesses.filter((entry) => entry.status === "active").length);
        setMounted(true);
      }
    })();

    const refreshBusiness = () => {
      void (async () => {
        const [nextBusiness, nextBusinesses] = await Promise.all([
          getBusinessBySlug(slug),
          getBusinesses(),
        ]);

        if (!cancelled) {
          setBusiness(nextBusiness);
          setActiveBusinessCount(
            nextBusinesses.filter((entry) => entry.status === "active").length,
          );
        }
      })();
    };

    const unsubscribeBusinesses = subscribeBusinesses(refreshBusiness);
    const unsubscribeReservations = subscribeReservations(refreshBusiness);
    const unsubscribeScheduling = subscribeScheduling(refreshBusiness);
    const unsubscribeMenu = subscribeMenu(refreshBusiness);
    const unsubscribeFloorPlan = subscribeFloorPlan(refreshBusiness);
    const unsubscribePublicWeb = subscribePublicWeb(refreshBusiness);

    return () => {
      cancelled = true;
      unsubscribeBusinesses();
      unsubscribeReservations();
      unsubscribeScheduling();
      unsubscribeMenu();
      unsubscribeFloorPlan();
      unsubscribePublicWeb();
    };
  }, [slug]);

  const stats = useMemo(() => (business ? getBusinessAdminStats(business) : null), [business]);
  const setupStatus = useMemo(
    () => (business ? getBusinessSetupStatus(business) : null),
    [business],
  );
  const menuSummary = useMemo(() => (business ? getMenuSummary(business.id) : null), [business]);
  const services = useMemo(() => (business ? getBusinessServices(business.id) : []), [business]);
  const hours = useMemo(() => (business ? getBusinessHours(business.id) : []), [business]);
  const rules = useMemo(() => (business ? getReservationRules(business.id) : null), [business]);
  const tables = useMemo(
    () => (business ? getFloorTablesByBusinessId(business.id) : []),
    [business],
  );
  const reservations = useMemo(
    () => (business ? getReservationsByBusinessId(business.id) : []),
    [business],
  );
  const webContent = useMemo(
    () => (business ? getPublicWebContentByBusinessId(business.id) : null),
    [business],
  );
  const today = useMemo(() => getTodayIsoDate(), []);
  const reservationCounts = useMemo(() => {
    const counts = {
      pending: 0,
      confirmed: 0,
      completed: 0,
      cancelled: 0,
      no_show: 0,
    };

    for (const reservation of reservations) {
      if (reservation.status in counts) {
        counts[reservation.status as keyof typeof counts] += 1;
      }
    }

    return counts;
  }, [reservations]);

  const reservationsToday = useMemo(
    () => reservations.filter((reservation) => reservation.reservationDate === today).length,
    [reservations, today],
  );

  const isBaseBusiness = Boolean(
    !sourceIsSupabase && business && ["demuru", "barbados", "cafe-demo"].includes(business.slug),
  );

  function handleToggleStatus() {
    if (!business) {
      return;
    }

    const nextStatus = business.status === "inactive" ? "active" : "inactive";

    void (async () => {
      try {
        const updated = await setAdminBusinessStatus(business.id, nextStatus);
        const nextBusinesses = await getBusinesses();
        setBusiness(updated);
        setActiveBusinessCount(nextBusinesses.filter((entry) => entry.status === "active").length);
        setFeedback(
          updated.status === "active"
            ? `Negocio activado correctamente: ${updated.name}.`
            : `Negocio desactivado correctamente: ${updated.name}.`,
        );
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No pudimos actualizar el estado.");
      }
    })();
  }

  function handleConfirmDelete() {
    if (!business) {
      return;
    }

    if (deleteSlugInput.trim() !== business.slug) {
      setDeleteMessage("Escribe exactamente el slug para confirmar.");
      return;
    }

    void (async () => {
      try {
        const deleted = await deleteAdminBusiness(business.id);
        setFeedback(`Negocio eliminado correctamente: ${deleted.name}.`);
        setDeleteTarget(null);
        setDeleteSlugInput("");
        setDeleteMessage("");
        window.location.href = "/admin";
      } catch (error) {
        setFeedback(error instanceof Error ? error.message : "No pudimos eliminar el negocio.");
        setDeleteTarget(null);
        setDeleteSlugInput("");
        setDeleteMessage("");
      }
    })();
  }

  const checklist = business
    ? [
        {
          label: "Datos básicos completos",
          complete:
            Boolean(business.name.trim()) &&
            Boolean(business.slug.trim()) &&
            Boolean(business.category.trim()) &&
            Boolean(business.city.trim()),
          missing: "Falta nombre, slug, rubro o localidad.",
        },
        {
          label: "Contacto completo",
          complete:
            Boolean(business.phone.trim()) &&
            Boolean(business.whatsapp.trim()) &&
            Boolean(business.email.trim()) &&
            Boolean(business.address.trim()),
          missing: "Faltan teléfono, WhatsApp, email o dirección.",
        },
        {
          label: "Servicios activos",
          complete: services.some((service) => service.isActive),
          missing: "No hay servicios activos cargados.",
        },
        {
          label: "Horarios configurados",
          complete: hours.some((entry) => entry.isOpen),
          missing: "No hay horarios abiertos configurados.",
        },
        {
          label: "Reglas de reserva",
          complete: Boolean(rules),
          missing: "Faltan reglas de reserva.",
        },
        {
          label: "Menú cargado",
          complete: Boolean(menuSummary && menuSummary.totalCategories > 0 && menuSummary.totalItems > 0),
          missing: "El menú todavía no tiene categorías o items activos.",
        },
        {
          label: "Web pública preparada",
          complete:
            Boolean(webContent?.heroTitle?.trim()) &&
            Boolean(webContent?.publicDescription?.trim()) &&
            Boolean(webContent?.showHero || webContent?.showAbout || webContent?.showGallery),
          missing: "Faltan datos básicos de la web pública.",
        },
        {
          label: "Plano creado",
          complete: tables.length > 0,
          missing: "No hay mesas cargadas en el plano.",
        },
      ]
    : [];

  const quickLinks = business
    ? [
        { href: `/local/reservas?business=${encodeURIComponent(business.slug)}`, label: "Reservas" },
        {
          href: `/local/configuracion?business=${encodeURIComponent(business.slug)}`,
          label: "Configuración",
        },
        { href: `/local/menu?business=${encodeURIComponent(business.slug)}`, label: "Menú" },
        { href: `/local/plano?business=${encodeURIComponent(business.slug)}`, label: "Plano" },
        { href: `/local/reportes?business=${encodeURIComponent(business.slug)}`, label: "Reportes" },
        { href: `/${encodeURIComponent(business.slug)}`, label: "Ver web pública" },
      ]
    : [];

  if (!mounted) {
    return (
      <main className="w-full py-8">
        <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8 xl:px-10">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-black/20">
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">
              Admin / Detalle
            </p>
            <h1 className="mt-4 text-3xl font-semibold text-white">Cargando negocio...</h1>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Estamos cargando la ficha del negocio seleccionado desde la capa local/mock.
            </p>
            <Link
              href="/admin"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Volver al admin
            </Link>
          </section>
        </div>
      </main>
    );
  }

  if (!business || !stats || !setupStatus) {
    return (
      <main className="w-full py-8">
        <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8 xl:px-10">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-8 text-center shadow-2xl shadow-black/20">
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">
              Admin / Detalle
            </p>
            <h1 className="mt-4 text-3xl font-semibold text-white">
              Negocio no encontrado
            </h1>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              No pudimos cargar la ficha del negocio solicitado en la capa local/mock.
            </p>
            <Link
              href="/admin"
              className="mt-6 inline-flex items-center justify-center rounded-full bg-cyan-400 px-5 py-3 text-sm font-semibold text-slate-950 transition hover:bg-cyan-300"
            >
              Volver al admin
            </Link>
          </section>
        </div>
      </main>
    );
  }

  return (
    <main className="w-full py-8">
      <div className="mx-auto w-full max-w-[1800px] px-4 sm:px-6 lg:px-8 xl:px-10">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm uppercase tracking-[0.24em] text-cyan-300/80">
              Admin / Detalle
            </p>
            <h1 className="mt-2 text-3xl font-semibold text-white">{business.name}</h1>
            <p className="mt-2 text-sm text-slate-300">
              {business.slug} · {business.category} · {business.city}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
            >
              Volver a Admin
            </Link>
            <Link
              href={`/${encodeURIComponent(business.slug)}`}
              target="_blank"
              rel="noreferrer"
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
            >
              Ver web pública
            </Link>
            <Link
              href={`/local/reservas?business=${encodeURIComponent(business.slug)}`}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
            >
              Ir al panel local
            </Link>
            <Link
              href={`/admin/businesses/${encodeURIComponent(business.slug)}/edit`}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
            >
              Editar negocio
            </Link>
            <button
              type="button"
              onClick={handleToggleStatus}
              className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-rose-400/40 hover:text-white"
            >
              {business.status === "inactive"
                ? "Reactivar"
                : business.status === "draft"
                  ? "Activar"
                  : "Desactivar"}
            </button>
            <button
              type="button"
              onClick={() => setDeleteTarget(business)}
              className="rounded-full border border-rose-400/30 bg-rose-500/10 px-4 py-2 text-sm font-medium text-rose-100 transition hover:border-rose-300/50 hover:bg-rose-500/15 hover:text-white"
            >
              Eliminar
            </button>
          </div>
        </div>

        {feedback ? (
          <div className="mb-6 rounded-2xl border border-emerald-400/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
            {feedback}
          </div>
        ) : null}

        {sourceIsSupabase ? (
          <div className="mb-6 rounded-2xl border border-amber-400/20 bg-amber-500/10 px-4 py-3 text-sm text-amber-100">
            Supabase está activo para businesses. El resto de módulos sigue en local/mock.
          </div>
        ) : null}

        <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20">
          <div className="flex flex-wrap gap-2">
            <BusinessStatusBadge status={business.status} />
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
              {business.category}
            </span>
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-medium text-slate-200">
              {business.city}
            </span>
            <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-xs font-medium text-cyan-100">
              {sourceIsSupabase ? "Supabase businesses + local/mock" : "Modo local/mock"}
            </span>
          </div>

          <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Reservas totales" value={stats.reservationsTotal} />
            <StatCard label="Pendientes" value={reservationCounts.pending} />
            <StatCard label="Confirmadas" value={reservationCounts.confirmed} />
            <StatCard label="Canceladas" value={reservationCounts.cancelled} />
            <StatCard label="No-show" value={reservationCounts.no_show} />
            <StatCard label="Completadas" value={reservationCounts.completed} />
            <StatCard label="Reservas hoy" value={reservationsToday} />
            <StatCard label="Última actividad" value={formatActivity(stats.lastActivityAt)} />
            <StatCard
              label="Configuración"
              value={setupStatus.complete ? "Completo" : "Incompleto"}
              helper={setupStatus.complete ? "Sin faltantes" : setupStatus.missing.join(" · ")}
            />
          </div>
        </section>

        <div className="mt-6 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20">
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
              Checklist de configuración
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">
              Estado de configuración del negocio
            </h2>

            <div className="mt-4 grid gap-3">
              {checklist.map((item) => (
                <article
                  key={item.label}
                  className="rounded-2xl border border-white/10 bg-slate-950/70 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-white">{item.label}</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {item.complete ? "Completo" : "Falta"}
                      </p>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${
                        item.complete
                          ? "border border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                          : "border border-amber-400/20 bg-amber-500/10 text-amber-100"
                      }`}
                    >
                      {item.complete ? "Completo" : "Falta"}
                    </span>
                  </div>
                  {!item.complete ? (
                    <p className="mt-3 text-xs leading-5 text-slate-400">{item.missing}</p>
                  ) : null}
                </article>
              ))}
            </div>
          </section>

          <section className="rounded-[2rem] border border-white/10 bg-white/5 p-5 shadow-2xl shadow-black/20">
            <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
              Accesos rápidos
            </p>
            <h2 className="mt-2 text-xl font-semibold text-white">Entradas directas</h2>

            <div className="mt-4 grid gap-3">
              {quickLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
                >
                  {link.label}
                </Link>
              ))}
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-slate-950/70 p-4 text-sm text-slate-300">
              <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Resumen operativo</p>
              <div className="mt-3 space-y-2">
                <div>Servicios activos: {services.filter((service) => service.isActive).length}</div>
                <div>Mesas configuradas: {tables.length}</div>
                <div>Categorías de menú: {menuSummary?.totalCategories ?? 0}</div>
                <div>Items de menú: {menuSummary?.totalItems ?? 0}</div>
                <div>
                  Reglas de reserva: {rules ? "Configuradas" : "Faltan"}
                </div>
                <div>
                  Web pública: {webContent?.showHero || webContent?.showAbout || webContent?.showMenu ? "Preparada" : "Básica"}
                </div>
              </div>
            </div>
          </section>
        </div>

        <AdminDeleteBusinessDialog
          open={Boolean(deleteTarget)}
          target={deleteTarget}
          slugInput={deleteSlugInput}
          deleteMessage={deleteMessage}
          isLastActive={Boolean(
            deleteTarget && deleteTarget.status === "active" && activeBusinessCount <= 1,
          )}
          isBaseBusiness={isBaseBusiness}
          onSlugInputChange={(nextValue) => {
            setDeleteSlugInput(nextValue);
            setDeleteMessage("");
          }}
          onClose={() => {
            setDeleteTarget(null);
            setDeleteSlugInput("");
            setDeleteMessage("");
          }}
          onConfirm={handleConfirmDelete}
        />
      </div>
    </main>
  );
}
