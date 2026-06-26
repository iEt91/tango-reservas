"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import styles from "./LocalCalendarioLabPage.module.css";

type IconName =
  | "calendar"
  | "chevronDown"
  | "chevronLeft"
  | "chevronRight"
  | "filter"
  | "sparkles"
  | "reservas"
  | "plan"
  | "crm"
  | "settings"
  | "menu"
  | "web"
  | "reportes"
  | "check"
  | "clock"
  | "x"
  | "users"
  | "star"
  | "pin"
  | "arrowRight";

type MetricTone = "blue" | "green" | "amber" | "red" | "purple";
type CalendarTone = "blue" | "green" | "amber" | "gray" | "cyan";
type AgendaTone = "confirmed" | "pending" | "special" | "risk";

type MetricCard = {
  title: string;
  value: string;
  eyebrow?: string;
  subtitle: string;
  link?: string;
  icon: IconName;
  tone: MetricTone;
  rightNode?: ReactNode;
};

type CalendarDay = {
  date: string;
  dayNumber: number;
  isCurrentMonth: boolean;
  isSelected?: boolean;
  reservations: number;
  seats: number;
  dots: CalendarTone[];
};

type UpcomingReservation = {
  time: string;
  table: string;
  people: string;
  name: string;
  tone: AgendaTone;
};

type AgendaReservation = {
  id: string;
  time: string;
  client: string;
  pax: number;
  table: string;
  status: AgendaTone;
  note?: string;
};

const metrics: MetricCard[] = [
  {
    title: "Total reservas hoy",
    value: "24",
    eyebrow: "Mayo 2026",
    subtitle: "cubiertos 72",
    icon: "calendar",
    tone: "blue",
  },
  {
    title: "Ocupación esperada",
    value: "78%",
    eyebrow: "Hoy",
    subtitle: "104 / 134 cubiertos",
    icon: "clock",
    tone: "green",
    rightNode: <div className={styles.miniDonut} aria-hidden="true" />,
  },
  {
    title: "Pendientes confirmar",
    value: "6",
    subtitle: "reservas",
    eyebrow: "Hoy",
    link: "Ver reservas →",
    icon: "filter",
    tone: "amber",
  },
  {
    title: "Riesgo no-show",
    value: "3",
    subtitle: "reservas",
    eyebrow: "Hoy",
    link: "Ver reservas →",
    icon: "x",
    tone: "red",
  },
  {
    title: "Mesas disponibles",
    value: "8",
    subtitle: "ahora",
    eyebrow: "Hoy",
    link: "Ver plano →",
    icon: "plan",
    tone: "purple",
  },
];

const upcomingReservations: UpcomingReservation[] = [
  { time: "13:00", table: "Mesa 5", people: "2 pers.", name: "Ana García", tone: "confirmed" },
  {
    time: "13:30",
    table: "Mesa 8",
    people: "4 pers.",
    name: "Juan Martín López",
    tone: "confirmed",
  },
  {
    time: "14:00",
    table: "Mesa 12",
    people: "2 pers.",
    name: "Valeria del Mar",
    tone: "pending",
  },
  { time: "15:00", table: "Mesa 7", people: "2 pers.", name: "Carlos Rojas", tone: "confirmed" },
  {
    time: "18:30",
    table: "Mesa 3",
    people: "6 pers.",
    name: "Grupo de amigos",
    tone: "pending",
  },
  {
    time: "20:00",
    table: "Mesa 9",
    people: "4 pers.",
    name: "Roberto Álvarez",
    tone: "special",
  },
  { time: "21:00", table: "Mesa 2", people: "2 pers.", name: "Diego & Laura", tone: "confirmed" },
];

const agendaHours = [
  "08:00",
  "09:00",
  "10:00",
  "11:00",
  "12:00",
  "13:00",
  "14:00",
  "15:00",
  "16:00",
  "17:00",
  "18:00",
  "19:00",
  "20:00",
  "21:00",
  "22:00",
  "23:00",
  "24:00",
] as const;

const agendaReservations: AgendaReservation[] = [
  {
    id: "r-1300-1",
    time: "13:00",
    client: "Ana García",
    pax: 2,
    table: "Mesa 5",
    status: "confirmed",
    note: "Almuerzo",
  },
  {
    id: "r-1315-1",
    time: "13:15",
    client: "Juan Martín López",
    pax: 4,
    table: "Mesa 8",
    status: "confirmed",
    note: "Ventana",
  },
  {
    id: "r-1330-1",
    time: "13:30",
    client: "Federico Paredes",
    pax: 4,
    table: "Mesa 7",
    status: "pending",
    note: "Confirmar ubicación",
  },
  {
    id: "r-1430-1",
    time: "14:30",
    client: "Valeria del Mar",
    pax: 2,
    table: "Mesa 12",
    status: "pending",
    note: "Cumpleaños",
  },
  {
    id: "r-1600-1",
    time: "16:00",
    client: "Carlos Rojas",
    pax: 2,
    table: "Mesa 7",
    status: "confirmed",
    note: "Sin notas",
  },
  {
    id: "r-1615-1",
    time: "16:15",
    client: "María Eugenia Ruiz",
    pax: 3,
    table: "Mesa 3",
    status: "special",
    note: "Cumpleaños",
  },
  {
    id: "r-1645-1",
    time: "16:45",
    client: "Grupo de amigos",
    pax: 6,
    table: "Mesa 1",
    status: "pending",
    note: "Mesa amplia",
  },
  {
    id: "r-1830-1",
    time: "18:30",
    client: "Roberto Álvarez",
    pax: 4,
    table: "Mesa 9",
    status: "risk",
    note: "Riesgo no-show",
  },
  {
    id: "r-1900-1",
    time: "19:00",
    client: "Diego & Laura",
    pax: 2,
    table: "Mesa 2",
    status: "confirmed",
    note: "Cena",
  },
  {
    id: "r-2115-1",
    time: "21:15",
    client: "Sofía Beltrán",
    pax: 2,
    table: "Mesa 6",
    status: "confirmed",
    note: "Terraza",
  },
  {
    id: "r-2130-1",
    time: "21:30",
    client: "Pablo & Julieta",
    pax: 2,
    table: "Mesa 10",
    status: "special",
    note: "Aniversario",
  },
];

function getHourSlot(time: string) {
  const [rawHour] = time.split(":");
  const hour = Number(rawHour);

  if (Number.isNaN(hour)) {
    return "00:00";
  }

  return `${String(hour).padStart(2, "0")}:00`;
}

const reservationsBySlot = agendaHours.reduce<Record<string, AgendaReservation[]>>((acc, hour) => {
  acc[hour] = agendaReservations.filter((reservation) => getHourSlot(reservation.time) === hour);
  return acc;
}, {});

function createCalendarDays() {
  const start = new Date(2026, 3, 27, 12, 0, 0, 0);
  const days: CalendarDay[] = [];
  const statsByDay = new Map<number, { reservations: number; seats: number; dots: CalendarTone[] }>([
    [27, { reservations: 2, seats: 6, dots: ["blue", "green"] }],
    [28, { reservations: 4, seats: 12, dots: ["blue", "amber"] }],
    [29, { reservations: 3, seats: 9, dots: ["blue", "amber"] }],
    [30, { reservations: 5, seats: 16, dots: ["blue", "amber"] }],
    [1, { reservations: 6, seats: 20, dots: ["blue", "green"] }],
    [2, { reservations: 8, seats: 28, dots: ["blue", "amber"] }],
    [3, { reservations: 5, seats: 15, dots: ["blue", "amber"] }],
    [4, { reservations: 3, seats: 9, dots: ["blue", "amber"] }],
    [5, { reservations: 4, seats: 12, dots: ["blue", "amber"] }],
    [6, { reservations: 5, seats: 18, dots: ["blue", "amber"] }],
    [7, { reservations: 6, seats: 21, dots: ["blue", "amber"] }],
    [8, { reservations: 7, seats: 26, dots: ["blue", "green"] }],
    [9, { reservations: 10, seats: 34, dots: ["blue", "amber"] }],
    [10, { reservations: 6, seats: 20, dots: ["blue", "amber"] }],
    [11, { reservations: 4, seats: 14, dots: ["blue", "amber"] }],
    [12, { reservations: 5, seats: 16, dots: ["blue", "amber"] }],
    [13, { reservations: 6, seats: 22, dots: ["blue", "green"] }],
    [14, { reservations: 5, seats: 18, dots: ["blue", "amber"] }],
    [15, { reservations: 8, seats: 28, dots: ["blue", "amber"] }],
    [16, { reservations: 12, seats: 42, dots: ["blue", "green"] }],
    [17, { reservations: 7, seats: 24, dots: ["blue", "amber"] }],
    [18, { reservations: 3, seats: 10, dots: ["blue", "amber"] }],
    [19, { reservations: 4, seats: 15, dots: ["blue", "amber"] }],
    [20, { reservations: 6, seats: 20, dots: ["blue", "amber"] }],
    [21, { reservations: 5, seats: 18, dots: ["blue", "amber"] }],
    [22, { reservations: 24, seats: 72, dots: ["green", "amber"] }],
    [23, { reservations: 11, seats: 38, dots: ["blue", "amber"] }],
    [24, { reservations: 6, seats: 21, dots: ["blue", "amber"] }],
    [25, { reservations: 3, seats: 9, dots: ["blue", "amber"] }],
    [26, { reservations: 4, seats: 13, dots: ["blue", "amber"] }],
    [27, { reservations: 5, seats: 16, dots: ["blue", "amber"] }],
    [28, { reservations: 6, seats: 22, dots: ["blue", "amber"] }],
    [29, { reservations: 7, seats: 25, dots: ["blue", "amber"] }],
    [30, { reservations: 8, seats: 30, dots: ["blue", "amber"] }],
    [31, { reservations: 5, seats: 18, dots: ["blue", "amber"] }],
  ]);

  for (let index = 0; index < 35; index += 1) {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const dayNumber = date.getDate();
    const isCurrentMonth = date.getMonth() === 4;
    const selected = date.getFullYear() === 2026 && date.getMonth() === 4 && date.getDate() === 22;
    const stats =
      statsByDay.get(dayNumber) ?? {
        reservations: Math.max(2, Math.min(9, (dayNumber % 7) + 2)),
        seats: Math.max(6, Math.min(30, ((dayNumber * 3) % 24) + 6)),
        dots: dayNumber % 3 === 0 ? ["blue", "amber"] : ["blue", "green"],
      };

    days.push({
      date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(
        date.getDate(),
      ).padStart(2, "0")}`,
      dayNumber,
      isCurrentMonth,
      isSelected: selected,
      reservations: stats.reservations,
      seats: stats.seats,
      dots: stats.dots,
    });
  }

  return days;
}

const calendarDays = createCalendarDays();

function LabIcon({
  name,
  className = "",
}: {
  name: IconName;
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
    case "calendar":
      return (
        <svg className={className} {...common}>
          <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
          <path d="M3.5 9.2h17" />
          <path d="M8 3.5v3" />
          <path d="M16 3.5v3" />
        </svg>
      );
    case "chevronDown":
      return (
        <svg className={className} {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "chevronLeft":
      return (
        <svg className={className} {...common}>
          <path d="m14 6-6 6 6 6" />
        </svg>
      );
    case "chevronRight":
      return (
        <svg className={className} {...common}>
          <path d="m10 6 6 6-6 6" />
        </svg>
      );
    case "filter":
      return (
        <svg className={className} {...common}>
          <path d="M4 6h16l-6 7v4l-4 2v-6L4 6Z" />
        </svg>
      );
    case "sparkles":
      return (
        <svg className={className} {...common}>
          <path d="M12 3.5 13.7 8l4.5 1.7-4.5 1.8L12 16l-1.7-4.5L5.8 9.7 10.3 8 12 3.5Z" />
          <path d="M18 13.5 18.8 16l2.5.8-2.5.9-.8 2.5-.9-2.5-2.5-.9 2.5-.8.9-2.5Z" />
        </svg>
      );
    case "reservas":
      return (
        <svg className={className} {...common}>
          <rect x="4" y="4.8" width="16" height="14.7" rx="3" />
          <path d="M4 9.5h16" />
          <path d="M8 3.2v3.3" />
          <path d="M16 3.2v3.3" />
        </svg>
      );
    case "plan":
      return (
        <svg className={className} {...common}>
          <path d="M4.5 5.5 9 4l6 1.5 4.5-1.5v14l-4.5 1.5L9 18.5 4.5 20V5.5Z" />
          <path d="M9 4v14" />
          <path d="M15 5.5v14" />
        </svg>
      );
    case "crm":
      return (
        <svg className={className} {...common}>
          <circle cx="12" cy="8" r="3" />
          <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
          <path d="M16.5 12.5a4.2 4.2 0 0 1 2.7 3.9V19" />
        </svg>
      );
    case "settings":
      return (
        <svg className={className} {...common}>
          <circle cx="12" cy="12" r="3.1" />
          <path d="M19 12a7 7 0 0 0-.08-1.03l2.08-1.62-1.96-3.4-2.48.98a7.2 7.2 0 0 0-1.78-1.03l-.38-2.63h-3.92l-.38 2.63a7.2 7.2 0 0 0-1.78 1.03l-2.48-.98-1.96 3.4L5.08 10.97A7 7 0 0 0 5 12c0 .35.03.69.08 1.03L3 14.65l1.96 3.4 2.48-.98c.55.4 1.14.74 1.78 1.03l.38 2.63h3.92l.38-2.63c.64-.29 1.23-.63 1.78-1.03l2.48.98 1.96-3.4-2.08-1.62c.05-.34.08-.68.08-1.03Z" />
        </svg>
      );
    case "menu":
      return (
        <svg className={className} {...common}>
          <path d="M4 7.5h16" />
          <path d="M4 12h16" />
          <path d="M4 16.5h16" />
        </svg>
      );
    case "web":
      return (
        <svg className={className} {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12h17" />
          <path d="M12 3.5c2.5 2.5 3.8 5.3 3.8 8.5S14.5 17 12 20.5C9.5 18 8.2 15.2 8.2 12S9.5 6 12 3.5Z" />
        </svg>
      );
    case "reportes":
      return (
        <svg className={className} {...common}>
          <path d="M4.5 19.5h15" />
          <path d="M7 16V9" />
          <path d="M12 16V5.5" />
          <path d="M17 16V11" />
        </svg>
      );
    case "users":
      return (
        <svg className={className} {...common}>
          <path d="M16.5 18.5v-1.2a4.2 4.2 0 0 0-4.2-4.2H8.7a4.2 4.2 0 0 0-4.2 4.2v1.2" />
          <circle cx="12" cy="8" r="3.1" />
          <path d="M19 19v-1a3.6 3.6 0 0 0-2.4-3.4" />
          <path d="M15.8 5.8a3.1 3.1 0 0 1 0 4.4" />
        </svg>
      );
    case "check":
      return (
        <svg className={className} {...common}>
          <path d="m5.5 12 4 4 9-9" />
        </svg>
      );
    case "clock":
      return (
        <svg className={className} {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 8.5V12l2.6 1.8" />
        </svg>
      );
    case "x":
      return (
        <svg className={className} {...common}>
          <path d="m6.5 6.5 11 11" />
          <path d="m17.5 6.5-11 11" />
        </svg>
      );
    case "star":
      return (
        <svg className={className} {...common}>
          <path d="M12 4.5 13.8 9l4.8.7-3.5 3.4.8 4.8L12 15.6 8.1 17.9l.8-4.8-3.5-3.4 4.8-.7L12 4.5Z" />
        </svg>
      );
    case "pin":
      return (
        <svg className={className} {...common}>
          <path d="M12 20s5-4.5 5-9A5 5 0 1 0 7 11c0 4.5 5 9 5 9Z" />
          <circle cx="12" cy="11" r="1.8" />
        </svg>
      );
    case "arrowRight":
      return (
        <svg className={className} {...common}>
          <path d="M5 12h14" />
          <path d="m13 6 6 6-6 6" />
        </svg>
      );
    default:
      return null;
  }
}

function formatDayLabel(date: string) {
  const parsed = new Date(`${date}T12:00:00`);
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
    .format(parsed)
    .replace(/^./, (char) => char.toUpperCase());
}

export function LocalCalendarioLabPage() {
  const [expandedSlots, setExpandedSlots] = useState<string[]>(["13:00"]);
  const selectedDate = "2026-05-22";
  const selectedDateLabel = formatDayLabel(selectedDate);
  const statusLabelMap: Record<AgendaTone, string> = {
    confirmed: "Confirmada",
    pending: "Pendiente",
    special: "Especial",
    risk: "Riesgo",
  };
  const statusClassMap: Record<AgendaTone, string> = {
    confirmed: styles.status_confirmada,
    pending: styles.status_pendiente,
    special: styles.status_especial,
    risk: styles.status_riesgo,
  };

  const toggleSlot = (hour: string) => {
    const hourReservations = reservationsBySlot[hour] ?? [];
    if (hourReservations.length <= 1) {
      return;
    }

    setExpandedSlots((current) =>
      current.includes(hour) ? current.filter((slot) => slot !== hour) : [...current, hour],
    );
  };

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <header className={styles.pageHeader}>
          <div className={styles.pageHeading}>
            <div className={styles.pageEyebrow}>¡Bienvenido, Mariano!</div>
            <h1 className={styles.pageTitle}>
              Operación diaria del negocio <LabIcon name="sparkles" className={styles.pageSpark} />
            </h1>
            <p className={styles.pageSubtitle}>
              Gestioná tu calendario, reservas y la operación del restaurante.
            </p>
          </div>

          <div className={styles.headerControls}>
            <button type="button" className={styles.dateButton}>
              <LabIcon name="calendar" className={styles.controlIcon} />
              <span>Jueves, 22 de mayo de 2026</span>
              <LabIcon name="chevronDown" className={styles.controlChevron} />
            </button>
            <button type="button" className={styles.filtersButton}>
              <LabIcon name="filter" className={styles.controlIcon} />
              <span>Filtros</span>
              <LabIcon name="chevronDown" className={styles.controlChevron} />
            </button>
          </div>
        </header>

        <section className={styles.metricsGrid} aria-label="Métricas de calendario">
          {metrics.map((metric) => (
            <article key={metric.title} className={styles.metricCard}>
              <span className={`${styles.metricIcon} ${styles[`metricTone${metric.tone}`]}`}>
                <LabIcon name={metric.icon} className={styles.metricIconSvg} />
              </span>

              <div className={styles.metricHeader}>
                <span className={styles.metricTitle}>{metric.title}</span>
              </div>

              <div className={styles.metricValueWrap}>
                <div className={styles.metricValue}>{metric.value}</div>
                {metric.rightNode ? <div className={styles.metricRightNode}>{metric.rightNode}</div> : null}
              </div>

              <div className={styles.metricFooter}>
                <span className={styles.metricFooterLeft}>{metric.subtitle}</span>
                <span className={styles.metricFooterCenter}>{metric.eyebrow ? "Hoy" : ""}</span>
                {metric.link ? (
                  <button type="button" className={styles.metricFooterLink}>
                    {metric.link}
                  </button>
                ) : (
                  <span />
                )}
              </div>
            </article>
          ))}
        </section>

        <section className={styles.mainGrid}>
          <section className={styles.monthPanel}>
            <div className={styles.monthHeader}>
              <div className={styles.monthTitleRow}>
                <h2 className={styles.monthTitle}>Mayo 2026</h2>
                <div className={styles.monthNav}>
                  <button type="button" className={styles.navButton}>
                    <LabIcon name="chevronLeft" className={styles.navIcon} />
                  </button>
                  <button type="button" className={styles.navButton}>
                    <LabIcon name="chevronRight" className={styles.navIcon} />
                  </button>
                  <button type="button" className={styles.todayPill}>
                    Hoy
                  </button>
                </div>
              </div>

              <div className={styles.monthActions}>
                <div className={styles.viewSwitch}>
                  <button type="button" className={styles.viewSwitchActive}>
                    Mes
                  </button>
                  <button type="button">Semana</button>
                  <button type="button">Día</button>
                </div>
                <button type="button" className={styles.monthFilterButton}>
                  <LabIcon name="filter" className={styles.controlIcon} />
                  <span>Filtros</span>
                </button>
              </div>
            </div>

            <div className={styles.weekdaysRow}>
              {["LUN", "MAR", "MIÉ", "JUE", "VIE", "SÁB", "DOM"].map((day) => (
                <div key={day} className={styles.weekdayCell}>
                  {day}
                </div>
              ))}
            </div>

            <div className={styles.monthGrid}>
              {calendarDays.map((day) => (
                <article
                  key={day.date}
                  className={`${styles.dayCell} ${!day.isCurrentMonth ? styles.dayMuted : ""} ${
                    day.isSelected ? styles.daySelected : ""
                  }`}
                >
                  <div className={styles.dayTopRow}>
                    <div className={styles.dayNumber}>{day.dayNumber}</div>
                  </div>

                  <div className={styles.dayStats}>
                    <div className={styles.dayStatRow}>
                      <span className={styles.dayStatDot} data-tone={day.dots[0] ? "blue" : "gray"} />
                      <span>{day.reservations} reservas</span>
                    </div>
                    <div className={styles.dayStatRow}>
                      <span className={styles.dayStatDot} data-tone={day.dots[1] ? "gray" : "blue"} />
                      <span>{day.seats} cubiertos</span>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>

          <section className={styles.agendaPanel}>
            <header className={styles.agendaHeader}>
              <div>
                <h2 className={styles.agendaTitle}>Agenda del día</h2>
                <p className={styles.agendaDate}>{selectedDateLabel}</p>
              </div>

              <div className={styles.agendaStats}>
                <span>
                  <strong>24</strong>
                  reservas
                </span>
                <span>
                  <strong>72</strong>
                  cubiertos
                </span>
                <span>
                  <strong>78%</strong>
                  ocupación
                </span>
              </div>
            </header>

            <div className={styles.agendaList}>
              {agendaHours.map((hour) => {
                const reservations = reservationsBySlot[hour] ?? [];
                const count = reservations.length;
                const hasReservations = count > 0;
                const hasMultiple = count > 1;
                const expanded = expandedSlots.includes(hour);
                const first = reservations[0];

                return (
                  <article
                    key={hour}
                    className={[
                      styles.agendaSlot,
                      hasReservations ? styles.agendaSlotWithReservation : "",
                      hasMultiple ? styles.agendaSlotMultiple : "",
                      expanded ? styles.agendaSlotExpanded : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    <button
                      type="button"
                      className={styles.agendaSlotButton}
                      disabled={!hasMultiple}
                      onClick={() => hasMultiple && toggleSlot(hour)}
                    >
                      <span className={styles.agendaTime}>{hour}</span>

                      <span className={styles.agendaSlotContent}>
                        {!hasReservations ? (
                          <span className={styles.agendaEmpty}>Sin reservas</span>
                        ) : hasMultiple ? (
                          <>
                            <strong>{count} reservas</strong>
                            <small>
                              {first?.client} + {count - 1} más
                            </small>
                          </>
                        ) : (
                          <>
                            <strong>
                              {first?.time} · {first?.client}
                            </strong>
                            <small>
                              {first?.table} · {first?.pax} pax · {statusLabelMap[first?.status ?? "confirmed"]}
                            </small>
                          </>
                        )}
                      </span>

                      {hasMultiple ? (
                        <span className={styles.agendaMultipleBadge}>
                          {expanded ? "Ocultar" : "Ver detalle"}
                        </span>
                      ) : hasReservations ? (
                        <span className={styles.agendaPax}>{first?.pax} pax</span>
                      ) : (
                        <span />
                      )}

                      {hasMultiple ? (
                        <LabIcon
                          name={expanded ? "chevronDown" : "chevronRight"}
                          className={styles.agendaSlotChevron}
                        />
                      ) : hasReservations ? (
                        <span className={`${styles.agendaStatus} ${statusClassMap[first?.status ?? "confirmed"]}`}>
                          {statusLabelMap[first?.status ?? "confirmed"]}
                        </span>
                      ) : (
                        <span />
                      )}
                    </button>

                    {hasMultiple && expanded ? (
                      <div className={styles.agendaExpandedList}>
                        {reservations.map((reservation) => (
                          <div key={reservation.id} className={styles.agendaExpandedItem}>
                            <div>
                              <strong>
                                {reservation.time} · {reservation.client}
                              </strong>
                              <small>
                                {reservation.table} · {reservation.pax} pax · {reservation.note}
                              </small>
                            </div>
                            <span className={`${styles.agendaStatus} ${statusClassMap[reservation.status]}`}>
                              {statusLabelMap[reservation.status]}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </article>
                );
              })}
            </div>

            <footer className={styles.agendaLegend}>
              <span>
                <i className={styles.legendDot} data-tone="confirmed" />
                Confirmada
              </span>
              <span>
                <i className={styles.legendDot} data-tone="pending" />
                Pendiente
              </span>
              <span>
                <i className={styles.legendDot} data-tone="special" />
                Especial
              </span>
              <span>
                <i className={styles.legendDot} data-tone="risk" />
                Riesgo no-show
              </span>
            </footer>
          </section>

          <aside className={styles.sideColumn}>
            <section className={styles.sidePanel}>
              <div className={styles.sideHeader}>
                <h3 className={styles.sideTitle}>Próximas reservas</h3>
                <div className={styles.sideSubtitle}>Jueves, 22 de mayo</div>
              </div>

              <div className={styles.sideList}>
                {upcomingReservations.map((item) => (
                  <div key={`${item.time}-${item.name}`} className={styles.sideItem}>
                    <div className={styles.sideItemTime}>{item.time}</div>
                    <div className={styles.sideItemBody}>
                      <div className={styles.sideItemTop}>
                        <span>{item.table}</span>
                        <span>·</span>
                        <span>{item.people}</span>
                      </div>
                      <div className={styles.sideItemName}>{item.name}</div>
                    </div>
                    <div className={styles.sideItemStatus}>
                      {item.tone === "confirmed" ? (
                        <LabIcon name="check" className={styles.sideStatusIcon} />
                      ) : item.tone === "pending" ? (
                        <LabIcon name="clock" className={styles.sideStatusIcon} />
                      ) : item.tone === "special" ? (
                        <LabIcon name="star" className={styles.sideStatusIcon} />
                      ) : (
                        <LabIcon name="x" className={styles.sideStatusIcon} />
                      )}
                    </div>
                  </div>
                ))}
              </div>

              <button type="button" className={styles.sideLink}>
                Ver todas las reservas del día →
              </button>
            </section>

            <section className={styles.opportunityCard}>
              <div className={styles.sideHeader}>
                <h3 className={styles.sideTitle}>Mejor oportunidad</h3>
              </div>

              <div className={styles.opportunityText}>
                Tenés 2 mesas disponibles entre 16:00 y 17:30 para 2-4 personas.
              </div>

              <button type="button" className={styles.opportunityButton}>
                Ver en plano
                <LabIcon name="arrowRight" className={styles.opportunityIcon} />
              </button>
            </section>
          </aside>
        </section>
      </div>
    </div>
  );
}
