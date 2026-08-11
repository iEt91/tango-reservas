# E33B — Cutover UI persistente de Cocina

## Objetivo

E33B conecta la interfaz V2 existente de `/local/cocina` con el backend
operativo E33A ya publicado y validado en staging.

No se crea una segunda interfaz visual. La pantalla mantiene las mismas tres
columnas, métricas, tarjetas, temporizadores, historial y acciones visibles.

E33B no agrega migraciones. La migración 021 ya fue aplicada una sola vez en
staging durante E33A y debe permanecer byte-identical.

## Ruta y permisos

`src/app/local/cocina/page.tsx` pasa a ser un wrapper servidor.

Cuando el datasource no es Supabase, entrega la misma UI con fallback local.

Cuando el datasource es Supabase:

- resuelve sesión y negocio activo;
- rechaza acceso sin `kitchen >= view`;
- calcula `canManageKitchen` con `kitchen >= manage`;
- entrega esos permisos explícitamente al componente cliente.

Owner y admin conservan acceso privilegiado mediante el contrato de Staff.

## Fuente de verdad

En modo Supabase, `V2CocinaPage` no deriva comandas desde reservas de
`localStorage`.

La pantalla obtiene el día actual mediante
`getBusinessKitchenSnapshotAction(businessDate)` y adopta el
`BusinessKitchenSnapshot` validado por E33A.

El snapshot ya contiene:

- pedido y comanda;
- mesa;
- cliente;
- hora;
- nota;
- platos y cantidades;
- estado;
- tiempo objetivo;
- timestamps;
- agregados posteriores.

Los tiempos objetivo no vuelven a calcularse en el navegador: provienen de
PostgreSQL y de los snapshots de Recetas definidos en E33A.

## Mutaciones

Las acciones visibles mantienen el flujo existente:

- `pending -> preparing`: Comenzar;
- `preparing -> ready`: Marcar lista;
- `ready -> preparing`: Reabrir;
- `ready -> completed`: Servida.

Cada operación persistente usa exclusivamente
`setBusinessKitchenCommandStatusAction`.

El navegador envía:

- `orderId`;
- `ticketId` cuando corresponde;
- estado objetivo;
- `operationKey`.

Nunca envía `business_id`.

La clave de operación se conserva estable mientras una mutación fallida pueda
reintentarse, y se elimina solo después de una respuesta exitosa.

La respuesta canónica de la RPC se aplica inmediatamente al snapshot y luego
se ejecuta una reconciliación completa.

## Sincronización

`V2ServerSyncDomain` incorpora `kitchen`.

Se agrega antes de `expenses` para mantener compatibles las regresiones
históricas que todavía validan a `expenses` como miembro terminal.

Cocina:

- publica `kitchen` después de una mutación persistente;
- escucha `kitchen` para otras pestañas de Cocina;
- escucha `stock` porque el cutover E31B ya publica esa señal después de
  modificar el consumo de una reserva;
- reconcilia también al recuperar foco o visibilidad.

La señal solo provoca una relectura canónica. No convierte `localStorage`,
BroadcastChannel ni el evento de ventana en fuente de verdad.

## Delivery y retiro

E33A/E33B cubren únicamente pedidos `dine_in` persistentes asociados a Reservas.

En modo Supabase, Delivery y Retiro no se reconstruyen desde el fallback local
ni se mezclan con comandas persistentes.

La cabecera lo comunica explícitamente.

El flujo persistente de `delivery | pickup` se conectará cuando Envíos tenga su
backend canónico.

## Fallback local

Fuera de Supabase se preserva el comportamiento anterior:

- reservas locales;
- delivery/retiro locales;
- recetas locales;
- tickets agregados locales;
- escritura y eventos de `localStorage`.

Todos los listeners y escrituras locales quedan detrás de la frontera
`isSupabasePersistence`.

## Seguridad

El componente cliente:

- no crea cliente Supabase;
- no usa `.from()` ni `.rpc()`;
- no conoce `business_id`;
- no lee tablas técnicas;
- usa únicamente Server Actions E33A.

La UI deshabilita mutaciones cuando `canManageKitchen` es falso, pero PostgreSQL
y las Server Actions continúan siendo la autoridad.

## Migraciones

E33B no agrega ni aplica migraciones.

Deben permanecer byte-identical:

- `20260811_021_kitchen_operational_write.sql`;
- `20260811_021_kitchen_operational_write.down.sql`.

No se ejecuta `staging:cleanup-isolation`.
