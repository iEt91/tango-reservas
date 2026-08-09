# Stock persistente — backend E29A

## Alcance

E29A crea el backend persistente que usará la interfaz V2 existente de
`/local/stock`.

Esta entrega **no reemplaza la interfaz visual** y no crea una segunda página
de Stock. El corte de UI a Supabase se realizará en E29B sobre
`src/app/local/productos/v2-productos-page.tsx`.

## Fuente de verdad

Se agregan dos tablas por `business_id`:

- `stock_products`: catálogo de insumos.
- `stock_movements`: ledger inmutable de entradas, consumos, devoluciones y
  ajustes.

El saldo se deriva de la suma de `quantity_delta`; no se confía en un contador
del navegador.

## Seguridad

- RLS forzada en ambas tablas.
- `authenticated` recibe únicamente `SELECT`.
- No existe DML directo de navegador.
- Las escrituras pasan por RPC `SECURITY DEFINER`.
- Owner/Admin tienen acceso completo.
- Staff se valida por el nivel efectivo del módulo `stock`.
- El helper privado `current_user_has_module_access` aplica la jerarquía
  `none < view < manage < full`.
- Una operación no puede leer o mutar otro `business_id`.

## RPC

### `save_business_stock_product`

Requiere `stock >= manage`.

Guarda nombre, categoría, proveedor, unidad, costo, alerta, nota y estado.
La unidad no puede modificarse después de existir movimientos porque rompería
el significado histórico de las cantidades.

### `record_business_stock_movement`

Requiere `stock >= manage`.

Tipos:

- `opening`
- `replenishment`
- `consumption`
- `return`
- `adjustment`

Orígenes:

- `manual`
- `reservation`
- `shipping`
- `recipe`
- `import`

Reservas y envíos exigen `operation_key`. La pareja
`business_id + operation_key` es única y permite reintentos idempotentes.

El RPC bloquea el producto durante el cálculo del saldo y rechaza operaciones
que dejarían stock negativo.

Cada movimiento conserva snapshots de nombre, unidad y costo del insumo para
que el historial no cambie si luego se edita el producto.

### `archive_business_stock_product`

Requiere `stock >= full`.

La baja es lógica. No se permite eliminar un insumo con saldo distinto de
cero. Los movimientos históricos se conservan.

## Rollback

El rollback quita RPC, políticas y acceso, pero conserva tablas y datos en
default deny. No destruye el ledger.

## Deuda explícita de E29A

La interfaz actual todavía usa su fallback local. E29B conectará la única UI
V2 existente a este backend y retirará `localStorage` como fuente canónica del
Stock en modo Supabase.
