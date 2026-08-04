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
- una fila de `services`;
- una fila fixture mínima de `customers`;
- una fila fixture mínima de `reservations`.

`customers` y `reservations` son tablas de colección. La prueba exige
que cada usuario vea su fila fixture y que todas las filas visibles
pertenezcan a su propio negocio, pero permite filas adicionales del
mismo tenant creadas por pruebas funcionales o por uso normal.

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

La prueba debe aprobar veintiún controles:

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
13. cada usuario ve exactamente su cliente;
14. cada usuario ve exactamente su reserva;
15. las consultas amplias de configuración, clientes y reservas devuelven solo su tenant;
16. la configuración, los clientes y las reservas cruzados devuelven cero filas;
17. INSERT, UPDATE y DELETE de configuración están bloqueados;
18. INSERT, UPDATE y DELETE directos de clientes están bloqueados;
19. INSERT, UPDATE y DELETE directos de reservas están bloqueados;
20. las tablas restantes continúan en default deny;
21. ambas sesiones se cierran.

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
