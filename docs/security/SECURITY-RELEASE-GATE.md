# Puerta de seguridad para release

Una release es bloqueada cuando se cumple cualquiera de estas condiciones:

- vulnerabilidad crítica o alta explotable;
- tabla privada expuesta sin RLS;
- prueba de acceso cruzado fallida;
- staging y producción comparten project ref;
- una migración no coincide con su manifiesto SHA-256;
- secreto encontrado en Git o artefactos;
- service role alcanzable desde cliente;
- dependencia crítica alcanzable sin mitigación;
- backup o restauración no verificados;
- MFA administrativo pendiente;
- endpoint público sin rate limiting antes de producción;
- flujo financiero no transaccional o no idempotente;
- logs con tokens o datos personales innecesarios.

## Evidencias obligatorias

- `npm run qa`;
- `npm run security:audit` en CI;
- Security Gate de GitHub verde;
- CodeQL sin alertas críticas/altas abiertas;
- `npm run staging:verify-migrations`;
- `npm run staging:preflight`;
- pruebas RLS con dos negocios;
- postflight SQL sin excepciones;
- escaneo dinámico de staging;
- restauración de backup;
- revisión de secretos;
- checklist de entorno;
- pentest o revisión independiente antes de datos reales.

## Excepciones

Una excepción:

- nunca puede cubrir severidad crítica;
- debe tener propietario;
- debe indicar compensación;
- debe tener fecha de vencimiento;
- debe estar aprobada antes del despliegue.
