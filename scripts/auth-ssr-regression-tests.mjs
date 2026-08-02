import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "src/proxy.ts",
  "src/lib/supabase/auth-config.ts",
  "src/lib/supabase/auth-browser.ts",
  "src/lib/supabase/auth-server.ts",
  "src/lib/supabase/auth-proxy.ts",
  "src/lib/auth/redirects.ts",
  "src/app/auth/login/page.tsx",
  "src/app/auth/login/login-form.tsx",
  "src/app/auth/forgot-password/page.tsx",
  "src/app/auth/update-password/page.tsx",
  "src/app/auth/callback/route.ts",
  "src/app/auth/logout/route.ts",
  "src/app/local/seguridad/page.tsx",
  "docs/database/AUTH-SSR-ROLLOUT.md",
];

console.log("Ejecutando regresión de autenticación SSR...");

for (const file of requiredFiles) {
  await access(file);
}
console.log("✓ existen clientes, proxy, flujos y ruta protegida");

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.equal(packageJson.dependencies?.["@supabase/ssr"], "0.12.3");
assert.equal(
  packageJson.scripts?.["test:auth"],
  "node scripts/auth-ssr-regression-tests.mjs",
);
assert.match(packageJson.scripts?.["test:regression"] ?? "", /test:auth/);
console.log("✓ @supabase/ssr y la regresión están integrados");

const browserClient = await readFile(
  "src/lib/supabase/auth-browser.ts",
  "utf8",
);
assert.match(browserClient, /createBrowserClient/);
assert.doesNotMatch(browserClient, /SERVICE_ROLE/i);
console.log("✓ el navegador usa cliente SSR sin service role");

const serverClient = await readFile(
  "src/lib/supabase/auth-server.ts",
  "utf8",
);
assert.match(serverClient, /createServerClient/);
assert.match(serverClient, /getAll\(\)/);
assert.match(serverClient, /setAll\(cookiesToSet\)/);
assert.doesNotMatch(serverClient, /auth-helpers-nextjs/);
console.log("✓ el servidor usa cookies getAll/setAll");

const proxy = await readFile("src/lib/supabase/auth-proxy.ts", "utf8");
assert.match(proxy, /auth\.getClaims\(\)/);
assert.doesNotMatch(proxy, /auth\.getSession\(\)/);
assert.match(proxy, /\/local\/seguridad/);
assert.match(proxy, /copyResponseCookies/);
console.log("✓ el Proxy valida claims y conserva cookies");

const rootProxy = await readFile("src/proxy.ts", "utf8");
assert.match(rootProxy, /export async function proxy/);
assert.match(rootProxy, /"\/auth\/:path\*"/);
assert.match(rootProxy, /"\/local\/seguridad\/:path\*"/);
console.log("✓ Next.js 16 usa src/proxy.ts con matcher acotado");

const protectedPage = await readFile(
  "src/app/local/seguridad/page.tsx",
  "utf8",
);
assert.match(protectedPage, /auth\.getClaims\(\)/);
assert.match(protectedPage, /auth\.getUser\(\)/);
assert.match(protectedPage, /action="\/auth\/logout"/);
console.log("✓ la página piloto vuelve a validar y permite logout");

const loginForm = await readFile(
  "src/app/auth/login/login-form.tsx",
  "utf8",
);
assert.match(loginForm, /signInWithPassword/);
assert.match(loginForm, /router\.replace\(nextPath\)/);

const forgotForm = await readFile(
  "src/app/auth/forgot-password/forgot-password-form.tsx",
  "utf8",
);
assert.match(forgotForm, /resetPasswordForEmail/);
assert.match(forgotForm, /\/auth\/callback/);

const updateForm = await readFile(
  "src/app/auth/update-password/update-password-form.tsx",
  "utf8",
);
assert.match(updateForm, /updateUser/);
assert.match(updateForm, /signOut/);
console.log("✓ login, recuperación y cambio de contraseña están conectados");

const callback = await readFile(
  "src/app/auth/callback/route.ts",
  "utf8",
);
assert.match(callback, /exchangeCodeForSession/);
assert.match(callback, /sanitizeNextPath/);

const redirects = await readFile("src/lib/auth/redirects.ts", "utf8");
assert.match(redirects, /value\.startsWith\("\/"\)/);
assert.match(redirects, /value\.startsWith\("\/\/"\)/);
console.log("✓ callback y redirects internos evitan redirecciones externas");

const chrome = await readFile("src/components/AppChrome.tsx", "utf8");
assert.match(chrome, /pathname\.startsWith\("\/auth"\)/);

const sidebar = await readFile(
  "src/components/v2/v2-sidebar.tsx",
  "utf8",
);
assert.match(sidebar, /\/local\/seguridad/);
assert.match(sidebar, /ShieldCheck/);
console.log("✓ autenticación se integra sin romper el shell V2");

const rollout = await readFile(
  "docs/database/AUTH-SSR-ROLLOUT.md",
  "utf8",
);
assert.match(rollout, /QA manual local/);
assert.match(rollout, /Redirect URL/);
assert.match(rollout, /No protege todavía todo `\/local`/);
console.log("✓ el despliegue y QA manual quedan documentados");

for (const file of requiredFiles) {
  const content = await readFile(file, "utf8");
  for (const [index, line] of content.split("\n").entries()) {
    assert.equal(
      line.replace(/\s+$/u, ""),
      line,
      `espacio final en ${file}, línea ${index + 1}`,
    );
  }
}
console.log("✓ los archivos nuevos no contienen whitespace accidental");

console.log("Todos los casos de autenticación SSR pasaron (10).");
