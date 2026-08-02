# Modelo de amenazas

## Activos críticos

1. Datos de clientes: nombre, teléfono, correo, preferencias y reservas.
2. Datos del negocio: caja, pagos, gastos, ventas, stock y configuración.
3. Identidad: sesiones, factores MFA, membresías y roles.
4. Secretos: service role, claves del hosting, correo y proveedores.
5. Disponibilidad: panel, web pública, reservas y pedidos.
6. Integridad: relación entre ventas, caja, stock, cocina y reportes.

## Límites de confianza

- Navegador público ↔ aplicación Next.js.
- Usuario autenticado ↔ Proxy y Server Components.
- Aplicación ↔ Supabase Auth.
- Aplicación ↔ PostgreSQL y RLS.
- Aplicación ↔ Storage.
- CI/CD ↔ repositorio y entorno de producción.
- Soporte de plataforma ↔ datos de cada negocio.

## Amenazas prioritarias

| Amenaza | Impacto | Control obligatorio |
|---|---:|---|
| Acceso cruzado entre negocios | Crítico | `business_id`, RLS default deny y pruebas negativas |
| Exposición de service role | Crítico | Solo servidor, escaneo de secretos y rotación |
| Elevación de `staff` a `admin/owner` | Crítico | RPC controlada, auditoría y MFA |
| Robo o reutilización de sesión | Alto | Cookies seguras, expiración, revocación y MFA |
| Reserva o pago duplicado | Alto | Idempotencia y transacciones |
| XSS mediante contenido del negocio | Alto | Validación, codificación de salida y CSP |
| Abuso de endpoints públicos | Alto | Rate limiting, CAPTCHA y validación de servidor |
| Archivo malicioso | Alto | MIME, tamaño, bucket y nombre aleatorio |
| Dependencia comprometida | Alto | Lockfile, `npm ci`, auditoría y CodeQL |
| Backup inaccesible o expuesto | Crítico | Cifrado, acceso mínimo y restauración ensayada |
| Error interno con datos sensibles en logs | Alto | Redacción y clasificación de eventos |

## Supuestos que nunca autorizan

- Un identificador enviado por el cliente no demuestra pertenencia.
- Estar autenticado no concede acceso a todos los negocios.
- Ocultar un botón no constituye autorización.
- Una URL difícil de adivinar no es un control de acceso.
- Una anon key no reemplaza RLS.
- HTTPS no reemplaza validación, permisos ni cifrado de backups.

## Riesgo residual aceptable

Solo se acepta riesgo residual documentado de severidad baja o moderada. Los riesgos
críticos y altos relacionados con confidencialidad, integridad financiera,
autorización o recuperación bloquean el lanzamiento.
