import fs from "node:fs";

const reports = fs.readFileSync("src/app/local/reportes/page.tsx", "utf8");
const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));

function check(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
  console.log(`ok ${message}`);
}

console.log("Ejecutando E38 V3: layout compacto de Reportes...");

check(
  reports.includes("E38_REPORTES_LAYOUT"),
  "Reportes contiene la marca E38",
);

check(
  reports.includes('className="mt-2 grid shrink-0 gap-2 md:grid-cols-4 xl:grid-cols-8"'),
  "Resumen superior usa ocho columnas en desktop",
);

check(
  reports.includes('className="-mt-2 shrink-0"'),
  "Filtro sube para reducir espacio vacio",
);

check(
  reports.includes('className="mt-3 min-h-0 flex-1"'),
  "E38 preserva la estructura inferior validada por E37",
);

check(
  reports.includes('label="Facturación cobrada"')
    && reports.includes('label="Ticket promedio"')
    && reports.includes('label="Personas atendidas"')
    && reports.includes('label="Envíos entregados"')
    && reports.includes("paymentCards.map(({ label, value, icon: Icon, tone }) => ("),
  "Las ocho métricas se renderizan en la fila superior",
);

const paymentMaps =
  reports.split("paymentCards.map(({ label, value, icon: Icon, tone }) => (").length - 1;

check(
  paymentMaps === 1,
  "Los medios de cobro no se duplican dentro de Ingresos por método",
);

check(
  reports.includes('className="shrink-0 border-b border-slate-200 px-5 pb-2 pt-2"'),
  "Encabezado de Rentabilidad e Insumos queda más arriba",
);

check(
  reports.includes('className="min-h-0 flex-1 overflow-y-auto px-4 pb-4 pt-2"'),
  "Contenido de las pestañas reduce padding superior",
);

check(
  pkg.scripts?.["test:e38-reportes-layout"]
    === "node scripts/e38-reportes-layout-regression-tests.mjs",
  "package.json registra la regresión E38",
);

check(
  String(pkg.scripts?.["test:regression"] ?? "")
    .split(" && ")
    .includes("npm run test:e38-reportes-layout"),
  "QA global incorpora E38",
);

check(
  !reports.split("\n").some((line) => /[ \t]+$/u.test(line)),
  "Reportes sin trailing whitespace",
);

console.log("Todos los casos E38 V3 pasaron.");
