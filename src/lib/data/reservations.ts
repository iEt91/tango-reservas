import type {
  CreateReservationInput,
  Reservation,
  ReservationStatus,
} from "@/data/types";
import { getDataSource } from "@/lib/data/dataSource";
import * as localReservations from "@/lib/reservations";
import * as supabaseReservations from "@/lib/data/supabase/reservations";
import { getSupabaseFloorTablesByBusinessSync } from "@/lib/data/supabase/floorPlan";
import { getSupabaseServicesByBusinessSync } from "@/lib/data/supabase/services";
import { getAvailableTablesForReservationSlot } from "@/lib/reservation-availability";

function isSupabaseMode() {
  return getDataSource() === "supabase";
}

function cloneReservation(reservation: Reservation) {
  return {
    ...reservation,
    assignedTableIds: reservation.assignedTableIds ? [...reservation.assignedTableIds] : null,
  };
}

function cloneReservations(reservations: Reservation[]) {
  return reservations.map(cloneReservation);
}

function getSupabaseReservationsByBusinessSync(businessId: string) {
  return supabaseReservations.getSupabaseReservationsByBusinessSync(businessId);
}

function getSupabaseReservationsByBusinessAndDateSync(businessId: string, date: string) {
  return supabaseReservations.getSupabaseReservationsByBusinessAndDateSync(businessId, date);
}

function getSupabaseReservationsSnapshot() {
  return supabaseReservations.getSupabaseReservationsSnapshot();
}

function getSupabaseReservationById(reservationId: string) {
  return supabaseReservations.getSupabaseReservationById(reservationId);
}

function getSupabaseActiveReservationByPhone(businessId: string, phone: string) {
  return supabaseReservations.getSupabaseActiveReservationByPhone(businessId, phone);
}

function getSupabaseReservationsByTableId(businessId: string, tableId: string) {
  return getSupabaseReservationsByBusinessSync(businessId).filter((reservation) => {
    const assignedTableIds = reservation.assignedTableIds ?? [];
    return assignedTableIds.some((entry) => entry === tableId) || reservation.tableId === tableId;
  });
}

function getSupabaseReservationTableAvailability(reservationId: string) {
  return supabaseReservations.getSupabaseReservationTableAvailability(reservationId);
}

function getSupabaseTableAvailabilitySummary(
  businessId: string,
  date: string,
  time: string,
  reservationsOverride?: Reservation[],
) {
  return supabaseReservations.getSupabaseTableAvailabilitySummary(
    businessId,
    date,
    time,
    reservationsOverride,
  );
}

function getSupabaseReservationsWithoutTableForSlot(
  businessId: string,
  date: string,
  time: string,
) {
  const summary = getSupabaseTableAvailabilitySummary(businessId, date, time);
  return summary.reservationsWithoutTable;
}

function getSupabaseActiveReservationsForSlot(
  businessId: string,
  date: string,
  time: string,
) {
  return supabaseReservations.getSupabaseActiveReservationsForSlot(businessId, date, time);
}

function getSupabaseTableOccupancyForSlot(
  businessId: string,
  date: string,
  time: string,
) {
  const summary = getSupabaseTableAvailabilitySummary(businessId, date, time);
  return {
    occupiedTableIds: summary.occupiedTableIds,
    reservationsWithoutTable: summary.reservationsWithoutTable,
    assignmentsByTableId: summary.assignmentsByTableId,
    joinedTableByTableId: summary.joinedTableByTableId,
    availableTableIds: summary.availableTableIds ?? [],
    warningsByTableId: summary.warningsByTableId ?? {},
    conflictsByTableId: summary.conflictsByTableId ?? {},
    capacityAvailable: summary.capacityAvailable,
    capacityOccupied: summary.capacityOccupied,
    reservationsWithoutTableCount: summary.reservationsWithoutTableCount,
    conflictCount: summary.conflictCount,
  };
}

function unsupportedSupabaseMutation(): never {
  throw new Error("La asignacion de mesas todavia no esta migrada a Supabase.");
}

export function normalizePhone(phone: string) {
  return localReservations.normalizePhone(phone);
}

export function validatePhone(phone: string) {
  return localReservations.validatePhone(phone);
}

export function dedupeReservations(records: Reservation[]) {
  return localReservations.dedupeReservations(records);
}

export function sortReservationsForDashboard(records: Reservation[]) {
  return localReservations.sortReservationsForDashboard(records);
}

export function sortReservationsForLocalPanel(records: Reservation[]) {
  return localReservations.sortReservationsForLocalPanel(records);
}

export function subscribeReservations(listener: () => void) {
  if (isSupabaseMode()) {
    return supabaseReservations.subscribeSupabaseReservations(listener);
  }

  return localReservations.subscribeReservations(listener);
}

export function getReservationsSnapshot() {
  if (isSupabaseMode()) {
    return getSupabaseReservationsSnapshot();
  }

  return localReservations.getReservationsSnapshot();
}

export function getReservations() {
  return getReservationsSnapshot();
}

export function getReservationsByBusinessId(businessId: string) {
  if (isSupabaseMode()) {
    return getSupabaseReservationsByBusinessSync(businessId);
  }

  return localReservations.getReservationsByBusinessId(businessId);
}

export function getReservationsByDate(businessId: string, date: string) {
  if (isSupabaseMode()) {
    return getSupabaseReservationsByBusinessAndDateSync(businessId, date);
  }

  return localReservations.getReservationsByDate(businessId, date);
}

export function getReservationById(reservationId: string) {
  if (isSupabaseMode()) {
    return getSupabaseReservationById(reservationId);
  }

  return localReservations.getReservationById(reservationId);
}

export function getReservationsByTableId(businessId: string, tableId: string) {
  if (isSupabaseMode()) {
    return getSupabaseReservationsByTableId(businessId, tableId);
  }

  return localReservations.getReservationsByTableId(businessId, tableId);
}

export function getActiveReservationByPhone(businessId: string, phone: string) {
  if (isSupabaseMode()) {
    return getSupabaseActiveReservationByPhone(businessId, phone);
  }

  return localReservations.getActiveReservationByPhone(businessId, phone);
}

export async function createReservation(data: CreateReservationInput) {
  if (isSupabaseMode()) {
    return supabaseReservations.createSupabaseReservation(data.businessId, data);
  }

  return localReservations.createReservation(data);
}

export async function updateReservationStatus(id: string, status: ReservationStatus) {
  if (isSupabaseMode()) {
    return supabaseReservations.updateSupabaseReservationStatus(id, status);
  }

  return localReservations.updateReservationStatus(id, status);
}

export async function cancelReservation(id: string) {
  if (isSupabaseMode()) {
    return supabaseReservations.updateSupabaseReservationStatus(id, "cancelled");
  }

  return localReservations.cancelReservation(id);
}

export async function deleteReservationById(reservationId: string) {
  if (isSupabaseMode()) {
    return supabaseReservations.deleteSupabaseReservation(reservationId);
  }

  return localReservations.deleteReservationById(reservationId);
}

export async function updateReservationAssignedTables(reservationId: string, tableIds: string[]) {
  if (isSupabaseMode()) {
    return supabaseReservations.updateSupabaseReservationAssignedTables(reservationId, tableIds);
  }

  return localReservations.updateReservationAssignedTables(reservationId, tableIds);
}

export async function deleteReservationsByIds(reservationIds: string[]) {
  if (isSupabaseMode()) {
    const results = [];

    for (const reservationId of reservationIds) {
      results.push(await supabaseReservations.deleteSupabaseReservation(reservationId));
    }

    return results;
  }

  return localReservations.deleteReservationsByIds(reservationIds);
}

export async function resetReservationsForBusiness(businessId: string) {
  if (isSupabaseMode()) {
    throw new Error("El reinicio de reservas todavia no esta disponible en Supabase.");
  }

  return localReservations.resetReservationsForBusiness(businessId);
}

export function getReservationTableAvailability(reservationId: string) {
  if (isSupabaseMode()) {
    return getSupabaseReservationTableAvailability(reservationId);
  }

  return localReservations.getReservationTableAvailability(reservationId);
}

export function getTableAvailabilitySummary(
  businessId: string,
  date: string,
  time: string,
  reservationsOverride?: Reservation[],
) {
  if (isSupabaseMode()) {
    return supabaseReservations.getSupabaseTableAvailabilitySummary(
      businessId,
      date,
      time,
      reservationsOverride,
    );
  }

  return localReservations.getTableAvailabilitySummary(businessId, date, time, reservationsOverride);
}

export function getTablesForBusiness(businessId: string) {
  if (isSupabaseMode()) {
    return getSupabaseFloorTablesByBusinessSync(businessId);
  }

  return localReservations.getTablesForBusiness(businessId);
}

export function getAvailableTablesForSlot(
  businessId: string,
  date: string,
  time: string,
) {
  if (isSupabaseMode()) {
    const tables = getSupabaseFloorTablesByBusinessSync(businessId);
    const services = getSupabaseServicesByBusinessSync(businessId);
    const reservations = getSupabaseReservationsByBusinessSync(businessId);
    return getAvailableTablesForReservationSlot({
      businessId,
      reservationDate: date,
      reservationTime: time,
      durationMinutes: 120,
      partySize: 1,
      tables,
      reservations,
      services,
      fallbackDurationMinutes: 120,
    }).availableTables;
  }

  return localReservations.getAvailableTablesForSlot(businessId, date, time);
}

export function getOccupiedTableIdsForSlot(
  businessId: string,
  date: string,
  time: string,
) {
  if (isSupabaseMode()) {
    return getSupabaseTableAvailabilitySummary(businessId, date, time).occupiedTableIds;
  }

  return localReservations.getOccupiedTableIdsForSlot(businessId, date, time);
}

export function getReservationTable(reservationId: string) {
  if (isSupabaseMode()) {
    return getSupabaseReservationById(reservationId)?.tableId ?? null;
  }

  return localReservations.getReservationTable(reservationId);
}

export function getReservationTableAssignmentOptions(reservationId: string) {
  if (isSupabaseMode()) {
    return [];
  }

  return localReservations.getReservationTableAssignmentOptions(reservationId);
}

export function validateReservationTableAssignment(reservation: Reservation) {
  if (isSupabaseMode()) {
    return {
      isValid: true,
      errors: ["La asignacion de mesas todavia no esta migrada a Supabase."],
      warnings: [],
    };
  }

  return localReservations.validateReservationTableAssignment(reservation);
}

export function findIndividualTableOptions(reservation: Reservation) {
  if (isSupabaseMode()) {
    return [];
  }

  return localReservations.findIndividualTableOptions(reservation);
}

export function findJoinedTableOptions(reservation: Reservation) {
  if (isSupabaseMode()) {
    return [];
  }

  return localReservations.findJoinedTableOptions(reservation);
}

export function assignReservationToTable(reservationId: string, tableId: string) {
  if (isSupabaseMode()) {
    return unsupportedSupabaseMutation();
  }

  return localReservations.assignReservationToTable(reservationId, tableId);
}

export function assignReservationToJoinedTable(reservationId: string, tableIds: string[]) {
  if (isSupabaseMode()) {
    return unsupportedSupabaseMutation();
  }

  return localReservations.assignReservationToJoinedTable(reservationId, tableIds);
}

export function unassignReservationFromTable(reservationId: string) {
  if (isSupabaseMode()) {
    return unsupportedSupabaseMutation();
  }

  return localReservations.unassignReservationFromTable(reservationId);
}

export function getActiveReservationsForSlot(
  businessId: string,
  date: string,
  time: string,
) {
  if (isSupabaseMode()) {
    return getSupabaseActiveReservationsForSlot(businessId, date, time);
  }

  return localReservations.getActiveReservationsForSlot(businessId, date, time);
}

export function getReservationsWithoutTableForSlot(
  businessId: string,
  date: string,
  time: string,
) {
  if (isSupabaseMode()) {
    return getSupabaseReservationsWithoutTableForSlot(businessId, date, time);
  }

  return localReservations.getReservationsWithoutTableForSlot(businessId, date, time);
}

export function getTableOccupancyForSlot(
  businessId: string,
  date: string,
  time: string,
) {
  if (isSupabaseMode()) {
    return getSupabaseTableOccupancyForSlot(businessId, date, time);
  }

  return localReservations.getTableOccupancyForSlot(businessId, date, time);
}

export function canFitReservationInTable(reservation: Reservation, table: Parameters<typeof localReservations.canFitReservationInTable>[1]) {
  if (isSupabaseMode()) {
    return table.seats >= reservation.partySize;
  }

  return localReservations.canFitReservationInTable(reservation, table);
}

export function getBestPublicTableAssignment(
  input: Parameters<typeof localReservations.getBestPublicTableAssignment>[0],
) {
  if (isSupabaseMode()) {
    const tables = getSupabaseFloorTablesByBusinessSync(input.businessId);
    const services = getSupabaseServicesByBusinessSync(input.businessId);
    const reservations = getSupabaseReservationsByBusinessSync(input.businessId);
    const service = services.find((entry) => entry.id === input.serviceId) ?? null;
    const durationMinutes = service?.durationMinutes ?? 120;
    const availability = getAvailableTablesForReservationSlot({
      businessId: input.businessId,
      reservationDate: input.reservationDate,
      reservationTime: input.reservationTime,
      durationMinutes,
      partySize: input.partySize,
      tables,
      reservations,
      services,
      fallbackDurationMinutes: durationMinutes,
    });
    const bestTable = availability.availableTables[0] ?? null;

    return {
      bestSuggestion: bestTable
        ? {
            tableIds: [bestTable.id],
            tableLabel: bestTable.label,
            seats: bestTable.seats,
            excessSeats: Math.max(0, bestTable.seats - input.partySize),
            kind: "single" as const,
            available: true,
            suggested: true,
            reason: null,
          }
        : null,
      availableTableCount: availability.availableTables.length,
      joinedSuggestions: [],
      singleSuggestions: bestTable
        ? [
            {
              tableIds: [bestTable.id],
              tableLabel: bestTable.label,
              seats: bestTable.seats,
              excessSeats: Math.max(0, bestTable.seats - input.partySize),
              kind: "single" as const,
              available: true,
              suggested: true,
              reason: null,
            },
          ]
        : [],
      reason: bestTable ? null : "Sin horarios disponibles",
    };
  }

  return localReservations.getBestPublicTableAssignment(input);
}
