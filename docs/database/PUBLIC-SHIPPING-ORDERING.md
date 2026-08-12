# E34C — Pedidos web y tracking público persistente

## Objetivo

E34C cierra la integración de Envíos conectando la web pública y el tracking
con el núcleo persistente E34A/E34B.

El navegador público no recibe acceso directo a tablas Supabase. La frontera es:

`browser -> Route Handler Next.js -> service_role server-only -> RPC service_*`

La clave `SUPABASE_SERVICE_ROLE_KEY` permanece exclusivamente en servidor.

## Migración 023

E34C agrega:

- evidencia `public_create` a `business_shipping_operations`;
- `business_public_request_limits`, tabla técnica con RLS forzada;
- helper `service_*` de rate-limit atómico, ejecutable solo por `service_role`;
- snapshot público de Menú/negocio por slug;
- creación pública de Shipping por slug;
- tracking público mínimo por slug + código.

No modifica la migración 022 ni su rollback.

## Grants y RLS

E34C no concede `SELECT`, `INSERT`, `UPDATE` ni `DELETE` a `anon` sobre:

- `businesses`;
- `menu_categories`;
- `menu_category_products`;
- `menu_items`;
- `business_orders`;
- `business_order_items`;
- `business_shipping_orders`;
- `business_shipping_operations`;
- `business_public_request_limits`.

Las tres RPC `service_*` revocan `PUBLIC`, `anon` y `authenticated`, y conceden
`EXECUTE` únicamente a `service_role`.

Son `SECURITY INVOKER`: no crean una segunda bypass API pública. El único actor
capaz de usarlas es el cliente privilegiado que ya está encapsulado por
`src/lib/supabase/server.ts`.

## Pedido público

La ruta `POST /api/public/[slug]/shipping`:

- limita cuerpo a 64 KiB;
- normaliza el slug;
- deriva un fingerprint HMAC server-only de metadatos de conexión;
- acepta solamente IDs de Menú y cantidades;
- nunca acepta `business_id`, nombre de producto, precio ni subtotal;
- llama `service_create_public_shipping_order`.

PostgreSQL vuelve a resolver:

- negocio activo por slug;
- producto perteneciente a ese negocio;
- visibilidad/estado del producto y su categoría;
- nombre y precio canónicos;
- subtotal.

El pedido nace:

- `source='web'`;
- `needs_acceptance=true`;
- `business_orders.status='open'`;
- tracking `PED-...` generado en PostgreSQL.

Por diseño no reserva Stock antes de aceptación. E34A sigue siendo la única
frontera que acepta el pedido y reserva Stock. La Cocina Shipping de 022 también
oculta las comandas mientras `needs_acceptance=true`.

## Idempotencia

El browser genera una `requestKey` estable con prefijo `web:` y la conserva
hasta obtener éxito.

023 usa advisory lock y la evidencia `business_shipping_operations` con
`operation_type='public_create'`.

Un retry con la misma key y el mismo payload devuelve exactamente el mismo
resultado. La misma key con payload distinto se rechaza.

## Anti-abuso

`business_public_request_limits` mantiene contadores atómicos por negocio,
acción, fingerprint y ventana.

Creación:

- 5 pedidos / 10 minutos por fingerprint;
- 120 pedidos / 10 minutos globales por negocio.

Tracking:

- 120 lecturas / minuto por fingerprint;
- 3000 lecturas / minuto globales por negocio.

El fingerprint se calcula con HMAC SHA-256 en Next.js usando un secreto
server-only. PostgreSQL nunca almacena IP ni User-Agent crudos.

Los contadores de más de 24 horas se purgan oportunísticamente.

## Snapshot público de pedido

`GET /api/public/[slug]/ordering` devuelve solo identidad pública mínima y el
Menú publicable:

- nombre, dirección, teléfono y WhatsApp;
- categorías visibles/activas;
- productos visibles, no archivados y `available`.

Las promociones pueden seguir mostrándose como categorías, pero E34C no admite
sus IDs sintéticos `promo-*` como líneas canónicas. En modo Supabase quedan
display-only para pedidos hasta que exista un modelo de línea promocional
auditable.

## Tracking

`GET /api/public/[slug]/shipping/[trackingId]` devuelve:

- nombre del negocio;
- código;
- Delivery/Retiro;
- estado y aceptación;
- ETA;
- timestamps operativos;
- total;
- nombres y cantidades.

No devuelve:

- teléfono;
- dirección;
- nota;
- identidad del actor;
- IDs internos de negocio/orden/envío.

Un tracking `completed` o `cancelled` deja de devolver datos un minuto después
del timestamp terminal, preservando la política pública existente.

El código usa 16 caracteres hexadecimales aleatorios detrás de `PED-`, por lo
que no depende de IDs secuenciales ni de datos del cliente.

## Web pública

`/[slug]` conserva el fallback local.

En datasource Supabase:

- obtiene Menú/identidad desde `/api/public/[slug]/ordering`;
- deja de usar localStorage como autoridad del pedido;
- envía IDs/cantidades al Route Handler;
- utiliza el total canónico devuelto por PostgreSQL;
- conserva la request key en reintentos;
- abre WhatsApp con el tracking real;
- navega al tracking persistente.

## Panel Envíos

E34C entrega el slug del negocio activo a `V2EnviosPage`.

En Supabase:

- “Ver seguimiento” vuelve a estar habilitado;
- “Copiar link” vuelve a estar habilitado;
- WhatsApp vuelve a incluir el link persistente.

El fallback local sigue usando `/demuru/...` como antes.

## Rollback

El rollback corta las RPC `service_*`, incluido el helper de rate-limit.

Deliberadamente preserva:

- pedidos web ya creados;
- evidencia `public_create`;
- la tabla técnica de rate-limit;
- la extensión del constraint de tipos de operación.

No destruye órdenes, Envíos, Stock, Cocina ni evidencia financiera.

## Frontera

El paquete local E34C:

- no aplica 023;
- no aplica nuevamente 022;
- no ejecuta staging remoto;
- no ejecuta `staging:cleanup-isolation`;
- no hace commit;
- no hace push.

Después del QA local, 023 se aplicará una sola vez en staging y se ejecutará la
prueba funcional remota antes de publicar E34C.
