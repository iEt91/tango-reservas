function decodeJwtPayload(value) {
  if (!value || value.split(".").length !== 3) {
    return null;
  }

  try {
    const payload = value.split(".")[1]
      .replaceAll("-", "+")
      .replaceAll("_", "/");
    const padded = payload.padEnd(
      Math.ceil(payload.length / 4) * 4,
      "=",
    );

    return JSON.parse(
      Buffer.from(padded, "base64").toString("utf8"),
    );
  } catch {
    return null;
  }
}

function isLocalHostname(hostname) {
  return (
    hostname === "localhost"
    || hostname === "127.0.0.1"
    || hostname === "::1"
  );
}

console.log("Validando política de variables de entorno...");

const errors = [];
const environmentKeys = Object.keys(process.env);

for (const key of environmentKeys) {
  if (
    key.startsWith("NEXT_PUBLIC_")
    && /SECRET|PRIVATE|SERVICE_ROLE|PASSWORD/u.test(key)
  ) {
    errors.push(`${key} no puede ser pública`);
  }
}

const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const publicKey = (
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
)?.trim();
const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (publicUrl) {
  try {
    const parsedUrl = new URL(publicUrl);

    if (
      parsedUrl.protocol !== "https:"
      && !isLocalHostname(parsedUrl.hostname)
    ) {
      errors.push(
        "NEXT_PUBLIC_SUPABASE_URL debe utilizar HTTPS",
      );
    }

    if (/\/rest\/v1\/?$/iu.test(parsedUrl.pathname)) {
      errors.push(
        "NEXT_PUBLIC_SUPABASE_URL debe apuntar al proyecto, no a /rest/v1",
      );
    }
  } catch {
    errors.push("NEXT_PUBLIC_SUPABASE_URL no es una URL válida");
  }
}

const publicPayload = decodeJwtPayload(publicKey);

if (publicPayload?.role === "service_role") {
  errors.push(
    "la clave pública contiene el rol service_role",
  );
}

if (
  publicKey
  && serviceRole
  && publicKey === serviceRole
) {
  errors.push(
    "la clave pública y la service role no pueden ser iguales",
  );
}

const servicePayload = decodeJwtPayload(serviceRole);

if (
  serviceRole
  && servicePayload
  && servicePayload.role !== "service_role"
) {
  errors.push(
    "SUPABASE_SERVICE_ROLE_KEY no declara el rol esperado",
  );
}

if (errors.length > 0) {
  console.error("La política de entorno falló:");

  for (const error of errors) {
    console.error(`- ${error}`);
  }

  process.exitCode = 1;
} else {
  console.log("✓ no hay secretos declarados como NEXT_PUBLIC");
  console.log("✓ la URL configurada cumple la política de transporte");
  console.log("✓ la clave pública no contiene service_role");
  console.log("✓ las claves públicas y privilegiadas no se confunden");
  console.log("Política de entorno aprobada (4 controles).");
}
