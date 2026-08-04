# Plano V2 — corte de lectura persistente

## Alcance de la Entrega 20

E20 conecta `/local/plano` con el snapshot persistente del negocio activo
cuando `TANGO_DATA_SOURCE=supabase`.

La entrega realiza un corte de **lectura canónica**. La pantalla conserva
su diseño V2, navegación de fecha/hora, selección de mesas y zoom, pero
deja de hidratar los datos operativos desde `localStorage`.

## Datos cargados en servidor

La página resuelve el negocio activo y carga en paralelo o de forma
acotada:

- horarios persistentes;
- reglas de reserva;
- reservas dentro de la ventana configurada;
- mesas activas;
- configuración del fondo;
- asignaciones de mesas correspondientes a las reservas cargadas.

La sesión, el tenant y la membresía se resuelven antes de consultar datos.
Los estados no autorizados redirigen a login, selección de negocio o
acceso denegado.

## Contrato de presentación

`src/lib/floor-plan/v2-floor-plan-cutover.ts` transforma el modelo
persistente al contrato visual existente:

- UUID y etiqueta de mesa;
- capacidad y geometría;
- forma y bloqueo operativo;
- reservas y duración;
- asignaciones resueltas primero por UUID y luego por etiqueta;
- horarios, duración estándar y ventana de reserva;
- URL y ajustes compatibles del fondo.

`blocked` y `out_of_service` se muestran como mesa bloqueada. Los estados
`reserved` y `occupied` siguen siendo derivados de reservas y
asignaciones, no se escriben como estado físico.

## Protección contra persistencia local

Cuando el origen es Supabase:

- el efecto que lee `localStorage` retorna antes de registrar listeners;
- mesas, reservas, configuración y fondo nacen del snapshot servidor;
- las acciones de edición, borrado, movimiento, unión, asignación y fondo
  quedan deshabilitadas;
- los manejadores también fallan cerrado aunque se invoquen
  programáticamente;
- no existe DML de navegador ni cliente Supabase dentro del componente.

Esto evita que el prototipo local sobrescriba o aparente modificar datos
persistentes.

## Fondo

E20 lee una URL persistente y sus ajustes. No sube archivos ni guarda
data URLs en PostgreSQL. La carga binaria seguirá pendiente hasta usar
Supabase Storage o un proveedor equivalente.

## Base de datos

E20 **No aplica una migración**. Reutiliza la migración `010`
`floor_plan_write_rpc`, ya aplicada y validada en E19.

No volver a aplicar la migración `010`.

## Pruebas

La regresión `test:floor-plan-ui-cutover` verifica:

- resolución fail-closed;
- carga del tenant activo;
- ventana temporal de reservas;
- mapeo por UUID;
- bloqueo de estados físicos;
- corte de `localStorage`;
- ausencia de DML directo;
- integración al QA.

Después del QA automático se requiere una comprobación manual con los
usuarios A y B para confirmar que cada uno observa exclusivamente su
plano, mesa y reserva fixture.

## Deuda deliberada

E20 no conecta escrituras visuales. E21 debe habilitar progresivamente:

- alta y edición de mesas mediante Server Actions;
- movimiento y tamaño con guardado explícito;
- archivo y restauración lógica;
- configuración persistente del fondo mediante URL;
- asignación y liberación de una mesa;
- estados de carga, error e idempotencia en la UI.

La asignación visual de múltiples mesas y la carga binaria del fondo
pueden permanecer en entregas posteriores si requieren un corte separado.
