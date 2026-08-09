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
  await readFile(".tango/staging-isolation.json", "utf8"),
);

if (fixture.projectRef !== context.stagingProjectRef) {
  throw new Error("El fixture no pertenece al staging actual.");
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

const admin = client(context.serverSecret);
const userA = client();
const userB = client();
const anonymous = client();
const temporaryStaff = client();
let temporaryRoleId = null;
let temporaryMemberId = null;
let temporaryAuthUserId = null;

async function signIn(target, email, password) {
  const { error } = await target.auth.signInWithPassword({
    email,
    password,
  });

  if (error) throw error;
}

async function expectFailure(promise, label) {
  const { error } = await promise;
  assert.ok(error, label);
  return error;
}

async function snapshotBusinessRoles(businessId) {
  const { data, error } = await admin
    .from("staff_roles")
    .select("id, business_id, preset_key, name, is_preset, archived_at")
    .eq("business_id", businessId)
    .order("id", { ascending: true });

  if (error) throw error;
  return data ?? [];
}

async function readMember(memberId) {
  const { data, error } = await admin
    .from("business_members")
    .select(
      "id, business_id, user_id, email, display_name, phone, staff_role_id, role, status",
    )
    .eq("id", memberId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function readAccessControl(userId) {
  const { data, error } = await admin
    .from("user_access_controls")
    .select("user_id, reauth_after")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

console.log("Ejecutando Staff y permisos en staging...");

const rolesBBefore = await snapshotBusinessRoles(fixture.businessBId);

try {
  await signIn(userA, context.userAEmail, context.userAPassword);
  await signIn(userB, context.userBEmail, context.userBPassword);
  console.log("✓ ambos usuarios se autenticaron");

  await expectFailure(
    anonymous.rpc("save_business_staff_role", {
      p_business_id: fixture.businessAId,
      p_role_id: null,
      p_name: "E28A anon blocked",
      p_permissions: {},
    }),
    "anon no debe crear roles",
  );
  console.log("✓ anon no puede ejecutar la RPC de roles");

  const { data: presetRoles, error: presetError } = await userA
    .from("staff_roles")
    .select("id, preset_key, name, is_preset")
    .eq("business_id", fixture.businessAId)
    .eq("is_preset", true);

  if (presetError) throw presetError;
  assert.equal(presetRoles?.length, 5);
  console.log("✓ el local A tiene los cinco roles predeterminados");

  const managerRole = presetRoles.find(
    (role) => role.preset_key === "manager",
  );
  const cashierRole = presetRoles.find(
    (role) => role.preset_key === "cashier",
  );
  assert.ok(managerRole?.id);
  assert.ok(cashierRole?.id);

  await expectFailure(
    userA.rpc("save_business_staff_role", {
      p_business_id: fixture.businessAId,
      p_role_id: presetRoles[0].id,
      p_name: "No modificar preset",
      p_permissions: {},
    }),
    "un preset no debe poder editarse",
  );
  console.log("✓ los presets no pueden modificarse");

  const roleName = `E28A QA ${Date.now()}`;
  const { data: created, error: createError } = await userA.rpc(
    "save_business_staff_role",
    {
      p_business_id: fixture.businessAId,
      p_role_id: null,
      p_name: roleName,
      p_permissions: {
        reservations: "manage",
        menu: "view",
      },
    },
  );

  if (createError) throw createError;
  temporaryRoleId = created.id;
  assert.equal(created.business_id, fixture.businessAId);
  assert.equal(created.is_preset, false);
  assert.equal(created.permissions.reservations, "manage");
  assert.equal(created.permissions.menu, "view");
  assert.equal(created.permissions.cash, "none");
  console.log("✓ owner A creó un rol personalizado con default deny");

  const { data: permissions, error: permissionsError } = await userA
    .from("staff_role_permissions")
    .select("module_key, access_level")
    .eq("business_id", fixture.businessAId)
    .eq("role_id", temporaryRoleId);

  if (permissionsError) throw permissionsError;
  assert.equal(permissions?.length, 16);
  assert.equal(
    permissions?.find((row) => row.module_key === "cash")?.access_level,
    "none",
  );
  console.log(
    "✓ el rol persiste los 16 módulos y los no elegidos quedan sin acceso",
  );

  const { data: crossRead, error: crossReadError } = await userB
    .from("staff_roles")
    .select("id")
    .eq("id", temporaryRoleId);

  if (crossReadError) throw crossReadError;
  assert.deepEqual(crossRead ?? [], []);
  console.log("✓ RLS oculta el rol de A al usuario B");

  await expectFailure(
    userB.rpc("save_business_staff_role", {
      p_business_id: fixture.businessAId,
      p_role_id: temporaryRoleId,
      p_name: "BOLA blocked",
      p_permissions: {},
    }),
    "B no debe modificar roles de A",
  );
  console.log("✓ usuario B no puede modificar roles de A");

  await expectFailure(
    userA.from("staff_roles").insert({
      business_id: fixture.businessAId,
      name: "Direct insert blocked",
      is_preset: false,
    }),
    "INSERT directo debe estar bloqueado",
  );
  await expectFailure(
    userA
      .from("staff_roles")
      .update({ name: "Direct update blocked" })
      .eq("id", temporaryRoleId),
    "UPDATE directo debe estar bloqueado",
  );
  await expectFailure(
    userA
      .from("staff_role_permissions")
      .delete()
      .eq("role_id", temporaryRoleId),
    "DELETE directo debe estar bloqueado",
  );
  console.log("✓ DML directo de roles y permisos permanece bloqueado");

  const staffEmail = `e28a.qa.${randomUUID()}@example.com`;
  const staffPassword = `E28A!Aa9-${randomUUID()}`;
  const internalNote = `nota privada ${randomUUID()}`;
  const { data: invitedMember, error: invitedMemberError } =
    await userA.rpc("save_business_staff_member", {
      p_business_id: fixture.businessAId,
      p_member_id: null,
      p_user_id: null,
      p_email: staffEmail,
      p_display_name: "E28A QA Staff",
      p_phone: "+54 11 5555 0101",
      p_notes: internalNote,
      p_staff_role_id: managerRole.id,
      p_status: "invited",
    });

  if (invitedMemberError) throw invitedMemberError;
  temporaryMemberId = invitedMember.id;
  assert.equal(invitedMember.status, "invited");
  assert.equal(invitedMember.user_id, null);
  assert.equal(invitedMember.email, staffEmail.toLowerCase());
  console.log("✓ owner A creó una invitación local sin cuenta duplicada");

  const { data: ownerNote, error: ownerNoteError } = await userA
    .from("staff_member_notes")
    .select("notes")
    .eq("business_id", fixture.businessAId)
    .eq("member_id", temporaryMemberId)
    .maybeSingle();

  if (ownerNoteError) throw ownerNoteError;
  assert.equal(ownerNote?.notes, internalNote);

  const { data: foreignNote, error: foreignNoteError } = await userB
    .from("staff_member_notes")
    .select("notes")
    .eq("member_id", temporaryMemberId);

  if (foreignNoteError) throw foreignNoteError;
  assert.deepEqual(foreignNote ?? [], []);
  console.log("✓ las notas internas son visibles solo para el dueño del local");

  const { data: authCreated, error: authCreateError } =
    await admin.auth.admin.createUser({
      email: staffEmail,
      password: staffPassword,
      email_confirm: true,
      user_metadata: {
        full_name: "E28A QA Staff",
      },
    });

  if (authCreateError) throw authCreateError;
  assert.ok(authCreated.user?.id);
  temporaryAuthUserId = authCreated.user.id;

  const activatedMember = await readMember(temporaryMemberId);
  assert.equal(activatedMember?.user_id, temporaryAuthUserId);
  assert.equal(activatedMember?.status, "active");
  assert.equal(activatedMember?.staff_role_id, managerRole.id);
  console.log("✓ confirmar el email vincula y activa la invitación existente");

  await signIn(temporaryStaff, staffEmail, staffPassword);

  const { data: ownMembership, error: ownMembershipError } =
    await temporaryStaff
      .from("business_members")
      .select("id, business_id, role, status, staff_role_id")
      .eq("business_id", fixture.businessAId);

  if (ownMembershipError) throw ownMembershipError;
  assert.equal(ownMembership?.length, 1);
  assert.equal(ownMembership[0].id, temporaryMemberId);
  assert.equal(ownMembership[0].role, "staff");
  assert.equal(ownMembership[0].status, "active");
  console.log("✓ el empleado ve solo su propia membresía en el local A");

  const { data: assignedRole, error: assignedRoleError } =
    await temporaryStaff
      .from("staff_roles")
      .select("id, preset_key")
      .eq("business_id", fixture.businessAId)
      .eq("id", managerRole.id);

  if (assignedRoleError) throw assignedRoleError;
  assert.equal(assignedRole?.length, 1);

  const { data: foreignRoles, error: foreignRolesError } =
    await temporaryStaff
      .from("staff_roles")
      .select("id")
      .eq("business_id", fixture.businessBId);

  if (foreignRolesError) throw foreignRolesError;
  assert.deepEqual(foreignRoles ?? [], []);
  console.log("✓ el empleado ve su rol asignado pero no roles de otro local");

  const { data: employeeNotes, error: employeeNotesError } =
    await temporaryStaff
      .from("staff_member_notes")
      .select("notes")
      .eq("member_id", temporaryMemberId);

  if (employeeNotesError) throw employeeNotesError;
  assert.deepEqual(employeeNotes ?? [], []);
  console.log("✓ el empleado no puede leer sus notas internas");

  await expectFailure(
    temporaryStaff.rpc("save_business_staff_role", {
      p_business_id: fixture.businessAId,
      p_role_id: null,
      p_name: "Staff privilege escalation",
      p_permissions: { reservations: "full" },
    }),
    "staff no debe administrar roles",
  );
  console.log("✓ un empleado no puede elevar sus propios permisos");

  const { data: resolvedUser, error: resolvedUserError } = await userA.rpc(
    "resolve_staff_auth_user",
    {
      p_business_id: fixture.businessAId,
      p_email: staffEmail,
    },
  );

  if (resolvedUserError) throw resolvedUserError;
  assert.equal(resolvedUser?.user_id, temporaryAuthUserId);
  assert.equal(resolvedUser?.confirmed, true);
  console.log("✓ el email personal resuelve la cuenta Auth existente");

  const beforeRoleChange = await readAccessControl(temporaryAuthUserId);
  const beforeRoleChangeAt = beforeRoleChange?.reauth_after
    ? Date.parse(beforeRoleChange.reauth_after)
    : Number.NEGATIVE_INFINITY;

  const { data: changedMember, error: changeMemberError } = await userA.rpc(
    "save_business_staff_member",
    {
      p_business_id: fixture.businessAId,
      p_member_id: temporaryMemberId,
      p_user_id: null,
      p_email: staffEmail,
      p_display_name: "E28A QA Staff",
      p_phone: "+54 11 5555 0101",
      p_notes: internalNote,
      p_staff_role_id: cashierRole.id,
      p_status: "active",
    },
  );

  if (changeMemberError) throw changeMemberError;
  assert.equal(changedMember.staff_role_id, cashierRole.id);

  const afterRoleChange = await readAccessControl(temporaryAuthUserId);
  const afterRoleChangeAt = Date.parse(afterRoleChange?.reauth_after ?? "");
  assert.ok(Number.isFinite(afterRoleChangeAt));
  assert.ok(afterRoleChangeAt >= beforeRoleChangeAt);

  const { data: oldRoleAfterChange, error: oldRoleAfterChangeError } =
    await temporaryStaff
      .from("staff_roles")
      .select("id")
      .eq("id", managerRole.id);

  if (oldRoleAfterChangeError) throw oldRoleAfterChangeError;
  assert.deepEqual(oldRoleAfterChange ?? [], []);

  const { data: newRoleAfterChange, error: newRoleAfterChangeError } =
    await temporaryStaff
      .from("staff_roles")
      .select("id")
      .eq("id", cashierRole.id);

  if (newRoleAfterChangeError) throw newRoleAfterChangeError;
  assert.equal(newRoleAfterChange?.length, 1);
  console.log("✓ cambiar el rol actualiza permisos y exige reautenticación");

  const { data: disabledMember, error: disableError } = await userA.rpc(
    "set_business_staff_member_status",
    {
      p_business_id: fixture.businessAId,
      p_member_id: temporaryMemberId,
      p_status: "disabled",
    },
  );

  if (disableError) throw disableError;
  assert.equal(disabledMember.status, "disabled");

  const afterDisable = await readAccessControl(temporaryAuthUserId);
  const afterDisableAt = Date.parse(afterDisable?.reauth_after ?? "");
  assert.ok(Number.isFinite(afterDisableAt));
  assert.ok(afterDisableAt >= afterRoleChangeAt);

  const { data: hiddenWhileDisabled, error: hiddenWhileDisabledError } =
    await temporaryStaff
      .from("staff_roles")
      .select("id")
      .eq("business_id", fixture.businessAId);

  if (hiddenWhileDisabledError) throw hiddenWhileDisabledError;
  assert.deepEqual(hiddenWhileDisabled ?? [], []);
  console.log("✓ suspender revoca inmediatamente la lectura del rol del local");

  const { data: reactivatedMember, error: reactivateError } = await userA.rpc(
    "set_business_staff_member_status",
    {
      p_business_id: fixture.businessAId,
      p_member_id: temporaryMemberId,
      p_status: "active",
    },
  );

  if (reactivateError) throw reactivateError;
  assert.equal(reactivatedMember.status, "active");

  await temporaryStaff.auth.signOut();
  await signIn(temporaryStaff, staffEmail, staffPassword);

  const { data: visibleAfterRelogin, error: visibleAfterReloginError } =
    await temporaryStaff
      .from("staff_roles")
      .select("id")
      .eq("id", cashierRole.id);

  if (visibleAfterReloginError) throw visibleAfterReloginError;
  assert.equal(visibleAfterRelogin?.length, 1);
  console.log("✓ tras reactivar y volver a iniciar sesión recupera el acceso");

  const { data: removedMember, error: removeMemberError } = await userA.rpc(
    "set_business_staff_member_status",
    {
      p_business_id: fixture.businessAId,
      p_member_id: temporaryMemberId,
      p_status: "removed",
    },
  );

  if (removeMemberError) throw removeMemberError;
  assert.equal(removedMember.status, "removed");

  const { data: hiddenAfterRemoval, error: hiddenAfterRemovalError } =
    await temporaryStaff
      .from("staff_roles")
      .select("id")
      .eq("business_id", fixture.businessAId);

  if (hiddenAfterRemovalError) throw hiddenAfterRemovalError;
  assert.deepEqual(hiddenAfterRemoval ?? [], []);
  console.log("✓ eliminar del local revoca el acceso sin borrar la cuenta Auth");

  const { data: authStillExists, error: authStillExistsError } =
    await admin.auth.admin.getUserById(temporaryAuthUserId);

  if (authStillExistsError) throw authStillExistsError;
  assert.equal(authStillExists.user?.id, temporaryAuthUserId);
  console.log("✓ la cuenta global sigue existiendo después de quitar el local");

  const { error: archiveError } = await userA.rpc(
    "archive_business_staff_role",
    {
      p_business_id: fixture.businessAId,
      p_role_id: temporaryRoleId,
    },
  );

  if (archiveError) throw archiveError;

  const { data: hiddenAfterArchive, error: hiddenError } = await userA
    .from("staff_roles")
    .select("id")
    .eq("id", temporaryRoleId);

  if (hiddenError) throw hiddenError;
  assert.deepEqual(hiddenAfterArchive ?? [], []);
  console.log("✓ el rol personalizado usa eliminación lógica");

  assert.deepEqual(
    await snapshotBusinessRoles(fixture.businessBId),
    rolesBBefore,
  );
  console.log("✓ las operaciones de A no modificaron los roles de B");
} finally {
  if (temporaryMemberId) {
    const { error: memberCleanupError } = await admin
      .from("business_members")
      .delete()
      .eq("id", temporaryMemberId)
      .eq("business_id", fixture.businessAId);

    if (memberCleanupError) throw memberCleanupError;
    console.log("✓ la membresía temporal fue eliminada del fixture");
  }

  if (temporaryAuthUserId) {
    const { error: authCleanupError } =
      await admin.auth.admin.deleteUser(temporaryAuthUserId);

    if (authCleanupError) throw authCleanupError;
    console.log("✓ la cuenta Auth temporal fue eliminada");
  }

  if (temporaryRoleId) {
    const { error: cleanupError } = await admin
      .from("staff_roles")
      .delete()
      .eq("id", temporaryRoleId)
      .eq("business_id", fixture.businessAId);

    if (cleanupError) throw cleanupError;
    console.log("✓ el rol temporal fue eliminado del fixture");
  }

  await temporaryStaff.auth.signOut();
  await userA.auth.signOut();
  await userB.auth.signOut();
  console.log("✓ las sesiones fueron cerradas");
}

console.log("Staff, permisos y revocación aprobados en staging (23 controles).");
