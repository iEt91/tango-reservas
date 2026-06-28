"use client";

import { useState } from "react";
import styles from "./LocalPlanoLabPage.module.css";

type IconName =
  | "calendar"
  | "chevronDown"
  | "chevronLeft"
  | "chevronRight"
  | "filter"
  | "plus"
  | "upload"
  | "undo"
  | "redo"
  | "target"
  | "image"
  | "monitor"
  | "reservas"
  | "plan"
  | "crm"
  | "settings"
  | "menu"
  | "web"
  | "reportes"
  | "chair"
  | "dot"
  | "link";

type TableStatus = "available" | "reserved" | "occupied" | "offline";
type TableShape = "round" | "square" | "rect";

type MockTable = {
  id: number;
  name: string;
  seats: number;
  status: TableStatus;
  shape: TableShape;
  x: number;
  y: number;
  w: number;
  h: number;
};

type FloorStat = {
  label: string;
  value: string;
  subtitle: string;
  tone: "green" | "red" | "blue" | "gray" | "amber";
  icon: IconName;
};

type HourlySegment = {
  hour: string;
  percent: number;
};

const mockTables: MockTable[] = [
  { id: 1, name: "Mesa 1", seats: 2, status: "available", shape: "round", x: 20, y: 18, w: 92, h: 92 },
  { id: 2, name: "Mesa 2", seats: 4, status: "reserved", shape: "square", x: 40, y: 17, w: 96, h: 96 },
  { id: 3, name: "Mesa 3", seats: 4, status: "occupied", shape: "round", x: 62, y: 17, w: 92, h: 92 },
  { id: 4, name: "Mesa 4", seats: 6, status: "available", shape: "rect", x: 80, y: 18, w: 150, h: 74 },
  { id: 5, name: "Mesa 5", seats: 2, status: "available", shape: "square", x: 16, y: 43, w: 92, h: 78 },
  { id: 6, name: "Mesa 6", seats: 6, status: "reserved", shape: "round", x: 44, y: 43, w: 108, h: 108 },
  { id: 7, name: "Mesa 7", seats: 4, status: "available", shape: "round", x: 70, y: 46, w: 96, h: 96 },
  { id: 8, name: "Mesa 8", seats: 8, status: "available", shape: "rect", x: 20, y: 76, w: 210, h: 78 },
  { id: 9, name: "Mesa 9", seats: 4, status: "offline", shape: "rect", x: 53, y: 77, w: 130, h: 70 },
  { id: 10, name: "Mesa 10", seats: 8, status: "occupied", shape: "rect", x: 79, y: 77, w: 210, h: 74 },
];

const floorStats: FloorStat[] = [
  { label: "Mesas libres", value: "6", subtitle: "18 cubiertos", tone: "green", icon: "chair" },
  { label: "Mesas ocupadas", value: "4", subtitle: "30 cubiertos", tone: "red", icon: "chair" },
  { label: "Mesas reservadas", value: "5", subtitle: "30 cubiertos", tone: "blue", icon: "link" },
  { label: "Fuera de servicio", value: "1", subtitle: "4 cubiertos", tone: "gray", icon: "dot" },
  { label: "Reservas sin mesa", value: "2", subtitle: "4 personas", tone: "amber", icon: "calendar" },
];

const hourlyOccupancySegments: HourlySegment[] = [
  { hour: "11:00", percent: 16 },
  { hour: "12:00", percent: 28 },
  { hour: "13:00", percent: 42 },
  { hour: "14:00", percent: 58 },
  { hour: "15:00", percent: 74 },
  { hour: "16:00", percent: 85 },
  { hour: "17:00", percent: 68 },
  { hour: "18:00", percent: 72 },
  { hour: "19:00", percent: 78 },
  { hour: "20:00", percent: 71 },
  { hour: "21:00", percent: 60 },
  { hour: "22:00", percent: 44 },
];

const statusLabel: Record<TableStatus, string> = {
  available: "Disponible",
  reserved: "Reservada",
  occupied: "Ocupada",
  offline: "Fuera de servicio",
};

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
    case "plus":
      return (
        <svg className={className} {...common}>
          <path d="M12 5.5v13" />
          <path d="M5.5 12h13" />
        </svg>
      );
    case "upload":
      return (
        <svg className={className} {...common}>
          <path d="M12 16V4.5" />
          <path d="m7.5 8.5 4.5-4 4.5 4" />
          <path d="M5 18.5h14" />
        </svg>
      );
    case "undo":
      return (
        <svg className={className} {...common}>
          <path d="M9 9H5v-4" />
          <path d="M5.2 9.2A7.5 7.5 0 1 1 7 17.5" />
        </svg>
      );
    case "redo":
      return (
        <svg className={className} {...common}>
          <path d="M15 9h4V5" />
          <path d="M18.8 9.2A7.5 7.5 0 1 0 17 17.5" />
        </svg>
      );
    case "target":
      return (
        <svg className={className} {...common}>
          <circle cx="12" cy="12" r="8.2" />
          <path d="M12 7.8v2.4" />
          <path d="M12 13.8v2.4" />
          <path d="M7.8 12h2.4" />
          <path d="M13.8 12h2.4" />
        </svg>
      );
    case "image":
      return (
        <svg className={className} {...common}>
          <rect x="3.5" y="4.5" width="17" height="15" rx="3" />
          <path d="m6 15 3.5-3.5 3.2 3.2 2-2 3.8 3.8" />
          <circle cx="9" cy="9" r="1.4" />
        </svg>
      );
    case "monitor":
      return (
        <svg className={className} {...common}>
          <rect x="4" y="5" width="16" height="11" rx="2.2" />
          <path d="M9 18h6" />
          <path d="M12 16v2" />
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
    case "chair":
      return (
        <svg className={className} {...common}>
          <path d="M7 9V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v3" />
          <path d="M6 10h12v5H6z" />
          <path d="M8 15v3" />
          <path d="M16 15v3" />
        </svg>
      );
    case "dot":
      return (
        <svg className={className} {...common}>
          <circle cx="12" cy="12" r="4.5" />
        </svg>
      );
    case "link":
      return (
        <svg className={className} {...common}>
          <path d="M10 14a4 4 0 0 1 0-5.7l1.3-1.3a4 4 0 0 1 5.7 5.7l-.7.7" />
          <path d="M14 10a4 4 0 0 1 0 5.7l-1.3 1.3a4 4 0 0 1-5.7-5.7l.7-.7" />
        </svg>
      );
    default:
      return null;
  }
}

function getTableClassName(status: TableStatus) {
  switch (status) {
    case "available":
      return styles.tableAvailable;
    case "reserved":
      return styles.tableReserved;
    case "occupied":
      return styles.tableOccupied;
    case "offline":
      return styles.tableOffline;
    default:
      return styles.tableAvailable;
  }
}

function getChairOffsets(table: MockTable) {
  const base = [
    { left: "50%", top: "-9%", transform: "translate(-50%, -50%)" },
    { left: "109%", top: "50%", transform: "translate(-50%, -50%)" },
    { left: "50%", top: "109%", transform: "translate(-50%, -50%)" },
    { left: "-9%", top: "50%", transform: "translate(-50%, -50%)" },
  ];

  if (table.shape === "rect") {
    return [
      { left: "16%", top: "-10%", transform: "translate(-50%, -50%)" },
      { left: "50%", top: "-10%", transform: "translate(-50%, -50%)" },
      { left: "84%", top: "-10%", transform: "translate(-50%, -50%)" },
      { left: "16%", top: "110%", transform: "translate(-50%, -50%)" },
      { left: "50%", top: "110%", transform: "translate(-50%, -50%)" },
      { left: "84%", top: "110%", transform: "translate(-50%, -50%)" },
    ];
  }

  if (table.seats >= 6) {
    return [
      { left: "50%", top: "-9%", transform: "translate(-50%, -50%)" },
      { left: "105%", top: "22%", transform: "translate(-50%, -50%)" },
      { left: "105%", top: "78%", transform: "translate(-50%, -50%)" },
      { left: "50%", top: "109%", transform: "translate(-50%, -50%)" },
      { left: "-5%", top: "78%", transform: "translate(-50%, -50%)" },
      { left: "-5%", top: "22%", transform: "translate(-50%, -50%)" },
    ];
  }

  return base;
}

function getTimelineColor(percent: number) {
  if (percent < 40) {
    return styles.timelineLow;
  }

  if (percent < 70) {
    return styles.timelineMid;
  }

  return styles.timelineHigh;
}

export function LocalPlanoLabPage() {
  const [selectedTableId, setSelectedTableId] = useState(6);
  const selectedTable =
    mockTables.find((table) => table.id === selectedTableId) ?? mockTables[5] ?? mockTables[0];

  return (
    <div className={styles.page}>
      <div className={styles.content}>
        <header className={styles.pageHeader}>
          <div className={styles.pageHeading}>
            <div className={styles.pageEyebrow}>¡Bienvenido, Mariano!</div>
            <h1 className={styles.pageTitle}>
              Plano del salón <LabIcon name="target" className={styles.pageSpark} />
            </h1>
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

        <section className={styles.planoGrid}>
          <div className={styles.leftMain}>
            <section className={styles.floorPlanCard}>
              <div className={styles.planToolbar}>
                <div className={styles.toolbarGroup}>
                  <button type="button" className={styles.primaryButton}>
                    <LabIcon name="plus" className={styles.buttonIcon} />
                    <span>Agregar mesa</span>
                  </button>
                  <button type="button" className={styles.secondaryButton}>
                    <LabIcon name="upload" className={styles.buttonIcon} />
                    <span>Importar plano</span>
                  </button>
                  <button type="button" className={styles.iconButton} aria-label="Deshacer">
                    <LabIcon name="undo" className={styles.buttonIcon} />
                  </button>
                  <button type="button" className={`${styles.iconButton} ${styles.iconButtonDisabled}`} aria-label="Rehacer">
                    <LabIcon name="redo" className={styles.buttonIcon} />
                  </button>
                  <div className={styles.zoomControl}>
                    <button type="button" className={styles.iconButton} aria-label="Alejar">
                      <LabIcon name="chevronLeft" className={styles.buttonIcon} />
                    </button>
                    <span>100%</span>
                    <button type="button" className={styles.iconButton} aria-label="Acercar">
                      <LabIcon name="chevronRight" className={styles.buttonIcon} />
                    </button>
                  </div>
                  <button type="button" className={styles.secondaryButton}>
                    <LabIcon name="target" className={styles.buttonIcon} />
                    <span>Centrar vista</span>
                  </button>
                  <button type="button" className={styles.secondaryButton}>
                    <LabIcon name="image" className={styles.buttonIcon} />
                    <span>Fondo</span>
                  </button>
                </div>

                <div className={styles.toolbarGroup}>
                  <div className={styles.viewSwitch}>
                    <button type="button" className={styles.viewSwitchActive}>
                      2D
                    </button>
                    <button type="button">Imagen</button>
                  </div>
                  <button type="button" className={styles.secondaryButton}>
                    <span>Estado</span>
                    <span className={styles.selectValue}>Todos</span>
                    <LabIcon name="chevronDown" className={styles.controlChevron} />
                  </button>
                </div>
              </div>

              <div className={styles.floorCanvas}>
                <div className={styles.canvasGrid} aria-hidden="true" />
                <div className={styles.canvasWalls} aria-hidden="true" />
                <div className={styles.canvasPlants} aria-hidden="true" />

                {mockTables.map((table) => {
                  const selected = table.id === selectedTable.id;
                  return (
                    <button
                      key={table.id}
                      type="button"
                      className={[
                        styles.tableNode,
                        table.shape === "round" ? styles.tableRound : styles.tableRect,
                        getTableClassName(table.status),
                        selected ? styles.tableSelected : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      style={{
                        left: `${table.x}%`,
                        top: `${table.y}%`,
                        width: `${table.w}px`,
                        height: `${table.h}px`,
                      }}
                      onClick={() => setSelectedTableId(table.id)}
                    >
                      <span className={styles.tableBody}>
                        <span className={styles.tableName}>{table.name}</span>
                        <span className={styles.tableSeats}>{table.seats}</span>
                      </span>
                      <span className={`${styles.tableBadge} ${getTableClassName(table.status)}`}>
                        {statusLabel[table.status]}
                      </span>
                      <span className={styles.chairs}>
                        {getChairOffsets(table).map((offset, index) => (
                          <span
                            key={`${table.id}-chair-${index}`}
                            className={styles.chair}
                            style={offset}
                          />
                        ))}
                      </span>
                    </button>
                  );
                })}
              </div>

              <div className={styles.canvasLegend}>
                <span>
                  <i className={`${styles.legendDot} ${styles.legendAvailable}`} />
                  Disponible
                </span>
                <span>
                  <i className={`${styles.legendDot} ${styles.legendReserved}`} />
                  Reservada
                </span>
                <span>
                  <i className={`${styles.legendDot} ${styles.legendOccupied}`} />
                  Ocupada
                </span>
                <span>
                  <i className={`${styles.legendDot} ${styles.legendOffline}`} />
                  Fuera de servicio
                </span>
              </div>
            </section>

            <section className={styles.statsRow}>
              <section className={styles.occupancyCard}>
                <div className={styles.occupancyHeader}>
                  <div>
                    <div className={styles.occupancyEyebrow}>Ocupación del salón (hoy)</div>
                    <div className={styles.occupancyTitle}>72%</div>
                    <div className={styles.occupancyMeta}>78 / 108 cubiertos</div>
                  </div>

                  <div className={styles.occupancyDonut} aria-hidden="true">
                    <span>72%</span>
                  </div>
                </div>
              </section>

              <div className={styles.floorStatsGrid}>
                {floorStats.map((stat) => (
                  <article key={stat.label} className={styles.floorStatCard}>
                    <div className={`${styles.floorStatIcon} ${styles[`tone${stat.tone}`]}`}>
                      <LabIcon name={stat.icon} className={styles.floorStatIconSvg} />
                    </div>
                    <div className={styles.floorStatLabel}>{stat.label}</div>
                    <div className={styles.floorStatValue}>{stat.value}</div>
                    <div className={styles.floorStatSubtitle}>{stat.subtitle}</div>
                  </article>
                ))}
              </div>

              <section className={`${styles.summaryCard} ${styles.capacityCard}`}>
                <div className={styles.capacityMetric}>
                  <span className={styles.summaryCardLabel}>Capacidad total</span>
                  <div className={styles.inlineMetric}>
                    <span className={styles.summaryCardValue}>108</span>
                    <span className={styles.summaryCardMeta}>cubiertos</span>
                  </div>
                </div>

                <div className={styles.capacityMetric}>
                  <span className={styles.summaryCardLabel}>Mesas activas</span>
                  <div className={styles.inlineMetric}>
                    <span className={styles.summaryCardValue}>16</span>
                    <span className={styles.summaryCardMeta}>de 17</span>
                  </div>
                </div>
              </section>
            </section>
          </div>

          <aside className={styles.rightColumn}>
            <section className={styles.selectedPanel}>
              <div className={styles.selectedPanelHeader}>
                <div>
                  <div className={styles.selectedPanelEyebrow}>Mesa seleccionada</div>
                  <h3 className={styles.selectedPanelTitle}>
                    Mesa 6 <span className={styles.selectedPill}>Reservada</span>
                  </h3>
                </div>
              </div>

              <div className={styles.selectedForm}>
                <div className={styles.selectedFieldsRow}>
                  <label className={styles.selectedField}>
                    <span>Nombre de la mesa</span>
                    <input value="Mesa 6" readOnly />
                  </label>

                  <label className={styles.selectedField}>
                    <span>Capacidad</span>
                    <div className={styles.capacityControl}>
                      <button type="button" className={styles.smallControlButton}>
                        -
                      </button>
                      <input value="6" readOnly />
                      <button type="button" className={styles.smallControlButton}>
                        +
                      </button>
                    </div>
                  </label>
                </div>

                <div className={styles.twoColumnFields}>
                  <label className={styles.selectedField}>
                    <span>Forma</span>
                    <button type="button" className={styles.selectField}>
                      <span>Redonda</span>
                      <LabIcon name="chevronDown" className={styles.controlChevron} />
                    </button>
                  </label>

                  <label className={styles.selectedField}>
                    <span>Estado</span>
                    <button type="button" className={styles.selectField}>
                      <span>Reservada</span>
                      <LabIcon name="chevronDown" className={styles.controlChevron} />
                    </button>
                  </label>
                </div>

                <div className={styles.doubleFields}>
                  <label className={styles.selectedField}>
                    <span>Ancho</span>
                    <input value="120 cm" readOnly />
                  </label>
                  <label className={styles.selectedField}>
                    <span>Alto</span>
                    <input value="120 cm" readOnly />
                  </label>
                </div>

                <label className={styles.selectedField}>
                  <span>Rotación</span>
                  <div className={styles.sliderField}>
                    <span>0°</span>
                    <div className={styles.sliderTrack}>
                      <span className={styles.sliderThumb} />
                    </div>
                  </div>
                </label>

                <label className={styles.selectedField}>
                  <span>Radio de esquinas</span>
                  <div className={styles.sliderField}>
                    <span>60 px</span>
                    <div className={styles.sliderTrack}>
                      <span className={styles.sliderThumb} />
                    </div>
                  </div>
                </label>

                <div className={styles.selectedPanelActions}>
                  <button type="button" className={styles.primaryButton}>
                    Guardar cambios
                  </button>
                  <button type="button" className={styles.dangerButton}>
                    Eliminar mesa
                  </button>
                </div>
              </div>
            </section>
          </aside>
        </section>

        <section className={styles.hourlySection}>
          <div className={styles.timelineHeader}>
            <div>
              <div className={styles.timelineTitle}>
                Ocupación por horario <span>(Jueves, 22 de mayo)</span>
              </div>
            </div>
          </div>

          <div className={styles.timelineChart}>
            <div className={styles.timelineLabels}>
              {hourlyOccupancySegments.map((segment) => (
                <span key={segment.hour}>{segment.hour}</span>
              ))}
              <span>23:00</span>
            </div>

            <div className={styles.timelineTrack}>
              {hourlyOccupancySegments.map((segment) => (
                <div
                  key={segment.hour}
                  className={`${styles.timelineSegment} ${getTimelineColor(segment.percent)}`}
                  title={`${segment.hour} - ${segment.percent}%`}
                />
              ))}
              <div className={styles.timelineMarker} aria-hidden="true" />
            </div>

            <div className={styles.timelineLegend}>
              <span>
                <i className={styles.legendLow} />
                0-39%
              </span>
              <span>
                <i className={styles.legendMid} />
                40-69%
              </span>
              <span>
                <i className={styles.legendHigh} />
                70-100%
              </span>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
