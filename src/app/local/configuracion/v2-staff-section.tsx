"use client";

import { useMemo, useState } from "react";
import {
  Copy,
  MailPlus,
  Pencil,
  Plus,
  Power,
  ShieldCheck,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { V2Badge } from "@/components/v2/v2-badge";
import { V2Button } from "@/components/v2/v2-button";
import { V2Card } from "@/components/v2/v2-card";
import {
  V2Field,
  V2Input,
  V2Select,
  V2Textarea,
} from "@/components/v2/v2-input";
import { V2Modal } from "@/components/v2/v2-modal";
import {
  removeBusinessStaffRoleAction,
  saveBusinessStaffMemberAction,
  saveBusinessStaffRoleAction,
  setBusinessStaffMemberStatusAction,
} from "./staff-actions";
import {
  STAFF_ACCESS_LEVEL_OPTIONS,
  STAFF_MODULE_DEFINITIONS,
  createNoAccessStaffPermissions,
  type BusinessStaffSnapshot,
  type StaffAccessLevel,
  type StaffMemberEditor,
  type StaffPermissionMap,
  type StaffRoleEditor,
} from "@/lib/staff/staff-contract";

type StaffTab = "employees" | "roles" | "invitations";
type MutationStatus = "idle" | "saving" | "saved" | "error";

type RoleDraft = {
  id: string | null;
  name: string;
  permissions: StaffPermissionMap;
};

type MemberDraft = {
  id: string | null;
  email: string;
  displayName: string;
  phone: string;
  notes: string;
  staffRoleId: string;
  status: "active" | "invited" | "disabled";
};

const EMPTY_SNAPSHOT: BusinessStaffSnapshot = {
  roles: [],
  members: [],
};

function createEmptyRoleDraft(): RoleDraft {
  return {
    id: null,
    name: "",
    permissions: createNoAccessStaffPermissions(),
  };
}

function createEmptyMemberDraft(
  defaultRoleId = "",
): MemberDraft {
  return {
    id: null,
    email: "",
    displayName: "",
    phone: "",
    notes: "",
    staffRoleId: defaultRoleId,
    status: "invited",
  };
}

function copyPermissions(
  permissions: StaffPermissionMap,
): StaffPermissionMap {
  return { ...permissions };
}

function getRoleName(
  roles: StaffRoleEditor[],
  roleId: string | null,
) {
  return (
    roles.find((role) => role.id === roleId)?.name
    ?? "Sin rol"
  );
}

function memberStatusBadge(
  status: StaffMemberEditor["status"],
) {
  if (status === "active") {
    return <V2Badge tone="green">Activo</V2Badge>;
  }

  if (status === "disabled") {
    return <V2Badge tone="red">Suspendido</V2Badge>;
  }

  return <V2Badge tone="blue">Invitación pendiente</V2Badge>;
}

function accessTone(level: StaffAccessLevel) {
  if (level === "full") return "green" as const;
  if (level === "manage") return "blue" as const;
  if (level === "view") return "slate" as const;
  return "slate" as const;
}

export function V2StaffSection({
  initialSnapshot = null,
  persistence = "local",
  canManage = false,
}: {
  initialSnapshot?: BusinessStaffSnapshot | null;
  persistence?: "local" | "supabase";
  canManage?: boolean;
}) {
  const [snapshot, setSnapshot] = useState<BusinessStaffSnapshot>(
    initialSnapshot ?? EMPTY_SNAPSHOT,
  );
  const [activeTab, setActiveTab] = useState<StaffTab>("employees");
  const [roleDraft, setRoleDraft] = useState<RoleDraft | null>(null);
  const [memberDraft, setMemberDraft] = useState<MemberDraft | null>(null);
  const [mutationStatus, setMutationStatus] =
    useState<MutationStatus>("idle");
  const [mutationMessage, setMutationMessage] = useState("");

  const employees = useMemo(
    () => snapshot.members.filter((member) => member.status !== "invited"),
    [snapshot.members],
  );
  const invitations = useMemo(
    () => snapshot.members.filter((member) => member.status === "invited"),
    [snapshot.members],
  );
  const customRoleCount = useMemo(
    () => snapshot.roles.filter((role) => !role.isPreset).length,
    [snapshot.roles],
  );

  function setFeedback(
    status: MutationStatus,
    message = "",
  ) {
    setMutationStatus(status);
    setMutationMessage(message);
  }

  function applyActionResult(
    result:
      | {
          ok: true;
          snapshot: BusinessStaffSnapshot;
          message?: string;
        }
      | {
          ok: false;
          error: string;
        },
  ) {
    if (!result.ok) {
      setFeedback("error", result.error);
      return false;
    }

    setSnapshot(result.snapshot);
    setFeedback("saved", result.message ?? "Cambios guardados.");
    return true;
  }

  function openNewRole() {
    setRoleDraft(createEmptyRoleDraft());
    setFeedback("idle");
  }

  function openRoleEditor(role: StaffRoleEditor) {
    if (role.isPreset) return;

    setRoleDraft({
      id: role.id,
      name: role.name,
      permissions: copyPermissions(role.permissions),
    });
    setFeedback("idle");
  }

  function duplicateRole(role: StaffRoleEditor) {
    setRoleDraft({
      id: null,
      name: `${role.name} personalizado`,
      permissions: copyPermissions(role.permissions),
    });
    setFeedback("idle");
  }

  function updateRolePermission(
    moduleKey: keyof StaffPermissionMap,
    accessLevel: StaffAccessLevel,
  ) {
    setRoleDraft((current) =>
      current
        ? {
            ...current,
            permissions: {
              ...current.permissions,
              [moduleKey]: accessLevel,
            },
          }
        : current,
    );
    setFeedback("idle");
  }

  async function saveRole() {
    if (!roleDraft || persistence !== "supabase" || !canManage) return;

    setFeedback("saving");
    const result = await saveBusinessStaffRoleAction({
      roleId: roleDraft.id,
      name: roleDraft.name,
      permissions: roleDraft.permissions,
    });

    if (applyActionResult(result)) {
      setRoleDraft(null);
    }
  }

  async function removeRole(role: StaffRoleEditor) {
    if (
      role.isPreset
      || persistence !== "supabase"
      || !canManage
      || !window.confirm(
        `¿Eliminar el rol “${role.name}”? Solo puede eliminarse si no está asignado.`,
      )
    ) {
      return;
    }

    setFeedback("saving");
    applyActionResult(
      await removeBusinessStaffRoleAction({ roleId: role.id }),
    );
  }

  function openNewMember() {
    setMemberDraft(
      createEmptyMemberDraft(snapshot.roles[0]?.id ?? ""),
    );
    setFeedback("idle");
  }

  function openMemberEditor(member: StaffMemberEditor) {
    setMemberDraft({
      id: member.id,
      email: member.email,
      displayName: member.displayName,
      phone: member.phone,
      notes: member.notes,
      staffRoleId: member.staffRoleId ?? "",
      status: member.status,
    });
    setFeedback("idle");
  }

  function updateMemberDraft<K extends keyof MemberDraft>(
    field: K,
    value: MemberDraft[K],
  ) {
    setMemberDraft((current) =>
      current ? { ...current, [field]: value } : current,
    );
    setFeedback("idle");
  }

  async function saveMember() {
    if (!memberDraft || persistence !== "supabase" || !canManage) return;

    setFeedback("saving");
    const result = await saveBusinessStaffMemberAction({
      memberId: memberDraft.id,
      email: memberDraft.email,
      displayName: memberDraft.displayName,
      phone: memberDraft.phone,
      notes: memberDraft.notes,
      staffRoleId: memberDraft.staffRoleId,
      status: memberDraft.status,
    });

    if (applyActionResult(result)) {
      setMemberDraft(null);
    }
  }

  async function changeMemberStatus(
    member: StaffMemberEditor,
    status: "active" | "disabled" | "removed",
  ) {
    if (persistence !== "supabase" || !canManage) return;

    const actionLabel =
      status === "removed"
        ? member.status === "invited"
          ? "cancelar esta invitación"
          : "eliminar a este empleado del local"
        : status === "disabled"
          ? "suspender el acceso de este empleado"
          : "reactivar el acceso de este empleado";

    if (!window.confirm(`¿Querés ${actionLabel}?`)) return;

    setFeedback("saving");
    applyActionResult(
      await setBusinessStaffMemberStatusAction({
        memberId: member.id,
        status,
      }),
    );
  }

  const staffUnavailable =
    persistence !== "supabase" || !canManage;

  return (
    <V2Card>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-purple-50 text-purple-700">
            <UsersRound size={20} />
          </div>
          <div>
            <h2 className="text-base font-semibold text-slate-950">Staff</h2>
            <p className="mt-1 text-sm text-slate-500">
              Empleados, invitaciones y roles del local seleccionado.
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <V2Badge tone="slate">{employees.length} empleados</V2Badge>
          {invitations.length > 0 ? (
            <V2Badge tone="blue">{invitations.length} pendientes</V2Badge>
          ) : null}
        </div>
      </div>

      {staffUnavailable ? (
        <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          Staff solo está disponible para el dueño del local en modo Supabase.
        </div>
      ) : null}

      {mutationStatus === "error" ? (
        <div className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {mutationMessage}
        </div>
      ) : null}

      {mutationStatus === "saved" ? (
        <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
          {mutationMessage}
        </div>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div className="flex flex-wrap gap-2">
          {([
            ["employees", "Empleados"],
            ["roles", "Roles"],
            ["invitations", "Invitaciones"],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={
                activeTab === key
                  ? "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-800"
                  : "rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 hover:text-slate-950"
              }
            >
              {label}
            </button>
          ))}
        </div>

        {activeTab === "roles" ? (
          <V2Button
            size="sm"
            variant="success"
            icon={<Plus size={16} />}
            onClick={openNewRole}
            disabled={staffUnavailable || mutationStatus === "saving"}
          >
            Crear rol
          </V2Button>
        ) : (
          <V2Button
            size="sm"
            variant="success"
            icon={<MailPlus size={16} />}
            onClick={openNewMember}
            disabled={
              staffUnavailable
              || snapshot.roles.length === 0
              || mutationStatus === "saving"
            }
          >
            Invitar empleado
          </V2Button>
        )}
      </div>

      {activeTab === "employees" ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          {employees.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <UserRound className="mx-auto text-slate-300" size={28} />
              <p className="mt-3 font-semibold text-slate-950">No hay empleados cargados</p>
              <p className="mt-1 text-sm text-slate-500">Invitá al primer empleado y asignale un rol.</p>
            </div>
          ) : (
            employees.map((member) => (
              <div
                key={member.id}
                className="border-b border-slate-100 px-4 py-4 last:border-b-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">{member.displayName}</p>
                      {memberStatusBadge(member.status)}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{member.email}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {getRoleName(snapshot.roles, member.staffRoleId)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <V2Button
                      size="sm"
                      variant="secondary"
                      icon={<Pencil size={15} />}
                      onClick={() => openMemberEditor(member)}
                      disabled={mutationStatus === "saving"}
                    >
                      Editar
                    </V2Button>
                    <V2Button
                      size="sm"
                      variant="secondary"
                      icon={<Power size={15} />}
                      onClick={() =>
                        void changeMemberStatus(
                          member,
                          member.status === "disabled" ? "active" : "disabled",
                        )
                      }
                      disabled={mutationStatus === "saving"}
                    >
                      {member.status === "disabled" ? "Reactivar" : "Suspender"}
                    </V2Button>
                    <V2Button
                      size="sm"
                      variant="danger"
                      icon={<Trash2 size={15} />}
                      onClick={() => void changeMemberStatus(member, "removed")}
                      disabled={mutationStatus === "saving"}
                    >
                      Eliminar
                    </V2Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      {activeTab === "roles" ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          {snapshot.roles.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <ShieldCheck className="mx-auto text-slate-300" size={28} />
              <p className="mt-3 font-semibold text-slate-950">No hay roles disponibles</p>
            </div>
          ) : (
            snapshot.roles.map((role) => {
              const enabledCount = Object.values(role.permissions).filter(
                (level) => level !== "none",
              ).length;

              return (
                <div
                  key={role.id}
                  className="border-b border-slate-100 px-4 py-4 last:border-b-0"
                >
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-slate-950">{role.name}</p>
                        <V2Badge tone={role.isPreset ? "purple" : "slate"}>
                          {role.isPreset ? "Predeterminado" : "Personalizado"}
                        </V2Badge>
                      </div>
                      <p className="mt-1 text-sm text-slate-500">
                        {enabledCount} módulos con acceso
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <V2Button
                        size="sm"
                        variant="secondary"
                        icon={<Copy size={15} />}
                        onClick={() => duplicateRole(role)}
                      >
                        Duplicar
                      </V2Button>
                      {!role.isPreset ? (
                        <>
                          <V2Button
                            size="sm"
                            variant="secondary"
                            icon={<Pencil size={15} />}
                            onClick={() => openRoleEditor(role)}
                          >
                            Editar
                          </V2Button>
                          <V2Button
                            size="sm"
                            variant="danger"
                            icon={<Trash2 size={15} />}
                            onClick={() => void removeRole(role)}
                          >
                            Eliminar
                          </V2Button>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>
              );
            })
          )}
          {customRoleCount === 0 ? (
            <div className="border-t border-slate-100 bg-slate-50 px-4 py-3 text-xs text-slate-500">
              Los roles nuevos comienzan con todos los módulos en “Sin acceso”.
            </div>
          ) : null}
        </div>
      ) : null}

      {activeTab === "invitations" ? (
        <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
          {invitations.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <MailPlus className="mx-auto text-slate-300" size={28} />
              <p className="mt-3 font-semibold text-slate-950">No hay invitaciones pendientes</p>
              <p className="mt-1 text-sm text-slate-500">Las invitaciones aceptadas pasan automáticamente a Empleados.</p>
            </div>
          ) : (
            invitations.map((member) => (
              <div
                key={member.id}
                className="border-b border-slate-100 px-4 py-4 last:border-b-0"
              >
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold text-slate-950">{member.displayName}</p>
                      {memberStatusBadge(member.status)}
                    </div>
                    <p className="mt-1 text-sm text-slate-500">{member.email}</p>
                    <p className="mt-1 text-xs font-medium text-slate-500">
                      {getRoleName(snapshot.roles, member.staffRoleId)}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <V2Button
                      size="sm"
                      variant="secondary"
                      icon={<Pencil size={15} />}
                      onClick={() => openMemberEditor(member)}
                    >
                      Modificar
                    </V2Button>
                    <V2Button
                      size="sm"
                      variant="danger"
                      icon={<Trash2 size={15} />}
                      onClick={() => void changeMemberStatus(member, "removed")}
                    >
                      Cancelar
                    </V2Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      ) : null}

      <V2Modal
        open={Boolean(roleDraft)}
        title={roleDraft?.id ? "Editar rol" : "Crear rol"}
        description="Definí el nivel de acceso a cada módulo del local."
        onClose={() => {
          if (mutationStatus !== "saving") setRoleDraft(null);
        }}
        footer={
          <>
            <V2Button
              variant="secondary"
              onClick={() => setRoleDraft(null)}
              disabled={mutationStatus === "saving"}
            >
              Cancelar
            </V2Button>
            <V2Button
              variant="primary"
              onClick={() => void saveRole()}
              disabled={mutationStatus === "saving"}
            >
              {mutationStatus === "saving" ? "Guardando..." : "Guardar rol"}
            </V2Button>
          </>
        }
      >
        {roleDraft ? (
          <div className="grid gap-4">
            <V2Field label="Nombre del rol">
              <V2Input
                value={roleDraft.name}
                maxLength={80}
                placeholder="Ej. Jefe de turno"
                onChange={(event) =>
                  setRoleDraft((current) =>
                    current ? { ...current, name: event.target.value } : current,
                  )
                }
              />
            </V2Field>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                Niveles
              </p>
              <p className="mt-1 text-xs leading-5 text-slate-500">
                Solo lectura consulta. Gestión permite agregar y editar. Acceso total también permite eliminar.
              </p>
            </div>

            <div className="v2-config-scrollbar max-h-[48vh] space-y-2 overflow-y-auto pr-1">
              {STAFF_MODULE_DEFINITIONS.map((module) => {
                const level = roleDraft.permissions[module.key];
                const label = STAFF_ACCESS_LEVEL_OPTIONS.find(
                  (option) => option.value === level,
                )?.label ?? "Sin acceso";

                return (
                  <div
                    key={module.key}
                    className="grid gap-3 rounded-xl border border-slate-200 bg-white p-3 sm:grid-cols-[1fr_190px] sm:items-center"
                  >
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-sm font-semibold text-slate-950">{module.label}</p>
                        {level !== "none" ? (
                          <V2Badge tone={accessTone(level)}>{label}</V2Badge>
                        ) : null}
                      </div>
                      <p className="mt-0.5 text-xs text-slate-400">{module.group}</p>
                    </div>
                    <V2Select
                      value={level}
                      onChange={(event) =>
                        updateRolePermission(
                          module.key,
                          event.target.value as StaffAccessLevel,
                        )
                      }
                    >
                      {STAFF_ACCESS_LEVEL_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </V2Select>
                  </div>
                );
              })}
            </div>

            {mutationStatus === "error" ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {mutationMessage}
              </div>
            ) : null}
          </div>
        ) : null}
      </V2Modal>

      <V2Modal
        open={Boolean(memberDraft)}
        title={memberDraft?.id ? "Editar empleado" : "Invitar empleado"}
        description="El email personal identifica de forma única al empleado."
        onClose={() => {
          if (mutationStatus !== "saving") setMemberDraft(null);
        }}
        footer={
          <>
            <V2Button
              variant="secondary"
              onClick={() => setMemberDraft(null)}
              disabled={mutationStatus === "saving"}
            >
              Cancelar
            </V2Button>
            <V2Button
              variant="primary"
              onClick={() => void saveMember()}
              disabled={mutationStatus === "saving"}
            >
              {mutationStatus === "saving"
                ? "Guardando..."
                : memberDraft?.id
                  ? "Guardar cambios"
                  : "Enviar invitación"}
            </V2Button>
          </>
        }
      >
        {memberDraft ? (
          <div className="grid gap-4">
            <V2Field label="Nombre y apellido">
              <V2Input
                value={memberDraft.displayName}
                maxLength={120}
                onChange={(event) =>
                  updateMemberDraft("displayName", event.target.value)
                }
              />
            </V2Field>

            <V2Field label="Email personal">
              <V2Input
                type="email"
                value={memberDraft.email}
                maxLength={254}
                disabled={Boolean(memberDraft.id)}
                onChange={(event) =>
                  updateMemberDraft("email", event.target.value)
                }
              />
            </V2Field>

            <div className="grid gap-4 sm:grid-cols-2">
              <V2Field label="Teléfono opcional">
                <V2Input
                  value={memberDraft.phone}
                  maxLength={60}
                  onChange={(event) =>
                    updateMemberDraft("phone", event.target.value)
                  }
                />
              </V2Field>
              <V2Field label="Rol">
                <V2Select
                  value={memberDraft.staffRoleId}
                  onChange={(event) =>
                    updateMemberDraft("staffRoleId", event.target.value)
                  }
                >
                  <option value="">Seleccionar rol</option>
                  {snapshot.roles.map((role) => (
                    <option key={role.id} value={role.id}>
                      {role.name}
                    </option>
                  ))}
                </V2Select>
              </V2Field>
            </div>

            <V2Field label="Notas internas">
              <V2Textarea
                value={memberDraft.notes}
                maxLength={2000}
                placeholder="Solo visible para el dueño del local."
                onChange={(event) =>
                  updateMemberDraft("notes", event.target.value)
                }
              />
            </V2Field>

            {memberDraft.id && memberDraft.status !== "invited" ? (
              <V2Field label="Estado">
                <V2Select
                  value={memberDraft.status}
                  onChange={(event) =>
                    updateMemberDraft(
                      "status",
                      event.target.value as "active" | "disabled",
                    )
                  }
                >
                  <option value="active">Activo</option>
                  <option value="disabled">Suspendido</option>
                </V2Select>
              </V2Field>
            ) : null}

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-500">
              Cambiar el rol o suspender/eliminar acceso obliga al empleado a iniciar sesión nuevamente. Si trabaja en otros locales, esos accesos se conservan.
            </div>

            {mutationStatus === "error" ? (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {mutationMessage}
              </div>
            ) : null}
          </div>
        ) : null}
      </V2Modal>
    </V2Card>
  );
}
