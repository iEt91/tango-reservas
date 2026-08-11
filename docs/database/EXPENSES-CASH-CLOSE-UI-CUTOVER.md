# E32C-B — Cutover UI de Gastos y cierre de Caja

## Objetivo

E32C-B conecta las pantallas V2 existentes con el backend E32C-A ya validado
en staging. No crea ni modifica migraciones.

## Gastos

`/local/gastos` deja de usar `localStorage` como fuente de verdad cuando el
datasource es Supabase.

El servidor carga `business_expenses` del negocio activo y entrega un snapshot
inicial al componente cliente.

Las mutaciones usan exclusivamente Server Actions:

- alta/edición/estado: `saveBusinessExpenseAction`;
- baja lógica: `archiveBusinessExpenseAction`;
- refresh: `getBusinessExpensesAction`.

El navegador no envía `business_id` ni ejecuta DML directo.

### Permisos

- `expenses >= manage`: crear, editar y cambiar estado;
- `expenses >= full`: eliminar lógicamente;
- una mutación con impacto de efectivo también necesita `cash >= manage`.

La UI replica estas capacidades, pero PostgreSQL sigue siendo la autoridad.

## Caja

`/local/caja` usa `getBusinessCashReconciliationAction` como fuente canónica
para la fecha seleccionada.

La UI deja de calcular el cierre como dato autoritativo. PostgreSQL sigue
calculando:

`fondo inicial + cobros cash - gastos cash + movimientos netos`

El cliente muestra el esperado devuelto por la conciliación y al cerrar solo
envía efectivo contado, nota y clave idempotente.

Quedan habilitadas:

- apertura;
- movimientos `income` / `withdrawal`;
- anulación lógica de movimientos;
- cierre;
- reapertura;
- historial de cierres persistentes.

### Permisos de Caja

- `cash >= view`: lectura y conciliación;
- `cash >= manage`: apertura, movimientos y cierre;
- `cash >= full`: anulación de movimientos y reapertura.

## Privacidad entre módulos

Caja recibe únicamente el total de Gastos pagados en efectivo necesario para
la conciliación. No recibe descripción, proveedor ni detalle de Gastos.

Los Gastos no se exponen a un empleado con permiso exclusivo de Caja.

## Gastos no-cash

La tarjeta "Gastos de tarjeta" de Caja no intenta saltarse el permiso `expenses`.
En modo persistente muestra que el detalle se consulta en Gastos. Estos egresos
no afectan el efectivo esperado del cierre.

## Sincronización

`v2-server-sync` incorpora el dominio `expenses`.

Una mutación persistente de Gastos publica:

- `expenses` para rehidratar otras pestañas de Gastos;
- `cash` para reconciliar Caja si el cambio afecta o podría afectar la jornada.

Caja sigue escuchando `cash`.

## Fallback local

Cuando el datasource no es Supabase, Gastos y Caja conservan el comportamiento
local anterior.

## Migraciones

E32C-B no agrega migraciones.

Deben permanecer byte-identical:

- migración 019 y rollback 019;
- migración 020 y rollback 020.

La migración 020 ya fue aplicada una sola vez en staging durante E32C-A.
