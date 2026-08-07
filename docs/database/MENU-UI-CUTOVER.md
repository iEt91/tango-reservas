# Menú V2 persistente sobre la interfaz original

## Decisión de arquitectura

`src/app/local/menu/v2-menu-page.tsx` es la única interfaz visual del Menú V2.

E27 no reemplaza esa página ni mantiene una copia visual alternativa. `page.tsx` resuelve la fuente de datos y entrega a la misma `V2MenuPage` un snapshot local o Supabase mediante `menuPersistence`.

**Regla para los siguientes cutovers V2:** separar persistencia, readers, Server Actions y contratos cuando sea necesario, pero **no crear una segunda página visual** para sustituir una página V2 existente.

## Persistencia

En modo `local`, `v2-menu-page.tsx` conserva el comportamiento previo basado en los datos mock/localStorage.

En modo `supabase`:

- `page.tsx` resuelve sesión, negocio activo y membresía antes de leer datos;
- el snapshot inicial se obtiene con `getBusinessMenuForBusiness(businessId)`;
- owner y admin pueden mutar;
- otros roles quedan en lectura y las Server Actions vuelven a validar rol y tenant;
- categorías y productos se guardan mediante las Server Actions/RPC publicadas en E26;
- orden de categorías y cambios rápidos se persisten mediante sus RPC atómicas;
- la UI no crea un cliente Supabase ni realiza DML directo;
- localStorage queda fuera del camino Supabase.

## Eliminación

La interfaz utiliza la palabra **Eliminar**. La implementación continúa siendo una eliminación lógica:

- los nombres técnicos `archive...` y `archived_at` se conservan;
- no se ejecuta `DELETE` físico;
- el historial y el aislamiento multiempresa permanecen intactos;
- una categoría con productos asignados debe vaciarse antes de eliminarse.

## Alcance visual

La estética de `v2-menu-page.tsx` anterior a E27 es la referencia. E27 conserva su estructura de página, métricas, filtros, `V2DataTable`, panel de categorías, modales, botones, espacios, tipografía e iconografía. Los experimentos realizados sobre `v2-persistent-menu-page.tsx` no forman parte del resultado final.

## Alcance persistente E27A

Promociones, combos, descuentos de categoría, precio fijo y composición con cantidades pasan a persistirse mediante la migración 012 y la RPC `save_business_menu_category_details`. La URL de imagen existente se conserva en el contrato del producto; la subida binaria de imágenes sigue requiriendo un contrato de Storage específico y permanece fuera de esta entrega.

## Seguridad

- E27A agrega únicamente la migración 012 y su rollback/postflight; no modifica las migraciones 001–011.
- `MIGRATIONS.sha256` incorpora los hashes de migración y rollback 012.
- No ejecuta `staging:cleanup-isolation`.
- No habilita DML directo desde el navegador.
- Las Server Actions revalidan sesión, negocio activo, rol y tenant.
- El backend mantiene RLS forzada y aislamiento por `business_id`.

## Prueba manual

1. Abrir `/local/menu` con Supabase activo.
2. Confirmar que visualmente corresponde a la `v2-menu-page.tsx` original.
3. Crear/editar una categoría normal.
4. Crear/editar un producto.
5. Cambiar categoría, precio y visibilidad y guardar cambios rápidos.
6. Pausar/activar un producto.
7. Recargar y confirmar persistencia.
8. Confirmar que eliminar producto es lógico.
9. Confirmar que una categoría con productos no puede eliminarse hasta vaciarla.
10. Crear una promoción 2x1 con cantidad 2 del mismo producto y recargar.
11. Crear o editar un combo con cantidad 3 o superior y confirmar persistencia.
12. Confirmar que no existe `v2-persistent-menu-page.tsx`.

## Promociones y combos persistentes

E27A mantiene `v2-menu-page.tsx` como única interfaz visual y habilita persistencia de promociones, descuentos, precio fijo y composición con cantidades. Casos como 2x1 y 3x2 utilizan la misma UI original; no se crea una segunda página visual.
