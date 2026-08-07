# Plano V2 — geometría persistente

## Alcance de la Entrega 23

E23 habilita la persistencia de geometría desde `/local/plano` cuando el
origen de datos es Supabase:

- desbloquear y volver a bloquear el movimiento;
- mover una mesa;
- redimensionar una mesa;
- guardar automáticamente al soltar el puntero;
- conservar posición y tamaño después de recargar;
- revertir la interfaz si PostgreSQL rechaza la operación.

La implementación reutiliza:

- `saveBusinessFloorTableAction`;
- `save_business_floor_table`;
- el contrato canónico de mesa incorporado en E19;
- el permiso de administración física incorporado en E22.

## Autorización

Solo `owner` y `admin` pueden desbloquear, mover o redimensionar mesas.

`staff` mantiene asignación y liberación de reservas, pero el control
**Mover mesas** permanece deshabilitado.

La UI falla cerrado, pero la autorización definitiva continúa en la Server
Action y en PostgreSQL.

## Guardado automático

E23 no habilita el botón global **Guardar cambios** en Supabase.

La geometría se guarda una sola vez cuando termina la interacción:

1. al iniciar se conserva una copia de la mesa persistente;
2. durante el movimiento solo cambia el estado visual;
3. al soltar se compara la geometría inicial con la final;
4. si no cambió, no se invoca la Server Action;
5. si cambió, se guarda el contrato completo de la mesa por UUID;
6. la UI adopta la fila devuelta por PostgreSQL;
7. si falla, se restaura la geometría anterior.

Esto evita enviar una RPC por cada evento `mousemove` y evita guardar
cambios parciales de varias mesas.

## Geometría incluida

Se comparan y guardan:

- `x`;
- `y`;
- `width`;
- `height`;
- `rotation`.

E23 no incorpora todavía un control visual para rotación, pero preserva su
valor dentro del contrato.

## Concurrencia y errores

Mientras se guarda una geometría:

- se bloquea una nueva interacción física;
- el botón de desbloqueo queda deshabilitado;
- se usa el estado `isTableMutating`;
- se muestra un mensaje de éxito;
- se muestra un error seguro y se revierte el cambio si falla.

Las asignaciones continúan vinculadas por UUID y no se alteran al mover o
redimensionar una mesa.

## Compatibilidad local

El modo local conserva el comportamiento anterior:

- mover y redimensionar generan cambios sin guardar;
- el botón global **Guardar cambios** persiste en `localStorage`;
- no se invoca ninguna Server Action.

## Operaciones que siguen bloqueadas

E23 no habilita:

- guardar todas las mesas en una operación global;
- restaurar el layout persistente;
- unir o separar mesas;
- modificar la imagen de fondo;
- restaurar mesas eliminadas.

## Base de datos

E23 no agrega ni aplica migraciones. Reutiliza la migración `010`, ya
aplicada y validada.

No volver a aplicar la migración `010`.

## Prueba manual requerida

Conservar los fixtures A/B:

1. Ingresar como A.
2. Crear una mesa temporal `QA E23 A`.
3. Pulsar **Mover mesas**.
4. Mover la mesa y esperar el mensaje de guardado.
5. Recargar y confirmar la nueva posición.
6. Redimensionarla y esperar el mensaje de guardado.
7. Recargar y confirmar el nuevo tamaño.
8. Pulsar **Bloquear mesas**.
9. Confirmar que `Isolation Table A` y su asignación siguen intactas.
10. Ingresar como B y confirmar que `Isolation Table B`, capacidad 6 e
    `Isolation Customer B` no cambiaron.
11. Volver a A y eliminar `QA E23 A`.
12. Confirmar que uniones, restauración e imagen de fondo siguen
    bloqueadas.

No ejecutar `staging:cleanup-isolation`.

## Estabilidad visual de las notificaciones

Los mensajes de éxito y error de las operaciones geométricas se muestran
como una notificación flotante fuera del flujo del documento.

La notificación:

- no agrega altura entre el encabezado y las métricas;
- no comprime el canvas;
- no modifica la posición de los bordes del plano;
- conserva `role="status"` para éxitos;
- conserva `role="alert"` para errores;
- no intercepta clics ni movimientos del puntero.

Mover, redimensionar o recibir una respuesta del servidor no debe cambiar
el tamaño del contenedor del plano.
