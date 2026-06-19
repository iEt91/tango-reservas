# Plan de migracion a Supabase / Postgres

La app sigue funcionando en modo local/mock.
Este plan explica como migrar paso a paso sin romper el producto actual.

## Fase 1 - Preparacion

- mantener local/mock como fuente real
- crear proyecto en Supabase
- ejecutar `docs/database/supabase-schema.sql`
- configurar variables de entorno
- validar que el esquema refleja el modelo actual
- confirmar relaciones 1 a 1 para `business_web_content` y `floor_plan_settings`
- confirmar que `reservations.customer_id` es opcional

## Fase 2 - Lectura inicial

- conectar solo lectura para `businesses`
- comparar datos reales vs mock
- validar slugs, estados y plantillas publicas
- no cambiar la UI

## Fase 3 - Datos operativos principales

- conectar `reservations`
- conectar `services`
- conectar `menu_categories`
- conectar `menu_items`
- conectar `business_web_content`
- validar que las reservas historicas no se rompen si se elimina un servicio
- validar que `service_id` queda en `null` cuando un servicio se borra

Objetivo:

- la UI usa un repositorio real
- el modo mock sigue siendo fallback controlado durante el cambio

## Fase 4 - Plano, CRM y reportes

- conectar `floor_tables`
- conectar `table_combinations`
- conectar `floor_plan_settings`
- conectar `customers`
- conectar `customer_notes`
- conectar reportes agregados

## Fase 5 - Seguridad

- agregar RLS
- definir roles
- separar permisos de admin y local
- bloquear lecturas/escrituras no autorizadas

## Reglas de migracion

- no reescribir componentes visuales
- migrar primero repositorios de datos
- mantener contratos de tipos estables
- preservar compatibilidad con local/mock mientras dure la transicion

## Estrategia tecnica

- el repositorio local/mock actual sera reemplazado por una implementacion Supabase
- la UI ya deberia consumir la capa unificada de `src/lib/data/`
- el cambio de backend no deberia tocar pantallas ni rutas

## Como correr el seed demo

1. Ejecutar primero `docs/database/supabase-schema.sql`.
2. Ejecutar despues `docs/database/seed-demo.sql`.
3. Abrir Supabase y revisar el Table Editor.
4. Verificar especialmente `businesses`, `services`, `reservations`, `menu_items` y `floor_tables`.
5. Confirmar que el seed se puede volver a correr sin duplicar datos.
6. La app sigue sin conectarse a Supabase por ahora.

## Primer test de conexion Supabase

1. Crear un archivo `.env.local`.
2. Poner `NEXT_PUBLIC_DATA_SOURCE=local`.
3. Ejecutar `npm run dev`.
4. Abrir `/admin/supabase-check`.
5. Confirmar si Supabase responde y cuantas filas devuelve.
6. Recién despues cambiar los repositorios de forma gradual.
7. No activar Supabase como fuente principal todavia.
8. Si la consulta devuelve 0, revisar RLS, API key, proyecto o permisos de lectura sobre `public.businesses`.

## Fase Admin read-only

- con `NEXT_PUBLIC_DATA_SOURCE=local`, `/admin` sigue usando la fuente local/mock de siempre
- con `NEXT_PUBLIC_DATA_SOURCE=supabase`, `/admin` lista `businesses` desde `public.businesses`
- la escritura en Admin todavia no esta implementada en Supabase
- si queres volver a local/mock, cambias la variable de entorno y reinicias `npm run dev`
- la web publica, reservas, menu, plano, CRM y reportes siguen usando local/mock por ahora

## Admin Panel en Supabase read-only

- activas la lectura con `NEXT_PUBLIC_DATA_SOURCE=supabase`
- `/admin` muestra `public.businesses` desde Supabase y mantiene el badge de fuente de datos visible
- las acciones de crear, editar, duplicar, desactivar y eliminar quedan deshabilitadas o con aviso
- las métricas que todavía dependen de reservas o configuracion local/mock se ocultan o se marcan como no disponibles
- la escritura real en Supabase se implementara mas adelante con los stubs ya preparados en `src/lib/data/supabase/businesses.ts`

## Admin businesses write en Supabase

- con `NEXT_PUBLIC_DATA_SOURCE=supabase`, `/admin` ya puede crear, editar, duplicar, activar/desactivar y eliminar `businesses`
- esas acciones escriben solo en `public.businesses`
- reservas, menu, web publica, plano, CRM y reportes siguen en local/mock por ahora
- si Supabase devuelve error de permisos, hay que revisar RLS o policies de escritura para `public.businesses`
- para volver a local/mock, cambia la variable de entorno y reinicia `npm run dev`

## Defaults relacionados al crear negocios

- al crear un negocio en Supabase se crean tambien `business_web_content`, `floor_plan_settings` y un servicio base
- al duplicar un negocio en Supabase se copian `business_web_content`, `floor_plan_settings` y `services`
- las reservas, clientes, menu, galeria, plano detallado y reportes siguen sin duplicarse todavia
- si falla una tabla relacionada, la UI muestra un error claro y se elimina el negocio nuevo para evitar dejar basura parcial

## Policies DEV para defaults relacionados

- durante desarrollo se permite escribir con la anon key en `businesses`, `business_web_content`, `floor_plan_settings` y `services`
- esto permite probar la creación de negocios completos sin usar `SUPABASE_SERVICE_ROLE_KEY` en frontend
- mas adelante se reemplazara por auth real, roles y RLS segura por usuario o rol administrativo

## Servicios y configuracion basica en Supabase

- `/local/configuracion` ya puede leer y editar los datos basicos del negocio desde Supabase
- `/local/configuracion` ya puede administrar `services` desde Supabase
- reservas todavia no usan Supabase
- menu, web publica, plano, CRM y reportes siguen en local/mock por ahora

## Reservas automáticas

- la tabla `businesses` incluye `auto_confirm_reservations boolean not null default true`
- si el campo todavia no existe en una base ya creada, ejecutar el `ALTER TABLE` de abajo
- `/local/configuracion` permite activar o desactivar la confirmacion automatica por negocio
- si esta activo, la web publica confirma la reserva automaticamente cuando encuentra mesa disponible
- si no encuentra mesa, la reserva entra pendiente y sigue sin mesa
- si esta desactivado, la web publica siempre crea reservas pendientes sin asignar mesa
- si el campo no existe todavia en una base existente, ejecutar este SQL:

```sql
alter table if exists public.businesses
  add column if not exists auto_confirm_reservations boolean not null default true;
```

## CRM en Supabase

- `/local/crm` ya puede leer clientes desde `public.customers`
- `/local/crm` ya puede leer y crear notas de cliente en `public.customer_notes`
- el historial de reservas del cliente se arma leyendo `public.reservations`
- el cliente unificado sigue saliendo de `business_id + phone` como clave principal
- para desarrollo hacen falta policies DEV de lectura y escritura en `customers` y `customer_notes`, y lectura en `reservations`
- si falta una policy, la pantalla muestra un error claro con tabla, code y mensaje

## Reportes en Supabase

- `/local/reportes` ya calcula metricas desde `public.reservations`, `public.services` y `public.customers`
- no existe una tabla propia de reportes: todo se calcula en runtime a partir de esas tablas
- las listas, graficos y alertas operativas usan el snapshot real del negocio seleccionado
- `plano` y asignacion avanzada de mesas todavia no estan migrados, asi que algunas metricas de mesa quedan como pendientes
- para desarrollo hacen falta policies DEV de lectura en `reservations`, `services` y `customers`
- si falta una policy, el panel debe mostrar un error claro con tabla, code y mensaje

## Plano en Supabase

- `/local/plano` ya lee y actualiza `floor_tables`, `floor_plan_settings` y `table_combinations` desde Supabase
- el plano mantiene drag, resize, rotacion, estados y fondo del negocio seleccionado
- las imagenes de fondo todavia no usan Supabase Storage: por ahora siguen como URL o datos temporales
- la asignacion avanzada real de reservas a mesas sigue pendiente para una fase posterior
- para desarrollo hacen falta policies DEV de lectura/escritura en `floor_tables`, `floor_plan_settings` y `table_combinations`
- si falta una policy, el panel debe mostrar un error claro con tabla, code y mensaje

## Editor web en Supabase

- `/local/web` ya puede guardar `business_web_content` en Supabase
- `/local/web` ya puede administrar `gallery_images` en Supabase
- el selector de plantilla publica puede actualizar `public_template_id` en `businesses`
- la web publica `/[slug]` sigue leyendo local/mock por ahora
- Supabase Storage para imagenes queda pendiente para una fase posterior
- para esta fase hacen falta policies DEV de lectura/escritura en `business_web_content`, `gallery_images` y `businesses` si se cambia la plantilla desde el editor web

## Web publica en Supabase read-only

- `/[slug]` puede leer `businesses`, `business_web_content`, `gallery_images` y `services` desde Supabase en modo solo lectura
- `menu` y `reservas` todavia no se migran a Supabase en esta fase
- si `NEXT_PUBLIC_DATA_SOURCE=supabase`, las reservas no deben escribir en local/mock por error
- el siguiente paso sera migrar reservas o menu, segun la prioridad de producto
- para esta fase hacen falta policies DEV de lectura para `public.businesses`, `public.business_web_content`, `public.gallery_images` y `public.services`

## Pendiente: horarios comerciales en Supabase

- por ahora no existe una tabla `business_hours` migrada en Supabase
- para que el widget de reservas siga siendo usable, en modo Supabase se usa un fallback demo de horarios y reglas
- ese fallback permite probar fechas y horarios sin bloquear reservas por una configuracion vacia
- mas adelante se debera crear una tabla `business_hours` o una estructura equivalente para guardar horarios persistentes por negocio
- cuando exista esa tabla, el fallback demo debera desaparecer y la disponibilidad debera leerse desde Supabase
