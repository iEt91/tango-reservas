# Entornos remotos de Tango Reservas

## Producción

- Proyecto: `tango-resto`.
- Project ref: `yzkeugxygfdgzhlwdeek`.
- El Dashboard lo identifica como `main / PRODUCTION`.
- Está prohibido ejecutar seeds, cleanup, fixtures, pruebas de aislamiento con escritura o restauraciones sobre este proyecto.

## Staging

Actualmente no hay un proyecto staging confirmado. Para habilitarlo, crear un proyecto Supabase separado, colocar su ref y sus claves sólo en `.env.staging.local`, y mantener `TANGO_PRODUCTION_PROJECT_REF=yzkeugxygfdgzhlwdeek`.

Los scripts remotos rechazan explícitamente el ref de producción aunque una configuración local lo etiquete por error como staging. Hasta que exista ese proyecto aislado, las pruebas remotas de escritura quedan bloqueadas por diseño.

## Desarrollo local

El uso diario se ejecuta localmente con `npm run dev` o `npm run start`. Si se conecta a Supabase, debe usar `NEXT_PUBLIC_DATA_SOURCE=supabase`; en `NODE_ENV=production` una fuente distinta falla de forma explícita y no cambia a `localStorage` silenciosamente.
