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

- RLS en todas las tablas privadas;
- MFA para owner/admin;
- expiración y revocación de sesiones;
- CSP completa con nonce o SRI;
- rate limiting y CAPTCHA;
- sanitización y política de uploads;
- auditoría inmutable;
- cifrado y restauración de backups;
- DAST sobre staging;
- pentest independiente.

Esta entrega no declara al sistema listo para producción. Crea controles que impiden
avanzar silenciosamente con patrones inseguros.
