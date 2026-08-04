import { assertServerOnly } from "@/lib/security/server-only";
import {
  createDefaultBusinessFloorPlanSettings,
  mapBusinessFloorPlanSettingsRow,
  mapBusinessFloorTableRow,
  type BusinessFloorPlanSettingsDatabaseRow,
  type BusinessFloorTableDatabaseRow,
  type BusinessReservationTableAssignmentRow,
} from "@/lib/floor-plan/business-floor-plan-contract";
import { createSupabaseAuthServerClient } from "@/lib/supabase/auth-server";

const BUSINESS_FLOOR_TABLE_SELECT =
  "id, business_id, label, seats, x, y, width, height, rotation, shape, corner_radius, status, can_join, is_active, archived_at, created_at, updated_at" as const;

const BUSINESS_FLOOR_SETTINGS_SELECT =
  "business_id, background_image_url, background_fit, background_x, background_y, background_width, background_height, background_opacity, background_brightness, background_contrast, created_at, updated_at" as const;

const BUSINESS_TABLE_ASSIGNMENT_SELECT =
  "business_id, reservation_id, table_id, assigned_at, assigned_by" as const;

export async function getBusinessFloorPlanForBusiness(
  businessId: string,
  options?: {
    reservationIds?: string[];
  },
) {
  assertServerOnly("getBusinessFloorPlanForBusiness");

  const supabase = await createSupabaseAuthServerClient();

  if (!supabase) {
    throw new Error("No se pudo crear el cliente autenticado.");
  }

  let assignmentsQuery = supabase
    .from("reservation_table_assignments")
    .select(BUSINESS_TABLE_ASSIGNMENT_SELECT)
    .eq("business_id", businessId)
    .order("assigned_at", { ascending: true });

  if (options?.reservationIds?.length) {
    assignmentsQuery = assignmentsQuery.in(
      "reservation_id",
      options.reservationIds,
    );
  }

  const [
    tablesResult,
    settingsResult,
    assignmentsResult,
  ] = await Promise.all([
    supabase
      .from("floor_tables")
      .select(BUSINESS_FLOOR_TABLE_SELECT)
      .eq("business_id", businessId)
      .eq("is_active", true)
      .order("label", { ascending: true }),
    supabase
      .from("floor_plan_settings")
      .select(BUSINESS_FLOOR_SETTINGS_SELECT)
      .eq("business_id", businessId)
      .maybeSingle(),
    assignmentsQuery,
  ]);

  if (tablesResult.error) {
    throw new Error(
      "No se pudieron leer las mesas del negocio.",
    );
  }

  if (settingsResult.error) {
    throw new Error(
      "No se pudo leer la configuración del plano.",
    );
  }

  if (assignmentsResult.error) {
    throw new Error(
      "No se pudieron leer las asignaciones de mesas.",
    );
  }

  const tables = (tablesResult.data ?? []).map(
    (row: unknown) =>
      mapBusinessFloorTableRow(
        row as BusinessFloorTableDatabaseRow,
      ),
  );
  const settings = settingsResult.data
    ? mapBusinessFloorPlanSettingsRow(
        settingsResult.data as BusinessFloorPlanSettingsDatabaseRow,
      )
    : createDefaultBusinessFloorPlanSettings(
        businessId,
      );
  const assignmentRows =
    (assignmentsResult.data ?? []) as BusinessReservationTableAssignmentRow[];
  const assignmentsByReservationId =
    assignmentRows.reduce<
      Record<
        string,
        {
          businessId: string;
          reservationId: string;
          tableIds: string[];
          assignedAt: string | null;
          assignedBy: string | null;
        }
      >
    >((result, row) => {
      const existing = result[row.reservation_id];

      if (existing) {
        existing.tableIds.push(row.table_id);

        if (
          !existing.assignedAt
          || row.assigned_at > existing.assignedAt
        ) {
          existing.assignedAt = row.assigned_at;
          existing.assignedBy = row.assigned_by;
        }

        return result;
      }

      result[row.reservation_id] = {
        businessId: row.business_id,
        reservationId: row.reservation_id,
        tableIds: [row.table_id],
        assignedAt: row.assigned_at,
        assignedBy: row.assigned_by,
      };

      return result;
    }, {});

  for (const assignment of Object.values(
    assignmentsByReservationId,
  )) {
    assignment.tableIds.sort();
  }

  return {
    tables,
    settings,
    assignments: Object.values(
      assignmentsByReservationId,
    ),
  };
}
