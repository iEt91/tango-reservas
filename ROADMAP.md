# Roadmap

## Etapa 1 - Panel del Local

### v4.8-crm-lab Refino visual final de CRM lab

- `/local/crm-lab` ajusta la tabla izquierda, simplifica filtros, mejora la ficha derecha de Valeria del Mar, reemplaza Actividad reciente por Historial de reservas y deja Consumos y preferencias ocupando todo el ancho inferior;
- se reutiliza el shell premium comun de `/local?business=demuru` sin tocar la ruta real `/local/crm`;
- la pantalla usa mock data local para clientes, detalle y actividad sin conectar Supabase.

### v5.3.0-plano-lab Laboratorio visual del plano

- `/local/plano-lab` reconstruye visualmente el blueprint de Plano como maqueta aislada;
- se reutiliza el shell premium comun de `/local?business=demuru` sin tocar la ruta real `/local/plano`;
- se usan mesas mock, panel de seleccion, metricas y ocupacion por horario sin conectar logica real.

### v5.2.1-calendario-lab Ajuste de agenda del laboratorio de Calendario

- `/local/calendario-lab` sigue siendo una maqueta visual aislada basada en la captura de Calendario;
- la agenda del dia usa slots fijos de 08:00 a 24:00 y agrupa reservas mock por franja horaria de 60 minutos;
- se conserva el shell premium comun del Panel del Local y no se toca la ruta real `/local/calendario`.

### v5.1.6-reservas-lab-fix Shell bueno y ocupacion completa del laboratorio

- `/local/reservas-lab` reutiliza el sidebar y la topbar buenos de `/local?business=demuru`;
- se corrige la burbuja de notificaciones, se quitan los chips del header y se agranda `Ocupación de hoy`;
- la pantalla sigue siendo una maqueta visual aislada con mock data fija y no toca la ruta operativa `/local/reservas`.

### v5.1.4-reservas-lab Tabla compacta del laboratorio de reservas

- `/local/reservas-lab` compacta el listado de reservas para verse como una tabla horizontal realista;
- las acciones quedan alineadas a la derecha en una sola linea y el panel derecho se ve completo;
- la pantalla sigue siendo una maqueta visual aislada con mock data fija y no toca la ruta operativa `/local/reservas`.

### v5.1.3-reservas-lab Reserva visual aislada

- se crea `/local/reservas-lab` como maqueta visual aislada del blueprint `2-reservas.png`;
- la pagina usa mock data fija y no toca la logica real, Supabase ni la ruta operativa `/local/reservas`;
- la version visible del sistema sube a `v5.1.3-reservas-lab`.

### v5.1.2-reservas Ajuste estructural visual en Reservas

- `/local/reservas` se alinea mas al blueprint `2-reservas.png`;
- se elimina la card vertical de fecha y se compactan header, metricas y filtros;
- se mueve `Agrupar por` al encabezado del listado y se compacta la tabla;
- se preserva la logica real de reservas, disponibilidad, mesas, `business` y `mode=support`.

### v5.4.0-crm CRM con shell premium comun

- `/local/crm` adopta la referencia visual aprobada de CRM sobre el shell premium comun;
- se corrigen textos rotos y se preserva la logica real de clientes, filtros, notas y edicion;
- se mantienen `business` y `mode=support` en la navegacion del shell;
- `/local/design-lab` sigue siendo la referencia visual aprobada para el resto del panel.

### v5.1.0-reservas Reservas con shell premium comun

- `/local/reservas` adopta la referencia visual aprobada de Reservas sobre el shell premium comun;
- se corrigen textos rotos y se mantiene la logica real de reservas, disponibilidad y mesas;
- se preservan `business` y `mode=support` en la navegacion del shell;
- `/local/design-lab` sigue siendo la referencia visual aprobada para el resto del panel.

### v5.1.0 Redisenio visual de Reservas

- `/local/reservas` adopta el blueprint visual de la captura "Reservas - Demuru";
- la pagina conserva la logica real de reservas, disponibilidad, negocio y modo soporte;
- el sistema visual premium de `/local/design-lab` sirve como base de referencia sin romper otras rutas;
- por ahora no se redisenian Calendario, Plano, CRM, Configuracion, Menu, Web ni Reportes.
### v5.0.2-design-lab Ajuste de overflow y grafico de la maqueta estatica

- se corrigen los overflows de las metricas superiores y se reorganiza su contenido;
- la tarjeta de Próxima reserva y la de Ocupación de hoy quedan compactas y dentro de sus limites;
- se expande la fila inferior para que Acciones rápidas quede completa;
- se rehace el gráfico de Ocupación por franja horaria y se elimina el tooltip flotante;
- la maqueta estatica sigue aislada y sin tocar la logica real.

### v5.0.1-design-lab Ajuste de overflow de la maqueta estatica

- se eliminan scrolls desktop y se compactan las metricas superiores de `/local/design-lab`;
- la card de ocupacion mantiene el donut dentro del panel, sin overflow;
- el CTA de "Ver todas las reservas de hoy" sube al header de la card de reservas;
- las acciones rapidas quedan centradas y sin texto cortado;
- la maqueta estatica sigue aislada y sin tocar la logica real.

### v5.0.0-design-lab Maqueta estatica del Panel Local

- se crea `/local/design-lab` como una maqueta estatica aislada basada en ingenieria inversa visual de la captura mock;
- la pagina replica la composicion del dashboard premium sin usar Supabase ni tocar la logica real;
- se usan componentes visuales nuevos para sidebar, topbar, metricas, tabla, plano, grafico, actividad, clientes y acciones rapidas;
- sirve como base de referencia para migrar luego el Panel Local real por etapas.

### v5.0.0 Reconstruccion visual del Panel Local

- se reconstruye `/local` desde una lectura visual de la captura mock de referencia para acercarse mucho mas al dashboard premium deseado;
- la sidebar fija, la topbar interna y la composicion de cards, tabla, plano, grafico, actividad, clientes y acciones rapidas se alinean con la referencia;
- se mantiene intacta la logica critica y se preservan las rutas locales, `business` y `mode=support`;

### v4.9.2 Rediseño visual del Panel Local

- se rehace `/local` para acercarlo mucho mas a la referencia visual adjunta con sidebar fija, topbar interna y scroll vertical en el main;
- se ajustan cards, tabla, mini plano, grafico, actividad, clientes y acciones rapidas para una composicion premium mas fiel;
- se mantienen intactas las rutas locales, la logica critica y la separacion soporte/admin vs duenio/local;

### v4.9.1 Ajuste de layout premium del Panel Local

- se fija la sidebar del Panel Local y se elimina el scroll global del dashboard en desktop;
- se compacta el inicio visual para acercarlo mas a la referencia premium;
- se mantienen intactas las rutas locales, la logica critica y la separacion soporte/admin vs duenio/local;

### v4.9.0 Inicio visual premium del Panel Local

- `/local` pasa a ser el inicio visual principal del Panel del Local;
- se acerca el dashboard al mock de referencia con sidebar, topbar, metricas, reservas, plano, actividad y accesos rapidos;
- la logica critica de reservas, disponibilidad, mesas, Supabase y tests se mantiene intacta;
- la separacion soporte/admin vs duenio/local sigue vigente como capa de acceso.

### v4.8.3 Correccion de resolucion de negocio en Reservas

- se corrige la resolucion de `business` en `/local/reservas` cuando entra `?mode=support`;
- `mode=support` deja de contaminar el slug del negocio;
- el panel mantiene el layout premium nuevo y sigue usando la misma logica de reservas;
- la separacion soporte/admin vs duenio/local sigue vigente como capa de acceso.

### v4.8.2 Correccion de soporte en Reservas

- se corrige la resolucion de `business` en `/local/reservas` cuando entra `?mode=support`;
- el `mode` adicional deja de contaminar la lectura del slug del negocio;
- el panel nuevo conserva su layout premium y sigue usando la misma logica de reservas;
- la separacion soporte/admin vs dueno/local sigue vigente como capa de acceso.

### v4.8.1 Dashboard compacto del Panel Local

- se compacta `/local/reservas` para que funcione como dashboard premium de una sola pantalla en desktop;
- se mantienen el shell visual, la sidebar y la topbar nuevos sin tocar la logica critica;
- la pantalla principal acerca la composicion visual a la referencia adjunta sin redisenar aun todas las paginas internas;
- la separacion soporte/admin vs dueno/local sigue vigente como capa de acceso.

### v4.8.0 Shell visual premium del Panel Local

- se inicia el nuevo shell visual del Panel Local con sidebar lateral y topbar limpia usando las imagenes adjuntas como referencia visual
- el objetivo es acercarse a la referencia visual sin romper la logica ni redisenar cada pantalla interna todavia
- se mantienen las rutas locales, Supabase, disponibilidad y tests sin cambios funcionales
- la separacion soporte/admin vs dueño/local sigue vigente como capa de acceso

### v4.7.0 Separacion de acceso soporte y dueño

- se separa el acceso del panel local entre soporte/admin y dueño/local
- el selector de negocios queda habilitado solo en modo soporte/admin
- el modo soporte/admin entra con `?mode=support` y puede navegar entre negocios
- el modo dueño/local queda bloqueado a un negocio asignado temporal y no permite cambiar a otro negocio
- la autenticacion real queda pendiente para una version futura
- la logica de reservas, disponibilidad, Supabase y tests no cambia en esta entrega

### v4.6.9 Auditoria tecnica y regresion de disponibilidad

- se agrega un script de validacion para los casos criticos de solapamiento y horarios publicos
- la regla oficial de mesas queda documentada para reducir divergencias futuras
- se blindan los casos donde calendario, web, plano y reservas podian calcular distinto
- se mantiene la UX actual sin redisenar pantallas
- `/local/calendario` queda como deuda tecnica para un rediseno futuro tipo agenda/ocupacion

### v4.6.8 Auditoria y regresion de disponibilidad

- se agrega un script de validacion para los casos criticos de solapamiento y horarios publicos
- la regla oficial de mesas queda documentada para reducir divergencias futuras
- se blindan los casos donde calendario, web, plano y reservas podian calcular distinto
- se mantiene la UX actual sin redisenar pantallas

### v4.6.7 Horarios de reservas separados

- la web publica deja de cortar horarios por `cierre - duracion`
- `Reservas` puede usar una ventana propia de admision por negocio
- la configuracion guarda `usar mismo horario del local`, `inicio/fin de reservas`, `intervalo de slots`, `duracion estandar` y `terminar despues del cierre`
- la misma regla de solapamiento sigue alimentando Reservas, Plano, Calendario y la web

### v4.6.6 Disponibilidad exacta por mesa

- la disponibilidad manual y la autoasignacion comparan conflictos por ID exacto de mesa
- `assigned_table_ids` y `tableId` se normalizan para no perder ocupaciones reales
- la reserva actual se ignora al editar para no bloquearse contra si misma
- la web publica conserva la regla de solo mostrar horarios realmente reservables

### v4.6.5 Ocupacion por slot unificada

- el helper comun de ocupacion ahora se usa como base para Reservas, Plano y Asignar mesa
- las reservas confirmadas con mesa asignada vuelven a aparecer en el plano en su horario real
- la disponibilidad manual deja de marcar como libre una mesa que tiene una reserva activa solapada propia
- se sigue usando la duracion real del servicio para calcular el intervalo ocupado

### v4.6.3 Disponibilidad manual menos restrictiva

- la disponibilidad manual deja de bloquear por `reserved` y `occupied` solo por estado visual
- el bloqueo real sigue dependiendo de solapamiento horario, `blocked` y `out_of_service`
- el modal de asignacion y el plano usan la misma base de calculo

### v4.6.2 Disponibilidad de mesas sin solapamientos

- la disponibilidad por mesa se calcula en un helper comun para web publica y panel interno
- la autoasignacion deja de elegir mesas que ya estan ocupadas en el mismo rango horario
- la asignacion manual bloquea mesas con conflicto de horario antes de guardar
- la web publica sigue mostrando solo horarios realmente reservables

### v3.5.0 Editor web en Supabase

- `/local/web` puede guardar `business_web_content` en Supabase
- `/local/web` puede administrar `gallery_images` en Supabase
- el selector de plantilla sigue guardando `public_template_id` en `businesses`
- la web publica sigue en local/mock y Supabase Storage queda pendiente

### v3.4.0 Configuracion basica y servicios en Supabase

- `/local/configuracion` puede editar datos basicos del negocio en Supabase
- `/local/configuracion` puede crear, editar, activar/desactivar y eliminar servicios en Supabase
- horarios, reglas, reservas, menu, web publica, plano, CRM y reportes siguen en local/mock

### v3.3.2 Modo Supabase visible en alta de negocios

- la pantalla de crear negocio muestra `Modo Supabase` cuando la fuente activa es Supabase
- los errores de `business_web_content`, `floor_plan_settings` y `services` incluyen tabla, code, details y hint
- no hay fallback silencioso a local/mock cuando Supabase falla

### v3.3.1 Defaults relacionados para negocios en Supabase

- al crear un negocio en Supabase se crean tambien `business_web_content`, `floor_plan_settings` y un servicio base
- al duplicar un negocio en Supabase se copian `business_web_content`, `floor_plan_settings` y `services`
- las reservas, clientes, menu, galeria, plano detallado y reportes siguen sin duplicarse todavia

### v3.2.2 Admin Supabase read-only estabilizado

- `/admin` en modo Supabase sigue leyendo `public.businesses`, pero no muestra métricas mezcladas desde local/mock
- las tarjetas y acciones de escritura quedan deshabilitadas o marcadas como no disponibles
- la capa `src/lib/data/supabase/businesses.ts` ya tiene stubs preparados para la futura escritura

### v3.2.1 Admin sin hydration error

- `/admin` muestra métricas estables y renderiza los valores dinamicos solo despues del mount
- se mantiene la fuente de datos local/mock como predeterminada
- el modo Supabase read-only sigue funcionando sin romper la vista

### v3.2.0 Admin read-only opcional en Supabase

- `/admin` puede leer businesses desde Supabase si `NEXT_PUBLIC_DATA_SOURCE=supabase`
- el modo local/mock sigue siendo el comportamiento por defecto
- la escritura en Admin queda deshabilitada mientras Supabase sea la fuente activa
- la web publica y el resto del Panel del Local siguen usando local/mock en esta fase

### v3.1.1 Diagnostico Supabase corregido

- `src/lib/data/supabase/businesses.ts` consulta `public.businesses` y ordena por `slug`
- `src/lib/data/supabase/health.ts` devuelve conteo, slugs, error code y mensaje real
- `/admin/supabase-check` muestra cuando hay 0 registros y sugiere revisar RLS o permisos
- la app sigue usando local/mock por defecto

### v3.1.0 Conexion inicial a Supabase

- se agrega el cliente oficial en `src/lib/supabase/client.ts`
- se prepara la capa de lectura `src/lib/data/supabase/`
- se agrega la pagina interna `/admin/supabase-check`
- la app sigue usando local/mock por defecto con `NEXT_PUBLIC_DATA_SOURCE=local`

### v3.0.2 Seed demo para Supabase/Postgres

- se agrega `docs/database/seed-demo.sql` con datos demo realistas
- el seed usa UUIDs fijos y puede ejecutarse mas de una vez sin duplicar datos
- cubre negocios, contenido publico, servicios, menu, galeria, clientes, reservas, plano y notas
- la app sigue usando local/mock como fuente real

### v3.0.1 Schema endurecido para Supabase/Postgres

- `business_web_content` y `floor_plan_settings` quedan como relaciones 1 a 1
- `reservations.customer_id` pasa a ser opcional para ligar CRM y reservas
- las reservas historicas siguen vivas si se elimina un servicio
- la version visible avanza a `v3.0.1`

### v3.0.0 Base preparada para Supabase/Postgres

- se documenta el schema inicial en `docs/database/supabase-schema.sql`
- se explica el plan de migracion en `docs/database/migration-plan.md`
- la app sigue usando local/mock como fuente real
- se mantiene la UI intacta para la futura migracion

### v2.9.1 Hidratacion estable en web publica

- la web publica renderiza un shell estable antes de montar
- `PublicHero` evita mezclar textos seed de SSR con datos de localStorage en el primer render
- se mantiene la sincronizacion con contenido local/mock despues del mount

### v2.9.0 Capa de datos unificada

- se crea una capa de acceso a datos en `src/lib/data/`
- los modulos de negocios, reservas, menu, web, mesas, CRM y reportes quedan detras de una fachada comun
- se centralizan claves de `localStorage`, helpers y puntos de lectura/escritura para preparar Supabase/Postgres
- la UI sigue funcionando igual en modo local/mock

### v2.8.0 Plantillas publicas por negocio

- `/local/web` permite elegir plantilla publica por negocio
- la web publica puede renderizar templates distintos sin mezclar datos
- hay tres plantillas iniciales: restaurante elegante, premium compacto y cafe minimalista
- la base compartida de contenido sigue aislada por negocio y lista para escalar

### v2.7.0 Editor real de web publica por negocio

- `/local/web` se reorganiza en bloques claros para identidad, visibilidad, informacion, ubicacion/contacto y galeria
- cada negocio guarda su propio contenido publico en modo local/mock
- la web publica `/[slug]` consume ese contenido y mantiene el aislamiento por negocio
- las imagenes locales y la galeria siguen con fallback seguro en cliente

### v2.6.1 Menu completo navegable en la web publica

- la web publica muestra Seleccion destacada y Menu completo como secciones separadas
- el menu completo usa categorias dinamicas del negocio
- el hero lleva a #menu o #platos segun exista menu completo
- las categorias nuevas creadas en `/local/menu` aparecen en la web publica
- la web publica sigue aislada por negocio

### v2.6.0 Demo comercial publica pulida

- la portada publica reduce espacios vacios y mejora jerarquia visual
- el hero alinea mejor texto, imagen y CTA utiles
- la seccion informativa queda mas compacta y vendible
- la seleccion destacada y la ubicacion se ven mas limpias
- la experiencia sigue aislada por negocio y sin romper reservas

### v2.5.3 Skeleton estable en seleccion destacada

- `PublicFeaturedMenu` muestra un skeleton fijo hasta montar en cliente
- los destacados y las initials solo se calculan despues del mount
- la galeria publica sigue oculta si no hay imagenes activas
- el hero y la ubicacion mantienen fallback seguro
- la web publica sigue aislada por negocio

### v2.5.2 Imagenes publicas sin hydration y galeria mas limpia

- la seleccion destacada muestra placeholder estable hasta montar en cliente
- las imagenes locales o base64 se reemplazan solo despues del mount
- la galeria publica se oculta si no hay imagenes activas
- el hero y la ubicacion mantienen fallback estable y profesional
- la web publica sigue aislada por negocio

### v2.5.1 Seleccion destacada y ubicacion publica mejorada

- la web publica muestra una seleccion destacada dinamica desde `/local/menu`
- si no hay destacados, toma los primeros items activos del negocio
- la ubicacion publica soporta Google Maps URL, embed opcional y fallback elegante
- los botones de ubicacion abren Google Maps o una busqueda por direccion y localidad
- el contenido sigue aislado por negocio en modo local/mock

### v2.5.0 Web publica editable por negocio

- `/local/web` edita el contenido publico del negocio seleccionado
- `/${slug}` consume hero, about, galerÃ­a, contacto y visibilidad desde local/mock
- las secciones se activan o desactivan por negocio sin mezclar datos
- el menu sigue viniendo de `/local/menu`
- queda preparado para la migracion futura a Supabase

### v2.4.2 Negocio invalido corregido y metricas admin en grilla

- si `business=<slug>` no existe, el Panel del Local corrige la URL automaticamente al negocio activo de fallback
- si no hay negocios activos disponibles, se muestra un estado vacio elegante
- las metricas superiores de `/admin` quedan en una grilla compacta de 2 filas por 4 columnas sin scroll horizontal

### v2.4.0 Admin central con detalle por negocio

- fila superior compacta de metricas en `/admin`
- vista de detalle por negocio en `/admin/businesses/[slug]`
- accesos rapidos a web publica, panel local, menu, plano, configuracion y reportes
- estado de configuracion y resumen operativo por negocio
- eliminar con confirmacion fuerte reutilizada desde admin y detalle

### v2.4.1 Panel local con negocio en URL

- `/admin` envia al Panel del Local con `business=<slug>`
- todas las tabs del Panel del Local conservan el negocio seleccionado en la URL
- `/dashboard` y `/local` preservan `business=<slug>` al redirigir a `/local/reservas`
- el selector de negocio sincroniza la URL sin recargar la pagina
- si el slug no existe, el panel muestra un aviso elegante y usa un negocio activo como fallback

### v2.3.0 Admin Panel central

- header de admin mas profesional
- metricas compactas de negocios y reservas mock
- filtros por estado, localidad, rubro y orden
- lista operativa de negocios con acciones rapidas
- eliminar con confirmacion fuerte por slug
- reactivar vuelve a estado activo
- duplicar copia configuracion base y datos operativos

### v2.2.0 Web publica editable del local

- `/local/web` edita el contenido publico por negocio
- la web `/${slug}` consume hero, about, galeria, redes y visibilidad desde local/mock
- imagenes por URL o cargadas desde el ordenador
- vista previa del sitio publico dentro del panel local
- preparado para migrar a Supabase sin reescribir la UI

### v2.1.4 Hotfix web publica

- `ReservationWidget` renderiza servicios solo despues de montar en cliente
- se corrige el hydration error causado por localStorage y servicios diferentes entre SSR y cliente
- se elimina el fallback duro a `/mock/covers/demuru.jpg`
- hero, galeria y menu publicos usan placeholder si la imagen falla

### v2.1.3 Web publica editable

- `/local/web` como editor real de contenido publico por negocio
- hero, presentacion, ubicacion, contacto, CTA y secciones activables o desactivables
- galeria dinamica por negocio con imagen, titulo, descripcion y estado
- la web publica consume ese contenido sin volver a hardcodear textos
- preparado para migrar luego a Supabase sin rehacer la UI

### v2.1.0 Menu del local

- nueva pestaña `/local/menu`
- categorias dinamicas por negocio
- items o productos con imagen, descripcion, precio opcional, estado y destacado
- preview visual del menu para la web publica
- persistencia local/mock por negocio
- restaurar menu demo solo para el negocio seleccionado

### v2.1.1 Imagen local en menu

- carga de imagen local para items del menu
- prioridad de imagen: subida local, URL manual y placeholder
- preview inmediata de la imagen subida
- persistencia local/mock por negocio
- preparado para un futuro upload real a Supabase Storage

### v2.1.2 Menu publico dinamico

- la web publica consume el menu dinamico cargado desde `/local/menu`
- categorias e items se muestran por negocio sin hardcodear categorias fijas
- soporta imagen subida, URL manual o placeholder
- deja preparada la seccion publica para futura conexion con Supabase

### v2.0.3 Demo comercial

- demo comercial mas completa para mayo 2026
- datos recientes del 1 al 14 de junio 2026 para reportes, CRM, calendario y plano
- carga y limpieza de datos demo sin tocar reservas manuales
- futuro preparado para flujo de seña/depósito

### v2.0.2 Seed demo realista

- seed demo realista por negocio para mayo 2026 y 1-14 de junio 2026
- cargar, reemplazar y limpiar datos demo sin tocar reservas manuales
- datos demo aislados por negocio
- mas volumen de prueba para reportes, CRM, calendario, plano e ingresos estimados

### v2.0.1 Aislamiento por negocio en reportes

- reportes por negocio sin mezclar datos de otros locales
- servicios, mesas, clientes e ingresos limitados al negocio seleccionado
- servicios externos ocultos en rankings y alertas
- reporte limpio para Demuru, Barbados y Cafe Demo

### v2.0.0 Reportes operativos

- reportes operativos reales del Panel del Local
- filtros por periodo: hoy, 7 dias, 30 dias, mes actual y personalizado
- metricas principales de reservas, personas, ingresos estimados y ocupacion
- metricas por servicio, horario, dia, cliente y mesas
- alertas operativas basadas en la actividad del local
- sincronizacion con reservas, calendario, plano y CRM

### v1.9.2 Validacion de telefono y anti-spam

- validacion de telefono en reservas publicas
- normalizacion de telefonos antes de comparar duplicados
- bloqueo de telefonos falsos o sospechosos
- prevencion anti-spam basica en la web publica
- modelo futuro de deposito mantenido para confirmacion

### v1.9.1 Hotfix de reservas publicas

- correccion de duplicados en `/local/reservas`
- filtro de fecha desbloqueado en `/local/reservas`
- validacion de reserva activa por telefono en la web publica
- modelo futuro de deposito preparado para confirmacion

### v1.9.0 CRM operativo real

- CRM operativo real del Panel del Local
- clientes derivados de reservas
- detalle de cliente
- notas internas
- tags manuales
- sugerencias automáticas de tags
- clasificacion comercial Nuevo/Recurrente/VIP/Riesgo
- sincronizacion con Reservas y Calendario

### v1.8.0 Calendario operativo real

- calendario operativo real del Panel del Local
- vista dia y semana
- selector de negocio y fecha
- filtros por estado, servicio y busqueda
- acciones rapidas por reserva
- detalle de reserva
- sincronizacion con Reservas y Plano

### v1.7.4 Persistencia correcta de redondeo

- correccion de persistencia de `cornerRadius` en `0`
- mesas nuevas cuadradas por defecto
- esquinas rectas por defecto
- evita fallback incorrecto de `0` a `12`

### v1.7.3 Resize visual de mesas

- modo visual `Redimensionar mesa` en `/local/plano`
- handles para resize libre de mesas
- sincronizacion en vivo con los campos de ancho y alto
- control configurable de redondeo de esquinas
- formas limitadas a rectangular, cuadrada y redonda
- mantenimiento del drag normal y de las mesas unidas

### v1.7.2 Edicion visual libre del plano

- mesas unidas visuales movibles
- fondo editable sin aspect ratio obligatorio
- ancho y alto de mesas independientes
- soporte de resize libre para elementos del plano

### v1.7.1 Timeline compacto del plano

- timeline fijo de 08:00 a 00:00
- barra de ocupacion mas compacta
- horas solo arriba del slider
- eliminacion del resumen redundante del slot
- overflow corregido dentro de las mesas
- mesas unidas visualmente compactas con size base

### v1.7.0 Timeline de ocupacion del plano

- timeline/slider de ocupacion en `/local/plano`
- actualizacion en vivo del canvas por fecha y horario
- reemplazo de la leyenda inferior por control operativo
- visualizacion temporal de mesas unidas como una sola mesa

### v1.6.1 Hotfix publico y SSR

- correccion de la asignacion automatica de mesa en reservas publicas
- la web publica no crea reservas activas sin mesa cuando el negocio tiene mesas configuradas
- correccion del hydration mismatch en contadores y badges de `/local/reservas`

### v1.6.0 Disponibilidad publica por mesas

- la web publica consulta disponibilidad real basada en mesas
- asignacion automatica de mesa o combinacion al crear reservas publicas
- prevencion de sobreventa por mesa
- fallback por capacidad por slot si un negocio no tiene mesas configuradas

### v1.5.2 Eliminacion segura de negocios

- boton Eliminar con confirmacion previa
- validacion escribiendo el slug antes de borrar
- proteccion de negocios base en modo mock
- limpieza de datos locales asociados al negocio eliminado

### v1.5.1 Hotfix de Admin

- bloqueo de slugs duplicados al crear y editar negocios
- accion Reactivar llevando directamente a `active`

### v1.4.3 Hydration fix final de reservas

- snapshot estable durante SSR para badges de disponibilidad interna
- badges de sugerencias/conflictos visibles solo al hidratar el cliente

### v1.4.2 Hydration fix de reservas

- correccion del hydration mismatch en badges de disponibilidad dentro de `/local/reservas`
- ocultar conteos y sugerencias derivados de localStorage hasta montar el cliente

### v1.4.1 Modal de mesas y fondo plegable

- modal de asignar/cambiar mesa centrado y mas util
- header y footer visibles en el modal
- scroll interno mas comodo para sugerencias y combinaciones
- seccion Fondo del plano colapsable/desplegable

### v1.4.0 Disponibilidad interna por mesas

- motor interno de disponibilidad por mesas para el Panel del Local
- sugerencias de mesas individuales y combinaciones
- alertas de reservas sin mesa
- deteccion de conflictos por horario y mesa
- resumen operativo en reservas, plano y calendario
- la disponibilidad publica sigue usando la logica por slot actual

### v1.3.2 Filas de reservas mas legibles

- filas de reservas redisenadas en `/local/reservas`
- chips mas grandes y claros
- datos del cliente mejor distribuidos

### v1.3.1 Legibilidad de reservas

- chips y badges de reservas mas grandes en `/local/reservas`
- mejor presencia visual para estado, servicio, mesa, origen y detalle

### v1.1.3 Resize visual del fondo del plano

- resize de la imagen de fondo con handles en las esquinas
- inputs de ancho y alto como respaldo
- mejora de UX del modo edicion de fondo

### v1.1.2 Fondo del plano ajustable

- brillo y contraste del fondo de 0 a 200
- fondo del plano movible dentro del canvas
- ancho y alto de la imagen de fondo editables
- persistencia local/mock por negocio para posicion, tamano y filtros

### v1.1.1 Hotfix de plano y hydration

- correccion del hydration error en `/local/reservas`
- correccion del hydration error en `/local/calendario`
- drag de mesas funcionando en `/local/plano`
- imagen de fondo configurable por negocio
- controles de opacidad, brillo y contraste

### v0.7.1 Hotfix de reservas

- correccion del hydration error del `ReservationWidget`
- orden descendente por horario dentro de cada fecha
- mantenimiento de la disponibilidad y acciones

### v0.7.0 Reservas del Panel Local

- ruta directa `/local/reservas`
- header operativo compacto
- metrics compactas
- filtros combinados y vista rapida por estado
- lista operativa agrupada por fecha
- detalle simple de reserva
- acciones por reserva con botones claros
- `/dashboard` mantenido por compatibilidad

### v0.8.0 Calendario

- vista diaria operativa
- vista semanal basica
- filtros por estado y servicio
- navegacion por fecha
- preparacion para bloqueos de horarios

### v0.9.0 CRM básico

- clientes derivados de reservas
- busqueda y filtros
- detalle de cliente
- historial de reservas
- notas, tags y preferencias locales/mock

### v0.9.1 Ajuste visual CRM

- filtros del CRM mas compactos
- chips mas livianos para panel operativo

### v1.0.1 UX de servicios

- modal centrado para crear servicios
- modal centrado para editar servicios
- lista de servicios mas limpia y compacta

### v1.0.0 Configuracion del Local

- configuracion funcional del Panel del Local
- persistencia local/mock por negocio
- horarios
- servicios
- reglas de reserva
- capacidad operativa
- ajuste visual de filtros del CRM

### v1.1.0 Plano del Local

- plano básico funcional del local
- mesas locales/mock por negocio
- crear, editar, eliminar y mover mesas
- estados visuales de mesa
- reset del plano por negocio
- preparacion para asignacion y union de mesas

### v1.2.0 Asignacion de mesas

- asignar reservas a mesas desde el Panel del Local
- validar capacidad de la mesa y conflictos por horario
- mostrar mesa asignada en reservas y calendario
- mostrar ocupacion del salon por fecha y hora
- preparar disponibilidad real por salon

### v1.3.0 Union de mesas y disponibilidad por layout

- union manual de mesas
- asignacion de reservas a combinaciones
- etiquetas como Mesa 1-2
- validacion de capacidad y conflictos por horario
- visualizacion en plano y calendario
- disponibilidad segun combinaciones

## Etapa 2 - Admin Panel

### v1.5.0 Admin de negocios

- gestion de negocios
- alta, edicion y archivo
- filtros y busqueda

### v1.7.0 Admin de templates y webs

- templates publicos
- temas visuales
- contenido editable por negocio

### v1.8.0 Admin global

- panel del SaaS
- reportes globales
- gestion centralizada

## Etapa 3 - Web del Local

### v1.9.0 Web publica editable

- textos publicos
- fotos
- logo
- colores
- redes

### v1.10.0 Reserva publica pulida

- formulario mas claro
- disponibilidad mas visual
- mejor experiencia mobile

## Etapa 4 - Base real

### v2.0.0 Supabase, Auth, Roles, RLS

- persistencia real
- autenticacion
- permisos por rol
- multi-tenant seguro

### v2.1.0 Multi-tenant real

- negocios aislados por tenant
- paneles reales por usuario
- datos sincronizados

## Etapa 5 - Automatizaciones

### v2.2.0 WhatsApp manual avanzado

- acciones rapidas
- recordatorios manuales
- seguimiento simple

### v2.3.0 WhatsApp automatico

- automatizaciones
- confirmaciones
- alertas de reservas

### v2.4.0 Instagram

- integracion social
- flujos de contenido
- soporte para captacion

### v3.3.0 Escritura de businesses en Supabase

- `/admin` puede crear, editar, duplicar, activar/desactivar y eliminar `businesses` reales en Supabase cuando `NEXT_PUBLIC_DATA_SOURCE=supabase`
- reservas, menu, web publica, plano, CRM y reportes siguen en local/mock
- solo `businesses` entra en escritura real por ahora
- el resto de la migracion a Supabase sigue pendiente para fases posteriores
