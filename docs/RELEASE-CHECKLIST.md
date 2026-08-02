# Checklist de release

## Repositorio

- [ ] `main` está limpio y sincronizado.
- [ ] `npm ci` funciona desde una carpeta nueva.
- [ ] `npm run qa` aprobado.
- [ ] GitHub Actions aprobado.
- [ ] No hay secretos ni archivos `.env` versionados.
- [ ] Tag y changelog preparados.

## Base de datos

- [ ] Migraciones ejecutadas desde cero en staging.
- [ ] Migraciones probadas sobre una copia de datos existente.
- [ ] RLS activo en tablas privadas.
- [ ] Pruebas de acceso cruzado aprobadas.
- [ ] Índices de consultas críticas presentes.
- [ ] Funciones transaccionales revisadas.
- [ ] Backup automático activo.
- [ ] Restauración completa ensayada.

## Autenticación

- [ ] Inicio y cierre de sesión.
- [ ] Recuperación de contraseña.
- [ ] Sesión persistente.
- [ ] Usuario deshabilitado pierde acceso.
- [ ] Roles owner, admin y staff verificados.
- [ ] Rutas privadas redirigen correctamente.

## Reservas

- [ ] Alta pública.
- [ ] Alta manual.
- [ ] Edición y cancelación.
- [ ] No-show y completado.
- [ ] Mesas combinadas.
- [ ] Concurrencia sin overbooking.
- [ ] Tracking público sin fuga de datos.
- [ ] Horarios y reglas correctos.

## Menú, stock y cocina

- [ ] Menú visible según disponibilidad.
- [ ] Recetas vinculadas por ID.
- [ ] Conversión de unidades correcta.
- [ ] Venta descuenta una sola vez.
- [ ] Cancelación devuelve exactamente.
- [ ] Comandas parciales funcionan.
- [ ] Dos dispositivos ven el mismo estado.
- [ ] Reconciliación de stock aprobada.

## Pagos, caja y gastos

- [ ] Efectivo, tarjeta, Mercado Pago y transferencia.
- [ ] Pago mixto conserva el desglose.
- [ ] Reintento no duplica cobro.
- [ ] Apertura y cierre de caja.
- [ ] Retiros y ajustes auditados.
- [ ] Gastos incluidos correctamente.
- [ ] Reportes coinciden con operaciones.

## Web pública

- [ ] Dominio y SSL.
- [ ] Contenido publicado.
- [ ] Menú y galería.
- [ ] Reserva y pedido.
- [ ] Imágenes desde Storage.
- [ ] Responsive móvil y escritorio.
- [ ] SEO y metadatos básicos.
- [ ] Páginas de error correctas.

## Operación

- [ ] Staging separado de producción.
- [ ] Monitoreo de errores.
- [ ] Alertas de disponibilidad.
- [ ] Logs sin datos sensibles.
- [ ] Procedimiento de incidentes.
- [ ] Manual de rollback.
- [ ] Soporte y responsable definidos.

## Comercial

- [ ] Cuenta demo.
- [ ] Datos demo realistas.
- [ ] Landing page.
- [ ] Precio inicial.
- [ ] Alcance y exclusiones.
- [ ] Onboarding documentado.
- [ ] Manual rápido.
- [ ] Términos de uso.
- [ ] Política de privacidad.
- [ ] Canal de contratación y soporte.

## Aprobación final

- [ ] Cero P0 abiertos.
- [ ] P1 aceptados y documentados.
- [ ] Piloto completado.
- [ ] Backup y restauración verificados.
- [ ] Release candidate sin cambios durante 24 horas.
- [ ] Aprobación de lanzamiento.
