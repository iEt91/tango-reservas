# Plan de migración del backend

## Auditoría de partida

El proyecto ya contiene:

- Esquema Supabase inicial con negocios, perfiles, horarios, reglas, servicios, clientes y reservas.
- Capa parcial `src/lib/data/supabase`.
- Cliente de navegador y cliente de servidor.
- V2 operativa basada principalmente en almacenamiento local.
- Fallback local/mock.
- QA funcional para disponibilidad, stock, tracking, backup y notificaciones.

Brechas principales:

- No existe `business_members`.
- No hay Row Level Security documentado ni aplicado.
- La sesión del cliente no está preparada todavía para autenticación persistente.
- Service role se utiliza como cliente de servidor general y deberá limitarse.
- El esquema no cubre toda la V2.
- No hay transacciones integrales para reserva, pago, stock y caja.
- No hay estrategia de cutover por módulo.

## Arquitectura objetivo

### Navegador

- Cliente Supabase con anon key.
- Sesión autenticada persistente.
- Lecturas y escrituras sujetas a RLS.
- Realtime solo donde aporte valor: cocina, reservas y pedidos.
- Nunca recibe service role.

### Servidor Next.js

- Validación de entradas.
- Operaciones transaccionales mediante funciones RPC o rutas servidoras.
- Service role únicamente para administración explícita, onboarding y tareas internas.
- Resolución del negocio desde la membresía del usuario, no desde un valor confiado del cliente.

### PostgreSQL

- RLS como barrera primaria.
- Funciones transaccionales para operaciones críticas.
- Constraints, índices e idempotencia.
- Auditoría de operaciones sensibles.

## Estrategia de migración

No se hará una reescritura total ni dual-write permanente. Se migrará módulo por módulo.

Cada módulo tendrá cuatro estados:

1. `local`: comportamiento actual.
2. `importing`: importa y valida datos.
3. `supabase`: fuente de verdad remota.
4. `retired`: se elimina el código local operativo.

Una bandera por módulo permite activar el cutover en staging antes de producción.

## Secuencia técnica

### Fase A — Identidad

- Crear `business_members`.
- Backfill desde perfiles con usuario autenticado.
- Crear helpers SQL de membresía y rol.
- Añadir RLS.
- Implementar login, recovery y logout.
- Resolver negocio activo por membresía.

### Fase B — Repositorios

Crear interfaces por dominio:

- `BusinessRepository`
- `CustomerRepository`
- `MenuRepository`
- `StockRepository`
- `ReservationRepository`
- `OrderRepository`
- `PaymentRepository`
- `ReportRepository`

Las páginas consumen repositorios; no acceden directamente a `localStorage` ni a Supabase.

### Fase C — Datos maestros

Migrar configuración, clientes, menú, recetas, stock, plano y web. Añadir importación y comprobación de conteos.

### Fase D — Reservas

Crear RPC transaccional para:

- validar reglas;
- bloquear/validar mesas;
- crear o editar;
- registrar auditoría;
- devolver resultado estable.

La idempotency key evita reservas duplicadas por reintentos.

### Fase E — Operación

Un comando de finalización de venta debe:

- cerrar pedido;
- registrar pago y asignaciones;
- crear movimiento de caja;
- crear movimientos de stock;
- actualizar cocina;
- registrar auditoría;

todo dentro de una transacción.

### Fase F — Reportes y retiro local

- Reportes desde consultas remotas.
- Reconciliación.
- Eliminar escrituras operativas locales.
- Mantener solo preferencias visuales y caché descartable.

## Importación desde backup local

1. Leer el JSON existente.
2. Validar schema y negocio destino.
3. Crear una corrida de importación con ID.
4. Transformar cada clave a entidades remotas.
5. Insertar con `operation_key` única.
6. Comparar conteos, totales y saldos.
7. Marcar corrida como completada.
8. Conservar archivo original para rollback.

No se elimina información local hasta validar la importación.

## Entornos

- Development: datos descartables.
- Staging: réplica funcional para QA y piloto.
- Production: acceso restringido, backups y monitoreo.

Cada entorno usa proyecto Supabase, claves, URLs y buckets separados.

## Estrategia de rollback

- Cada migración SQL es versionada.
- Antes del cutover se crea backup.
- La bandera permite volver temporalmente al adaptador anterior solo si no hubo nuevas escrituras remotas incompatibles.
- Después del cutover definitivo, rollback significa restaurar base y desplegar la release anterior; no mezclar fuentes.

## Primera implementación posterior a esta entrega

1. Crear migración de `business_members`.
2. Crear funciones SQL de acceso.
3. Aplicar RLS primero en una tabla de prueba.
4. Añadir pruebas negativas entre dos negocios.
5. Implementar sesión persistente.
6. Proteger una ruta piloto.
7. Repetir sobre tablas de configuración antes de reservas.
