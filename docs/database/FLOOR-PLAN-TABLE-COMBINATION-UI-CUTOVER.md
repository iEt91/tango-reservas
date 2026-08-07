# Plano V2 — combinación persistente de mesas

## Alcance de la Entrega 24

E24 permite asignar una reserva activa a una o varias mesas persistentes
desde `/local/plano`.

La combinación es operativa:

- cada mesa conserva su UUID y geometría;
- una reserva mantiene varias filas en
  `reservation_table_assignments`;
- la capacidad se calcula como la suma de las mesas;
- cada mesa muestra la misma reserva durante el horario correspondiente;
- liberar la reserva elimina todas sus asignaciones activas.

E24 no crea una mesa sintética ni fusiona físicamente el mobiliario.

## Backend reutilizado

La operación continúa usando:

- `setBusinessReservationTablesAction`;
- `set_business_reservation_tables`;
- `private.validate_reservation_table_selection`;
- la migración `010`, ya aplicada.

PostgreSQL valida de forma transaccional:

- tenant y membresía;
- estado activo de la reserva;
- estado activo y disponible de cada mesa;
- regla `allow_table_combinations`;
- atributo `can_join`;
- capacidad total;
- reservas superpuestas;
- límite máximo de 20 mesas.

## Configuración

El snapshot V2 incorpora `allowTableCombinations` desde
`reservation_rules.allow_table_combinations`.

Cuando está desactivado:

- la interfaz permite una sola mesa;
- intentar sumar otra mesa falla cerrado;
- PostgreSQL mantiene la misma validación canónica.

Si la configuración persistente no está disponible, el modo Supabase usa
`false` como valor seguro.

El fallback local conserva combinaciones habilitadas para no romper el
prototipo anterior.

## Selección de mesas

Al abrir **Asignar reserva**:

1. la mesa actualmente seleccionada queda marcada;
2. se muestran las mesas visibles del tenant;
3. mesas bloqueadas, reservadas u ocupadas no pueden seleccionarse;
4. una combinación exige que todas tengan `canJoin`;
5. la selección debe conservar al menos una mesa;
6. se muestra cantidad de mesas y capacidad total.

La UI realiza comprobaciones preventivas, pero no reemplaza las reglas del
backend.

## Asignación

Al confirmar una reserva:

- se envía el UUID de la reserva;
- se envía el arreglo de UUID de mesas seleccionadas;
- la UI espera `{ ok: true }`;
- usa las etiquetas combinadas devueltas por su selección local;
- actualiza la pantalla solo después del éxito;
- evita dobles envíos.

## Liberación

Al liberar desde cualquiera de las mesas combinadas, se envía
`tableIds: []`.

La reserva se conserva y todas sus asignaciones se eliminan de forma
transaccional.

## Unión visual

La función local **Unir mesas** continúa bloqueada en Supabase.

E24 no:

- reemplaza varias mesas por una mesa visual;
- mueve mesas automáticamente;
- altera geometría;
- modifica capacidades físicas;
- guarda agrupaciones visuales permanentes.

La unión visual requeriría un modelo propio de layout y no debe simularse
con datos que el esquema actual no representa.

## Seguridad

- `owner`, `admin` y `staff` pueden asignar y liberar.
- La lectura continúa aislada por RLS.
- La Server Action vuelve a resolver el negocio activo.
- El navegador no escribe directamente en Supabase.
- No se exponen detalles internos de PostgreSQL.

## Base de datos

E24 no agrega ni aplica migraciones.

No volver a aplicar la migración `010`.

## Prueba manual requerida

Conservar fixtures A/B:

1. En A, confirmar que Configuración permite unir mesas.
2. Crear dos mesas temporales combinables:
   `QA E24 A1` y `QA E24 A2`.
3. Crear o usar una reserva sin mesa cuya cantidad supere la capacidad de
   una mesa, pero no la suma de ambas.
4. Abrir **Asignar reserva** desde `QA E24 A1`.
5. Seleccionar `QA E24 A1` y `QA E24 A2`.
6. Confirmar que la capacidad total es suficiente.
7. Asignar y recargar.
8. Confirmar que ambas mesas muestran la misma reserva.
9. Liberar desde una de las dos y recargar.
10. Confirmar que ambas quedan libres y la reserva sigue existiendo sin
    mesa.
11. Desactivar temporalmente combinaciones en Configuración y confirmar
    que la UI no permite sumar una segunda mesa; restaurar luego el valor.
12. Confirmar que una mesa con `canJoin` desactivado no puede sumarse.
13. Eliminar las mesas temporales.
14. Ingresar como B y confirmar que sus fixtures siguen intactos.

No ejecutar `staging:cleanup-isolation`.

## Corrección de validación manual

### Propiedad `canJoin`

El editor de alta y edición muestra **Permitir unir con otras mesas**.

- **Permitido** guarda `can_join = true`.
- **No permitido** guarda `can_join = false`.
- El valor predeterminado para una mesa nueva es **Permitido**.
- PostgreSQL sigue siendo la autoridad final.

Una mesa que participa en una combinación activa no puede cambiarse a
**No permitido** mientras esa asignación siga vigente.

### Mesas con reservas activas

`Isolation Table A` forma parte del fixture persistente y tiene asignada
`Isolation Customer A`.

La reserva se crea para el próximo lunes a las 14:00. Por eso la mesa
puede verse libre en otro día u horario, pero PostgreSQL impide bloquearla
o marcarla fuera de servicio mientras conserve esa asignación activa.

La interfaz ahora muestra:

`La mesa tiene una reserva activa y no puede bloquearse ni marcarse fuera de servicio.`

Esta protección proviene del trigger
`floor_tables_validate_assignments`.

### Limitación actual de `/local/reservas`

La pantalla `/local/reservas` todavía usa el prototipo local y
`localStorage`.

Crear o confirmar una reserva allí no crea una fila en la tabla
`reservations` de Supabase. Por lo tanto, esa reserva local no puede
aparecer en `/local/plano`, que ya utiliza la lectura persistente.

El corte persistente de la UI de reservas queda fuera de E24.

### Procedimiento correcto para probar E24

No crear una reserva en `/local/reservas`.

Usar la reserva persistente del fixture A:

1. Entrar con A.
2. Abrir el próximo lunes a las 14:00 en `/local/plano`.
3. Confirmar que `Isolation Table A` muestra `Isolation Customer A`.
4. Liberar la reserva desde `Isolation Table A`.
5. Crear o editar `QA E24 A1` con capacidad 1 y unión permitida.
6. Crear o editar `QA E24 A2` con capacidad 1 y unión permitida.
7. Abrir la asignación desde `QA E24 A1`.
8. Seleccionar `QA E24 A1` y `QA E24 A2`.
9. Confirmar 2 mesas, capacidad total 2 y combinaciones permitidas.
10. Asignar `Isolation Customer A`.
11. Recargar y confirmar que ambas mesas muestran la misma reserva.
12. Liberar desde cualquiera de las dos mesas.
13. Recargar y confirmar que ambas quedan libres.
14. Volver a asignar `Isolation Customer A` únicamente a
    `Isolation Table A`.
15. Recargar y comprobar que el fixture original quedó restaurado.
16. Cambiar temporalmente `QA E24 A2` a **No permitido** y comprobar que
    no puede sumarse a una combinación.
17. Restaurar **Permitido**.
18. Eliminar `QA E24 A1` y `QA E24 A2`.
19. Verificar B sin modificar sus fixtures.

No bloquear, eliminar ni modificar permanentemente `Isolation Table A`.

No ejecutar `staging:cleanup-isolation`.
