# E34A — Envíos persistentes: pedidos, Stock, Cocina y pago

## Objetivo

E34A crea la fuente de verdad persistente para `/local/envios` sin conectar todavía la UI. El corte reutiliza el núcleo canónico existente en lugar de crear un segundo sistema de pedidos.

La UI actual continúa en `localStorage` hasta E34B.

## Núcleo reutilizado

E34A reutiliza:

- `business_orders` y `business_order_items` de E31A;
- `private.apply_recipe_stock_consumption` de E30C;
- `private.apply_recipe_stock_return` de E31A;
- `business_order_items_sync_kitchen_delta` de E33A;
- `business_kitchen_tickets` y `business_kitchen_operations` de E33A;
- `cash_sessions`, `business_payment_operations` y `business_payments` de E32A;
- módulo Staff `shipping`.

`business_orders.order_kind` ya admite `delivery | pickup`, por lo que Envíos no duplica líneas, subtotal, Stock ni comandas.

## business_shipping_orders

La nueva tabla agrega el contexto propio de Envíos alrededor de un `business_order`:

- fecha y hora operativa;
- Delivery o Retiro;
- cliente, teléfono y dirección snapshot;
- nota;
- origen manual/web;
- aceptación pendiente;
- código público de tracking;
- medio de pago preferido;
- estado `confirmed | completed | cancelled`;
- ETA;
- hitos accepted/preparing/ready/on-the-way/completed/cancelled;
- revisión y actores.

La relación `(business_id, order_id, order_kind)` es tenant-safe.

El tipo Delivery/Retiro queda inmutable después de crear el pedido en E34A. Esto evita reescribir la identidad histórica del pedido, sus líneas y sus comandas. E34B debe reflejar esa frontera al editar un pedido persistente.

## Pedidos manuales y web

`save_business_shipping_order` crea o edita pedidos autenticados.

- Manual: nace aceptado y reserva Stock en la misma transacción.
- Web con `needs_acceptance=true`: guarda el pedido sin descontar Stock.
- `accept_business_shipping_order`: reserva Stock y fija ETA al aceptar el pedido web.

La creación pública anónima no forma parte de E34A. Se conectará en E34C junto con la web pública y tracking persistente, con su propia frontera anti-abuso.

## Stock

La RPC de guardado calcula diferencias entre las líneas actuales y las solicitadas.

Cuando el Stock ya está reservado:

- incrementos usan `private.apply_recipe_stock_consumption` con `origin='shipping'`;
- reducciones usan `private.apply_recipe_stock_return`;
- `business_order_stock_operations` mantiene el vínculo auditable.

Cancelar permite devolver o conservar Stock, preservando el comportamiento funcional existente.

Las recetas, conversiones, saldos negativos e idempotencia continúan siendo autoridad de los motores E30C/E31A.

## Cocina

Las líneas siguen viviendo en `business_order_items`. Por lo tanto el trigger 021 continúa aplicando la regla ya auditada:

- mientras la base está `pending`, la base absorbe cambios;
- después de comenzar, incrementos crean comandas agregadas;
- reducciones consumen agregados activos sin reescribir `completed`.

E34A agrega dos RPC específicas para shipping:

- `get_business_shipping_kitchen_snapshot`;
- `set_business_shipping_kitchen_command_status`.

No se modifica la RPC de Cocina de Reservas. E34B combinará ambos snapshots en la única UI existente de `/local/cocina`.

## Pagos y Caja

E32A exigía `reservation_id` porque solo existían cobros de mesa. E34A generaliza ambas tablas financieras:

- `reservation_id` pasa a nullable;
- se agrega `shipping_id` nullable;
- un constraint exige exactamente una fuente: Reserva XOR Envío.

La RPC `complete_business_reservation_payment` permanece intacta.

La nueva `complete_business_shipping_payment`:

- exige `shipping >= manage` y `cash >= manage`;
- exige Caja abierta para la fecha del pedido;
- valida que la suma de pagos coincida exactamente con el subtotal canónico;
- inserta en las mismas tablas financieras;
- completa `business_orders` y `business_shipping_orders` atómicamente.

Caja y conciliación siguen leyendo el mismo ledger de pagos; no existe una segunda caja para Envíos.

## Milestones

`set_business_shipping_milestone` persiste:

- `ready`;
- `on_the_way` solo para Delivery.

Los hitos de Envíos no sustituyen el estado interno de Cocina.

## Snapshot

`get_business_shipping_snapshot(business_id, start_date, end_date)` exige `shipping >= view` y devuelve:

- contexto de Envíos;
- pedido canónico y líneas;
- subtotal;
- estado de Cocina;
- pagos asociados.

El rango máximo es 3660 días para evitar consultas sin cota.

## Idempotencia

`business_shipping_operations` conserva evidencia para:

- save;
- accept;
- cancel;
- milestone.

Los pagos reutilizan la idempotencia global de `business_payment_operations`.

## Seguridad

`business_shipping_orders` y `business_shipping_operations` nacen con RLS habilitada y forzada.

- `authenticated` recibe solo `SELECT` sobre la tabla operativa y la policy exige `shipping >= view`;
- la tabla de operaciones no se expone directamente;
- no hay INSERT/UPDATE/DELETE directo para roles API;
- `service_role` recibe grants explícitos para fixtures y mantenimiento;
- las escrituras de usuario pasan por RPC `SECURITY DEFINER` que revalidan `auth.uid()`, tenant y permisos;
- todas las funciones fijan `search_path = ''`;
- el navegador no decide `business_id`.

Los grants son explícitos para no depender de defaults de Data API.

## Rollback

El rollback de E34A corta las RPC públicas y el helper privado, revoca lectura API y mantiene RLS forzada.

No destruye:

- pedidos de Envíos;
- operaciones;
- columnas `shipping_id` en pagos;
- FKs/constraints de fuente;
- movimientos de Stock;
- comandas;
- evidencia financiera.

Volver `reservation_id` a NOT NULL o eliminar `shipping_id` podría destruir evidencia válida, por eso el rollback es deliberadamente no destructivo.

## Frontera E34A

E34A es backend-only.

No modifica todavía:

- `src/app/local/envios/page.tsx`;
- `src/app/local/envios/v2-envios-page.tsx`;
- web pública `[slug]`;
- tracking público `[trackingId]`.

El paquete local:

- no aplica 022;
- no ejecuta staging remoto;
- no ejecuta `staging:cleanup-isolation`;
- no hace commit;
- no hace push.

Después del QA local, 022 se aplicará una sola vez a staging y se probarán Stock, BOLA, DML, Cocina y Caja antes de publicar E34A.
