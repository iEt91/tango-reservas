import { access, readFile } from "node:fs/promises";
import { resolve } from "node:path";

function unquote(value) {
  if (
    value.length >= 2
    && (
      (value.startsWith('"') && value.endsWith('"'))
      || (value.startsWith("'") && value.endsWith("'"))
    )
  ) {
    return value.slice(1, -1);
  }

  return value;
}

export async function loadLocalEnv(
  fileName = ".env.staging.local",
) {
  const path = resolve(process.cwd(), fileName);

  try {
    await access(path);
  } catch {
    return false;
  }

  const content = await readFile(path, "utf8");

  for (const rawLine of content.split(/\r?\n/u)) {
    const line = rawLine.trim();

    if (!line || line.startsWith("#")) {
      continue;
    }

    const separator = line.indexOf("=");

    if (separator <= 0) {
      throw new Error(
        `Línea inválida en ${fileName}; se esperaba CLAVE=VALOR.`,
      );
    }

    const key = line.slice(0, separator).trim();
    const value = unquote(line.slice(separator + 1).trim());

    if (!(key in process.env)) {
      process.env[key] = value;
    }
  }

  return true;
}
