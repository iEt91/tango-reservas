import styles from "./LocalReportesLabPage.module.css";

type Tone = "green" | "blue" | "cyan" | "red" | "violet" | "amber";
type IconName = "money" | "calendar" | "ticket" | "clock" | "warning" | "users" | "repeat" | "coin" | "download" | "chart" | "chevron" | "info";

type Kpi = {
  label: string;
  value: string;
  delta: string;
  sub: string;
  icon: IconName;
  tone: Tone;
  negative?: boolean;
};

const kpis: Kpi[] = [
  { label: "Ingresos totales", value: "$ 8.742.300", delta: "+18.7%", sub: "vs 30 días anteriores", icon: "money", tone: "green" },
  { label: "Reservas totales", value: "1.248", delta: "+12.4%", sub: "vs 30 días anteriores", icon: "calendar", tone: "blue" },
  { label: "Ticket promedio", value: "$ 6.998", delta: "+6.1%", sub: "vs 30 días anteriores", icon: "ticket", tone: "cyan" },
  { label: "Ocupación promedio", value: "68%", delta: "+8.2%", sub: "vs 30 días anteriores", icon: "clock", tone: "blue" },
  { label: "No-show %", value: "4,3%", delta: "-0.6 pp", sub: "vs 30 días anteriores", icon: "warning", tone: "red", negative: true },
  { label: "Clientes nuevos", value: "342", delta: "+15.9%", sub: "vs 30 días anteriores", icon: "users", tone: "green" },
  { label: "Clientes recurrentes", value: "906", delta: "+10.3%", sub: "vs 30 días anteriores", icon: "repeat", tone: "violet" },
  { label: "Valor prom. por reserva", value: "$ 7.007", delta: "+5.2%", sub: "vs 30 días anteriores", icon: "coin", tone: "amber" },
];

const services = [
  ["Menú degustación", "423 reservas", "33.9%"],
  ["Cena a la carta", "362 reservas", "29.0%"],
  ["Almuerzo ejecutivo", "214 reservas", "17.1%"],
  ["Brunch de fin de semana", "128 reservas", "10.3%"],
  ["Experiencia en terraza", "121 reservas", "9.7%"],
];

const areas = [
  ["Terraza", "78%", "$ 2.812.500", "$ 7.235", "78%"],
  ["Salón principal", "71%", "$ 3.124.900", "$ 7.102", "71%"],
  ["Salón privado", "65%", "$ 1.456.300", "$ 6.873", "65%"],
  ["Bar", "56%", "$ 841.200", "$ 6.102", "56%"],
  ["Salón íntimo", "52%", "$ 507.400", "$ 6.105", "52%"],
];

const clients = [
  ["VD", "Valeria del Mar", "12", "$ 134.200", "$ 11.183"],
  ["JM", "Juan Martín López", "10", "$ 98.400", "$ 9.840"],
  ["AG", "Ana García", "9", "$ 87.600", "$ 9.733"],
  ["CR", "Carlos Rojas", "8", "$ 76.300", "$ 9.538"],
  ["MR", "María Eugenia Ruiz", "7", "$ 65.900", "$ 9.414"],
];

const detail = [
  ["Jueves, 22 de mayo", "51", "104", "$ 816.300", "$ 7.849", "2 (3.9%)", "2 (3.9%)", "72%", "+9%"],
  ["Miércoles, 21 de mayo", "47", "98", "$ 768.200", "$ 7.839", "1 (2.1%)", "1 (2.1%)", "69%", "+7%"],
  ["Martes, 20 de mayo", "43", "89", "$ 704.500", "$ 7.915", "3 (7.0%)", "2 (4.7%)", "66%", "+6%"],
  ["Lunes, 19 de mayo", "38", "74", "$ 582.900", "$ 7.877", "1 (2.6%)", "1 (2.6%)", "58%", "+4%"],
  ["Domingo, 18 de mayo", "42", "86", "$ 641.900", "$ 7.641", "2 (4.8%)", "1 (2.4%)", "63%", "+5%"],
  ["Sabado, 17 de mayo", "56", "118", "$ 892.400", "$ 7.563", "1 (1.8%)", "2 (3.6%)", "78%", "+11%"],

];

const linePoints = [42, 54, 49, 58, 47, 52, 56, 69, 82, 53, 46, 51, 44, 59, 46, 66, 49, 58, 41, 64, 47, 67, 56, 61, 72, 90];
const bars = [45, 66, 58, 72, 50, 61, 74, 80, 43, 63, 58, 52, 76, 61, 38, 54, 67, 73, 47, 64, 58, 50, 68, 61, 54, 74];

function Icon({ name }: { name: IconName }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, viewBox: "0 0 24 24" };
  switch (name) {
    case "money": return <svg {...p}><rect x="4" y="6" width="16" height="12" rx="2" /><path d="M8 12h.01M12 12a2 2 0 1 0 0 .01M16 12h.01" /></svg>;
    case "calendar": return <svg {...p}><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /></svg>;
    case "ticket": return <svg {...p}><path d="M5 8a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2a2 2 0 0 0 0 4v2a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-2a2 2 0 0 0 0-4V8Z" /><path d="M13 7v10" /></svg>;
    case "clock": return <svg {...p}><circle cx="12" cy="12" r="8" /><path d="M12 7v5l3 2" /></svg>;
    case "warning": return <svg {...p}><path d="M12 4 21 20H3L12 4Z" /><path d="M12 9v5M12 17h.01" /></svg>;
    case "users": return <svg {...p}><circle cx="9" cy="9" r="3" /><circle cx="17" cy="10" r="2.2" /><path d="M3.5 19a5.5 5.5 0 0 1 11 0M14.5 19a4 4 0 0 1 6 0" /></svg>;
    case "repeat": return <svg {...p}><path d="M17 3 21 7l-4 4" /><path d="M3 11V9a3 3 0 0 1 3-3h15" /><path d="m7 21-4-4 4-4" /><path d="M21 13v2a3 3 0 0 1-3 3H3" /></svg>;
    case "coin": return <svg {...p}><circle cx="12" cy="12" r="8" /><path d="M12 8v8M15 10a2.5 2.5 0 0 0-3-2 2.2 2.2 0 0 0 0 4.2 2.2 2.2 0 0 1 0 4.2 2.5 2.5 0 0 1-3-2" /></svg>;
    case "download": return <svg {...p}><path d="M12 4v10" /><path d="m8 10 4 4 4-4" /><path d="M5 20h14" /></svg>;
    case "chart": return <svg {...p}><path d="M4 19V5" /><path d="M4 19h16" /><path d="M8 16v-5M12 16V8M16 16v-8M20 16v-3" /></svg>;
    case "chevron": return <svg {...p}><path d="m6 9 6 6 6-6" /></svg>;
    case "info": return <svg {...p}><circle cx="12" cy="12" r="9" /><path d="M12 10v6M12 7h.01" /></svg>;
  }
}

function KpiCard({ kpi }: { kpi: Kpi }) {
  return (
    <article className={styles.kpiCard}>
      <div className={`${styles.kpiIcon} ${styles[kpi.tone]}`}><Icon name={kpi.icon} /></div>
      <span>{kpi.label}</span>
      <strong>{kpi.value}</strong>
      <p className={styles.kpiDelta}><b className={kpi.negative ? styles.bad : styles.good}>{kpi.negative ? "↘" : "↗"} {kpi.delta}</b><small>{kpi.sub}</small></p>
    </article>
  );
}

function LineChart() {
  const pts = linePoints.map((v, i) => `${(i / (linePoints.length - 1)) * 100},${100 - v}`).join(" ");
  return (
    <article className={`${styles.card} ${styles.salesCard}`}>
      <header><div><h2>Ingresos / Ventas por día <Icon name="info" /></h2><strong>$ 8.742.300 <b>↗ +18.7%</b></strong></div><button>Ingresos <Icon name="chevron" /></button></header>
      <div className={styles.lineWrap}>
        <div className={styles.yAxis}><span>$ 400k</span><span>$ 300k</span><span>$ 200k</span><span>$ 100k</span><span>$ 0</span></div>
        <svg viewBox="0 0 100 100" preserveAspectRatio="none"><polyline points={`0,100 ${pts} 100,100`} className={styles.fillLine} /><polyline points={pts} className={styles.mainLine} />{linePoints.map((v, i) => <circle key={i} cx={(i / (linePoints.length - 1)) * 100} cy={100 - v} r="1.2" />)}</svg>
        <div className={styles.xAxis}><span>22 Abr</span><span>27 Abr</span><span>2 May</span><span>7 May</span><span>12 May</span><span>17 May</span><span>22 May</span></div>
      </div>
    </article>
  );
}

function BarChart() {
  return (
    <article className={`${styles.card} ${styles.barCard}`}>
      <header><div><h2>Reservas por día</h2><strong>1.248 <b>↗ +12.4%</b></strong></div><button>Por día <Icon name="chevron" /></button></header>
      <div className={styles.barWrap}>{bars.map((h, i) => <i key={i} style={{ height: `${h}%` }} />)}</div>
      <div className={styles.xAxis}><span>22 Abr</span><span>27 Abr</span><span>2 May</span><span>7 May</span><span>12 May</span><span>17 May</span><span>22 May</span></div>
    </article>
  );
}

function Donut() {
  return (
    <article className={`${styles.card} ${styles.originCard}`}>
      <h2>Origen de reservas</h2>
      <strong>1.248</strong>
      <div className={styles.originBody}>
        <div className={styles.donut}><b>1.248</b><span>Total</span></div>
        <div className={styles.originList}>
          <p><i className={styles.web} />Web <b>38% (474)</b></p>
          <p><i className={styles.whatsapp} />WhatsApp <b>28% (349)</b></p>
          <p><i className={styles.instagram} />Instagram <b>14% (175)</b></p>
          <p><i className={styles.phone} />Teléfono <b>12% (150)</b></p>
          <p><i className={styles.walkin} />Walk-in <b>8% (100)</b></p>
        </div>
      </div>
    </article>
  );
}

function Heatmap() {
  const days = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
  const hours = ["12:00", "13:00", "14:00", "15:00", "19:00", "20:00", "21:00", "22:00"];
  const values = [25,28,36,44,38,55,50,29,36,44,61,58,72,65,30,40,58,78,66,84,75,24,35,48,60,65,80,70,39,52,60,74,83,95,90,47,58,67,78,88,100,94,35,46,58,71,80,90,84,26,38,45,55,64,72,66];
  return (
    <article className={`${styles.card} ${styles.heatCard}`}>
      <h2>Mapa de ocupación <span>(promedio por franja)</span></h2>
      <div className={styles.heatGrid}>
        <span />{days.map(d => <b key={d}>{d}</b>)}
        {hours.map((h, r) => <div className={styles.heatRow} key={h}><em>{h}</em>{days.map((d, c) => <i key={d} style={{ opacity: 0.38 + values[r * days.length + c] / 115 }} />)}</div>)}
      </div>
      <div className={styles.heatLegend}><span>0%</span><b /><span>100%</span></div>
    </article>
  );
}

function Services() {
  return <article className={`${styles.card} ${styles.servicesCard}`}><h2>Top servicios / menús más reservados</h2>{services.map((s, i) => <div className={styles.serviceRow} key={s[0]}><span>{i + 1}</span><i className={styles[`food${i}`]} /><div><strong>{s[0]}</strong><small>{s[1]}</small></div><b>{s[2]}</b></div>)}</article>;
}

function CancelChart() {
  return (
    <article className={`${styles.card} ${styles.cancelCard}`}>
      <h2>Cancelaciones y no-show</h2>
      <div className={styles.legend}><span><i className={styles.redDot} />Canceladas</span><span><i className={styles.orangeDot} />No-show</span></div>
      <div className={styles.cancelStats}>
        <p><span>Canceladas</span><strong>58</strong><small>4.6% del total</small></p>
        <p><span>No-show</span><strong>54</strong><small>4.3% del total</small></p>
      </div>
      <div className={styles.cancelDeltaRow}>
        <div className={styles.cancelDeltaItem}><span>Variación canceladas</span><b>↘ -8.2%</b></div>
        <div className={styles.cancelDeltaItem}><span>Variación no-show</span><b>↘ -0.6 pp</b></div>
      </div>
    </article>
  );
}

function Area() {
  return <article className={`${styles.card} ${styles.areaCard}`}><h2>Rendimiento por área / zona</h2><div className={styles.areaHead}><span>Área</span><span>Ocupación</span><span>Ingresos</span><span>Ticket prom.</span></div>{areas.map(a => <div className={styles.areaRow} key={a[0]}><strong>{a[0]}</strong><span>{a[1]}<i><b style={{ width: a[4] }} /></i></span><span>{a[2]}</span><span>{a[3]}</span></div>)}</article>;
}

function Clients() {
  return <article className={`${styles.card} ${styles.clientsCard}`}><h2>Top clientes <span>(frecuencia y gasto)</span></h2><div className={styles.clientHead}><span /><span>Cliente</span><span>Reservas</span><span>Gasto total</span><span>Ticket prom.</span></div>{clients.map(c => <div className={styles.clientRow} key={c[1]}><i>{c[0]}</i><strong>{c[1]}</strong><span>{c[2]}</span><span>{c[3]}</span><span>{c[4]}</span></div>)}</article>;
}

function DetailTable() {
  return (
    <article className={styles.detailCard}>
      <header><h2>Detalle de reportes</h2><label>Mostrar <select defaultValue="10 filas"><option>10 filas</option><option>25 filas</option><option>50 filas</option></select></label></header>
      <div className={styles.detailHead}><span>Fecha</span><span>Reservas</span><span>Cubiertos</span><span>Ingresos</span><span>Ticket promedio</span><span>Canceladas</span><span>No-show</span><span>Ocupación promedio</span></div>
      {detail.map(r => <div className={styles.detailRow} key={r[0]}>{r.slice(0, 8).map((cell, i) => i === 0 ? <strong key={cell}>{cell}</strong> : <span key={`${cell}-${i}`}>{cell}{i === 7 ? <b> {r[8]}</b> : null}</span>)}</div>)}
    </article>
  );
}

export function LocalReportesLabPage() {
  return (
    <main className={styles.page}>
      <div className={styles.content}>
        <header className={styles.header}>
          <div><h1>Reportes de Demuru <Icon name="chart" /></h1><p>Analiza el rendimiento del restaurante con métricas, tendencias y reportes accionables.</p></div>
          <div className={styles.actions}><div className={styles.tabs}><button>Hoy</button><button>7 días</button><button className={styles.active}>30 días</button><button>Personalizado <Icon name="calendar" /></button></div><button><Icon name="download" />Exportar PDF</button><button><Icon name="download" />Exportar CSV</button><button className={styles.primary}><Icon name="calendar" />Programar reporte</button></div>
        </header>
        <section className={styles.kpis}>{kpis.map(kpi => <KpiCard key={kpi.label} kpi={kpi} />)}</section>
        <section className={styles.grid}><LineChart /><BarChart /><Donut /><Heatmap /><Services /><CancelChart /><Area /><Clients /></section>
        <DetailTable />
      </div>
    </main>
  );
}
