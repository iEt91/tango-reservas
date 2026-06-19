import type { Business } from "@/data/types";
import type { AdminBusinessStats } from "@/lib/admin";
import { BusinessActions } from "./BusinessActions";
import { BusinessStatusBadge } from "./BusinessStatusBadge";

type AdminBusinessTableProps = {
  businesses: Business[];
  statsByBusinessId: Map<string, AdminBusinessStats | null>;
  onDuplicate: (businessId: string) => void;
  onToggleStatus: (businessId: string) => void;
  onDelete: (businessId: string) => void;
  readOnly?: boolean;
};

function ActivityText(stats: AdminBusinessStats | null | undefined) {
  if (!stats?.lastActivityAt) {
    return "Sin actividad";
  }

  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(stats.lastActivityAt));
}

function ReservationsText(stats: AdminBusinessStats | null | undefined) {
  if (!stats) {
    return "0";
  }

  return `${stats.reservationsTotal} / ${stats.reservationsPending}`;
}

export function AdminBusinessTable({
  businesses,
  statsByBusinessId,
  onDuplicate,
  onToggleStatus,
  onDelete,
  readOnly = false,
}: AdminBusinessTableProps) {
  return (
    <section className="overflow-hidden rounded-[2rem] border border-white/10 bg-white/5 shadow-2xl shadow-black/20">
      <div className="border-b border-white/10 p-6">
        <p className="text-[10px] uppercase tracking-[0.24em] text-slate-400">
          Negocios
        </p>
        <h2 className="mt-2 text-xl font-semibold text-white">
          Tabla operativa de negocios
        </h2>
      </div>

      <div className="hidden xl:block">
        <div className="overflow-x-auto">
          <table className="min-w-[1480px] w-full divide-y divide-white/10 text-left">
            <thead className="bg-white/5 text-xs uppercase tracking-[0.18em] text-slate-400">
              <tr>
                <th className="px-6 py-4 font-medium">Nombre</th>
                <th className="px-6 py-4 font-medium">Slug</th>
                <th className="px-6 py-4 font-medium">Rubro</th>
                <th className="px-6 py-4 font-medium">Localidad</th>
                <th className="px-6 py-4 font-medium">Estado</th>
                <th className="px-6 py-4 font-medium">Contacto</th>
                <th className="px-6 py-4 font-medium">Web</th>
                <th className="px-6 py-4 font-medium">Métricas</th>
                <th className="px-6 py-4 font-medium">Configuración</th>
                <th className="px-6 py-4 font-medium">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/10">
              {businesses.map((business) => {
                const stats = statsByBusinessId.get(business.id);
                const setupStatus = stats?.setupStatus;
                const slug = encodeURIComponent(business.slug);

                return (
                  <tr key={business.id} className="text-sm text-slate-200">
                    <td className="px-6 py-4">
                      <div className="font-medium text-white">{business.name}</div>
                      <div className="mt-1 text-xs text-slate-400">
                        {business.description}
                      </div>
                    </td>
                    <td className="px-6 py-4 font-mono text-slate-300">{business.slug}</td>
                    <td className="px-6 py-4 text-slate-300">{business.category}</td>
                    <td className="px-6 py-4 text-slate-300">{business.city}</td>
                    <td className="px-6 py-4">
                      <BusinessStatusBadge status={business.status} />
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      <div>{business.phone}</div>
                      <div className="text-xs text-slate-400">WA {business.whatsapp}</div>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      <a
                        href={`/${slug}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-cyan-200 transition hover:text-cyan-100"
                      >
                        Ver web pública
                      </a>
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {readOnly ? (
                        <div className="space-y-1">
                          <div>Reservas: —</div>
                          <div className="text-xs text-slate-400">Disponible en local/mock.</div>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div>Reservas: {ReservationsText(stats)}</div>
                          <div>Hoy: {stats?.reservationsToday ?? 0}</div>
                          <div>Última: {ActivityText(stats)}</div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-300">
                      {readOnly ? (
                        <div className="space-y-2">
                          <span className="inline-flex rounded-full bg-slate-500/10 px-3 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/10">
                            Solo local/mock
                          </span>
                          <div className="max-w-[240px] text-xs leading-5 text-slate-400">
                            Las métricas de configuracion se veran cuando la capa de escritura de
                            Supabase este lista.
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-medium ring-1 ${
                              setupStatus?.complete
                                ? "bg-emerald-500/15 text-emerald-300 ring-emerald-400/20"
                                : "bg-amber-500/15 text-amber-300 ring-amber-400/20"
                            }`}
                          >
                            {setupStatus?.complete ? "Completo" : "Incompleto"}
                          </span>
                          <div className="max-w-[240px] text-xs leading-5 text-slate-400">
                            {setupStatus?.missing.length
                              ? setupStatus.missing.join(" · ")
                              : "Sin faltantes"}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <BusinessActions
                        business={business}
                        onDuplicate={onDuplicate}
                        onToggleStatus={onToggleStatus}
                        onDelete={onDelete}
                        readOnly={false}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-4 p-4 xl:hidden">
        {businesses.map((business) => {
          const stats = statsByBusinessId.get(business.id);
          const setupStatus = stats?.setupStatus;
          const slug = encodeURIComponent(business.slug);

          return (
            <article
              key={business.id}
              className="rounded-[1.75rem] border border-white/10 bg-slate-950/70 p-4 shadow-lg shadow-black/20"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-lg font-semibold text-white">{business.name}</h3>
                    <BusinessStatusBadge status={business.status} />
                  </div>
                  <p className="text-sm text-slate-300">{business.description}</p>
                  <p className="font-mono text-xs text-slate-400">{business.slug}</p>
                </div>
                <a
                  href={`/${slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs font-medium text-slate-200 transition hover:border-cyan-400/40 hover:text-white"
                >
                  Ver web
                </a>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    Localidad / Rubro
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {business.city} · {business.category}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    Reservas
                  </p>
                  {readOnly ? (
                    <p className="mt-2 text-sm text-slate-200">Disponible en local/mock.</p>
                  ) : (
                    <p className="mt-2 text-sm text-slate-200">
                      {stats?.reservationsTotal ?? 0} totales ·{" "}
                      {stats?.reservationsPending ?? 0} pendientes
                    </p>
                  )}
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    Última actividad
                  </p>
                  <p className="mt-2 text-sm text-slate-200">
                    {readOnly ? "Disponible en local/mock." : ActivityText(stats)}
                  </p>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/5 p-3">
                  <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400">
                    Configuración
                  </p>
                  {readOnly ? (
                    <>
                      <p className="mt-2 text-sm text-slate-200">Disponible en local/mock.</p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        La configuración completa se calculará cuando la escritura de Supabase
                        esté disponible.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-2 text-sm text-slate-200">
                        {setupStatus?.complete ? "Completo" : "Incompleto"}
                      </p>
                      <p className="mt-1 text-xs leading-5 text-slate-400">
                        {setupStatus?.missing.length
                          ? setupStatus.missing.join(" · ")
                          : "Sin faltantes"}
                      </p>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                <div>{business.phone}</div>
                <div className="text-xs text-slate-400">WA {business.whatsapp}</div>
              </div>

              <div className="mt-4">
                <BusinessActions
                  business={business}
                  onDuplicate={onDuplicate}
                  onToggleStatus={onToggleStatus}
                  onDelete={onDelete}
                  readOnly={false}
                />
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
