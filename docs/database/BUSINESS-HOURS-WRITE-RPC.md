# Escritura segura de horarios comerciales

## Alcance de la Entrega 12

Esta etapa migra únicamente **Horarios comerciales** de
`/local/configuracion`.

La pantalla conserva su diseño. Los demás bloques de configuración continúan en
el estado local del prototipo hasta sus respectivos cutovers.

## Fuente de verdad

Cuando `NEXT_PUBLIC_DATA_SOURCE=supabase`:

- `public.business_hours` es la fuente de verdad para los días persistidos;
- el servidor lee solo el `business_id` resuelto desde la sesión;
- las filas remotas reemplazan los días equivalentes del estado local;
- al guardar, se envían los siete días y PostgreSQL hace el upsert atómico.

Si un tenant todavía tiene solo algunos días sembrados, esos días se cargan desde
Supabase y los restantes conservan temporalmente el valor local. El primer guardado
completo persiste los siete.

## Autorización

La función:

```text
public.replace_business_hours(uuid, jsonb)
```

usa `SECURITY DEFINER` con `search_path` vacío, pero no confía en el llamador:

1. exige `auth.uid()`;
2. exige una membresía activa;
3. permite únicamente roles `owner` o `admin`;
4. valida siete días únicos y horarios de 30 minutos;
5. valida que dos tramos no se superpongan;
6. ejecuta todo dentro de una única transacción.

`staff` conserva lectura, pero no puede modificar horarios.

## Sin escritura directa

`authenticated` sigue sin `INSERT`, `UPDATE` ni `DELETE` sobre
`public.business_hours`. La aplicación usa una Server Action y la RPC; no agrega
políticas de escritura directa.

La RPC puede invocarse con una sesión autenticada, pero PostgreSQL repite la
validación de tenant y rol. Conocer un UUID ajeno no concede acceso.

## Dos tramos

La UI permite hasta dos tramos por día. Se almacenan así:

- `open_time`: inicio del primer tramo;
- `break_start_time`: fin del primer tramo;
- `break_end_time`: inicio del segundo tramo;
- `close_time`: fin del segundo tramo.

Con un solo tramo, ambos campos de pausa quedan en `NULL`.

## Horarios que cruzan medianoche

Un cierre numéricamente menor que la apertura pertenece al día siguiente. Por
ejemplo, `19:00–02:00` representa siete horas de atención y no un intervalo
inválido.

El selector de cierre se ordena cronológicamente desde la apertura y muestra la
leyenda `(día siguiente)` en las opciones posteriores a medianoche. El resumen
del día utiliza `(+1 día)` para evitar ambigüedades.

## Rollback

El rollback elimina solo la RPC. No elimina ni modifica horarios existentes y no
relaja RLS.

## QA

Local:

```text
npm run test:business-hours-write
npm run staging:verify-migrations
npm run qa
```

Después de aplicar la migración en staging:

```text
npm run staging:test-business-hours-write
npm run staging:test-isolation
```

La prueba remota restaura en `finally` el fixture original de A y B. No debe
ejecutarse `staging:cleanup-isolation`.
