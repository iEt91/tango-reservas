# Respuesta ante incidentes

## Severidad

### P0 — crítica

- fuga o acceso cruzado;
- secreto privilegiado expuesto;
- corrupción financiera;
- toma de cuenta administrativa;
- backup público o irrecuperable.

Acción: detener despliegues, contener, revocar, preservar evidencia y evaluar
notificación a afectados.

### P1 — alta

- autorización incorrecta sin evidencia de explotación;
- XSS explotable;
- bypass de rate limiting con impacto;
- dependencia crítica alcanzable.

Acción: congelar release y corregir antes de continuar.

## Procedimiento

1. Detectar y registrar hora, entorno y evidencia.
2. Contener sin destruir logs.
3. Revocar sesiones y rotar secretos afectados.
4. Deshabilitar temporalmente la función vulnerable.
5. Determinar alcance por negocio, usuario y período.
6. Corregir con prueba de regresión.
7. Restaurar servicio de forma gradual.
8. Notificar cuando corresponda.
9. Elaborar postmortem sin culpabilización.
10. Añadir controles para evitar repetición.

## Kit mínimo

- contactos de hosting, Supabase y GitHub;
- inventario de secretos;
- procedimiento de rotación;
- acceso a backups;
- release anterior y rollback;
- logs con reloj sincronizado;
- plantilla de comunicación.

## Evidencia

Nunca copiar datos personales completos al issue o chat. Usar IDs, hashes o muestras
redactadas. La evidencia debe tener acceso limitado y fecha de eliminación.
