import {
  spawn,
} from "node:child_process";
import net from "node:net";

const HOST =
  "127.0.0.1";
const PORTS = [
  3000,
  3001,
  3002,
  3003,
  3004,
  3005,
];

function canListen(
  port,
) {
  return new Promise(
    (resolve) => {
      const server =
        net.createServer();

      server.once(
        "error",
        () => {
          resolve(
            false,
          );
        },
      );

      server.once(
        "listening",
        () => {
          server.close(
            () => {
              resolve(
                true,
              );
            },
          );
        },
      );

      server.listen(
        port,
        HOST,
      );
    },
  );
}

async function findPort() {
  for (
    const port
    of PORTS
  ) {
    if (
      await canListen(
        port,
      )
    ) {
      return port;
    }
  }

  throw new Error(
    "No hay un puerto libre entre 3000 y 3005.",
  );
}

async function waitForReady(
  url,
  child,
) {
  const deadline =
    Date.now()
    + 90_000;

  while (
    Date.now()
    < deadline
  ) {
    if (
      child.exitCode
      !== null
    ) {
      throw new Error(
        `Next.js terminó antes de quedar listo. Código: ${child.exitCode}`,
      );
    }

    try {
      const response =
        await fetch(
          url,
          {
            redirect:
              "manual",
          },
        );

      if (
        response.status
        < 500
      ) {
        return;
      }
    } catch {
      // Servidor todavía iniciando.
    }

    await new Promise(
      (resolve) => {
        setTimeout(
          resolve,
          500,
        );
      },
    );
  }

  throw new Error(
    "Next.js no respondió dentro de 90 segundos.",
  );
}

function openBrowser(
  url,
) {
  if (
    process.platform
    === "win32"
  ) {
    const opener =
      spawn(
        "cmd.exe",
        [
          "/d",
          "/s",
          "/c",
          `start "" "${url}"`,
        ],
        {
          detached: true,
          stdio:
            "ignore",
        },
      );

    opener.unref();

    return;
  }

  const command =
    process.platform
      === "darwin"
      ? "open"
      : "xdg-open";
  const opener =
    spawn(
      command,
      [
        url,
      ],
      {
        detached: true,
        stdio:
          "ignore",
      },
    );

  opener.unref();
}

const port =
  await findPort();
const url =
  `http://localhost:${port}/demuru`;
const isWindows =
  process.platform
  === "win32";
const command =
  isWindows
    ? (
      process.env.ComSpec
        ?.trim()
      || "cmd.exe"
    )
    : "npm";
const commandArgs =
  isWindows
    ? [
      "/d",
      "/s",
      "/c",
      `npm run dev -- -p ${port}`,
    ]
    : [
      "run",
      "dev",
      "--",
      "-p",
      String(
        port,
      ),
    ];

console.log(
  `Iniciando Demo Demuru en ${url}`,
);
console.log(
  "NEXT_PUBLIC_DATA_SOURCE se fuerza a local sólo para este proceso.",
);
console.log(
  "La actividad se refresca automáticamente al cambiar el día.",
);

const child =
  spawn(
    command,
    commandArgs,
    {
      cwd:
        process.cwd(),
      env: {
        ...process.env,
        NEXT_PUBLIC_DATA_SOURCE:
          "local",
      },
      stdio:
        "inherit",
    },
  );

let browserOpened =
  false;

try {
  await waitForReady(
    url,
    child,
  );

  openBrowser(
    url,
  );
  browserOpened =
    true;

  console.log();
  console.log(
    "Demo abierta en el navegador.",
  );
  console.log(
    "Usá Ctrl+C para detener Next.js.",
  );

  await new Promise(
    (resolve) => {
      child.once(
        "exit",
        resolve,
      );
    },
  );
} catch (error) {
  if (
    child.exitCode
    === null
  ) {
    child.kill();
  }

  console.error(
    error instanceof Error
      ? error.message
      : String(error),
  );
  process.exitCode =
    1;
} finally {
  if (
    !browserOpened
  ) {
    console.error(
      "La web no llegó a abrirse automáticamente.",
    );
  }
}
