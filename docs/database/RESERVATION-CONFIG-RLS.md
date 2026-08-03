# RLS de configuración de reservas

## Alcance

La migración `20260802_004_reservation_config_read_rls.sql` habilita lectura
multiempresa en:

- `public.business_hours`;
- `public.reservation_rules`;
- `public.services`.

No habilita clientes ni reservas.

## Lectura autenticada

Un usuario puede leer una fila solamente cuando conserva una membresía activa en
el `business_id` de esa fila con uno de estos roles:

- `owner`;
- `admin`;
- `staff`.

El acceso utiliza `private.has_business_role`; no se crean helpers adicionales.

## Privilegios

`authenticated` recibe únicamente `SELECT` en las tres tablas.

`anon` no recibe ningún privilegio. Tampoco se conceden:

- INSERT;
- UPDATE;
- DELETE;
- TRUNCATE;
- REFERENCES;
- TRIGGER.

Las modificaciones futuras deberán pasar por endpoints de servidor con
validación de rol, validación de entrada y auditoría.

## Fixture de staging

Cada tenant de prueba obtiene:

- un horario diferente;
- una regla de reservas diferente;
- un servicio diferente.

Los IDs del fixture son deterministas y se guardan localmente en
`.tango/staging-isolation.json`, sin claves ni contraseñas.

Antes de la prueba remota se ejecuta:

```text
npm run staging:seed-isolation
```

Después de aplicar la migración 004:

```text
npm run staging:test-isolation
```

La prueba valida lectura propia, consultas amplias, lectura cruzada y bloqueo de
INSERT, UPDATE y DELETE.

`business_profiles`, `business_sections`, `business_images`, `customers` y
`reservations` continúan en default deny.
