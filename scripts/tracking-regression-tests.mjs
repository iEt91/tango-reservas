#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const sourceUrl = new URL("../src/lib/public-tracking-core.ts", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`;
const {
  isClosedDeliveryTrackingExpired,
  isReservationTrackingExpired,
} = await import(moduleUrl);

function run(name, test) {
  test();
  console.log(`✓ ${name}`);
}

const reservation = { date: "2026-08-01", time: "13:00", status: "confirmed" };
const at = (value) => new Date(value).getTime();

console.log("Ejecutando regresion de tracking publico...");

run("una reserva sigue visible antes de su horario", () => {
  assert.equal(isReservationTrackingExpired(reservation, at("2026-08-01T12:59:59")), false);
});
run("una reserva sigue visible exactamente diez minutos despues", () => {
  assert.equal(isReservationTrackingExpired(reservation, at("2026-08-01T13:10:00")), false);
});
run("una reserva expira al superar los diez minutos", () => {
  assert.equal(isReservationTrackingExpired(reservation, at("2026-08-01T13:10:01")), true);
});
run("una reserva cancelada usa la hora de cancelacion", () => {
  const value = { ...reservation, status: "cancelled", cancelledAt: "2026-08-01T12:00:00" };
  assert.equal(isReservationTrackingExpired(value, at("2026-08-01T12:10:01")), true);
});
run("un no-show usa la hora en que fue marcado", () => {
  const value = { ...reservation, status: "no_show", noShowAt: "2026-08-01T13:02:00" };
  assert.equal(isReservationTrackingExpired(value, at("2026-08-01T13:12:00")), false);
});
run("un envio activo nunca expira", () => {
  assert.equal(isClosedDeliveryTrackingExpired({ status: "confirmed" }, at("2026-08-01T14:00:00")), false);
});
run("un envio entregado sigue visible exactamente un minuto", () => {
  const value = { status: "completed", deliveredAt: "2026-08-01T13:00:00" };
  assert.equal(isClosedDeliveryTrackingExpired(value, at("2026-08-01T13:01:00")), false);
});
run("un envio entregado expira despues de un minuto", () => {
  const value = { status: "completed", deliveredAt: "2026-08-01T13:00:00" };
  assert.equal(isClosedDeliveryTrackingExpired(value, at("2026-08-01T13:01:01")), true);
});
run("un envio cancelado expira desde la cancelacion", () => {
  const value = { status: "cancelled", cancelledAt: "2026-08-01T13:00:00" };
  assert.equal(isClosedDeliveryTrackingExpired(value, at("2026-08-01T13:01:01")), true);
});

console.log("Todos los casos de tracking pasaron (9).");
