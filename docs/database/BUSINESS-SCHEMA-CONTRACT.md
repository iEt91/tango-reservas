# Contrato de `public.businesses`

## Fuente de verdad

El contrato versionado de `public.businesses` es la migración:

```text
supabase/migrations/20260802_001_initial_schema_lockdown.sql
```

El adaptador TypeScript debe consultar y escribir exclusivamente las columnas
de esa migración.

## Columnas eliminadas del adaptador

Estas columnas nunca formaron parte del esquema versionado ni de staging:

- `google_maps_embed_url`;
- `auto_confirm_reservations`;
- `public_template_id`.

No deben agregarse a PostgreSQL para conservar compatibilidad con código legado.

## Equivalencias correctas

- El mapa principal utiliza `google_maps_url`.
- El diseño público utiliza `theme_id`.
- Logo, portada, colores, textos y visibilidad utilizan sus columnas reales.
- La confirmación automática de reservas no se persiste en `businesses`.

`autoConfirmReservations` conserva temporalmente el valor por defecto del
prototipo. Su persistencia debe definirse dentro del módulo de reglas de reserva,
sin duplicar configuración en dos tablas.

## Escrituras

El adaptador conserva sus funciones históricas para no romper imports, pero RLS
continúa bloqueando escrituras directas desde el navegador. La futura escritura
operativa debe pasar por una operación servidora con validación de rol y
auditoría.

Esta corrección no concede `INSERT`, `UPDATE` ni `DELETE`.

## Validación

```text
npm run test:business-schema-contract
```

La prueba comprueba que:

- el select coincide con la migración;
- no se solicitan columnas inexistentes;
- los campos visuales no se descartan;
- los textos vacíos respetan columnas `NOT NULL`;
- el test forma parte de `npm run qa`.

## Consumidores del contrato

El contrato también se aplica a los módulos que consumen `SupabaseBusinessRow`:

- `publicWeb.ts` convierte `theme_id` al identificador visual público:
  - `restaurant_elegant` → `restaurant-elegant`;
  - `beach_club_dark` → `compact-premium`;
  - `cafe_minimal` → `minimal-cafe`.
- `reservations.ts` deriva la confirmación automática desde
  `reservation_rules.requires_confirmation`.
- Si las reglas no están disponibles, una reserva queda pendiente; no se
  autoconfirma por omisión.
- `BUSINESS_SELECT` permanece como literal TypeScript para que Supabase pueda
  inferir el resultado y no produzca `GenericStringError`.

No se agregan columnas duplicadas ni se modifica RLS.
