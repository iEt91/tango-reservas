#!/usr/bin/env node

const DEFAULT_DURATION_MINUTES = 120;

function normalizeReservationTime(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  const match = trimmed.match(/^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d{1,3})?)?$/);
  if (!match) {
    return null;
  }

  const hours = match[1];
  const minutes = match[2];
  const seconds = match[3] ?? "00";

  return `${hours}:${minutes}:${seconds}`;
}

function timeToMinutes(value) {
  const normalized = normalizeReservationTime(value);
  if (!normalized) {
    return null;
  }

  const [hours = "0", minutes = "0"] = normalized.split(":");
  const parsedHours = Number(hours);
  const parsedMinutes = Number(minutes);

  if (!Number.isFinite(parsedHours) || !Number.isFinite(parsedMinutes)) {
    return null;
  }

  return parsedHours * 60 + parsedMinutes;
}

function minutesToTime(minutes) {
  const normalized = ((minutes % 1440) + 1440) % 1440;
  const hours = Math.floor(normalized / 60);
  const mins = normalized % 60;
  return `${String(hours).padStart(2, "0")}:${String(mins).padStart(2, "0")}`;
}

function normalizeDateKey(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return null;
  }

  return trimmed;
}

function intervalsOverlap(aStartMinutes, aEndMinutes, bStartMinutes, bEndMinutes) {
  return aStartMinutes < bEndMinutes && bStartMinutes < aEndMinutes;
}

function normalizeAssignedTableIds(value) {
  const raw = (() => {
    if (Array.isArray(value)) {
      return value;
    }

    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) {
        return [];
      }

      try {
        const parsed = JSON.parse(trimmed);
        if (Array.isArray(parsed)) {
          return parsed;
        }

        return [parsed];
      } catch {
        return [trimmed];
      }
    }

    return [];
  })();

  return [...new Set(raw.map((entry) => (typeof entry === "string" ? entry.trim() : "")).filter(Boolean))];
}

function reservationUsesTable(reservation, tableId) {
  const assigned = normalizeAssignedTableIds(
    reservation.assignedTableIds ?? reservation.assigned_table_ids ?? reservation.tableId ?? null,
  );

  return assigned.some((entry) => entry === tableId);
}

function isBlockingReservationStatus(status) {
  return status === "pending" || status === "confirmed";
}

function getReservationDurationMinutes(reservation, services, rules) {
  const service = services.find((entry) => entry.id === reservation.serviceId) ?? null;
  if (service && typeof service.durationMinutes === "number" && service.durationMinutes > 0) {
    return service.durationMinutes;
  }

  if (typeof rules?.defaultReservationDurationMinutes === "number" && rules.defaultReservationDurationMinutes > 0) {
    return rules.defaultReservationDurationMinutes;
  }

  return DEFAULT_DURATION_MINUTES;
}

function getReservationInterval(reservation, services, rules) {
  const dateKey = normalizeDateKey(reservation.reservationDate);
  const startMinutes = timeToMinutes(reservation.reservationTime);

  if (!dateKey || startMinutes === null) {
    return null;
  }

  const durationMinutes = getReservationDurationMinutes(reservation, services, rules);
  const endMinutes = startMinutes + Math.max(1, durationMinutes);

  return {
    dateKey,
    startMinutes,
    endMinutes,
    durationMinutes,
  };
}

function getReservationsOverlappingSlot({
  businessId,
  date,
  time,
  reservations,
  services,
  slotDurationMinutes = 30,
  fallbackDurationMinutes = DEFAULT_DURATION_MINUTES,
  optionalReservationIdToIgnore = null,
}) {
  const slotStartMinutes = timeToMinutes(time);
  if (slotStartMinutes === null) {
    return [];
  }

  const slotEndMinutes = slotStartMinutes + Math.max(1, slotDurationMinutes);

  return reservations.filter((reservation) => {
    if (reservation.businessId !== businessId) {
      return false;
    }

    if (optionalReservationIdToIgnore && reservation.id === optionalReservationIdToIgnore) {
      return false;
    }

    if (!isBlockingReservationStatus(reservation.status)) {
      return false;
    }

    if (normalizeDateKey(reservation.reservationDate) !== normalizeDateKey(date)) {
      return false;
    }

    const interval = getReservationInterval(reservation, services, {
      defaultReservationDurationMinutes: fallbackDurationMinutes,
    });

    if (!interval) {
      return false;
    }

    return intervalsOverlap(
      interval.startMinutes,
      interval.endMinutes,
      slotStartMinutes,
      slotEndMinutes,
    );
  });
}

function isTableHardBlocked(table) {
  return table.status === "blocked" || table.status === "out_of_service";
}

function getAvailableTablesForReservationSlot({
  businessId,
  reservationDate,
  reservationTime,
  durationMinutes,
  partySize,
  tables,
  reservations,
  services,
  fallbackDurationMinutes = DEFAULT_DURATION_MINUTES,
  optionalReservationIdToIgnore = null,
}) {
  const startMinutes = timeToMinutes(reservationTime);
  if (startMinutes === null) {
    return {
      availableTables: [],
      unavailableTables: [],
      overlappingReservations: [],
      totalAvailableSeats: 0,
      canBook: false,
      reason: "Hora invalida",
    };
  }

  const reservationEndMinutes = startMinutes + Math.max(1, durationMinutes || fallbackDurationMinutes);
  const overlappingReservations = reservations.filter((reservation) => {
    if (reservation.businessId !== businessId) {
      return false;
    }

    if (optionalReservationIdToIgnore && reservation.id === optionalReservationIdToIgnore) {
      return false;
    }

    if (!isBlockingReservationStatus(reservation.status)) {
      return false;
    }

    if (normalizeDateKey(reservation.reservationDate) !== normalizeDateKey(reservationDate)) {
      return false;
    }

    const interval = getReservationInterval(reservation, services, {
      defaultReservationDurationMinutes: fallbackDurationMinutes,
    });

    if (!interval) {
      return false;
    }

    return intervalsOverlap(
      interval.startMinutes,
      interval.endMinutes,
      startMinutes,
      reservationEndMinutes,
    );
  });

  const availableTables = [];
  const unavailableTables = [];

  for (const table of tables) {
    const reasons = [];

    if (table.businessId !== businessId) {
      reasons.push("No pertenece al negocio");
    }

    if (isTableHardBlocked(table)) {
      reasons.push(table.status === "blocked" ? "Bloqueada" : "Fuera de servicio");
    }

    if (table.seats < partySize) {
      reasons.push("Capacidad insuficiente");
    }

    const conflictingReservation = overlappingReservations.find((reservation) =>
      reservationUsesTable(reservation, table.id),
    );

    if (conflictingReservation) {
      reasons.push("Ocupada por otra reserva solapada");
    }

    if (reasons.length > 0) {
      unavailableTables.push({
        table,
        reasons,
        conflictReservationId: conflictingReservation?.id ?? null,
      });
      continue;
    }

    availableTables.push(table);
  }

  return {
    availableTables,
    unavailableTables,
    overlappingReservations,
    totalAvailableSeats: availableTables.reduce((sum, table) => sum + table.seats, 0),
    canBook: availableTables.length > 0,
    reason: availableTables.length > 0 ? null : "Sin mesas disponibles",
  };
}

function chooseBestAvailableTable(availableTables, partySize) {
  return [...availableTables]
    .filter((table) => table.seats >= partySize)
    .sort((left, right) => left.seats - right.seats || left.label.localeCompare(right.label))[0] ?? null;
}

function simulatePublicReservationCreation({
  autoConfirmReservations,
  availability,
  partySize,
}) {
  if (!autoConfirmReservations) {
    return {
      status: "pending",
      assignedTableIds: [],
    };
  }

  const chosenTable = chooseBestAvailableTable(availability.availableTables, partySize);
  if (!chosenTable) {
    return {
      status: "pending",
      assignedTableIds: [],
    };
  }

  return {
    status: "confirmed",
    assignedTableIds: [chosenTable.id],
  };
}

function resolveReservationWindow(businessHours, rules) {
  const useBusinessHoursForReservations = rules.useBusinessHoursForReservations ?? true;
  const startTime = useBusinessHoursForReservations
    ? businessHours.openTime
    : rules.reservationOpenTime?.trim() || businessHours.openTime;
  const endTime = useBusinessHoursForReservations
    ? businessHours.closeTime
    : rules.reservationCloseTime?.trim() || businessHours.closeTime;

  return {
    startMinutes: timeToMinutes(startTime),
    endMinutes: timeToMinutes(endTime),
    allowReservationsAfterClose: rules.allowReservationsAfterClose ?? true,
  };
}

function buildPublicAvailableSlots({
  businessId,
  date,
  businessHours,
  rules,
  service,
  tables,
  reservations,
  services,
  partySize,
}) {
  const window = resolveReservationWindow(businessHours, rules);
  if (window.startMinutes === null || window.endMinutes === null) {
    return [];
  }

  const step = Math.max(1, rules.slotDurationMinutes || 30);
  const serviceDuration =
    service && typeof service.durationMinutes === "number" && service.durationMinutes > 0
      ? service.durationMinutes
      : rules.defaultReservationDurationMinutes || DEFAULT_DURATION_MINUTES;

  const slots = [];
  for (let startMinutes = window.startMinutes; startMinutes <= window.endMinutes; startMinutes += step) {
    if (!window.allowReservationsAfterClose && startMinutes + serviceDuration > window.endMinutes) {
      continue;
    }

    const availability = getAvailableTablesForReservationSlot({
      businessId,
      reservationDate: date,
      reservationTime: minutesToTime(startMinutes),
      durationMinutes: serviceDuration,
      partySize,
      tables,
      reservations,
      services,
      fallbackDurationMinutes: rules.defaultReservationDurationMinutes || DEFAULT_DURATION_MINUTES,
    });

    if (availability.availableTables.length > 0) {
      slots.push({
        time: minutesToTime(startMinutes),
        availableTables: availability.availableTables,
        totalAvailableSeats: availability.totalAvailableSeats,
      });
    }
  }

  return slots;
}

const tests = [];
let failed = 0;

function test(name, fn) {
  tests.push({ name, fn });
}

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function runTests() {
  for (const { name, fn } of tests) {
    try {
      fn();
      console.log(`✓ ${name}`);
    } catch (error) {
      failed += 1;
      console.error(`✗ ${name}`);
      console.error(`  ${(error && error.message) || String(error)}`);
    }
  }

  if (failed > 0) {
    process.exitCode = 1;
  }
}

const businessId = "biz-demo";
const services = [
  {
    id: "service-150",
    businessId,
    name: "Menu degustacion",
    durationMinutes: 150,
    capacity: 4,
    isActive: true,
  },
  {
    id: "service-60",
    businessId,
    name: "Menu rapido",
    durationMinutes: 60,
    capacity: 2,
    isActive: true,
  },
];

const tables = [
  { id: "mesa-1", businessId, label: "Mesa 1", seats: 2, status: "available" },
  { id: "mesa-2", businessId, label: "Mesa 2", seats: 2, status: "available" },
  { id: "mesa-3", businessId, label: "Mesa 3", seats: 2, status: "blocked" },
  { id: "mesa-4", businessId, label: "Mesa 4", seats: 2, status: "out_of_service" },
];

const rules = {
  slotDurationMinutes: 30,
  maxReservationsPerSlot: 4,
  minNoticeMinutes: 0,
  maxDaysAhead: 30,
  requiresConfirmation: true,
  allowCancellation: true,
  cancellationLimitHours: 4,
  useBusinessHoursForReservations: false,
  reservationOpenTime: "08:00",
  reservationCloseTime: "23:00",
  allowReservationsAfterClose: true,
  defaultReservationDurationMinutes: 120,
};

const businessHours = {
  id: "hours-demo",
  businessId,
  dayOfWeek: "saturday",
  isOpen: true,
  openTime: "08:00",
  closeTime: "23:00",
  breakStartTime: null,
  breakEndTime: null,
};

const reservationA = {
  id: "res-a",
  businessId,
  serviceId: "service-150",
  customerName: "A",
  customerPhone: "11111111",
  customerEmail: null,
  reservationDate: "2026-06-19",
  reservationTime: "15:00",
  partySize: 2,
  status: "confirmed",
  assignedTableIds: ["mesa-1"],
};

const reservationB = {
  id: "res-b",
  businessId,
  serviceId: "service-150",
  customerName: "B",
  customerPhone: "22222222",
  customerEmail: null,
  reservationDate: "2026-06-19",
  reservationTime: "15:30",
  partySize: 2,
  status: "confirmed",
  assignedTableIds: ["mesa-2"],
};

const reservationCanceled = {
  id: "res-cancelled",
  businessId,
  serviceId: "service-150",
  customerName: "Cancel",
  customerPhone: "33333333",
  customerEmail: null,
  reservationDate: "2026-06-19",
  reservationTime: "15:30",
  partySize: 2,
  status: "cancelled",
  assignedTableIds: ["mesa-1"],
};

const reservationPendingNoTable = {
  id: "res-pending-empty",
  businessId,
  serviceId: "service-150",
  customerName: "Pending",
  customerPhone: "44444444",
  customerEmail: null,
  reservationDate: "2026-06-19",
  reservationTime: "15:30",
  partySize: 2,
  status: "pending",
  assignedTableIds: [],
};

test("solapamiento basico bloquea la misma mesa", () => {
  const overlap = getAvailableTablesForReservationSlot({
    businessId,
    reservationDate: reservationA.reservationDate,
    reservationTime: "15:30",
    durationMinutes: 150,
    partySize: 2,
    tables,
    reservations: [reservationA],
    services,
    fallbackDurationMinutes: 120,
  });

  expect(!overlap.availableTables.some((table) => table.id === "mesa-1"), "Mesa 1 no debe quedar disponible");
  expect(overlap.availableTables.some((table) => table.id === "mesa-2"), "Mesa 2 debe seguir disponible");
});

test("mesa distinta se permite si esta libre", () => {
  const result = getAvailableTablesForReservationSlot({
    businessId,
    reservationDate: reservationA.reservationDate,
    reservationTime: "15:30",
    durationMinutes: 150,
    partySize: 2,
    tables,
    reservations: [reservationA],
    services,
    fallbackDurationMinutes: 120,
  });

  expect(result.availableTables.some((table) => table.id === "mesa-2"), "Mesa 2 debe permitirse");
});

test("fin exacto no bloquea", () => {
  const result = getAvailableTablesForReservationSlot({
    businessId,
    reservationDate: reservationA.reservationDate,
    reservationTime: "17:30",
    durationMinutes: 150,
    partySize: 2,
    tables,
    reservations: [reservationA],
    services,
    fallbackDurationMinutes: 120,
  });

  expect(result.availableTables.some((table) => table.id === "mesa-1"), "Mesa 1 debe permitirse al final exacto");
});

test("antes del fin sigue bloqueando", () => {
  const result = getAvailableTablesForReservationSlot({
    businessId,
    reservationDate: reservationA.reservationDate,
    reservationTime: "17:00",
    durationMinutes: 150,
    partySize: 2,
    tables,
    reservations: [reservationA],
    services,
    fallbackDurationMinutes: 120,
  });

  expect(!result.availableTables.some((table) => table.id === "mesa-1"), "Mesa 1 debe bloquearse antes del fin");
});

test("la misma reserva al editarse no se bloquea contra si misma", () => {
  const result = getAvailableTablesForReservationSlot({
    businessId,
    reservationDate: reservationA.reservationDate,
    reservationTime: reservationA.reservationTime,
    durationMinutes: 150,
    partySize: 2,
    tables,
    reservations: [reservationA],
    services,
    fallbackDurationMinutes: 120,
    optionalReservationIdToIgnore: reservationA.id,
  });

  expect(result.availableTables.some((table) => table.id === "mesa-1"), "Mesa 1 debe quedar disponible al editarse");
});

test("los estados que bloquean y no bloquean se respetan", () => {
  expect(isBlockingReservationStatus("confirmed"), "confirmed debe bloquear");
  expect(isBlockingReservationStatus("pending"), "pending debe bloquear");
  expect(!isBlockingReservationStatus("cancelled"), "cancelled no debe bloquear");
  expect(!isBlockingReservationStatus("no_show"), "no_show no debe bloquear");
  expect(!isBlockingReservationStatus("completed"), "completed no debe bloquear");
  expect(reservationUsesTable(reservationA, "mesa-1"), "Mesa 1 debe detectarse por ID exacto");
  expect(!reservationUsesTable(reservationA, "mesa-2"), "Mesa 2 no debe detectarse por error");
  expect(
    !getAvailableTablesForReservationSlot({
      businessId,
      reservationDate: reservationCanceled.reservationDate,
      reservationTime: reservationCanceled.reservationTime,
      durationMinutes: 150,
      partySize: 2,
      tables,
      reservations: [reservationCanceled],
      services,
      fallbackDurationMinutes: 120,
    }).unavailableTables.some((entry) => entry.table.id === "mesa-2"),
    "cancelled no debe bloquear mesas",
  );
  expect(
    getAvailableTablesForReservationSlot({
      businessId,
      reservationDate: reservationPendingNoTable.reservationDate,
      reservationTime: reservationPendingNoTable.reservationTime,
      durationMinutes: 150,
      partySize: 2,
      tables,
      reservations: [reservationPendingNoTable],
      services,
      fallbackDurationMinutes: 120,
    }).availableTables.some((table) => table.id === "mesa-2"),
    "pending sin mesa no debe bloquear",
  );
});

test("la duracion del servicio gana sobre la duracion estandar", () => {
  expect(
    getReservationDurationMinutes(
      { serviceId: "service-1" },
      [{ id: "service-1", durationMinutes: 150 }],
      rules,
    ) === 150,
    "la duracion del servicio debe usarse si existe",
  );
  expect(
    getReservationDurationMinutes(
      { serviceId: "service-unknown" },
      [],
      { ...rules, defaultReservationDurationMinutes: 90 },
    ) === 90,
    "la duracion estandar del negocio debe usarse como fallback",
  );
});

test("la reserva publica autoconfirma o queda pendiente segun la configuracion", () => {
  const availability = getAvailableTablesForReservationSlot({
    businessId,
    reservationDate: "2026-06-19",
    reservationTime: "18:00",
    durationMinutes: 120,
    partySize: 2,
    tables,
    reservations: [],
    services,
    fallbackDurationMinutes: 120,
  });

  const autoOn = simulatePublicReservationCreation({
    autoConfirmReservations: true,
    availability,
    partySize: 2,
  });
  const autoOff = simulatePublicReservationCreation({
    autoConfirmReservations: false,
    availability,
    partySize: 2,
  });

  expect(autoOn.status === "confirmed", "con auto confirmacion activa debe confirmar");
  expect(autoOn.assignedTableIds.length === 1, "con auto confirmacion activa debe asignar una mesa");
  expect(autoOff.status === "pending", "con auto confirmacion desactivada debe quedar pendiente");
  expect(autoOff.assignedTableIds.length === 0, "con auto confirmacion desactivada no debe asignar mesa");
});

test("horarios de reservas pueden diferir del horario del local", () => {
  const slots = buildPublicAvailableSlots({
    businessId,
    date: "2026-06-19",
    businessHours: {
      openTime: "08:00",
      closeTime: "23:59",
    },
    rules: {
      ...rules,
      useBusinessHoursForReservations: false,
      reservationOpenTime: "10:00",
      reservationCloseTime: "11:00",
      slotDurationMinutes: 30,
      allowReservationsAfterClose: false,
    },
    service: { id: "service-1", name: "Servicio corto", durationMinutes: 30 },
    tables,
    reservations: [],
    services,
    partySize: 2,
  });

  expect(slots.some((slot) => slot.time === "10:00"), "10:00 debe aparecer con la ventana de reservas");
  expect(slots.some((slot) => slot.time === "10:30"), "10:30 debe aparecer con la ventana de reservas");
  expect(!slots.some((slot) => slot.time === "08:00"), "08:00 no debe aparecer si la ventana de reservas empieza mas tarde");
  expect(!slots.some((slot) => slot.time === "11:00"), "11:00 no debe aparecer si no se permiten reservas que terminen despues del cierre");
});

test("la web publica muestra solo horarios realmente reservables", () => {
  const slotsWithOneFreeTable = buildPublicAvailableSlots({
    businessId,
    date: "2026-06-19",
    businessHours,
    rules,
    service: services[0],
    tables,
    reservations: [reservationA],
    services,
    partySize: 2,
  });

  expect(slotsWithOneFreeTable.some((slot) => slot.time === "15:00"), "15:00 debe seguir visible si queda una mesa libre");

  const slotsWithoutFreeTables = buildPublicAvailableSlots({
    businessId,
    date: "2026-06-19",
    businessHours,
    rules,
    service: services[0],
    tables,
    reservations: [reservationA, reservationB],
    services,
    partySize: 2,
  });

  expect(!slotsWithoutFreeTables.some((slot) => slot.time === "15:00"), "15:00 no debe mostrarse si no quedan mesas");
});

test("horarios tardios respetan allowReservationsAfterClose", () => {
  const lateAllowed = buildPublicAvailableSlots({
    businessId,
    date: "2026-06-19",
    businessHours,
    rules: {
      ...rules,
      allowReservationsAfterClose: true,
      reservationCloseTime: "23:00",
    },
    service: services[0],
    tables,
    reservations: [],
    services,
    partySize: 2,
  });

  expect(lateAllowed.some((slot) => slot.time === "23:00"), "23:00 debe aparecer cuando se permite terminar despues del cierre");

  const lateBlocked = buildPublicAvailableSlots({
    businessId,
    date: "2026-06-19",
    businessHours,
    rules: {
      ...rules,
      allowReservationsAfterClose: false,
      reservationCloseTime: "23:00",
    },
    service: services[0],
    tables,
    reservations: [],
    services,
    partySize: 2,
  });

  expect(!lateBlocked.some((slot) => slot.time === "23:00"), "23:00 debe ocultarse cuando no se permite terminar despues del cierre");
});

test("plano y timeline usan la misma logica de ocupacion", () => {
  const slot1430 = getReservationsOverlappingSlot({
    businessId,
    date: "2026-06-19",
    time: "14:30",
    reservations: [reservationA],
    services,
    slotDurationMinutes: 30,
    fallbackDurationMinutes: 120,
  });
  const slot1500 = getReservationsOverlappingSlot({
    businessId,
    date: "2026-06-19",
    time: "15:00",
    reservations: [reservationA],
    services,
    slotDurationMinutes: 30,
    fallbackDurationMinutes: 120,
  });
  const slot1530 = getReservationsOverlappingSlot({
    businessId,
    date: "2026-06-19",
    time: "15:30",
    reservations: [reservationA],
    services,
    slotDurationMinutes: 30,
    fallbackDurationMinutes: 120,
  });
  const slot1730 = getReservationsOverlappingSlot({
    businessId,
    date: "2026-06-19",
    time: "17:30",
    reservations: [reservationA],
    services,
    slotDurationMinutes: 30,
    fallbackDurationMinutes: 120,
  });

  expect(slot1430.length === 0, "14:30 no debe ocupar la reserva de 15:00");
  expect(slot1500.some((reservation) => reservation.id === "res-a"), "15:00 debe ocupar la mesa");
  expect(slot1530.some((reservation) => reservation.id === "res-a"), "15:30 debe seguir ocupando la mesa");
  expect(slot1730.length === 0, "17:30 debe liberar la mesa");
});

test("comparacion exacta por ID en asignacion manual", () => {
  const result = getAvailableTablesForReservationSlot({
    businessId,
    reservationDate: "2026-06-19",
    reservationTime: "15:00",
    durationMinutes: 150,
    partySize: 2,
    tables,
    reservations: [reservationA],
    services,
    fallbackDurationMinutes: 120,
    optionalReservationIdToIgnore: null,
  });

  expect(!result.availableTables.some((table) => table.id === "mesa-1"), "Mesa 1 debe quedar bloqueada por ID exacto");
  expect(result.availableTables.some((table) => table.id === "mesa-2"), "Mesa 2 debe quedar disponible");
  expect(result.unavailableTables.some((entry) => entry.table.id === "mesa-1"), "Mesa 1 debe figurar como no disponible");
  expect(!result.unavailableTables.some((entry) => entry.table.id === "mesa-2"), "Mesa 2 no debe quedar bloqueada por una reserva de otra mesa");
});

console.log("Ejecutando regresion de disponibilidad...");
runTests();

if (failed === 0) {
  console.log(`Todos los casos pasaron (${tests.length}).`);
}
