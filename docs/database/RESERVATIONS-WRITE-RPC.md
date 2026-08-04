# Reservas persistentes y disponibilidad transaccional

## Alcance de la Entrega 18

Esta entrega establece el backend persistente, aislado e idempotente para
reservas. Todavía no conecta `/local/reservas` con PostgreSQL porque esa pantalla
mezcla reservas, plano, consumo, stock, cocina, caja, pagos, WhatsApp y tracking
en una única capa cliente basada en `localStorage`.

El corte visual se realizará después de estabilizar este contrato y de definir la
persistencia del plano de mesas.

## Esquema

Se conserva el esquema base de `public.reservations` y se agregan:

- `customer_id`, referencia opcional al cliente persistido;
- `duration_minutes`, duración efectiva usada para solapamientos;
- `public_code`, identificador público único no secuencial;
- `idempotency_key`, clave opcional única por negocio;
- `confirmed_at`, `completed_at`, `cancelled_at` y `no_show_at`.

PostgreSQL valida longitudes, personas, duración, código público, fuente y clave
de idempotencia. La migración no agrega columnas de consumo, pago, stock, cocina
o asignación de mesa.

## Lectura

Los miembros activos `owner`, `admin` y `staff` reciben `SELECT` exclusivamente
sobre reservas de su propio `business_id`, mediante RLS y
`private.has_business_role`.

`anon` no recibe lectura ni ejecución de las RPC internas. El tracking público
requiere un contrato separado y no forma parte de esta entrega.

## Escritura

### Alta y edición

```text
public.save_business_reservation(uuid, uuid, jsonb, text)
```

- `p_reservation_id = NULL`: crea una reserva;
- con UUID: edita una reserva activa del negocio;
- la cuarta entrada es una clave de idempotencia opcional;
- admite `owner`, `admin` y `staff`;
- valida servicio y cliente dentro del tenant;
- normaliza teléfono y correo;
- deriva `pending` o `confirmed` desde `requires_confirmation`;
- conserva el estado al editar;
- rechaza la edición de reservas terminales.

Un reintento de alta con la misma clave de idempotencia devuelve la misma fila y
no crea una reserva adicional.

### Disponibilidad

La RPC toma un bloqueo transaccional por negocio y fecha antes de contar la
capacidad. Verifica en una única transacción:

- servicio activo y perteneciente al negocio;
- capacidad máxima del servicio;
- día abierto;
- horario de apertura y cierre, incluidos turnos nocturnos;
- pausa configurada;
- máximo de reservas activas que se superponen;
- máximo de personas activas que se superponen;
- teléfono con otra reserva activa superpuesta.

Los estados `pending` y `confirmed` bloquean disponibilidad. `cancelled`,
`completed` y `no_show` no bloquean.

La disponibilidad de mesas no se persiste todavía porque el esquema remoto no
tiene una tabla de plano o asignaciones. Esa validación continúa como deuda P0
para el corte de `/local/reservas`.

## Estados

```text
public.set_business_reservation_status(uuid, uuid, text)
```

Transiciones admitidas:

- `pending` → `confirmed` o `cancelled`;
- `confirmed` → `completed`, `cancelled` o `no_show`.

Repetir el mismo estado es idempotente. Las reservas terminales no pueden
reabrirse mediante esta RPC. Cada transición registra su timestamp una sola vez.

## Seguridad

- las funciones son `SECURITY DEFINER`;
- el `search_path` es vacío;
- el negocio se valida contra la membresía activa;
- servicio, cliente y reserva se filtran por `business_id`;
- las escrituras directas `INSERT`, `UPDATE` y `DELETE` siguen revocadas;
- solo se concede `SELECT` y ejecución de las RPC a `authenticated`;
- una operación BOLA produce error sin revelar la fila ajena.

## Capa heredada

`src/lib/data/supabase/reservations.ts` queda alineado con las columnas reales de
la migración `009` y conserva únicamente lectura autenticada. Las funciones
anteriores de alta, edición, estado, eliminación y asignación de mesas fallan
cerrado e indican que debe utilizarse una Server Action autenticada.

No se consultan columnas inexistentes como `assigned_table_ids`,
`deposit_status` o `deposit_amount`, y tampoco se intenta crear clientes desde el
navegador.

## Límites deliberados

Esta etapa no persiste:

- mesas o combinaciones de mesas;
- consumo y comandas;
- movimientos de stock;
- pagos o caja;
- mensajes de WhatsApp;
- tracking público;
- zona horaria del negocio.

`min_notice_minutes` y `max_days_ahead` no se aplican en PostgreSQL hasta que el
negocio tenga una zona horaria canónica. Aplicarlos con la zona horaria del
servidor produciría errores cerca del cambio de día. La interfaz actual conserva
esas validaciones como compatibilidad transitoria.

## Fixture y QA remoto

Después de aplicar la migración `009`, ejecutar una vez el seed idempotente:

```text
npm run staging:seed-isolation
```

Después ejecutar:

```text
npm run staging:test-reservations-write
npm run staging:test-isolation
```

La prueba de escritura crea, reintenta, edita y cambia de estado una reserva
temporal, verifica capacidad, solapamiento, BOLA y DML directo, y restaura las
reservas A/B en `finally`.

No ejecutar `staging:cleanup-isolation`.
