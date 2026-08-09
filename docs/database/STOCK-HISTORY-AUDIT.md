# Auditoría de Stock en Historial — E29C

## Objetivo

E29C incorpora los movimientos de Stock al módulo general `/local/historial`
sin crear un segundo sistema de auditoría.

La interfaz general conserva las pestañas existentes y agrega **Stock**.

## Fuente de verdad

En modo Supabase, la pestaña Stock lee `public.stock_movements`, el ledger
inmutable creado en E29A. No reconstruye el historial desde contadores ni desde
`localStorage`.

Cada fila muestra:

- insumo;
- tipo de movimiento;
- cantidad firmada;
- unidad;
- origen;
- fecha y hora;
- descripción;
- referencia operativa, cuando existe;
- responsable que ejecutó el movimiento, cuando la identidad es visible;
- rol y email del responsable, cuando RLS permite leerlos.

`stock_movements.created_by` es la identidad técnica del usuario que ejecutó la
RPC. E29C resuelve esa identidad contra `business_members` del mismo tenant.
Si RLS no permite conocer el perfil de otro usuario, la interfaz no eleva
privilegios y muestra un identificador seguro genérico.

## Movimientos incluidos

La auditoría no se limita a ajustes manuales. Incluye:

- `opening`;
- `replenishment`;
- `consumption`;
- `return`;
- `adjustment`.

También conserva el origen:

- `manual`;
- `reservation`;
- `shipping`;
- `recipe`;
- `import`.

Por lo tanto, cuando reservas, envíos y recetas se conecten al ledger
persistente, sus descuentos aparecerán automáticamente en esta misma pestaña.

## Permisos

Owner y admin pueden consultar la auditoría de su negocio.

Staff necesita al menos:

- `history >= view`;
- `stock >= view`.

La lectura mantiene RLS y `business_id`; no existe service role ni DML desde el
navegador.

## Navegación

`/local/stock → Ver historial` abre `/local/historial?tab=stock`.

`/local/stock/historial` también redirige a esa pestaña para mantener
compatibilidad con enlaces existentes.

## Fallback local

Cuando `NEXT_PUBLIC_DATA_SOURCE` no es `supabase`, la pestaña puede leer el
historial local heredado. En ese modo no existe una identidad persistente
confiable del operador, por lo que se etiqueta como `Sesión local`.

La auditoría fuerte para producción es la variante Supabase.
