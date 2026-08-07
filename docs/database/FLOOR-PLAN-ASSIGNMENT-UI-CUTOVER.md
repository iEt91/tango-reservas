# Plano V2 — asignaciones persistentes

## Alcance de la Entrega 21

E21 habilita la primera escritura visual del plano conectado a Supabase:

- asignar una reserva activa y sin mesa a una mesa persistente;
- liberar la asignación de una reserva;
- reflejar el resultado inmediatamente en la pantalla;
- conservar el resultado después de recargar.

La operación usa `setBusinessReservationTablesAction`, que revalida sesión,
negocio activo y rol antes de invocar la RPC transaccional
`set_business_reservation_tables`.

## Autorización

Pueden asignar o liberar mesas:

- `owner`;
- `admin`;
- `staff`.

La autorización visual es únicamente una ayuda de interfaz. La Server Action y
PostgreSQL vuelven a validar identidad, tenant, rol, reserva, mesas, capacidad,
disponibilidad y solapamientos.

Un usuario sin permiso ve los controles deshabilitados y los manejadores
fallan cerrado aunque sean invocados programáticamente.

## Flujo de asignación

1. La pantalla parte del snapshot persistente de E20.
2. El usuario selecciona una mesa disponible.
3. Abre el diálogo de reservas sin mesa.
4. La UI valida capacidad básica para una respuesta inmediata.
5. La Server Action envía el UUID de la reserva y el UUID de la mesa.
6. PostgreSQL decide de forma canónica si la operación es válida.
7. La UI actualiza el snapshot local solamente después de una respuesta
   exitosa.
8. La ruta queda revalidada por la Server Action.

La validación cliente no sustituye la validación transaccional del servidor.

## Flujo de liberación

La liberación utiliza la misma Server Action con `tableIds: []`. La reserva no
se elimina ni cambia de estado: únicamente queda sin mesa asignada.

## Prevención de dobles envíos

Mientras una asignación o liberación está pendiente:

- los botones de asignación quedan deshabilitados;
- el botón de liberación queda deshabilitado;
- los manejadores ignoran ejecuciones duplicadas;
- la UI muestra un estado de progreso;
- los errores operativos seguros se presentan sin filtrar detalles internos.

## Compatibilidad local

Cuando el origen de datos no es Supabase, el comportamiento de prototipo
continúa usando el flujo local existente. E21 no elimina el fallback local.

## Operaciones que siguen bloqueadas

E21 no habilita todavía:

- crear, editar o eliminar mesas;
- mover o redimensionar mesas;
- bloquear o reactivar mesas;
- guardar el layout;
- restaurar el layout;
- unir o separar mesas visualmente;
- modificar la imagen de fondo.

Estas operaciones siguen deshabilitadas en modo Supabase.

## Base de datos

E21 no agrega ni aplica migraciones. Reutiliza la migración `010` y las RPC
validadas en E19.

No volver a aplicar la migración `010`.

## Prueba manual requerida

Con los fixtures A/B conservados:

1. Ingresar como A y abrir la reserva A en su fecha y horario.
2. Liberar `Isolation Table A`.
3. Recargar y confirmar que la reserva aparece sin mesa.
4. Reasignarla a `Isolation Table A`.
5. Recargar y confirmar que vuelve a figurar asignada.
6. Ingresar como B y confirmar que su mesa y asignación no cambiaron.
7. Repetir liberar y reasignar B si se desea comprobar ambos flujos.
8. Confirmar que crear, editar, mover, borrar y fondo siguen bloqueados.

No ejecutar `staging:cleanup-isolation`.
