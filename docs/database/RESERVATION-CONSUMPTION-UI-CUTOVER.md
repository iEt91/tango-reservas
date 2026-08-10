# Cutover UI del consumo persistente de Reserva — E31B

## Objetivo

E31B conecta el popup **Consumo de mesa** ya existente en `/local/reservas`
con el backend transaccional E31A.

No crea una segunda pantalla y no cambia la estética V2.

El flujo persistente queda:

`Reserva → pedido → platos → receta → ingredientes → Stock`

La UI adopta siempre la respuesta canónica devuelta por PostgreSQL.

## Qué cambia

Cuando `reservationPersistence === "supabase"`:

- el Menú se carga desde `menu_items`/`menu_categories` en servidor;
- los pedidos `dine_in` existentes se cargan desde `business_orders`;
- el popup de consumo deja de usar Menú, Recetas o Stock de `localStorage`;
- sumar, restar, editar cantidad o vaciar usa
  `saveBusinessReservationConsumptionAction`;
- la Server Action invoca `save_business_reservation_consumption(...)`;
- PostgreSQL actualiza pedido y Stock en una sola transacción;
- la respuesta canónica reemplaza el estado React del consumo.

El fallback local anterior se conserva cuando el datasource no es Supabase.

## Lectura inicial

`/local/reservas/page.tsx` carga en servidor:

- reservas;
- configuración;
- servicios;
- clientes;
- plano;
- menú persistente;
- pedidos `dine_in` de las reservas visibles.

La lectura de pedidos se hace por lote para evitar una consulta por reserva.

`reservations.consumption_started_at` también entra al contrato normal de
Reservas para que el estado operativo sobreviva a refresh.

## Menú

La UI recibe únicamente platos persistentes:

- no archivados;
- visibles;
- con estado `available`.

Las categorías visibles/activas se derivan del mismo snapshot servidor.

En modo Supabase no se escucha `MENU_ITEMS_STORAGE_KEY` ni
`MENU_CATEGORIES_STORAGE_KEY`.

## Escritura

Cada cambio del popup envía el **estado objetivo completo**:

```text
[
  { menuItemId, quantity },
  ...
]
```

No se envían precios, recetas, ingredientes ni movimientos de Stock desde el
navegador.

La mutación usa una `operationKey` nueva por intento. El backend E31A es
idempotente por estado objetivo y E30C evita dobles descuentos.

## Cantidades

Los botones `+` y `-` guardan inmediatamente.

El campo numérico mantiene un borrador local mientras se escribe y persiste al
perder foco o presionar Enter. Después del guardado se reemplaza por la cantidad
canónica devuelta por PostgreSQL.

Durante una mutación persistente los controles quedan bloqueados para evitar
acciones simultáneas.

## Sincronización visual en tiempo real

E31B V6 publica `stock_movements` en Supabase Realtime y la pantalla de
Stock escucha únicamente INSERT del tenant activo mediante Postgres Changes.

El evento recibido es la fila canónica ya confirmada por PostgreSQL. La UI
la valida con el mismo contrato de Stock y aplica el delta directamente al
estado React, sin esperar un segundo viaje de `router.refresh()`. Esto evita
el retraso visual de 1–2 segundos observado durante el QA manual.

La suscripción conserva RLS de `stock_movements`, tiene filtro explícito por
`business_id` y no concede INSERT/UPDATE/DELETE al navegador. También evita
doble aplicación si el mismo movimiento fue originado por la propia pestaña.

La señal local de `BroadcastChannel` de V5 se conserva solamente como
fallback mientras Realtime no está suscripto. Recuperar foco o visibilidad
también ejecuta reconciliación por servidor únicamente cuando Realtime no
está sano. PostgreSQL continúa siendo la única fuente de verdad.

A diferencia de V5, este mecanismo también puede reflejar movimientos entre
navegadores o dispositivos distintos que tengan una sesión y permisos válidos.

## Stock

En Supabase E31B **no** llama:

- `resolveReservationStockMovements`;
- `applyReservationStockMovements`;
- `mergeReservationStockMovements`;
- `subtractReservationStockMovements`.

Esas funciones quedan exclusivamente para el fallback local.

El navegador tampoco escribe `stock_products`, `stock_movements`,
`business_orders` ni `business_order_items`.

## Estados y cancelaciones

E31B conserva el guard de E31A:

una reserva con consumo abierto no puede pasar a `completed`, `cancelled` o
`no_show`.

Vaciar el pedido desde el popup devuelve el Stock histórico mediante E31A y
entonces la transición terminal vuelve a estar permitida.

## Caja, pagos y Cocina

E31B habilita **solo consumo persistente**.

Siguen fuera del alcance:

- Caja persistente;
- cobros/pagos persistentes;
- tickets/comandas persistentes de Cocina;
- integración persistente de Envíos.

El botón de cierre de mesa continúa bloqueando Caja/Pagos cuando el datasource
es Supabase.

La lógica local de `kitchenTickets` no se usa como fuente canónica en Supabase.

## Seguridad

La UI no crea un cliente Supabase.

Las mutaciones pasan por Server Action y la RPC E31A, que revalida:

- sesión;
- negocio activo;
- `reservations >= manage`;
- tenant;
- reserva confirmada;
- mesa asignada;
- plato;
- receta;
- Stock.

La lectura de pedidos permanece bajo RLS `reservations >= view`.

## Migraciones

E31B **no agrega ni aplica migraciones**.

La migración 017 ya fue aplicada una sola vez en staging y no debe repetirse.

## QA manual

Después del QA automatizado hay que validar visualmente sobre staging:

1. abrir una reserva confirmada con mesa;
2. abrir `Consumo`;
3. agregar un plato con receta;
4. comprobar total y cantidad;
5. comprobar que Stock bajó;
6. refrescar `/local/reservas` y confirmar que el pedido persiste;
7. reducir cantidad y confirmar devolución parcial;
8. editar la receta y luego reducir una unidad histórica;
9. comprobar que la devolución usa el ledger anterior;
10. vaciar el pedido y confirmar devolución completa;
11. verificar que una reserva con consumo no se pueda cancelar;
12. verificar que después de vaciar sí pueda terminar;
13. comprobar que Caja/Pagos siguen bloqueados;
14. verificar que no hay regresiones visuales del popup V2.
