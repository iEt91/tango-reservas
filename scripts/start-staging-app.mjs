import { spawn } from "node:child_process";
import { randomBytes } from "node:crypto";
import { resolve } from "node:path";
import { loadLocalEnv } from "./lib/load-local-env.mjs";
import { getStagingContext } from "./lib/staging-context.mjs";

const loaded = await loadLocalEnv(
  ".env.staging.local",
  { override: true },
);

if (!loaded) {
  throw new Error("No existe .env.staging.local.");
}

const context = getStagingContext({
  requireServerSecret: true,
});

process.env.NEXT_PUBLIC_DATA_SOURCE = "supabase";
process.env.PUBLIC_REQUEST_FINGERPRINT_SECRET ||= randomBytes(32).toString("hex");

const forwarded = process.argv.slice(2);
const nextBin = resolve(
  process.cwd(),
  "node_modules/next/dist/bin/next",
);

console.log(
  `Arrancando Tango Reservas contra STAGING ${context.stagingProjectRef}.`,
);
console.log(
  `Producción ${context.productionProjectRef} permanece fuera de alcance.`,
);

const child = spawn(
  process.execPath,
  [nextBin, "dev", ...forwarded],
  {
    cwd: process.cwd(),
    env: process.env,
    stdio: "inherit",
  },
);

child.on("exit", (code, signal) => {
  if (signal) {
    process.kill(process.pid, signal);
    return;
  }
  process.exit(code ?? 0);
});
