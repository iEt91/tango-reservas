# Integración V2 del catálogo de servicios

## Alcance de la Entrega 15

Esta etapa conecta el backend seguro de servicios con
`/local/configuracion`.

La pantalla permite:

- listar los servicios del negocio activo;
- crear servicios;
- editar nombre, descripción, duración, capacidad y precio;
- activar o desactivar servicios;
- mostrar estado y resumen operativo;
- conservar una experiencia de solo lectura para roles sin permiso.

No agrega una migración nueva. Utiliza las RPC versionadas en la migración `007`.

## Lectura inicial

La página servidor resuelve primero el negocio activo y carga en paralelo:

- horarios;
- reglas de reservas;
- servicios.

La consulta de servicios usa la sesión real, `business_id`, RLS y orden
`sort_order`. No usa service role ni `localStorage`.

## Escrituras

La UI llama únicamente a:

```text
saveBusinessServiceAction
setBusinessServiceActiveAction
```

Ambas Server Actions vuelven a resolver sesión, membresía, negocio activo y rol.
El navegador no envía un `business_id` elegible: se obtiene siempre de la
membresía activa.

Las funciones cliente antiguas de Supabase continúan fallando cerrado.

## Permisos

- `owner` y `admin`: pueden crear, editar y cambiar el estado;
- otros miembros activos: lectura;
- `anon`: sin lectura ni escritura;
- UUID de otro tenant: rechazado por la RPC y por RLS.

La UI oculta las acciones cuando el rol no puede administrar, pero la seguridad
real permanece en la Server Action y PostgreSQL.

## Baja lógica

No existe eliminación física desde la UI. Un servicio se desactiva con
`is_active=false` para conservar referencias históricas.

## Estado local

El catálogo persistente no se mezcla con la configuración guardada en
`localStorage`. La pantalla recibe el snapshot servidor y actualiza el estado
React únicamente después de una respuesta exitosa de la RPC.

## QA

```text
npm run test:services-ui-cutover
npm run qa
npm run security:audit
npm run staging:verify-migrations
```

No se debe reaplicar la migración `007` ni ejecutar
`staging:cleanup-isolation`.
