import type { FloorTable } from "@/data/types";

const STATUS_LABELS: Record<FloorTable["status"], string> = {
  available: "Disponible",
  reserved: "Reservada",
  occupied: "Ocupada",
  blocked: "Bloqueada",
  out_of_service: "Fuera de servicio",
};

export function getTableStatusLabel(status: string | null | undefined) {
  if (status === "available") {
    return STATUS_LABELS.available;
  }

  if (status === "reserved") {
    return STATUS_LABELS.reserved;
  }

  if (status === "occupied") {
    return STATUS_LABELS.occupied;
  }

  if (status === "blocked") {
    return STATUS_LABELS.blocked;
  }

  if (status === "out_of_service") {
    return STATUS_LABELS.out_of_service;
  }

  return "Sin estado";
}

