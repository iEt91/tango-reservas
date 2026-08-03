# Prueba real de aislamiento RLS en staging

## Proyecto autorizado

- Nombre: `tango-resto`
- Project ref: `yzkeugxygfdgzhlwdeek`
- Región: São Paulo
- Contenido previo al fixture: vacío

Los scripts rechazan cualquier URL cuyo project ref no coincida con staging y
también rechazan que staging y producción compartan referencia.

## Manejo de credenciales

`.env.staging.local` está ignorado por Git.

Nunca pegar la secret key en el chat, una captura, un commit, un issue o un log.

El instalador genera localmente dos contraseñas aleatorias diferentes. Solamente
queda pendiente completar `SUPABASE_SERVICE_ROLE_KEY` con la secret key de
`tango-resto`.

La clave privilegiada se usa únicamente desde Node.js para:

- crear o actualizar dos usuarios de prueba;
- confirmar sus emails ficticios;
- preparar dos negocios;
- preparar perfiles y membresías;
- eliminar el fixture cuando deje de ser necesario.

La prueba RLS no utiliza esa clave. Se autentica con la publishable key y las
sesiones reales de A y B.

## Preparación

1. Abrir `.env.staging.local` con Bloc de notas.
2. Reemplazar únicamente:

```text
SUPABASE_SERVICE_ROLE_KEY=REPLACE_WITH_STAGING_SECRET_KEY
```

3. Guardar y cerrar.
4. No enviar el contenido del archivo.

## Crear fixture

```text
npm run staging:preflight
npm run staging:seed-isolation
```

El seed es idempotente. Si A y B ya existen, actualiza sus contraseñas y vuelve a
crear sus membresías exclusivas.

## Ejecutar aislamiento

```text
npm run staging:test-isolation
```

La prueba debe aprobar ocho controles:

1. anon no consulta tablas privadas;
2. A y B se autentican;
3. cada uno ve su membresía owner;
4. una consulta amplia devuelve solo su negocio;
5. la lectura cruzada devuelve cero filas;
6. INSERT, UPDATE y DELETE están bloqueados;
7. las tablas operativas continúan default deny;
8. ambas sesiones se cierran.

Cualquier fila cruzada es un fallo P0 y bloquea el lanzamiento.

## Evidencia

Puede compartirse la consola de los comandos porque los scripts no imprimen:

- passwords;
- publishable keys;
- secret keys;
- access tokens;
- refresh tokens.

No compartir `.env.staging.local`.

## Limpieza opcional

El fixture debe conservarse mientras se desarrollan las siguientes políticas RLS.

Para eliminarlo más adelante:

```text
npm run staging:cleanup-isolation
```

El cleanup verifica primero que el fixture pertenezca a `tango-resto`.
