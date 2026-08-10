# Consumo persistente de Reserva — E31A

## Objetivo

E31A crea la fuente de verdad PostgreSQL para el **consumo de mesa** asociado
a una reserva persistente.

No hace todavía el corte visual de `/local/reservas`. La interfaz existente
sigue bloqueando el consumo cuando `reservationPersistence === "supabase"`.
Ese corte se hará en E31B sobre la misma UI V2, sin crear una segunda pantalla.

El flujo canónico que habilita E31A es:

`reserva confirmada → pedido/consumo → plato → receta → ingredientes → Stock`

## Por qué aparece un pedido genérico

No se crea una tabla exclusiva de “consumo de reserva”.

`business_orders` representa la operación comercial y distingue:

- `dine_in`;
- `delivery`;
- `pickup`.

E31A usa solamente `dine_in` y exige una `reservation_id`. La intención es que
Envíos pueda reutilizar el mismo núcleo más adelante, sin mantener dos motores
de platos, precios, idempotencia y Stock.

## Tablas

La migración 017 agrega:

- `business_orders`: cabecera comercial;
- `business_order_items`: composición actual y snapshots de nombre/precio;
- `business_order_mutations`: idempotencia del guardado completo;
- `business_order_stock_operations`: vínculo entre pedido y operaciones E30C;
- `stock_recipe_return_operations`: devoluciones parciales por operación;
- `stock_recipe_return_operation_movements`: vínculo exacto entre movimiento
  original y movimiento de devolución.

También agrega `reservations.consumption_started_at` y la clave compuesta
`(business_id, id)` necesaria para FKs tenant-safe.

## Guardado por estado objetivo

La RPC pública recibe la lista **completa** deseada:

```text
[
  { menu_item_id, quantity },
  ...
]
```

PostgreSQL compara esa lista con el estado actual.

Si una cantidad aumenta:

1. valida el plato del mismo tenant;
2. conserva el precio de la línea si ya existía;
3. invoca `private.apply_recipe_stock_consumption(...)` de E30C;
4. registra origen `reservation`;
5. vincula la operación de Stock con el pedido.

Si una cantidad disminuye o desaparece:

1. localiza las operaciones históricas que originaron ese consumo;
2. devuelve primero las más recientes;
3. crea movimientos `return`;
4. actualiza el estado actual del pedido.

Las devoluciones se ejecutan **antes** que los nuevos consumos. Si después un
nuevo consumo falla por falta de Stock, toda la transacción se revierte,
incluidas las devoluciones previas.

## Devolución exacta aunque cambie la receta

Una devolución NO recalcula la receta actual.

`private.apply_recipe_stock_return(...)` toma los movimientos negativos reales
de E30C y devuelve proporcionalmente esos mismos snapshots de:

- producto;
- unidad;
- costo;
- cantidad.

La devolución acumulada usa el total original y redondeo a 3 decimales. Al
devolver el 100 % de las unidades vendidas, la suma de movimientos de retorno
coincide exactamente con el movimiento original, incluso si la receta fue
editada después.

## Atomicidad

`save_business_reservation_consumption(...)` es una única transacción
PostgreSQL.

Un fallo en:

- reserva;
- mesa;
- plato;
- receta;
- insumo;
- saldo;
- devolución;
- idempotencia;

revierte **pedido y Stock juntos**. No existe un estado donde el plato quede
guardado pero el Stock no, o viceversa.

## Idempotencia

Cada guardado usa `operation_key`.

La lista de platos se normaliza y ordena dentro de PostgreSQL.

- misma clave + misma reserva + mismo estado objetivo → devuelve exactamente el
  resultado guardado;
- misma clave con otro payload → conflicto;
- un reintento después de perder la respuesta no vuelve a descontar Stock.

Las claves técnicas de consumo/devolución se derivan de la mutación y no se
aceptan desde el navegador.

## Precio

El navegador no decide el precio persistente.

Cuando un plato entra por primera vez al pedido, PostgreSQL toma
`menu_items.name` y `menu_items.price` y los guarda como snapshots.

Cambiar después el precio del Menú no altera retroactivamente una línea ya
abierta. Si la línea se elimina completamente y se vuelve a agregar más
adelante, nace una línea nueva con el precio vigente.

## Seguridad

La RPC pública exige:

`reservations >= manage`

Eso es deliberado. Un mozo autorizado a gestionar Reservas debe poder cargar
consumo aunque no tenga permiso para administrar la pantalla de Stock o
Recetas.

El navegador nunca recibe DML directo sobre las tablas nuevas.

`business_orders` y `business_order_items` tienen RLS forzada:

- `dine_in` se lee con `reservations >= view`;
- `delivery` / `pickup` quedarán ligados a `shipping >= view`.

Las tablas de idempotencia, vínculos técnicos y devoluciones no reciben SELECT
ni DML para `anon`/`authenticated`.

El helper de devolución vive en `private` y no tiene `EXECUTE` para navegador.

## Reserva y mesa

En E31A el consumo solo puede modificarse si:

- la reserva pertenece al negocio activo;
- está `confirmed`;
- tiene al menos una mesa persistente asignada;
- el pedido sigue `open`.

La migración agrega además un guard:

una reserva con consumo persistente abierto **no puede pasar directamente** a
`completed`, `cancelled` o `no_show`.

Primero debe resolverse el consumo. Vaciarlo mediante la misma RPC devuelve el
Stock y vuelve a permitir la transición de estado.

Esto evita que una cancelación deje Stock descontado sin una decisión
explícita.

## Qué NO hace E31A

E31A no:

- modifica visualmente `/local/reservas`;
- persiste pagos;
- persiste caja;
- persiste estados de Cocina;
- persiste Envíos;
- cambia `/local/cocina`;
- cambia `/local/envios`;
- ejecuta devoluciones automáticas por una cancelación sin decisión;
- mezcla `localStorage` con Stock canónico.

Por eso no requiere QA visual.

## E31B

El siguiente corte conectará el **popup de consumo existente** de
`/local/reservas` con:

- `business_orders`;
- `business_order_items`;
- `save_business_reservation_consumption(...)`.

La UI deberá adoptar siempre la respuesta canónica de PostgreSQL y dejará de
usar el motor local de Stock cuando la persistencia sea Supabase.
