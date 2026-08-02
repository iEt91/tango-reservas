function required(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Falta ${name}.`);
  }

  return value;
}

function decodeJwtPayload(value) {
  if (value.split(".").length !== 3) {
    return null;
  }

  try {
    const encoded = value
      .split(".")[1]
      .replaceAll("-", "+")
      .replaceAll("_", "/");
    const padded = encoded.padEnd(
      Math.ceil(encoded.length / 4) * 4,
      "=",
    );

    return JSON.parse(
      Buffer.from(padded, "base64").toString("utf8"),
    );
  } catch {
    return null;
  }
}

function projectRefFromUrl(url) {
  const parsed = new URL(url);

  if (parsed.protocol !== "https:") {
    throw new Error(
      "NEXT_PUBLIC_SUPABASE_URL debe utilizar HTTPS.",
    );
  }

  const suffix = ".supabase.co";

  if (!parsed.hostname.endsWith(suffix)) {
    throw new Error(
      "Staging debe usar el dominio directo del proyecto Supabase.",
    );
  }

  return parsed.hostname.slice(0, -suffix.length);
}

function validatePublicKey(key) {
  const payload = decodeJwtPayload(key);

  if (payload?.role === "service_role") {
    throw new Error(
      "La clave pública contiene el rol service_role.",
    );
  }

  if (key.startsWith("sb_secret_")) {
    throw new Error(
      "Una secret key fue colocada como clave pública.",
    );
  }
}

export function getStagingContext() {
  const environment = required("TANGO_ENVIRONMENT");

  if (environment !== "staging") {
    throw new Error(
      "La operación remota solo se permite con TANGO_ENVIRONMENT=staging.",
    );
  }

  const stagingProjectRef = required(
    "TANGO_STAGING_PROJECT_REF",
  );
  const productionProjectRef = required(
    "TANGO_PRODUCTION_PROJECT_REF",
  );

  if (stagingProjectRef === productionProjectRef) {
    throw new Error(
      "Staging y producción no pueden compartir project ref.",
    );
  }

  const url = required("NEXT_PUBLIC_SUPABASE_URL")
    .replace(/\/+$/u, "");
  const urlProjectRef = projectRefFromUrl(url);

  if (urlProjectRef !== stagingProjectRef) {
    throw new Error(
      "La URL no coincide con TANGO_STAGING_PROJECT_REF.",
    );
  }

  const publicKey = (
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
    || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )?.trim();

  if (!publicKey) {
    throw new Error(
      "Falta la clave pública de Supabase.",
    );
  }

  validatePublicKey(publicKey);

  return {
    environment,
    stagingProjectRef,
    productionProjectRef,
    url,
    publicKey,
  };
}
