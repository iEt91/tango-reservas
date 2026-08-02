# Plan de prueba de aislamiento RLS

## Objetivo

Demostrar que dos usuarios autenticados de dos negocios distintos no pueden leer ni
modificar información ajena.

## Actores

- usuario A, owner del negocio A;
- usuario B, owner del negocio B;
- cliente anónimo;
- cliente privilegiado usado únicamente para preparar el fixture.

## Casos negativos obligatorios

1. anon consulta `business_members`: denegado.
2. A consulta el negocio B: cero filas.
3. B consulta el negocio A: cero filas.
4. A intenta insertar una invitación: denegado.
5. A intenta cambiar un rol: denegado.
6. A intenta eliminar su membresía: denegado.
7. Repetir escrituras con B: denegado.

## Casos positivos

1. A se autentica y ve exactamente su membresía.
2. B se autentica y ve exactamente su membresía.
3. El owner puede ver miembros de su propio negocio cuando existan.
4. El cierre de sesión elimina las sesiones locales de prueba.

## Reglas de evidencia

- no mostrar correos completos;
- no mostrar contraseñas;
- no mostrar claves;
- los UUID se conservan solo en evidencia local ignorada;
- cualquier dato visible de otro negocio es un fallo P0.

## Extensión futura

La misma estructura se repetirá para:

- businesses;
- profiles;
- customers;
- reservations;
- services;
- stock;
- caja;
- gastos;
- reportes;
- archivos privados.
