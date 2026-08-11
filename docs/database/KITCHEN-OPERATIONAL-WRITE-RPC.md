# E33A — Cocina persistente: backend operativo

## Objetivo

E33A crea la fuente de verdad persistente para el flujo operativo de Cocina sin
rediseñar ni conectar todavía `/local/cocina`.

El corte reutiliza los pedidos canónicos creados por E31A:

- `business_orders`;
- `business_order_items`.

El estado comercial del pedido permanece separado del estado de preparación:

- comercial: `open | completed | cancelled`;
- Cocina: `pending | preparing | ready | completed`.

E33A no modifica la migración 017 ni las migraciones financieras 019/020.

## Alcance actual

E33A cubre pedidos `dine_in` asociados a Reservas persistentes.

El schema de tickets conserva `order_kind` preparado para `delivery | pickup`,
pero esos orígenes se conectarán cuando Envíos tenga backend persistente. El
fallback local actual de Envíos no se convierte en fuente de verdad remota.

## Estado base de Cocina

`business_orders` incorpora:

- `kitchen_status`;
- `kitchen_started_at`;
- `kitchen_ready_at`;
- `kitchen_completed_at`;
- `kitchen_target_seconds`.

Los pedidos existentes reciben `pending`. No se intenta inventar retrospectivamente
el estado histórico que antes vivía solo en `localStorage`.

Mientras la comanda base está `pending`, modificar el pedido modifica la misma
comanda base. Al comenzar la preparación se fija el tiempo objetivo de la base.

## Agregados posteriores

Cuando el pedido cambia después de que la base dejó `pending`, un trigger sobre
`business_order_items` traduce los incrementos de cantidad a una comanda agregada.

Tablas:

- `business_kitchen_tickets`;
- `business_kitchen_ticket_items`.

Los incrementos consecutivos se fusionan en la última comanda agregada que todavía
esté `pending`, igual que el comportamiento local actual.

Cada línea conserva:

- `menu_item_id`;
- nombre snapshot;
- cantidad;
- tiempo de preparación snapshot.

El tiempo objetivo usa `menu_recipes.preparation_time_seconds`; si el plato no
tiene receta persistente, el fallback es 900 segundos.

## Reducciones

Una reducción del pedido descuenta primero cantidades de agregados todavía
modificables, respetando el orden funcional existente:

1. `pending`;
2. `preparing`;
3. `ready`;

y dentro de cada estado, las comandas más recientes primero.

Las comandas `completed` no se reescriben.

Si una comanda agregada queda sin líneas, se marca `voided_at` y deja de aparecer
en el snapshot operativo.

## Transiciones

La RPC `set_business_kitchen_command_status` permite:

- `pending → preparing`;
- `preparing → ready`;
- `ready → preparing`;
- `ready → completed`.

`completed` es terminal.

Repetir la misma operación con la misma `operationKey` devuelve el mismo resultado.

## Idempotencia

`business_kitchen_operations` conserva la evidencia privada de mutaciones de estado:

- tenant;
- operation key;
- pedido;
- ticket opcional;
- estado solicitado;
- snapshot de resultado;
- actor y timestamp.

`(business_id, operation_key)` es único.

## Lectura de Cocina

`get_business_kitchen_snapshot(business_id, business_date)` devuelve solo lo que
la pantalla de Cocina necesita:

- pedido y ticket;
- mesa;
- cliente;
- hora;
- nota;
- platos/cantidades;
- estado;
- tiempo objetivo;
- timestamps;
- indicador de agregado.

Para la comanda base, las cantidades se derivan como:

`cantidad actual del pedido - cantidades asignadas a comandas agregadas no anuladas`

Esto permite conservar el historial de agregados `completed` sin duplicar platos
en la comanda base.

## Permisos

La autorización usa el módulo existente `kitchen`.

- snapshot: `kitchen >= view`;
- cambio de estado: `kitchen >= manage`.

Owner/admin siguen heredando acceso total mediante el contrato de Staff existente.

La Server Action vuelve a resolver sesión, negocio activo y permiso antes de llamar
a PostgreSQL. El navegador nunca envía ni decide `business_id`.

## Seguridad

Las tablas nuevas:

- tienen RLS habilitada y forzada;
- no conceden `SELECT`, `INSERT`, `UPDATE` ni `DELETE` a `anon` o `authenticated`;
- conceden mantenimiento explícito a `service_role` para fixtures/operación servidor;
- se consumen por usuarios únicamente mediante RPC autocontenidas.

Las RPC públicas:

- son `SECURITY DEFINER`;
- fijan `search_path = ''`;
- exigen `auth.uid()`;
- vuelven a validar tenant + módulo;
- revocan `PUBLIC`/`anon`;
- conceden `EXECUTE` únicamente a `authenticated`.

Los helpers del trigger viven en `private` y no son ejecutables por roles API.

Esto sigue el modelo de grants explícitos requerido por los defaults actuales de
Supabase Data API: grants y RLS son capas independientes.

## Serialización

Las mutaciones de estado usan el advisory lock por `business_id` que ya comparte
el núcleo transaccional del proyecto.

La sincronización de agregados ocurre dentro de la misma transacción que modifica
`business_order_items`, por medio de trigger. No existe una segunda escritura
cliente susceptible de quedar desfasada.

## Rollback

El rollback corta:

- RPC públicas;
- trigger de sincronización;
- helpers privados;
- grants.

No destruye las tablas ni columnas de Cocina ya creadas. La evidencia operativa
permanece con RLS forzada y sin acceso API directo.

## Frontera E33A

E33A sí agrega la migración 021, pero el paquete de integración local:

- no aplica la migración;
- no ejecuta el staging test;
- no ejecuta `staging:cleanup-isolation`;
- no hace commit;
- no hace push.

Después del QA local se aplicará 021 una sola vez a staging y se validará BOLA,
idempotencia, trigger de agregados/reducciones y DML bloqueado.

E33B conectará la UI actual de `/local/cocina` al snapshot y Server Actions sin
crear una interfaz visual alternativa.
