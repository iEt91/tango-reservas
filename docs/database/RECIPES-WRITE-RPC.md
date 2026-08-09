# Recetas persistentes — backend E30A

## Objetivo

E30A crea la fuente de verdad persistente para las recetas del menú.

Este corte es **backend únicamente**. La interfaz visual existente en
`/local/menu/recetas` todavía conserva su implementación local hasta E30B.
No se crea una segunda página de Recetas.

## Modelo

`public.menu_recipes` guarda una receta canónica por plato del menú:

- `business_id`;
- `menu_item_id`;
- nombre interno;
- tiempo estimado de preparación;
- revisión incremental;
- timestamps.

`public.menu_recipe_ingredients` guarda la composición:

- receta;
- insumo de `stock_products`;
- cantidad;
- unidad de receta;
- orden.

Los tres vínculos críticos usan claves compuestas con `business_id`:

- receta → plato del menú;
- ingrediente → receta;
- ingrediente → insumo.

Esto impide relaciones cross-tenant incluso si alguien conoce un UUID ajeno.

## Unidades

Las recetas usan las mismas unidades canónicas que Stock.

Se admiten conversiones explícitas:

- `g ↔ kg`;
- `ml ↔ l`.

Las demás unidades solo son compatibles si coinciden exactamente.

`private.recipe_quantity_in_stock_unit(...)` centraliza esta regla para que el
futuro descuento automático de Stock utilice la misma semántica que el guardado
de la receta.

## Integridad con Stock

Un insumo activo utilizado por una receta de un plato no eliminado:

- no puede desactivarse ni eliminarse lógicamente;
- no puede cambiar a una unidad incompatible con la receta.

La protección está en PostgreSQL mediante el trigger
`stock_products_validate_recipe_references`, no solo en la interfaz.

## Escritura

`public.save_business_menu_recipe(...)`:

1. exige autenticación;
2. exige `recipes >= manage`;
3. valida que el plato pertenezca al negocio;
4. valida cada insumo contra el mismo `business_id`;
5. rechaza ingredientes duplicados;
6. valida cantidad y compatibilidad de unidad;
7. guarda receta e ingredientes en una sola transacción;
8. reemplaza la composición anterior atómicamente;
9. incrementa `revision`.

Guardar una lista vacía de ingredientes conserva la receta y limpia su
composición.

## Seguridad

`menu_recipes` y `menu_recipe_ingredients` tienen RLS habilitada y forzada.

El navegador autenticado recibe únicamente `SELECT` y solo cuando tiene
`recipes >= view`.

No existe `INSERT`, `UPDATE` ni `DELETE` directo para `authenticated`.
La mutación se realiza exclusivamente por RPC `SECURITY DEFINER`, que vuelve a
validar permiso y tenant.

Los helpers privados de conversión y protección de Stock no son ejecutables
por `anon` ni `authenticated`.

## Rollback

El rollback elimina RPC, políticas, grants y triggers específicos, pero no
borra tablas ni datos de recetas. Las tablas quedan con RLS forzada y sin
acceso, siguiendo el criterio de rollback no destructivo del proyecto.

## Fuera de E30A

E30A **no**:

- corta la UI de Recetas a Supabase;
- migra recetas antiguas de `localStorage`;
- descuenta Stock automáticamente;
- modifica reservas o envíos;
- crea movimientos en `stock_movements`.

Los siguientes cortes son:

- **E30B:** conectar la única UI existente de Recetas a Supabase;
- **E30C:** usar las recetas persistentes para el descuento automático
  `plato → receta → ingredientes → stock_movements` en local/reservas y envíos.
