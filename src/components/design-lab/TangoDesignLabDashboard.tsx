import type { CSSProperties, ReactNode } from "react";
import { APP_VERSION } from "@/lib/constants";
import styles from "./TangoDesignLabDashboard.module.css";

type IconName =
  | "home"
  | "calendar"
  | "book"
  | "map"
  | "users"
  | "settings"
  | "menu"
  | "globe"
  | "chart"
  | "bell"
  | "search"
  | "chevronDown"
  | "eye"
  | "pencil"
  | "more"
  | "plus"
  | "lock"
  | "check"
  | "x"
  | "clock"
  | "user"
  | "phone"
  | "sparkles";

type MetricTone = "cyan" | "green" | "red" | "purple" | "blue" | "solid";
type StatusTone = "pending" | "confirmed" | "cancelled" | "noShow" | "reserved" | "occupied" | "blocked";
type QuickTone = "cyan" | "purple" | "blue" | "green";
type NavigationItem = {
  icon: IconName;
  label: string;
  active?: boolean;
};
type ChartBar = {
  hour: string;
  label?: string;
  value: number;
  active?: boolean;
};

type MetricCard = {
  kind: "count" | "next" | "occupancy";
  title: string;
  value: string;
  subtitle?: string;
  footerLeft: string;
  footerRight: string;
  icon: IconName;
  tone: MetricTone;
  valueClassName?: string;
  extra?: ReactNode;
};

type ReservationRow = {
  time: string;
  client: string;
  phone: string;
  people: number;
  table: string;
  area: string;
  status: string;
  statusTone: StatusTone;
  channel: string;
  highlight?: boolean;
};

type PlanTable = {
  label: string;
  state: "available" | "reserved" | "occupied" | "blocked";
  left: string;
  top: string;
};

type ActivityItem = {
  icon: IconName;
  tone: "green" | "blue" | "red";
  title: string;
  subtitle: string;
  time: string;
};

type CustomerItem = {
  initials: string;
  name: string;
  meta: string;
};

type QuickAction = {
  title: string;
  subtitle: string;
  tone: QuickTone;
  icon: IconName;
};

const navigationItems: NavigationItem[] = [
  { icon: "home", label: "Inicio", active: true },
  { icon: "calendar", label: "Reservas" },
  { icon: "book", label: "Calendario" },
  { icon: "map", label: "Plano" },
  { icon: "users", label: "CRM" },
  { icon: "settings", label: "Configuración" },
  { icon: "menu", label: "Menú" },
  { icon: "globe", label: "Web" },
  { icon: "chart", label: "Reportes" },
] as const;

const metricCards: MetricCard[] = [
  {
    kind: "count",
    title: "Pendientes",
    value: "4",
    footerLeft: "Hoy",
    footerRight: "Ver todas →",
    icon: "clock",
    tone: "cyan",
    extra: <span className={styles.metricUnit}>reservas</span>,
  },
  {
    kind: "count",
    title: "Confirmadas",
    value: "19",
    footerLeft: "Hoy",
    footerRight: "Ver todas →",
    icon: "check",
    tone: "green",
    extra: <span className={styles.metricUnit}>reservas</span>,
  },
  {
    kind: "count",
    title: "Canceladas",
    value: "2",
    footerLeft: "Hoy",
    footerRight: "Ver todas →",
    icon: "x",
    tone: "red",
    extra: <span className={styles.metricUnit}>reservas</span>,
  },
  {
    kind: "count",
    title: "No-show",
    value: "1",
    footerLeft: "Hoy",
    footerRight: "Ver todas →",
    icon: "user",
    tone: "purple",
    extra: <span className={styles.metricUnit}>reserva</span>,
  },
  {
    kind: "next",
    title: "Próxima reserva",
    value: "15:00",
    subtitle: "Hoy · 2 personas",
    footerLeft: "Hoy",
    footerRight: "Ver detalle →",
    icon: "calendar",
    tone: "blue",
  },
  {
    kind: "occupancy",
    title: "Ocupación de hoy",
    value: "",
    subtitle: "72 / 106 cubiertos",
    footerLeft: "Hoy",
    footerRight: "Ver calendario →",
    icon: "clock",
    tone: "solid",
    extra: (
      <div className={styles.occupancyDonut} aria-label="68% de ocupación">
        <span>68%</span>
      </div>
    ),
  },
];

const reservationRows: ReservationRow[] = [
  {
    time: "13:00",
    client: "Juan Martín López",
    phone: "+54 9 11 2345 6789",
    people: 2,
    table: "Mesa 12",
    area: "Terraza",
    status: "Confirmada",
    statusTone: "confirmed",
    channel: "Web",
  },
  {
    time: "13:30",
    client: "Ana García",
    phone: "+54 9 11 3456 7890",
    people: 4,
    table: "Mesa 5",
    area: "Salón",
    status: "Confirmada",
    statusTone: "confirmed",
    channel: "Instagram",
  },
  {
    time: "14:00",
    client: "Carlos Rojas",
    phone: "+54 9 11 4567 8901",
    people: 2,
    table: "Mesa 9",
    area: "Salón",
    status: "Pendiente",
    statusTone: "pending",
    channel: "Teléfono",
  },
  {
    time: "15:00",
    client: "Valeria del Mar",
    phone: "+54 9 11 5678 9012",
    people: 2,
    table: "Mesa 7",
    area: "Terraza",
    status: "Confirmada",
    statusTone: "confirmed",
    channel: "Web",
    highlight: true,
  },
  {
    time: "20:30",
    client: "Grupo de amigos",
    phone: "+54 9 11 6789 0123",
    people: 6,
    table: "Mesa 3",
    area: "Salón",
    status: "Confirmada",
    statusTone: "confirmed",
    channel: "Web",
  },
];

const floorTables: PlanTable[] = [
  { label: "1", state: "available", left: "22%", top: "8%" },
  { label: "2", state: "available", left: "39%", top: "8%" },
  { label: "3", state: "occupied", left: "58%", top: "8%" },
  { label: "4", state: "available", left: "78%", top: "8%" },
  { label: "5", state: "reserved", left: "9%", top: "32%" },
  { label: "6", state: "available", left: "10%", top: "56%" },
  { label: "7", state: "available", left: "13%", top: "80%" },
  { label: "8", state: "available", left: "34%", top: "42%" },
  { label: "9", state: "reserved", left: "55%", top: "42%" },
  { label: "10", state: "available", left: "81%", top: "40%" },
  { label: "11", state: "occupied", left: "80%", top: "62%" },
  { label: "12", state: "reserved", left: "32%", top: "80%" },
  { label: "13", state: "blocked", left: "56%", top: "80%" },
];

const hourlyOccupancy: ChartBar[] = [
  { hour: "08:00", label: "08", value: 12 },
  { hour: "09:00", label: "09", value: 18 },
  { hour: "10:00", label: "10", value: 25 },
  { hour: "11:00", label: "11", value: 35 },
  { hour: "12:00", label: "12", value: 48 },
  { hour: "13:00", label: "13", value: 58 },
  { hour: "14:00", label: "14", value: 64 },
  { hour: "15:00", label: "15", value: 70 },
  { hour: "16:00", label: "16", value: 76 },
  { hour: "17:00", label: "17", value: 82 },
  { hour: "18:00", label: "18", value: 88 },
  { hour: "19:00", label: "19", value: 92, active: true },
  { hour: "20:00", label: "20", value: 84 },
  { hour: "21:00", label: "21", value: 73 },
  { hour: "22:00", label: "22", value: 61 },
  { hour: "23:59", label: "23:59", value: 44 },
] as const;

const activities: ActivityItem[] = [
  {
    icon: "check",
    tone: "green",
    title: "Nueva reserva confirmada",
    subtitle: "Mesa 10 para 2 personas a las 21:00",
    time: "Hace 15 min",
  },
  {
    icon: "calendar",
    tone: "blue",
    title: "Reserva pendiente",
    subtitle: "Mesa 4 para 4 personas a las 14:30",
    time: "Hace 32 min",
  },
  {
    icon: "x",
    tone: "red",
    title: "Reserva cancelada",
    subtitle: "Mesa 8 para 2 personas a las 18:30",
    time: "Hace 1 h",
  },
  {
    icon: "check",
    tone: "green",
    title: "Reserva completada",
    subtitle: "Mesa 5 para 2 personas a las 22:00",
    time: "Hace 8 min",
  },
  {
    icon: "calendar",
    tone: "blue",
    title: "Reserva reprogramada",
    subtitle: "Mesa 2 para 3 personas a las 21:30",
    time: "Hace 4 min",
  },
];

const customers: CustomerItem[] = [
  { initials: "VD", name: "Valeria del Mar", meta: "Cliente frecuente · 8 visitas" },
  { initials: "JM", name: "Juan Martín López", meta: "Cliente frecuente · 5 visitas" },
  { initials: "AG", name: "Ana García", meta: "Cliente frecuente · 3 visitas" },
  { initials: "CR", name: "Carlos Rojas", meta: "Cliente frecuente · 2 visitas" },
  { initials: "LM", name: "Lucía Molina", meta: "Cliente frecuente · 1 visita" },
];

const quickActions: QuickAction[] = [
  { title: "Nueva reserva", subtitle: "Tomar reserva", tone: "cyan", icon: "plus" },
  { title: "Bloquear mesa", subtitle: "Ir al plano", tone: "purple", icon: "lock" },
  { title: "Abrir CRM", subtitle: "Ver clientes", tone: "blue", icon: "users" },
  { title: "Editar web", subtitle: "Actualizar sitio", tone: "green", icon: "globe" },
];

function Icon({
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
    case "home":
      return (
        <svg className={className} {...common}>
          <path d="M4 11.5 12 4l8 7.5" />
          <path d="M6 10.75V20h12v-9.25" />
          <path d="M10 20v-5h4v5" />
        </svg>
      );
    case "calendar":
      return (
        <svg className={className} {...common}>
          <rect x="3.5" y="5" width="17" height="15.5" rx="3" />
          <path d="M3.5 9.2h17" />
          <path d="M8 3.5v3" />
          <path d="M16 3.5v3" />
        </svg>
      );
    case "book":
      return (
        <svg className={className} {...common}>
          <path d="M5 4.5h11a3 3 0 0 1 3 3V20H8a3 3 0 0 1-3-3V4.5Z" />
          <path d="M8 4.5V20" />
          <path d="M18 18H8" />
        </svg>
      );
    case "map":
      return (
        <svg className={className} {...common}>
          <path d="M9 19 3.5 20.5V5.5L9 4l6 1.5 5.5-1.5v15l-5.5 1.5L9 19Z" />
          <path d="M9 4v15" />
          <path d="M15 5.5v15" />
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
    case "globe":
      return (
        <svg className={className} {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M3.5 12h17" />
          <path d="M12 3.5c2.5 2.5 3.8 5.3 3.8 8.5S14.5 17 12 20.5C9.5 18 8.2 15.2 8.2 12S9.5 6 12 3.5Z" />
        </svg>
      );
    case "chart":
      return (
        <svg className={className} {...common}>
          <path d="M4.5 19.5h15" />
          <path d="M7 16V9" />
          <path d="M12 16V5.5" />
          <path d="M17 16V11" />
        </svg>
      );
    case "bell":
      return (
        <svg className={className} {...common}>
          <path d="M7.5 9.5a4.5 4.5 0 1 1 9 0c0 5 2 6 2 6H5.5s2-1 2-6Z" />
          <path d="M10 18a2 2 0 0 0 4 0" />
        </svg>
      );
    case "search":
      return (
        <svg className={className} {...common}>
          <circle cx="11" cy="11" r="5.5" />
          <path d="m15 15 4 4" />
        </svg>
      );
    case "chevronDown":
      return (
        <svg className={className} {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "eye":
      return (
        <svg className={className} {...common}>
          <path d="M2.5 12S6.2 5.5 12 5.5 21.5 12 21.5 12 17.8 18.5 12 18.5 2.5 12 2.5 12Z" />
          <circle cx="12" cy="12" r="2.8" />
        </svg>
      );
    case "pencil":
      return (
        <svg className={className} {...common}>
          <path d="M4 16.5V20h3.5L18.8 8.7l-3.5-3.5L4 16.5Z" />
          <path d="m14.4 6.3 3.5 3.5" />
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
    case "plus":
      return (
        <svg className={className} {...common}>
          <path d="M12 5.5v13" />
          <path d="M5.5 12h13" />
        </svg>
      );
    case "lock":
      return (
        <svg className={className} {...common}>
          <rect x="5.5" y="11" width="13" height="9" rx="2" />
          <path d="M8 11V8.8a4 4 0 0 1 8 0V11" />
        </svg>
      );
    case "check":
      return (
        <svg className={className} {...common}>
          <path d="m5.5 12 4 4 9-9" />
        </svg>
      );
    case "x":
      return (
        <svg className={className} {...common}>
          <path d="m6.5 6.5 11 11" />
          <path d="m17.5 6.5-11 11" />
        </svg>
      );
    case "clock":
      return (
        <svg className={className} {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 8.5V12l2.6 1.8" />
        </svg>
      );
    case "user":
      return (
        <svg className={className} {...common}>
          <circle cx="12" cy="8.4" r="3" />
          <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
        </svg>
      );
    case "phone":
      return (
        <svg className={className} {...common}>
          <path d="M7 4.8h2.4l1.1 3-1.8 1.5a13.2 13.2 0 0 0 5.9 5.9l1.5-1.8 3 1.1V17a2 2 0 0 1-2 2A14 14 0 0 1 4.9 6.8a2 2 0 0 1 2.1-2Z" />
        </svg>
      );
    case "sparkles":
      return (
        <svg className={className} {...common}>
          <path d="M12 3.5 13.7 8l4.5 1.7-4.5 1.8L12 16l-1.7-4.5L5.8 9.7 10.3 8 12 3.5Z" />
          <path d="M18 13.5 18.8 16l2.5.8-2.5.9-.8 2.5-.9-2.5-2.5-.9 2.5-.8.9-2.5Z" />
        </svg>
      );
    default:
      return null;
  }
}

function statusClass(tone: StatusTone) {
  switch (tone) {
    case "pending":
      return styles.statusPending;
    case "confirmed":
      return styles.statusConfirmed;
    case "cancelled":
      return styles.statusCancelled;
    case "noShow":
      return styles.statusNoShow;
    case "reserved":
      return styles.statusReserved;
    case "occupied":
      return styles.statusOccupied;
    case "blocked":
      return styles.statusBlocked;
    default:
      return styles.statusConfirmed;
  }
}

function metricToneClass(tone: MetricTone) {
  switch (tone) {
    case "cyan":
      return styles.metricCardBlue;
    case "green":
      return styles.metricCardGreen;
    case "red":
      return styles.metricCardRed;
    case "purple":
      return styles.metricCardPurple;
    case "blue":
      return styles.metricCardSolid;
    case "solid":
      return styles.metricCardSolid;
    default:
      return styles.metricCardSolid;
  }
}

function quickToneClass(tone: QuickTone) {
  switch (tone) {
    case "cyan":
      return styles.tileCyan;
    case "purple":
      return styles.tilePurple;
    case "blue":
      return styles.tileBlue;
    case "green":
      return styles.tileGreen;
    default:
      return styles.tileCyan;
  }
}

function topbarIconButton() {
  return (
    <div className={styles.notification}>
      <div style={{ position: "relative" }}>
        <Icon name="bell" className="h-4 w-4" />
        <span className={styles.badge}>3</span>
      </div>
    </div>
  );
}

function SidebarItem({ item }: { item: NavigationItem }) {
  return (
    <button
      type="button"
      className={`${styles.navItem} ${item.active ? styles.navItemActive : ""}`}
    >
      <Icon
        name={item.icon}
        className={`${styles.navIcon} ${item.active ? "text-cyan-300" : "text-slate-300"}`}
      />
      <span>{item.label}</span>
    </button>
  );
}

function MetricCardView({ card }: { card: MetricCard }) {
  const isOccupancy = card.kind === "occupancy";
  const isNext = card.kind === "next";

  return (
    <article
      className={`${styles.metricCard} ${metricToneClass(card.tone)} ${
        isOccupancy ? styles.occupancyCard : ""
      }`}
    >
      <div className={styles.metricTop}>
        <div className={styles.metricTitleWrap}>
          <span className={styles.metricIcon}>
            <Icon name={card.icon} className="h-4 w-4" />
          </span>
          <span className={styles.metricTitle}>{card.title}</span>
        </div>
      </div>
      {isOccupancy ? (
        <div className={styles.occupancyBody}>
          <div className={styles.occupancyCopy}>
            {card.subtitle ? <div className={styles.occupancyCovers}>{card.subtitle}</div> : null}
          </div>
          {card.extra ? <div className={styles.occupancyExtra}>{card.extra}</div> : null}
        </div>
      ) : isNext ? (
        <div className={styles.nextReservationBody}>
          <div className={styles.metricValue}>{card.value}</div>
          <div className={styles.nextReservationMeta}>
            {card.subtitle ? <span>{card.subtitle}</span> : null}
            <small>Valeria del Mar</small>
          </div>
        </div>
      ) : (
        <div className={styles.metricBody}>
          <div className={styles.metricValueRow}>
            <div className={styles.metricValue}>{card.value}</div>
            {card.extra ? <div className={styles.metricUnit}>{card.extra}</div> : null}
          </div>
        </div>
      )}

      <div className={styles.metricFooter}>
        <span>{card.footerLeft}</span>
        <span className={styles.metricAction}>{card.footerRight}</span>
      </div>
    </article>
  );
}

function SectionPanel({
  title,
  badge,
  actions,
  children,
}: {
  title: string;
  badge?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className={styles.panel}>
      <div className={styles.panelHeader}>
        <div className={styles.panelTitleGroup}>
          <h2 className={styles.panelTitle}>{title}</h2>
          {badge ? <span className={styles.panelChip}>{badge}</span> : null}
        </div>
        {actions}
      </div>
      {children}
    </section>
  );
}

function ReservationsTable() {
  return (
    <SectionPanel
      title="Reservas de hoy"
      badge="25 en total"
      actions={
        <div className={styles.panelActions}>
          <button type="button" className={styles.tableLinkButton}>
            Ver todas las reservas de hoy →
          </button>
          <button type="button" className={styles.selectButton}>
            <span>Vista: Lista</span>
            <Icon name="chevronDown" className="h-4 w-4" />
          </button>
          <button type="button" className={styles.primaryButton}>
            <Icon name="plus" className="h-3.5 w-3.5" />
            <span>Nueva reserva</span>
          </button>
        </div>
      }
    >
      <div className={styles.tableWrap}>
        <div className={styles.tableHeaderRow}>
          <span>Hora</span>
          <span>Cliente</span>
          <span>Personas</span>
          <span>Mesa</span>
          <span>Estado</span>
          <span>Canal</span>
          <span>Acciones</span>
        </div>

        <div className={styles.tableBody}>
          {reservationRows.map((row) => (
            <div
              key={`${row.time}-${row.client}`}
              className={`${styles.tableRow} ${row.highlight ? styles.tableRowHighlight : ""}`}
            >
              <div className={`${styles.tableCell} ${styles.tableCellStrong}`}>{row.time}</div>
              <div className={styles.clientCell}>
                <span className={styles.tableCell}>{row.client}</span>
                <span className={styles.tableSubline}>{row.phone}</span>
              </div>
              <div className={styles.tableCell}>{row.people}</div>
              <div className={styles.tableTableCell}>
                <span className={styles.tableCell}> {row.table}</span>
                <span className={styles.tableSubline}>{row.area}</span>
              </div>
              <div>
                <span className={`${styles.statusBadge} ${statusClass(row.statusTone)}`}>{row.status}</span>
              </div>
              <div className={styles.tableCell}>{row.channel}</div>
              <div className={styles.actionGroup}>
                <button type="button" className={styles.iconButton} aria-label="Ver reserva">
                  <Icon name="eye" className="h-3.5 w-3.5" />
                </button>
                <button type="button" className={styles.iconButton} aria-label="Editar reserva">
                  <Icon name="pencil" className="h-3.5 w-3.5" />
                </button>
                <button type="button" className={styles.iconButton} aria-label="Más acciones">
                  <Icon name="more" className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionPanel>
  );
}

function FloorPlan() {
  return (
    <SectionPanel
      title="Plano del salón"
      actions={
        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.legendGreen}`} />
            Disponible
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.legendRed}`} />
            Ocupada
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.legendBlue}`} />
            Reservada
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendDot} ${styles.legendGray}`} />
            Bloqueada
          </span>
        </div>
      }
    >
      <div className={styles.floorWrap}>
        <div className={styles.floorMap}>
          <div className={styles.floorTexture} />
          {floorTables.map((table) => {
            const toneClass =
              table.state === "available"
                ? styles.tableAvailable
                : table.state === "reserved"
                  ? styles.tableReserved
                  : table.state === "occupied"
                    ? styles.tableOccupied
                    : styles.tableBlocked;

            return (
              <div
                key={table.label}
                className={`${styles.tableNode} ${toneClass}`}
                style={{ left: table.left, top: table.top } as CSSProperties}
              >
                <span>{table.label}</span>
              </div>
            );
          })}

          <button type="button" className={styles.floorButton}>
            Editar plano
          </button>
        </div>
      </div>
    </SectionPanel>
  );
}

function HourlyChart() {
  return (
    <section className={styles.bottomCard}>
      <div className={styles.bottomTitleRow}>
        <h3 className={styles.bottomTitle}>Ocupación por franja horaria</h3>
        <select className={styles.smallSelect} defaultValue="Hoy">
          <option>Hoy</option>
        </select>
      </div>

      <div className={styles.chartArea}>
        <div className={styles.hourlyChartShell}>
          <div className={styles.hourlyYAxis}>
            <span>100%</span>
            <span>75%</span>
            <span>50%</span>
            <span>25%</span>
            <span>0%</span>
          </div>

          <div className={styles.hourlyChartArea}>
            <div className={styles.hourlyGridLines} aria-hidden="true">
              <span />
              <span />
              <span />
              <span />
              <span />
            </div>

            <div className={styles.hourlyBarsRow}>
              {hourlyOccupancy.map((bar) => (
                <div key={bar.hour} className={styles.hourlyBarGroup}>
                  <div
                    className={`${styles.hourlyBar} ${bar.active ? styles.hourlyBarActive : ""}`}
                    style={{ height: `${bar.value}%` }}
                  />
                </div>
              ))}
            </div>

            <div className={styles.hourlyXAxis}>
              {hourlyOccupancy.map((bar) => (
                <span key={bar.hour}>{bar.label ?? bar.hour}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function RecentActivity() {
  return (
    <section className={styles.bottomCard}>
      <div className={styles.bottomTitleRow}>
        <h3 className={styles.bottomTitle}>Actividad reciente</h3>
      </div>

      <div className={styles.activityList}>
        {activities.map((item) => (
          <div key={item.title} className={styles.activityItem}>
            <div className={styles.activityLeft}>
              <span
                className={styles.activityIcon}
                style={{
                  background:
                    item.tone === "green"
                      ? "rgba(34, 197, 94, 0.12)"
                      : item.tone === "blue"
                        ? "rgba(59, 130, 246, 0.12)"
                        : "rgba(239, 68, 68, 0.12)",
                  color:
                    item.tone === "green"
                      ? "#86efac"
                      : item.tone === "blue"
                        ? "#93c5fd"
                        : "#fca5a5",
                }}
              >
                <Icon name={item.icon} className="h-4 w-4" />
              </span>
              <div className={styles.activityText}>
                <div className={styles.activityTitle}>{item.title}</div>
                <div className={styles.activitySubtitle}>{item.subtitle}</div>
              </div>
            </div>
            <span className={styles.activityTime}>{item.time}</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeaturedCustomers() {
  return (
    <section className={styles.bottomCard}>
      <div className={styles.bottomTitleRow}>
        <h3 className={styles.bottomTitle}>Clientes destacados</h3>
        <span className={styles.crmLink}>Ver CRM →</span>
      </div>

      <div className={styles.customersList}>
        {customers.map((customer) => (
          <div key={customer.name} className={styles.customerItem}>
            <div className={styles.customerAvatar}>{customer.initials}</div>
            <div className={styles.customerText}>
              <div className={styles.customerName}>{customer.name}</div>
              <div className={styles.customerMeta}>{customer.meta}</div>
            </div>
            <span className={styles.vipBadge}>VIP</span>
          </div>
        ))}
      </div>
    </section>
  );
}

function QuickActions() {
  return (
    <section className={styles.bottomCard}>
      <div className={styles.bottomTitleRow}>
        <h3 className={styles.bottomTitle}>Acciones rápidas</h3>
      </div>

      <div className={styles.quickGrid}>
        {quickActions.map((action) => (
          <button key={action.title} type="button" className={`${styles.quickTile} ${quickToneClass(action.tone)}`}>
            <span className={styles.quickArrow}>→</span>
            <span className={styles.quickIcon}>
              <Icon name={action.icon} className="h-4 w-4" />
            </span>
            <div className={styles.quickLabelWrap}>
              <div className={styles.quickLabel}>{action.title}</div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

export function TangoDesignLabDashboard() {
  return (
    <div className={styles.shell}>
      <aside className={styles.sidebar}>
        <div className={styles.logo}>
          <div className={styles.logoMark}>
            <span>T</span>
          </div>
          <div className={styles.logoText}>
            <div className={styles.logoTitle}>TANGO</div>
            <div className={styles.logoSub}>RESERVAS</div>
          </div>
        </div>

        <nav className={styles.nav} aria-label="Navegación principal">
          {navigationItems.map((item) => (
            <SidebarItem key={item.label} item={item} />
          ))}
        </nav>

        <div className={styles.sidebarSpacer} />

        <div className={styles.sidebarFooter}>
          <div className={styles.businessCard}>
            <div className={styles.businessTop}>
              <div className={styles.businessThumb} />
              <div>
                <div className={styles.businessName}>Demuru</div>
                <div className={styles.businessType}>Restaurante de autor</div>
              </div>
            </div>
            <button type="button" className={styles.websiteButton}>
              Ver mi sitio web
            </button>
          </div>

          <div className={styles.userCard}>
            <div className={styles.userLeft}>
              <div className={styles.userAvatar}>M</div>
              <div>
                <div className={styles.userName}>Mariano Demuru</div>
                <div className={styles.userRole}>Propietario</div>
              </div>
            </div>
            <Icon name="chevronDown" className="h-4 w-4 text-slate-400" />
          </div>

          <div className={styles.version}>{APP_VERSION}</div>
        </div>
      </aside>

      <main className={styles.main}>
        <header className={styles.topbar}>
          <div className={styles.topbarBusiness}>
            <div className={styles.topbarBusinessName}>Demuru</div>
            <span className={styles.statusDot} />
            <span className={styles.topbarStatus}>Abierto ahora</span>
            <Icon name="chevronDown" className="h-4 w-4 text-slate-400" />
          </div>

          <div className={styles.topbarSearch}>
            <div className={styles.searchHint}>
              <Icon name="search" className="h-4 w-4" />
              <span>Buscar reservas, clientes, mesas…</span>
            </div>
            <span className={styles.shortcut}>
              <span className={styles.shortcutKey}>⌘</span>
              <span className={styles.shortcutKey}>K</span>
            </span>
          </div>

          <div className={styles.topbarUser}>
            {topbarIconButton()}
            <div className={styles.topbarAvatar} />
            <div className={styles.topbarUserText}>
              <div className={styles.topbarUserName}>Mariano Demuru</div>
              <div className={styles.topbarUserRole}>Propietario</div>
            </div>
            <Icon name="chevronDown" className="h-4 w-4 text-slate-400" />
          </div>
        </header>

        <section className={styles.content}>
          <div className={styles.dashboardHeader}>
            <div>
              <div className={styles.greeting}>¡Bienvenido, Mariano!</div>
              <h1 className={styles.headline}>
                Operación del local <span className={styles.headlineSpark}>✧</span>
              </h1>
              <div className={styles.subtitle}>Resumen en tiempo real de tu restaurante.</div>
            </div>

            <div className={styles.headerActions}>
              <button type="button" className={styles.dateButton}>
                <Icon name="calendar" className="h-4 w-4" />
                <span>Jueves, 22 de mayo de 2026</span>
                <Icon name="chevronDown" className="h-4 w-4 text-slate-400" />
              </button>
              <button type="button" className={styles.filtersButton}>
                <Icon name="settings" className="h-4 w-4" />
                <span>Filtros</span>
              </button>
            </div>
          </div>

          <div className={styles.metricsGrid}>
            {metricCards.map((card) => (
              <MetricCardView key={card.title} card={card} />
            ))}
          </div>

          <div className={styles.centerGrid}>
            <ReservationsTable />
            <FloorPlan />
          </div>

          <div className={styles.bottomGrid}>
            <HourlyChart />
            <RecentActivity />
            <FeaturedCustomers />
            <QuickActions />
          </div>
        </section>
      </main>
    </div>
  );
}
