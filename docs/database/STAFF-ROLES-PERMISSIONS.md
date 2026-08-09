# Staff, roles y permisos por local — E28A

## Objetivo

E28A incorpora la base persistente para administrar Staff desde la página V2 existente de Configuración. No se crea una segunda página visual: `src/app/local/configuracion/v2-configuracion-page.tsx` sigue siendo la única interfaz de Configuración y recibe la sección Staff como un componente interno.

Cada `business` representa un local independiente. El dueño selecciona el local activo y administra únicamente el Staff, roles y permisos de ese local.

## Identidad del empleado

El email personal es el identificador funcional único del empleado.

- no se crea un ID visible adicional;
- un mismo usuario Auth puede tener membresías independientes en varios locales;
- el rol pertenece a la relación usuario ↔ local;
- el mismo email puede ser Cocina en un local y Cajero en otro;
- eliminar el acceso a un local no elimina la cuenta ni otras membresías.

Los datos de Staff por local incluyen:

- nombre y apellido;
- email;
- teléfono opcional;
- notas internas;
- rol;
- estado.

Las notas internas son visibles únicamente para el dueño porque la lectura completa del Staff está limitada al owner del local.

## Roles

El dueño dispone de cinco presets por local:

- Encargado;
- Cocina;
- Cajero;
- Mozo;
- Delivery.

Los presets son plantillas seguras y no se editan ni eliminan. Pueden duplicarse para crear un rol personalizado.

Un rol personalizado nuevo comienza con **todos los módulos en Sin acceso**.

## Niveles de acceso

Cada módulo tiene exactamente uno de cuatro niveles:

1. `none` — Sin acceso.
2. `view` — Solo lectura.
3. `manage` — Gestión: ver, agregar y editar, sin eliminar.
4. `full` — Acceso total: ver, agregar, editar y eliminar.

Los módulos delegables son:

- Inicio;
- Reservas;
- Plano;
- Clientes;
- Envíos;
- Cocina;
- Menú;
- Recetas;
- Productos;
- Stock;
- Historial de stock;
- Caja;
- Gastos;
- Historial;
- Reportes;
- Web.

Configuración, Staff y Seguridad permanecen exclusivos del dueño y no forman parte de los permisos delegables.

## Aislamiento por local

`staff_roles` y `staff_role_permissions` incluyen `business_id` y relaciones compuestas tenant-safe.

Un rol de Local A no puede asignarse a un empleado de Local B. Cada local recibe sus propios cinco presets y puede crear sus propios roles personalizados sin compartirlos con otros locales del mismo dueño.

## Invitaciones

El dueño invita usando el email personal del empleado.

- si el email no existe en Auth, el servidor usa la API administrativa de Supabase para enviar una invitación;
- la clave privilegiada permanece exclusivamente en servidor;
- si el usuario ya existe, no se crea una cuenta duplicada: se crea la membresía del nuevo local;
- al aceptar la invitación y confirmar el email, la membresía pendiente pasa a activa.

La pantalla de actualización de contraseña existente se reutiliza para que un usuario invitado defina su contraseña.

## Revocación y reautenticación

`user_access_controls.reauth_after` registra cuándo un cambio de acceso exige una autenticación nueva.

Se actualiza cuando:

- cambia el rol de un empleado;
- cambia el estado activo/suspendido/eliminado;
- se modifican los permisos de un rol asignado.

En la siguiente petición protegida, el proxy compara ese momento con el último inicio de sesión. Si el cambio es posterior, cierra la sesión y redirige al login.

La autorización no depende únicamente de cerrar la sesión: membresías, rutas y RLS se vuelven a validar en servidor para impedir que un token anterior conserve acceso a datos del local.

## Sidebar y multi-local

El sidebar deja de usar el local mock como fuente de identidad.

- muestra el local activo real;
- si el usuario pertenece a más de un local, muestra un selector;
- el selector reutiliza el endpoint seguro de negocio activo;
- solo aparecen módulos con al menos nivel `view`;
- Configuración y Seguridad solo aparecen para `owner`.

Cambiar de local cambia completamente el contexto del panel. No se agregan vistas globales que mezclen empleados, stock, caja o reservas de varios locales.

## Alcance de E28A

E28A aplica los permisos a navegación, selección de local, acceso directo a rutas y administración de Staff.

Las Server Actions existentes de módulos que fueron migrados antes de este sistema conservan temporalmente sus controles históricos `owner/admin`. Por seguridad eso puede hacer que un Staff con nivel `manage` vea un módulo pero todavía no pueda ejecutar alguna mutación persistente. No concede permisos de más.

Cada cutover posterior debe reemplazar esas comprobaciones rígidas por el nivel del módulo correspondiente antes de considerar `manage/full` completamente habilitado para ese dominio.

## Seguridad

- RLS forzada en tablas nuevas.
- Sin `INSERT`, `UPDATE` ni `DELETE` directo para `authenticated`.
- Mutaciones de Staff únicamente mediante RPC owner-only.
- `anon` no puede leer ni ejecutar RPC de Staff.
- el navegador nunca recibe la clave privilegiada;
- presets y permisos se aíslan por `business_id`;
- roles nuevos fallan cerrados con `none` en todos los módulos;
- Configuración y Seguridad fallan cerradas para no-owner.

## Rollback

El rollback elimina las RPC y políticas de acceso nuevas, vuelve las tablas nuevas a default deny y restaura la política anterior de lectura de `business_members`.

No elimina las tablas, columnas ni datos de Staff. Un rollback de código puede volver a la release anterior sin destruir roles, notas ni membresías creadas.

## QA

E28A agrega:

- regresión estática `test:staff-roles`;
- prueba remota segura `staging:test-staff-roles`;
- postflight SQL de Staff;
- verificación del historial remoto;
- hashes SHA-256 de migración y rollback;
- pruebas negativas BOLA y DML directo.

La prueba staging no invita emails ni modifica empleados reales: crea un rol temporal, verifica aislamiento y lo elimina en `finally`.
