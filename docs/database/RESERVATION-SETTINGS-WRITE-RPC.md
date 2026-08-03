# Escritura segura de reglas de reservas

## Alcance de la Entrega 13

Esta etapa migra el bloque **Reglas de reservas** de
`/local/configuracion` a Supabase. Conserva el diseño actual y mantiene locales
los bloques de datos del negocio, envíos, notificaciones y usuarios.

## Corrección del modelo

Los campos existentes no se reutilizan con significados incorrectos:

- `slot_duration_minutes` sigue siendo el intervalo entre horarios disponibles;
- `max_reservations_per_slot` sigue contando reservas;
- `default_reservation_duration_minutes` representa la duración estándar;
- `max_people_per_slot` representa personas, no reservas.

Se agregan también los flags exactos usados por la UI:

- `reservations_enabled`;
- `allow_reservations_without_table`;
- `auto_assign_reservation_tables`;
- `allow_table_combinations`.

## Guardado atómico

La función:

```text
public.save_reservation_configuration(uuid, jsonb, jsonb)
```

guarda horarios y reglas dentro de una misma transacción. Si cualquier dato es
inválido, ninguna de las dos partes queda modificada.

La función:

1. exige una sesión autenticada;
2. obtiene autorización mediante `private.has_business_role`;
3. permite únicamente `owner` o `admin`;
4. valida rangos y tipos;
5. reutiliza `replace_business_hours`;
6. hace upsert de una única fila de reglas por negocio.

## Confirmación y estado inicial

La UI conserva ambos selectores, pero se sincronizan para impedir estados
contradictorios:

- confirmación manual implica estado inicial pendiente;
- confirmación automática implica estado inicial confirmado.

La base persiste `requires_confirmation`; el estado inicial se deriva de ese
valor y no se duplica.

## Límites

- duración estándar: 60, 90, 120 o 150 minutos;
- anticipación: 0 a 168 horas, en pasos de 30 minutos;
- ventana de reservas: 1 a 365 días;
- capacidad: 1 a 1000 personas por horario.

Los límites se validan en TypeScript, en la RPC y mediante constraints SQL.

## Aislamiento

`authenticated` conserva solo lectura directa sobre `reservation_rules`. Las
escrituras directas y las políticas DML siguen bloqueadas. Conocer el UUID de
otro negocio no permite modificarlo.

## Rollback

El rollback elimina la RPC, constraints y columnas nuevas. No elimina filas de
reglas, horarios, negocios ni fixtures de aislamiento.

## Pendiente

La web pública y el motor completo de disponibilidad aún deben cortar su lectura
a estas reglas remotas. Esta entrega migra la edición administrativa y establece
el contrato persistente; no declara finalizada la migración de reservas.

## QA

```text
npm run test:reservation-settings-write
npm run staging:verify-migrations
npm run qa
```

Después de aplicar la migración `006` en staging:

```text
npm run staging:test-reservation-settings-write
npm run staging:test-isolation
```

La prueba remota restaura horarios y reglas de A y B en `finally`. No debe
ejecutarse `staging:cleanup-isolation`.
