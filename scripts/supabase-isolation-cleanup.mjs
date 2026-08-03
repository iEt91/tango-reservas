import { rm, readFile } from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./lib/load-local-env.mjs";
import { getStagingContext } from "./lib/staging-context.mjs";

const loaded = await loadLocalEnv();

if (!loaded) {
  throw new Error(
    "No existe .env.staging.local.",
  );
}

const context = getStagingContext({
  requireServerSecret: true,
  requireTestUsers: true,
});

const fixture = JSON.parse(
  await readFile(
    ".tango/staging-isolation.json",
    "utf8",
  ),
);

if (fixture.projectRef !== context.stagingProjectRef) {
  throw new Error(
    "El fixture pertenece a otro proyecto Supabase.",
  );
}

const admin = createClient(
  context.url,
  context.serverSecret,
  {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  },
);

console.log("Eliminando fixture RLS de STAGING...");

const { error: businessesError } = await admin
  .from("businesses")
  .delete()
  .in(
    "id",
    [fixture.businessAId, fixture.businessBId],
  );

if (businessesError) {
  throw businessesError;
}

for (const userId of [
  fixture.userAId,
  fixture.userBId,
]) {
  const { error } =
    await admin.auth.admin.deleteUser(userId);

  if (error) {
    throw error;
  }
}

await rm(
  ".tango/staging-isolation.json",
  { force: true },
);

console.log("✓ usuarios, negocios y evidencia local eliminados");
console.log("Fixture RLS eliminado correctamente.");
