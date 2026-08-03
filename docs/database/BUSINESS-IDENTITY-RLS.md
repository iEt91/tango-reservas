# RLS de identidad del negocio

## Alcance

La migración `20260802_003_business_identity_read_rls.sql` abre únicamente la
lectura autenticada de:

- `public.businesses`;
- `public.profiles`.

Todas las demás tablas operativas continúan bloqueadas.

## Política de businesses

Un usuario puede leer un negocio solamente cuando tiene una membresía activa con
rol `owner`, `admin` o `staff` en ese mismo negocio.

No existe lectura anónima y no existen escrituras directas.

## Política de profiles

Un usuario activo puede leer su propio perfil.

Los roles `owner` y `admin` también pueden leer perfiles pertenecientes a su
negocio. La política no permite consultar perfiles de otro tenant.

Un usuario deshabilitado no obtiene acceso por el simple hecho de conservar un
`auth_user_id`.

## Grants

`authenticated` recibe únicamente `SELECT` en `businesses` y `profiles`.

Se revocan todos los privilegios previos de `anon` y `authenticated` antes de
conceder esa lectura mínima. No se habilitan:

- INSERT;
- UPDATE;
- DELETE;
- TRUNCATE;
- REFERENCES;
- TRIGGER.

## Staging

El fixture existente de `tango-resto` contiene dos usuarios owner y dos negocios
independientes.

Después de aplicar la migración se debe ejecutar:

```text
npm run staging:test-isolation
```

La prueba debe demostrar:

- cada usuario ve exactamente su negocio;
- cada usuario ve exactamente su perfil;
- los IDs del otro tenant devuelven cero filas;
- ninguna escritura directa está permitida;
- las tablas restantes siguen en default deny.

Cualquier fila cruzada bloquea el lanzamiento.
