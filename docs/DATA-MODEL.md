# Modelo de datos objetivo

## Principios

1. Toda entidad operativa privada pertenece a un `business`.
2. La autorización se resuelve con membresías, no con parámetros de URL.
3. PostgreSQL es la única fuente de verdad operativa.
4. `localStorage` queda limitado a preferencias de interfaz y caché descartable.
5. Pagos, stock, caja y reservas usan transacciones e idempotencia.
6. Las eliminaciones críticas se auditan; se prioriza archivado o soft delete.
7. Fechas se guardan en UTC cuando representan instantes y como `date`/`time` cuando representan horarios comerciales.

## Identidad y tenancy

### `profiles`

Datos del usuario vinculados a `auth.users`.

- `id`
- `auth_user_id`
- `full_name`
- `created_at`
- `updated_at`

### `businesses`

Un local físico vendible de Tango.

- `id`
- `name`
- `slug`
- `status`
- datos públicos y comerciales
- `created_at`
- `updated_at`

### `business_members`

Fuente de autorización.

- `id`
- `business_id`
- `user_id`
- `role`: `owner | admin | staff`
- `status`: `active | invited | disabled`
- `created_at`
- `updated_at`
- `unique (business_id, user_id)`

## Configuración

- `business_settings`
- `business_hours`
- `reservation_rules`
- `services`
- `notification_settings`

Todas incluyen `business_id`.

## Plano y reservas

### `floor_tables`

- nombre, capacidad, posición, tamaño, estado y bloqueo.
- `business_id`.

### `reservations`

- cliente, fecha, hora, duración, personas, estado, origen y código público.
- timestamps de confirmación, cancelación, no-show y finalización.
- `business_id`.

### `reservation_tables`

Relación N:M para soportar mesas combinadas.

- `reservation_id`
- `table_id`
- `business_id`
- `unique (reservation_id, table_id)`

La creación y edición debe pasar por una función transaccional que bloquee conflictos antes de confirmar.

## Clientes

### `customers`

- nombre, teléfono normalizado, email, notas, preferencias y métricas.
- deduplicación por negocio y teléfono normalizado cuando exista.

### `customer_events`

Historial auditable de reservas, pedidos, notas y cambios relevantes.

## Menú, recetas y stock

- `menu_categories`
- `menu_items`
- `recipes`
- `recipe_ingredients`
- `stock_products`
- `stock_movements`

`stock_movements` es el ledger obligatorio:

- `type`: purchase, sale, return, adjustment, waste.
- cantidad firmada y unidad normalizada.
- referencia de origen.
- `operation_key` único para idempotencia.
- usuario y timestamp.

El saldo puede almacenarse como caché, pero debe reconciliarse contra movimientos.

## Pedidos y cocina

### `orders`

Modelo común para consumo de reserva, delivery y retiro.

- `type`: table, delivery, pickup.
- estado operativo.
- cliente y dirección cuando aplica.
- `reservation_id` opcional.
- `business_id`.

### `order_items`

- producto, nombre y precio capturados al momento de vender.
- cantidad y estado.

### `kitchen_tickets` y `kitchen_ticket_items`

Permiten comandas parciales, preparación y entrega sin reescribir el pedido original.

## Pagos y caja

### `payments`

Representa una operación cobrada o revertida.

- total.
- estado.
- referencia a pedido o reserva.
- `operation_key` único.

### `payment_allocations`

Descompone pagos mixtos.

- `method`: cash, card, mercado_pago, transfer.
- importe.
- la suma debe coincidir con `payments.total`.

### `cash_registers`

- apertura, cierre, importes declarados y diferencia.
- un registro abierto por negocio y fecha/caja.

### `cash_movements`

- ingreso, retiro, ajuste o contrapartida.
- referencia al pago/gasto.
- no se eliminan silenciosamente.

### `expenses`

- categoría, proveedor, importe, fecha, estado y comprobante.

## Web pública

- `business_web_content`
- `web_sections`
- `gallery_images`
- `public_menu_sections`
- assets en Supabase Storage.

Solo el contenido publicado es legible de forma anónima. Escritura reservada a miembros autorizados.

## Auditoría e idempotencia

### `audit_logs`

- negocio, usuario, acción, entidad, entidad ID, datos anteriores/posteriores resumidos y fecha.

### `idempotency_keys`

- negocio, clave, operación, estado, resultado y expiración.
- evita duplicaciones por reintentos de red.

## Reglas RLS

- `owner`: control total del negocio.
- `admin`: operación y configuración; no transfiere propiedad.
- `staff`: operación diaria, sin administración sensible.
- `anon`: solo contenido público publicado, disponibilidad pública y altas expresamente permitidas.
- Service role: únicamente en servidor y tareas administrativas controladas.

## Mapeo desde almacenamiento local V2

| Clave actual | Destino |
|---|---|
| reservas | `reservations`, `reservation_tables`, `orders` |
| envíos | `orders`, `order_items` |
| configuración | `business_settings`, `business_hours`, `reservation_rules` |
| stock | `stock_products`, `stock_movements` |
| gastos | `expenses` |
| caja | `cash_registers`, `cash_movements`, `payments` |
| menú | `menu_categories`, `menu_items`, `recipes` |
| plano | `floor_tables` |
| web | `business_web_content`, `web_sections`, Storage |
| clientes | `customers`, `customer_events` |

## Orden de migración

1. Identidad, membresías y RLS.
2. Configuración y datos maestros.
3. Clientes, menú, recetas, stock y plano.
4. Reservas y disponibilidad.
5. Pedidos, cocina, pagos, caja y gastos.
6. Reportes y eliminación de la persistencia local operativa.
