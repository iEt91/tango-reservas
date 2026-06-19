# Project Structure

## 1. Areas of the system

### Panel del Local

Usado por:

- el personal del negocio
- el encargado de reservas
- el equipo operativo del dia a dia

Objetivo:

- trabajar reservas
- ver calendario
- organizar el salon
- llevar CRM
- configurar horarios y reglas
- editar la web del local
- revisar reportes

### Admin Panel

Usado por:

- el dueno del SaaS
- administradores globales
- soporte interno

Objetivo:

- crear y administrar negocios
- gestionar templates y rubros
- auditar la plataforma
- ver metricas globales

### Web del Local

Usado por:

- clientes finales

Objetivo:

- ver informacion publica del negocio
- navegar la marca
- consultar horario y ubicacion
- crear reservas

## 2. Current routes

- `/`
- `/local`
- `/local/reservas`
- `/local/calendario`
- `/local/plano`
- `/local/crm`
- `/local/configuracion`
- `/local/web`
- `/local/reportes`
- `/dashboard` - compatibilidad con Panel del Local
- `/admin`
- `/admin/businesses/new`
- `/admin/businesses/[id]/edit`
- `/admin/businesses/[id]/settings`
- `/demuru`
- `/barbados`
- `/cafe-demo`

## 3. Future routes

### Panel del Local

- `/local/reservas`
- `/local/calendario`
- `/local/plano`
- `/local/crm`
- `/local/configuracion`
- `/local/web`
- `/local/reportes`

### Admin Panel

- `/admin/negocios`
- `/admin/negocios/[id]`
- `/admin/negocios/[id]/panel`
- `/admin/negocios/[id]/configuracion`
- `/admin/plantillas`
- `/admin/rubros`
- `/admin/reservas`
- `/admin/clientes`
- `/admin/reportes`

### Web del Local

- `/[slug]` por negocio
- variantes visuales por theme
- secciones publicas configurables

## 4. Panel del Local functionality

### Reservas

- Ver reservas.
- Buscar reservas.
- Filtrar por estado y fecha.
- Confirmar.
- Cancelar.
- Completar.
- Marcar no-show.
- Ver detalle simple.
- Asignar mesa a una reserva.
- Unir mesas para una reserva grande.
- Quitar o cambiar mesa asignada.
- Preparar asignacion futura de mesas multiples.
- Usa el motor interno de disponibilidad por mesas del Panel del Local.
- Comparte esa logica con Plano y Calendario.
- La web publica todavia no usa esta capa por mesas.

### Calendario

- Vista diaria operativa.
- Vista semanal basica.
- Selector de negocio y fecha.
- Filtros por estado, servicio y busqueda.
- Acciones rapidas por reserva.
- Detalle de reserva.
- Navegacion por fecha.
- Bloqueos de horarios en futuras versiones.
- Vista por servicio o profesional en el futuro.
- Preparacion para ocupacion por mesa.
- Usa la misma capa interna de disponibilidad por mesas que Reservas y Plano.
- La web publica todavia mantiene la logica por slot.

### Plano

- Modulo funcional inicial del plano del local.
- Crear mesas.
- Editar mesas.
- Eliminar mesas.
- Mover mesas en canvas.
- Definir cantidad de asientos.
- Definir estado de mesa: disponible, ocupada, reservada, bloqueada, fuera de servicio.
- Definir forma, tamano y rotacion.
- Guardar plano por negocio en local/mock.
- Resetear plano por negocio.
- Cargar imagen de fondo por negocio.
- Ajustar opacidad, brillo y contraste del fondo.
- Mostrar ocupacion por reservas unidas.
- Usa la misma capa interna de disponibilidad por mesas que Reservas y Calendario.
- Preparar futuras mesas combinadas.
- Unir mesas para reservas grandes o eventos en una version posterior.
- Separar mesas unidas en una version posterior.
- Mostrar mesas combinadas como Mesa 1-2 en el futuro.
- Calcular asientos totales de mesas unidas en el futuro.
- Mostrar ocupacion de mesas segun reservas asignadas.
- Asignar reservas a mesas.
- Calcular disponibilidad real segun mesas en el futuro.

### CRM

- Listado de clientes derivado de reservas.
- Agrupacion por telefono, email o nombre.
- Historial de reservas.
- Clasificacion comercial Nuevo/Recurrente/VIP/Riesgo.
- Notas internas.
- Preferencias.
- Etiquetas manuales.
- Sugerencias automaticas de tags.
- No-shows.
- Cancelaciones.
- Ultima visita.
- Proxima reserva.
- Total de reservas y personas acumuladas.
- Busqueda y filtros.
- Detalle de cliente.
- Gasto estimado y servicios mas usados.
- Datos locales/mock persistidos en este navegador.
- Futuras campanas o recordatorios.

### Configuracion

- Seccion funcional del Panel del Local.
- Horarios semanales por negocio.
- Servicios por negocio.
- Reglas de reserva.
- Capacidad.
- Anticipacion minima.
- Cancelaciones.
- Datos del negocio.
- Persistencia local/mock separada por negocio.

### Web

- Textos publicos.
- Fotos.
- Galeria.
- Logo.
- Colores.
- Theme.
- Redes sociales.
- Boton de WhatsApp.

### Reportes

- Reservas por dia.
- Reservas por estado.
- Horarios mas pedidos.
- Clientes recurrentes.
- Cancelaciones.
- No-show.
- Ocupacion por mesa.
- Ocupacion por franja horaria.

## 5. Future Admin Panel functionality

- Alta y edicion de negocios.
- Archivo y desarchivo de negocios.
- Gestion de templates y themes.
- Gestion de rubros.
- Panel global de reservas.
- Panel global de clientes.
- Reportes globales.
- Configuracion base del SaaS.

## 6. Future Web del Local functionality

- Textos publicos editables.
- Fotos y galeria editables.
- Logo y colores por negocio.
- Redes sociales.
- WhatsApp.
- Themes visuales por cliente.
- CTA de reserva.

## 7. Architecture rules

- No mezclar logica de reservas con diseno de web publica.
- No duplicar logica por theme.
- El Panel del Local no debe tener funciones de superadmin.
- El Admin puede acceder al Panel del Local.
- La Web publica solo muestra informacion publica y permite crear reservas.
- La logica comun debe vivir en capas reutilizables.
- La logica de disponibilidad debe poder evolucionar desde capacidad por slot a disponibilidad por mesas o plano.

## 8. Future table model

### Table / FloorTable

- `id`
- `businessId`
- `label`
- `seats`
- `x`
- `y`
- `width`
- `height`
- `rotation`
- `status`: `available | occupied | reserved | blocked | out_of_service`
- `isJoinable`
- `joinedWith` optional
- `createdAt`
- `updatedAt`

### JoinedTable

- `id`
- `businessId`
- `tableIds`
- `label` - example: `Mesa 1-2`
- `totalSeats`
- `reservationId` optional
- `status`
- `createdAt`
- `updatedAt`

### Future layout rule

- Mesa 1 + Mesa 2 = Mesa 1-2
- Los asientos totales son la suma de ambas mesas
- La disponibilidad futura debe poder calcular si existe una mesa o combinacion de mesas para X personas en un horario

## 9. Future actions

- Confirmar varias reservas.
- Cancelar varias reservas.
- Exportar reservas.
- Imprimir lista del dia.
