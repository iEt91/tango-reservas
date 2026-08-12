import assert from "node:assert/strict";
import {
  execFileSync,
} from "node:child_process";
import {
  readFile,
} from "node:fs/promises";

const paths = {
  package:
    "package.json",
  master:
    "src/lib/demo-demuru-master-data.ts",
  operational:
    "src/lib/demo-demuru-operational-data.ts",
  operationalBootstrap:
    "src/lib/demo-demuru-operational-bootstrap.ts",
  doctor:
    "scripts/demuru-demo-doctor.mjs",
  start:
    "scripts/start-demuru-demo.mjs",
  launcher:
    "INICIAR_DEMO_DEMURU.bat",
  expensesStaging:
    "scripts/expenses-cash-close-staging-test.mjs",
  docs:
    "docs/demo/DEMURU-DEMO-RUNBOOK.md",
};

const sources =
  Object.fromEntries(
    await Promise.all(
      Object.entries(
        paths,
      ).map(
        async (
          [key, path],
        ) => [
          key,
          await readFile(
            path,
            "utf8",
          ),
        ],
      ),
    ),
  );

console.log(
  "Ejecutando Demo Perfecta Demuru - cierre E35C...",
);

const pkg =
  JSON.parse(
    sources.package,
  );

assert.equal(
  pkg.scripts?.[
    "demo:doctor"
  ],
  "node scripts/demuru-demo-doctor.mjs",
);
assert.equal(
  pkg.scripts?.[
    "demo:start"
  ],
  "node scripts/start-demuru-demo.mjs",
);
assert.equal(
  pkg.scripts?.[
    "test:demuru-demo-readiness"
  ],
  "node scripts/demuru-demo-readiness-regression-tests.mjs",
);
console.log(
  "✓ launcher, doctor y regresión final tienen scripts explícitos",
);

const regressionCommands =
  (
    pkg.scripts?.[
      "test:regression"
    ]
    ?? ""
  )
    .split(
      " && ",
    )
    .filter(Boolean);
const expectedSequence = [
  "npm run test:public-shipping-ordering",
  "npm run test:demuru-master-data",
  "npm run test:demuru-operational-history",
  "npm run test:demuru-demo-readiness",
];
const indexes =
  expectedSequence.map(
    (command) =>
      regressionCommands.indexOf(
        command,
      ),
  );

for (
  const command
  of expectedSequence
) {
  assert.equal(
    regressionCommands
      .filter(
        (candidate) =>
          candidate
          === command,
      )
      .length,
    1,
  );
}

assert.equal(
  indexes.every(
    (index) =>
      index >= 0,
  ),
  true,
);
assert.ok(
  indexes[0]
  < indexes[1],
);
assert.ok(
  indexes[1]
  < indexes[2],
);
assert.ok(
  indexes[2]
  < indexes[3],
);
console.log(
  "✓ E34C, E35A, E35B y E35C están integrados una sola vez y en orden",
);

assert.equal(
  pkg.scripts?.lint,
  "eslint . --max-warnings=0",
);
assert.match(
  pkg.scripts?.qa
  ?? "",
  /eslint \. --max-warnings=0/u,
);
console.log(
  "✓ QA global y lint quedan endurecidos a cero warnings",
);

assert.doesNotMatch(
  sources.expensesStaging,
  /const businessB\s*=/u,
);
assert.match(
  sources.expensesStaging,
  /const businessA\s*=/u,
);
console.log(
  "✓ se elimina el warning histórico businessB sin cambiar la prueba funcional",
);

assert.match(
  sources.master,
  /demuruDemoMenuItems/u,
);
assert.match(
  sources.master,
  /demuruDemoRecipes/u,
);
assert.match(
  sources.operational,
  /DEMURU_DEMO_HISTORY_DAYS = 120/u,
);
assert.match(
  sources.operational,
  /DEMURU_DEMO_FUTURE_DAYS = 14/u,
);
assert.match(
  sources.operationalBootstrap,
  /`\$\{DEMURU_DEMO_OPERATIONAL_VERSION\}:\$\{anchorDate\}`/u,
);
console.log(
  "✓ Master Data estable y rolling diario E35B permanecen intactos",
);

assert.match(
  sources.start,
  /NEXT_PUBLIC_DATA_SOURCE:\s*"local"/u,
);
assert.match(
  sources.start,
  /3000,[\s\S]+3005/u,
);
assert.match(
  sources.start,
  /const isWindows =[\s\S]+process\.platform[\s\S]+=== "win32"/u,
);
assert.match(
  sources.start,
  /process\.env\.ComSpec[\s\S]+cmd\.exe/u,
);
assert.match(
  sources.start,
  /"\/d",[\s\S]+"\/s",[\s\S]+"\/c",[\s\S]+npm run dev -- -p \$\{port\}/u,
);
assert.doesNotMatch(
  sources.start,
  /npm\.cmd/u,
);
assert.match(
  sources.start,
  /\/demuru/u,
);
assert.doesNotMatch(
  sources.start,
  /supabase/iu,
);
assert.doesNotMatch(
  sources.start,
  /service_role/iu,
);
console.log(
  "✓ start fuerza modo local, elige puerto libre y abre /demuru sin Supabase",
);

assert.match(
  sources.launcher,
  /npm run demo:doctor/u,
);
assert.match(
  sources.launcher,
  /npm run demo:start/u,
);
for (
  const forbiddenCommand
  of [
    /call\s+npm\s+run\s+staging/iu,
    /\bnpx\s+supabase\b/iu,
    /\bsupabase\s+db\b/iu,
    /\bgit\s+commit\b/iu,
    /\bgit\s+push\b/iu,
  ]
) {
  assert.doesNotMatch(
    sources.launcher,
    forbiddenCommand,
  );
}
console.log(
  "✓ INICIAR_DEMO_DEMURU.bat sólo valida y arranca la demo",
);

const doctorOutput =
  execFileSync(
    process.execPath,
    [
      paths.doctor,
    ],
    {
      encoding:
        "utf8",
      stdio: [
        "ignore",
        "pipe",
        "pipe",
      ],
    },
  );

assert.match(
  doctorOutput,
  /DEMO DEMURU LISTA/u,
);
assert.match(
  doctorOutput,
  /5 categorías \/ 20 productos \/ 20 recetas/u,
);
assert.match(
  doctorOutput,
  /77 insumos \/ 5 alertas bajas \/ 650 movimientos/u,
);
assert.match(
  doctorOutput,
  /120 días históricos \+ 14 días futuros/u,
);
console.log(
  "✓ doctor ejecuta el dataset real contra la fecha actual y lo declara listo",
);

for (
  const marker
  of [
    "INICIAR_DEMO_DEMURU.bat",
    "120 días",
    "14 días",
    "modo local",
    "cero warnings",
    "E35C",
  ]
) {
  assert.match(
    sources.docs,
    new RegExp(
      marker,
      "u",
    ),
  );
}
console.log(
  "✓ runbook documenta arranque, rolling, alcance y cierre E35C",
);

for (
  const [
    label,
    source,
  ]
  of Object.entries(
    sources,
  )
) {
  assert.doesNotMatch(
    source,
    /[ \t]+\n/u,
    `${label} contiene whitespace accidental`,
  );
}

console.log(
  "Todos los casos E35C pasaron.",
);
