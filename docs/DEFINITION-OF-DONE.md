# Definition of Done

Una tarea no está terminada porque la pantalla se vea correcta. Debe cumplir los criterios correspondientes a su nivel.

## DoD de una tarea

- Requisito y resultado esperado definidos.
- Código sin errores de lint ni TypeScript.
- Estados de carga, vacío, éxito y error resueltos cuando aplican.
- Validación en cliente y servidor.
- Errores externos manejados sin perder datos.
- No introduce una segunda fuente de verdad.
- Prueba automática añadida o actualizada.
- QA manual documentado.
- `npm run qa` aprobado.
- Commit pequeño, comprensible y reversible.

## DoD de un módulo migrado

- PostgreSQL/Supabase es la fuente de verdad.
- `localStorage` no contiene datos operativos canónicos.
- Todas las tablas privadas incluyen `business_id`.
- RLS impide acceso entre negocios.
- Roles aplicados a lectura, escritura y acciones destructivas.
- Escrituras críticas son transaccionales e idempotentes.
- Dos dispositivos observan el mismo estado.
- Los errores de red permiten reintento seguro.
- Existe procedimiento de importación desde el almacenamiento anterior.
- Existe prueba de regresión y al menos un flujo E2E.
- Backup y restauración incluyen los datos del módulo.
- Auditoría registra acciones críticas.

## DoD de una operación financiera

- El total cobrado coincide con la suma de asignaciones de pago.
- Un pago mixto conserva cada medio por separado.
- Reintentar la operación no duplica ingresos ni movimientos.
- Caja e historial usan la misma operación de origen.
- Cancelar o revertir deja una contrapartida auditable.
- No se permite editar silenciosamente una caja cerrada.

## DoD de una operación de stock

- Cada cambio genera un movimiento.
- Venta, devolución, ajuste y merma tienen tipos diferentes.
- La referencia a reserva, pedido o ajuste se conserva.
- La unidad se normaliza antes de calcular.
- Reintentar no duplica el movimiento.
- El saldo nunca diverge del ledger de movimientos.
- La reversión devuelve exactamente la cantidad aplicada.

## DoD de reservas

- Disponibilidad calculada en el servidor.
- No hay overbooking bajo concurrencia.
- Edición ignora la propia reserva y vuelve a validar conflictos.
- Cancelación libera la ocupación.
- Estados y timestamps son consistentes.
- Reserva pública aparece en el panel.
- Tracking público no expone datos privados.
- Horarios, anticipación, ventana y duración respetan configuración.

## DoD de seguridad

- Autenticación real.
- Sesión persistente y revocable.
- Service role nunca se expone al navegador.
- RLS habilitado en tablas privadas.
- Pruebas negativas verifican acceso cruzado.
- Acciones de propietario no están disponibles para `staff`.
- Secretos no están versionados.
- Logs no contienen datos sensibles innecesarios.

## DoD de release vendible

- Todos los P0 terminados.
- Cero defectos P0 abiertos.
- Defectos P1 conocidos documentados y aceptados.
- QA completo y E2E críticos aprobados.
- Staging y producción reproducibles.
- Backup automático activo.
- Restauración ensayada.
- Monitoreo y alertas activos.
- Dominio y SSL correctos.
- Cuenta demo lista.
- Onboarding probado desde cero.
- Manual, soporte, términos y privacidad disponibles.
- Rollback documentado y probado.
- Tag y changelog creados.

## Defectos bloqueantes P0

- Pérdida o corrupción de datos.
- Acceso de un negocio a otro.
- Duplicación de pagos o movimientos de stock.
- Overbooking reproducible.
- Caja o reportes con importes inconsistentes.
- Imposibilidad de iniciar sesión o recuperar acceso.
- Reserva o pedido público que no llega al panel.
- Restauración de backup fallida.
- Error que impide operar un flujo principal.
