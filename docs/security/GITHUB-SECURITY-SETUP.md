# Configuración de seguridad en GitHub

Después de publicar esta entrega:

1. Activar GitHub Private Vulnerability Reporting.
2. Activar Dependabot alerts y security updates.
3. Activar CodeQL default setup para JavaScript/TypeScript.
4. Seleccionar la suite `security-extended`.
5. Activar secret scanning y push protection cuando el plan lo permita.
6. Bloquear force push y eliminación de `main`.
7. Antes de producción, adoptar ramas y PR obligatoria para cambios de seguridad.

## Security Gate

`.github/workflows/security-gate.yml` ejecuta:

- instalación reproducible con `npm ci`;
- escaneo estático local;
- validación de entorno;
- QA completo;
- `npm audit` para dependencias de producción.

No contiene secretos ni usa permisos de escritura.

## Dependabot

`.github/dependabot.yml` revisa npm y GitHub Actions semanalmente. Las actualizaciones
no deben fusionarse automáticamente: primero deben pasar QA y revisión del lockfile.

## CODEOWNERS

Los archivos de autenticación, seguridad, migraciones, workflows y configuración
requieren revisión del propietario indicado en `.github/CODEOWNERS`.
