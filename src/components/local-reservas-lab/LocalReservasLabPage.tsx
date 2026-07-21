"use client";

import { useMemo, useState } from "react";

import styles from "./LocalReservasLabPage.module.css";

type Tone = "amber" | "emerald" | "rose" | "cyan" | "violet" | "slate";
type RowStatus = "confirmed" | "pending" | "cancelled" | "no_show";
type CustomerTier = "VIP" | "Frecuente" | "Nuevo";

type MetricCard = {
  label: string;
  value: string;
  unit: string;
  tone: Tone;
  helper?: string;
};

type ReservationRow = {
  id: string;
  time: string;
  client: string;
  people: number;
  status: RowStatus;
  service: string;
  table: string;
  contact: string;
  note: string;
  tier: CustomerTier;
  actions: string[];
};

type ReservationGroup = {
  hour: string;
  count: number;
  rows: ReservationRow[];
};

const metricCards: MetricCard[] = [
  { label: "Pendientes", value: "6", unit: "reservas", tone: "amber" },
  { label: "Confirmadas", value: "24", unit: "reservas", tone: "emerald" },
  { label: "Canceladas", value: "2", unit: "reservas", tone: "rose" },
  { label: "Completadas", value: "18", unit: "reservas", tone: "cyan" },
  { label: "No-show", value: "1", unit: "reserva", tone: "violet" },
];

const reservationGroups: ReservationGroup[] = [
  {
    hour: "13:00",
    count: 3,
    rows: [
      {
        id: "lab-1300-ana",
        time: "13:00",
        client: "Ana Garcia",
        people: 2,
        status: "confirmed",
        service: "Almuerzo",
        table: "Mesa 5",
        contact: "+54 9 11 2345 6789",
        note: "Sin notas",
        tier: "Frecuente",
        actions: ["Completar"],
      },
      {
        id: "lab-1315-federico",
        time: "13:15",
        client: "Federico Paredes",
        people: 4,
        status: "pending",
        service: "Almuerzo",
        table: "Mesa 7",
        contact: "+54 9 11 9988 7766",
        note: "Ventana si es posible",
        tier: "Frecuente",
        actions: ["Confirmar", "Cancelar"],
      },
      {
        id: "lab-1330-juan",
        time: "13:30",
        client: "Juan Martin Lopez",
        people: 2,
        status: "confirmed",
        service: "Almuerzo",
        table: "Mesa 12",
        contact: "+54 9 11 3456 7890",
        note: "Cumpleanos",
        tier: "VIP",
        actions: ["Cambiar mesa"],
      },
    ],
  },
  {
    hour: "14:00",
    count: 4,
    rows: [
      {
        id: "lab-1400-maria",
        time: "14:00",
        client: "Maria Eugenia Ruiz",
        people: 3,
        status: "confirmed",
        service: "Almuerzo",
        table: "Mesa 3",
        contact: "+54 9 11 2233 4455",
        note: "Cumpleanos",
        tier: "Frecuente",
        actions: ["Completar"],
      },
      {
        id: "lab-1415-grupo",
        time: "14:15",
        client: "Grupo de amigos",
        people: 6,
        status: "confirmed",
        service: "Almuerzo",
        table: "Mesa 8",
        contact: "+54 9 11 5566 7788",
        note: "Mesa amplia",
        tier: "Nuevo",
        actions: ["Cambiar mesa"],
      },
      {
        id: "lab-1430-pablo",
        time: "14:30",
        client: "Pablo y Julieta",
        people: 2,
        status: "pending",
        service: "Almuerzo",
        table: "Asignar mesa",
        contact: "+54 9 11 4455 6677",
        note: "Sin notas",
        tier: "Nuevo",
        actions: ["Asignar mesa"],
      },
      {
        id: "lab-1445-sofia",
        time: "14:45",
        client: "Sofia Beltran",
        people: 2,
        status: "cancelled",
        service: "Almuerzo",
        table: "-",
        contact: "+54 9 11 6677 8899",
        note: "Cancelada por cliente",
        tier: "Nuevo",
        actions: ["..."],
      },
    ],
  },
  {
    hour: "15:00",
    count: 3,
    rows: [
      {
        id: "lab-1500-roberto",
        time: "15:00",
        client: "Roberto Alvarez",
        people: 2,
        status: "confirmed",
        service: "Almuerzo",
        table: "Mesa 9",
        contact: "+54 9 11 6677 8899",
        note: "Sin notas",
        tier: "Frecuente",
        actions: ["Completar"],
      },
      {
        id: "lab-1515-valeria",
        time: "15:15",
        client: "Valeria del Mar",
        people: 4,
        status: "no_show",
        service: "Almuerzo",
        table: "Mesa 2",
        contact: "+54 9 11 5678 9012",
        note: "No se presento",
        tier: "VIP",
        actions: ["Marcar llegada"],
      },
      {
        id: "lab-1530-diego",
        time: "15:30",
        client: "Diego y Laura",
        people: 2,
        status: "pending",
        service: "Almuerzo",
        table: "Asignar mesa",
        contact: "+54 9 11 2244 6688",
        note: "Sin notas",
        tier: "Nuevo",
        actions: ["Asignar mesa"],
      },
    ],
  },
];

const daySummary = [
  { label: "Reservas", value: "51", helper: "hoy" },
  { label: "Cubiertos", value: "104", helper: "confirmados" },
  { label: "Ocupacion", value: "78%", helper: "salon" },
  { label: "Sin mesa", value: "2", helper: "pendientes" },
];

const nextReservationSummary = {
  time: "13:30",
  client: "Juan Martin Lopez",
  helper: "Mesa 12 - 2 personas",
  status: "Confirmada",
};

function Icon({
  name,
  className = "",
}: {
  name:
    | "calendar"
    | "clock"
    | "check"
    | "x"
    | "user"
    | "more"
    | "chevronDown"
    | "chevronLeft"
    | "chevronRight";
  className?: string;
}) {
  const shared = `fill-none stroke-current stroke-[1.7] ${className}`;

  switch (name) {
    case "calendar":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <rect x="4" y="5" width="16" height="15" rx="3" />
          <path d="M8 3v4M16 3v4M4 9h16" />
        </svg>
      );
    case "clock":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case "check":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <path d="m5 12 4 4 10-10" />
        </svg>
      );
    case "x":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <path d="m6 6 12 12M18 6 6 18" />
        </svg>
      );
    case "user":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <circle cx="12" cy="8.5" r="3.5" />
          <path d="M5 19a7 7 0 0 1 14 0" />
        </svg>
      );
    case "more":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <circle cx="6" cy="12" r="1" />
          <circle cx="12" cy="12" r="1" />
          <circle cx="18" cy="12" r="1" />
        </svg>
      );
    case "chevronDown":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "chevronLeft":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <path d="m14 6-6 6 6 6" />
        </svg>
      );
    case "chevronRight":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <path d="m10 6 6 6-6 6" />
        </svg>
      );
    default:
      return null;
  }
}

function statusTone(status: RowStatus): Tone {
  switch (status) {
    case "confirmed":
      return "emerald";
    case "pending":
      return "amber";
    case "cancelled":
      return "rose";
    case "no_show":
      return "violet";
    default:
      return "slate";
  }
}

function statusLabel(status: RowStatus) {
  switch (status) {
    case "confirmed":
      return "Confirmada";
    case "pending":
      return "Pendiente";
    case "cancelled":
      return "Cancelada";
    case "no_show":
      return "No-show";
    default:
      return "";
  }
}

function actionTone(label: string): Tone {
  const normalized = label.toLowerCase();

  if (normalized.includes("confirmar") || normalized.includes("asignar")) {
    return "emerald";
  }

  if (normalized.includes("completar") || normalized.includes("cambiar")) {
    return "cyan";
  }

  if (normalized.includes("cancelar")) {
    return "rose";
  }

  if (normalized.includes("no-show") || normalized.includes("marcar")) {
    return "violet";
  }

  return "slate";
}

function toneClass(tone: Tone) {
  switch (tone) {
    case "emerald":
      return styles.toneEmerald;
    case "amber":
      return styles.toneAmber;
    case "rose":
      return styles.toneRose;
    case "violet":
      return styles.toneViolet;
    default:
      return styles.toneCyan;
  }
}

export function LocalReservasLabPage() {
  const [selectedReservationId, setSelectedReservationId] = useState("lab-1300-ana");

  const selectedReservation = useMemo(
    () =>
      reservationGroups.flatMap((group) => group.rows).find((row) => row.id === selectedReservationId) ??
      reservationGroups[0].rows[0],
    [selectedReservationId]
  );

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <section className={styles.pageHeader}>
          <div className={styles.pageHeading}>
            <h1 className={styles.pageTitle}>
              Reservas - Demuru <Icon name="calendar" className={styles.pageTitleIcon} />
            </h1>
            <p className={styles.pageSubtitle}>Gestiona tus reservas y la asignacion de mesas en tiempo real.</p>
          </div>

          <div className={styles.dateControls} aria-label="Controles de fecha">
            <button type="button" className={styles.dateSelect}>
              <Icon name="calendar" className={styles.dateIcon} />
              <span>Jueves, 22 de mayo de 2026</span>
              <Icon name="chevronDown" className={styles.dateChevron} />
            </button>

            <button type="button" className={styles.todayButton}>
              Hoy
            </button>

            <button type="button" className={styles.arrowButton} aria-label="Dia anterior">
              <Icon name="chevronLeft" className={styles.arrowIcon} />
            </button>

            <button type="button" className={styles.arrowButton} aria-label="Dia siguiente">
              <Icon name="chevronRight" className={styles.arrowIcon} />
            </button>
          </div>
        </section>

        <section className={styles.topMetricsRow} aria-label="Metricas de reservas">
          <div className={styles.metricGrid}>
            {metricCards.map((metric) => (
              <article
                key={metric.label}
                className={`${styles.metricCard} ${styles[`metricCard${metric.tone}`]}`}
              >
                <span className={`${styles.metricIcon} ${toneClass(metric.tone)}`}>
                  {metric.tone === "amber" && <Icon name="clock" className={styles.metricIconSvg} />}
                  {metric.tone === "emerald" && <Icon name="check" className={styles.metricIconSvg} />}
                  {metric.tone === "rose" && <Icon name="x" className={styles.metricIconSvg} />}
                  {metric.tone === "cyan" && <Icon name="calendar" className={styles.metricIconSvg} />}
                  {metric.tone === "violet" && <Icon name="user" className={styles.metricIconSvg} />}
                  {metric.tone === "slate" && <Icon name="clock" className={styles.metricIconSvg} />}
                </span>
                <p className={styles.metricLabel}>{metric.label}</p>
                <div className={styles.metricValue}>
                  <strong>{metric.value}</strong>
                  <span>{metric.unit}</span>
                </div>

                {metric.helper ? <div className={styles.metricSubtitle}>{metric.helper}</div> : null}
              </article>
            ))}
          </div>

          <article className={`${styles.card} ${styles.metricSummaryCard}`}>
            <div className={styles.metricSummaryHeader}>Resumen del dia</div>
            <div className={styles.metricSummaryValue}>
              <strong>{daySummary[0]?.value}</strong>
              <span>reservas</span>
            </div>
            <p className={styles.metricSummaryMeta}>
              {daySummary[1]?.value} cubiertos · {daySummary[2]?.value} ocupacion
            </p>
            <p className={styles.metricSummaryExtra}>{daySummary[3]?.value} sin mesa</p>
          </article>
        </section>

        <div className={styles.crmMainGrid}>
          <div className={styles.leftColumn}>
            <section className={styles.filtersBar} aria-label="Filtros de reservas">
              <div className={styles.filtersGrid}>
                <label className={styles.filterField}>
                  <span className={styles.srOnly}>Buscar</span>
                  <input
                    className={styles.filterInput}
                    type="text"
                    value="Buscar por nombre, telefono o email..."
                    readOnly
                    aria-label="Buscar por nombre, telefono o email"
                  />
                </label>

                <button type="button" className={styles.filterSelect}>
                  <span>Todos</span>
                  <Icon name="chevronDown" className={styles.selectChevron} />
                </button>

                <button type="button" className={styles.filterSelect}>
                  <span>22/05/2026</span>
                  <Icon name="chevronDown" className={styles.selectChevron} />
                </button>

                <button type="button" className={styles.filterButton}>
                  + Fecha personalizada
                </button>

                <button type="button" className={styles.filterButtonSecondary}>
                  Limpiar filtros
                </button>
              </div>
            </section>

            <article className={`${styles.card} ${styles.reservationTableCard}`}>
              <div className={styles.reservationPanelHeader}>
                <div className={styles.reservationPanelTitleWrap}>
                  <div className={styles.reservationPanelDate}>Jueves, 22 de mayo de 2026</div>
                  <div className={styles.reservationPanelCount}>31 reservas</div>
                </div>

                <div className={styles.reservationPanelActions}>
                  <span className={styles.groupByLabel}>Agrupar por:</span>
                  <button type="button" className={styles.groupByButton}>
                    Horario
                    <Icon name="chevronDown" className={styles.selectChevron} />
                  </button>
                </div>
              </div>

              <div className={styles.tableHeader}>
                <span>Hora</span>
                <span>Cliente</span>
                <span>Estado</span>
                <span>Mesa</span>
                <span>Contacto / Nota</span>
                <span>Acciones</span>
              </div>

              <div className={styles.reservationRows}>
                {reservationGroups.map((group) => (
                  <div key={group.hour} className={styles.groupBlock}>
                    <div className={styles.hourGroupHeader}>
                      <span className={styles.hourGroupTime}>{group.hour}</span>
                      <span className={styles.hourGroupCount}>{group.count} reservas</span>
                    </div>

                    {group.rows.map((row) => {
                      const isSelected = row.id === selectedReservation.id;

                      return (
                        <div
                          key={row.id}
                          className={styles.reservationRow}
                          data-selected={isSelected ? "true" : "false"}
                          role="button"
                          tabIndex={0}
                          onClick={() => setSelectedReservationId(row.id)}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              setSelectedReservationId(row.id);
                            }
                          }}
                        >
                          <div className={styles.timeCell}>
                            <span className={styles.timeValue}>{row.time}</span>
                          </div>

                          <div className={styles.clientCell}>
                            <div className={styles.clientName}>{row.client}</div>
                            <div className={styles.clientMeta}>
                              {row.people} personas - {row.service} - {row.tier}
                            </div>
                          </div>

                          <div className={styles.statusCell}>
                            <span className={styles.statusBadge} data-tone={statusTone(row.status)}>
                              {statusLabel(row.status)}
                            </span>
                          </div>

                          <div className={styles.tableCell}>{row.table}</div>

                          <div className={styles.noteCell}>
                            <span className={styles.notePrimary}>{row.contact}</span>
                            <span className={styles.noteSecondary}>{row.note}</span>
                          </div>

                          <div className={styles.actionsCell}>
                            {row.actions.map((action) => (
                              <button
                                key={`${row.id}-${action}`}
                                type="button"
                                className={styles.rowAction}
                                data-tone={actionTone(action)}
                                onClick={(event) => {
                                  event.preventDefault();
                                  event.stopPropagation();
                                }}
                              >
                                {action}
                              </button>
                            ))}

                            <button
                              type="button"
                              className={styles.moreButton}
                              aria-label="Mas acciones"
                              onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                              }}
                            >
                              <Icon name="more" className={styles.moreIcon} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </article>
          </div>

          <aside className={styles.rightColumn}>
            <section className={`${styles.card} ${styles.profilePanel}`}>
              <div className={styles.sideCardHeader}>
                <div className={styles.sideCardEyebrow}>Detalle</div>
                <h3 className={styles.sideCardTitle}>Reserva seleccionada</h3>
              </div>

              <div className={styles.selectedReservationBody}>
                <div className={styles.selectedReservationTop}>
                  <div className={styles.selectedReservationIdentity}>
                    <div className={styles.selectedReservationAvatar}>
                      {selectedReservation.client
                        .split(" ")
                        .slice(0, 2)
                        .map((word) => word[0])
                        .join("")
                        .toUpperCase()}
                    </div>

                    <div className={styles.selectedReservationText}>
                      <div className={styles.selectedReservationNameRow}>
                        <h4>{selectedReservation.client}</h4>
                        <span className={styles.statusBadge} data-tone={statusTone(selectedReservation.status)}>
                          {statusLabel(selectedReservation.status)}
                        </span>
                      </div>
                      <p className={styles.selectedReservationMeta}>
                        {selectedReservation.time} - {selectedReservation.service}
                      </p>
                      <p className={styles.selectedReservationMeta}>
                        {selectedReservation.people} personas - {selectedReservation.table}
                      </p>
                    </div>
                  </div>

                  <div className={styles.selectedActions}>
                    <button type="button" className={`${styles.selectedAction} ${styles.selectedActionConfirm}`}>
                      Confirmar
                    </button>
                    <button type="button" className={`${styles.selectedAction} ${styles.selectedActionComplete}`}>
                      Completar
                    </button>
                    <button type="button" className={`${styles.selectedAction} ${styles.selectedActionTable}`}>
                      Cambiar mesa
                    </button>
                    <button type="button" className={`${styles.selectedAction} ${styles.selectedActionCancel}`}>
                      Cancelar
                    </button>
                    <button type="button" className={`${styles.selectedAction} ${styles.selectedActionNoShow}`}>
                      No-show
                    </button>
                  </div>
                </div>

                <div className={styles.selectedInfoGrid}>
                  <div className={styles.selectedInfoCard}>
                    <span>Contacto</span>
                    <strong>{selectedReservation.contact}</strong>
                  </div>
                  <div className={styles.selectedInfoCard}>
                    <span>Notas</span>
                    <strong>{selectedReservation.note}</strong>
                  </div>
                  <div className={styles.selectedInfoCard}>
                    <span>Cliente</span>
                    <strong>{selectedReservation.tier}</strong>
                  </div>
                </div>
              </div>
            </section>

            <section className={`${styles.card} ${styles.summaryCard}`}>
              <div className={styles.sideCardHeader}>
                <div className={styles.sideCardEyebrow}>Siguiente</div>
                <h3 className={styles.sideCardTitle}>Proxima reserva</h3>
              </div>

              <div className={styles.nextReservationPanel}>
                <strong className={styles.nextReservationTime}>{nextReservationSummary.time}</strong>
                <p className={styles.nextReservationClient}>{nextReservationSummary.client}</p>
                <p className={styles.nextReservationHelper}>{nextReservationSummary.helper}</p>
                <span className={styles.nextReservationStatus}>{nextReservationSummary.status}</span>
                <button type="button" className={styles.nextReservationButton}>
                  Ver detalle
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
