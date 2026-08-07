# Menú persistente — promociones y combos (E27A)

## Objetivo

E27A amplía el backend persistente de Menú sin crear una segunda interfaz visual. `src/app/local/menu/v2-menu-page.tsx` continúa siendo la única interfaz del Menú V2 y conserva la estética trabajada previamente.

La extensión permite guardar en PostgreSQL:

- categorías normales;
- categorías con descuento porcentual;
- promociones y combos;
- precio fijo de promoción;
- cantidades por producto dentro de una promoción;
- casos como 2x1, 3x2, packs y combinaciones de productos distintos.

## Modelo

`menu_categories` agrega:

- `is_promotion`;
- `fixed_price`;
- `discount_percent`.

La composición de una promoción se guarda en `menu_category_products`:

- `business_id`;
- `category_id`;
- `menu_item_id`;
- `quantity`.

La cantidad permitida es de 1 a 9999 unidades por producto. Esto permite más de dos unidades del mismo producto sin dejar un entero sin límite operativo.

Una categoría normal sigue relacionando sus productos mediante `menu_items.category_id`. La tabla `menu_category_products` se utiliza para la composición explícita de promociones y combos; de este modo un producto puede permanecer en su categoría normal y, al mismo tiempo, participar en una promoción.

## Escritura atómica

La RPC `save_business_menu_category_details` recibe:

- el negocio;
- el ID de categoría o `null` para alta;
- los datos de la categoría;
- la composición de productos con cantidades.

La RPC valida el tenant, rol, UUID, cantidades, duplicados y pertenencia de productos. El guardado de categoría, precio/descuento y composición ocurre dentro de la misma transacción. Una composición inválida no puede dejar un guardado parcial.

## Seguridad

- RLS está habilitada y forzada en `menu_category_products`.
- `owner`, `admin` y `staff` pueden leer la composición de su negocio.
- solo `owner` y `admin` pueden escribir mediante la RPC.
- `anon` no tiene lectura ni ejecución.
- `authenticated` no recibe `INSERT`, `UPDATE` ni `DELETE` directos sobre la composición.
- las FK compuestas por `business_id` impiden relacionar una categoría de un negocio con un producto de otro.
- la UI no instancia Supabase ni ejecuta DML/RPC desde el navegador; usa Server Actions.

## Rollback

El rollback de 012 elimina la nueva RPC y restaura default deny sobre la tabla de composición, pero no elimina columnas, tabla ni datos. Un rollback de código puede volver a E26 sin destruir promociones ya guardadas.

## UI

No se crea `v2-persistent-menu-page.tsx` ni ninguna otra página equivalente. Toda la funcionalidad se integra en `v2-menu-page.tsx`.

El modal original de categorías sigue siendo la fuente visual. Para un 2x1, por ejemplo, puede seleccionarse cantidad `2` del producto y aplicar un 50 % de descuento o definir un precio fijo equivalente a una unidad. Para un 3x2 puede seleccionarse cantidad `3` y definir el descuento/precio correspondiente.

La subida binaria de imágenes a Supabase Storage continúa fuera de esta entrega; el contrato actual sigue persistiendo únicamente la URL de imagen.

## QA

E27A incluye:

- regresión estática `test:menu-promotions`;
- prueba remota `staging:test-menu-promotions`;
- postflight SQL específico;
- integración con `test:regression`;
- verificación SHA-256 de migración y rollback.

La prueba remota restaura los menús A/B al finalizar y no ejecuta `staging:cleanup-isolation`.
