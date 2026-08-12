# Demo Perfecta Demuru — Master Data E35A

## Autoridad de la carta

E35A toma como única autoridad comercial el menú visible de `/demuru`.
La carta queda compuesta por 5 categorías y 20 productos:

- Entradas: Burrata de estación, Remolacha asada, Croquetas de hongos y Tostón ahumado.
- Principales: Ojo de bife, Pulpo grillado, Pesca del día y Pollo braseado.
- Pastas: Ravioles de osobuco, Sorrentinos de calabaza, Pappardelle y Ñoquis de papa.
- Postres: Creme brulee (para 2), Flan mixto, Panqueque caramelizado y Marquise chocolate.
- Bebidas: Vino de la casa, Aperitivo cítrico, Copa especial y Agua saborizada.

Los nombres, categorías y precios son los de la demo comercial. La web conserva su
layout y sus imágenes por `imageSlot`; E35A no reemplaza el diseño visual.

## Recetas

Los 20 productos tienen una receta canónica por venta/porción.

Las cantidades usan las unidades ya admitidas por Tango Reservas:

- `g` y `kg`;
- `ml` y `l`;
- `unidad`;
- `botella`.

Los tiempos son tiempos operativos de despacho con mise en place disponible, no el
tiempo completo de una cocción larga previa.

## Stock

El catálogo contiene 77 insumos y todos participan en al menos una receta.

Se incluyen carnes, pescadería, verduras, lácteos, almacén, panadería, bodega,
bebidas y barra. Cada insumo tiene proveedor, unidad, costo unitario, stock inicial,
nivel de alerta y nota cuando corresponde.

Los costos son **costos internos de demostración**. No representan una cotización
comercial vigente ni pretenden sustituir los precios reales de proveedores.

E35A deja `consumedBySales = 0` y limpia el historial local anterior de movimientos.
La actividad histórica y sus consumos reales se generan en E35B.

## Bootstrap local

`ensureDemuruDemoMasterData()` instala el Master Data únicamente cuando
`NEXT_PUBLIC_DATA_SOURCE` está en modo local.

La instalación está versionada. Si la versión ya está aplicada, no vuelve a
sobrescribir Menú, Stock ni Recetas. Esto permite usar la demo y editarla sin que
cada render destruya los cambios.

En una instalación que todavía conserva la antigua demo de pizzería, la primera
carga posterior a E35A reemplaza:

- categorías del menú;
- productos del menú;
- insumos;
- recetas;
- historial viejo de movimientos de Stock.

La configuración general del local se conserva.

## Fuera de E35A

E35A no crea todavía:

- reservas móviles respecto de la fecha actual;
- clientes históricos;
- pedidos Delivery o Retiro históricos;
- operaciones de Cocina;
- ventas y pagos;
- cajas;
- gastos;
- movimientos históricos de Stock.

Eso corresponde a **E35B — Demuru Operational History**.

E35C cerrará el refresco temporal determinístico, launcher y pulido final de la
Demo Perfecta.
