# Corte de clientes a Configuración V2

## Alcance de la Entrega 17

`/local/clientes` usa PostgreSQL como fuente canónica de clientes cuando
`TANGO_DATA_SOURCE=supabase`.

No se agrega una migración nueva. La entrega consume la lectura RLS y las RPC
versionadas en la migración `008`.

## Lectura servidor

La página:

1. resuelve la sesión y el negocio activo;
2. redirige de forma cerrada ante sesión, selección o membresía inválidas;
3. lee clientes exclusivamente para el `business_id` activo;
4. deriva permisos desde la membresía validada;
5. hidrata la interfaz con un snapshot servidor.

La UI no descubre el tenant desde el navegador.

## Escrituras

En modo Supabase:

- alta y edición llaman `saveBusinessCustomerAction`;
- archivo llama `setBusinessCustomerActiveAction`;
- no se escribe `manualClients` ni `clientsMeta` en `localStorage`;
- no existe borrado físico;
- eliminar no elimina reservas, envíos ni historial comercial;
- los errores de validación, duplicado o permisos se muestran sin una mutación
  parcial.

`owner`, `admin` y `staff` pueden crear y editar. Solo `owner` y `admin` pueden
eliminar.

## Métricas transitorias

Reservas, envíos y consumo todavía se leen del almacenamiento operativo del
prototipo. Se usan únicamente para enriquecer los clientes canónicos con:

- última y próxima visita;
- reservas por estado;
- gasto y ticket promedio;
- mesa, origen y consumo frecuente.

Una actividad local que no corresponda a un cliente persistido no crea una fila
fantasma en el CRM Supabase.

Al editar nombre, teléfono o correo, la entrega sincroniza temporalmente esos
campos en reservas y envíos locales asociados para conservar la correlación de
métricas. Esa compatibilidad se retirará al migrar reservas y pedidos.

## Compatibilidad local

Cuando la fuente de datos no es Supabase, el prototipo conserva su flujo
anterior basado en `manualClients` y `clientsMeta`. Esa compatibilidad no se
considera fuente canónica para staging ni producción.

## Archivo

El control visual que antes eliminaba ahora elimina en Supabase. El cliente deja
de aparecer en la lista activa, pero su fila y sus referencias históricas se
conservan. La restauración ya está soportada por la RPC y se expondrá en una
vista específica de eliminados.

## QA manual

Con tenant A:

1. abrir `/local/clientes`;
2. comprobar que aparece únicamente el cliente A persistido;
3. crear un cliente con teléfono y correo únicos;
4. recargar y confirmar persistencia;
5. editar sus datos y volver a recargar;
6. comprobar el error por teléfono o correo duplicado;
7. eliminar el cliente y confirmar que desaparece sin borrar actividad.

Con tenant B:

1. comprobar que no aparece ningún cliente A;
2. confirmar que solo se ve y modifica el tenant B.

No ejecutar `staging:cleanup-isolation`.
