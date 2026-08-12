# Demo Perfecta Demuru — Operational History E35B

## Alcance

E35B agrega actividad comercial determinística y móvil sobre el Master Data E35A.

La demo se recalcula una vez por día en modo local. El sello de instalación combina:

`e35b-demuru-operational-v1:YYYY-MM-DD`

Mientras el día no cambie, la demo no vuelve a sobrescribir las modificaciones hechas durante la presentación. Al comenzar un nuevo día, la actividad se regenera alrededor de la nueva fecha.

## Ventana temporal

- 120 días históricos.
- Día actual.
- 14 días futuros de Reservas.
- Envíos históricos y del día actual.
- Caja histórica de los últimos 90 días.
- Consumo de Stock derivado de los últimos 30 días.
- Historial visual de Stock acotado a los movimientos recientes.

Con el ancla de validación `2026-08-12`, el dataset genera aproximadamente:

- 295 reservas.
- más de 200 reservas completadas.
- alrededor de 165 envíos/retiros.
- alrededor de 150 envíos completados.
- más de 120 gastos.
- alrededor de 78 sesiones de Caja.
- 650 movimientos recientes de Stock.
- 36 perfiles de clientes con actividad.
- 5 leads/clientes manuales todavía sin historial.

Los conteos exactos son determinísticos para cada fecha y pueden variar al mover el ancla diaria porque se respetan días de apertura.

## Coherencia operativa

### Reservas

Las reservas respetan el horario comercial de Demuru:

- lunes cerrado;
- martes a sábado servicio nocturno;
- domingo servicio de almuerzo.

El pasado contiene completadas, canceladas y no-show. El futuro sólo puede contener pendientes o confirmadas.

Las reservas completadas tienen:

- líneas de consumo reales del Menú Demuru;
- subtotal calculado desde los precios canónicos de la demo;
- Cocina completada;
- descuento de Stock;
- pago;
- timestamp de cierre.

También se generan pagos mixtos para validar que Caja mantenga separados Efectivo, Tarjeta, Mercado Pago y Transferencia.

### Envíos y retiros

Se mezclan:

- Delivery;
- Retiro;
- origen web;
- origen manual.

Los pedidos web del día pueden quedar pendientes de aceptación. El Stock y Cocina sólo se activan cuando el pedido se considera aceptado.

Los pedidos completados incluyen tracking, preparación, entrega/retiro y pago.

### Clientes

Los clientes se derivan de Reservas y Envíos mediante teléfono estable.

La demo incluye:

- frecuentes;
- activos;
- perfiles con preferencias;
- alergias/notas;
- cumpleaños;
- historial de visitas;
- próximos turnos;
- pedidos y ticket promedio derivados por la UI.

Además existen cinco contactos manuales para que la pantalla también muestre clientes nuevos sin actividad previa.

### Gastos

Los gastos utilizan proveedores coherentes con E35A, por ejemplo:

- Huerta Pinamar;
- Carnes del Tuyú;
- Pescados Atlántico;
- Lácteos del Sur;
- Almacén Mayorista Centro;
- Bodega Costa.

También se incluyen alquiler, servicios y limpieza.

Hay pagos por Efectivo, Transferencia, Mercado Pago y Tarjeta, además de algunas obligaciones pendientes.

### Caja

Los días históricos con actividad generan sesiones cerradas.

Cada cierre conserva:

- apertura;
- ventas por método de pago;
- gastos en efectivo;
- movimientos de Caja;
- efectivo esperado;
- efectivo real;
- diferencia;
- snapshots de cierre.

El día actual queda con una Caja abierta para facilitar la demostración de operaciones.

### Stock

El consumo no se inventa de forma independiente.

Se calcula desde:

`venta -> plato -> receta -> ingrediente -> unidad de Stock`

Las conversiones `g/kg` y `ml/l` siguen las mismas reglas usadas por Tango Reservas.

Los 77 insumos quedan con saldo positivo. Cinco se mantienen deliberadamente por debajo del nivel de alerta para demostrar el estado de bajo Stock sin bloquear el Menú.

El historial local conserva hasta 650 movimientos recientes para no consumir innecesariamente la cuota del navegador.

## Recetas

E35B completa un detalle detectado durante la integración de E35A: los ingredientes ya tenían `stockProductId`, cantidad y unidad, pero faltaba guardar también su nombre visible.

Desde E35B cada uno de los 152 ingredientes de receta contiene:

- ID;
- `stockProductId`;
- nombre del insumo;
- cantidad;
- unidad.

Esto permite que `/local/menu/recetas` muestre las recetas completas y no sólo sus vínculos técnicos.

## Tamaño

La regresión E35B impone un límite de 1,3 MB para los dominios operativos generados.

La medición de referencia ronda 1 MB, dejando margen para la configuración visual, imágenes y otras claves locales de Tango Reservas.

## Aislamiento

E35B es exclusivamente una mejora de la demo local.

No:

- modifica Supabase;
- crea migraciones;
- ejecuta staging;
- usa `service_role`;
- altera tenants de pruebas.

El backend persistente sigue siendo la arquitectura de producción. Este dataset existe para la presentación comercial local de Demuru.

## Siguiente etapa

**E35C — Demo Polish** cerrará la Demo Perfecta:

- revisión visual de todas las pantallas;
- launcher/refresco explícito;
- validación de que no queden restos visibles de la demo vieja;
- coherencia final entre Inicio, Reservas, Clientes, Menú, Recetas, Stock, Cocina, Envíos, Gastos, Caja, Historial y Reportes;
- publicación conjunta de E35.
