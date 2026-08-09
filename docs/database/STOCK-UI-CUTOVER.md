# Stock V2 persistente — corte E29B

## Objetivo

E29B conecta la **única interfaz V2 existente** de Stock con el backend
persistente publicado en E29A.

No se crea una segunda página visual. `/local/productos` continúa redirigiendo
a `/local/stock`, y `/local/stock` continúa renderizando
`V2ProductosPage`.

## Lectura

En modo Supabase, `src/app/local/stock/page.tsx`:

1. resuelve la sesión y el negocio activo;
2. falla cerrado ante sesión, selección o membresía inválidas;
3. carga `getBusinessStockForBusiness(businessId)`;
4. deriva el permiso efectivo del módulo `stock`;
5. entrega un snapshot explícito a la V2.

La UI no crea clientes Supabase ni consulta tablas directamente.

## Escritura

En modo Supabase:

- nombre, categoría, proveedor, costo, unidad, alerta y nota se guardan mediante
  `saveBusinessStockProductAction`;
- el stock no se edita como un contador mutable;
- entradas, consumos, devoluciones y ajustes se registran mediante
  `recordBusinessStockMovementAction`;
- la fila canónica devuelta por el servidor actualiza el estado React;
- las mutaciones se bloquean mientras hay una operación en curso;
- un rol `view` puede consultar, pero no modificar.

La separación entre "guardar datos del insumo" y "registrar movimiento" evita
simular una transacción distribuida entre dos RPC independientes.

## localStorage

`localStorage` permanece únicamente como fallback cuando `getDataSource()` no
es `supabase`.

Cuando la persistencia es Supabase:

- el snapshot inicial viene del servidor;
- no se instalan listeners de `storage` para Stock;
- guardar un insumo no escribe `stockProducts` en el navegador;
- registrar movimientos no escribe `stockMovements` en el navegador.

## Semántica visual

La estética general de la página se conserva:

- métricas;
- tabla;
- alertas de compra;
- movimientos recientes;
- modal central.

En persistencia Supabase, `Stock total` y `Stock descontado` son valores
derivados y de solo lectura. El modal agrega un bloque de movimiento auditable
para modificar existencias correctamente.

El botón del footer guarda únicamente los datos descriptivos del insumo.
Si existe una cantidad de movimiento pendiente, ese botón queda bloqueado y la
UI exige usar `Registrar movimiento`. Así se evita confundir una edición del
catálogo con una modificación del ledger.

Las fechas visibles de Stock se forman con zona horaria explícita de Buenos
Aires y composición determinista de partes. No se delega el texto final a
`Intl.DateTimeFormat().format()`, evitando diferencias SSR/navegador de
espacios o marcadores de período que causen errores de hidratación.

## Fuera de E29B

- recetas persistentes;
- descuentos automáticos desde reservas/envíos;
- corte completo de `/local/stock/historial`;
- importación de stock local previo;
- eliminación visual del insumo.

Esos flujos se integran sobre el ledger persistente en entregas posteriores.
