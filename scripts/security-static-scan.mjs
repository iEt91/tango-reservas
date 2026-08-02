import { execFile } from "node:child_process";
import { access, readFile, readdir, stat } from "node:fs/promises";
import { extname, relative, resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const repositoryRoot = process.cwd();

const ignoredDirectories = new Set([
  ".git",
  ".next",
  "node_modules",
  "out",
  "dist",
  "coverage",
]);

const textExtensions = new Set([
  ".cjs",
  ".css",
  ".env",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".sql",
  ".ts",
  ".tsx",
  ".txt",
  ".yaml",
  ".yml",
]);

const secretPatterns = [
  {
    name: "clave privada",
    expression:
      /-----BEGIN (?:RSA |EC |OPENSSH |PGP )?PRIVATE KEY-----/u,
  },
  {
    name: "token clásico de GitHub",
    expression: /\bgh[pousr]_[A-Za-z0-9]{30,}\b/u,
  },
  {
    name: "token granular de GitHub",
    expression: /\bgithub_pat_[A-Za-z0-9_]{50,}\b/u,
  },
  {
    name: "clave secreta de Stripe",
    expression: /\bsk_(?:live|test)_[A-Za-z0-9]{20,}\b/u,
  },
  {
    name: "access key de AWS",
    expression: /\bAKIA[0-9A-Z]{16}\b/u,
  },
  {
    name: "valor de service role incrustado",
    expression:
      /SUPABASE_SERVICE_ROLE_KEY\s*[:=]\s*["']?eyJ[A-Za-z0-9._-]{40,}/u,
  },
];

const dangerousSourcePatterns = [
  { name: "eval", expression: /\beval\s*\(/u },
  { name: "Function dinámica", expression: /\bnew\s+Function\s*\(/u },
  { name: "document.write", expression: /\bdocument\.write\s*\(/u },
  {
    name: "dangerouslySetInnerHTML",
    expression: /\bdangerouslySetInnerHTML\b/u,
  },
  {
    name: "asignación directa a innerHTML",
    expression: /\.innerHTML\s*=/u,
  },
];

function normalizePath(path) {
  return path.replaceAll("\\", "/");
}

function isAllowedTemplate(path) {
  return (
    path === ".env.example"
    || /^\.env\.[^/]+\.example$/u.test(path)
  );
}

function shouldRead(path) {
  const normalized = normalizePath(path);

  if (normalized === "package-lock.json") {
    return false;
  }

  const extension = extname(normalized).toLowerCase();

  return (
    textExtensions.has(extension)
    || normalized.startsWith(".env")
    || normalized === "Dockerfile"
  );
}

async function listFilesWithGit() {
  const { stdout } = await execFileAsync(
    "git",
    [
      "ls-files",
      "--cached",
      "--others",
      "--exclude-standard",
    ],
    {
      cwd: repositoryRoot,
      windowsHide: true,
      maxBuffer: 10 * 1024 * 1024,
    },
  );

  return stdout
    .split(/\r?\n/u)
    .map((path) => path.trim())
    .filter(Boolean);
}

async function walk(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (
      entry.isDirectory()
      && ignoredDirectories.has(entry.name)
    ) {
      continue;
    }

    const fullPath = resolve(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...await walk(fullPath));
    } else if (entry.isFile()) {
      files.push(normalizePath(relative(repositoryRoot, fullPath)));
    }
  }

  return files;
}

async function listCandidateFiles() {
  try {
    return await listFilesWithGit();
  } catch {
    return walk(repositoryRoot);
  }
}

function recordFinding(findings, file, message) {
  findings.push(`${file}: ${message}`);
}

console.log("Ejecutando escaneo estático de seguridad...");

const files = await listCandidateFiles();
const findings = [];

for (const file of files) {
  const normalized = normalizePath(file);

  if (
    normalized.startsWith(".env")
    && !isAllowedTemplate(normalized)
  ) {
    recordFinding(
      findings,
      normalized,
      "un archivo de entorno real está versionado o sin ignorar",
    );
    continue;
  }

  if (!shouldRead(normalized)) {
    continue;
  }

  const fullPath = resolve(repositoryRoot, normalized);

  try {
    await access(fullPath);
  } catch {
    continue;
  }

  const info = await stat(fullPath);

  if (info.size > 1024 * 1024) {
    continue;
  }

  const content = await readFile(fullPath, "utf8");

  for (const pattern of secretPatterns) {
    if (pattern.expression.test(content)) {
      recordFinding(
        findings,
        normalized,
        `posible ${pattern.name}`,
      );
    }
  }

  const isSource =
    normalized.startsWith("src/")
    || normalized === "next.config.ts";

  if (!isSource) {
    continue;
  }

  if (
    /NEXT_PUBLIC_[A-Z0-9_]*(?:SECRET|PRIVATE|SERVICE_ROLE|PASSWORD)/u
      .test(content)
  ) {
    recordFinding(
      findings,
      normalized,
      "un secreto parece declarado como variable pública",
    );
  }

  for (const pattern of dangerousSourcePatterns) {
    if (pattern.expression.test(content)) {
      recordFinding(
        findings,
        normalized,
        `API peligrosa sin excepción aprobada: ${pattern.name}`,
      );
    }
  }

  if (
    content.includes('"use client"')
    && (
      content.includes("SUPABASE_SERVICE_ROLE_KEY")
      || content.includes("getSupabaseServerClient")
    )
  ) {
    recordFinding(
      findings,
      normalized,
      "un componente cliente referencia acceso privilegiado",
    );
  }

  if (
    /Access-Control-Allow-Origin/u.test(content)
    && /["'`]\*["'`]/u.test(content)
  ) {
    recordFinding(
      findings,
      normalized,
      "CORS permite cualquier origen",
    );
  }

  if (
    content.includes("SUPABASE_SERVICE_ROLE_KEY")
    && normalized !== "src/lib/supabase/server.ts"
  ) {
    recordFinding(
      findings,
      normalized,
      "service role fuera del módulo privilegiado permitido",
    );
  }
}

if (findings.length > 0) {
  console.error("Se encontraron riesgos que bloquean el QA:");

  for (const finding of findings) {
    console.error(`- ${finding}`);
  }

  process.exitCode = 1;
} else {
  console.log("✓ no se detectaron secretos versionados");
  console.log("✓ no hay variables públicas con nombres sensibles");
  console.log("✓ no se detectaron APIs de ejecución o HTML peligroso");
  console.log("✓ service role permanece fuera del código cliente");
  console.log("✓ no se detectó CORS comodín");
  console.log("Escaneo estático de seguridad aprobado (5 controles).");
}
