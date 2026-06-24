"use client";

import styles from "./LocalReservasLabPage.module.css";

type Tone = "amber" | "emerald" | "rose" | "cyan" | "violet" | "slate";
type RowStatus = "confirmed" | "pending" | "cancelled" | "no_show";

type MetricCard = {
  label: string;
  value: string;
  unit: string;
  footerLeft: string;
  footerRight: string;
  tone: Tone;
  helper?: string;
};

type ReservationRow = {
  id: string;
  time: string;
  client: string;
  people: string;
  status: RowStatus;
  service: string;
  table: string;
  contactOrNote: string;
  actions: string[];
};

type ReservationGroup = {
  hour: string;
  count: number;
  rows: ReservationRow[];
};

type OccupancyState = {
  label: string;
  value: number;
  percent: string;
  tone: "green" | "amber" | "red" | "blue" | "purple" | "slate";
};

const metricCards: MetricCard[] = [
  {
    label: "Pendientes",
    value: "6",
    unit: "reservas",
    footerLeft: "Hoy",
    footerRight: "Ver todas →",
    tone: "amber",
  },
  {
    label: "Confirmadas",
    value: "24",
    unit: "reservas",
    footerLeft: "Hoy",
    footerRight: "Ver todas →",
    tone: "emerald",
  },
  {
    label: "Canceladas",
    value: "2",
    unit: "reservas",
    footerLeft: "Hoy",
    footerRight: "Ver todas →",
    tone: "rose",
  },
  {
    label: "Completadas",
    value: "18",
    unit: "reservas",
    footerLeft: "Hoy",
    footerRight: "Ver todas →",
    tone: "cyan",
  },
  {
    label: "No-show",
    value: "1",
    unit: "reserva",
    footerLeft: "Hoy",
    footerRight: "Ver todas →",
    tone: "violet",
  },
  {
    label: "Total del día",
    value: "51",
    unit: "reservas",
    footerLeft: "Hoy",
    footerRight: "Ver detalle →",
    tone: "slate",
  },
  {
    label: "Próxima reserva",
    value: "13:30",
    unit: "Juan Martín López",
    helper: "Mesa 12 · 2 personas",
    footerLeft: "Hoy",
    footerRight: "Ver detalle →",
    tone: "cyan",
  },
];

const occupancyStates: OccupancyState[] = [
  { label: "Confirmadas", value: 24, percent: "75%", tone: "green" },
  { label: "Pendientes", value: 6, percent: "19%", tone: "amber" },
  { label: "Canceladas", value: 2, percent: "6%", tone: "red" },
  { label: "Completadas", value: 18, percent: "56%", tone: "blue" },
  { label: "No-show", value: 1, percent: "3%", tone: "purple" },
  { label: "Disponibles", value: 30, percent: "22%", tone: "slate" },
];

const reservationGroups: ReservationGroup[] = [
  {
    hour: "13:00",
    count: 3,
    rows: [
      {
        id: "lab-1300-ana",
        time: "13:00",
        client: "Ana García",
        people: "2",
        status: "confirmed",
        service: "Almuerzo",
        table: "Mesa 5",
        contactOrNote: "+54 9 11 2345 6789",
        actions: ["Completar"],
      },
      {
        id: "lab-1315-federico",
        time: "13:15",
        client: "Federico Paredes",
        people: "4",
        status: "pending",
        service: "Almuerzo",
        table: "Mesa 7",
        contactOrNote: "Ventana si es posible",
        actions: ["Confirmar", "Cancelar"],
      },
      {
        id: "lab-1330-juan",
        time: "13:30",
        client: "Juan Martín López",
        people: "2",
        status: "confirmed",
        service: "Almuerzo",
        table: "Mesa 12",
        contactOrNote: "+54 9 11 3456 7890",
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
        client: "María Eugenia Ruiz",
        people: "3",
        status: "confirmed",
        service: "Almuerzo",
        table: "Mesa 3",
        contactOrNote: "Cumpleaños",
        actions: ["Completar"],
      },
      {
        id: "lab-1415-grupo",
        time: "14:15",
        client: "Grupo de amigos",
        people: "6",
        status: "confirmed",
        service: "Almuerzo",
        table: "Mesa 8",
        contactOrNote: "Mesa amplia",
        actions: ["Cambiar mesa"],
      },
      {
        id: "lab-1430-pablo",
        time: "14:30",
        client: "Pablo & Julieta",
        people: "2",
        status: "pending",
        service: "Almuerzo",
        table: "Asignar mesa",
        contactOrNote: "+54 9 11 4455 6677",
        actions: ["Asignar mesa"],
      },
      {
        id: "lab-1445-sofia",
        time: "14:45",
        client: "Sofía Beltrán",
        people: "2",
        status: "cancelled",
        service: "Almuerzo",
        table: "—",
        contactOrNote: "Cancelada por cliente",
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
        client: "Roberto Álvarez",
        people: "2",
        status: "confirmed",
        service: "Almuerzo",
        table: "Mesa 9",
        contactOrNote: "Sin notas",
        actions: ["Completar"],
      },
      {
        id: "lab-1515-valeria",
        time: "15:15",
        client: "Valeria del Mar",
        people: "4",
        status: "no_show",
        service: "Almuerzo",
        table: "Mesa 2",
        contactOrNote: "No se presentó",
        actions: ["Marcar llegada"],
      },
      {
        id: "lab-1530-diego",
        time: "15:30",
        client: "Diego & Laura",
        people: "2",
        status: "pending",
        service: "Almuerzo",
        table: "Asignar mesa",
        contactOrNote: "Sin notas",
        actions: ["Asignar mesa"],
      },
    ],
  },
];

function Icon({
  name,
  className = "",
}: {
  name:
    | "search"
    | "bell"
    | "chevronDown"
    | "chevronLeft"
    | "chevronRight"
    | "calendar"
    | "clock"
    | "plus"
    | "lock"
    | "user"
    | "more"
    | "map"
    | "swap"
    | "check"
    | "x";
  className?: string;
}) {
  const shared = `fill-none stroke-current stroke-[1.7] ${className}`;

  switch (name) {
    case "search":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <circle cx="11" cy="11" r="5.5" />
          <path d="M15.5 15.5 20 20" />
        </svg>
      );
    case "bell":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <path d="M6 9a6 6 0 1 1 12 0c0 4 1.5 5.5 2.5 7H3.5c1-1.5 2.5-3 2.5-7Z" />
          <path d="M10 19a2 2 0 0 0 4 0" />
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
    case "plus":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "lock":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <rect x="5" y="10" width="14" height="10" rx="2.5" />
          <path d="M8.5 10V8.25A3.5 3.5 0 0 1 12 4.75v0A3.5 3.5 0 0 1 15.5 8.25V10" />
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
    case "map":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <path d="m4 6 6-2 4 2 6-2v14l-6 2-4-2-6 2V6Z" />
          <path d="M10 4v14M14 6v14" />
        </svg>
      );
    case "swap":
      return (
        <svg viewBox="0 0 24 24" aria-hidden="true" className={shared}>
          <path d="m7 7-3 3 3 3" />
          <path d="M4 10h11a5 5 0 0 1 5 5v2" />
          <path d="m17 17 3-3-3-3" />
          <path d="M20 14H9a5 5 0 0 1-5-5V7" />
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

  if (normalized.includes("confirmar") || normalized.includes("completar")) {
    return "emerald";
  }

  if (normalized.includes("cancelar") || normalized.includes("eliminar")) {
    return "rose";
  }

  if (normalized.includes("cambiar")) {
    return "cyan";
  }

  if (normalized.includes("asignar")) {
    return "emerald";
  }

  if (normalized.includes("marcar")) {
    return "violet";
  }

  return "slate";
}

export function LocalReservasLabPage() {
  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <section className={styles.pageHeader}>
          <div className={styles.pageHeading}>
            <p className={styles.pageEyebrow}>RESERVAS</p>
            <h1 className={styles.pageTitle}>
              Reservas — Demuru <Icon name="calendar" className={styles.pageTitleIcon} />
            </h1>
            <p className={styles.pageSubtitle}>
              Gestioná tus reservas y la asignación de mesas en tiempo real.
            </p>
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

            <button type="button" className={styles.arrowButton} aria-label="Día anterior">
              <Icon name="chevronLeft" className={styles.arrowIcon} />
            </button>

            <button type="button" className={styles.arrowButton} aria-label="Día siguiente">
              <Icon name="chevronRight" className={styles.arrowIcon} />
            </button>
          </div>
        </section>

        <section className={styles.metricsGrid} aria-label="Métricas de reservas">
          {metricCards.map((metric) => (
            <article key={metric.label} className={styles.metricCard}>
              <div className={styles.metricHeader}>
                <span className={styles.metricIcon} data-tone={metric.tone}>
                  {metric.tone === "amber" && <Icon name="clock" className={styles.metricIconSvg} />}
                  {metric.tone === "emerald" && <Icon name="check" className={styles.metricIconSvg} />}
                  {metric.tone === "rose" && <Icon name="x" className={styles.metricIconSvg} />}
                  {metric.tone === "cyan" && <Icon name="calendar" className={styles.metricIconSvg} />}
                  {metric.tone === "violet" && <Icon name="user" className={styles.metricIconSvg} />}
                  {metric.tone === "slate" && <Icon name="clock" className={styles.metricIconSvg} />}
                </span>
                <span className={styles.metricTitle}>{metric.label}</span>
              </div>

              <div className={styles.metricValueRow}>
                <strong>{metric.value}</strong>
                <span>{metric.unit}</span>
              </div>

              {metric.helper ? <div className={styles.metricHelper}>{metric.helper}</div> : null}

              <div className={styles.metricFooter}>
                <span>{metric.footerLeft}</span>
                <a href="#" onClick={(event) => event.preventDefault()}>
                  {metric.footerRight}
                </a>
              </div>
            </article>
          ))}
        </section>

        <div className={styles.workspaceGrid}>
          <div className={styles.leftColumn}>
            <section className={styles.filtersBar} aria-label="Filtros de reservas">
              <div className={styles.filtersGrid}>
                <label className={styles.filterField}>
                  <span className={styles.srOnly}>Buscar</span>
                  <input
                    className={styles.filterInput}
                    type="text"
                    value="Buscar por nombre, teléfono o email..."
                    readOnly
                    aria-label="Buscar por nombre, teléfono o email"
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

            <article className={styles.reservationPanel}>
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

              <div className={styles.reservationTableHeader}>
                <span>Hora</span>
                <span>Cliente</span>
                <span>Personas</span>
                <span>Estado</span>
                <span>Servicio</span>
                <span>Mesa</span>
                <span>Contacto / Nota</span>
                <span>Acciones</span>
              </div>

              <div className={styles.reservationListBody}>
                {reservationGroups.map((group) => (
                  <div key={group.hour}>
                    <div className={styles.hourGroupHeader}>
                      <span className={styles.hourGroupTime}>{group.hour}</span>
                      <span className={styles.hourGroupCount}>{group.count} reservas</span>
                    </div>

                    {group.rows.map((row) => (
                      <div key={row.id} className={styles.reservationRow}>
                        <div className={styles.timeCell}>
                          <span className={styles.timeValue}>{row.time}</span>
                        </div>

                        <div className={styles.clientCell}>
                          <div className={styles.clientName}>{row.client}</div>
                          <div className={styles.clientMeta}>{row.people} personas</div>
                        </div>

                        <div className={styles.peopleCell}>{row.people}</div>

                        <div className={styles.statusCell}>
                          <span className={styles.statusBadge} data-tone={statusTone(row.status)}>
                            {statusLabel(row.status)}
                          </span>
                        </div>

                        <div className={styles.serviceCell}>{row.service}</div>

                        <div className={styles.tableCell}>{row.table}</div>

                        <div className={styles.noteCell}>{row.contactOrNote}</div>

                        <div className={styles.actionsCell}>
                          {row.actions.map((action) => (
                            <button
                              key={`${row.id}-${action}`}
                              type="button"
                              className={styles.rowAction}
                              data-tone={actionTone(action)}
                            >
                              {action}
                            </button>
                          ))}
                          <button type="button" className={styles.moreButton} aria-label="Más acciones">
                            <Icon name="more" className={styles.moreIcon} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </article>
          </div>

          <aside className={styles.rightColumn}>
            <section className={`${styles.sideCard} ${styles.occupancyCard}`}>
              <div className={styles.sideCardHeader}>
                <div className={styles.sideCardEyebrow}>RESUMEN</div>
                <h3 className={styles.sideCardTitle}>Ocupación de hoy</h3>
              </div>

              <div className={styles.occupancyBody}>
                <div className={styles.occupancyDonutBlock}>
                  <div className={styles.occupancyDonut} aria-label="78 por ciento de ocupación">
                    <span>78%</span>
                  </div>
                  <strong className={styles.occupancyMainValue}>104 / 134 cubiertos</strong>
                  <span className={styles.occupancyToday}>Hoy</span>
                </div>

                <div className={styles.occupancyStates}>
                  {occupancyStates.map((state) => (
                    <div key={state.label} className={styles.occupancyStateRow}>
                      <span className={styles.occupancyDot} data-tone={state.tone} />
                      <span className={styles.occupancyStateLabel}>{state.label}</span>
                      <span className={styles.occupancyStateValue}>{state.value}</span>
                      <span className={styles.occupancyStatePercent}>{state.percent}</span>
                    </div>
                  ))}
                </div>

                <button type="button" className={styles.occupancyCta}>
                  Ver plano de salón
                  <Icon name="chevronRight" className={styles.sideCtaIcon} />
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  );
}
