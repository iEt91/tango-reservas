import {
  access,
  mkdir,
  readFile,
  writeFile,
} from "node:fs/promises";

const stagingPath = ".env.staging.local";
const localPath = ".env.local";
const backupPath = ".tango/env-local-before-staging-sync";

function parseEnv(source) {
  const values = new Map();

  for (const rawLine of source.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");

    if (separator <= 0) {
      continue;
    }

    const key = line.slice(0, separator).trim();
    let value = line.slice(separator + 1).trim();

    if (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    values.set(key, value);
  }

  return values;
}

function projectRefFromUrl(value) {
  const hostname = new URL(value).hostname;
  const [projectRef, ...rest] = hostname.split(".");

  if (rest.join(".") !== "supabase.co" || !projectRef) {
    throw new Error("La URL de staging no pertenece a Supabase.");
  }

  return projectRef;
}

function isPublicKey(value) {
  return (
    value.startsWith("sb_publishable_")
    || value.startsWith("eyJ")
  ) && !value.includes("service_role");
}

const stagingSource = await readFile(stagingPath, "utf8");
const staging = parseEnv(stagingSource);

if (staging.get("TANGO_ENVIRONMENT") !== "staging") {
  throw new Error(".env.staging.local no declara TANGO_ENVIRONMENT=staging.");
}

const url = staging.get("NEXT_PUBLIC_SUPABASE_URL");
const publicKey =
  staging.get("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY")
  ?? staging.get("NEXT_PUBLIC_SUPABASE_ANON_KEY");
const expectedProjectRef = staging.get("TANGO_STAGING_PROJECT_REF");

if (!url || !publicKey || !expectedProjectRef) {
  throw new Error("Faltan URL, project ref o clave pública de staging.");
}

if (projectRefFromUrl(url) !== expectedProjectRef) {
  throw new Error("La URL pública no coincide con el project ref de staging.");
}

if (!isPublicKey(publicKey)) {
  throw new Error("La clave seleccionada no es una clave pública válida.");
}

let localSource = "";

try {
  localSource = await readFile(localPath, "utf8");
} catch (error) {
  if (!(error instanceof Error) || !error.message.includes("ENOENT")) {
    throw error;
  }
}

await mkdir(".tango", { recursive: true });

try {
  await access(backupPath);
} catch {
  await writeFile(backupPath, localSource, "utf8");
}

const removedKeys = new Set([
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "SUPABASE_SECRET_KEY",
]);
const preservedLines = localSource
  .split(/\r?\n/u)
  .filter((line) => {
    const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=/u);
    return !match || !removedKeys.has(match[1]);
  });

while (preservedLines.at(-1) === "") {
  preservedLines.pop();
}

const nextSource = [
  ...preservedLines,
  ...(preservedLines.length > 0 ? [""] : []),
  "# Public app connection synchronized from .env.staging.local.",
  `NEXT_PUBLIC_SUPABASE_URL=${url}`,
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=${publicKey}`,
  "",
].join("\n");

await writeFile(localPath, nextSource, "utf8");

console.log(`✓ .env.local apunta al staging ${expectedProjectRef}`);
console.log("✓ no se copiaron claves privilegiadas");
console.log("✓ el contenido anterior quedó respaldado dentro de .tango");
