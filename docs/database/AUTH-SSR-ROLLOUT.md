# Autenticación SSR — despliegue y QA

## Alcance actual

La autenticación utiliza sesiones Supabase almacenadas en cookies:

- cliente de navegador con `createBrowserClient`;
- cliente de servidor con `createServerClient`;
- `src/proxy.ts` para renovación y validación temprana;
- login, recuperación, callback PKCE, actualización y logout;
- protección de todo `/local`;
- resolución del negocio activo desde `business_members`;
- selector seguro cuando una cuenta tiene más de un negocio.

La cookie `tango_active_business` es `httpOnly`, `sameSite=lax` y contiene
solamente un UUID validado contra una membresía activa. No reemplaza RLS ni se
confía como fuente de autorización.

## Variables aceptadas

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu_clave_publica
```

También se mantiene compatibilidad temporal con:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

La service role no se usa en el navegador, el Proxy, el layout ni el selector.

## Sincronizar la app local con staging

```text
npm run staging:sync-app-env
```

El comando copia únicamente la URL y la clave pública desde
`.env.staging.local`. Elimina claves privilegiadas de `.env.local`, conserva el
resto de variables y guarda el contenido anterior en
`.tango/env-local-before-staging-sync`.

No imprime claves.

## Flujo de protección

1. El Proxy renueva cookies y rechaza `/local` sin claims válidos.
2. `src/app/local/layout.tsx` vuelve a validar en el servidor.
3. La consulta a `business_members` incluye el `user_id` autenticado y estado
   `active`.
4. La fila de `businesses` se obtiene únicamente para esos IDs autorizados.
5. Sin membresía se muestra acceso denegado.
6. Con varias membresías se exige seleccionar negocio.
7. La selección se valida nuevamente antes de establecer la cookie privada.
8. RLS continúa siendo la barrera primaria en PostgreSQL.

## Configuración necesaria en Supabase

En Auth → URL Configuration:

- Site URL de desarrollo: `http://localhost:3000`
- Redirect URL de desarrollo:
  `http://localhost:3000/auth/callback`
- Añadir las URLs equivalentes de staging y producción.

## QA manual local

1. Ejecutar `npm run staging:sync-app-env`.
2. Ejecutar `npm run dev`.
3. Abrir `http://localhost:3000/local` sin sesión.
4. Debe volver a `/auth/login` conservando `next=/local`.
5. Iniciar sesión con el usuario A del fixture.
6. Debe abrir `/local` sin mostrar datos de B.
7. Abrir `/local/configuracion` y `/local/reservas`.
8. Ambas rutas deben conservar la sesión.
9. Pulsar “Cerrar sesión”.
10. Volver a `/local`; debe redirigir al login.
11. Confirmar que la cookie `tango_active_business` fue eliminada.

## QA con múltiples negocios

Cuando una cuenta tenga dos membresías activas:

1. Abrir `/auth/select-business?change=1&next=/local`.
2. Elegir un negocio.
3. Confirmar que el POST usa `/auth/select-business/activate`.
4. Confirmar que un UUID ajeno devuelve acceso denegado.
5. Confirmar que el negocio elegido pertenece a la sesión actual.

## Criterios de aprobación

- No se utiliza `getSession()` para proteger rutas.
- Todo `/local` es dinámico y requiere sesión.
- El negocio activo se resuelve desde membresías, no desde datos del cliente.
- El selector revalida usuario, negocio, estado y origen del POST.
- La cookie de contexto es privada y se elimina al cerrar sesión.
- No existe service role en el flujo.
- Los redirects internos rechazan URLs externas.
