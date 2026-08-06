# Reservas V2 — corte persistente del núcleo

## Alcance de la Entrega 25

E25 conecta `/local/reservas` con las reservas persistentes del negocio
activo.

Incluye:

- lectura por tenant desde PostgreSQL;
- alta mediante `save_business_reservation`;
- edición de los datos centrales;
- transición de estado mediante
  `set_business_reservation_status`;
- adopción de la fila canónica devuelta por PostgreSQL;
- lectura de asignaciones de mesas existentes;
- servicios y clientes persistentes como contexto del editor;
- fallback local cuando la fuente de datos no es Supabase.

## Datos persistentes

El corte cubre:

- servicio;
- cliente vinculado cuando existe coincidencia;
- nombre, teléfono y correo;
- fecha y hora;
- cantidad de personas;
- duración;
- estado;
- origen;
- notas;
- código público;
- hitos de confirmación, cancelación, no-show y finalización.

## Mesas

La columna Mesa se hidrata desde
`reservation_table_assignments`.

En modo Supabase, la mesa es de solo lectura dentro del editor de reservas.
Las asignaciones continúan administrándose desde `/local/plano`, donde la
operación es transaccional y valida capacidad, solapamientos y
combinaciones.

E25 no duplica la escritura de asignaciones dentro de `/local/reservas`.

## Servicios

Una reserva nueva requiere un servicio persistente activo.

El editor muestra los servicios del tenant y usa su duración como valor
inicial cuando se selecciona uno.

Si no existe ningún servicio activo, el alta falla cerrado y remite a
Configuración.

## Clientes

E25 no crea clientes desde la pantalla de reservas.

Al guardar, intenta vincular un cliente persistente por teléfono o correo.
Si no existe coincidencia, la reserva conserva los datos escritos y
`customer_id` queda vacío. El backend mantiene los datos de contacto en la
propia reserva.

## Idempotencia

Cada apertura del modal de alta genera una clave estable para ese intento.

- Un reintento después de un error reutiliza la misma clave.
- Una nueva apertura genera una clave diferente.
- La edición no necesita clave de creación.

## Estados

Confirmar, cancelar y marcar no-show utilizan la Server Action
autenticada y la RPC existente.

La UI solo actualiza el estado después de recibir una fila canónica.

## Consumo, caja, pagos y cocina

Estos dominios todavía dependen del prototipo local.

En modo Supabase:

- no se escriben consumos dentro de la reserva persistente;
- no se simulan pagos persistentes;
- no se descuenta stock desde una reserva persistente;
- las acciones muestran un mensaje seguro indicando que el corte está
  pendiente.

Esto evita presentar datos locales como si fueran canónicos.

## Seguridad

- `/local/reservas` vuelve a resolver sesión, negocio y membresía.
- `owner`, `admin` y `staff` pueden administrar reservas.
- RLS sigue aislando las lecturas.
- Las escrituras pasan por Server Actions y RPC.
- El navegador no crea un cliente Supabase ni realiza DML directo.
- Las respuestas internas de PostgreSQL no se exponen.

## Base de datos

E25 no agrega ni aplica migraciones.

No volver a aplicar las migraciones existentes.

## Ventana inicial

La página carga:

- los últimos 31 días;
- el período futuro permitido por `bookingWindowDays`.

El historial completo continúa en `/local/historial`.

## Prueba manual requerida

Conservar fixtures A/B:

1. Entrar con A y abrir `/local/reservas`.
2. Confirmar que aparece `Isolation Customer A` el lunes 10/08/2026 a las
   14:00.
3. Confirmar que la mesa visible es `Isolation Table A`.
4. Crear una reserva temporal `QA E25 A` con el servicio persistente.
5. Recargar y confirmar que sigue visible.
6. Editar teléfono, nota o cantidad de personas.
7. Recargar y confirmar la edición.
8. Confirmar la reserva mediante una acción de estado.
9. Recargar y confirmar el estado.
10. Cancelar la reserva temporal y confirmar persistencia.
11. Verificar que Consumo no modifica datos persistentes y muestra el
    aviso de alcance.
12. Entrar con B y confirmar que no ve `QA E25 A`.
13. Confirmar que `Isolation Customer B` permanece intacto.
14. Volver a A y dejar la reserva temporal cancelada.

No ejecutar `staging:cleanup-isolation`.


## Código público canónico

El generador heredado de la interfaz local produce códigos breves que no
pertenecen al contrato persistente.

En modo Supabase:

- un alta envía el código público vacío a la capa de validación;
- el payload RPC no incluye ese campo;
- PostgreSQL genera `RES-` seguido por 12 caracteres alfanuméricos;
- la UI adopta el código canónico incluido en la fila devuelta;
- una edición conserva el código canónico existente.

No se genera ni se confía en un código público corto desde el navegador.
