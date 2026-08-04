import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";
import { readFile } from "node:fs/promises";
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
const fixture = JSON.parse(
  await readFile(
    ".tango/staging-isolation.json",
    "utf8",
  ),
);

if (fixture.projectRef !== context.stagingProjectRef) {
  throw new Error(
    "El fixture no pertenece al staging actual.",
  );
}

for (const key of [
  "businessAId",
  "businessBId",
  "userAId",
  "userBId",
  "serviceAId",
  "customerAId",
  "reservationAId",
  "reservationBId",
  "floorTableAId",
  "floorTableBId",
]) {
  if (!fixture[key]) {
    throw new Error(
      `Falta ${key}. Ejecuta staging:seed-isolation después de aplicar la migración 010.`,
    );
  }
}

function client(key = context.publicKey) {
  return createClient(context.url, key, {
    auth: {
      autoRefreshToken: false,
      detectSessionInUrl: false,
      persistSession: false,
    },
  });
}

async function signIn(target, email, password) {
  const { error } =
    await target.auth.signInWithPassword({
      email,
      password,
    });

  if (error) {
    throw error;
  }
}

async function expectFailure(promise, label) {
  const { error } = await promise;

  assert.ok(error, label);
  return error;
}

async function snapshotTable(
  table,
  businessId,
  orderColumn,
) {
  let query = admin
    .from(table)
    .select("*")
    .eq("business_id", businessId);

  if (orderColumn) {
    query = query.order(orderColumn, {
      ascending: true,
    });
  }

  const { data, error } = await query;

  if (error) {
    throw error;
  }

  return data ?? [];
}

async function restoreBusinessFloorPlan(
  businessId,
  snapshot,
) {
  const { error: assignmentsDeleteError } =
    await admin
      .from("reservation_table_assignments")
      .delete()
      .eq("business_id", businessId);

  if (assignmentsDeleteError) {
    throw assignmentsDeleteError;
  }

  const { error: tablesDeleteError } =
    await admin
      .from("floor_tables")
      .delete()
      .eq("business_id", businessId);

  if (tablesDeleteError) {
    throw tablesDeleteError;
  }

  const { error: settingsDeleteError } =
    await admin
      .from("floor_plan_settings")
      .delete()
      .eq("business_id", businessId);

  if (settingsDeleteError) {
    throw settingsDeleteError;
  }

  if (snapshot.settings.length) {
    const { error } = await admin
      .from("floor_plan_settings")
      .insert(snapshot.settings);

    if (error) {
      throw error;
    }
  }

  if (snapshot.tables.length) {
    const { error } = await admin
      .from("floor_tables")
      .insert(snapshot.tables);

    if (error) {
      throw error;
    }
  }

  if (snapshot.assignments.length) {
    const { error } = await admin
      .from("reservation_table_assignments")
      .insert(snapshot.assignments);

    if (error) {
      throw error;
    }
  }
}

const admin = client(context.serverSecret);
const userA = client();
const userB = client();
const anonymous = client();
const temporaryReservationId = randomUUID();
let temporaryTableId = null;

const settingsPayload = {
  background_image_url:
    "https://example.invalid/e19-floor.webp",
  background_fit: "contain",
  background_x: 10,
  background_y: 20,
  background_width: 1200,
  background_height: 700,
  background_opacity: 65,
  background_brightness: 90,
  background_contrast: 85,
};

function tablePayload(overrides = {}) {
  return {
    label: "E19 Temporary Table",
    seats: 4,
    x: 25,
    y: 35,
    width: 140,
    height: 90,
    rotation: 0,
    shape: "rectangle",
    corner_radius: 16,
    status: "available",
    can_join: true,
    ...overrides,
  };
}

console.log(
  "Ejecutando escritura segura del plano en staging...",
);

const snapshotA = {
  settings: await snapshotTable(
    "floor_plan_settings",
    fixture.businessAId,
    "business_id",
  ),
  tables: await snapshotTable(
    "floor_tables",
    fixture.businessAId,
    "id",
  ),
  assignments: await snapshotTable(
    "reservation_table_assignments",
    fixture.businessAId,
    "reservation_id",
  ),
};
const snapshotB = {
  settings: await snapshotTable(
    "floor_plan_settings",
    fixture.businessBId,
    "business_id",
  ),
  tables: await snapshotTable(
    "floor_tables",
    fixture.businessBId,
    "id",
  ),
  assignments: await snapshotTable(
    "reservation_table_assignments",
    fixture.businessBId,
    "reservation_id",
  ),
};

try {
  await signIn(
    userA,
    context.userAEmail,
    context.userAPassword,
  );
  await signIn(
    userB,
    context.userBEmail,
    context.userBPassword,
  );
  console.log("✓ ambos usuarios se autenticaron");

  await expectFailure(
    anonymous.rpc(
      "save_business_floor_plan_settings",
      {
        p_business_id: fixture.businessAId,
        p_settings: settingsPayload,
      },
    ),
    "anon no debe guardar ajustes del plano",
  );
  console.log(
    "✓ anon no puede guardar ajustes del plano",
  );

  await expectFailure(
    anonymous.rpc("save_business_floor_table", {
      p_business_id: fixture.businessAId,
      p_table_id: null,
      p_table: tablePayload(),
    }),
    "anon no debe crear mesas",
  );
  console.log("✓ anon no puede crear mesas");

  await expectFailure(
    anonymous.rpc(
      "set_business_reservation_tables",
      {
        p_business_id: fixture.businessAId,
        p_reservation_id:
          fixture.reservationAId,
        p_table_ids: [fixture.floorTableAId],
      },
    ),
    "anon no debe asignar mesas",
  );
  console.log("✓ anon no puede asignar mesas");

  const [
    ownSettings,
    ownTables,
    ownAssignments,
    crossSettings,
    crossTables,
    crossAssignments,
  ] = await Promise.all([
    userA
      .from("floor_plan_settings")
      .select("business_id")
      .eq("business_id", fixture.businessAId),
    userA
      .from("floor_tables")
      .select("id, business_id")
      .eq("business_id", fixture.businessAId),
    userA
      .from("reservation_table_assignments")
      .select("business_id, reservation_id")
      .eq("business_id", fixture.businessAId),
    userA
      .from("floor_plan_settings")
      .select("business_id")
      .eq("business_id", fixture.businessBId),
    userA
      .from("floor_tables")
      .select("id")
      .eq("business_id", fixture.businessBId),
    userA
      .from("reservation_table_assignments")
      .select("reservation_id")
      .eq("business_id", fixture.businessBId),
  ]);

  for (const result of [
    ownSettings,
    ownTables,
    ownAssignments,
    crossSettings,
    crossTables,
    crossAssignments,
  ]) {
    if (result.error) {
      throw result.error;
    }
  }

  assert.equal(ownSettings.data.length, 1);
  assert.ok(
    ownTables.data.some(
      (row) => row.id === fixture.floorTableAId,
    ),
  );
  assert.ok(
    ownAssignments.data.some(
      (row) =>
        row.reservation_id
        === fixture.reservationAId,
    ),
  );
  assert.equal(crossSettings.data.length, 0);
  assert.equal(crossTables.data.length, 0);
  assert.equal(crossAssignments.data.length, 0);
  console.log(
    "✓ lectura propia y BOLA de plano respetan el tenant",
  );

  const { data: settingsSaved, error: settingsError } =
    await userA.rpc(
      "save_business_floor_plan_settings",
      {
        p_business_id: fixture.businessAId,
        p_settings: settingsPayload,
      },
    );

  if (settingsError) {
    throw settingsError;
  }

  assert.equal(
    settingsSaved.background_fit,
    "contain",
  );
  console.log(
    "✓ usuario A actualizó solo sus ajustes",
  );

  await expectFailure(
    userA.rpc(
      "save_business_floor_plan_settings",
      {
        p_business_id: fixture.businessBId,
        p_settings: settingsPayload,
      },
    ),
    "usuario A no debe guardar ajustes de B",
  );
  console.log(
    "✓ usuario A no puede modificar los ajustes de B",
  );

  const { data: tableCreated, error: createError } =
    await userA.rpc(
      "save_business_floor_table",
      {
        p_business_id: fixture.businessAId,
        p_table_id: null,
        p_table: tablePayload(),
      },
    );

  if (createError || !tableCreated) {
    throw createError
      ?? new Error(
        "No se creó la mesa temporal.",
      );
  }

  temporaryTableId = tableCreated.id;
  assert.equal(tableCreated.seats, 4);
  console.log("✓ usuario A creó una mesa propia");

  const { data: tableUpdated, error: updateError } =
    await userA.rpc(
      "save_business_floor_table",
      {
        p_business_id: fixture.businessAId,
        p_table_id: temporaryTableId,
        p_table: tablePayload({
          label: "E19 Temporary Table Edited",
          x: 30,
        }),
      },
    );

  if (updateError) {
    throw updateError;
  }

  assert.equal(
    tableUpdated.label,
    "E19 Temporary Table Edited",
  );
  console.log("✓ usuario A actualizó su mesa");

  const { error: nonJoinableError } =
    await userA.rpc(
      "save_business_floor_table",
      {
        p_business_id: fixture.businessAId,
        p_table_id: temporaryTableId,
        p_table: tablePayload({
          label: "E19 Temporary Table Edited",
          x: 30,
          can_join: false,
        }),
      },
    );

  if (nonJoinableError) {
    throw nonJoinableError;
  }

  await expectFailure(
    userA.rpc(
      "set_business_reservation_tables",
      {
        p_business_id: fixture.businessAId,
        p_reservation_id:
          fixture.reservationAId,
        p_table_ids: [
          fixture.floorTableAId,
          temporaryTableId,
        ],
      },
    ),
    "una combinación no habilitada por la mesa debe fallar",
  );

  const { error: joinableError } =
    await userA.rpc(
      "save_business_floor_table",
      {
        p_business_id: fixture.businessAId,
        p_table_id: temporaryTableId,
        p_table: tablePayload({
          label: "E19 Temporary Table Edited",
          x: 30,
        }),
      },
    );

  if (joinableError) {
    throw joinableError;
  }
  console.log(
    "✓ una mesa no combinable no puede integrarse a un conjunto",
  );

  const { error: multiAssignmentError } =
    await userA.rpc(
      "set_business_reservation_tables",
      {
        p_business_id: fixture.businessAId,
        p_reservation_id:
          fixture.reservationAId,
        p_table_ids: [
          fixture.floorTableAId,
          temporaryTableId,
        ],
      },
    );

  if (multiAssignmentError) {
    throw multiAssignmentError;
  }

  await expectFailure(
    userA.rpc("save_business_floor_table", {
      p_business_id: fixture.businessAId,
      p_table_id: temporaryTableId,
      p_table: tablePayload({
        label: "E19 Temporary Table Edited",
        x: 30,
        can_join: false,
      }),
    }),
    "una mesa asignada en combinación no debe dejar de ser combinable",
  );

  await expectFailure(
    admin
      .from("reservation_rules")
      .update({
        allow_table_combinations: false,
      })
      .eq("business_id", fixture.businessAId),
    "las reglas no deben invalidar una combinación activa",
  );
  console.log(
    "✓ los triggers protegen combinaciones activas",
  );

  await expectFailure(
    userB.rpc("save_business_floor_table", {
      p_business_id: fixture.businessBId,
      p_table_id: temporaryTableId,
      p_table: tablePayload(),
    }),
    "usuario B no debe actualizar la mesa de A",
  );
  console.log(
    "✓ usuario B no puede actualizar la mesa de A",
  );

  await expectFailure(
    userA
      .from("floor_tables")
      .insert({
        business_id: fixture.businessAId,
        ...tablePayload({
          label: "Direct DML E19",
        }),
      }),
    "INSERT directo debe fallar",
  );
  await expectFailure(
    userA
      .from("floor_tables")
      .update({
        label: "Direct update denied",
      })
      .eq("id", temporaryTableId),
    "UPDATE directo debe fallar",
  );
  await expectFailure(
    userA
      .from("floor_tables")
      .delete()
      .eq("id", temporaryTableId),
    "DELETE directo debe fallar",
  );
  console.log(
    "✓ INSERT, UPDATE y DELETE directos siguen bloqueados",
  );

  const { data: assignment, error: assignmentError } =
    await userA.rpc(
      "set_business_reservation_tables",
      {
        p_business_id: fixture.businessAId,
        p_reservation_id:
          fixture.reservationAId,
        p_table_ids: [temporaryTableId],
      },
    );

  if (assignmentError) {
    throw assignmentError;
  }

  assert.deepEqual(
    assignment.table_ids,
    [temporaryTableId],
  );
  console.log(
    "✓ usuario A asignó su reserva a su mesa",
  );

  const {
    data: repeatedAssignment,
    error: repeatedError,
  } = await userA.rpc(
    "set_business_reservation_tables",
    {
      p_business_id: fixture.businessAId,
      p_reservation_id:
        fixture.reservationAId,
      p_table_ids: [temporaryTableId],
    },
  );

  if (repeatedError) {
    throw repeatedError;
  }

  assert.equal(
    repeatedAssignment.assigned_at,
    assignment.assigned_at,
  );
  console.log(
    "✓ repetir la misma asignación es idempotente",
  );

  await expectFailure(
    userA.rpc(
      "set_business_reservation_tables",
      {
        p_business_id: fixture.businessAId,
        p_reservation_id:
          fixture.reservationBId,
        p_table_ids: [temporaryTableId],
      },
    ),
    "usuario A no debe asignar una reserva de B",
  );
  console.log(
    "✓ usuario A no puede asignar una reserva de B",
  );

  await expectFailure(
    userB.rpc(
      "set_business_reservation_tables",
      {
        p_business_id: fixture.businessBId,
        p_reservation_id:
          fixture.reservationBId,
        p_table_ids: [temporaryTableId],
      },
    ),
    "usuario B no debe usar una mesa de A",
  );
  console.log(
    "✓ usuario B no puede usar una mesa de A",
  );

  await expectFailure(
    userA.rpc("save_business_floor_table", {
      p_business_id: fixture.businessAId,
      p_table_id: temporaryTableId,
      p_table: tablePayload({
        label: "E19 Temporary Table Edited",
        seats: 1,
      }),
    }),
    "no debe reducirse la capacidad asignada",
  );
  console.log(
    "✓ el trigger protege la capacidad ya asignada",
  );

  const { error: releaseError } =
    await userA.rpc(
      "set_business_reservation_tables",
      {
        p_business_id: fixture.businessAId,
        p_reservation_id:
          fixture.reservationAId,
        p_table_ids: [],
      },
    );

  if (releaseError) {
    throw releaseError;
  }

  const { error: smallTableError } =
    await userA.rpc(
      "save_business_floor_table",
      {
        p_business_id: fixture.businessAId,
        p_table_id: temporaryTableId,
        p_table: tablePayload({
          label:
            "E19 Temporary Table Edited",
          seats: 1,
        }),
      },
    );

  if (smallTableError) {
    throw smallTableError;
  }

  await expectFailure(
    userA.rpc(
      "set_business_reservation_tables",
      {
        p_business_id: fixture.businessAId,
        p_reservation_id:
          fixture.reservationAId,
        p_table_ids: [temporaryTableId],
      },
    ),
    "la capacidad insuficiente debe fallar",
  );

  const { error: restoreSeatsError } =
    await userA.rpc(
      "save_business_floor_table",
      {
        p_business_id: fixture.businessAId,
        p_table_id: temporaryTableId,
        p_table: tablePayload({
          label:
            "E19 Temporary Table Edited",
        }),
      },
    );

  if (restoreSeatsError) {
    throw restoreSeatsError;
  }
  console.log(
    "✓ la capacidad insuficiente fue rechazada",
  );

  const { error: blockedError } =
    await userA.rpc(
      "save_business_floor_table",
      {
        p_business_id: fixture.businessAId,
        p_table_id: temporaryTableId,
        p_table: tablePayload({
          label:
            "E19 Temporary Table Edited",
          status: "blocked",
        }),
      },
    );

  if (blockedError) {
    throw blockedError;
  }

  await expectFailure(
    userA.rpc(
      "set_business_reservation_tables",
      {
        p_business_id: fixture.businessAId,
        p_reservation_id:
          fixture.reservationAId,
        p_table_ids: [temporaryTableId],
      },
    ),
    "una mesa bloqueada debe rechazarse",
  );

  const { error: availableError } =
    await userA.rpc(
      "save_business_floor_table",
      {
        p_business_id: fixture.businessAId,
        p_table_id: temporaryTableId,
        p_table: tablePayload({
          label:
            "E19 Temporary Table Edited",
        }),
      },
    );

  if (availableError) {
    throw availableError;
  }
  console.log(
    "✓ una mesa bloqueada no puede asignarse",
  );

  const { data: fixtureReservation, error: fixtureError } =
    await admin
      .from("reservations")
      .select("*")
      .eq("id", fixture.reservationAId)
      .single();

  if (fixtureError) {
    throw fixtureError;
  }

  const publicCode =
    `RES-${randomUUID()
      .replaceAll("-", "")
      .slice(0, 12)
      .toUpperCase()}`;

  const { error: temporaryReservationError } =
    await admin
      .from("reservations")
      .insert({
        id: temporaryReservationId,
        business_id: fixture.businessAId,
        service_id: fixture.serviceAId,
        customer_id: fixture.customerAId,
        customer_name:
          "E19 Overlapping Reservation",
        customer_phone: "541155551919",
        customer_email:
          "e19-overlap@example.com",
        reservation_date:
          fixtureReservation.reservation_date,
        reservation_time:
          fixtureReservation.reservation_time,
        party_size: 2,
        status: "confirmed",
        notes: "Temporary floor plan test",
        source: "manual",
        duration_minutes:
          fixtureReservation.duration_minutes,
        public_code: publicCode,
        idempotency_key:
          `e19-floor-${Date.now()}`,
        confirmed_at: new Date().toISOString(),
      });

  if (temporaryReservationError) {
    throw temporaryReservationError;
  }

  const { error: assignFixtureError } =
    await userA.rpc(
      "set_business_reservation_tables",
      {
        p_business_id: fixture.businessAId,
        p_reservation_id:
          fixture.reservationAId,
        p_table_ids: [temporaryTableId],
      },
    );

  if (assignFixtureError) {
    throw assignFixtureError;
  }

  await expectFailure(
    userA.rpc(
      "set_business_reservation_tables",
      {
        p_business_id: fixture.businessAId,
        p_reservation_id:
          temporaryReservationId,
        p_table_ids: [temporaryTableId],
      },
    ),
    "el solapamiento debe fallar",
  );
  console.log(
    "✓ el solapamiento de mesa fue rechazado",
  );

  await expectFailure(
    userA.rpc(
      "set_business_floor_table_active",
      {
        p_business_id: fixture.businessAId,
        p_table_id: temporaryTableId,
        p_is_active: false,
      },
    ),
    "una mesa asignada no debe archivarse",
  );
  console.log(
    "✓ una mesa asignada no puede archivarse",
  );

  const { error: finalReleaseError } =
    await userA.rpc(
      "set_business_reservation_tables",
      {
        p_business_id: fixture.businessAId,
        p_reservation_id:
          fixture.reservationAId,
        p_table_ids: [],
      },
    );

  if (finalReleaseError) {
    throw finalReleaseError;
  }

  const { error: assignTerminalError } =
    await userA.rpc(
      "set_business_reservation_tables",
      {
        p_business_id: fixture.businessAId,
        p_reservation_id:
          temporaryReservationId,
        p_table_ids: [temporaryTableId],
      },
    );

  if (assignTerminalError) {
    throw assignTerminalError;
  }

  const { error: completeError } =
    await userA.rpc(
      "set_business_reservation_status",
      {
        p_business_id: fixture.businessAId,
        p_reservation_id:
          temporaryReservationId,
        p_status: "completed",
      },
    );

  if (completeError) {
    throw completeError;
  }

  await expectFailure(
    userA.rpc(
      "set_business_reservation_tables",
      {
        p_business_id: fixture.businessAId,
        p_reservation_id:
          temporaryReservationId,
        p_table_ids: [],
      },
    ),
    "una asignación terminal no debe alterarse",
  );
  console.log(
    "✓ la asignación terminal conserva el historial",
  );

  const { data: archived, error: archiveError } =
    await userA.rpc(
      "set_business_floor_table_active",
      {
        p_business_id: fixture.businessAId,
        p_table_id: temporaryTableId,
        p_is_active: false,
      },
    );

  if (archiveError) {
    throw archiveError;
  }

  assert.equal(archived.is_active, false);

  const { data: restored, error: restoreError } =
    await userA.rpc(
      "set_business_floor_table_active",
      {
        p_business_id: fixture.businessAId,
        p_table_id: temporaryTableId,
        p_is_active: true,
      },
    );

  if (restoreError) {
    throw restoreError;
  }

  assert.equal(restored.is_active, true);
  console.log(
    "✓ liberación, archivo y restauración fueron válidos",
  );

  const currentB = {
    settings: await snapshotTable(
      "floor_plan_settings",
      fixture.businessBId,
      "business_id",
    ),
    tables: await snapshotTable(
      "floor_tables",
      fixture.businessBId,
      "id",
    ),
    assignments: await snapshotTable(
      "reservation_table_assignments",
      fixture.businessBId,
      "reservation_id",
    ),
  };

  assert.deepEqual(currentB, snapshotB);
  console.log(
    "✓ las operaciones de A no modificaron B",
  );
} finally {
  const { error: tempAssignmentDeleteError } =
    await admin
      .from("reservation_table_assignments")
      .delete()
      .eq(
        "reservation_id",
        temporaryReservationId,
      );

  if (tempAssignmentDeleteError) {
    console.error(tempAssignmentDeleteError);
  }

  const { error: tempReservationDeleteError } =
    await admin
      .from("reservations")
      .delete()
      .eq("id", temporaryReservationId);

  if (tempReservationDeleteError) {
    console.error(tempReservationDeleteError);
  }

  await restoreBusinessFloorPlan(
    fixture.businessAId,
    snapshotA,
  );
  await restoreBusinessFloorPlan(
    fixture.businessBId,
    snapshotB,
  );
  console.log(
    "✓ plano y asignaciones A/B restaurados",
  );

  await Promise.all([
    userA.auth.signOut(),
    userB.auth.signOut(),
  ]);
  console.log("✓ las sesiones fueron cerradas");
}

console.log(
  "Escritura segura del plano aprobada (27 controles).",
);
