# E32B — Cutover UI de Caja/Pagos

## Objetivo

E32B conecta la UI V2 existente con el backend financiero E32A sin crear una segunda interfaz.

El alcance es deliberadamente parcial y seguro:

- Reservas carga los componentes de pago persistentes;
- el modal de cobro existente usa la Server Action E32A;
- la respuesta canónica de PostgreSQL completa pedido y Reserva;
- Caja abre una sesión persistente real;
- Caja lee los cobros persistentes vinculados a esa sesión;
- el fallback local anterior se conserva cuando el datasource no es Supabase.

## Reservas

En modo Supabase, /local/reservas carga los pagos por lote junto con reservas, pedidos y menú.

La V2 reconstruye:

- método visible;
- total pagado;
- desglose Efectivo / Tarjeta / Mercado Pago / Transferencia;
- fecha del cobro.

Un pago mixto sigue siendo varias filas canónicas; la UI solo lo resume como “Mixto”.

El navegador envía exclusivamente:

- reservationId;
- operationKey;
- método e importe por componente.

No envía subtotal ni precio de platos.

La Server Action completeBusinessReservationPaymentAction y la RPC complete_business_reservation_payment continúan siendo la única vía de escritura.

## Idempotencia

El modal conserva una operationKey estable durante el intento.

Si la respuesta se pierde, un reintento con el mismo payload no duplica el cobro.

PostgreSQL sigue detectando una misma clave reutilizada con un desglose diferente.

## Caja

En Supabase, la pantalla de Caja deja de usar localStorage como fuente de verdad para apertura y cobros.

La apertura usa openBusinessCashSessionAction.

La lectura por fecha usa getBusinessCashSnapshotAction y obtiene:

- cash_sessions del tenant activo;
- business_payments vinculados por cash_session_id.

Las tarjetas de cobro muestran únicamente pagos persistentes de Reservas en esta entrega.

## Lo que permanece bloqueado

E32B NO habilita todavía:

- cierre definitivo de Caja;
- reapertura;
- movimientos manuales persistentes;
- Gastos persistentes;
- cobros persistentes de Envíos.

Por eso la interfaz no presenta los Gastos locales como si fueran canónicos y no ofrece cierre en modo Supabase.

El cierre se habilitará cuando Gastos y los movimientos de Caja tengan fuente persistente, para que la conciliación no nazca incompleta.

## Seguridad

- no se crea un cliente Supabase nuevo en los componentes cliente;
- no hay INSERT/UPDATE/DELETE directo desde navegador;
- lectura de Caja exige cash >= view;
- apertura y cobro exigen cash >= manage;
- business_id siempre se resuelve desde la membresía activa;
- business_payment_operations sigue siendo privada;
- RLS y grants de la migración 019 no se modifican.

## Sincronización

v2-server-sync incorpora el dominio cash.

Después de abrir Caja o cobrar una Reserva se emite una señal de reconciliación. La señal no transporta dinero ni filas financieras: solo ordena volver a leer el servidor.

## Migraciones

E32B no agrega ni aplica migraciones.

La migración 019 permanece intacta y ya fue validada en staging.

## QA esperado

1. Caja sin sesión permite abrir la caja del día.
2. Refresh conserva la apertura.
3. Una Reserva confirmada con consumo abre el modal de cobro.
4. Efectivo, Tarjeta, Mercado Pago, Transferencia y Mixto usan la RPC E32A.
5. El total visible se reemplaza por la respuesta canónica.
6. Refresh de Reservas conserva el pago.
7. Caja refleja esos componentes por método.
8. Staff sin permiso cash manage no puede cobrar ni abrir.
9. Cierre, reapertura y movimientos manuales no aparecen como operaciones persistentes.
10. El fallback local conserva su comportamiento anterior.
