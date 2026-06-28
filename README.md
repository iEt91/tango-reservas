# Tango Reservas

Tango Reservas es una base tecnica para un sistema multi-negocio de reservas con tres areas bien separadas:

- Panel del Local
- Admin Panel
- Web del Local



## Version actual

`v5.6-configuracion-lab`

Esta version compacta `/local/configuracion-lab`, ajusta Horarios comerciales y hace visibles los contenidos de Reservas, Web publica y Notificaciones.

## Etapa v5.6-configuracion-lab

- `/local/configuracion-lab` corrige íconos desproporcionados y textos rotos en el laboratorio de configuración;
- se mantienen las alturas trabajables por fila y se compactan Reservas, Web pública y Notificaciones sin scroll interno visible;
- la pantalla sigue siendo un laboratorio visual aislado con datos mock y sin tocar la ruta real `/local/configuracion`.

## Etapa v5.0-configuracion-lab

- `/local/configuracion-lab` replica el layout premium de Configuracion del negocio con hero, tarjetas de datos, reservas, horarios, servicios, web publica, notificaciones y barra de acciones;
- se reutiliza el shell premium comun de `/local?business=demuru` y se mantiene la ruta real `/local/configuracion` intacta;
- la pantalla usa datos mock visuales y no conecta Supabase ni logica real.

## Etapa v4.9-crm-lab

- `/local/crm-lab` elimina el panel inferior duplicado de consumos, estira la columna derecha hasta el fondo y simplifica los filtros Segmento, Vistas y Ordenar por;
- se reutiliza el shell premium comun de `/local?business=demuru` y no se toca la ruta real `/local/crm`;
- la pantalla sigue usando mock data local y no conecta Supabase ni logica real.

## Etapa v5.3.0-plano-lab

- `/local/plano-lab` reconstruye visualmente el blueprint de Plano con mesas mock, canvas, panel de mesa seleccionada y ocupacion por horario;
- la pagina reutiliza el shell premium comun de `/local?business=demuru` y no toca `/local/plano` real;
- se mantiene la separacion entre laboratorio visual y logica real del plano.

## Etapa v5.2.1-calendario-lab

- `/local/calendario-lab` mantiene la maqueta visual aislada del blueprint de Calendario;
- la agenda del dia usa 17 slots fijos de 08:00 a 24:00 y agrupa reservas mock por franja de 60 minutos;
- se conserva el shell premium comun de `/local?business=demuru`, sin tocar `/local/calendario` real.

## Etapa v5.1.6-reservas-lab-fix

- `/local/reservas-lab` reutiliza el sidebar y la topbar premium del dashboard bueno;
- se corrige la burbuja de notificaciones, se quitan los chips del header y se mejora `Ocupación de hoy`;
- la pantalla sigue siendo una maqueta visual aislada con mock data fija y sin tocar la ruta operativa `/local/reservas`.

## Etapa v5.1.4-reservas-lab

- `/local/reservas-lab` compacta el listado de reservas y lo transforma en una tabla horizontal realista;
- las acciones quedan alineadas a la derecha en una sola linea y el panel derecho se ve completo;
- la pantalla sigue siendo una maqueta visual aislada con mock data fija y sin tocar la ruta operativa `/local/reservas`.

## Etapa v5.1.3-reservas-lab

- `/local/reservas-lab` reproduce visualmente el blueprint `2-reservas.png` en forma aislada;
- la pantalla usa mock data hardcodeada y no conecta la logica real, Supabase, `business` ni `mode=support`;
- `/local/reservas` queda intacta y sigue siendo la pantalla operativa real.

## Etapa v5.1.2-reservas

- `/local/reservas` se alinea con mayor fidelidad al blueprint `2-reservas.png`;
- se elimina la card vertical de fecha y se compactan header, metricas y filtros;
- se mueve `Agrupar por` al encabezado del listado y se compacta la tabla;
- se preserva la logica real de reservas, disponibilidad, mesas, `business` y `mode=support`;
- `/local/design-lab` sigue siendo la referencia visual aprobada del sistema.

Esta version rediseña visualmente `/local/crm` con la referencia premium de CRM, manteniendo la logica real, Supabase, `business` y `mode=support` intactos.

## Etapa v5.4.0-crm

- `/local/crm` adopta la referencia visual aprobada de CRM sobre el shell premium comun;
- se corrigen los textos rotos y se preserva la logica real de clientes, notas, filtros y edicion;
- se mantienen `business` y `mode=support` en la navegacion del panel;
- `/local/design-lab` sigue siendo la referencia visual aprobada del sistema.

## Etapa v5.1.0-reservas

- ajusta visualmente `/local/reservas` usando el shell premium compartido del Panel Local;
- corrige textos rotos y alinea la pantalla con la imagen de referencia de Reservas;
- preserva la navegacion con `business` y `mode=support`;
- no toca la logica de reservas, disponibilidad, mesas ni tests.

## Etapa v5.1.0

- migra visualmente `/local/reservas` al sistema premium basado en `/local/design-lab`;
- usa la imagen adjunta de Reservas como blueprint obligatorio;
- mantiene la logica real de reservas y disponibilidad;
- preserva `business` y `mode=support`;
- no redisenia todavia Calendario, Plano, CRM, Configuracion, Menu, Web ni Reportes.
## Etapa v5.0.2-design-lab

- corrige overflow en las metricas superiores;
- reorganiza las metricas para que numero y label convivan sin desbordes;
- corrige la tarjeta de Próxima reserva;
- corrige la tarjeta de Ocupación de hoy para que el donut quede dentro;
- expande la fila inferior para que Acciones rápidas se vea completa;
- rehace el gráfico de Ocupación por franja horaria y elimina el tooltip flotante;
- mantiene la maqueta estatica aislada sin tocar la logica real ni Supabase.

## Etapa v5.0.1-design-lab

- corrige scrolls verticales y horizontales en desktop dentro de `/local/design-lab`;
- compacta las metricas superiores para liberar espacio y acercar la maqueta al mock;
- corrige la card de ocupacion de hoy para que el donut quede dentro de la tarjeta;
- mueve el CTA de "Ver todas las reservas de hoy" al header de la card de reservas;
- ajusta acciones rapidas para que los textos queden centrados y sin overflow;
- mantiene la maqueta estatica aislada sin tocar la logica real ni Supabase.

## Etapa v5.0.0-design-lab

- crea `/local/design-lab` como una maqueta estatica aislada del Panel Local;
- replica la captura mock de referencia con componentes visuales nuevos y sin usar Supabase;
- no modifica la logica de reservas, disponibilidad, mesas ni rutas operativas reales;
- sirve como base visual para migrar luego el Panel Local real por etapas.

## Etapa v5.0.0

- reconstruye `/local?business=demuru` como dashboard premium desde una lectura visual de la captura mock adjunta;
- fija la sidebar y la topbar interna del Panel Local con una composicion mas cercana al layout de referencia;
- conserva la logica real de reservas, disponibilidad, asignacion de mesas, Supabase y tests;
- preserva la separacion soporte/admin vs duenio/local introducida en v4.7.0;
- deja `/local/reservas` y el resto de los modulos locales funcionales sin redisenarlos todavia.

## Etapa v4.9.2

- rediseña `/local` siguiendo la referencia visual adjunta con la maxima fidelidad posible;
- fija la sidebar del Panel Local, mantiene el topbar interno y permite scroll vertical en el main sin mover la navegacion;
- acerca cards, tabla, plano, grafico, actividad, clientes y acciones rapidas al mock premium;
- mantiene intacta la logica critica de reservas, disponibilidad, mesas, Supabase y tests;
- preserva la separacion soporte/admin vs duenio/local introducida en v4.7.0.

## Etapa v4.9.1

- fija la sidebar del Panel Local y elimina el scroll global del dashboard en desktop;
- compacta el inicio visual para acercarlo mas a la referencia premium;
- mantiene intacta la logica critica de reservas, disponibilidad, mesas, Supabase y tests;
- preserva la separacion soporte/admin vs duenio/local introducida en v4.7.0.

## Etapa v4.9.0

- convierte `/local` en el inicio visual premium del Panel del Local;
- acerca el dashboard principal a la referencia adjunta con sidebar, topbar, metricas, reservas de hoy, plano, actividad y accesos rapidos;
- mantiene intactas las rutas operativas, la logica de reservas, disponibilidad, mesas, Supabase y tests;
- preserva la separacion soporte/admin vs duenio/local introducida en v4.7.0.

## Etapa v4.8.3

- corrige la resolucion de `business` y `mode=support` en `/local/reservas` para evitar el falso estado de negocio inexistente;
- mantiene el shell visual nuevo del Panel Local y la pantalla compacta de `/local/reservas`;
- preserva la separacion entre soporte/admin y dueño/local introducida en v4.7.0;
- sigue sin tocar la logica de reservas, disponibilidad, Supabase ni tests.

## Etapa v4.8.2

- corrige la resolucion de `business` en `/local/reservas` para que `mode=support` no rompa el negocio activo;
- mantiene el shell visual nuevo del Panel Local y la pantalla compacta de `/local/reservas`;
- preserva la separacion entre soporte/admin y dueño/local introducida en v4.7.0;
- sigue sin tocar la logica de reservas, disponibilidad, Supabase ni tests.

## Etapa v4.8.1

- compacta la pantalla principal de `/local/reservas` para que entre en una sola vista tipo dashboard premium;
- mantiene el shell visual nuevo del Panel Local con sidebar lateral y topbar limpia;
- ajusta la composicion visual sin tocar la logica de reservas, disponibilidad, Supabase ni tests;
- conserva la separacion entre soporte/admin y dueño/local introducida en v4.7.0;
- prepara la base visual para redisenar el resto de las pantallas locales por etapas.

## Etapa v4.8.0

- inicia el nuevo shell visual del Panel Local con sidebar lateral y topbar limpia usando las imagenes adjuntas como referencia visual;
- acerca la experiencia al estilo premium de las referencias adjuntas;
- mantiene la logica de reservas, disponibilidad, Supabase y tests sin cambios funcionales;
- deja la reestilizacion profunda de cada pantalla para etapas posteriores;
- conserva la separacion entre soporte/admin y dueño/local introducida en v4.7.0.

## Etapa v4.7.0

- separa el modo soporte/admin del modo dueño/local en el panel local;
- el selector de negocios queda disponible solo en soporte/admin;
- el modo soporte/admin entra con `?mode=support` y puede cambiar de negocio;
- el modo dueño/local usa su negocio asignado temporal y queda bloqueado a ese negocio;
- la autenticacion real queda pendiente para una version futura;
- la logica de reservas, disponibilidad, plano, calendario, CRM y reportes se mantiene sin cambios funcionales.

## Etapa v4.6.9

- agrega auditoria tecnica y regresion de disponibilidad;
- documenta la regla oficial de mesas, horarios y solapamientos;
- reduce el riesgo de divergencias entre calendario, web, plano y reservas;
- deja `/local/calendario` pendiente para un rediseño visual tipo agenda/ocupacion en una etapa futura.

## Etapa v4.6.8

- agrega auditoria y regresion de disponibilidad;
- blinda solapamientos de reservas y asignacion manual;
- documenta la regla oficial de mesas y horarios;
- reduce el riesgo de divergencias entre calendario, web, plano y reservas.

## Etapa v4.6.7

- separa el horario del local de la ventana de admision de reservas
- permite definir reserva por negocio con horario propio, intervalo de slots y duracion estandar
- evita cortar horarios publicos como si fueran `cierre - duracion`
- mantiene la misma logica de solapamiento y ocupacion en Reservas, Plano, Calendario y la web

## Etapa v4.6.6

- corrige la comparacion por ID exacto de mesa en conflictos de reserva
- centraliza la normalizacion de `assigned_table_ids` y `tableId`
- usa la duracion real de la reserva para calcular solapamiento en asignacion manual
- mantiene la web publica mostrando solo horarios realmente reservables
## Etapa v4.6.5

- Unifica la logica de ocupacion por slot entre Reservas, Plano y Asignar mesa.
- Corrige reservas confirmadas con mesa que no aparecian en el plano.
- Corrige falsos libres y falsos ocupados al asignar mesas.
- Usa la duracion real del servicio para calcular superposicion.

## Etapa v4.6.3

- Corrige la disponibilidad excesivamente restrictiva en el modal de asignacion manual.
- Diferencia mejor el estado visual de la mesa y la ocupacion real por horario.
- Mantiene la proteccion anti-overbooking por solapamiento real.
- Alinea la disponibilidad entre plano, reservas y calendario.

## Etapa v4.6.2

- Centraliza la disponibilidad por mesa en un helper comun.
- Evita sugerir o guardar mesas con conflicto horario en asignacion manual.
- Refuerza la autoasignacion para que no elija una mesa ya ocupada.
- Mantiene la web publica mostrando solo horarios realmente reservables.

## Etapa v4.6.1

- Corrige la disponibilidad publica para que solo se muestren horarios realmente reservables.
- Evita que una mesa ocupada bloquee todos los horarios si quedan mesas libres.
- Mantiene la validacion anti-overbooking con Supabase.

## Etapa v4.6.0

- Centraliza la disponibilidad real de mesas y evita overbooking por solapamiento horario.
- Usa la duracion del servicio para calcular ocupacion en Plano y Calendario.
- Normaliza `assigned_table_ids` para que no se repitan mesas en una misma reserva.

## Etapa v4.5.2

- se agrega la opcion "Reservas automaticas" por negocio en Configuracion
- se agrega la migracion para `businesses.auto_confirm_reservations`
- Configuracion resuelve el negocio por slug y usa el UUID real de Supabase antes de llamar a servicios
- si esta activa, la web publica confirma la reserva cuando encuentra una mesa disponible
- si no hay mesa disponible, la reserva queda pendiente sin mesa
- si esta desactivada, la web publica crea la reserva pendiente sin asignar mesa
- la asignacion manual desde el panel sigue funcionando igual
- el estado permanente de la mesa no cambia por una reserva puntual

## Etapa v3.5.0

- `/local/web` ya puede leer y guardar `business_web_content` en Supabase
- `/local/web` ya puede administrar `gallery_images` en Supabase
- `public_template_id` sigue guardandose en `businesses` cuando se cambia la plantilla desde el editor web
- la web publica `/[slug]` todavia sigue leyendo local/mock en esta fase
- Supabase Storage para imagenes sigue pendiente para una fase posterior

## Etapa v3.4.0

- `/local/configuracion` ya puede leer y editar datos basicos del negocio en Supabase
- `/local/configuracion` ya puede administrar servicios en Supabase
- reservas, menu, web publica, plano, CRM y reportes siguen en local/mock

## Etapa v3.3.2

- al crear o duplicar un negocio en Supabase, tambien se crean `business_web_content`, `floor_plan_settings` y un servicio base
- si falla la configuracion base, se muestra un error claro y se limpia el negocio creado
- en la pantalla de alta se muestra `Modo Supabase` cuando la fuente activa es Supabase

## Etapa v3.3.1

- al crear o duplicar un negocio en Supabase, tambien se crean `business_web_content`, `floor_plan_settings` y un servicio base
- si falla la configuracion base, se muestra un error claro y se limpia el negocio creado

## Etapa v3.3.0

- `/admin` puede crear, editar, duplicar, activar/desactivar y eliminar `businesses` directamente en Supabase cuando `NEXT_PUBLIC_DATA_SOURCE=supabase`
- el resto de los modulos sigue en local/mock por ahora
- la escritura en Supabase queda acotada solo a `businesses`

## Etapa v3.2.2

- `/admin` en modo Supabase sigue en solo lectura y muestra las métricas no disponibles como `—`
- las acciones de escritura en Admin quedan deshabilitadas para evitar mezclar Supabase con local/mock
- se agregaron stubs preparados para la futura escritura en Supabase

## Etapa v3.2.1

- se corrige el hydration error en `/admin` mostrando métricas dinamicas solo despues de montar
- las metricas del panel quedan estables entre SSR y cliente
- se mantiene el modo local/mock y el modo Supabase read-only

## Etapa v3.2.0

- `/admin` puede listar negocios desde Supabase si `NEXT_PUBLIC_DATA_SOURCE=supabase`
- la escritura en Admin queda deshabilitada cuando Supabase esta activo
- el modo local/mock sigue siendo la fuente por defecto y no cambia la web publica
- el Admin muestra un badge con la fuente de datos actual

## Etapa v3.1.1

- `getSupabaseBusinesses()` lee `public.businesses` con orden por `slug`
- `/admin/supabase-check` muestra conteo, slugs y errores reales de Supabase
- se mantiene `NEXT_PUBLIC_DATA_SOURCE=local` por defecto
- la app sigue usando local/mock como fuente principal

## Etapa v3.1.0

- se agrega cliente oficial de Supabase en `src/lib/supabase/client.ts`
- se prepara una capa `src/lib/data/supabase/` de solo lectura
- se agrega una pagina de diagnostico en `/admin/supabase-check`
- la app sigue usando local/mock por defecto con `NEXT_PUBLIC_DATA_SOURCE=local`

## Etapa v3.0.2

- se agrega `docs/database/seed-demo.sql` con datos demo realistas y UUIDs fijos
- el seed cubre negocios, web content, servicios, menu, galeria, clientes, reservas, plano y notas
- la app sigue usando local/mock como fuente real
- quedan preparadas tablas, relaciones e indices para migrar sin reescribir la UI

## Etapa v3.0.1

- se endurece el schema inicial de Supabase/Postgres con relaciones 1 a 1 y claves opcionales seguras
- la app sigue usando local/mock como fuente real
- quedan preparadas tablas, relaciones e indices para migrar sin reescribir la UI

## Etapa v3.0.0

- se documenta el esquema inicial de Supabase/Postgres en `docs/database/`
- la app sigue usando local/mock como fuente real
- quedan preparadas tablas, relaciones e indices para migrar sin reescribir la UI

## Etapa v2.9.1

- la web publica usa un shell estable antes de montar para evitar hydration errors
- `PublicHero` deja de mostrar textos sensibles de localStorage hasta que el cliente monta
- la capa pública sigue reflejando los cambios del contenido local/mock despues del mount

## Etapa v2.9.0

- se crea una capa de acceso a datos unificada en `src/lib/data/`
- los accesos a negocios, reservas, menu, web, mesas, CRM y reportes pasan por una fachada comun
- el proyecto queda listo para reemplazar la implementacion local/mock por Supabase/Postgres sin reescribir la UI
- se centralizan claves de `localStorage` y helpers compartidos para la migracion futura

## Etapa v2.8.0

- `/local/web` permite elegir plantilla publica por negocio
- la web publica puede renderizar templates distintos sin mezclar datos
- hay tres plantillas iniciales: restaurante elegante, premium compacto y cafe minimalista
- el contenido sigue compartido entre templates y aislado por negocio

## Etapa v2.7.0

- `/local/web` ahora edita identidad publica, visibilidad de secciones, ubicacion, contacto e imagenes por negocio
- los cambios se reflejan en la web publica `/[slug]` sin mezclar datos entre locales
- el editor separa mejor hero, informacion, ubicacion/contacto y galeria
- las imagenes locales siguen cargandose en modo mock sin hydration errors

## Etapa v2.6.1

- la web publica muestra Seleccion destacada y Menu completo como secciones separadas
- el menu completo usa categorias dinamicas del negocio
- el hero lleva a #menu o #platos segun exista menu completo
- las categorias nuevas creadas en `/local/menu` aparecen en la web publica
- todo sigue aislado por negocio y listo para seguir migrando a Supabase

## Etapa v2.6.0

- la portada publica reduce espacios vacios y mejora la jerarquia visual
- el hero integra mejor texto, imagen y CTA utiles
- la seccion informativa se ve mas compacta y vendible
- la seleccion destacada y la ubicacion mantienen un layout mas limpio
- la experiencia sigue aislada por negocio y sin romper reservas

## Etapa v2.5.3

- `PublicFeaturedMenu` muestra skeleton estable hasta montar en cliente
- los items destacados y sus initials se calculan solo despues del mount
- la galeria publica sigue oculta cuando no hay imagenes activas
- el hero y la ubicacion mantienen fallback seguro
- todo sigue separado por negocio

## Etapa v2.5.2

- la seleccion destacada usa placeholder estable hasta montar en cliente si la imagen viene de mock local
- la galeria publica se oculta cuando no hay imagenes activas
- el hero publico evita diferencias SSR/cliente al mostrar imagenes locales o base64
- la ubicacion mantiene su placeholder elegante y estable
- todo sigue aislado por negocio y listo para seguir migrando a Supabase

## Etapa v2.5.1

- la seccion "Seleccion de platos" usa items destacados del menu o los primeros activos si no hay destacados
- la ubicacion publica muestra Google Maps, embed opcional y placeholder elegante si falta configuracion
- los botones de ubicacion abren Google Maps o una busqueda por direccion y localidad
- el contenido sigue separado por negocio y no mezcla datos
- preparado para seguir migrando a Supabase sin rehacer la UI

## Etapa v2.5.0

- `/local/web` edita hero, about, galerÃ­a, contacto y visibilidad de secciones por negocio
- `/${slug}` consume el contenido publico local/mock del negocio correspondiente
- los cambios de `/local/web` se reflejan en la web publica sin mezclar negocios
- el menu sigue consumiendose desde `/local/menu`
- preparado para migrar a Supabase sin rehacer la UI

## Etapa v2.4.2

- si `business=<slug>` no existe, el Panel del Local corrige la URL al negocio activo de fallback
- si no hay negocios activos, el Panel del Local muestra un estado vacio elegante
- las metricas superiores de `/admin` se ven en una grilla compacta de 2 filas por 4 columnas

## Etapa v2.4.1

- el Panel del Local respeta `business=<slug>` en todas las rutas
- el selector de negocio actualiza la URL sin recargar la pagina
- `/dashboard` y `/local` conservan el negocio al redirigir
- la fila superior de metricas de `/admin` sigue compacta y horizontal

## Etapa v2.4.0

- fila superior compacta de metricas en `/admin`
- vista de detalle centralizada en `/admin/businesses/[slug]`
- accesos rapidos directos desde la ficha del negocio
- estado de configuracion y resumen operativo por negocio

## Etapa v2.3.0

- header de admin mas profesional
- metricas compactas de negocios y reservas mock
- filtros por estado, localidad, rubro y orden
- lista operativa de negocios con acciones rapidas
- borrar con confirmacion fuerte por slug
- reactivar deja el negocio en estado activo
- duplicar copia configuracion base y datos operativos sin tocar reservas reales

## Etapa v2.2.0

- `/local/web` edita identidad publica, hero, sobre el local, galeria, redes y visibilidad de secciones
- la web publica `/${slug}` consume el contenido local/mock del negocio
- imagenes desde URL o cargadas desde el ordenador con fallback seguro
- preview del sitio publico dentro del panel local

## Que incluye

- Next.js con App Router
- TypeScript
- Tailwind CSS
- rutas publicas y privadas mockeadas
- datos demo
- preparacion para Supabase
- admin de negocios
- modelo `Business`
- formulario crear y editar
- buscador y filtros por estado
- web publica conectada a una capa local de datos
- sistema de themes
- templates visuales iniciales
- renderer por theme
- selector de theme en admin
- separacion entre presentacion y modulo de reservas
- modelos de horarios, reglas y servicios
- motor de disponibilidad reutilizable
- preview de horarios disponibles
- disponibilidad publica basada en mesas
- asignacion automatica de mesas o combinaciones en reservas publicas
- pantalla admin para configurar horarios y reglas
- creacion de reservas en modo local/mock
- `Reservas` como modulo operativo propio del Panel del Local

## Etapa v2.1.4

- `ReservationWidget` espera a montar en cliente antes de pintar el select de servicios
- se elimina el fallback duro a `/mock/covers/demuru.jpg`
- hero, galeria y menu publicos muestran placeholder si la imagen falla
- la web publica y el panel local siguen en modo local/mock sin hydration mismatch
- detalle de reserva
- asignacion manual de mesas a reservas
- union manual de mesas para reservas grandes
- validacion de capacidad y conflictos por horario
- ocupacion visible en el plano segun fecha y hora
- motor interno de disponibilidad por mesas para el Panel del Local
- sugerencias de mesas individuales y combinaciones
- alertas de reservas sin mesa y conflictos
- filtros combinados y vista rapida por estado
- dashboard operativo con cambio de estados
- panel del local por rutas
- pestaÃ±a `/local/menu`
- categorias dinamicas por negocio
- items con imagen, precio opcional, estado y destacado
- preview visual del menu para la web publica
- calendario operativo real con vista dia y semana
- filtros, busqueda y acciones rapidas en calendario
- detalle de reserva desde calendario
- sincronizacion con Reservas y Plano
- CRM bÃ¡sico derivado de reservas
- detalle de cliente
- filtros por recurrencia, cancelaciones, no-show y datos faltantes
- notas, tags y preferencias locales/mock
- configuracion funcional del Panel del Local
- datos del negocio, reglas, horarios y servicios guardados por negocio en local/mock
- plano bÃ¡sico funcional del local
- mesas locales/mock por negocio
- crear, editar, eliminar y mover mesas
- estados visuales de mesa y reset por negocio
- fondo de plano configurable por negocio
- controles de opacidad, brillo y contraste
- reportes operativos reales
- filtros por periodo: hoy, 7 dias, 30 dias, mes actual y personalizado
- metricas por servicio, horario, dia, clientes y mesas
- alertas operativas para el local
- `/dashboard` mantenido por compatibilidad
- layout full-width
- favicon simple
- limpieza del warning visual de `scroll-behavior`

## Etapa v1.5.2

- eliminacion segura de negocios desde Admin
- modal de confirmacion con validacion del slug
- proteccion de negocios base en modo mock
- limpieza local/mock de datos asociados al negocio eliminado

## Etapa v1.6.0

- la web publica usa disponibilidad real basada en mesas
- las reservas publicas se autoasignan a una mesa o combinacion si existe disponibilidad
- si no hay mesas configuradas, el sistema puede seguir usando la logica por slot existente como fallback

## Etapa v1.6.1

- correccion de la asignacion automatica de mesa en reservas publicas
- la web publica ya no crea reservas activas sin mesa cuando el negocio tiene mesas configuradas
- correccion del hydration mismatch en contadores y badges de `/local/reservas`

## Etapa v2.0.2

- seed demo realista por negocio para mayo 2026 y 1-14 de junio 2026
- boton para cargar, reemplazar y limpiar datos demo locales/mock
- datos demo aislados por negocio
- reportes, CRM, calendario, plano e ingresos estimados con mas volumen de prueba

## Etapa v2.1.0

- pestaña `/local/menu` en el Panel del Local
- categorias dinamicas por negocio
- items o productos con imagen, descripcion, precio opcional, estado y destacado
- preview de como se veria el menu en la web publica
- persistencia local/mock por negocio
- menu demo restaurable solo para el negocio seleccionado

## Etapa v2.1.1

- carga de imagen local para items del menu
- prioridad de imagen: subida local, URL manual y placeholder
- preview inmediata de la imagen subida
- persistencia local/mock por negocio
- preparado para un futuro upload real a Supabase Storage
## Etapa v2.1.2

- la web publica consume el menu dinamico cargado desde `/local/menu`
- categorias e items se muestran por negocio sin hardcodear categorias fijas
- soporta imagen subida, URL manual o placeholder
- deja preparada la seccion publica para futura conexion con Supabase

## Etapa v2.1.3

- `/local/web` edita hero, presentacion, ubicacion, contacto y CTA por negocio
- la web publica consume el contenido dinamico guardado en `/local/web`
- secciones publicas activables o desactivables por negocio
- galeria dinamica por negocio con imagen, titulo, descripcion y estado
- vista previa del sitio publica desde el Panel del Local
## Etapa v2.0.3

- demo comercial con mayor volumen y variedad para mayo 2026
- datos recientes del 1 al 14 de junio 2026 para seguir mostrando actividad
- reportes, CRM, calendario, plano e ingresos estimados con datos mas presentables
- aislamiento por negocio mantenido
- carga y limpieza de datos demo sin tocar reservas manuales
- futuro preparado para flujo de seÃ±a/depÃ³sito

## Etapa v2.0.1

- aislamiento de reportes por negocio
- reporte de Demuru, Barbados y Cafe Demo sin mezcla de datos
- ingreso estimado calculado solo con servicios del negocio seleccionado
- servicios externos ocultos en rankings y alertas
- reportes siguen sincronizados con reservas, calendario, plano y CRM

## Etapa v2.0.0

- reportes operativos reales del Panel del Local
- filtros por periodo: hoy, 7 dias, 30 dias, mes actual y personalizado
- metricas principales de reservas, personas, ingresos estimados y ocupacion
- metricas por servicio, horario, dia, cliente y mesas
- alertas operativas basadas en la actividad del local
- reportes sincronizados con reservas, calendario, plano y CRM

## Etapa v1.9.2

- validacion de telefono en la web publica
- normalizacion de telefonos antes de comparar duplicados
- bloqueo de numeros falsos o sospechosos
- prevencion anti-spam basica en reservas publicas
- modelo futuro de deposito mantenido para confirmacion

## Etapa v1.9.1

- correccion de duplicados en `/local/reservas`
- filtro de fecha desbloqueado en `/local/reservas`
- validacion de reserva activa por telefono en la web publica
- modelo futuro de deposito preparado para confirmacion

## Etapa v1.9.0

- CRM operativo real del Panel del Local
- clientes derivados de reservas
- clasificaciÃ³n comercial Nuevo/Recurrente/VIP/Riesgo
- detalle de cliente con historial completo
- notas internas, tags manuales y sugerencias automÃ¡ticas
- sincronizaciÃ³n del CRM con Reservas y Calendario

## Etapa v1.8.0

- calendario operativo real del Panel del Local
- vista dia y semana
- selector de negocio y fecha
- filtros por estado, servicio y busqueda
- acciones rapidas por reserva
- detalle de reserva
- sincronizacion con Reservas y Plano

## Etapa v1.7.4

- correccion de persistencia de `cornerRadius` en `0`
- mesas nuevas cuadradas por defecto
- esquinas rectas por defecto
- evita fallback incorrecto de `0` a `12`

## Etapa v1.7.2

- mesas unidas visuales movibles
- fondo editable sin aspect ratio obligatorio
- ancho y alto de mesas independientes
- soporte de resize libre para elementos del plano

## Etapa v1.7.1

- timeline/slider fijo de 08:00 a 00:00 en `/local/plano`
- barra de ocupacion mas compacta
- horas visibles solo arriba del slider
- eliminacion del resumen redundante del slot
- correccion de overflow dentro de las mesas
- mesas unidas compactas con label combinado y tamano base

## Etapa v1.7.0

- timeline/slider de ocupacion en `/local/plano`
- actualizacion en vivo del canvas por fecha y horario
- reemplazo de la leyenda inferior por control operativo
- visualizacion temporal de mesas unidas como una sola mesa

## Etapa v1.5.1

- validacion estricta de slug duplicado al crear y editar negocios
- la accion Reactivar lleva directamente a estado `active`
- la version visible se actualizo a `v1.5.1`

## Stack

- Next.js
- React
- TypeScript
- Tailwind CSS

## Requisitos

- Node.js 24 o superior
- npm

Si PowerShell bloquea `npm`, usa `npm.cmd` en la terminal.

## Instalacion

```bash
npm install
```

## Ejecutar en local

```bash
npm run dev
```

Luego abrir:

- `http://localhost:3000/`
- `http://localhost:3000/local/reservas`
- `http://localhost:3000/local`
- `http://localhost:3000/dashboard`
- `http://localhost:3000/demuru`
- `http://localhost:3000/barbados`
- `http://localhost:3000/cafe-demo`
- `http://localhost:3000/admin`

## Scripts

- `npm run dev`: desarrollo
- `npm run build`: compilacion de produccion
- `npm run start`: correr build de produccion
- `npm run lint`: lint del proyecto

## Rutas principales

- `/`: landing de Tango Reservas
- `/local`: entrada del Panel del Local
- `/local/reservas`: reservas operativas del Panel del Local
- `/local/calendario`: calendario operativo inicial
- `/local/plano`: plano bÃ¡sico funcional
- `/local/crm`: CRM bÃ¡sico funcional
- `/local/configuracion`: configuracion funcional del Panel del Local
- `/local/web`: placeholder
- `/local/reportes`: panel operativo de reportes
- `/dashboard`: compatibilidad con el Panel del Local
- `/admin`: panel admin mock
- `/admin/businesses/new`: crear negocio
- `/admin/businesses/[id]/edit`: editar negocio
- `/admin/businesses/[id]/settings`: configurar horarios
- `/[slug]`: web publica por negocio

## Division del sistema

### Panel del Local

Es el espacio operativo del negocio. Lo usa el equipo del dia a dia para reservas, calendario, plano, CRM, configuracion, web y reportes.

### Admin Panel

Es el espacio del dueno o admin del SaaS. Sirve para administrar negocios, templates, categorias, reportes globales y la base multi-tenant.

### Web del Local

Es la web publica que ve el cliente final. Muestra informacion del negocio y permite crear reservas.

## Etapa v1.0.1

- modal centrado para crear y editar servicios
- lista de servicios mas limpia y compacta
- UX de servicios mejorada en configuracion

## Etapa v1.1.0

- plano bÃ¡sico funcional del Panel del Local
- mesas locales/mock por negocio
- crear, editar, eliminar y mover mesas
- reset del plano por negocio
- estados visuales de mesa

## Etapa v1.1.1

- fix de hydration en `/local/reservas`
- fix de hydration en `/local/calendario`
- drag de mesas en `/local/plano`
- imagen de fondo configurable por negocio
- opacidad, brillo y contraste para el fondo

## Etapa v1.1.2

- brillo y contraste del fondo ajustados a rangos de 0 a 200
- fondo del plano movible dentro del canvas
- ancho y alto del fondo editables
- persistencia local/mock por negocio para posicion, tamano y filtros del fondo

## Etapa v1.1.3

- resize visual de la imagen de fondo con esquinas y handles
- inputs de ancho y alto mantenidos como respaldo
- mejora de UX del modo edicion de fondo

## Etapa v1.2.0

- asignacion manual de reservas a mesas
- validacion de capacidad por mesa
- prevencion de doble asignacion por horario
- visualizacion de ocupacion en el plano
- mesa asignada visible en reservas y calendario

## Etapa v1.3.0

- union manual de mesas
- asignacion de reservas a combinaciones
- validacion de capacidad y conflictos por horario
- visualizacion de mesas unidas en plano y calendario

## Etapa v1.3.1

- chips y badges de reservas mas grandes y legibles en `/local/reservas`
- mejor presencia visual para estado, servicio, mesa, origen y detalle

## Etapa v1.3.2

- filas de reservas redisenadas para aprovechar mejor el ancho disponible
- chips mas legibles
- datos de cliente mas claros y mejor distribuidos

## Etapa v1.4.0

- motor interno de disponibilidad por mesas para el Panel del Local
- sugerencias de mesas individuales y combinaciones
- alertas de reservas sin mesa
- deteccion de conflictos por horario y mesa
- resumen operativo en plano y calendario
- la disponibilidad publica sigue usando la logica por slot actual

## Etapa v1.4.1

- modal de asignar/cambiar mesa centrado y con scroll interno mas usable
- header y footer del modal mas claros
- seccion Fondo del plano colapsable/desplegable
- el plano sigue funcionando con la imagen de fondo y el drag de mesas

## Etapa v1.4.2

- correccion del hydration mismatch en badges de disponibilidad interna dentro de `/local/reservas`
- valores derivados de localStorage ocultos hasta montar el cliente
- la experiencia visual se mantiene igual luego de cargar

## Etapa v1.4.3

- ajuste final del hydration fix en `/local/reservas` usando un snapshot estable durante SSR
- los badges de sugerencias/conflictos se muestran solo despues de hidratar el cliente

## Etapa v1.0.0

- configuracion funcional del Panel del Local
- persistencia local/mock por negocio
- datos del negocio, reglas, horarios y servicios
- filtros del CRM mas compactos y rectangulares

## Etapa v0.9.1

- filtros del CRM mas compactos
- chips mas livianos para panel operativo

## Etapa v0.9.0

- CRM bÃ¡sico funcional
- clientes derivados de reservas
- busqueda y filtros
- detalle de cliente
- notas, tags y preferencias locales/mock

## Etapa v0.8.0

- calendario operativo inicial
- vista diaria y semanal
- filtros por estado y servicio
- navegacion por fecha
- preparacion para bloqueos futuros

## Etapa v0.7.1

- fix del hydration error del widget publico
- orden descendente por horario dentro de cada fecha en reservas del Panel Local
- mantenimiento de la compatibilidad con `/dashboard`

## Variables de entorno

Crear un archivo `.env.local` a partir de `.env.example`.

Variables esperadas:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`

Todavia no estan conectadas al frontend.

## Estructura tecnica

- `src/app`: rutas y layouts
- `src/components`: componentes reutilizables
- `src/data`: datos mockeados
- `supabase/schema.sql`: esquema base futuro

## Decisiones de esta fase

- No conectar Supabase todavia.
- No agregar autenticacion real.
- No agregar pagos, WhatsApp API, Instagram API ni IA.
- Usar mock data para validar la arquitectura y las pantallas.
- Mantener `/dashboard` para compatibilidad mientras `/local/reservas` pasa a ser la entrada principal de reservas.

## Roadmap

Ver `ROADMAP.md`.
