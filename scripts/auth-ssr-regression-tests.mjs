import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";

const requiredFiles = [
  "src/proxy.ts",
  "src/lib/supabase/auth-config.ts",
  "src/lib/supabase/auth-browser.ts",
  "src/lib/supabase/client.ts",
  "src/lib/supabase/auth-server.ts",
  "src/lib/supabase/auth-proxy.ts",
  "src/lib/auth/redirects.ts",
  "src/lib/auth/active-business-contract.ts",
  "src/lib/auth/active-business.ts",
  "src/components/auth/active-business-provider.tsx",
  "src/app/auth/login/page.tsx",
  "src/app/auth/login/login-form.tsx",
  "src/app/auth/forgot-password/page.tsx",
  "src/app/auth/update-password/page.tsx",
  "src/app/auth/callback/route.ts",
  "src/app/auth/logout/route.ts",
  "src/app/auth/select-business/page.tsx",
  "src/app/auth/select-business/activate/route.ts",
  "src/app/auth/access-denied/page.tsx",
  "src/app/local/layout.tsx",
  "src/app/local/seguridad/page.tsx",
  "scripts/sync-staging-public-env.mjs",
  "docs/database/AUTH-SSR-ROLLOUT.md",
  "docs/database/ACTIVE-BUSINESS-SESSION.md",
];

console.log("Ejecutando regresión de autenticación SSR...");

for (const file of requiredFiles) {
  await access(file);
}
console.log("✓ existen clientes, flujos, layout y selector de negocio");

const packageJson = JSON.parse(await readFile("package.json", "utf8"));
assert.equal(packageJson.dependencies?.["@supabase/ssr"], "0.12.3");
assert.equal(
  packageJson.scripts?.["test:auth"],
  "node scripts/auth-ssr-regression-tests.mjs",
);
assert.equal(
  packageJson.scripts?.["staging:sync-app-env"],
  "node scripts/sync-staging-public-env.mjs",
);
assert.match(packageJson.scripts?.["test:regression"] ?? "", /test:auth/u);
console.log("✓ SSR, sincronización pública y regresión están integrados");

const browserClient = await readFile(
  "src/lib/supabase/auth-browser.ts",
  "utf8",
);
assert.match(browserClient, /createBrowserClient/u);
assert.doesNotMatch(browserClient, /SERVICE_ROLE/iu);

const serverClient = await readFile(
  "src/lib/supabase/auth-server.ts",
  "utf8",
);
assert.match(serverClient, /createServerClient/u);
assert.match(serverClient, /getAll\(\)/u);
assert.match(serverClient, /setAll\(cookiesToSet\)/u);
console.log("✓ navegador y servidor conservan clientes SSR sin service role");

const sharedDataClient = await readFile(
  "src/lib/supabase/client.ts",
  "utf8",
);
assert.match(sharedDataClient, /getSupabasePublicConfig/u);
assert.match(sharedDataClient, /config\.key/u);
assert.doesNotMatch(
  sharedDataClient,
  /process\.env\.NEXT_PUBLIC_SUPABASE_ANON_KEY/u,
);
console.log("✓ el cliente de datos acepta publishable key y anon legado");

const proxy = await readFile("src/lib/supabase/auth-proxy.ts", "utf8");
assert.match(proxy, /auth\.getClaims\(\)/u);
assert.doesNotMatch(proxy, /auth\.getSession\(\)/u);
assert.match(proxy, /isProtectedLocal/u);
assert.match(proxy, /pathname\.startsWith\("\/local\/"\)/u);
assert.match(proxy, /requestedPath/u);

const rootProxy = await readFile("src/proxy.ts", "utf8");
assert.match(rootProxy, /"\/local\/:path\*"/u);
assert.doesNotMatch(rootProxy, /"\/local\/seguridad\/:path\*"/u);
console.log("✓ Proxy protege todo /local y conserva la ruta solicitada");

const localLayout = await readFile("src/app/local/layout.tsx", "utf8");
assert.match(localLayout, /resolveActiveBusiness/u);
assert.match(localLayout, /membership_missing/u);
assert.match(localLayout, /selection_required/u);
assert.match(localLayout, /ActiveBusinessProvider/u);
assert.match(localLayout, /force-dynamic/u);

const selectorRoute = await readFile(
  "src/app/auth/select-business/activate/route.ts",
  "utf8",
);
assert.match(selectorRoute, /\.eq\("user_id", userId\)/u);
assert.match(selectorRoute, /\.eq\("status", "active"\)/u);
assert.match(selectorRoute, /httpOnly:\s*true/u);
assert.match(selectorRoute, /sameSite:\s*"lax"/u);
assert.match(selectorRoute, /submittedOrigin/u);
console.log("✓ layout y selector fallan cerrado y revalidan la membresía");

const protectedPage = await readFile(
  "src/app/local/seguridad/page.tsx",
  "utf8",
);
assert.match(protectedPage, /auth\.getClaims\(\)/u);
assert.match(protectedPage, /action="\/auth\/logout"/u);

const logoutRoute = await readFile(
  "src/app/auth/logout/route.ts",
  "utf8",
);
assert.match(logoutRoute, /cookies\.delete\(ACTIVE_BUSINESS_COOKIE\)/u);
console.log("✓ la sección de seguridad revalida y logout elimina contexto");

const loginForm = await readFile(
  "src/app/auth/login/login-form.tsx",
  "utf8",
);
assert.match(loginForm, /signInWithPassword/u);
assert.match(loginForm, /router\.replace\(nextPath\)/u);

const forgotForm = await readFile(
  "src/app/auth/forgot-password/forgot-password-form.tsx",
  "utf8",
);
assert.match(forgotForm, /resetPasswordForEmail/u);

const updateForm = await readFile(
  "src/app/auth/update-password/update-password-form.tsx",
  "utf8",
);
assert.match(updateForm, /updateUser/u);
assert.match(updateForm, /signOut/u);
console.log("✓ login, recuperación y cambio de contraseña siguen conectados");

const callback = await readFile(
  "src/app/auth/callback/route.ts",
  "utf8",
);
assert.match(callback, /exchangeCodeForSession/u);
assert.match(callback, /sanitizeNextPath/u);

const redirects = await readFile("src/lib/auth/redirects.ts", "utf8");
assert.match(redirects, /value\.startsWith\("\/"\)/u);
assert.match(redirects, /value\.startsWith\("\/\/"\)/u);
assert.ok(redirects.includes('value.includes("\\\\")'));

const chrome = await readFile("src/components/AppChrome.tsx", "utf8");
assert.match(chrome, /pathname\.startsWith\("\/auth"\)/u);
console.log("✓ callback, redirects y shell rechazan navegación externa");

const rollout = await readFile(
  "docs/database/AUTH-SSR-ROLLOUT.md",
  "utf8",
);
assert.match(rollout, /protección de todo `\/local`/u);
assert.match(rollout, /staging:sync-app-env/u);
assert.match(rollout, /QA manual local/u);
assert.doesNotMatch(rollout, /No protege todavía todo/u);

const activeBusinessDoc = await readFile(
  "docs/database/ACTIVE-BUSINESS-SESSION.md",
  "utf8",
);
assert.match(activeBusinessDoc, /Identidad/u);
assert.match(activeBusinessDoc, /Autorización/u);
assert.match(activeBusinessDoc, /Contexto/u);
console.log("✓ despliegue, selección y límites de autorización están documentados");

for (const file of requiredFiles) {
  const content = await readFile(file, "utf8");
  for (const [index, line] of content.split(/\r?\n/u).entries()) {
    assert.equal(
      line.replace(/\s+$/u, ""),
      line,
      `espacio final en ${file}, línea ${index + 1}`,
    );
  }
}
console.log("✓ los archivos nuevos no contienen whitespace accidental");

console.log("Todos los casos de autenticación SSR pasaron (11).");
