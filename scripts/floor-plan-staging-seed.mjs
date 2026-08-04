import {
  readFile,
  writeFile,
} from "node:fs/promises";
import { createClient } from "@supabase/supabase-js";
import { loadLocalEnv } from "./lib/load-local-env.mjs";
import { getStagingContext } from "./lib/staging-context.mjs";

const loaded = await loadLocalEnv();

if (!loaded) {
  throw new Error("No existe .env.staging.local.");
}

const context = getStagingContext({
  requireServerSecret: true,
  requireTestUsers: true,
});
const fixturePath =
  ".tango/staging-isolation.json";
const fixture = JSON.parse(
  await readFile(fixturePath, "utf8"),
);

if (fixture.projectRef !== context.stagingProjectRef) {
  throw new Error(
    "El fixture no pertenece al staging actual.",
  );
}

for (const key of [
  "businessAId",
  "businessBId",
  "reservationAId",
  "reservationBId",
]) {
  if (!fixture[key]) {
    throw new Error(
      `Falta ${key}. Ejecuta primero el seed base.`,
    );
  }
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

const FLOOR_FIXTURE_IDS = {
  tableA:
    "70000000-0000-4000-8000-00000000000a",
  tableB:
    "70000000-0000-4000-8000-00000000000b",
};

async function upsertSettings(
  businessId,
  imageUrl,
) {
  const { error } = await admin
    .from("floor_plan_settings")
    .upsert(
      {
        business_id: businessId,
        background_image_url: imageUrl,
        background_fit: "stretch",
        background_x: 0,
        background_y: 0,
        background_width: 1000,
        background_height: 600,
        background_opacity: 50,
        background_brightness: 100,
        background_contrast: 100,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "business_id",
      },
    );

  if (error) {
    throw error;
  }
}

async function upsertTable({
  id,
  businessId,
  label,
  seats,
  x,
}) {
  const { error } = await admin
    .from("floor_tables")
    .upsert(
      {
        id,
        business_id: businessId,
        label,
        seats,
        x,
        y: 80,
        width: 130,
        height: 90,
        rotation: 0,
        shape: "rectangle",
        corner_radius: 16,
        status: "available",
        can_join: true,
        is_active: true,
        archived_at: null,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "id",
      },
    );

  if (error) {
    throw error;
  }
}

async function replaceAssignment({
  businessId,
  reservationId,
  tableId,
  userId,
}) {
  const { error: deleteError } = await admin
    .from("reservation_table_assignments")
    .delete()
    .eq("business_id", businessId)
    .eq("reservation_id", reservationId);

  if (deleteError) {
    throw deleteError;
  }

  const { error: insertError } = await admin
    .from("reservation_table_assignments")
    .insert({
      business_id: businessId,
      reservation_id: reservationId,
      table_id: tableId,
      assigned_at: new Date().toISOString(),
      assigned_by: userId,
    });

  if (insertError) {
    throw insertError;
  }
}

console.log(
  "Extendiendo fixture RLS con plano y asignaciones...",
);

await upsertSettings(
  fixture.businessAId,
  "https://example.invalid/floor-a.webp",
);
await upsertSettings(
  fixture.businessBId,
  "https://example.invalid/floor-b.webp",
);

await upsertTable({
  id: FLOOR_FIXTURE_IDS.tableA,
  businessId: fixture.businessAId,
  label: "Isolation Table A",
  seats: 4,
  x: 20,
});
await upsertTable({
  id: FLOOR_FIXTURE_IDS.tableB,
  businessId: fixture.businessBId,
  label: "Isolation Table B",
  seats: 6,
  x: 40,
});

await replaceAssignment({
  businessId: fixture.businessAId,
  reservationId: fixture.reservationAId,
  tableId: FLOOR_FIXTURE_IDS.tableA,
  userId: fixture.userAId,
});
await replaceAssignment({
  businessId: fixture.businessBId,
  reservationId: fixture.reservationBId,
  tableId: FLOOR_FIXTURE_IDS.tableB,
  userId: fixture.userBId,
});

await writeFile(
  fixturePath,
  `${JSON.stringify(
    {
      ...fixture,
      floorTableAId: FLOOR_FIXTURE_IDS.tableA,
      floorTableBId: FLOOR_FIXTURE_IDS.tableB,
      floorPlanExtendedAt:
        new Date().toISOString(),
    },
    null,
    2,
  )}
`,
  "utf8",
);

console.log(
  "✓ ajustes, mesas y asignaciones A/B preparados",
);
console.log(
  "Fixture de plano preparado correctamente.",
);
