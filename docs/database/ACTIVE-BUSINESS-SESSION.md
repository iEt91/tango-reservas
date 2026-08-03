# Sesión y negocio activo

## Objetivo

Separar tres conceptos que no deben confundirse:

1. **Identidad:** usuario autenticado por Supabase Auth.
2. **Autorización:** membresía activa en `business_members`.
3. **Contexto:** negocio seleccionado para navegar dentro de `/local`.

La cookie de contexto no concede permisos. Solo ayuda a elegir una de las
membresías que PostgreSQL ya permite consultar mediante RLS.

## Resolución

`resolveActiveBusiness()` ejecuta el siguiente proceso en el servidor:

- valida claims mediante `auth.getClaims()`;
- obtiene únicamente membresías con `user_id = auth.uid()` y `status = active`;
- consulta `businesses` solamente para esos `business_id`;
- descarta roles o relaciones inválidas;
- comprueba la cookie privada;
- selecciona automáticamente cuando existe una sola membresía;
- exige selección explícita cuando existen varias;
- falla cerrado cuando falta membresía o alguna relación no puede verificarse.

## Cookie

Nombre:

```text
tango_active_business
```

Atributos:

- `httpOnly`;
- `sameSite=lax`;
- `secure` en producción;
- duración máxima de 30 días;
- eliminada al cerrar sesión.

Solo contiene el UUID del negocio. No contiene tokens, roles, correos ni datos
del restaurante.

## Selector

El POST `/auth/select-business/activate`:

- rechaza orígenes cruzados;
- valida el formato UUID;
- vuelve a validar claims;
- exige una membresía activa del mismo usuario;
- sanitiza la ruta de retorno;
- establece la cookie únicamente después de aprobar todos los controles.

## Protección de `/local`

La protección tiene dos capas:

- Proxy: rechazo temprano y renovación de sesión.
- Layout servidor: validación de membresía y negocio antes del render.

Todas las páginas de `/local` heredan el layout. No se depende de que cada página
recuerde implementar su propia validación.

## Próxima etapa

Los repositorios de datos utilizarán el contexto resuelto en servidor. Las
escrituras críticas seguirán validando membresía y rol dentro de PostgreSQL o en
operaciones servidoras transaccionales; nunca confiarán solamente en la cookie.
