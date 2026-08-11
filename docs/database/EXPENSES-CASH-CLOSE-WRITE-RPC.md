# E32C-A — Gastos persistentes y conciliación canónica de Caja

## Objetivo

E32C-A agrega la capa backend que faltaba para poder cerrar Caja sin mezclar
datos persistentes con `localStorage`.

Este corte **no conecta todavía la UI de Gastos ni habilita los botones de
cierre/reapertura en Caja**. Primero se valida la capa canónica y su aislamiento
en staging.

## Migración 020

`20260811_020_expenses_cash_close.sql` agrega:

- `business_expenses`
- `business_expense_operations`
- `cash_session_movements`
- `cash_session_operations`
- snapshots de cierre sobre `cash_sessions`

La migración 019 permanece byte-identical.

## Gastos

`business_expenses` separa:

- fecha contable/pago;
- vencimiento opcional;
- descripción;
- proveedor;
- categoría;
- importe;
- estado `pending | paid`;
- método `cash | card | mercado_pago | transfer`;
- `paid_at`;
- baja lógica mediante `archived_at`.

La UI puede seguir mostrando “Eliminar”, pero la evidencia financiera no se
destruye físicamente.

### Permisos

- lectura: `expenses >= view`;
- alta/edición/estado: `expenses >= manage`;
- eliminación lógica: `expenses >= full`.

Si una mutación agrega, modifica o quita impacto de **efectivo**, PostgreSQL
también exige `cash >= manage`.

## Regla de Caja para Gastos en efectivo

Un gasto pagado en efectivo solo puede crearse o alterar su impacto si existe
una `cash_session` abierta para esa fecha.

Una vez cerrada la Caja, el gasto de efectivo queda financieramente congelado.
Para corregir importe, fecha, medio, estado o eliminarlo hay que reabrir antes
la Caja.

Cambios no financieros como descripción/proveedor/categoría no fuerzan una
reapertura.

## Movimientos manuales

`cash_session_movements` reemplaza el ajuste libre de `localStorage`.

Tipos:

- `income`
- `withdrawal`

Alta exige `cash >= manage`.
Anulación exige `cash >= full`.

La anulación es lógica (`voided_at`), preservando auditoría.

## Cierre

`close_business_cash_session` calcula dentro de PostgreSQL:

`esperado = fondo inicial + cobros en efectivo - gastos en efectivo + movimientos netos`

El navegador solo envía:

- sesión;
- efectivo contado;
- notas;
- clave idempotente.

No envía ni decide el efectivo esperado.

El cierre persiste:

- efectivo contado;
- esperado;
- diferencia;
- cobros cash snapshot;
- gastos cash snapshot;
- movimientos netos snapshot;
- actor y timestamp.

## Reapertura

`reopen_business_cash_session` exige `cash >= full`.

La reapertura limpia el estado de cierre actual, pero
`cash_session_operations` conserva el snapshot histórico del cierre/reapertura
para auditoría e idempotencia.

## Lectura de conciliación

`get_business_cash_reconciliation` exige `cash >= view` y devuelve solamente la
información necesaria para Caja:

- sesión;
- totales de cobros por método;
- **total** de gastos en efectivo, sin exponer detalles de Gastos;
- movimientos de Caja;
- esperado actual.

Esto evita otorgar permiso `expenses` a un empleado que solo puede ver Caja.

## Seguridad

Las cuatro tablas nuevas tienen RLS habilitada y forzada.

`authenticated` recibe:

- `SELECT` de `business_expenses`;
- `SELECT` de `cash_session_movements`;
- `EXECUTE` explícito de las RPC.

No recibe DML directo.
Las tablas técnicas de idempotencia permanecen privadas.

Las RPC son `SECURITY DEFINER`, fijan `search_path = ''`, comprueban
`auth.uid()` y vuelven a autorizar módulo + tenant dentro de PostgreSQL.

La migración usa grants explícitos; no depende de los defaults de exposición
del Data API de Supabase.

## Serialización

Pagos E32A, Gastos E32C y cierre E32C usan el mismo advisory lock por
`business_id`.

Esto evita que un cobro o gasto se inserte simultáneamente mientras Caja está
calculando el cierre.

## Rollback

El rollback corta las RPC, políticas y grants nuevos, pero no destruye tablas
ni evidencia financiera ya generada. RLS queda forzada.

## Frontera de E32C-A

E32C-A **sí** crea la migración 020, pero el BAT de integración local:

- no la aplica a staging;
- no ejecuta `staging:cleanup-isolation`;
- no hace commit;
- no hace push.

Después del QA local se realiza un paso separado de staging.

E32C-B conectará:

- `/local/gastos` al backend persistente;
- movimientos manuales de Caja;
- cierre real;
- reapertura;
- historial de cierres.
