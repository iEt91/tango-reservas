# Despliegue seguro de membresías y RLS

## Alcance

La migración `20260802_001_business_members_and_rls.sql` crea la primera frontera
multiempresa real:

- `business_members`;
- roles `owner`, `admin` y `staff`;
- estados `active`, `invited` y `disabled`;
- backfill desde `profiles`;
- RLS y `FORCE RLS`;
- lectura autenticada controlada;
- bloqueo de escrituras directas.

No activa todavía RLS en las tablas operativas. Esa activación se realizará por
bloques después de validar staging.

## Helpers privilegiados

Las funciones `SECURITY DEFINER` viven en el esquema `private`, no en `public`.

Cada función:

- usa nombres de objetos completamente calificados;
- fija `search_path = ''`;
- revoca ejecución pública;
- expone únicamente el helper necesario para la política;
- consulta identidad mediante `(select auth.uid())`.

El esquema `private` no debe añadirse a los esquemas expuestos de PostgREST.

## Precondiciones

1. Crear un proyecto Supabase independiente para staging.
2. No reutilizar el project ref de producción.
3. Ejecutar el preflight de conectividad.
4. Ejecutar `supabase/preflight/20260802_001_staging_preflight.sql`.
5. Corregir perfiles huérfanos o usuarios desconocidos.
6. Verificar el manifiesto con `npm run staging:verify-migrations`.
7. Aplicar primero en staging.
8. No aplicar simultáneamente con cambios operativos.

## Aplicación

En un proyecto vacío:

1. aplicar `supabase/schema.sql`;
2. aplicar la migración de membresías;
3. ejecutar el postflight;
4. crear dos usuarios y dos negocios de prueba;
5. ejecutar la prueba real de aislamiento.

## Criterio de aprobación

- anon no puede leer membresías;
- A ve su membresía;
- B ve su membresía;
- A no ve el negocio B;
- B no ve el negocio A;
- authenticated no puede insertar, editar ni eliminar membresías;
- no existen helpers privilegiados en `public`;
- RLS y `FORCE RLS` están activos.

## Rollback

El rollback elimina la política, tabla, funciones privadas y el esquema `private`.
Solo debe ejecutarse antes de que otras migraciones dependan de estos objetos.
