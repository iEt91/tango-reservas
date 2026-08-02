# Clasificación y manejo de datos

## Pública

Ejemplos:

- nombre y descripción pública del restaurante;
- horarios publicados;
- menú, precios y galería pública.

Controles:

- modificación solo por usuarios autorizados;
- historial de publicación;
- sin secretos incrustados.

## Interna

Ejemplos:

- configuración operativa no pública;
- categorías internas;
- recetas y niveles agregados de stock.

Controles:

- acceso autenticado;
- separación por negocio;
- no incluir en respuestas públicas.

## Confidencial

Ejemplos:

- nombres, teléfonos y correos de clientes;
- reservas, alergias, notas y preferencias;
- datos de empleados;
- ventas, caja, gastos, proveedores y reportes.

Controles:

- RLS default deny;
- mínimo privilegio;
- cifrado en tránsito;
- backups protegidos;
- logs redactados;
- exportación y eliminación controladas.

## Restringida

Ejemplos:

- refresh tokens y cookies de sesión;
- service role y secretos de proveedores;
- factores y códigos MFA;
- backups completos;
- evidencia de incidentes;
- claves privadas.

Controles:

- nunca en `NEXT_PUBLIC_*`;
- nunca en repositorio ni logs;
- acceso humano excepcional;
- rotación;
- almacenamiento en gestor de secretos;
- auditoría de acceso;
- revocación inmediata ante sospecha.

## Datos que Tango no almacenará

- contraseñas en texto o hashes propios;
- números completos de tarjeta;
- CVV;
- documentos personales sin necesidad comercial aprobada.

## Retención

Antes del lanzamiento se definirá por categoría:

- período operativo;
- archivo;
- anonimización;
- eliminación;
- conservación legal aplicable.

No se conservarán datos indefinidamente por defecto.
