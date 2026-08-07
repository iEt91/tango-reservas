# Plano persistente y asignación transaccional de mesas

## Alcance de la Entrega 19

Esta entrega crea el contrato persistente del plano y de las asignaciones
de mesas. No conecta todavía `/local/plano` con Supabase: la pantalla V2
sigue siendo un componente cliente grande basado en `localStorage` y
datos mock. El corte visual se realizará después de estabilizar este
backend y probarlo con los tenants A/B.

Tampoco conecta todavía `/local/reservas` con estas acciones. E19 deja
las Server Actions y la lectura de servidor preparadas para el próximo
corte progresivo.

## Tablas

### `public.floor_plan_settings`

Guarda una fila por negocio:

- URL opcional de la imagen de fondo;
- modo `contain`, `cover` o `stretch`;
- posición y dimensiones;
- opacidad, brillo y contraste;
- timestamps de creación y actualización.

La carga binaria de imágenes no forma parte de E19. Una futura etapa
debe usar Supabase Storage o un proveedor equivalente; no se persisten
data URLs extensas en PostgreSQL.

### `public.floor_tables`

Guarda las mesas físicas del negocio:

- etiqueta única entre mesas activas;
- capacidad;
- posición, tamaño y rotación;
- forma;
- radio de esquinas;
- estado operativo;
- posibilidad de unión;
- eliminación lógica.

Los estados persistidos son `available`, `blocked` y
`out_of_service`. Los estados visuales `reserved` y `occupied` deben
derivarse de reservas, asignaciones y futura información de servicio;
no se escriben manualmente como estado físico de la mesa.

No existe eliminación física desde la aplicación. Eliminar una mesa
con una reserva activa asignada es rechazado.

### `public.reservation_table_assignments`

Relaciona una reserva con una o más mesas. Las claves foráneas compuestas
incluyen `business_id`, por lo que una reserva y una mesa de tenants
distintos no pueden relacionarse ni siquiera mediante escritura
privilegiada accidental.

Se conserva:

- negocio;
- reserva;
- mesa;
- fecha de asignación;
- usuario que asignó.

## RPC

### Ajustes del plano

```text
public.save_business_floor_plan_settings(uuid, jsonb)
```

Solo `owner` y `admin`.

### Alta y edición de mesas

```text
public.save_business_floor_table(uuid, uuid, jsonb)
```

- UUID de mesa nulo: alta;
- UUID presente: edición;
- solo `owner` y `admin`;
- valida campos desconocidos, rangos y etiqueta duplicada.

### Archivo y restauración

```text
public.set_business_floor_table_active(uuid, uuid, boolean)
```

Solo `owner` y `admin`. El archivo es lógico y conserva el historial.

### Asignación de mesas

```text
public.set_business_reservation_tables(uuid, uuid, uuid[])
```

Admite `owner`, `admin` y `staff`.

- array vacío: libera todas las mesas de una reserva activa;
- elimina duplicados;
- máximo de veinte mesas;
- repetir el mismo conjunto es idempotente;
- reemplaza el conjunto completo dentro de una transacción;
- una asignación de reserva terminal es inmutable para conservar historial.

## Disponibilidad

La asignación toma un `pg_advisory_xact_lock` por negocio y fecha y
valida:

- reserva activa del tenant;
- mesas activas y disponibles del tenant;
- combinaciones habilitadas en las reglas cuando se usa más de una mesa;
- todas las mesas marcadas como combinables cuando se usa más de una;
- suma de asientos suficiente;
- duración efectiva de cada reserva;
- solapamientos;
- turnos que cruzan medianoche.

Tres triggers vuelven a ejecutar el mismo contrato cuando:

- una reserva cambia de fecha, hora, duración, cantidad de personas o
  estado;
- una mesa cambia de capacidad, estado, posibilidad de unión o condición
  activa;
- las reglas intentan desactivar combinaciones mientras existen
  asignaciones activas con varias mesas.

Por lo tanto, una edición posterior no puede dejar una asignación
inválida silenciosamente.

## Seguridad

Las tres tablas usan RLS habilitada y forzada. Los miembros activos
reciben únicamente `SELECT` sobre su propio negocio.

Las escrituras directas `INSERT`, `UPDATE` y `DELETE` se mantienen
revocadas. Las RPC son `SECURITY DEFINER`, tienen `search_path` vacío y
revalidan membresía y `business_id`.

`anon` no recibe lectura ni ejecución.

## Rollback

El rollback elimina RPC, triggers y políticas de lectura, pero conserva
tablas y filas bajo default deny con RLS forzada. Esto evita perder un
plano ya cargado durante una reversión de emergencia.

## Límites deliberados

E19 no implementa:

- combinaciones persistentes guardadas como una entidad reutilizable;
- zonas o salones;
- estado `occupied` derivado de comanda o check-in;
- carga de imágenes a Storage;
- consumo, cocina, stock, caja o pagos;
- corte visual de `/local/plano`;
- corte visual completo de `/local/reservas`.

La asignación de varias mesas a una reserva ya funciona mediante varias
filas en `reservation_table_assignments`. Las combinaciones persistentes
con nombre propio quedan como deuda posterior, no como requisito para
la integridad de disponibilidad.

## Staging

Después de aplicar la migración `010` una sola vez, ejecutar:

```text
npm run staging:seed-isolation
npm run staging:test-floor-plan-write
npm run staging:test-isolation
```

El seed base se extiende de forma idempotente con ajustes, una mesa y
una asignación para cada tenant.

La prueba remota verifica lectura propia, BOLA, permisos, capacidad,
bloqueo, solapamiento, eliminación lógica, restauración y DML directo.

No ejecutar `staging:cleanup-isolation`.
