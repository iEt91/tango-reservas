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

Es idempotente y prepara para cada negocio:

- un owner y su perfil;
- una membresía activa;
- una fila inicial de `business_hours`;
- una fila de `reservation_rules`;
- una fila de `services`.

Después del cutover de horarios, `business_hours` puede crecer de una fila
inicial a un máximo de siete filas por negocio, una por día. La prueba exige días
únicos, conserva la fila original del fixture y rechaza cualquier `business_id`
ajeno.

No debe ejecutarse `staging:cleanup-isolation` mientras se desarrollan las
políticas operativas.

## Prueba de aislamiento

Después de aplicar la migración 004:

```text
npm run staging:test-isolation
```

La prueba debe aprobar diecisiete controles:

1. anon no consulta identidad ni configuración;
2. A y B se autentican;
3. cada usuario ve su membresía owner;
4. la consulta de membresías devuelve solo su tenant;
5. cada usuario ve exactamente su negocio;
6. cada usuario ve exactamente su perfil;
7. la identidad cruzada devuelve cero filas;
8. las escrituras de membresías siguen bloqueadas;
9. las escrituras de identidad siguen bloqueadas;
10. cada usuario ve entre uno y siete horarios propios, sin días duplicados;
11. cada usuario ve exactamente sus reglas de reserva;
12. cada usuario ve exactamente su servicio;
13. las consultas amplias de configuración devuelven solo su tenant;
14. la configuración cruzada devuelve cero filas;
15. INSERT, UPDATE y DELETE de configuración están bloqueados;
16. las tablas restantes continúan en default deny;
17. ambas sesiones se cierran.

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

El cleanup elimina el negocio y su configuración mediante cascadas de claves
foráneas, y verifica primero que la evidencia local pertenezca a `tango-resto`.
