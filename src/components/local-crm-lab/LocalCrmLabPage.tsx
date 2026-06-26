"use client";

import styles from "./LocalCrmLabPage.module.css";

type Tone = "cyan" | "emerald" | "amber" | "rose" | "violet";

type MetricCard = {
  title: string;
  value: string;
  subtitle: string;
  footer: string;
  tone: Tone;
};

type SegmentTab = {
  key: string;
  label: string;
  count: string;
};

type CustomerRow = {
  id: string;
  name: string;
  initials: string;
  tags: string[];
  contact: string;
  email: string;
  lastVisit: string;
  nextReservation: string;
  visits: string;
  spend: string;
  selected?: boolean;
};

type ActivityItem = {
  date: string;
  title: string;
  note: string;
};

const crmMetrics: MetricCard[] = [
  { title: "Total clientes", value: "1.248", subtitle: "+28 este mes", footer: "Ver todos →", tone: "cyan" },
  { title: "Clientes VIP", value: "186", subtitle: "15% del total", footer: "Ver todos →", tone: "amber" },
  {
    title: "Cumpleaños próximos",
    value: "17",
    subtitle: "En los próximos 7 días",
    footer: "Ver todos →",
    tone: "violet",
  },
  {
    title: "Clientes frecuentes",
    value: "542",
    subtitle: "+9% vs mes anterior",
    footer: "Ver todos →",
    tone: "emerald",
  },
  { title: "Riesgo no-show", value: "38", subtitle: "3% del total", footer: "Ver todos →", tone: "rose" },
];

const crmSegments: SegmentTab[] = [
  { key: "all", label: "Todos", count: "1.248" },
  { key: "vip", label: "VIP", count: "186" },
  { key: "frequent", label: "Frecuentes", count: "542" },
  { key: "new", label: "Nuevos", count: "126" },
  { key: "birthday", label: "Cumpleaños", count: "17" },
  { key: "allergy", label: "Alergias", count: "112" },
  { key: "risk", label: "Riesgo no-show", count: "38" },
];

const crmCustomers: CustomerRow[] = [
  {
    id: "valeria",
    name: "Valeria del Mar",
    initials: "VD",
    tags: ["VIP"],
    contact: "+54 9 11 5678 9012",
    email: "valeria.delmar@gmail.com",
    lastVisit: "15/05/2026",
    nextReservation: "22/05/2026 13:00 · Mesa 5",
    visits: "8",
    spend: "$ 92.300",
    selected: true,
  },
  {
    id: "juan",
    name: "Juan Martín López",
    initials: "JM",
    tags: ["VIP", "Frecuente"],
    contact: "+54 9 11 2345 6789",
    email: "juan.lopez@gmail.com",
    lastVisit: "20/05/2026",
    nextReservation: "22/05/2026 13:30 · Mesa 12",
    visits: "12",
    spend: "$ 78.600",
  },
  {
    id: "ana",
    name: "Ana García",
    initials: "AG",
    tags: ["Frecuente"],
    contact: "+54 9 11 3456 7890",
    email: "ana.garcia@gmail.com",
    lastVisit: "18/05/2026",
    nextReservation: "—",
    visits: "9",
    spend: "$ 56.200",
  },
  {
    id: "carlos",
    name: "Carlos Rojas",
    initials: "CR",
    tags: ["VIP"],
    contact: "+54 9 11 4567 8901",
    email: "carlos.rojas@gmail.com",
    lastVisit: "10/05/2026",
    nextReservation: "24/05/2026 15:00 · Mesa 7",
    visits: "8",
    spend: "$ 88.700",
  },
  {
    id: "maria",
    name: "María Eugenia Ruiz",
    initials: "MR",
    tags: ["Frecuente"],
    contact: "+54 9 11 2233 4455",
    email: "maria.ruiz@gmail.com",
    lastVisit: "16/05/2026",
    nextReservation: "—",
    visits: "5",
    spend: "$ 47.900",
  },
  {
    id: "roberto",
    name: "Roberto Álvarez",
    initials: "RA",
    tags: ["Riesgo no-show"],
    contact: "+54 9 11 6677 8899",
    email: "roberto.alvarez@gmail.com",
    lastVisit: "02/05/2026",
    nextReservation: "25/05/2026 20:00 · Mesa 3",
    visits: "3",
    spend: "$ 61.300",
  },
  {
    id: "sofia",
    name: "Sofía Beltrán",
    initials: "SB",
    tags: ["Nuevo"],
    contact: "+54 9 11 5566 7788",
    email: "sofia.beltran@gmail.com",
    lastVisit: "—",
    nextReservation: "23/05/2026 21:00 · Mesa 9",
    visits: "1",
    spend: "$ 72.100",
  },
  {
    id: "federico",
    name: "Federico Paredes",
    initials: "FP",
    tags: ["Frecuente"],
    contact: "+54 9 11 5678 9013",
    email: "fede.paredes@gmail.com",
    lastVisit: "12/05/2026",
    nextReservation: "—",
    visits: "7",
    spend: "$ 64.800",
  },
];

const customerActivity: ActivityItem[] = [
  {
    date: "22/05/2026 13:00",
    title: "Reserva confirmada",
    note: "Mesa 5 · 2 personas",
  },
  {
    date: "15/05/2026 21:45",
    title: "Completó reserva",
    note: "Mesa 8 · 2 personas",
  },
  {
    date: "10/05/2026 14:20",
    title: "Canceló reserva",
    note: "Mesa 3 · 2 personas",
  },
  {
    date: "05/05/2026 19:10",
    title: "Dejó una reseña",
    note: "⭐⭐⭐⭐⭐",
  },
  {
    date: "01/05/2026 18:30",
    title: "Nueva reserva",
    note: "Mesa 6 · 2 personas",
  },
];

const customerPreferences = [
  { label: "Mesa preferida", value: "Mesa 5 · Ventana" },
  { label: "Vino preferido", value: "Malbec de la Casa" },
  { label: "Menú favorito", value: "Menú Degustación" },
  { label: "Ocasiones especiales", value: "Aniversario, Cumpleaños" },
  { label: "Etiquetas", value: "Amante del vino, Veggie friendly, Viajero frecuente" },
];

const customerAllergies = ["Frutos secos", "Mariscos"];
const customerDietary = ["Vegetariana", "Sin gluten"];
const customerHistory = [
  { date: "15/05/2026", time: "21:00", table: "Mesa 8", spend: "$ 95.600" },
  { date: "01/05/2026", time: "21:30", table: "Mesa 6", spend: "$ 91.200" },
];

const visibleCustomerPreferences = customerPreferences.slice(0, 3);
const visibleCustomerActivity = customerActivity.slice(0, 4);
function LabIcon({
  name,
  className = "",
}: {
  name:
    | "users"
    | "vip"
    | "birthday"
    | "frequent"
    | "risk"
    | "search"
    | "filter"
    | "arrowRight"
    | "whatsapp"
    | "calendar"
    | "star"
    | "notes"
    | "activity"
    | "tag"
    | "mail"
    | "clock"
    | "spend"
    | "history";
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
          <circle cx="12" cy="8" r="3" />
          <path d="M5.5 19a6.5 6.5 0 0 1 13 0" />
        </svg>
      );
    case "vip":
      return (
        <svg className={className} {...common}>
          <path d="M5 7.5h14" />
          <path d="m7 7.5 2.2 9 2.8-5.5 2.8 5.5 2.2-9" />
        </svg>
      );
    case "birthday":
      return (
        <svg className={className} {...common}>
          <path d="M12 4v4" />
          <path d="M8 8h8a2 2 0 0 1 2 2v2H6v-2a2 2 0 0 1 2-2Z" />
          <path d="M6 12v7h12v-7" />
        </svg>
      );
    case "frequent":
      return (
        <svg className={className} {...common}>
          <path d="M6 17c1.8-3 4.2-4.5 6-4.5s4.2 1.5 6 4.5" />
          <circle cx="12" cy="8" r="3" />
        </svg>
      );
    case "risk":
      return (
        <svg className={className} {...common}>
          <path d="M12 5.5 20 19H4L12 5.5Z" />
          <path d="M12 9.5V13" />
          <path d="M12 16.2h.01" />
        </svg>
      );
    case "search":
      return (
        <svg className={className} {...common}>
          <circle cx="11" cy="11" r="5.5" />
          <path d="m15 15 4 4" />
        </svg>
      );
    case "filter":
      return (
        <svg className={className} {...common}>
          <path d="M4 6h16l-6 7v4l-4 2v-6L4 6Z" />
        </svg>
      );
    case "arrowRight":
      return (
        <svg className={className} {...common}>
          <path d="m9 6 6 6-6 6" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg className={className} {...common}>
          <path d="M12 20a8 8 0 1 0-6.9-4L4 20l4-1.1A8 8 0 0 0 12 20Z" />
          <path d="M9.6 8.8c.2-.4.4-.4.7-.4h.7c.2 0 .5 0 .7.4l.8 1.7c.1.3.1.5-.1.7l-.6.7c-.2.2-.2.5 0 .8.5.9 1.4 1.8 2.3 2.3.3.2.6.2.8 0l.7-.6c.2-.2.5-.2.7-.1l1.7.8c.4.2.4.5.4.7v.7c0 .3 0 .5-.4.7-.4.2-1.1.4-2 .4-3.7 0-6.7-3-6.7-6.7 0-.9.2-1.6.4-2Z" />
        </svg>
      );
    case "calendar":
      return (
        <svg className={className} {...common}>
          <rect x="4" y="5" width="16" height="14.5" rx="3" />
          <path d="M8 3.5v3M16 3.5v3M4 9h16" />
        </svg>
      );
    case "star":
      return (
        <svg className={className} {...common}>
          <path d="m12 4 2.4 4.9 5.4.8-3.9 3.8.9 5.4L12 16.6 7.2 19l.9-5.4L4.2 8.7l5.4-.8L12 4Z" />
        </svg>
      );
    case "notes":
      return (
        <svg className={className} {...common}>
          <path d="M6 4.5h12v15H6z" />
          <path d="M8.5 8.5h7M8.5 11.5h7M8.5 14.5H12" />
        </svg>
      );
    case "activity":
      return (
        <svg className={className} {...common}>
          <path d="M4 12h4l2-5 4 10 2-5h4" />
        </svg>
      );
    case "tag":
      return (
        <svg className={className} {...common}>
          <path d="M5 10V5h5l9 9-5 5-9-9Z" />
          <circle cx="8.2" cy="8.2" r="1.1" />
        </svg>
      );
    case "mail":
      return (
        <svg className={className} {...common}>
          <rect x="4" y="6" width="16" height="12" rx="2.5" />
          <path d="m5.5 8 6.5 5 6.5-5" />
        </svg>
      );
    case "clock":
      return (
        <svg className={className} {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case "spend":
      return (
        <svg className={className} {...common}>
          <path d="M7 7.5c1.3-1 3-1.5 5-1.5 3 0 5 1.2 5 3.2 0 3.4-8 2.5-8 5.5 0 1.6 1.5 2.3 3 2.3 1.7 0 3-.5 4-1.4" />
        </svg>
      );
    case "history":
      return (
        <svg className={className} {...common}>
          <path d="M5 6v4h4" />
          <path d="M5.5 10A7 7 0 1 1 7 17.2" />
          <path d="M12 8v4l3 2" />
        </svg>
      );
    default:
      return null;
  }
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

function customerTagClass(tag: string) {
  const normalized = tag.toLowerCase();
  if (normalized.includes("vip")) return styles.tagAmber;
  if (normalized.includes("riesgo")) return styles.tagRose;
  if (normalized.includes("frecu")) return styles.tagEmerald;
  if (normalized.includes("nuevo")) return styles.tagCyan;
  return styles.tagSlate;
}

export function LocalCrmLabPage() {
  const selectedCustomer = crmCustomers[0] ?? null;

  return (
      <main className={styles.page}>
        <header className={styles.pageHeader}>
          <div className={styles.pageHeading}>
            <div className={styles.pageEyebrow}>¡Bienvenido, Mariano!</div>
            <h1 className={styles.pageTitle}>
              CRM / Gestión de clientes <span className={styles.pageIcon}>👥</span>
            </h1>
            <p className={styles.pageSubtitle}>
              Conocé, segmentá y fidelizá a tus clientes para ofrecer experiencias memorables.
            </p>
          </div>

          <div className={styles.headerActions}>
            <button type="button" className={styles.secondaryButton}>
              Exportar clientes
            </button>
            <button type="button" className={styles.primaryButton}>
              <span className={styles.plusIcon}>+</span>
              Nuevo cliente
            </button>
          </div>
        </header>

        <section className={styles.crmMainGrid}>
          <div className={styles.leftColumn}>
            <section className={styles.metricGrid} aria-label="Métricas CRM">
              {crmMetrics.map((metric) => (
                <article key={metric.title} className={styles.metricCard}>
                  <div className={`${styles.metricIcon} ${toneClass(metric.tone)}`}>
                    <LabIcon
                      name={
                        metric.title === "Total clientes"
                          ? "users"
                          : metric.title === "Clientes VIP"
                            ? "vip"
                            : metric.title === "Cumpleaños próximos"
                              ? "birthday"
                              : metric.title === "Clientes frecuentes"
                                ? "frequent"
                                : "risk"
                      }
                      className={styles.metricIconSvg}
                    />
                  </div>

                  <div className={styles.metricLabel}>{metric.title}</div>
                  <div className={styles.metricValue}>{metric.value}</div>
                  <div className={styles.metricSubtitle}>{metric.subtitle}</div>
                  <div className={styles.metricFooter}>
                    <span>Hoy</span>
                    <span className={styles.metricLink}>{metric.footer}</span>
                  </div>
                </article>
              ))}
            </section>

            <div className={styles.segmentTabs}>
              {crmSegments.map((segment) => (
                <button
                  key={segment.key}
                  type="button"
                  className={`${styles.segmentTab} ${segment.key === 'all' ? styles.segmentTabActive : ''}`}
                >
                  <span>{segment.label}</span>
                  <strong>{segment.count}</strong>
                </button>
              ))}
            </div>

            <div className={styles.filtersBar}>
              <div className={`${styles.filterControl} ${styles.filterSearch}`}>
                <LabIcon name="search" className={styles.filterIcon} />
                <input
                  aria-label="Buscar por nombre, teléfono o email"
                  value="Buscar por nombre, teléfono o email..."
                  readOnly
                />
              </div>

              <div className={styles.filterControl}>
                <button type="button" className={styles.selectButton}>
                  <span>Segmento</span>
                  <strong>Todos</strong>
                </button>
              </div>

              <div className={styles.filterControl}>
                <button type="button" className={styles.selectButton}>
                  <span>Visitas</span>
                  <strong>Todas</strong>
                </button>
              </div>

              <div className={styles.filterControl}>
                <button type="button" className={styles.selectButton}>
                  <span>Ordenar por</span>
                  <strong>Más recientes</strong>
                </button>
              </div>

              <button type="button" className={styles.secondaryButton}>
                <LabIcon name="filter" className={styles.filterIcon} />
                Filtros
              </button>
            </div>

            <section className={`${styles.card} ${styles.customerTableCard}`}>
              <div className={styles.tableHeader}>
                <span>CLIENTE</span>
                <span>CONTACTO</span>
                <span>SEGMENTO</span>
                <span>ÚLTIMA VISITA</span>
                <span>PRÓXIMA RESERVA</span>
                <span>VISITAS</span>
                <span>GASTO PROMEDIO</span>
              </div>

              <div className={styles.customerRows}>
                {crmCustomers.map((customer) => (
                  <article
                    key={customer.id}
                    className={`${styles.customerRow} ${customer.selected ? styles.customerRowSelected : ''}`}
                  >
                    <div className={styles.customerCell}>
                      <div className={styles.customerAvatar}>{customer.initials}</div>
                      <div className={styles.customerNameBlock}>
                        <div className={styles.customerNameRow}>
                          <span className={styles.customerName}>{customer.name}</span>
                          {customer.tags.map((tag) => (
                            <span key={`${customer.id}-${tag}`} className={`${styles.customerTag} ${customerTagClass(tag)}`}>
                              {tag}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className={styles.customerContact}>
                      <div className={styles.contactRow}>
                        <LabIcon name="whatsapp" className={styles.contactIcon} />
                        <span>{customer.contact}</span>
                      </div>
                      <div className={styles.contactRow}>
                        <LabIcon name="mail" className={styles.contactIcon} />
                        <span>{customer.email}</span>
                      </div>
                    </div>

                    <div className={styles.customerSegment}>
                      <span className={styles.segmentPill}>{customer.tags.join(' · ')}</span>
                    </div>
                    <div className={styles.customerMeta}>{customer.lastVisit}</div>
                    <div className={styles.customerMeta}>{customer.nextReservation}</div>
                    <div className={styles.customerVisits}>{customer.visits}</div>
                    <div className={styles.customerSpend}>{customer.spend}</div>
                  </article>
                ))}
              </div>

              <div className={styles.tableFooter}>
                <div className={styles.pagination}>
                <span>Mostrando 1 a 8 de 1.248 clientes</span>
                <div className={styles.paginationControls}>
                  <button type="button" className={styles.paginationButton}>
                    &lt;
                  </button>
                  <button type="button" className={`${styles.paginationButton} ${styles.paginationButtonActive}`}>
                    1
                  </button>
                  <button type="button" className={styles.paginationButton}>
                    2
                  </button>
                  <button type="button" className={styles.paginationButton}>
                    3
                  </button>
                  <span className={styles.paginationDots}>...</span>
                  <button type="button" className={styles.paginationButton}>
                    156
                  </button>
                  <button type="button" className={styles.paginationButton}>
                    &gt;
                  </button>
                </div>
                <button type="button" className={styles.pageSizeButton}>
                  8 por página
                </button>
                </div>
              </div>
            </section>
          </div>

          <aside className={styles.rightColumn}>
            <section className={`${styles.card} ${styles.profilePanel}`}>
              <div className={styles.profileMainRow}>
                <div className={styles.profileIdentity}>
                  <div className={styles.profileAvatar}>{selectedCustomer?.initials}</div>
                  <div className={styles.profileText}>
                    <div className={styles.profileNameRow}>
                      <h2 className={styles.profileName}>{selectedCustomer?.name}</h2>
                      <button type="button" className={styles.iconGhostButton} aria-label="Más opciones">
                        ⋯
                      </button>
                    </div>
                    <span className={styles.vipBadge}>VIP</span>
                    <p className={styles.profileContactLine}>{selectedCustomer?.contact}</p>
                    <p className={styles.profileContactLine}>{selectedCustomer?.email}</p>
                  </div>
                </div>

                <div className={styles.profileActions}>
                  <button type="button" className={styles.whatsappButton}>
                    <LabIcon name="whatsapp" className={styles.actionIcon} />
                    Enviar WhatsApp
                  </button>
                  <button type="button" className={styles.primaryActionButton}>
                    Crear reserva
                  </button>
                  <button type="button" className={styles.secondaryActionButton}>
                    Editar cliente
                  </button>
                </div>
              </div>

              <div className={styles.profileStatsGrid}>
                <div className={styles.profileStat}>
                  <LabIcon name="birthday" className={styles.profileStatIcon} />
                  <span className={styles.profileStatLabel}>Cumpleaños</span>
                  <strong className={styles.profileStatValue}>12 de agosto</strong>
                </div>
                <div className={styles.profileStat}>
                  <LabIcon name="clock" className={styles.profileStatIcon} />
                  <span className={styles.profileStatLabel}>Última visita</span>
                  <strong className={styles.profileStatValue}>15/05/2026</strong>
                </div>
                <div className={styles.profileStat}>
                  <LabIcon name="calendar" className={styles.profileStatIcon} />
                  <span className={styles.profileStatLabel}>Próxima reserva</span>
                  <strong className={`${styles.profileStatValue} ${styles.profileStatValueMultiline}`}>
                    22/05/2026 · 13:00 · Mesa 5
                  </strong>
                </div>
                <div className={styles.profileStat}>
                  <LabIcon name="users" className={styles.profileStatIcon} />
                  <span className={styles.profileStatLabel}>Visitas</span>
                  <strong className={styles.profileStatValue}>8</strong>
                </div>
                <div className={styles.profileStat}>
                  <LabIcon name="spend" className={styles.profileStatIcon} />
                  <span className={styles.profileStatLabel}>Gasto promedio</span>
                  <strong className={styles.profileStatValue}>$ 92.300</strong>
                </div>
              </div>
            </section>

            <section className={styles.rightDetailsGrid}>
              <article className={`${styles.card} ${styles.detailCard} ${styles.detailCardTall}`}>
                <h3>Preferencias</h3>
                <div className={styles.detailList}>
                  {visibleCustomerPreferences.map((item) => (
                    <div key={item.label} className={styles.detailGroup}>
                      <span className={styles.detailLabel}>{item.label}</span>
                      <strong className={styles.detailValue}>{item.value}</strong>
                    </div>
                  ))}
                  <div className={styles.tagList}>
                    <span className={`${styles.tagPill} ${styles.tagPurple}`}>Aniversario</span>
                    <span className={`${styles.tagPill} ${styles.tagBlue}`}>Cumpleaños</span>
                    <span className={`${styles.tagPill} ${styles.tagGold}`}>Amante del vino</span>
                    <span className={`${styles.tagPill} ${styles.tagGreen}`}>Veggie friendly</span>
                    <span className={`${styles.tagPill} ${styles.tagBrown}`}>Viajero frecuente</span>
                  </div>
                </div>
              </article>

              <article className={`${styles.card} ${styles.detailCard} ${styles.detailCardTall}`}>
                <h3>Alergias e intolerancias</h3>
                <div className={styles.simpleList}>
                  {customerAllergies.map((allergy) => (
                    <span key={allergy} className={styles.listPill}>
                      {allergy}
                    </span>
                  ))}
                </div>
                <div className={styles.detailDivider} />
                <div className={styles.detailGroup}>
                  <span className={styles.detailLabel}>Preferencias dietarias</span>
                  <div className={styles.simpleList}>
                  {customerDietary.map((item) => (
                    <span key={item} className={styles.listPill}>
                      {item}
                    </span>
                  ))}
                  </div>
                </div>
                <div className={styles.detailDivider} />
                <div className={styles.detailGroup}>
                  <span className={styles.detailLabel}>Forma de contacto preferida</span>
                  <div className={styles.simpleList}>
                  <span className={`${styles.listPill} ${styles.whatsAppPill}`}>WhatsApp</span>
                  </div>
                </div>
                <div className={styles.detailDivider} />
                <div className={styles.detailGroup}>
                  <span className={styles.detailLabel}>Canal y antigüedad</span>
                  <div className={styles.metaGrid}>
                  <div>
                    <span>Canal de origen</span>
                    <strong>Instagram</strong>
                  </div>
                  <div>
                    <span>Cliente desde</span>
                    <strong>Febrero 2025</strong>
                  </div>
                  </div>
                </div>
              </article>

              <article className={`${styles.card} ${styles.detailCard} ${styles.detailCardTall}`}>
                <h3>Actividad reciente</h3>
                <div className={styles.activityTimeline}>
                  {visibleCustomerActivity.map((item) => (
                    <div key={`${item.date}-${item.title}`} className={styles.activityItem}>
                      <span className={styles.activityDot} />
                      <div className={styles.activityContent}>
                        <time>{item.date}</time>
                        <strong>{item.title}</strong>
                        <span>{item.note}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <button type="button" className={styles.linkButton}>
                  Ver toda la actividad
                </button>
              </article>
            </section>

            <section className={styles.rightBottomGrid}>
              <article className={`${styles.card} ${styles.detailCard} ${styles.detailCardCompact}`}>
                <h3>Historial de reservas (8)</h3>
                <div className={styles.historyTable}>
                  <div className={styles.historyHeader}>
                    <span>FECHA</span>
                    <span>HORA</span>
                    <span>MESA</span>
                    <span>GASTO</span>
                  </div>
                  {customerHistory.map((item) => (
                    <div key={`${item.date}-${item.time}`} className={styles.compactRow}>
                      <span>{item.date}</span>
                      <span>{item.time}</span>
                      <span>{item.table}</span>
                      <strong>{item.spend}</strong>
                    </div>
                  ))}
                </div>
                <button type="button" className={styles.linkButton}>
                  Ver todas las reservas
                </button>
              </article>

              <article className={`${styles.card} ${styles.detailCard} ${styles.detailCardCompact}`}>
                <h3>Consumos y preferencias</h3>
                <div className={styles.detailList}>
                  <div className={styles.detailGroup}>
                    <span className={styles.detailLabel}>Vino preferido</span>
                    <strong className={styles.detailValue}>Malbec de la Casa</strong>
                  </div>
                  <div className={styles.detailGroup}>
                    <span className={styles.detailLabel}>Plato favorito</span>
                    <strong className={styles.detailValue}>Ravioles de cordero</strong>
                  </div>
                  <div className={styles.detailGroup}>
                    <span className={styles.detailLabel}>Bebida preferida</span>
                    <strong className={styles.detailValue}>Agua con gas</strong>
                  </div>
                </div>
                <button type="button" className={styles.linkButton}>
                  Ver más preferencias
                </button>
              </article>
            </section>
          </aside>
        </section>
      </main>
  );
}



