import type { ReactNode } from "react";
import styles from "./LocalConfiguracionLabPage.module.css";

type FieldPair = {
  label: string;
  value: string;
  type?: "input" | "select";
};

type HourRow = {
  day: string;
  active: boolean;
  open: string;
  close: string;
  breakStart: string;
  breakEnd: string;
};

type ServiceRow = {
  title: string;
  subtitle: string;
  duration: string;
  capacity: string;
  active: boolean;
};

type NotificationRow = {
  title: string;
  description: string;
};

type IconName =
  | "settings"
  | "building"
  | "calendar"
  | "clock"
  | "service"
  | "globe"
  | "bell"
  | "location"
  | "shield"
  | "edit"
  | "trash"
  | "plus"
  | "external"
  | "mail"
  | "whatsapp"
  | "chevronDown"
  | "desktop"
  | "image"
  | "menu"
  | "chart";

const businessFields: FieldPair[] = [
  { label: "Nombre del negocio", value: "Demuru" },
  { label: "Slug (URL)", value: "demuru" },
  { label: "Rubro", value: "Restaurante de autor", type: "select" },
  { label: "Teléfono", value: "+54 9 11 6677 8899" },
  { label: "Email", value: "reservas@demuru.com" },
  { label: "Dirección", value: "Av. del Libertador 1234" },
  { label: "Localidad", value: "Pinamar, Buenos Aires" },
  { label: "Código postal", value: "7167" },
  { label: "Instagram", value: "@demuru.restaurant" },
  { label: "WhatsApp", value: "+54 9 11 6677 8899" },
];

const reservationSettings = [
  {
    label: "Auto-confirmación de reservas",
    description: "Confirmar automáticamente según disponibilidad",
    checked: true,
    kind: "toggle" as const,
  },
  {
    label: "Duración estándar del servicio",
    description: "Tiempo estimado por reserva",
    value: "2:00 hs",
    kind: "select" as const,
  },
  {
    label: "Intervalo entre horarios",
    description: "Separación mínima entre turnos",
    value: "15 min",
    kind: "select" as const,
  },
  {
    label: "Anticipación máxima",
    description: "Días antes que se puede reservar",
    value: "60 días",
    kind: "select" as const,
  },
  {
    label: "Cantidad máxima por reserva",
    description: "Límite de comensales por reserva",
    value: "12 personas",
    kind: "select" as const,
  },
  {
    label: "Permitir reservas luego del cierre",
    description: "Permitir reservas fuera del horario comercial",
    checked: false,
    kind: "toggle" as const,
  },
];

const commercialHours: HourRow[] = [
  { day: "Lunes", active: true, open: "12:00", close: "23:30", breakStart: "16:00", breakEnd: "19:00" },
  { day: "Martes", active: true, open: "12:00", close: "23:30", breakStart: "16:00", breakEnd: "19:00" },
  { day: "Miércoles", active: true, open: "12:00", close: "23:30", breakStart: "16:00", breakEnd: "19:00" },
  { day: "Jueves", active: true, open: "12:00", close: "00:00", breakStart: "16:00", breakEnd: "19:00" },
  { day: "Viernes", active: true, open: "12:00", close: "00:30", breakStart: "16:00", breakEnd: "19:00" },
  { day: "Sábado", active: true, open: "12:00", close: "00:30", breakStart: "16:00", breakEnd: "19:00" },
  { day: "Domingo", active: true, open: "12:00", close: "23:00", breakStart: "16:00", breakEnd: "19:00" },
];

const services: ServiceRow[] = [
  {
    title: "Menú degustación",
    subtitle: "Experiencia completa",
    duration: "2:30 hs",
    capacity: "24 pax",
    active: true,
  },
  {
    title: "Cena a la carta",
    subtitle: "Servicio regular",
    duration: "2:00 hs",
    capacity: "40 pax",
    active: true,
  },
  {
    title: "Almuerzo especial",
    subtitle: "Menú ejecutivo",
    duration: "1:30 hs",
    capacity: "30 pax",
    active: false,
  },
];

const notifications: NotificationRow[] = [
  {
    title: "Nuevas reservas",
    description: "Recibir alertas de nuevas reservas",
  },
  {
    title: "Cancelaciones",
    description: "Recibir alertas de cancelaciones",
  },
  {
    title: "Recordatorios",
    description: "Recordatorios automáticos por email/WhatsApp",
  },
  {
    title: "Recordatorio al cliente",
    description: "Enviar recordatorio antes de la reserva (24 hs)",
  },
];

const businessHeroImage = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#7c4a20" />
        <stop offset="55%" stop-color="#1f2937" />
        <stop offset="100%" stop-color="#0f172a" />
      </linearGradient>
      <radialGradient id="sun" cx="50%" cy="28%" r="45%">
        <stop offset="0%" stop-color="#fef3c7" stop-opacity="0.95" />
        <stop offset="100%" stop-color="#f59e0b" stop-opacity="0" />
      </radialGradient>
    </defs>
    <rect width="160" height="160" rx="80" fill="url(#bg)" />
    <circle cx="88" cy="54" r="44" fill="url(#sun)" />
    <rect x="18" y="90" width="124" height="38" rx="14" fill="#111827" fill-opacity="0.72" />
    <path d="M20 98h120" stroke="#fbbf24" stroke-opacity="0.22" />
    <path d="M24 95c12-15 28-23 48-23s36 8 48 23" fill="none" stroke="#fde68a" stroke-opacity="0.25" stroke-width="3" />
    <rect x="32" y="45" width="28" height="56" rx="12" fill="#f97316" fill-opacity="0.45" />
    <rect x="68" y="38" width="24" height="63" rx="12" fill="#fb923c" fill-opacity="0.55" />
    <rect x="98" y="50" width="26" height="51" rx="12" fill="#ea580c" fill-opacity="0.45" />
  </svg>
`)}`
  .replace(/\s+/g, " ")
  .trim();

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
    case "settings":
      return (
        <svg className={className} {...common}>
          <circle cx="12" cy="12" r="3.1" />
          <path d="M19 12a7 7 0 0 0-.08-1.03l2.08-1.62-1.96-3.4-2.48.98a7.2 7.2 0 0 0-1.78-1.03l-.38-2.63h-3.92l-.38 2.63a7.2 7.2 0 0 0-1.78 1.03l-2.48-.98-1.96 3.4L5.08 10.97A7 7 0 0 0 5 12c0 .35.03.69.08 1.03L3 14.65l1.96 3.4 2.48-.98c.55.4 1.14.74 1.78 1.03l.38 2.63h3.92l.38-2.63c.64-.29 1.23-.63 1.78-1.03l2.48.98 1.96-3.4-2.08-1.62c.05-.34.08-.68.08-1.03Z" />
        </svg>
      );
    case "building":
      return (
        <svg className={className} {...common}>
          <path d="M6 20V5.5h8V20" />
          <path d="M6 9h-2v11h16V9h-2" />
          <path d="M9 8h2M9 12h2M9 16h2" />
          <path d="M14 11h2M14 15h2" />
        </svg>
      );
    case "calendar":
      return (
        <svg className={className} {...common}>
          <rect x="4" y="5" width="16" height="14" rx="3" />
          <path d="M8 3.5v3M16 3.5v3M4 9h16" />
        </svg>
      );
    case "clock":
      return (
        <svg className={className} {...common}>
          <circle cx="12" cy="12" r="8.5" />
          <path d="M12 7.5V12l3 2" />
        </svg>
      );
    case "service":
      return (
        <svg className={className} {...common}>
          <path d="M5 13h14a4 4 0 0 0-4-4h-1.5a5 5 0 0 0-9 2.5V13Z" />
          <path d="M4.5 13.5h15" />
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
    case "bell":
      return (
        <svg className={className} {...common}>
          <path d="M7.5 9.5a4.5 4.5 0 1 1 9 0c0 5 2 6 2 6H5.5s2-1 2-6Z" />
          <path d="M10 18a2 2 0 0 0 4 0" />
        </svg>
      );
    case "location":
      return (
        <svg className={className} {...common}>
          <path d="M12 21s6-5.3 6-10.3A6 6 0 1 0 6 10.7C6 15.7 12 21 12 21Z" />
          <circle cx="12" cy="10.5" r="2" />
        </svg>
      );
    case "shield":
      return (
        <svg className={className} {...common}>
          <path d="M12 3.5 19 6v5.4c0 4.4-3.1 7.5-7 9.1-3.9-1.6-7-4.7-7-9.1V6l7-2.5Z" />
          <path d="m9.5 12 1.6 1.6 3.5-3.8" />
        </svg>
      );
    case "edit":
      return (
        <svg className={className} {...common}>
          <path d="m4 20 4.8-1 9.9-9.9a1.7 1.7 0 0 0 0-2.4l-.4-.4a1.7 1.7 0 0 0-2.4 0L6 15.8 4 20Z" />
          <path d="m13.5 7.5 3 3" />
        </svg>
      );
    case "trash":
      return (
        <svg className={className} {...common}>
          <path d="M5 7h14" />
          <path d="M9 7V5.5h6V7" />
          <path d="M8 7.5v11h8v-11" />
          <path d="M10.5 10v5M13.5 10v5" />
        </svg>
      );
    case "plus":
      return (
        <svg className={className} {...common}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "external":
      return (
        <svg className={className} {...common}>
          <path d="M10 6H6.5A2.5 2.5 0 0 0 4 8.5v9A2.5 2.5 0 0 0 6.5 20h9A2.5 2.5 0 0 0 18 17.5V14" />
          <path d="m13 4 7 7" />
          <path d="M14 4h6v6" />
        </svg>
      );
    case "mail":
      return (
        <svg className={className} {...common}>
          <rect x="4" y="6" width="16" height="12" rx="2.5" />
          <path d="m5.5 8 6.5 5 6.5-5" />
        </svg>
      );
    case "whatsapp":
      return (
        <svg className={className} {...common}>
          <path d="M12 20a8 8 0 1 0-6.9-4L4 20l4-1.1A8 8 0 0 0 12 20Z" />
          <path d="M9.6 8.8c.2-.4.4-.4.7-.4h.7c.2 0 .5 0 .7.4l.8 1.7c.1.3.1.5-.1.7l-.6.7c-.2.2-.2.5 0 .8.5.9 1.4 1.8 2.3 2.3.3.2.6.2.8 0l.7-.6c.2-.2.5-.2.7-.1l1.7.8c.4.2.4.5.4.7v.7c0 .3 0 .5-.4.7-.4.2-1.1.4-2 .4-3.7 0-6.7-3-6.7-6.7 0-.9.2-1.6.4-2Z" />
        </svg>
      );
    case "chevronDown":
      return (
        <svg className={className} {...common}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "desktop":
      return (
        <svg className={className} {...common}>
          <rect x="4" y="5" width="16" height="12" rx="2.5" />
          <path d="M8 19h8M10 17v2M14 17v2" />
        </svg>
      );
    case "image":
      return (
        <svg className={className} {...common}>
          <rect x="4" y="5" width="16" height="14" rx="2.5" />
          <path d="m7 14 2.5-2.5 3 3 2-2 2.5 2.5" />
          <circle cx="9" cy="9" r="1.2" />
        </svg>
      );
    case "menu":
      return (
        <svg className={className} {...common}>
          <path d="M4.5 7.5h15" />
          <path d="M4.5 12h15" />
          <path d="M4.5 16.5h15" />
        </svg>
      );
    case "chart":
      return (
        <svg className={className} {...common}>
          <path d="M5 19h14" />
          <path d="M8 16V9" />
          <path d="M12 16V5.5" />
          <path d="M16 16v-5" />
        </svg>
      );
    default:
      return null;
  }
}

function SectionHeader({
  icon,
  title,
  action,
}: {
  icon: IconName;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.panelHeader}>
      <div className={styles.panelHeaderTitle}>
        <span className={styles.panelHeaderIcon}>
          <Icon name={icon} />
        </span>
        <h2>{title}</h2>
      </div>
      {action ? <div className={styles.panelHeaderAction}>{action}</div> : null}
    </div>
  );
}

function FieldCard({ field }: { field: FieldPair }) {
  return (
    <label className={styles.fieldCard}>
      <span className={styles.fieldLabel}>{field.label}</span>
      {field.type === "select" ? (
        <button type="button" className={styles.fieldSelect}>
          <span>{field.value}</span>
          <Icon name="chevronDown" />
        </button>
      ) : (
        <div className={styles.fieldInput}>{field.value}</div>
      )}
    </label>
  );
}

function ToggleRow({
  label,
  description,
  checked,
}: {
  label: string;
  description: string;
  checked: boolean;
}) {
  return (
    <div className={styles.toggleRow}>
      <div className={styles.toggleCopy}>
        <strong>{label}</strong>
        <span>{description}</span>
      </div>
      <button
        type="button"
        className={`${styles.switch} ${checked ? styles.switchOn : ""}`}
        aria-pressed={checked}
      >
        <span className={styles.switchThumb} />
      </button>
    </div>
  );
}

function TimePill({ value, muted = false }: { value: string; muted?: boolean }) {
  return (
    <button type="button" className={`${styles.timePill} ${muted ? styles.timePillMuted : ""}`}>
      <span>{value}</span>
      <Icon name="chevronDown" />
    </button>
  );
}

export function LocalConfiguracionLabPage() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>

        <header className={styles.configHero}>
          <div className={styles.heroLeft}>
            <span className={styles.heroBadge}>
              <Icon name="settings" />
            </span>
            <div className={styles.heroText}>
              <div className={styles.heroTitleRow}>
                <h1>Configuración del negocio</h1>
                <span className={styles.heroSpark}>✦</span>
              </div>
              <p>
                Ajustá la configuración operativa, el comportamiento de las reservas y
                las opciones públicas de tu restaurante.
              </p>
            </div>
          </div>

          <div className={styles.heroRight}>
            <div className={styles.heroBusinessAvatarWrap}>
              <div
                className={styles.heroBusinessAvatar}
                style={{ backgroundImage: `url("${businessHeroImage}")` }}
                aria-hidden="true"
              />
            </div>
            <div className={styles.heroBusinessMeta}>
              <div className={styles.heroBusinessName}>Demuru</div>
              <div className={styles.heroBusinessType}>Restaurante de autor</div>
              <div className={styles.heroBusinessBottom}>
                <span className={styles.heroLocation}>
                  <Icon name="location" />
                  Pinamar
                </span>
                <span className={styles.statusBadge}>Activo</span>
              </div>
            </div>
          </div>
        </header>

        <section className={styles.topRow}>
          <article className={`${styles.card} ${styles.businessCard}`}>
            <header className={styles.cardHeader}>
              <SectionHeader icon="building" title="Datos del negocio" />
            </header>
            <div className={styles.cardBody}>
              <div className={styles.businessForm}>
                {businessFields.map((field) => (
                  <FieldCard key={field.label} field={field} />
                ))}
              </div>
            </div>
          </article>

          <article className={`${styles.card} ${styles.reservationsCard}`}>
            <header className={styles.cardHeader}>
              <SectionHeader icon="calendar" title="Reservas" />
            </header>
            <div className={styles.cardBody}>
              <div className={styles.reservationSettingsList}>
                {reservationSettings.map((setting) =>
                  setting.kind === "toggle" ? (
                    <ToggleRow
                      key={setting.label}
                      label={setting.label}
                      description={setting.description}
                      checked={Boolean(setting.checked)}
                    />
                  ) : (
                    <div key={setting.label} className={styles.settingRow}>
                      <div className={styles.settingText}>
                        <strong className={styles.settingTitle}>{setting.label}</strong>
                        <span className={styles.settingDescription}>{setting.description}</span>
                      </div>
                      <button type="button" className={styles.settingSelect}>
                        <span>{setting.value}</span>
                        <Icon name="chevronDown" />
                      </button>
                    </div>
                  ),
                )}

                <div className={styles.admissionBox}>
                  <div className={styles.settingText}>
                    <strong className={styles.settingTitle}>Horarios de admisi?n de reservas</strong>
                    <span className={styles.settingDescription}>Defin? el rango horario en el que se pueden reservar</span>
                  </div>
                  <button type="button" className={styles.admissionValue}>
                    <span>08:00 - 22:00</span>
                    <Icon name="edit" />
                  </button>
                </div>
              </div>
            </div>
          </article>

          <article className={`${styles.card} ${styles.hoursCard}`}>
            <header className={styles.cardHeader}>
              <SectionHeader icon="clock" title="Horarios comerciales" />
            </header>
            <div className={styles.cardBody}>
              <div className={styles.hoursTable}>
                <div className={styles.hoursHeader}>
                  <span>D?A</span>
                  <span>APERTURA</span>
                  <span>CIERRE</span>
                  <span>DESCANSO</span>
                </div>

                {commercialHours.map((row) => (
                  <div key={row.day} className={styles.hoursRow}>
                    <div className={styles.hoursDay}>
                      <button
                        type="button"
                        className={`${styles.switch} ${styles.switchOn}`}
                        aria-pressed="true"
                      >
                        <span className={styles.switchThumb} />
                      </button>
                      <span className={styles.dayName}>{row.day}</span>
                    </div>
                    <TimePill value={row.open} />
                    <TimePill value={row.close} />
                    <div className={styles.breakRange}>
                      <TimePill value={row.breakStart} muted />
                      <TimePill value={row.breakEnd} muted />
                    </div>
                    <button type="button" className={styles.trashButton} aria-label={`Eliminar horario de ${row.day}`}>
                      <Icon name="trash" />
                    </button>
                  </div>
                ))}

                <button type="button" className={styles.specialHoursButton}>
                  + Agregar horario especial
                </button>
              </div>
            </div>
          </article>
        </section>
        <section className={styles.bottomRow}>
          <article className={`${styles.card} ${styles.servicesCard}`}>
            <header className={styles.cardHeader}>
              <SectionHeader
                icon="service"
                title="Servicios"
                action={
                  <button type="button" className={styles.newServiceButton}>
                    <Icon name="plus" />
                    Nuevo servicio
                  </button>
                }
              />
            </header>

            <div className={styles.cardBody}>
              <div className={styles.servicesTable}>
                <div className={styles.serviceHeader}>
                  <span>SERVICIO</span>
                  <span>DURACI?N</span>
                  <span>CAPACIDAD</span>
                  <span>ESTADO</span>
                  <span>ACCIONES</span>
                </div>

                {services.map((service) => (
                  <div key={service.title} className={styles.serviceRow}>
                    <div className={styles.serviceMain}>
                      <strong className={styles.serviceName}>{service.title}</strong>
                      <span className={styles.serviceDescription}>{service.subtitle}</span>
                    </div>
                    <span>{service.duration}</span>
                    <span>{service.capacity}</span>
                    <span className={`${styles.stateBadge} ${service.active ? styles.stateActive : styles.stateInactive}`}>
                      {service.active ? "Activo" : "Inactivo"}
                    </span>
                    <div className={styles.actionCluster}>
                      <button type="button" className={styles.iconButton} aria-label={`Editar ${service.title}`}>
                        <Icon name="edit" />
                      </button>
                      <button type="button" className={styles.iconButton} aria-label={`M?s acciones de ${service.title}`}>
                        <span className={styles.moreDots}>???</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>

          <article className={`${styles.card} ${styles.webCard}`}>
            <header className={styles.cardHeader}>
              <SectionHeader icon="globe" title="Web p?blica" />
            </header>
            <div className={styles.cardBody}>
              <div className={styles.publicWebLayout}>
                <div className={styles.publicWebSettings}>
                  <ToggleRow
                    label="Mostrar men? en la web"
                    description="Publicar men? actual en el sitio"
                    checked
                  />
                  <ToggleRow
                    label="Mostrar bot?n de WhatsApp"
                    description="Mostrar contacto directo en la web"
                    checked
                  />
                  <ToggleRow
                    label="Recibir reservas desde la web"
                    description="Habilitar formulario de reservas online"
                    checked
                  />

                  <label className={styles.messageField}>
                    <span>Mensaje de bienvenida</span>
                    <textarea
                      value="Bienvenidos a Demuru, restaurante de autor en Pinamar. Una experiencia ?nica frente al mar."
                      readOnly
                      rows={4}
                    />
                    <strong className={styles.characterCount}>85/200</strong>
                  </label>
                </div>

                <div className={styles.publicWebPreview}>
                  <div className={styles.previewLabel}>Imagen de portada</div>
                  <div className={styles.coverPreview}>
                    <div className={styles.previewGlow} />
                    <div className={styles.previewSky} />
                    <div className={styles.previewWindow} />
                    <div className={styles.previewWater} />
                  </div>
                  <button type="button" className={styles.changeImageButton}>
                    <Icon name="image" />
                    Cambiar imagen
                  </button>
                  <span className={styles.previewHint}>Recomendado: 1920x1080px</span>
                </div>
              </div>
            </div>
          </article>

          <article className={`${styles.card} ${styles.notificationsCard}`}>
            <header className={styles.cardHeader}>
              <SectionHeader icon="bell" title="Notificaciones" />
            </header>
            <div className={styles.cardBody}>
              <div className={styles.notificationList}>
                {notifications.map((item) => (
                  <div key={item.title} className={styles.notificationRow}>
                    <span className={styles.notificationIcon}>
                      <Icon name="bell" />
                    </span>
                    <div className={styles.notificationCopy}>
                      <strong className={styles.notificationTitle}>{item.title}</strong>
                      <span className={styles.notificationDescription}>{item.description}</span>
                    </div>
                    <div className={styles.notificationChannels}>
                      <span className={styles.channelBadge}>
                        <Icon name="mail" />
                      </span>
                      <button type="button" className={`${styles.channelToggle} ${styles.switchOn}`} aria-pressed="true">
                        <span className={styles.channelToggleKnob} />
                      </button>
                      <span className={styles.channelBadge}>
                        <Icon name="whatsapp" />
                      </span>
                      <button type="button" className={`${styles.channelToggle} ${styles.switchOn}`} aria-pressed="true">
                        <span className={styles.channelToggleKnob} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </section>
        <footer className={styles.footerBar}>
          <div className={styles.footerMessage}>
            <span className={styles.footerShield}>
              <Icon name="shield" />
            </span>
            <span>Tus cambios se guardan de forma segura. Último guardado: Hoy, 12:45</span>
          </div>

          <div className={styles.footerActions}>
            <button type="button" className={styles.footerSecondaryButton}>
              Vista previa web
              <Icon name="external" />
            </button>
            <button type="button" className={styles.footerSecondaryButton}>
              Descartar cambios
            </button>
            <button type="button" className={styles.footerPrimaryButton}>
              Guardar cambios
            </button>
          </div>
        </footer>
      </div>
    </main>
  );
}
