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

  if (
    key.includes("replace-with")
    || key.includes("replace-staging")
  ) {
    throw new Error(
      "La clave pública todavía contiene un placeholder.",
    );
  }
}

function validateServerSecret(secret, publicKey) {
  if (
    secret.includes("replace-with")
    || secret.includes("replace-staging")
  ) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY todavía contiene un placeholder.",
    );
  }

  if (secret === publicKey) {
    throw new Error(
      "La clave privilegiada no puede ser la clave pública.",
    );
  }

  const payload = decodeJwtPayload(secret);

  if (payload && payload.role !== "service_role") {
    throw new Error(
      "La clave privilegiada JWT no declara service_role.",
    );
  }

  if (!payload && !secret.startsWith("sb_secret_")) {
    throw new Error(
      "La clave privilegiada no tiene un formato reconocido.",
    );
  }
}

function validateEmail(name, value) {
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value)) {
    throw new Error(`${name} no contiene un email válido.`);
  }
}

function validatePassword(name, value) {
  if (value.length < 20) {
    throw new Error(
      `${name} debe tener al menos 20 caracteres.`,
    );
  }

  if (value.includes("replace-with")) {
    throw new Error(
      `${name} todavía contiene un placeholder.`,
    );
  }
}

export function getStagingContext({
  requireServerSecret = false,
  requireTestUsers = false,
} = {}) {
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

  let serverSecret = null;

  if (requireServerSecret) {
    serverSecret = required("SUPABASE_SERVICE_ROLE_KEY");
    validateServerSecret(serverSecret, publicKey);
  }

  const context = {
    environment,
    stagingProjectRef,
    productionProjectRef,
    url,
    publicKey,
    serverSecret,
  };

  if (!requireTestUsers) {
    return context;
  }

  const userAEmail = required("TANGO_TEST_USER_A_EMAIL");
  const userAPassword = required(
    "TANGO_TEST_USER_A_PASSWORD",
  );
  const userBEmail = required("TANGO_TEST_USER_B_EMAIL");
  const userBPassword = required(
    "TANGO_TEST_USER_B_PASSWORD",
  );

  validateEmail("TANGO_TEST_USER_A_EMAIL", userAEmail);
  validateEmail("TANGO_TEST_USER_B_EMAIL", userBEmail);
  validatePassword(
    "TANGO_TEST_USER_A_PASSWORD",
    userAPassword,
  );
  validatePassword(
    "TANGO_TEST_USER_B_PASSWORD",
    userBPassword,
  );

  if (userAEmail.toLowerCase() === userBEmail.toLowerCase()) {
    throw new Error(
      "Los usuarios de aislamiento deben ser diferentes.",
    );
  }

  if (userAPassword === userBPassword) {
    throw new Error(
      "Los usuarios de prueba no pueden compartir contraseña.",
    );
  }

  const businessASlug = required(
    "TANGO_TEST_BUSINESS_A_SLUG",
  );
  const businessBSlug = required(
    "TANGO_TEST_BUSINESS_B_SLUG",
  );

  if (businessASlug === businessBSlug) {
    throw new Error(
      "Los negocios de prueba deben usar slugs diferentes.",
    );
  }

  return {
    ...context,
    userAEmail,
    userAPassword,
    userBEmail,
    userBPassword,
    businessASlug,
    businessAName: required(
      "TANGO_TEST_BUSINESS_A_NAME",
    ),
    businessBSlug,
    businessBName: required(
      "TANGO_TEST_BUSINESS_B_NAME",
    ),
  };
}
