## Cambio

Describe el objetivo y el alcance.

## QA

- [ ] `npm run qa`
- [ ] `npm run security:audit`
- [ ] QA manual documentado cuando corresponde

## Seguridad

- [ ] No agrega secretos ni datos reales
- [ ] No confía en IDs enviados por el cliente para autorizar
- [ ] RLS y roles fueron revisados si cambia acceso a datos
- [ ] Operaciones críticas son transaccionales e idempotentes
- [ ] Logs y errores no exponen datos sensibles
- [ ] El lockfile fue revisado si cambian dependencias

## Rollback

Explica cómo revertir el cambio sin perder datos.
