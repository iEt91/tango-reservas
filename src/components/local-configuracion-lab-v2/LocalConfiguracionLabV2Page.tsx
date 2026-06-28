import type { ReactNode } from "react";
import styles from "./LocalConfiguracionLabV2Page.module.css";

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
  | "image"
  | "spark";

type BusinessField = {
  label: string;
  value: string;
  type?: "text" | "select";
  icon?: IconName;
};

type ReservationSetting =
  | {
      title: string;
      description: string;
      kind: "toggle";
      checked: boolean;
    }
  | {
      title: string;
      description: string;
      kind: "select";
      value: string;
    }
  | {
      title: string;
      description: string;
      kind: "range";
      value: string;
    };

type HourRow = {
  day: string;
  open: boolean;
  openTime: string;
  closeTime: string;
  breakStart: string;
  breakEnd: string;
};

type ServiceRow = {
  name: string;
  description: string;
  duration: string;
  capacity: string;
  active: boolean;
  color: "violet" | "cyan" | "amber";
};

type NotificationRow = {
  title: string;
  description: string;
  email: boolean;
  whatsapp: boolean;
  color: "cyan" | "blue" | "slate";
};

const businessFields: BusinessField[] = [
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

const reservationSettings: ReservationSetting[] = [
  {
    title: "Auto-confirmación de reservas",
    description: "Confirmar automáticamente según disponibilidad",
    kind: "toggle",
    checked: true,
  },
  {
    title: "Duración estándar del servicio",
    description: "Tiempo estimado por reserva",
    kind: "select",
    value: "2:00 hs",
  },
  {
    title: "Intervalo entre horarios",
    description: "Separación mínima entre turnos",
    kind: "select",
    value: "15 min",
  },
  {
    title: "Anticipación máxima",
    description: "Días antes que se puede reservar",
    kind: "select",
    value: "60 días",
  },
  {
    title: "Cantidad máxima por reserva",
    description: "Límite de comensales por reserva",
    kind: "select",
    value: "12 personas",
  },
  {
    title: "Permitir reservas luego del cierre",
    description: "Permitir reservas fuera del horario comercial",
    kind: "toggle",
    checked: false,
  },
  {
    title: "Horarios de admisión de reservas",
    description: "Definí el rango horario en el que se pueden reservar",
    kind: "range",
    value: "08:00 - 22:00",
  },
];

const hours: HourRow[] = [
  { day: "Lunes", open: true, openTime: "12:00", closeTime: "23:30", breakStart: "16:00", breakEnd: "19:00" },
  { day: "Martes", open: true, openTime: "12:00", closeTime: "23:30", breakStart: "16:00", breakEnd: "19:00" },
  { day: "Miércoles", open: true, openTime: "12:00", closeTime: "23:30", breakStart: "16:00", breakEnd: "19:00" },
  { day: "Jueves", open: true, openTime: "12:00", closeTime: "00:00", breakStart: "16:00", breakEnd: "19:00" },
  { day: "Viernes", open: true, openTime: "12:00", closeTime: "00:30", breakStart: "16:00", breakEnd: "19:00" },
  { day: "Sábado", open: true, openTime: "12:00", closeTime: "00:30", breakStart: "16:00", breakEnd: "19:00" },
  { day: "Domingo", open: true, openTime: "12:00", closeTime: "23:00", breakStart: "16:00", breakEnd: "19:00" },
];

const services: ServiceRow[] = [
  { name: "Menú degustación", description: "Experiencia completa", duration: "2:30 hs", capacity: "24 pax", active: true, color: "violet" },
  { name: "Cena a la carta", description: "Servicio regular", duration: "2:00 hs", capacity: "40 pax", active: true, color: "cyan" },
  { name: "Almuerzo especial", description: "Menú ejecutivo", duration: "1:30 hs", capacity: "30 pax", active: false, color: "amber" },
];

const notifications: NotificationRow[] = [
  { title: "Nuevas reservas", description: "Recibir alertas de nuevas reservas", email: true, whatsapp: true, color: "cyan" },
  { title: "Cancelaciones", description: "Recibir alertas de cancelaciones", email: true, whatsapp: true, color: "blue" },
  { title: "Recordatorios", description: "Recordatorios automáticos por email/WhatsApp", email: true, whatsapp: false, color: "slate" },
  { title: "Recordatorio al cliente", description: "Enviar recordatorio antes de la reserva (24 hs)", email: true, whatsapp: true, color: "blue" },
];

const businessHeroImage = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#7c4a20" />
        <stop offset="58%" stop-color="#1f2937" />
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

function Icon({ name, className = "" }: { name: IconName; className?: string }) {
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
    case "image":
      return (
        <svg className={className} {...common}>
          <rect x="4" y="5" width="16" height="14" rx="2.5" />
          <path d="m7 14 2.5-2.5 3 3 2-2 2.5 2.5" />
          <circle cx="9" cy="9" r="1.2" />
        </svg>
      );
    case "spark":
      return (
        <svg className={className} {...common}>
          <path d="M12 3.5 14 10l6.5 2-6.5 2-2 6.5-2-6.5-6.5-2 6.5-2 2-6.5Z" />
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
    <div className={styles.sectionHeader}>
      <div className={styles.sectionTitle}>
        <Icon name={icon} className={styles.sectionIcon} />
        <h2>{title}</h2>
      </div>
      {action ? <div className={styles.sectionAction}>{action}</div> : null}
    </div>
  );
}

function Field({ field }: { field: BusinessField }) {
  return (
    <label className={styles.field}>
      <span>{field.label}</span>
      <div className={styles.inputLike}>
        <span>{field.value}</span>
        {field.type === "select" ? <Icon name="chevronDown" className={styles.chevronIcon} /> : null}
      </div>
    </label>
  );
}

function Toggle({ checked }: { checked: boolean }) {
  return (
    <button
      type="button"
      className={`${styles.switch} ${checked ? styles.switchOn : ""}`}
      aria-pressed={checked}
    >
      <span />
    </button>
  );
}

function TimeButton({ value }: { value: string }) {
  return (
    <button type="button" className={styles.timeButton}>
      <span>{value}</span>
      <Icon name="chevronDown" className={styles.chevronIcon} />
    </button>
  );
}

function IconButton({ icon, label }: { icon: IconName; label: string }) {
  return (
    <button type="button" className={styles.iconButton} aria-label={label}>
      <Icon name={icon} className={styles.iconButtonSvg} />
    </button>
  );
}

export function LocalConfiguracionLabV2Page() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <section className={styles.hero}>
          <div className={styles.heroLeft}>
            <div className={styles.heroIcon}>
              <Icon name="settings" />
            </div>
            <div className={styles.heroCopy}>
              <div className={styles.heroTitleRow}>
                <h1>Configuración del negocio</h1>
                <Icon name="spark" className={styles.sparkIcon} />
              </div>
              <p>
                Ajustá la configuración operativa, el comportamiento de las reservas y
                las opciones públicas de tu restaurante.
              </p>
            </div>
          </div>

          <aside className={styles.businessIdentity}>
            <div
              className={styles.businessAvatar}
              style={{ backgroundImage: `url("${businessHeroImage}")` }}
              aria-hidden="true"
            />
            <div className={styles.businessMeta}>
              <strong>Demuru</strong>
              <span>Restaurante de autor</span>
              <div className={styles.businessBottom}>
                <span className={styles.locationPill}>
                  <Icon name="location" />
                  Pinamar
                </span>
                <span className={styles.activePill}>Activo</span>
              </div>
            </div>
          </aside>
        </section>

        <section className={styles.grid}>
          <article className={`${styles.card} ${styles.businessCard}`}>
            <SectionHeader icon="building" title="Datos del negocio" />
            <div className={styles.businessFields}>
              {businessFields.map((field) => (
                <Field key={field.label} field={field} />
              ))}
            </div>
          </article>

          <article className={`${styles.card} ${styles.reservationCard}`}>
            <SectionHeader icon="calendar" title="Reservas" />
            <div className={styles.reservationList}>
              {reservationSettings.map((setting) => (
                <div key={setting.title} className={styles.settingRow}>
                  <div className={styles.settingCopy}>
                    <strong>{setting.title}</strong>
                    <span>{setting.description}</span>
                  </div>

                  {setting.kind === "toggle" ? (
                    <Toggle checked={setting.checked} />
                  ) : setting.kind === "select" ? (
                    <button type="button" className={styles.selectButton}>
                      <span>{setting.value}</span>
                      <Icon name="chevronDown" className={styles.chevronIcon} />
                    </button>
                  ) : (
                    <button type="button" className={styles.rangeButton}>
                      <span>{setting.value}</span>
                      <Icon name="edit" className={styles.editTiny} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </article>

          <article className={`${styles.card} ${styles.hoursCard}`}>
            <SectionHeader icon="clock" title="Horarios comerciales" />
            <div className={styles.hoursTable}>
              <div className={styles.hoursHead}>
                <span>Día</span>
                <span>Apertura</span>
                <span>Cierre</span>
                <span>Descanso</span>
                <span />
              </div>

              {hours.map((row) => (
                <div key={row.day} className={styles.hoursRow}>
                  <div className={styles.dayCell}>
                    <Toggle checked={row.open} />
                    <span>{row.day}</span>
                  </div>
                  <TimeButton value={row.openTime} />
                  <TimeButton value={row.closeTime} />
                  <div className={styles.breakCell}>
                    <TimeButton value={row.breakStart} />
                    <TimeButton value={row.breakEnd} />
                  </div>
                  <IconButton icon="trash" label={`Eliminar horario ${row.day}`} />
                </div>
              ))}

              <button type="button" className={styles.addSpecial}>
                + Agregar horario especial
              </button>
            </div>
          </article>

          <article className={`${styles.card} ${styles.servicesCard}`}>
            <SectionHeader
              icon="service"
              title="Servicios"
              action={
                <button type="button" className={styles.newServiceButton}>
                  <Icon name="plus" />
                  <span>Nuevo servicio</span>
                </button>
              }
            />

            <div className={styles.servicesTable}>
              <div className={styles.servicesHead}>
                <span>Servicio</span>
                <span>Duración</span>
                <span>Capacidad</span>
                <span>Estado</span>
                <span>Acciones</span>
              </div>

              {services.map((service) => (
                <div key={service.name} className={styles.serviceRow}>
                  <div className={styles.serviceNameCell}>
                    <span className={`${styles.serviceIcon} ${styles[`serviceIcon_${service.color}`]}`}>
                      <Icon name="service" />
                    </span>
                    <div>
                      <strong>{service.name}</strong>
                      <span>{service.description}</span>
                    </div>
                  </div>
                  <strong className={styles.metricText}>{service.duration}</strong>
                  <strong className={styles.metricText}>{service.capacity}</strong>
                  <span className={`${styles.stateBadge} ${service.active ? styles.stateActive : styles.stateInactive}`}>
                    {service.active ? "Activo" : "Inactivo"}
                  </span>
                  <div className={styles.actionsCell}>
                    <IconButton icon="edit" label={`Editar ${service.name}`} />
                    <button type="button" className={styles.moreButton} aria-label={`Más acciones ${service.name}`}>
                      ...
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </article>

          <article className={`${styles.card} ${styles.webCard}`}>
            <SectionHeader icon="globe" title="Web pública" />
            <div className={styles.webLayout}>
              <div className={styles.webOptions}>
                <div className={styles.webToggle}>
                  <div>
                    <strong>Mostrar menú en la web</strong>
                    <span>Publicar menú actual en el sitio</span>
                  </div>
                  <Toggle checked />
                </div>
                <div className={styles.webToggle}>
                  <div>
                    <strong>Mostrar botón de WhatsApp</strong>
                    <span>Mostrar contacto directo en la web</span>
                  </div>
                  <Toggle checked />
                </div>
                <div className={styles.webToggle}>
                  <div>
                    <strong>Recibir reservas desde la web</strong>
                    <span>Habilitar formulario de reservas online</span>
                  </div>
                  <Toggle checked />
                </div>

                <label className={styles.messageBox}>
                  <span>Mensaje de bienvenida</span>
                  <textarea
                    defaultValue="Bienvenidos a Demuru, restaurante de autor en Pinamar. Una experiencia única frente al mar."
                  />
                  <strong>85/200</strong>
                </label>
              </div>

              <aside className={styles.coverColumn}>
                <span>Imagen de portada</span>
                <div className={styles.coverPreview}>
                  <div className={styles.coverSun} />
                  <div className={styles.coverWindow} />
                  <div className={styles.coverWater} />
                </div>
                <button type="button" className={styles.changeImageButton}>
                  <Icon name="image" />
                  Cambiar imagen
                </button>
                <small>Recomendado: 1920x1080px</small>
              </aside>
            </div>
          </article>

          <article className={`${styles.card} ${styles.notificationsCard}`}>
            <SectionHeader icon="bell" title="Notificaciones" />
            <div className={styles.notificationList}>
              {notifications.map((notification) => (
                <div key={notification.title} className={styles.notificationRow}>
                  <span className={`${styles.notificationIcon} ${styles[`notificationIcon_${notification.color}`]}`}>
                    <Icon name="bell" />
                  </span>
                  <div className={styles.notificationCopy}>
                    <strong>{notification.title}</strong>
                    <span>{notification.description}</span>
                  </div>
                  <div className={styles.notificationChannels}>
                    <Icon name="mail" />
                    <Toggle checked={notification.email} />
                    <Icon name="whatsapp" />
                    <Toggle checked={notification.whatsapp} />
                  </div>
                </div>
              ))}
            </div>
          </article>
        </section>

        <footer className={styles.footer}>
          <div className={styles.footerMessage}>
            <Icon name="shield" />
            <span>Tus cambios se guardan de forma segura. Último guardado: Hoy, 12:45</span>
          </div>

          <div className={styles.footerActions}>
            <button type="button" className={styles.secondaryButton}>
              Vista previa web
              <Icon name="external" />
            </button>
            <button type="button" className={styles.secondaryButton}>Descartar cambios</button>
            <button type="button" className={styles.primaryButton}>Guardar cambios</button>
          </div>
        </footer>
      </div>
    </main>
  );
}
