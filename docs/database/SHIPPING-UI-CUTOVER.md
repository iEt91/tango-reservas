# E34B — Cutover UI persistente de Envíos

## Objetivo

E34B conecta la interfaz V2 existente de `/local/envios` con el backend E34A
publicado y validado en staging. No crea un segundo sistema visual ni una
segunda fuente de verdad.

No se agrega una migración 023. La migración 022 y su rollback permanecen
byte-identical.

## Wrapper servidor y permisos

En datasource Supabase, `/local/envios/page.tsx` resuelve sesión y negocio,
exige `shipping >= view`, deriva `shipping >= manage` y `cash >= manage`, y
obtiene el Menú persistente del negocio. Owner/admin conservan privilegios.

En datasource local se conserva `V2EnviosPage` sin props persistentes.

## Fuente de verdad

En modo Supabase, `V2EnviosPage` obtiene las filas mediante
`getBusinessShippingSnapshotAction`.

`localStorage` deja de ser autoridad para pedidos, aceptación, Stock, hitos,
cancelación, pago y Cocina. El fallback histórico permanece solamente en modo
local.

## Menú canónico

El selector de productos recibe `getBusinessMenuForBusiness` desde el wrapper.
En Supabase el navegador envía únicamente IDs y cantidades. PostgreSQL vuelve
a validar nombres, precios, subtotal, Recetas y Stock.

El tipo Delivery/Retiro queda bloqueado al editar porque E34A lo define como
identidad histórica inmutable.

## Mutaciones

La UI reutiliza las Server Actions E34A:

- `saveBusinessShippingOrderAction`;
- `acceptBusinessShippingOrderAction`;
- `setBusinessShippingMilestoneAction`;
- `cancelBusinessShippingOrderAction`;
- `completeBusinessShippingPaymentAction`.

El navegador nunca envía `business_id`. Cada payload conserva una
`operationKey` estable hasta que la operación responde con éxito.

## Estados

Se mantienen las acciones visuales existentes: aceptar con ETA, rechazar,
editar, enviar en camino, cancelar con elección sobre Stock y marcar entregado.
Para Retiro se agrega el hito “Listo para retirar”.

“Marcar entregado” registra el pago Shipping canónico. Staff necesita
`shipping >= manage` y `cash >= manage`.

## Stock, Cocina y Caja

En Supabase la UI no replica efectos en JavaScript. E34A maneja Stock, el
trigger 021 mantiene las comandas y el pago escribe el ledger de Caja.

Las señales entre pestañas solamente invalidan snapshots; no son la fuente de
verdad.

## Cocina Delivery/Retiro

E34B conecta además los RPC Shipping de Cocina creados por E34A. La pantalla
única `/local/cocina` combina el snapshot de Reservas E33A con el snapshot
Delivery/Retiro E34A.

Se usa un contrato TypeScript Shipping separado para no ampliar el contrato
histórico E33B `source="reservation"`.

## Sincronización

`V2ServerSyncDomain` incorpora `shipping` antes de `expenses`.

Envíos publica `shipping` y, según la operación, `stock`, `kitchen` o `cash`.
Envíos escucha `shipping`, `kitchen` y `cash`. Cocina escucha también
`shipping`. Foco y visibilidad disparan reconciliación canónica.

## Tracking público

E34B conserva el código de tracking, pero el tracking público persistente aún
no está habilitado en Supabase. Los botones quedan deshabilitados y WhatsApp no
promete un enlace persistente.

La creación pública y `/[slug]/pedido/[trackingId]` se conectarán en E34C con
su frontera anti-abuso.

## Fallback local

El datasource local conserva Envíos, Stock simulado, tickets locales, Caja
local, tracking local y WhatsApp con link local.

## Seguridad

El cliente no crea Supabase, no usa `.from()` ni `.rpc()`, no conoce
`business_id` y no hace DML directo. Las Server Actions y PostgreSQL siguen
siendo la autoridad.

## Migraciones

E34B no crea ni aplica migraciones.

Deben permanecer byte-identical:

- `20260811_022_shipping_orders_write.sql`;
- `20260811_022_shipping_orders_write.down.sql`.

No se ejecuta `staging:cleanup-isolation`.
