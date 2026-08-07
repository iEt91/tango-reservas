# Plano V2 — administración persistente de mesas

## Alcance de la Entrega 22

E22 habilita la administración básica de las mesas físicas desde
`/local/plano` cuando el origen de datos es Supabase:

- preparar y guardar una mesa nueva;
- editar nombre, capacidad, forma y estado físico;
- bloquear, reactivar o marcar una mesa fuera de servicio;
- eliminar lógicamente una mesa;
- actualizar la pantalla solamente después de una respuesta exitosa;
- conservar todos los cambios después de recargar.

La implementación reutiliza las Server Actions y RPC seguras incorporadas
en E19:

- `saveBusinessFloorTableAction`;
- `setBusinessFloorTableActiveAction`;
- `save_business_floor_table`;
- `set_business_floor_table_active`.

## Autorización

La administración física queda limitada a:

- `owner`;
- `admin`.

`staff` mantiene el permiso de asignar y liberar reservas incorporado en
E21, pero no puede crear, editar, bloquear ni eliminar mesas.

La UI deriva los permisos desde la membresía resuelta en servidor. Esa
restricción visual no sustituye las validaciones de la Server Action y
PostgreSQL.

## Alta

Pulsar **Agregar mesa** crea un borrador local dentro del modal. La fila no
se guarda ni aparece en el plano hasta confirmar **Guardar mesa**.

Al guardar:

1. la UI normaliza nombre y capacidad;
2. envía `tableId: null`;
3. PostgreSQL crea el UUID;
4. la UI incorpora la mesa retornada por la Server Action.

Cancelar el modal no crea datos remotos.

## Edición

La edición usa el UUID persistente de la mesa. Se preservan:

- geometría;
- radio de esquinas;
- posibilidad de unión;
- estado físico exacto;
- asignaciones, que continúan vinculadas por UUID.

Si cambia el nombre, la representación cliente de las reservas se actualiza
después del éxito para conservar la visualización hasta la próxima recarga.

Los estados editables en Supabase son:

- disponible;
- bloqueada;
- fuera de servicio.

Los estados reservada y ocupada continúan siendo derivados de las reservas,
no son estados físicos editables.

## Bloqueo y reactivación

Los botones laterales guardan el estado mediante
`saveBusinessFloorTableAction`. Una mesa con una asignación incompatible
puede ser rechazada por las reglas transaccionales del backend.

## Eliminación lógica

En modo Supabase, **Eliminar mesa** pasa a mostrarse como **Eliminar mesa**.
La operación usa `setBusinessFloorTableActiveAction` con `isActive: false`.

No se ejecuta `DELETE`. Una mesa con asignación activa no puede archivarse.
La restauración desde una lista de eliminadas queda fuera de E22.

## Prevención de dobles envíos

Mientras una mutación está pendiente:

- alta, edición, bloqueo y archivo se deshabilitan;
- los manejadores ignoran ejecuciones duplicadas;
- se muestra texto de progreso;
- los errores operativos seguros se presentan en la pantalla;
- el estado cliente solo cambia después de `result.ok`.

## Datos que no se persisten en E22

El esquema actual no contiene notas propias de mesa. En modo Supabase el
modal no presenta el campo de notas para evitar aparentar una persistencia
que no existe.

## Operaciones que siguen bloqueadas

E22 no habilita:

- mover mesas;
- redimensionar mesas;
- guardar el layout completo;
- restaurar el layout;
- unir o separar mesas;
- modificar la imagen de fondo;
- listar o restaurar mesas eliminadas.

## Base de datos

E22 no agrega ni aplica migraciones. Reutiliza la migración `010`, ya
aplicada y validada.

No volver a aplicar la migración `010`.

## Prueba manual requerida

Con los fixtures A/B conservados:

1. Ingresar como A.
2. Crear una mesa `QA E22 A`.
3. Recargar y confirmar que continúa visible.
4. Editar nombre, capacidad y forma.
5. Recargar y confirmar la edición.
6. Bloquearla y reactivarla, recargando entre ambos estados.
7. Eliminarla y confirmar que desaparece después de recargar.
8. Confirmar que `Isolation Table A` y su asignación siguen intactas.
9. Ingresar como B y confirmar que sus datos no cambiaron.
10. Confirmar que movimiento, redimensionado, uniones y fondo siguen
    bloqueados.

No ejecutar `staging:cleanup-isolation`.
