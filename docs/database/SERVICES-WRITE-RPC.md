# Escritura segura de servicios

## Alcance de la Entrega 14

Esta etapa establece el backend persistente para el catálogo operativo de
servicios:

- nombre;
- descripción;
- duración;
- capacidad;
- precio opcional;
- estado activo/inactivo;
- orden estable.

No modifica la UI V2. El único editor existente está en un panel heredado que
todavía trabaja con mocks; no se reactiva ni se conecta en esta entrega.

## Problema corregido

La capa Supabase anterior intentaba realizar `INSERT`, `UPDATE` y `DELETE`
directamente desde el navegador y esperaba una columna `sort_order` que no
existía en el esquema versionado.

No se conceden permisos DML al navegador. La lectura autenticada sigue protegida
por RLS y las escrituras pasan exclusivamente por funciones autorizadas.

## RPC

### Alta y edición

```text
public.save_business_service(uuid, uuid, jsonb)
```

- `p_service_id = NULL`: crea un servicio;
- `p_service_id` informado: actualiza un servicio del negocio activo;
- calcula `sort_order` dentro de una transacción y usa un advisory lock por
  negocio;
- evita nombres duplicados por negocio, ignorando mayúsculas y espacios;
- valida payload, duración, capacidad y precio.

### Baja lógica

```text
public.set_business_service_active(uuid, uuid, boolean)
```

Los servicios no se eliminan físicamente porque pueden estar referenciados por
reservas históricas. La baja operativa consiste en establecer `is_active=false`.

## Autorización

Ambas funciones:

1. exigen una sesión autenticada;
2. verifican `owner` o `admin` mediante `private.has_business_role`;
3. validan que el servicio pertenezca al mismo `business_id`;
4. usan `SECURITY DEFINER` con `search_path` vacío;
5. no exponen acceso a `anon`.

`authenticated` conserva `SELECT` por RLS, pero no recibe `INSERT`, `UPDATE` ni
`DELETE` directos.

## Contrato

- nombre: 1 a 120 caracteres;
- descripción: hasta 1000 caracteres;
- duración: 15 a 1440 minutos, en pasos de 15;
- capacidad: 1 a 1000;
- precio: `NULL` o entre 0 y 99.999.999,99;
- `sort_order`: entero no negativo.

Los límites existen tanto en TypeScript como en constraints PostgreSQL.

## Capa heredada

`src/lib/data/supabase/services.ts` queda en modo lectura. Sus funciones antiguas
de escritura fallan cerrado e indican que debe usarse una Server Action
autenticada. No se habilita un fallback local silencioso cuando el origen es
Supabase.

## QA

Antes de aplicar la migración:

```text
npm run test:services-write
npm run staging:verify-migrations
npm run qa
```

Después de aplicar la migración `007` en staging:

```text
npm run staging:test-services-write
npm run staging:test-isolation
```

La prueba remota crea, edita y desactiva un servicio temporal, verifica BOLA y
DML bloqueado, y restaura los servicios de A y B en `finally`.

No ejecutar `staging:cleanup-isolation`.
