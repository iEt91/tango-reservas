# Línea base de seguridad

## Objetivo

Aplicar defensa en profundidad alineada con OWASP ASVS nivel 2 y elevar controles
de identidad, autorización, datos y operaciones financieras.

## Controles implementados en esta entrega

- headers defensivos globales;
- no-cache y noindex en autenticación y seguridad;
- ocultación del header `X-Powered-By`;
- cuarentena de service role en servidor;
- `.env*` ignorados con plantillas permitidas;
- detección local de secretos y APIs peligrosas;
- validación de variables;
- CI con QA y auditoría;
- Dependabot y CODEOWNERS;
- modelo de amenazas, clasificación, permisos e incidentes.

## Controles todavía pendientes

- MFA para owner/admin;
- política explícita de expiración y revocación de sesiones;
- CSP completa con nonce o SRI;
- CAPTCHA y cobertura de rate limiting para reservas públicas; los pedidos públicos
  ya tienen límite atómico en base de datos;
- sanitización y política de uploads;
- auditoría inmutable;
- cifrado y restauración de backups;
- DAST sobre staging;
- pentest independiente.

## Estado de RLS y funciones privilegiadas

Las tablas operativas permanecen con RLS y `FORCE RLS`. Algunas no tienen políticas
directas porque operan con bloqueo por defecto y RPCs controladas. El Security
Advisor marca las funciones `SECURITY DEFINER` ejecutables por usuarios autenticados:
son parte de la arquitectura de RPC y cada una requiere control de identidad,
membresía y alcance por negocio. Esto se revisa en cada migración y no debe
suprimirse como advertencia genérica.

Esta entrega no declara al sistema listo para producción. Crea controles que impiden
avanzar silenciosamente con patrones inseguros.
