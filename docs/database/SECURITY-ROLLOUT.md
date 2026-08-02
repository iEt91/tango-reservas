# Despliegue seguro de membresías y RLS

## Alcance de esta migración

La migración `20260802_001_business_members_and_rls.sql` crea la primera frontera multiempresa real:

- tabla `business_members`;
- roles `owner`, `admin` y `staff`;
- estados `active`, `invited` y `disabled`;
- backfill desde `profiles`;
- funciones de autorización;
- RLS sobre `business_members`;
- permisos de lectura autenticada;
- bloqueo de escrituras directas desde el navegador.

No activa RLS todavía sobre `businesses`, `reservations`, `customers`, `services` ni otras tablas operativas. Esa decisión es intencional: el panel actual todavía no tiene sesiones persistentes ni rutas protegidas y activar esas políticas antes podría bloquear la aplicación.

## Garantías de diseño

### Sin confianza en parámetros de URL

La autorización se obtiene con `auth.uid()` y `business_members`. Un `business_id` enviado por el navegador no concede acceso por sí mismo.

### Funciones seguras

Las funciones `SECURITY DEFINER`:

- fijan `search_path`;
- solo consultan la tabla de membresías;
- revocan ejecución pública;
- se conceden únicamente a `authenticated`.

### Escrituras controladas

Los usuarios autenticados pueden consultar membresías permitidas, pero no insertar, editar ni eliminar directamente. El onboarding y la gestión de miembros se implementarán después mediante operaciones de servidor o RPC controladas.

## Precondiciones antes de aplicar en Supabase

1. Tener un backup reciente de la base.
2. Aplicar primero en staging.
3. Confirmar que `profiles.auth_user_id` contiene UUID reales de `auth.users`.
4. Confirmar que cada propietario existente tiene `business_id`.
5. Mantener disponible una sesión de service role para corregir el backfill.
6. No aplicar simultáneamente con cambios de autenticación.

## Consultas de preflight

```sql
select count(*) as profiles_without_user
from public.profiles
where business_id is not null
  and auth_user_id is null;

select count(*) as profiles_without_business
from public.profiles
where auth_user_id is not null
  and business_id is null;

select role, count(*)
from public.profiles
group by role
order by role;
```

Los registros incompletos no se migran automáticamente. Deben revisarse antes de depender de las membresías.

## Aplicación controlada

1. Ejecutar la migración en staging.
2. Verificar que la transacción finalizó sin errores.
3. Comparar perfiles migrables contra membresías activas.
4. Probar con dos usuarios de dos negocios diferentes.
5. Verificar que cada usuario ve su membresía.
6. Verificar que no puede consultar la membresía del otro negocio.
7. Verificar que anon no puede consultar la tabla.
8. Verificar que authenticated no puede insertar ni elevar roles directamente.
9. Recién entonces repetir en producción.

## Verificación posterior

```sql
select
  business_id,
  role,
  status,
  count(*)
from public.business_members
group by business_id, role, status
order by business_id, role, status;
```

La suma de membresías activas debe coincidir con los perfiles migrables, salvo duplicados deliberadamente ignorados por la restricción única.

## Rollback

El archivo `supabase/rollbacks/20260802_001_business_members_and_rls.down.sql` elimina únicamente este bloque.

No debe ejecutarse después de que otras tablas o funciones dependan de `business_members`. En ese caso, el rollback debe realizarse restaurando el backup o mediante una migración compensatoria.

## Próximo bloque

Después de validar esta base:

1. persistencia de sesión en el cliente;
2. login, logout y recuperación;
3. resolución segura del negocio activo;
4. ruta piloto protegida;
5. RLS en configuración y servicios;
6. pruebas negativas entre negocios.
