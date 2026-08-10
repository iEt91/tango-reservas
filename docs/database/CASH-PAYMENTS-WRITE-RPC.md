# E32A — Backend persistente de Caja/Pagos

## Objetivo

E32A crea la primera fuente canónica financiera para Tango Reservas sin
habilitar todavía el cierre definitivo de Caja en la interfaz.

El alcance es deliberadamente estrecho:

- apertura persistente de una sesión de Caja por negocio y fecha;
- cobro persistente de una Reserva con pedido `dine_in` abierto;
- efectivo, tarjeta, Mercado Pago y transferencia como componentes separados;
- cobro mixto como combinación de componentes, no como un método ficticio;
- idempotencia para reintentos;
- cierre atómico de `business_orders` y `reservations`;
- lectura protegida por el permiso `cash`;
- ningún DML financiero directo desde el navegador.

## Por qué E32A no cierra todavía la Caja

La pantalla actual de Caja calcula el efectivo esperado incluyendo Gastos.
Los Gastos todavía no tienen una fuente persistente canónica.

Habilitar hoy el cierre definitivo de Caja produciría una conciliación
incompleta: podría conocer cobros persistentes, pero no todos los egresos
persistentes.

Por eso E32A permite abrir la sesión y registrar cobros, pero el cierre
definitivo de Caja queda bloqueado hasta incorporar Gastos persistentes.

## Tablas

### `cash_sessions`

Mantiene una única sesión por `business_id + business_date`.

La apertura registra:

- monto inicial;
- actor autenticado;
- fecha/hora;
- clave idempotente.

La tabla ya contiene campos reservados para el futuro cierre, pero E32A no
expone ninguna RPC que permita completarlos.

### `business_payment_operations`

Tabla técnica privada de idempotencia.

Guarda:

- negocio;
- pedido;
- reserva;
- sesión de Caja;
- payload normalizado;
- snapshot de resultado.

No tiene `SELECT` para `authenticated`.

### `business_payments`

Ledger de componentes de pago.

Los únicos métodos persistidos son:

- `cash`
- `card`
- `mercado_pago`
- `transfer`

Un cobro mixto genera varias filas bajo la misma operación.

## Cobro transaccional

`complete_business_reservation_payment`:

1. exige usuario autenticado;
2. exige permiso `cash >= manage`;
3. normaliza hasta cuatro medios sin duplicados;
4. bloquea por negocio para serializar mutaciones financieras;
5. valida la clave idempotente;
6. bloquea la Reserva;
7. exige estado `confirmed`;
8. bloquea el `business_order` `dine_in`;
9. exige pedido `open`;
10. busca la Caja de `reservation_date` y exige que esté `open`;
11. compara la suma de pagos contra `business_orders.subtotal`;
12. persiste los componentes;
13. marca primero el pedido `completed`;
14. marca después la Reserva `completed`;
15. devuelve un snapshot canónico.

El orden pedido → Reserva es intencional: preserva el guard agregado en E31A
que impide terminar una Reserva mientras existe consumo abierto.

## Frontera de confianza

El navegador puede enviar:

- ID de Reserva;
- clave de operación;
- método;
- importe por método.

El navegador no envía ni decide:

- precio de platos;
- subtotal del pedido;
- total final aceptado;
- negocio objetivo;
- estado final del pedido;
- estado final de la Reserva.

El subtotal aceptado sale siempre de `business_orders.subtotal` dentro de
PostgreSQL.

## Seguridad

Las tres tablas usan RLS habilitada y forzada.

`authenticated` recibe únicamente:

- `SELECT` sobre `cash_sessions`;
- `SELECT` sobre `business_payments`;
- `EXECUTE` sobre las dos RPC públicas.

No recibe `INSERT`, `UPDATE` ni `DELETE`.

`business_payment_operations` permanece privada.

Las RPC son `SECURITY DEFINER`, fijan `search_path = ''`, comprueban
`auth.uid()` y vuelven a autorizar el permiso `cash` dentro de PostgreSQL.

## Rollback

El rollback elimina las RPC y políticas de lectura, revoca los grants y deja
las tablas con RLS forzada.

No elimina las tablas ni la evidencia financiera ya registrada.

## Próximo corte

E32B puede conectar la UI de Reservas a esta capa para habilitar el modal de
cobro persistente y cargar el estado real de Caja.

El cierre definitivo de Caja debe esperar a que Gastos persistentes también
formen parte de la conciliación.
