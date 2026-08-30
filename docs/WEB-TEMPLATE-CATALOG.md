# Catálogo de sitios públicos

## Objetivo

Cada restaurante elige una plantilla publicada desde el panel Web. La elección se
persiste por negocio, se renderiza en el servidor y se conserva al abrir el sitio
desde cualquier dispositivo.

No se deben publicar tarjetas que aparenten ser diseños distintos si reutilizan la
misma composición visual sin una variante real.

## Estado actual

- Publicadas: `restaurant-elegant`, `compact-premium`, `minimal-cafe`.
- El editor V2 conserva una selección temporal en `localStorage`; no es todavía la
  fuente canónica para el sitio público.
- Antes de ampliar el catálogo hay que persistir un único `template_id` validado en
  Supabase y resolverlo del lado del servidor.

## Contrato de cada plantilla

Cada entrada del catálogo debe declarar:

- `id` estable y único;
- nombre, categoría y caso de uso;
- layout real implementado, no sólo una paleta distinta;
- slots de contenido e imágenes compatibles;
- preview propio, responsive y accesible;
- renderer registrado y prueba de regresión;
- estado `draft`, `published` o `retired`.

Un restaurante sólo puede seleccionar una plantilla `published`. Una plantilla
retirada mantiene el renderer mientras exista algún negocio que la use.

## Primera colección: 24 sitios reales

| Estado | ID | Enfoque |
| --- | --- | --- |
| Publicada | `restaurant-elegant` | Restaurante premium |
| Publicada | `compact-premium` | Beach club / gastronomía nocturna |
| Publicada | `minimal-cafe` | Café minimalista |
| Planificada | `bistro-editorial` | Bistró con relato y carta corta |
| Planificada | `parrilla-fuego` | Parrilla y carnes |
| Planificada | `pizzeria-viva` | Pizzería y pedidos rápidos |
| Planificada | `cafe-nordic` | Café de especialidad |
| Planificada | `bar-cocteleria` | Bar de tragos |
| Planificada | `cerveceria-urbana` | Cervecería y eventos |
| Planificada | `sushi-nocturno` | Sushi / cocina asiática |
| Planificada | `comida-casera` | Restaurante familiar |
| Planificada | `pasteleria-clara` | Pastelería y cafetería |
| Planificada | `heladeria-color` | Heladería |
| Planificada | `beach-club-sunset` | Playa y atardecer |
| Planificada | `hotel-restaurant` | Restaurante de hotel |
| Planificada | `wine-bar` | Vinos y tapas |
| Planificada | `vegan-market` | Cocina vegetal |
| Planificada | `fast-casual` | Fast casual |
| Planificada | `food-truck` | Food truck / ferias |
| Planificada | `brunch-garden` | Brunch y jardín |
| Planificada | `evento-salon` | Salón y eventos |
| Planificada | `takeaway` | Prioridad a retiro y delivery |
| Planificada | `club-social` | Club / comunidad |
| Planificada | `mercado-gourmet` | Mercado gastronómico |

La segunda colección agrega 26 diseños reales y lleva el catálogo a 50, sólo después
de validar conversión, carga y mantenimiento de la primera colección.

## Orden de implementación

1. Hacer canónica la elección: migración, RLS/RPC de owner y renderer de servidor.
2. Publicar seis layouts adicionales con preview, mobile y pruebas.
3. Probar el selector con restaurantes distintos y preservar plantillas retiradas.
4. Completar las 24 plantillas; medir rendimiento y conversión antes de pasar a 50.
