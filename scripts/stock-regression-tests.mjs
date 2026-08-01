#!/usr/bin/env node

import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import ts from "typescript";

const sourceUrl = new URL("../src/lib/reservation-stock-core.ts", import.meta.url);
const source = await readFile(sourceUrl, "utf8");
const transpiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
});
const moduleUrl = `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString("base64")}`;
const {
  applyReservationStockMovements,
  mergeReservationStockMovements,
  resolveReservationStockMovements,
  subtractReservationStockMovements,
} = await import(moduleUrl);

const stock = [
  {
    id: "stock-carne",
    name: "Carne picada",
    unit: "kg",
    consumedBySales: 0,
  },
];
const recipes = [
  {
    menuItemId: "menu-test",
    name: "Nombre anterior",
    ingredients: [
      {
        stockProductId: "stock-carne",
        quantity: 1000,
        unit: "g",
      },
    ],
  },
];
const item = { id: "menu-test", name: "Nombre nuevo" };

function run(name, test) {
  test();
  console.log(`✓ ${name}`);
}

console.log("Ejecutando regresion de stock...");

run("1000 g de receta equivalen a 1 kg de stock", () => {
  assert.deepEqual(resolveReservationStockMovements(item, 1, stock, recipes), [
    { productId: "stock-carne", productName: "Carne picada", quantity: 1 },
  ]);
});

run("la receta se mantiene vinculada por ID aunque cambie el nombre", () => {
  assert.equal(resolveReservationStockMovements(item, 10, stock, recipes)[0]?.quantity, 10);
});

run("sumar una unidad descuenta solamente una unidad", () => {
  const movement = resolveReservationStockMovements(item, 1, stock, recipes);
  const updated = applyReservationStockMovements(stock, movement, "discount");
  assert.equal(updated[0].consumedBySales, 1);
});

run("restar una unidad devuelve solamente una unidad", () => {
  const movement = resolveReservationStockMovements(item, 1, stock, recipes);
  const discounted = applyReservationStockMovements(stock, movement, "discount");
  const restored = applyReservationStockMovements(discounted, movement, "return");
  assert.equal(restored[0].consumedBySales, 0);
});

run("las cantidades acumuladas crecen por diferencia y no por total", () => {
  const one = resolveReservationStockMovements(item, 1, stock, recipes);
  const accumulated = mergeReservationStockMovements(one, one);
  assert.equal(accumulated[0].quantity, 2);
});

run("restar del acumulado conserva solo el saldo real", () => {
  const twelve = resolveReservationStockMovements(item, 12, stock, recipes);
  const one = resolveReservationStockMovements(item, 1, stock, recipes);
  const remaining = subtractReservationStockMovements(twelve, one);
  assert.equal(remaining[0].quantity, 11);
});

run("vaciar el pedido devuelve exactamente todo el acumulado", () => {
  const twelve = resolveReservationStockMovements(item, 12, stock, recipes);
  const discounted = applyReservationStockMovements(stock, twelve, "discount");
  const restored = applyReservationStockMovements(discounted, twelve, "return");
  assert.equal(restored[0].consumedBySales, 0);
});

console.log("Todos los casos de stock pasaron (7).");
