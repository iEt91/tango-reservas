# Autenticación SSR — despliegue y QA

## Alcance

Esta entrega añade autenticación de correo y contraseña con sesiones almacenadas en cookies:

- cliente de navegador con `createBrowserClient`;
- cliente de servidor con `createServerClient`;
- `src/proxy.ts` para renovación de tokens;
- login;
- recuperación de contraseña;
- actualización de contraseña;
- callback PKCE;
- logout;
- ruta piloto `/local/seguridad`.

No protege todavía todo `/local`. Esa activación se realizará después de aplicar y validar `business_members` en staging.

## Variables aceptadas

```env
NEXT_PUBLIC_SUPABASE_URL=https://TU-PROYECTO.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=tu_clave_publica
```

También se mantiene compatibilidad temporal con:

```env
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
```

La service role no se usa en el navegador ni en estas rutas.

## Configuración necesaria en Supabase

En Auth → URL Configuration:

- Site URL de desarrollo: `http://localhost:3000`
- Redirect URL de desarrollo:
  `http://localhost:3000/auth/callback`
- Añadir después las URLs equivalentes de staging y producción.

En Auth → Providers → Email:

- Email habilitado.
- Para staging puede crearse manualmente un usuario de prueba.
- La confirmación de correo puede mantenerse activa en producción.

## QA manual local

1. Ejecutar `npm run dev`.
2. Abrir `http://localhost:3000/auth/login`.
3. Confirmar que no aparece el header global viejo.
4. Abrir `http://localhost:3000/auth/forgot-password`.
5. Abrir directamente `http://localhost:3000/local/seguridad`.
6. Sin sesión, debe volver a `/auth/login` conservando
   `next=/local/seguridad`.
7. Las rutas `/local`, `/local/reservas` y `/local/configuracion`
   deben continuar funcionando como antes.
8. Con un usuario de prueba válido, iniciar sesión.
9. Debe abrir `/local/seguridad` y mostrar el correo autenticado.
10. Pulsar “Cerrar sesión”.
11. Volver a abrir `/local/seguridad`; debe redirigir al login.

## QA de recuperación

Solo después de configurar la redirect URL:

1. Solicitar recuperación.
2. Abrir el enlace recibido.
3. Debe entrar por `/auth/callback`.
4. Debe terminar en `/auth/update-password`.
5. Guardar una contraseña de ocho o más caracteres.
6. Debe cerrar la sesión y volver al login.
7. Iniciar sesión con la contraseña nueva.

## Criterios de aprobación

- No se utiliza `getSession()` para proteger rutas.
- Proxy y página usan validación de identidad.
- Cookies se renuevan con `getAll` y `setAll`.
- No existe service role en código cliente.
- Los redirects internos rechazan URLs externas.
- El resto del prototipo no queda bloqueado.
