import {
  CalendarDays,
  CheckCircle2,
  Clock3,
  Plus,
  XCircle,
} from "lucide-react";
import { V2AppShell } from "@/components/v2/v2-app-shell";
import { V2ReservationStatusBadge } from "@/components/v2/v2-badge";
import { V2Button } from "@/components/v2/v2-button";
import { V2Card, V2MetricCard } from "@/components/v2/v2-card";
import { V2DataTable } from "@/components/v2/v2-data-table";
import { V2PageHeader } from "@/components/v2/v2-page-header";
import { v2Reservations } from "@/lib/v2/v2-mock-data";

export function V2LocalPage() {
  const nextReservation = v2Reservations.find(
    (item) => item.status === "confirmed"
  );

  const pendingReservations = v2Reservations.filter(
    (item) => item.status === "pending"
  );

  const totalReservations = v2Reservations.length;
  const confirmedReservations = v2Reservations.filter(
    (item) => item.status === "confirmed"
  ).length;
  const cancelledReservations = v2Reservations.filter(
    (item) => item.status === "cancelled"
  ).length;

  return (
    <V2AppShell>
      <V2PageHeader
        title="Hoy"
        description="Resumen del día y próximas reservas del local."
        actions={
          <V2Button variant="primary" icon={<Plus size={18} />}>
            Nueva reserva
          </V2Button>
        }
      />

      <div className="grid items-stretch gap-4 xl:grid-cols-[1fr_360px]">
        <div className="min-w-0 space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <V2MetricCard
              label="Reservas de hoy"
              value={totalReservations}
              helper="Total del día"
              tone="blue"
              icon={<CalendarDays size={22} />}
            />

            <V2MetricCard
              label="Pendientes"
              value={pendingReservations.length}
              helper="Por confirmar"
              tone="orange"
              icon={<Clock3 size={22} />}
            />

            <V2MetricCard
              label="Confirmadas"
              value={confirmedReservations}
              helper="Reservas activas"
              tone="green"
              icon={<CheckCircle2 size={22} />}
            />

            <V2MetricCard
              label="Canceladas"
              value={cancelledReservations}
              helper="Del día"
              tone="red"
              icon={<XCircle size={22} />}
            />
          </div>

          <V2DataTable
            rows={v2Reservations}
            getRowKey={(row) => row.id}
            columns={[
              {
                header: "Hora",
                cell: (row) => (
                  <span className="font-semibold text-slate-950">
                    {row.time}
                  </span>
                ),
              },
              {
                header: "Cliente",
                cell: (row) => row.client,
              },
              {
                header: "Personas",
                cell: (row) => row.people,
              },
              {
                header: "Teléfono",
                cell: (row) => row.phone,
              },
              {
                header: "Nota",
                cell: (row) => row.note,
              },
              {
                header: "Estado",
                cell: (row) => (
                  <V2ReservationStatusBadge status={row.status} />
                ),
              },
              {
                header: "Acciones",
                cell: (row) => (
                  <div className="flex justify-end gap-2">
                    <V2Button size="sm" variant="secondary">
                      Editar
                    </V2Button>

                    {row.status === "pending" ? (
                      <V2Button size="sm" variant="success">
                        Confirmar
                      </V2Button>
                    ) : null}

                    {row.status === "confirmed" ? (
                      <V2Button size="sm" variant="success">
                        Completar
                      </V2Button>
                    ) : null}

                    {row.status !== "cancelled" &&
                    row.status !== "completed" ? (
                      <V2Button size="sm" variant="danger">
                        Cancelar
                      </V2Button>
                    ) : null}
                  </div>
                ),
                className: "text-right",
              },
            ]}
            footer={
              <div className="flex items-center justify-between text-sm text-slate-500">
                <span>Mostrando reservas de hoy</span>
                <V2Button variant="ghost">Ver todas las reservas</V2Button>
              </div>
            }
            className="h-[calc(100vh-310px)]"
          />
        </div>

        <aside className="flex h-[calc(100vh-185px)] min-h-0 flex-col gap-4">
          <V2Card className="shrink-0">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Próxima reserva
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  La siguiente reserva confirmada.
                </p>
              </div>
            </div>

            {nextReservation ? (
              <div className="mt-5">
                <div className="flex items-center gap-4">
                  <div className="flex h-16 w-20 items-center justify-center rounded-xl bg-emerald-50 text-2xl font-bold text-emerald-700">
                    {nextReservation.time}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">
                        {nextReservation.client}
                      </p>
                      <V2ReservationStatusBadge
                        status={nextReservation.status}
                      />
                    </div>

                    <p className="mt-1 text-sm text-slate-500">
                      {nextReservation.people} personas · {nextReservation.note}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      {nextReservation.phone}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-2 gap-2">
                  <V2Button variant="secondary">Ver detalle</V2Button>
                  <V2Button variant="secondary">Cambiar</V2Button>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                No hay próximas reservas confirmadas.
              </div>
            )}
          </V2Card>

          <V2Card className="flex min-h-0 flex-1 flex-col overflow-hidden">
            <div className="shrink-0 flex items-start justify-between gap-3">
              <div>
                <h2 className="text-base font-semibold text-slate-950">
                  Pendientes por confirmar
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Reservas que necesitan revisión.
                </p>
              </div>
            </div>

            <div className="mt-5 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
              {pendingReservations.length > 0 ? (
                pendingReservations.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-white p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-slate-950">
                          {item.time} · {item.client}
                        </p>
                        <p className="mt-1 text-xs text-slate-500">
                          {item.people} personas · {item.phone}
                        </p>
                      </div>
                      <V2ReservationStatusBadge status={item.status} />
                    </div>

                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <V2Button size="sm" variant="success">
                        Confirmar
                      </V2Button>
                      <V2Button size="sm" variant="danger">
                        Cancelar
                      </V2Button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No hay reservas pendientes.
                </div>
              )}
            </div>
          </V2Card>
        </aside>
      </div>
    </V2AppShell>
  );
}
