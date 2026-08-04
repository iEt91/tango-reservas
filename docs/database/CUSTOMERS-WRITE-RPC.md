# Escritura segura de clientes

## Alcance de la Entrega 16

Esta etapa establece el backend persistente y aislado para clientes. Todavía no
conecta `/local/clientes` con PostgreSQL porque esa pantalla mezcla clientes,
reservas, envíos y métricas derivadas de `localStorage`. El corte visual se hará
en una entrega posterior, una vez estabilizado el contrato.

## Esquema

Se conserva el esquema base existente:

- `full_name`;
- `email`;
- `phone`;
- `notes`.

Se agregan campos que la interfaz ya utiliza:

- `birth_date`;
- `preferences`;
- `tags`;
- `is_active`.

No se crean columnas duplicadas como `name` o `internal_notes`. La capa anterior
que esperaba esos nombres queda corregida.

## Lectura

Los miembros activos `owner`, `admin` y `staff` reciben `SELECT` exclusivamente
sobre clientes de su propio `business_id`, mediante RLS y
`private.has_business_role`.

`anon` no recibe acceso.

## Escritura

### Alta y edición

```text
public.save_business_customer(uuid, uuid, jsonb)
```

- `p_customer_id = NULL`: crea un cliente;
- con UUID: edita un cliente del negocio activo;
- admite `owner`, `admin` y `staff`;
- normaliza teléfono y correo;
- valida nombre, correo, nacimiento, notas, preferencias y etiquetas;
- evita teléfonos o correos duplicados dentro del mismo negocio.

### Archivo y restauración

```text
public.set_business_customer_active(uuid, uuid, boolean)
```

Solo `owner` y `admin` pueden archivar o restaurar. No existe eliminación física
desde el cliente ni desde una RPC pública.

## Seguridad

- las funciones son `SECURITY DEFINER`;
- el `search_path` es vacío;
- el negocio proviene de la membresía activa;
- una fila de otro tenant produce error;
- `authenticated` conserva lectura por RLS;
- `INSERT`, `UPDATE` y `DELETE` directos permanecen revocados.

## Capa heredada

`src/lib/data/supabase/customers.ts` queda alineado con las columnas reales y en
modo lectura. Sus escrituras anteriores fallan cerrado y exigen Server Actions.

La tabla `customer_notes` no existe en el esquema versionado y no forma parte de
esta entrega. Las funciones heredadas de notas devuelven una colección vacía o
fallan cerrado. Las notas internas del cliente se guardan en `customers.notes`.

## Fixture

Después de aplicar la migración `008`, se debe ejecutar una vez:

```text
npm run staging:seed-isolation
```

El seed idempotente agregará un cliente determinista para A y otro para B. No
elimina los negocios de prueba ni imprime credenciales.

## QA remoto

```text
npm run staging:test-customers-write
npm run staging:test-isolation
```

La prueba de escritura crea, edita y archiva un cliente temporal, verifica
duplicados, BOLA y DML directo, y restaura los clientes A/B en `finally`.

No ejecutar `staging:cleanup-isolation`.
