# Backend persistente de menú — Entrega 26

## Alcance

La Entrega 26 crea el núcleo canónico de menú en PostgreSQL.

Incluye:

- `menu_categories`;
- `menu_items`;
- lectura aislada por `business_id`;
- RLS forzada;
- RPC autenticadas para altas, ediciones, eliminación lógica, orden y cambios rápidos;
- Server Actions que revalidan sesión, negocio y rol;
- contratos TypeScript;
- prueba remota con aislamiento A/B y restauración.

## Categorías y productos

Las categorías conservan nombre, descripción, orden, visibilidad y estado.

Los productos conservan:

- categoría opcional;
- nombre y descripción;
- precio;
- estado `available | paused`;
- visibilidad web;
- destacado;
- URL de imagen;
- orden.

La eliminación es eliminación lógica. No se eliminan físicamente desde la aplicación.

## Integridad

PostgreSQL valida:

- pertenencia de categoría y producto al mismo negocio;
- categorías activas;
- nombres únicos activos por negocio;
- límites de textos, precios y URLs;
- listas de orden y cambios rápidos sin UUID duplicados.

El orden y los cambios rápidos se guardan dentro de una única transacción.

## Seguridad

- `owner` y `admin` pueden ejecutar mutaciones.
- `staff` tiene lectura operativa.
- `anon` no recibe lectura privada ni ejecución.
- El navegador no recibe `INSERT`, `UPDATE` ni `DELETE`.
- Las escrituras pasan por funciones `security definer` con `search_path` vacío.
- El rollback elimina acceso y RPC, pero conserva tablas y datos bajo RLS forzada.

## Estado de la interfaz

La interfaz V2 todavía no cambia su fuente de datos en esta entrega.

`/local/menu` sigue usando el prototipo local hasta la Entrega 27. Esto permite validar primero esquema, permisos y operaciones remotas.

## Promociones y combos

Las promociones y combos del prototipo local no forman parte del núcleo P0 de E26.

En el corte de UI se bloquearán en modo Supabase hasta definir una relación canónica que no produzca datos parciales. Las categorías estándar y los productos sí quedan cubiertos.

## Imágenes

E26 persiste únicamente `image_url`.

La subida binaria central a Supabase Storage queda para una entrega posterior. No se guardan Data URLs ni binarios dentro de PostgreSQL.

## Staging

La prueba remota:

- toma una instantánea del menú de A y B;
- crea categorías y un producto temporal;
- valida cambios rápidos y orden;
- valida BOLA y DML directo bloqueado;
- elimina lógicamente;
- restaura exactamente las instantáneas iniciales.

No ejecuta `staging:cleanup-isolation` y conserva los fixtures A/B.

## Migración

Archivo:

`supabase/migrations/20260806_011_menu_write_rpc.sql`

Debe aplicarse una sola vez y únicamente después del QA local.

No volver a aplicar las migraciones 001–010.
