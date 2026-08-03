# Prueba real de aislamiento RLS en staging

## Proyecto autorizado

- Nombre: `tango-resto`
- Project ref: `yzkeugxygfdgzhlwdeek`
- Región: São Paulo
- Fixture: dos usuarios owner y dos negocios independientes

Los scripts rechazan cualquier URL cuyo project ref no coincida con staging y
también rechazan que staging y producción compartan referencia.

## Manejo de credenciales

`.env.staging.local` está ignorado por Git.

Nunca pegar la secret key en el chat, una captura, un commit, un issue o un log.

La clave privilegiada se utiliza únicamente para preparar o eliminar el fixture.
La prueba RLS usa la publishable key y sesiones reales de A y B.

## Fixture

El fixture se prepara con:

```text
npm run staging:seed-isolation
```

Es idempotente. No debe ejecutarse `staging:cleanup-isolation` mientras se
desarrollan las políticas operativas.

## Prueba de aislamiento

Después de aplicar la migración 003 sobre businesses y profiles:

```text
npm run staging:test-isolation
```

La prueba debe aprobar doce controles:

1. anon no consulta membresías, businesses ni profiles;
2. A y B se autentican;
3. cada usuario ve su membresía owner;
4. la consulta amplia de membresías devuelve solo su tenant;
5. cada usuario ve exactamente su fila de businesses;
6. cada usuario ve exactamente su fila de profiles;
7. membresías, negocios y perfiles cruzados devuelven cero filas;
8. las escrituras de business_members siguen bloqueadas;
9. las escrituras de businesses están bloqueadas;
10. las escrituras de profiles están bloqueadas;
11. services y reservations continúan en default deny;
12. ambas sesiones se cierran.

Cualquier fila cruzada es un fallo P0.

## Evidencia permitida

Puede compartirse la consola porque los scripts no imprimen:

- passwords;
- publishable keys;
- secret keys;
- access tokens;
- refresh tokens.

No compartir `.env.staging.local` ni `.tango/staging-isolation.json`.

## Limpieza futura

Cuando el fixture ya no sea necesario:

```text
npm run staging:cleanup-isolation
```

El cleanup verifica que la evidencia local pertenezca a `tango-resto` antes de
eliminar datos.
