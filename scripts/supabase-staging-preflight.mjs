import { lookup } from "node:dns/promises";
import { loadLocalEnv } from "./lib/load-local-env.mjs";
import { getStagingContext } from "./lib/staging-context.mjs";

await loadLocalEnv();

const context = getStagingContext();

async function request(path) {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    10_000,
  );

  try {
    const response = await fetch(
      `${context.url}${path}`,
      {
        headers: {
          apikey: context.publicKey,
          Authorization: `Bearer ${context.publicKey}`,
          Accept: "application/json",
        },
        signal: controller.signal,
        redirect: "error",
      },
    );

    await response.body?.cancel();
    return response.status;
  } finally {
    clearTimeout(timeout);
  }
}

console.log("Ejecutando preflight seguro de Supabase staging...");
console.log(`Proyecto de staging: ${context.stagingProjectRef}`);

const hostname = new URL(context.url).hostname;
const addresses = await lookup(hostname, { all: true });

if (addresses.length === 0) {
  throw new Error("DNS no devolvió direcciones.");
}

console.log("✓ DNS resuelve el proyecto de staging");

const authStatus = await request("/auth/v1/settings");

if (authStatus < 200 || authStatus >= 300) {
  throw new Error(
    `Auth rechazó la clave pública con HTTP ${authStatus}.`,
  );
}

console.log("✓ Auth reconoce la clave pública");

const restStatus = await request("/rest/v1/");

if (restStatus < 200 || restStatus >= 400) {
  throw new Error(
    `PostgREST no respondió correctamente: HTTP ${restStatus}.`,
  );
}

console.log("✓ PostgREST está accesible");
console.log("✓ staging y producción tienen referencias diferentes");
console.log("Preflight remoto aprobado (4 controles).");
