# Esquema de Base de Datos

Este documento describe la estructura preparada para la futura migracion a Supabase/Postgres.
La app sigue funcionando hoy con local/mock, pero estas tablas dejan listo el contrato de datos.

## Objetivo general

La idea es separar claramente:

- datos del negocio
- contenido publico de la web
- servicios
- reservas
- plano / mesas
- menu
- galeria publica
- CRM / clientes
- reportes

Cada registro pertenece a un `business_id`, asi se evita mezclar informacion entre locales.

## Tablas

### `businesses`

Guarda el negocio principal y su configuracion base.

Uso:

- Admin Panel
- selector de negocio en el Panel del Local
- rutas publicas `/[slug]`
- configuracion general del negocio

Campos importantes:

- `slug`: identificador publico estable
- `status`: `active`, `draft`, `inactive`
- `auto_confirm_reservations`: define si la web publica confirma reservas automaticamente cuando encuentra mesa
- `public_template_id`: plantilla visual publica elegida

### `business_web_content`

Guarda el contenido editable de la web publica.

Uso:

- `/local/web`
- render publico `/[slug]`

Contiene:

- hero
- about
- textos publicos
- toggles de visibilidad
- links sociales y contacto

Relacion:

- es 1 a 1 con `businesses`
- cada negocio tiene una sola configuracion publica

### `services`

Guarda los servicios o experiencias que se pueden reservar.

Uso:

- `/local/configuracion`
- widget publico de reservas
- calendario
- reportes

### `reservations`

Guarda las reservas del negocio.

Uso:

- `/local/reservas`
- `/local/calendario`
- `/local/plano`
- `/local/crm`
- `/local/reportes`
- widget publico

Contiene:

- cliente
- servicio
- cliente vinculado opcionalmente con `customer_id`
- fecha / horario
- estado
- origen
- mesa asignada
- datos de deposito futuros

Notas:

- `customer_id` es opcional
- si se elimina un servicio, `service_id` queda en `null`
- las reservas historicas no se borran cuando cambia el catalogo de servicios

### `floor_tables`

Guarda las mesas del plano.

Uso:

- `/local/plano`
- disponibilidad
- asignacion de reservas
- reportes operativos

### `table_combinations`

Guarda combinaciones temporales o definidas de mesas.

Uso:

- plano
- reservas con mesas unidas
- disponibilidad publica

### `floor_plan_settings`

Guarda la configuracion visual del plano.

Uso:

- fondo
- posicion
- opacidad
- brillo
- contraste

Relacion:

- es 1 a 1 con `businesses`
- cada negocio tiene una sola configuracion de plano

### `menu_categories`

Guarda las categorias dinamicas del menu.

Uso:

- `/local/menu`
- web publica
- seccion de menu completo

### `menu_items`

Guarda los items del menu.

Uso:

- `/local/menu`
- `/[slug]`
- seleccion destacada
- menu completo

### `gallery_images`

Guarda imagenes de la galeria publica.

Uso:

- `/local/web`
- `/[slug]`

### `customers`

Guarda el cliente consolidado del CRM.

Uso:

- `/local/crm`
- reportes
- historial operativo

### `customer_notes`

Guarda notas internas por cliente.

Uso:

- CRM
- fichas del cliente

## Relaciones

- `business_web_content.business_id -> businesses.id`
- `services.business_id -> businesses.id`
- `reservations.business_id -> businesses.id`
- `reservations.service_id -> services.id` (si se borra el servicio, queda `null`)
- `reservations.customer_id -> customers.id` (opcional)
- `floor_tables.business_id -> businesses.id`
- `table_combinations.business_id -> businesses.id`
- `floor_plan_settings.business_id -> businesses.id`
- `menu_categories.business_id -> businesses.id`
- `menu_items.business_id -> businesses.id`
- `menu_items.category_id -> menu_categories.id`
- `gallery_images.business_id -> businesses.id`
- `customers.business_id -> businesses.id`
- `customer_notes.customer_id -> customers.id`

## Que alimenta cada area

### Panel del Local

- reservas
- calendario
- plano
- CRM
- configuracion
- menu
- web
- reportes

### Admin Panel

- negocios
- estado general
- accesos rapidos
- metricas resumen

### Web publica

- identidad publica
- hero
- menu
- seleccion destacada
- galeria
- ubicacion
- reservas

### Reportes

- reservas
- servicios
- clientes
- mesas
- ocupacion
- ingresos estimados

## Nota de migracion

La app actual sigue usando local/mock.
Cuando se migre a Supabase, esta estructura sirve como contrato estable para reemplazar los repositorios locales sin cambiar la UI.
