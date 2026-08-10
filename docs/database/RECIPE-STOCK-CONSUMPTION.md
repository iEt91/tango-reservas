# Motor transaccional Receta → Stock — E30C

## Por qué E30C se separa de Reservas/Envíos

Después de E30B, Recetas y Stock ya son persistentes, pero los **consumos de
Reservas** todavía están explícitamente bloqueados en modo Supabase y
`/local/envios` / `/local/cocina` siguen dependiendo del prototipo local.

Conectar una venta guardada en `localStorage` contra Stock canónico de
PostgreSQL mezclaría dos fuentes de verdad y permitiría descuentos sin una
operación comercial persistente que los respalde.

E30C resuelve primero la pieza transaccional reusable:

`plato + cantidad → receta persistente → ingredientes → stock_movements`

Los cortes de Pedidos/Consumos posteriores deberán invocar el helper privado
dentro de **la misma transacción PostgreSQL** que confirme la operación
comercial.

## Migración 016

La migración crea:

- `stock_recipe_operations`: cabecera idempotente del consumo;
- `stock_recipe_operation_movements`: vínculo tenant-safe entre la cabecera y
  los movimientos reales del ledger;
- `private.apply_recipe_stock_consumption(...)`: motor privado transaccional;
- `public.consume_business_menu_recipe_stock(...)`: RPC administrativa para
  probar/reusar el motor antes del cutover comercial.

También agrega la clave compuesta `(business_id, id)` a `stock_movements` para
que el vínculo con el ledger no pueda cruzar tenants.

## Atomicidad

El helper privado:

1. toma un advisory lock del negocio;
2. resuelve el plato y su receta actual;
3. exige por lo menos un ingrediente;
4. bloquea los insumos activos involucrados;
5. convierte `g ↔ kg` y `ml ↔ l` usando el helper canónico de E30A;
6. multiplica cada ingrediente por la cantidad de platos vendidos;
7. valida **todos** los saldos antes de escribir;
8. crea una cabecera de operación;
9. inserta todos los `stock_movements` de tipo `consumption`;
10. vincula cada movimiento a la operación.

Si un solo insumo no alcanza, **no se descuenta ninguno**.

## Idempotencia

`operation_key` identifica el consumo comercial completo.

Repetir la misma clave con el mismo plato, cantidad, origen y referencia
devuelve la operación ya existente sin crear movimientos nuevos.

Reutilizar la misma clave con datos diferentes devuelve conflicto.

Cada movimiento de ingrediente recibe además una clave técnica derivada del
UUID de la operación y del UUID del insumo.

## Snapshot de receta

La cabecera guarda:

- `recipe_id`;
- `recipe_revision`;
- `menu_item_id`;
- cantidad de platos;
- origen;
- referencia;
- usuario;
- timestamp.

Por eso una edición posterior de la receta no altera qué revisión produjo un
consumo histórico.

Los movimientos del ledger ya conservan nombre, unidad y costo del insumo como
snapshot.

## Seguridad

Las nuevas tablas tienen RLS habilitada y forzada.

La lectura autenticada exige al mismo tiempo:

- `stock >= view`;
- `recipes >= view`.

No existe DML directo para navegador.

La RPC pública exige:

- `recipes >= manage`;
- `stock >= manage`.

La RPC pública siempre registra origen `recipe`; no permite que un cliente
invente un origen `reservation` o `shipping`.

El helper que sí acepta esos orígenes vive en `private`, es
`SECURITY DEFINER` y no tiene `EXECUTE` para `anon` ni `authenticated`.
Más adelante las RPC de Reservas/Envíos lo llamarán después de validar su
propio dominio, dentro de la misma transacción.

## Stock negativo

E30C no permite que un consumo lleve ningún insumo por debajo de cero.

La validación ocurre mientras las filas de los productos están bloqueadas, por
lo que una reposición, ajuste o consumo concurrente no puede validar contra un
saldo obsoleto.

## Qué NO hace E30C

E30C todavía no:

- descuenta Stock al guardar una receta;
- descuenta Stock desde `localStorage`;
- persiste consumos de mesa;
- convierte `/local/envios` en un módulo persistente;
- convierte `/local/cocina` en un módulo persistente;
- registra pagos o caja;
- implementa devoluciones automáticas por cancelación.

Eso evita introducir una falsa automatización sobre dominios que todavía no
tienen una fuente de verdad persistente.

## Siguiente integración

Después de E30C, el bloque operativo debe persistir la operación comercial
(pedido/consumo) y llamar:

`private.apply_recipe_stock_consumption(...)`

en su misma transacción.

En ese momento el flujo completo será:

`pedido/consumo persistente → plato → receta → ingredientes → Stock → Historial`

sin depender de `localStorage`.
