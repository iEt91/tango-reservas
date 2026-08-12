# Demo Perfecta Demuru — E35C

## Estado

E35C cierra la preparación técnica de la Demo Perfecta Demuru.

La demo usa la carta canónica de 20 productos, 20 recetas y 77 insumos de E35A,
más el historial operativo determinístico de E35B.

La actividad se genera con una ventana móvil de:

- 120 días históricos;
- día actual;
- 14 días futuros para Reservas.

El Master Data permanece estable. El historial operativo se refresca cuando cambia
el día y, durante el mismo día, no vuelve a sobrescribir cambios manuales hechos
durante una presentación.

## Arranque

Desde la raíz del repositorio ejecutar:

`INICIAR_DEMO_DEMURU.bat`

El launcher hace dos cosas:

1. ejecuta `npm run demo:doctor`;
2. ejecuta `npm run demo:start`.

El doctor transpila y ejecuta el Master Data y el historial operativo reales,
genera el snapshot con la fecha actual y verifica:

- 5 categorías;
- 20 productos;
- 20 recetas;
- 152 ingredientes con nombre;
- 77 insumos;
- 5 alertas de Stock bajo;
- 650 movimientos recientes;
- Reservas dentro de la ventana temporal;
- Delivery y Retiro;
- pedidos web presentes y aceptación coherente cuando corresponda;
- Clientes históricos y leads;
- Caja abierta para el día;
- tamaño seguro para localStorage.

Si el doctor falla, Next.js no se inicia.

## Servidor de demo

`demo:start` fuerza `NEXT_PUBLIC_DATA_SOURCE=local` únicamente para el proceso de
la demo. Ese proceso se ejecuta en **modo local** y no cambia `.env.local`.

Busca el primer puerto libre entre 3000 y 3005, inicia Next.js y abre
automáticamente `/demuru` en el navegador.

La demo local no ejecuta migraciones, staging ni operaciones Supabase.

## Checklist visual de E35C

Revisar en navegador:

- `/demuru`: las 5 categorías y los 20 productos de la carta;
- Postres: Creme brulee (para 2), Flan mixto, Panqueque caramelizado y Marquise chocolate;
- `/local/menu`: mismo catálogo que la web pública;
- `/local/menu/recetas`: 20 recetas con ingredientes legibles;
- `/local/productos`: 77 insumos y alertas de Stock plausibles;
- `/local/reservas`: pasado, día actual y próximas reservas;
- `/local/clientes`: clientes con historial y leads;
- `/local/envios`: Delivery, Retiro y pedidos web;
- `/local/cocina`: comandas operativas;
- `/local/caja`: medios de pago separados y sesión del día;
- `/local/gastos`: gastos pagados y pendientes.

La revisión visual final debe confirmar que no existan textos cortados, datos
contradictorios, estados imposibles, scroll roto ni restos de la vieja pizzería.

## Calidad

E35C endurece `lint` y `npm run qa` a **cero warnings** mediante
`--max-warnings=0`.

También elimina el warning histórico de la prueba de staging de Caja/Gastos sin
alterar su comportamiento.

## Frontera

E35C no modifica Supabase, no aplica migraciones, no ejecuta staging y no hace
commit ni push durante la integración local.

Una vez aprobado el QA visual, la Demo Perfecta queda cerrada y el proyecto puede
continuar con Reportes sin volver a reconstruir estos datos.
