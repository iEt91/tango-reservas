# Recetas V2 — corte persistente E30B

## Objetivo

E30B conecta la **única interfaz existente** de `/local/menu/recetas` con el
backend persistente creado en E30A.

No se crea una segunda página visual y no se agrega una migración nueva.

## Arquitectura

`/local/menu/recetas/page.tsx` pasa a ser una página servidor.

En modo Supabase:

1. resuelve la sesión y el negocio activo;
2. exige acceso `recipes >= view`;
3. lee menú, recetas e insumos del mismo `business_id`;
4. entrega un snapshot explícito al componente visual existente;
5. deriva `recipes >= manage` para habilitar mutaciones;
6. respeta de forma independiente el permiso de lectura de Stock.

La interfaz visual vive en `v2-recipes-page.tsx` y conserva el diseño V2 actual.

En modo local continúa funcionando el fallback anterior con `localStorage`.

## Fuente de verdad

En Supabase:

- platos y categorías provienen de `menu_items` / `menu_categories`;
- recetas provienen de `menu_recipes` y `menu_recipe_ingredients`;
- insumos y saldos provienen del backend persistente de Stock;
- `localStorage` no hidrata ni guarda datos canónicos de Recetas.

Los platos que todavía no tienen una fila persistente de receta se representan
en la UI como **Pendiente**. No se crean recetas vacías en masa al abrir la
pantalla.

## Guardado

El botón `Guardar` persiste únicamente la receta seleccionada mediante
`saveBusinessMenuRecipeAction`.

La respuesta canónica de PostgreSQL reemplaza el borrador cliente y un refresh
debe conservar nombre interno, tiempo e ingredientes.

Una receta puede guardarse con cero ingredientes para limpiar su composición,
tal como define E30A.

## Nuevo plato

La UI conserva `Nuevo plato`.

En Supabase:

1. el plato se crea con la Server Action existente del Menú;
2. después se intenta guardar su receta con la Server Action de Recetas.

Un plato sin receta es un estado válido del producto y se muestra como
`Pendiente`. Si la segunda operación falla, la UI conserva el plato y el
borrador de receta, muestra el error y permite reintentar con `Guardar`.
No se oculta el fallo ni se simula atomicidad entre dos RPC independientes.

La creación de platos sigue restringida a owner/admin porque el backend de Menú
mantiene esa política.

## Permisos

- `recipes >= view`: puede abrir la página.
- `recipes >= manage`: puede modificar y guardar recetas.
- `stock >= view`: habilita la lista de insumos y sus saldos.
- owner/admin: tienen acceso natural a los permisos anteriores.
- staff sin lectura de Stock no obtiene nombres ni saldos de Stock desde ese
  módulo; la UI informa la limitación y bloquea cambios de ingredientes.

El cliente no crea un cliente Supabase y no ejecuta DML directo.

## Stock automático

E30B **no descuenta Stock automáticamente**.

La receta persistente queda preparada para E30C, que conectará:

`plato vendido → receta → ingredientes → stock_movements`

hasta entonces guardar o editar una receta no crea movimientos de Stock.

## QA manual posterior

1. abrir `/local/menu/recetas`;
2. comprobar que los platos reales del Menú aparecen sin recargar `localStorage`;
3. seleccionar un plato;
4. agregar un insumo real de Stock, cantidad y unidad compatible;
5. guardar;
6. refrescar con F5;
7. comprobar que nombre, tiempo e ingrediente sobreviven;
8. volver a `/local/menu` y confirmar que no apareció una interfaz duplicada;
9. verificar que guardar una receta no alteró el saldo de Stock;
10. opcionalmente crear un plato QA desde `Nuevo plato`, refrescar y comprobar
    que el plato y su receta persistieron.

## Fuera de E30B

- descuento automático de Stock;
- devolución automática por cancelación;
- consumos de reservas/envíos;
- comandas;
- pagos y caja;
- migración automática de recetas históricas desde `localStorage`.

Eso corresponde a E30C y a los bloques operativos posteriores.
