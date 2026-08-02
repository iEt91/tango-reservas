# Matriz de acceso

| Acción | Anónimo | Staff | Admin | Owner | Soporte plataforma |
|---|---:|---:|---:|---:|---:|
| Ver contenido público publicado | Sí | Sí | Sí | Sí | Sí |
| Crear reserva/pedido público | Limitado | Sí | Sí | Sí | No por defecto |
| Ver clientes del negocio | No | Según función | Sí | Sí | Solo acceso temporal auditado |
| Operar reservas y pedidos | No | Sí | Sí | Sí | Solo soporte autorizado |
| Operar cocina | No | Sí | Sí | Sí | No por defecto |
| Ver caja y reportes financieros | No | Permiso explícito | Sí | Sí | No por defecto |
| Ajustar stock | No | Permiso explícito | Sí | Sí | No por defecto |
| Cambiar configuración | No | No | Sí | Sí | Solo soporte autorizado |
| Gestionar miembros `staff` | No | No | Sí | Sí | No por defecto |
| Gestionar admins | No | No | No | Sí | No por defecto |
| Transferir propiedad | No | No | No | Sí + MFA | Operación excepcional |
| Exportar datos | No | No | Permiso explícito + MFA | MFA | Operación excepcional |
| Eliminar negocio | No | No | No | MFA + confirmación reforzada | Operación excepcional |

## Reglas

- Todas las denegaciones se aplican en servidor y base de datos.
- Los permisos de interfaz solo mejoran UX; no son una barrera.
- Soporte no posee acceso permanente a datos de clientes.
- El acceso excepcional requiere motivo, duración, auditoría y revocación.
- Las acciones financieras y de seguridad conservan contrapartida o historial.
